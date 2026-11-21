import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import './check-architecture.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const temp = resolve(root, '.tmp');
mkdirSync(temp, { recursive: true });
const env = { ...process.env, TEMP: temp, TMP: temp, TMPDIR: temp };
function npm(args, cwd) {
  // npm.cmd requires cmd.exe on Windows; these arguments are fixed by this script.
  const result = spawnSync(process.platform === 'win32' ? 'cmd.exe' : 'npm',
    process.platform === 'win32' ? ['/d', '/s', '/c', 'npm', ...args] : args,
    { cwd, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
for (const service of ['user-services', 'catalog-service', 'orders-service', 'api-gateway']) {
  const cwd = resolve(root, 'services', service);
  console.log(`\nChecking ${service}`);
  if (process.argv.includes('--install')) npm(['ci'], cwd);
  npm(['run', 'build'], cwd);
  npm(['exec', '--', 'tsc', '--noEmit', '--incremental', 'false'], cwd);
  npm(['test'], cwd);
  npm(['run', 'lint'], cwd);
  if (service === 'user-services') npm(['run', 'test:e2e'], cwd);
}
console.log('\nBuild, typecheck, unit/HTTP tests and lint passed for all services.');
