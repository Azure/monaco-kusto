
import * as worker from 'monaco-editor-core/esm/vs/editor/editor.worker';
import { KustoWorker } from './kustoWorker';

self.onmessage = () => {
	// ignore the first message
	worker.initialize((ctx, createData) => {
		return new KustoWorker(ctx, createData)
	});
};
