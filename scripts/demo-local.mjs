import { writeFileSync } from 'node:fs';
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


if (!process.env.KAFKA_BROKERS && process.env.EVENT_TRANSPORT !== 'rabbitmq') throw new Error('Defina KAFKA_BROKERS o configure RabbitMQ antes de arrancar la demo');
const basePort=Number(process.env.DEMO_PORT??3100);
if(!Number.isInteger(basePort)||basePort<1024||basePort>65530) throw new Error('DEMO_PORT inválido');
let closing=false;
async function cleanup() {
  if(closing)return;
  closing=true;
  await Promise.allSettled(children.map(stop));
  await Promise.allSettled(clients.map(client=>client.close()));
  await Promise.allSettled(databases.map(db=>db.stop()));
}
process.on('SIGINT',()=>{void cleanup().then(()=>process.exit(0));});
process.on('SIGTERM',()=>{void cleanup().then(()=>process.exit(0));});
try {
  for(let i=0;i<4;i++) {
    const probe=createServer();
    await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(basePort+i,'127.0.0.1',resolve);});
    await new Promise(resolve=>probe.close(resolve));
  }
  for(let i=0;i<3;i++) databases.push(await MongoMemoryServer.create({binary:{version:'8.0.17',downloadDir}}));
  const usersUrl=`http://127.0.0.1:${basePort+1}`;
  const catalogUrl=`http://127.0.0.1:${basePort+2}`;
  const ordersUrl=`http://127.0.0.1:${basePort+3}`;
  const gatewayUrl=`http://127.0.0.1:${basePort}`;
  const bus={EVENTS_ENABLED:'true',EVENT_TRANSPORT:process.env.EVENT_TRANSPORT??'kafka'};
  const users=start('user-services',{PORT:String(basePort+1),MONGODB_URI:databases[0].getUri('users'),ALLOWED_EMAIL_DOMAIN:'correounivalle.edu.co'});
  const catalog=start('catalog-service',{...bus,PORT:String(basePort+2),MONGODB_URI:databases[1].getUri('catalog')});
  const orders=start('orders-service',{...bus,PORT:String(basePort+3),MONGODB_URI:databases[2].getUri('orders'),USERS_SERVICE_URL:usersUrl,CATALOG_SERVICE_URL:catalogUrl});
  const gateway=start('api-gateway',{PORT:String(basePort),USERS_SERVICE_URL:usersUrl,CATALOG_SERVICE_URL:catalogUrl,ORDERS_SERVICE_URL:ordersUrl});
  await Promise.all([ready(usersUrl,users),ready(catalogUrl,catalog),ready(ordersUrl,orders),ready(gatewayUrl,gateway)]);
  writeFileSync(resolve(root,'.tmp/demo-state.json'),JSON.stringify({pid:process.pid,children:children.map(c=>c.pid),gateway:gatewayUrl,temporaryData:true},null,2));
  console.log(`READY ${gatewayUrl} | ${bus.EVENT_TRANSPORT} | usuarios + catálogo + pedidos + Gateway + 3 Mongo temporales`);
  console.log('Importe postman/UnivalleShop-entrega1.postman_collection.json. Los datos se eliminan al detener esta demo. Ctrl+C para terminar.');
  await new Promise((resolve,reject)=>{for(const child of children)child.once('exit',()=>{if(!closing)reject(new Error(child.logs()));});});
} catch(error) { console.error(error);await cleanup();process.exitCode=1; }
