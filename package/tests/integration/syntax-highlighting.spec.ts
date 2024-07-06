import { test, expect, Page, Locator } from '@playwright/test';
import { createMonaKustoModel, MonaKustoModel, loadPageAndWait } from './testkit';

test.describe('syntax highlighting', () => {
    let model: MonaKustoModel;
    let assertTextColor: (text: string, expectedColor: string) => Promise<void>;

    test.beforeEach(async ({ page }) => {
        await loadPageAndWait(page);
        model = createMonaKustoModel(page);

        const query = `// Query to analyze storm events 
StormEvents
| where State == "Custom State 1"
| project StartTime, EndTime, Duration = datetime_diff('minute', EndTime, StartTime)
| summarize TotalDuration = avg(Duration) by State
| order by TotalDuration desc`;
        const editor = model.editor().locator;
        await editor.focus();
        await editor.fill(query);
        await page.keyboard.press('Enter');
        assertTextColor = getAssertTextColor(page);
    });

    test('comments are green', async ({ page }) => {
        const rgbGreen = 'rgb(0, 128, 0)';
        await assertTextColor('// Query to analyze storm events', rgbGreen);
    });

    test('tables are purple', async ({ page }) => {
        const darkOrchid = 'rgb(153, 50, 204)';
        await assertTextColor('StormEvents', darkOrchid);
    });

    test('query operators are orange', async ({ page }) => {
        const orangeRed = 'rgb(255, 69, 0)';
        await assertTextColor('where', orangeRed);
        await assertTextColor('project', orangeRed);
        await assertTextColor('summarize', orangeRed);
        await assertTextColor('order', orangeRed);
    });

    test('columns are violet', async ({ page }) => {
        const mediumVioletRed = 'rgb(199, 21, 133)';
        await assertTextColor('StartTime', mediumVioletRed);
        await assertTextColor('EndTime', mediumVioletRed);
        await assertTextColor('Duration', mediumVioletRed);
        await assertTextColor('TotalDuration', mediumVioletRed);
    });

    test('functions are blue', async ({ page }) => {
        const blue = 'rgb(0, 0, 255)';
        await assertTextColor('datetime_diff', blue);
        await assertTextColor('avg', blue);
    });

    test('keywords are blue', async ({ page }) => {
        const blue = 'rgb(0, 0, 255)';
        await assertTextColor('by', blue);
        await assertTextColor('desc', blue);
    });

    test('string literals are red', async ({ page }) => {
        const fireBrick = 'rgb(178, 34, 34)';
        await assertTextColor('Custom State 1', fireBrick);
        await assertTextColor('minute', fireBrick);
    });

    test('math operators are black', async ({ page }) => {
        const black = 'rgb(0, 0, 0)';
        await assertTextColor('==', black);
    });

    test('punctuations are black', async ({ page }) => {
        const black = 'rgb(0, 0, 0)';
        await assertTextColor('|', black);
        await assertTextColor(',', black);
        await assertTextColor(' = ', black);
        await assertTextColor('(', black);
        await assertTextColor(')', black);
    });
});

function getAssertTextColor(page: Page) {
    return async (text: string, expectedColor: string) => {
        const elements = await page.getByText(text).all();
        await Promise.all(elements.map((element) => expect(element).toHaveCSS('color', expectedColor)));
    };
}
