import { defineConfig } from 'vitest/config';
export default defineConfig({
  server: {
    proxy: { '/api': process.env.GATEWAY_URL ?? 'http://127.0.0.1:3000' },
  },
  test: {
    environment: 'jsdom',
    // Node 25+ expone un storage nativo que interfiere con jsdom.
    execArgv:
      Number(process.versions.node.split('.')[0]) >= 25
        ? ['--no-webstorage']
        : [],
    globals: true,
    include: ['src/**/*.spec.tsx', 'src/**/*.spec.ts'],
  },
});
