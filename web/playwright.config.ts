import { defineConfig } from '@playwright/test';
const baseURL = process.env.CONFERENCE_TEST_BASE_URL || 'http://localhost:5173';
export default defineConfig({
  testDir: './tests',
  timeout: 120000,
  expect: { timeout: 20000 },
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL,
    headless: true,
    channel: 'chrome',
    trace: 'off',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--auto-select-desktop-capture-source=Entire screen',
      ],
    },
  },
  webServer:
    baseURL === 'http://localhost:5173'
      ? {
          command: 'npm run dev',
          url: 'http://localhost:5173',
          reuseExistingServer: true,
          timeout: 120000,
        }
      : undefined,
});
