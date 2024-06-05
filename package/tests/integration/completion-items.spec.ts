import { test, expect } from '@playwright/test';
import { loadPageAndWait } from './testkit';
import { IntelliSenseDriver, EditorDriver } from './testkit/drivers';

test.describe('completion items', () => {
    let editor: EditorDriver;
    let intellisense: IntelliSenseDriver;

    test.beforeEach(async ({ page }) => {
        await loadPageAndWait(page);

        editor = new EditorDriver(page);
        const initialValue = 'StormEvents \n';
        await editor.fill(initialValue);
        intellisense = new IntelliSenseDriver(page);
    });

    test('triggered on "("', async () => {
        await editor.type('StormEvents \n| where StartTime > ago(');

        const option = await intellisense.getOptionByIndex(0);
        await expect(option).toHaveText('1d');
    });

    test('match with exact substring and exclude parameters', async () => {
        await editor.type('| where StartTime > ago');

        const options = await intellisense.getAllOptions();
        expect(options).toHaveLength(2);
    });

    test('ordered by columns first', async ({ page }) => {
        await editor.type('| sort by ');

        const option = await intellisense.getOptionByIndex(0);
        await expect(option).toHaveText('counter');
    });
});
