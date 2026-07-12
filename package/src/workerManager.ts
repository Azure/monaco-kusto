import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import type { LanguageServiceDefaults } from './monaco.contribution';
import type { IKustoWorkerImpl, ICreateData } from './kustoWorker';

interface WorkerDetails {
    _worker: monaco.editor.MonacoWebWorker<IKustoWorkerImpl>;
    _client: IKustoWorkerImpl;
    _lastUsedTime: number;
}
export class WorkerManager {
    private _storedState: {
        schema: any;
    };

    private _defaults: LanguageServiceDefaults;
    private _idleCheckInterval: number;
    private _configChangeListener: monaco.IDisposable;

    private _workerDetails: WorkerDetails;
    private _workerDetailsPromise: Promise<WorkerDetails>;

    constructor(private _monacoInstance: typeof monaco, defaults: LanguageServiceDefaults) {
        this._defaults = defaults;
        this._idleCheckInterval = self.setInterval(() => this._checkIfIdle(), 30 * 1000);
        this._configChangeListener = this._defaults.onDidChange(() => this._saveStateAndStopWorker());
    }

    private _stopWorker() {
        const workerToStop = this._workerDetails;
        this._workerDetailsPromise = null;
        this._workerDetails = null;

        // Ensure disposal occurs only after the last request completes.
        // This is necessary because setting the languageSettings disposes of the worker,
        // causing the setSchema call to remain unresolved, which prevents the semantic tokens provider from being registered.
        setTimeout(async () => {
            if (workerToStop._worker) {
                workerToStop._worker.dispose();
            }
        }, 5000);
    }

    private _saveStateAndStopWorker(): void {
        if (!this._workerDetails?._worker) {
            return;
        }

        this._workerDetails?._worker.getProxy().then((proxy) => {
            proxy.getSchema().then((schema) => {
                this._storedState = { schema: schema };
                this._stopWorker();
            });
        });
    }

    dispose(): void {
        clearInterval(this._idleCheckInterval);
        this._configChangeListener.dispose();
        this._stopWorker();
    }

    private _checkIfIdle(): void {
        if (!this._workerDetails?._worker) {
            return;
        }
        const maxIdleTime = this._defaults.getWorkerMaxIdleTime();
        let timePassedSinceLastUsed = Date.now() - this._workerDetails?._lastUsedTime;
        if (maxIdleTime > 0 && timePassedSinceLastUsed > maxIdleTime) {
            this._saveStateAndStopWorker();
        }
    }

    private _getClient(): Promise<WorkerDetails> {
        // Since onDidProvideCompletionItems is not used in web worker, and since functions cannot be trivially serialized (throws exception unable to clone), We remove it here.
        const { onDidProvideCompletionItems, ...languageSettings } = this._defaults.languageSettings;

        if (!this._workerDetailsPromise) {
            const createData: ICreateData = { languageSettings, languageId: 'kusto' };
            const workerPromise = this._resolveWorker().then((w) => {
                // kusto.worker.ts discards the first message, then arms
                // monaco's initialize() listener which consumes the second (createData).
                w.postMessage('ignore');
                w.postMessage(createData);
                return w;
            });
            const worker = this._monacoInstance.editor.createWebWorker<IKustoWorkerImpl>({
                worker: workerPromise,
                keepIdleModels: false,
            });

            const client = worker.getProxy().then((proxy) => {
                // push state we held onto before killing the client.
                if (this._storedState) {
                    return proxy.setSchema(this._storedState.schema).then(() => proxy);
                } else {
                    return proxy;
                }
            });

            this._workerDetailsPromise = client.then((client) => {
                this._workerDetails = {
                    _worker: worker,
                    _client: client,
                    _lastUsedTime: Date.now(),
                };
                return this._workerDetails;
            });
        }
        return this._workerDetailsPromise;
    }

    getLanguageServiceWorker(...resources: monaco.Uri[]): Promise<IKustoWorkerImpl> {
        let _client: IKustoWorkerImpl;
        return this._getClient()
            .then((client) => {
                _client = client._client;
            })
            .then((_) => {
                return this._workerDetails?._worker?.withSyncedResources(resources);
            })
            .then((_) => _client);
    }

    private async _resolveWorker(): Promise<Worker> {
        const env = (globalThis as any).MonacoEnvironment;
        if (env && typeof env.getWorker === 'function') {
            return env.getWorker('workerMain.js', 'kusto');
        }
        if (env && typeof env.getWorkerUrl === 'function') {
            const url = env.getWorkerUrl('workerMain.js', 'kusto');
            return new Worker(url, { name: 'kusto' });
        }
        throw new Error(
            "monaco-kusto: MonacoEnvironment.getWorker (or getWorkerUrl) must be defined and route label 'kusto' to the kusto worker script"
        );
    }
}
