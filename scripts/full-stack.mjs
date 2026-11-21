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

// Sin --smoke queda una demo local activa; sus seis MongoDB son temporales.
const smoke = process.argv.includes('--smoke');
const names = ['user-services','catalog-service','orders-service','payments-service','search-service','recommendations-service'];
const ports = [];
const urls = [];
let closing = false;
async function cleanup() {
  if (closing) return;
  closing = true;
  await Promise.allSettled(children.map(stop));
  await Promise.allSettled(clients.map(client=>client.close()));
  await Promise.allSettled(databases.map(db=>db.stop()));
}
process.on('SIGINT',()=>{void cleanup().then(()=>process.exit(0));});
process.on('SIGTERM',()=>{void cleanup().then(()=>process.exit(0));});
try {
  for (let i=0;i<8;i++) ports.push(smoke ? await freePort() : 3200+i);
  for (let i=0;i<6;i++) {
    databases.push(await MongoMemoryServer.create({binary:{version:'8.0.17',downloadDir}}));
    urls.push(`http://127.0.0.1:${ports[i+1]}`);
  }
  const common = {
    USERS_SERVICE_URL:urls[0],CATALOG_SERVICE_URL:urls[1],ORDERS_SERVICE_URL:urls[2],
    PAYMENTS_SERVICE_URL:urls[3],SEARCH_SERVICE_URL:urls[4],RECOMMENDATIONS_SERVICE_URL:urls[5],
    EVENTS_ENABLED:'false',EVENT_TRANSPORT:'kafka',KAFKA_BROKERS:process.env.KAFKA_BROKERS??'127.0.0.1:1',
    SIMULATED_PAYMENT_OUTCOME:'approved',ALLOWED_EMAIL_DOMAIN:'correounivalle.edu.co',
  };
  const running=names.map((name,i)=>start(name,{...common,PORT:String(ports[i+1]),MONGODB_URI:databases[i].getUri(name.replaceAll('-','_'))}));
  const gatewayUrl=`http://127.0.0.1:${ports[0]}`;
  const gateway=start('api-gateway',{...common,PORT:String(ports[0])});
  await Promise.all([...running.map((child,i)=>ready(urls[i],child)),ready(gatewayUrl,gateway)]);
  const web=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(ports[7]),'--strictPort'],{
    cwd:resolve(root,'frontend'),env:{...process.env,GATEWAY_URL:gatewayUrl},stdio:['ignore','pipe','pipe'],
  });
  let webLogs='';web.stdout.on('data',c=>{webLogs+=c;});web.stderr.on('data',c=>{webLogs+=c;});web.logs=()=>webLogs;children.push(web);
  const webUrl=`http://127.0.0.1:${ports[7]}`;
  await ready(webUrl,web);
  const fromWeb=(path,method='GET',body)=>call(webUrl,path,method,body);
  const userResult=await fromWeb('/api/users','POST',{name:'Comunidad Univalle',email:`demo${Date.now()}@correounivalle.edu.co`,password:crypto.randomUUID()});
  assert.equal(userResult.status,201);const user=userResult.body;
  const samples=[['Cuaderno de cálculo',12500,12],['Café del Valle',18000,8],['Libro de programación',42000,4],['Bolsa para el campus',24000,9],['Kit de dibujo',32000,5],['Café agotado',5000,0],['Agenda universitaria',21000,7],['Cuaderno cuadriculado',9500,15]];
  const products=[];
  for (const [name,price,stock] of samples) {const result=await fromWeb('/api/products','POST',{name,price,stock});assert.equal(result.status,201);products.push(result.body);}
  assert.equal((await fromWeb('/api/products')).body.length,8);
  assert.ok((await fetch(webUrl)).headers.get('content-type').includes('text/html'));
  console.log('PASS frontend proxy + users + catalog: real HTTP and MongoDB');
  const found=await fromWeb('/api/search?q=C%C3%81LCULO&maxPrice=13000');
  assert.equal(found.status,200);assert.equal(found.body.items.length,1);assert.equal(found.body.items[0].id,products[0].id);
  assert.equal((await fromWeb('/api/search?q=.*')).body.count,0);
  assert.equal((await fromWeb('/api/search?maxPrice=invalid')).status,400);
  assert.equal((await fromWeb('/api/search?q=a&q=b')).status,400);
  console.log('PASS search: accents, price, literal regex and invalid query validation');
  assert.equal((await fromWeb(`/api/recommendations/${user.id}/preferences`,'POST',{keywords:[' CÁFÉ ','cafe']})).status,201);
  const suggested=await fromWeb(`/api/recommendations/${user.id}`);
  assert.equal(suggested.status,200);assert.deepEqual(suggested.body.preferences.keywords,['cafe']);
  assert.equal(suggested.body.items[0].id,products[1].id);assert.ok(suggested.body.items.every(p=>p.stock>0));
  assert.equal((await fromWeb(`/api/recommendations/${'f'.repeat(24)}`)).status,404);
  console.log('PASS recommendations: persisted preferences, ranking, stock and missing user');
  const created=await fromWeb('/api/orders','POST',{userId:user.id,productId:products[0].id,quantity:2});
  assert.equal(created.status,202);const order=created.body;
  const paymentBody={orderId:order.id,idempotencyKey:`test_${order.id}`,amount:1};
  const concurrent=await Promise.all([fromWeb('/api/payments','POST',paymentBody),fromWeb('/api/payments','POST',paymentBody)]);
  assert.ok(concurrent.every(r=>r.status===201),JSON.stringify(concurrent));
  assert.equal(concurrent[0].body.id,concurrent[1].body.id);assert.equal(concurrent[0].body.amount,25000);assert.equal(concurrent[0].body.simulated,true);
  assert.equal((await fromWeb(`/api/payments/${concurrent[0].body.id}`)).status,200);
  assert.equal((await fromWeb('/api/payments','POST',{...paymentBody,idempotencyKey:'different_key'})).status,409);
  const another=await fromWeb('/api/orders','POST',{userId:user.id,productId:products[1].id,quantity:1});
  assert.equal((await fromWeb(`/api/orders/${another.body.id}/cancel`,'POST',{reason:'Prueba de cancelación'})).status,202);
  assert.equal((await fromWeb('/api/payments','POST',{orderId:another.body.id,idempotencyKey:'cancelled_order'})).status,409);
  console.log('PASS payments: server amount, concurrent idempotency, lookup and cancellation guard');
  for(let i=0;i<6;i++){const client=new MongoClient(databases[i].getUri());await client.connect();clients.push(client);}
  assert.equal(await clients[3].db('payments_service').collection('payments').countDocuments(),1);
  assert.equal(await clients[4].db('search_service').collection('product_index').countDocuments(),8);
  assert.equal(await clients[5].db('recommendations_service').collection('preferences').countDocuments(),1);
  assert.equal(await clients[1].db('catalog_service').collection('payments').countDocuments(),0);
  console.log('PASS database-per-service: six independent MongoDB processes');
  if(smoke){await cleanup();console.log('PASS full-stack integration completed; temporary data cleaned');}
  else {
    console.log(`READY React ${webUrl} | Gateway ${gatewayUrl} | demo user ID ${user.id}`);
    console.log('Seis bases temporales. Broker no incluido; outbox pendiente si no se configura KAFKA_BROKERS. Ctrl+C para terminar.');
    await new Promise((resolve,reject)=>{for(const child of children)child.once('exit',()=>{if(!closing)reject(new Error(child.logs()));});});
  }
}catch(error){console.error(error);await cleanup();process.exitCode=1;}
