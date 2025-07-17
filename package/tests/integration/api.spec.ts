import { test, expect } from '@playwright/test';
import { createMonaKustoModel, MonaKustoModel, loadPageAndWait } from './testkit';
import { KustoWorker } from '../../src/types';

test.describe('getReferencedGlobalParams', () => {
    test('maximumDepthExceeded', async ({ page }) => {
        const getReferencedParameters = () => {
            return page.evaluate(async () => {
                const worker: KustoWorker = await (window as any).getKustoWorker();
                return await worker.getReferencedGlobalParams((window as any).editor.getModel().uri.toString(), 0);
            });
        };

        await loadPageAndWait(page);
        const model = createMonaKustoModel(page);

        const editor = model.editor().locator;
        await editor.focus();

        await editor.fill('print 10');
        expect((await getReferencedParameters()).kind).toBe('ok');

        await editor.fill('print 10' + '\n | where 1 == 1'.repeat(500));
        expect((await getReferencedParameters()).kind).toBe('maximumDepthExceeded');
    });
});
