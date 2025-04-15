import { test, expect } from '@playwright/test';
import { createMonaKustoModel, MonaKustoModel, loadPageAndWait } from './testkit';
import { setupFakeEnvironment } from './env/setupFakeEnvironment';

test.describe('editor', () => {
    let model: MonaKustoModel;

    test.beforeEach(async ({ page }) => {
        await setupFakeEnvironment(page)
        await loadPageAndWait(page);
        model = createMonaKustoModel(page);

        await model.editor().locator.focus();
    });

    test.describe('surrounding pairs', () => {
        const pairs = [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: "'", close: "'", notIn: ['string', 'comment'] },
            {
                open: '"',
                close: '"',
                notIn: ['string', 'comment'],
            },
        ];

        pairs.forEach(({ open, close }) => {
            test(`should auto close ${open}`, async ({ page }) => {
                await page.keyboard.type(open);
                const editor = model.editor().locator;
                let editorValue = await editor.inputValue();
                expect(editorValue).toEqual(`${open}${close}`);

                await page.keyboard.press('Backspace');
                editorValue = await editor.inputValue();
                expect(editorValue).toEqual('');
            });
        });

        test('should highlight matching pairs', async ({ page }) => {
            const bracketElements = page.locator('.bracket-match');

            await page.keyboard.type('StormEvents\n' + '| where (datetime() < ago(1h))\n');
            await expect(bracketElements).not.toBeVisible();

            await page.keyboard.press('ArrowLeft');
            await expect(bracketElements).toHaveCount(2);
        });
    });
});
