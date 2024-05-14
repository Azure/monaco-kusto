import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    outputDir: './.test-results',
    preserveOutput: 'failures-only',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        trace: 'on-first-retry',
        headless: false,
        defaultBrowserType: 'chromium',
        baseURL: 'http://localhost:7777/',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'yarn dev',
        reuseExistingServer: !process.env.CI,
    },
});
