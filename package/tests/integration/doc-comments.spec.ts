import { test, expect } from '@playwright/test';
import { createMonaKustoModel, MonaKustoModel, loadPageAndWait } from './testkit';

test('scalar', async ({ page }) => {
    await loadPageAndWait(page);
    const model = createMonaKustoModel(page);

    const editor = model.editor().locator;
    await editor.focus();
    await editor.fill('print _time_zone');

    await page.getByRole('code').getByText('_time_zone').hover();
    const tooltip = await page.getByRole('tooltip').locator('.rendered-markdown').innerText();
    expect(tooltip).toEqual(
        `_time_zone: string\n\nIANA time zone. For example: "America/Los_Angeles", UTC, or "Europe/Stockholm"`
    );
});

test('tabular', async ({ page }) => {
    await loadPageAndWait(page);
    const model = createMonaKustoModel(page);

    const editor = model.editor().locator;
    await editor.focus();
    await editor.fill('print _base_query');

    await page.getByRole('code').getByText('_base_query').hover();
    const tooltip = await page.getByRole('tooltip').locator('.rendered-markdown').innerText();
    expect(tooltip).toEqual(
        `_base_query: table(StartTime)\n\nBase query\nAvailability: Inline\n\nBase query will be inlined into this query`
    );
});
