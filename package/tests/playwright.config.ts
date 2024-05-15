import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    outputDir: './.test-results',
    preserveOutput: 'failures-only',
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    timeout: 60_000,
    expect: { timeout: 10_000 },
    reporter: 'line',
    use: {
        trace: 'on-first-retry',
        defaultBrowserType: 'chromium',
    },
    webServer: {
        command: 'yarn vite serve . --config ./vite.config.ts',
        port: 7777,
        reuseExistingServer: !process.env.CI,
    },
});
