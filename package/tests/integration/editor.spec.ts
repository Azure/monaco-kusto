import { test, expect } from '@playwright/test';
import { loadPageAndWait } from './testkit';
import { EditorDriver } from './testkit/drivers';

test.describe('editor', () => {
    let editor: EditorDriver;

    test.beforeEach(async ({ page }) => {
        await loadPageAndWait(page);

        editor = new EditorDriver(page);
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
            test(`should auto close ${open}`, async () => {
                await editor.type(open);
                let editorValue = await editor.value();
                expect(editorValue).toEqual(`${open}${close}`);

                await editor.press('Backspace');
                editorValue = await editor.value();
                expect(editorValue).toEqual('');
            });
        });
    });
});
