import { test, expect, Locator } from '@playwright/test';
import { createMonaKustoModel, MonaKustoModel, loadPageAndWait } from './testkit';

test.describe('completion items', () => {
    let model: MonaKustoModel;
    let editor: Locator;

    test.beforeEach(async ({ page }) => {
        await loadPageAndWait(page);
        model = createMonaKustoModel(page);

        const initialValue = 'StormEvents';
        editor = model.editor().locator;
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

    test('exclude punctuation only syntax', async ({ page }) => {
        await page.keyboard.type('lookup kind = ');
        await model.intellisense().wait();
        const options = model.intellisense().options();
        await expect(options.locator.first()).not.toContainText('[');
    });

    test('verify alphabetical order of functions', async ({ page }) => {
        await page.keyboard.type('summarize coun');
        await model.intellisense().wait();
        await expect(model.intellisense().option(0).locator).toContainText('count()');
        await expect(model.intellisense().option(1).locator).toContainText('count_distinct(');
    });

    test('keeps language-service ordering', async ({ page }) => {
        // Split typing the time string to ensure the language service is invoked on t instead of time.
        await page.keyboard.type('where t');
        await model.intellisense().wait();

        await page.keyboard.type('ime');

        await model.intellisense().focus(0);
        const options = await model.intellisense().options().locator.allInnerTexts();
        expect(options).toEqual([
            'EndTime',
            'StartTime',
            '_time_zone',
            'datetime()',
            'datetime_add(part, value, datetime)',
            'datetime_diff(part, datetime1, datetime2)',
            'datetime_list_timezones()',
            'datetime_local_to_utc(from, timezone)',
            'datetime_part(part, date)',
            'datetime_utc_to_local(from, timezone)',
            'format_datetime(date, format)',
            'format_timespan(timespan, format)',
            'ingestion_time()',
        ]);
    });

    test('focus the first item that matches user input as a prefix', async ({ page }) => {
        // Split typing the time string to ensure the language service is invoked on t instead of time.
        await page.keyboard.type('where t');
        await model.intellisense().wait();

        await page.keyboard.type('ime');
        await model.intellisense().waitForFocused();

        const focusedItem = model.intellisense().focused();
        expect(focusedItem.locator).toHaveText('timespan()');
    });

    test('Intellisense should remain open when typing "project-re"', async ({ page }) => {
        await editor.pressSequentially('project');
        await model.intellisense().wait();
        await editor.pressSequentially('-re');
        await model.intellisense().wait();

        const options = model.intellisense().options();
        await expect(options.locator).toHaveCount(2);
    });
});
