import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: {
      PGLITE_DIR: 'memory',
      ADMIN_EMAIL: 'owner@example.com',
      ADMIN_PASSWORD: 'Sup3rSecretPassw0rd',
    },
    testTimeout: 30000,
  },
});
