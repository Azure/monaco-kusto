import * as worker from 'monaco-editor/esm/vs/editor/editor.worker';
import { KustoWorkerImpl } from './kustoWorker';

self.onmessage = () => {
    // ignore the first message
    worker.initialize((ctx, createData) => {
        return new KustoWorkerImpl(ctx, createData);
    });
};
