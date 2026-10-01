// @ts-check
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.SITE_URL || 'https://h9239021-ops.github.io/geunte-attendance/',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    locale: 'ko-KR',
  },
});
