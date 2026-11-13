import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../services/', import.meta.url));
function* files(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, item.name);
    if (item.isDirectory()) yield* files(path);
    else if (item.name.endsWith('.ts') && !item.name.endsWith('.spec.ts')) yield path;
  }
}
for (const name of ['user-services', 'catalog-service', 'api-gateway']) {
  const source = resolve(root, name, 'src');
  for (const path of files(source)) {
    const inner = relative(source, path).split(/[\\/]/).some(part => part === 'domain' || part === 'application');
    const imports = [...readFileSync(path, 'utf8').matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)].map(match => match[1]);
    for (const dependency of imports) {
      if (dependency.startsWith('.')) {
        const target = resolve(dirname(path), dependency);
        assert.ok(!relative(source, target).startsWith('..'), `${path}: import fuera del servicio: ${dependency}`);
        if (inner) assert.ok(!target.split(/[\\/]/).includes('infrastructure'), `${path}: dependencia hacia infraestructura`);
      } else if (inner) {
        assert.fail(`${path}: dominio/aplicación dependen de ${dependency}`);
      }
    }
  }
}
console.log('Architecture passed: inner layers without framework imports; no cross-service source imports.');
