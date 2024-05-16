import { test, expect } from '@playwright/test';
import { loadPageAndWait } from './testkit';
import { IntelliSenseDriver, EditorDriver } from './testkit/drivers';

const initialValue = 'StormEvents \n| take 10 ';

test.describe('Completion items tests', () => {
    let editor: EditorDriver;
    let intellisense: IntelliSenseDriver;

    test.beforeEach(async ({ page }) => {
        await loadPageAndWait(page);
        editor = new EditorDriver(page);
        await editor.fill(initialValue);
        intellisense = new IntelliSenseDriver(page);
    });

    test('trigger completion on "("', async () => {
        await editor.type('| where StartTime > ago(');

        const option = await intellisense.getOptionByIndex(0);
        expect(option).toBe('1d');
    });
});
