import { test, expect } from '@playwright/test';
import { IntelliSenseDriver, EditorDriver } from './testkit/drivers';

const initialValue = 'StormEvents \n| take 10 ';

test('trigger completion on "("', async ({ page }) => {
    await page.goto('http://localhost:7777/');

    const editor = new EditorDriver(page);
    await editor.fill(initialValue);
    await editor.appendToEnd('| where StartTime > ago(');

    const intellisense = new IntelliSenseDriver(page);
    const option = await intellisense.getOptionByIndex(0);
    expect(option).toBe('1d');
});
