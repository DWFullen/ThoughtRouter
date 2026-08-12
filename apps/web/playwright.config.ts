import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.e2e\.ts/,
  use: { baseURL: 'http://127.0.0.1:3000' },
  webServer: {
    command: 'pnpm --filter @thoughtrouter/web dev',
    port: 3000,
    reuseExistingServer: true
  }
});
