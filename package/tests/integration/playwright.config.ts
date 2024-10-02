import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    outputDir: './.test-results',
    preserveOutput: 'failures-only',
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    timeout: 5_000,
    expect: { timeout: 5_000 },
    // https://playwright.dev/docs/test-reporters#github-actions-annotations
    // 'github' for GitHub Actions CI to generate annotations, plus a concise 'dot'
    // default 'list' when running locally
    reporter: process.env.CI ? 'github' : 'list',
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
