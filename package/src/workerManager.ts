import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import type { LanguageServiceDefaults } from './monaco.contribution';
import type { IKustoWorkerImpl } from './kustoWorker';

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
            const worker = this._monacoInstance.editor.createWebWorker<IKustoWorkerImpl>({
                // module that exports the create() method and returns a `KustoWorker` instance
                moduleId: 'vs/language/kusto/kustoWorker',

                label: 'kusto',

                // passed in to the create() method
                createData: {
                    languageSettings: languageSettings,
                    languageId: 'kusto',
                },
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
}
