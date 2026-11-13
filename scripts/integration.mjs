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

try {
  for (let i = 0; i < 2; i++) {
    const db = await MongoMemoryServer.create({ binary: { version: '8.0.17', downloadDir } });
    databases.push(db);
    clients.push(await new MongoClient(db.getUri()).connect());
  }
  const usersPort = await freePort();
  const catalogPort = await freePort();
  const gatewayPort = await freePort();
  const usersUrl = `http://127.0.0.1:${usersPort}`;
  const catalogUrl = `http://127.0.0.1:${catalogPort}`;
  const gatewayUrl = `http://127.0.0.1:${gatewayPort}`;
  const users = start('user-services', { PORT: String(usersPort), MONGODB_URI: databases[0].getUri('users'), ALLOWED_EMAIL_DOMAIN: 'correounivalle.edu.co' });
  const catalog = start('catalog-service', { PORT: String(catalogPort), MONGODB_URI: databases[1].getUri('catalog') });
  await Promise.all([ready(usersUrl, users), ready(catalogUrl, catalog)]);
  const indexes = await clients[0].db('users').collection('users').indexes();
  assert.ok(indexes.some(index => index.key.email === 1 && index.unique));
  const gateway = start('api-gateway', { PORT: String(gatewayPort), USERS_SERVICE_URL: usersUrl, CATALOG_SERVICE_URL: catalogUrl });
  await ready(gatewayUrl, gateway);

  const userInput = { name: ' Ana ', email: ' ANA@correounivalle.edu.co ', password: 'ClaveDemo123!' };
  const registered = await call(gatewayUrl, '/api/users', 'POST', userInput);
  assert.equal(registered.status, 201);
  assert.equal(registered.body.email, 'ana@correounivalle.edu.co');
  assert.equal('password' in registered.body, false);
  assert.equal('passwordHash' in registered.body, false);
  const stored = await clients[0].db('users').collection('users').findOne({ email: registered.body.email });
  assert.ok(stored.passwordHash.startsWith('scrypt$'));
  assert.notEqual(stored.passwordHash, userInput.password);
  assert.equal('password' in stored, false);
  assert.equal((await call(gatewayUrl, '/api/users', 'POST', userInput)).status, 409);
  assert.equal((await call(gatewayUrl, '/api/users', 'POST', { ...userInput, email: 'ana@gmail.com' })).status, 400);
  const concurrent = await Promise.all([1, 2].map(() => call(gatewayUrl, '/api/users', 'POST', { ...userInput, email: 'parallel@correounivalle.edu.co' })));
  assert.deepEqual(concurrent.map(result => result.status).sort(), [201, 409]);
  console.log('PASS users: 201, 400, 409, concurrent uniqueness, stored hash, safe response');

  const product = await call(gatewayUrl, '/api/products', 'POST', { name: 'Libro DS3', price: 15000, stock: 3 });
  assert.equal(product.status, 201);
  assert.equal((await call(gatewayUrl, '/api/products', 'POST', { name: 'Libro', price: -1, stock: 0 })).status, 400);
  const listed = await call(gatewayUrl, '/api/products');
  assert.equal(listed.status, 200);
  assert.equal(listed.body[0].id, product.body.id);
  assert.equal(await clients[1].db('catalog').collection('products').countDocuments(), 1);
  assert.equal(await clients[0].db('users').collection('products').countDocuments(), 0);
  assert.equal(await clients[1].db('catalog').collection('users').countDocuments(), 0);
  console.log('PASS catalog: 201, 400, 200, real persistence, isolated databases');

  await stop(catalog);
  assert.equal((await call(gatewayUrl, '/api/products')).status, 502);
  assert.equal((await call(gatewayUrl, '/api/users', 'POST', { ...userInput, email: 'independent@correounivalle.edu.co' })).status, 201);
  const restarted = start('catalog-service', { PORT: String(catalogPort), MONGODB_URI: databases[1].getUri('catalog') });
  await ready(catalogUrl, restarted);
  assert.equal((await call(gatewayUrl, '/api/products')).body[0].id, product.body.id);
  await stop(users);
  assert.equal((await call(gatewayUrl, '/api/users', 'POST', userInput)).status, 502);
  assert.equal((await call(gatewayUrl, '/api/products')).status, 200);
  console.log('PASS independence: either service can stop; the other remains usable; restart preserves products');
  console.log('Integration passed: three compiled processes + two real ephemeral mongod instances.');
} finally {
  await Promise.allSettled(children.map(stop));
  await Promise.allSettled(clients.map(client => client.close()));
  await Promise.allSettled(databases.map(db => db.stop()));
}
