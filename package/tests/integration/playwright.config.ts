import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    outputDir: './.test-results',
    preserveOutput: 'failures-only',
    forbidOnly: !!process.env.CI,
    workers: process.env.CI ? 1 : undefined,
    timeout: 5_000,
    expect: { timeout: 5_000 },
    // https://playwright.dev/docs/test-reporters#github-actions-annotations
    // 'github' for GitHub Actions CI to generate annotations, plus a concise 'dot'
    // default 'list' when running locally
    reporter: process.env.CI ? [['github'], ['html']] : undefined,
    use: {
        trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
        defaultBrowserType: 'chromium',
    },
    webServer: {
        command: 'yarn vite serve . --config ./vite.config.ts',
        port: 7777,
        reuseExistingServer: !process.env.CI,
    },
});
