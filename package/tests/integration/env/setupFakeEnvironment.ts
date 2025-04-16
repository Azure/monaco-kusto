import type { Page } from '@playwright/test';

export async function setupFakeEnvironment(page: Page, schema?: any) {
    await page.addInitScript((schema) => {
        window.schema = schema;
    }, schema);
}
