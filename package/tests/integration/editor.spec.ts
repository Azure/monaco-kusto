import { test, expect } from '@playwright/test';
import { createMonaKustoModel, MonaKustoModel, loadPageAndWait } from './testkit';

test.describe('editor', () => {
    let model: MonaKustoModel;

    test.beforeEach(async ({ page }) => {
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
    });
});
