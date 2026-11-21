import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../services/user-services/package.json', import.meta.url));
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const downloadDir = resolve(root, '.tmp', 'mongodb-binaries');
mkdirSync(downloadDir, { recursive: true });
process.env.TEMP = resolve(root, '.tmp');
process.env.TMP = process.env.TEMP;
process.env.TMPDIR = process.env.TEMP;
const children = [];
const databases = [];
const clients = [];
async function freePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}
function start(service, env) {
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: resolve(root, 'services', service),
    env: { ...process.env, OBSERVE_APP_KEY: '', OBSERVE_APP_SECRET: '', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', chunk => { logs += chunk; });
  child.stderr.on('data', chunk => { logs += chunk; });
  child.on('error', error => { logs += error.message; });
  child.logs = () => logs;
  children.push(child);
  return child;
}
async function ready(url, child) {
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(child.logs());
    try { if ((await fetch(`${url}/health`, { signal: AbortSignal.timeout(1000) })).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Not ready: ${url}\n${child.logs()}`);
}
async function call(base, path, method = 'GET', body) {
  const result = await fetch(`${base}${path}`, {
    method, headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(6000),
  });
  return { status: result.status, body: await result.json() };
}
async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const ended = once(child, 'exit');
  child.kill();
  await ended;
}


const brokers = process.env.KAFKA_BROKERS;
const rabbit = process.env.EVENT_TRANSPORT === 'rabbitmq';
if (!rabbit && !brokers) throw new Error('Defina KAFKA_BROKERS para ejecutar integración con un broker real');
const topic = `univalleshop.integration.${randomUUID()}`;
const brokerEnv = { EVENT_TRANSPORT: rabbit ? 'rabbitmq' : 'kafka', KAFKA_BROKERS: brokers ?? '', ORDERS_TOPIC: topic,
  EVENT_GROUP_SUFFIX: `-${randomUUID()}`, EVENTS_ENABLED: 'true' };
async function eventually(check, description) {
  let last;
  for (let i=0;i<160;i++) {
    try { const result = await check(); if(result) return result; } catch(error) { last=error; }
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  throw new Error(`No se verificó: ${description}; ${last??''}`);
}
try {
  for (let i = 0; i < 3; i++) {
    const db = await MongoMemoryServer.create({ binary: { version: '8.0.17', downloadDir } });
    databases.push(db);
    clients.push(await new MongoClient(db.getUri()).connect());
  }
  const ports = {};
  for(const service of ['users','catalog','orders','gateway']) ports[service]=await freePort();
  const urls=Object.fromEntries(Object.entries(ports).map(([name,port])=>[name,`http://127.0.0.1:${port}`]));
  const users=start('user-services',{PORT:String(ports.users),MONGODB_URI:databases[0].getUri('users'),ALLOWED_EMAIL_DOMAIN:'correounivalle.edu.co'});
  let catalog=start('catalog-service',{...brokerEnv,PORT:String(ports.catalog),MONGODB_URI:databases[1].getUri('catalog')});
  const orderEnv={...brokerEnv,PORT:String(ports.orders),MONGODB_URI:databases[2].getUri('orders'),USERS_SERVICE_URL:urls.users,CATALOG_SERVICE_URL:urls.catalog};
  // Arranque con broker deliberadamente inaccesible: el comando debe guardar evento+outbox.
  let orders=start('orders-service',{...orderEnv,...(rabbit?{AMQP_PORT:'1'}:{KAFKA_BROKERS:'127.0.0.1:1'})});
  const gateway=start('api-gateway',{PORT:String(ports.gateway),USERS_SERVICE_URL:urls.users,CATALOG_SERVICE_URL:urls.catalog,ORDERS_SERVICE_URL:urls.orders});
  await Promise.all([ready(urls.users,users),ready(urls.catalog,catalog),ready(urls.orders,orders),ready(urls.gateway,gateway)]);
  const registered=await call(urls.gateway,'/api/users','POST',{name:'Demo patrones',email:`p.${randomUUID()}@correounivalle.edu.co`,password:'Demo-Patrones-2026!'});
  assert.equal(registered.status,201);
  const createdProduct=await call(urls.gateway,'/api/products','POST',{name:'Libro patrones',price:12000,stock:10});
  assert.equal(createdProduct.status,201);
  const input={userId:registered.body.id,productId:createdProduct.body.id,quantity:2};
  const invalid=await call(urls.gateway,'/api/orders','POST',{...input,userId:'f'.repeat(24)});
  assert.equal(invalid.status,404);
  const placed=await call(urls.gateway,'/api/orders','POST',input);
  if(placed.status!==202) throw new Error(`Create failed ${JSON.stringify(placed)}
${orders.logs()}`);
  const id=placed.body.id;
  const db=clients[2].db('orders');
  assert.equal(await db.collection('order_events').countDocuments(),1);
  const persisted=await db.collection('order_events').findOne({aggregateId:id});
  assert.equal(persisted.publishedAt,null);
  assert.equal(persisted.event.type,'OrderCreated');
  assert.equal((await call(urls.gateway,`/api/orders/${id}`)).status,404);
  assert.equal((await call(urls.gateway,`/api/orders/${id}/events`)).body.length,1);
  console.log('PASS chained + outbox: references checked; 202 and atomic event/outbox while broker is unreachable; read model absent');
  await stop(orders);
  orders=start('orders-service',orderEnv);
  await ready(urls.orders,orders);
  await eventually(async()=>{const r=await call(urls.gateway,`/api/orders/${id}`);return r.status===200&&r.body.version===1;},'CQRS proyección por broker');
  await eventually(async()=>(await db.collection('order_events').findOne({aggregateId:id})).publishedAt!==null,'outbox confirmada');
  await eventually(async()=>(await call(urls.gateway,`/api/products/${input.productId}/activity`)).body.activeQuantity===2,'consumidor independiente catálogo');
  const summary=await call(urls.gateway,`/api/orders/${id}/summary`);
  assert.equal(summary.status,200);
  assert.equal(summary.body.user.id,input.userId);
  assert.equal(summary.body.product.id,input.productId);
  assert.equal(summary.body.order.total,24000);
  assert.equal('passwordHash' in summary.body.user,false);
  console.log('PASS real broker + CQRS + aggregator: relay recovered; two independent consumers; composed response from three services');
  // Simula crash tras ACK del broker pero antes de marcar: el relay debe reenviar sin duplicar efectos.
  await db.collection('order_events').updateOne({aggregateId:id,version:1},{$set:{publishedAt:null}});
  await eventually(async()=>(await db.collection('order_events').findOne({aggregateId:id})).publishedAt!==null,'reentrega');
  await new Promise(resolve=>setTimeout(resolve,1000));
  assert.equal((await call(urls.gateway,`/api/products/${input.productId}/activity`)).body.activeQuantity,2);
  assert.equal((await call(urls.gateway,`/api/orders/${id}`)).body.version,1);
  const concurrent=await Promise.all([1,2].map(()=>call(urls.gateway,`/api/orders/${id}/cancel`,'POST',{reason:'Prueba de cancelación'})));
  assert.deepEqual(concurrent.map(r=>r.status).sort(),[202,409]);
  await eventually(async()=>(await call(urls.gateway,`/api/orders/${id}`)).body.status==='cancelled','cancelación proyectada');
  await eventually(async()=>(await call(urls.gateway,`/api/products/${input.productId}/activity`)).body.cancelledOrders===1,'catálogo cancelación');
  const events=await call(urls.gateway,`/api/orders/${id}/events`);
  assert.deepEqual(events.body.map(e=>e.type),['OrderCreated','OrderCancelled']);
  assert.equal(events.body[0].data.status,'created');
  await db.collection('order_views').deleteOne({_id:id});
  assert.equal((await call(urls.gateway,`/api/orders/${id}`)).status,404);
  const rebuilt=await call(urls.gateway,`/api/orders/${id}/rebuild`,'POST',{});
  assert.equal(rebuilt.status,200);assert.equal(rebuilt.body.status,'cancelled');assert.equal(rebuilt.body.version,2);
  assert.equal((await call(urls.gateway,`/api/orders/${id}`)).body.status,'cancelled');
  console.log('PASS event sourcing + concurrency + idempotence: immutable history; one concurrent cancel; duplicate delivery harmless; projection deleted/rebuilt');
  const second=await call(urls.gateway,'/api/orders','POST',input);
  assert.equal(second.status,202);
  await eventually(async()=>(await call(urls.gateway,`/api/orders/${second.body.id}`)).status===200,'segundo pedido');
  await stop(catalog);
  assert.equal((await call(urls.gateway,`/api/orders/${second.body.id}/cancel`,'POST',{reason:'Consumidor catálogo detenido'})).status,202);
  await eventually(async()=>(await call(urls.gateway,`/api/orders/${second.body.id}`)).body.status==='cancelled','pedido independiente del consumidor');
  catalog=start('catalog-service',{...brokerEnv,PORT:String(ports.catalog),MONGODB_URI:databases[1].getUri('catalog')});
  await ready(urls.catalog,catalog);
  await eventually(async()=>(await call(urls.gateway,`/api/products/${input.productId}/activity`)).body.cancelledOrders===2,'recuperación consumidor');
  assert.equal(await clients[0].db('users').collection('order_events').countDocuments(),0);
  assert.equal(await clients[1].db('catalog').collection('order_views').countDocuments(),0);
  console.log('PASS asynchronous recovery + database-per-service: catalog catches up after downtime; no shared collections');
  console.log(`PATTERNS INTEGRATION PASSED (${rabbit?'RabbitMQ':'Kafka'} real + 4 compiled applications + 3 real MongoDB instances)`);
} finally {
  await Promise.allSettled(children.map(stop));
  await Promise.allSettled(clients.map(client=>client.close()));
  await Promise.allSettled(databases.map(db=>db.stop()));
}
