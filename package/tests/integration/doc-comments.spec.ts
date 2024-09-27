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
    expect(tooltip).toMatchSnapshot();
});

test('tabular', async ({ page }) => {
    await loadPageAndWait(page);
    const model = createMonaKustoModel(page);

    const editor = model.editor().locator;
    await editor.focus();
    await editor.fill('print _base_query');

    await page.getByRole('code').getByText('_base_query').hover();
    const tooltip = await page.getByRole('tooltip').locator('.rendered-markdown').innerText();
    expect(tooltip).toMatchSnapshot();
});
