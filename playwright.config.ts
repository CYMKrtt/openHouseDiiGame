import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', timeout: 30000, workers: 1, reporter: 'list',
  use: { browserName: 'chromium', launchOptions: { executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' }, baseURL: 'http://127.0.0.1:3100' },
  webServer: [
    { command: 'node scripts/test-server.mjs', url: 'http://127.0.0.1:3100', reuseExistingServer: false, timeout: 120000 },
    { command: 'node scripts/reference-server.mjs', url: 'http://127.0.0.1:3101/landing-join-cp01-v1.1.html', reuseExistingServer: false, timeout: 30000 },
  ],
});
