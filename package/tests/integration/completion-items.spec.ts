import { test, expect } from '@playwright/test';
import { createMonaKustoModel, MonaKustoModel, loadPageAndWait } from './testkit';

test.describe('completion items', () => {
    let model: MonaKustoModel;

    test.beforeEach(async ({ page }) => {
        await loadPageAndWait(page);
        model = createMonaKustoModel(page);

        const initialValue = 'StormEvents';
        const editor = model.editor().locator;
        await editor.focus();
        await editor.fill(initialValue);
        await model.intellisense().wait();
        await page.keyboard.press('Enter');
    });

    test('triggered on "("', async ({ page }) => {
        await page.keyboard.type('where StartTime > ago(');

        await model.intellisense().wait();
        const option = model.intellisense().option(0);
        await expect(option.locator).toHaveText('1d');
    });

    test('exclude parameters on matching results', async ({ page }) => {
        await page.keyboard.type('where StartTime > ago');

        await model.intellisense().wait();
        const options = model.intellisense().options();
        await expect(options.locator).toHaveCount(2);
    });

    test.describe('ordered by relevance', () => {
        test('verify alphabetical order of functions', async ({ page }) => {
            await page.keyboard.type('sort by ');

            await model.intellisense().wait();
            const option = model.intellisense().option(0);
            await expect(option.locator).toHaveText('counter');
        });

        test('ordered by columns first', async ({ page }) => {
            await page.keyboard.type('where t');
            await model.intellisense().wait();

            await page.keyboard.type('ime');
            await expect(model.intellisense().option(0).locator).toHaveText('StartTime');
        });
    });
});
