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

test.describe('worker proxy', () => {
    test('exposes language-service methods (regression for #528)', async ({ page }) => {
        await loadPageAndWait(page);

        await page.waitForFunction(() => Boolean((window as any).__kustoWorkerAccessor));

        const result = await page.evaluate(async () => {
            const editorEl = document.querySelector('[data-testid="query-editor"]') as any;
            const model = editorEl.__containerRef.getModel();
            const workerAccessor = (window as any).__kustoWorkerAccessor;
            const worker = await workerAccessor(model.uri);

            const validation = await worker.doValidation(model.uri.toString(), []);
            const folding = await worker.doFolding(model.uri.toString());

            return {
                hasDoComplete: typeof worker.doComplete === 'function',
                hasDoValidation: typeof worker.doValidation === 'function',
                hasDoFolding: typeof worker.doFolding === 'function',
                hasSetSchema: typeof worker.setSchema === 'function',
                validationDefined: validation !== undefined,
                foldingDefined: folding !== undefined,
            };
        });

        expect(result).toEqual({
            hasDoComplete: true,
            hasDoValidation: true,
            hasDoFolding: true,
            hasSetSchema: true,
            validationDefined: true,
            foldingDefined: true,
        });
    });
});
