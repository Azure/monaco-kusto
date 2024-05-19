import { test, expect } from '@playwright/test';
import { loadPageAndWait } from './testkit';
import { IntelliSenseDriver, EditorDriver } from './testkit/drivers';

test.describe('Completion items tests', () => {
    let editor: EditorDriver;
    let intellisense: IntelliSenseDriver;

    test.beforeEach(async ({ page }) => {
        await loadPageAndWait(page);

        editor = new EditorDriver(page);
        const initialValue = 'StormEvents \n';
        await editor.fill(initialValue);
        intellisense = new IntelliSenseDriver(page);
    });

    test('trigger completion on "("', async () => {
        await editor.type('| where StartTime > ago(');

        const option = intellisense.getOptionByIndex(0);
        await expect(option).toHaveText('1d');
    });

    test('match with exact substring and exclude parameters', async ({ page }) => {
        await editor.type('| where StartTime > ago');

        const options = intellisense.getAllOptions();
        await expect(options).toHaveCount(1);
    });
});
