import { test, expect } from '@playwright/test';
import { createMonaKustoModel, MonaKustoModel, loadPageAndWait } from './testkit';
import { KustoWorker } from '../../src/types';

test.describe('getReferencedGlobalParams', () => {
    test('maximumDepthExceeded', async ({ page }) => {
        await loadPageAndWait(page);
        const model = createMonaKustoModel(page);

        const editor = model.editor().locator;
        await editor.focus();

        await editor.fill('print 10');
        expect(await model.getReferencedGlobalParams()).toBe('success: {"kind":"ok","parameters":[]}');

        await editor.fill('print 10' + '\n | where 1 == 1'.repeat(500));

        expect(await model.getReferencedGlobalParams()).toBe('success: {"kind":"maximumDepthExceeded"}');
    });
});
