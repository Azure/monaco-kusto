import * as worker from 'monaco-editor/esm/vs/editor/editor.worker';
import { KustoWorker } from './kustoWorker';

self.onmessage = () => {
    // ignore the first message
    worker.initialize((ctx, createData) => {
        console.log({ createData });
        return new KustoWorker(ctx, createData);
    });
};
