import { Page } from '@playwright/test';

export async function loadPageAndWait(page: Page) {
    await page.goto('http://localhost:7777/');
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
}
