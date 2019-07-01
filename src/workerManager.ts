import {LanguageServiceDefaultsImpl} from './monaco.contribution';
import {KustoWorker} from './kustoWorker';

import Promise = monaco.Promise;
import IDisposable = monaco.IDisposable;
import Uri = monaco.Uri;

export class WorkerManager {
	private _storedState: {
		schema: any,
	};

	private _defaults: LanguageServiceDefaultsImpl;
	private _idleCheckInterval: number;
	private _lastUsedTime: number;
	private _configChangeListener: IDisposable;

	private _worker: monaco.editor.MonacoWebWorker<KustoWorker>;
	private _client: Promise<KustoWorker>;

	constructor(defaults: LanguageServiceDefaultsImpl) {
		this._defaults = defaults;
		this._worker = null;
		this._idleCheckInterval = self.setInterval(() => this._checkIfIdle(), 30 * 1000);
		this._lastUsedTime = 0;
		this._configChangeListener = this._defaults.onDidChange(() => this._saveStateAndStopWorker());
	}

	private _stopWorker(): void {
		if (this._worker) {
			this._worker.dispose();
			this._worker = null;
		}
		this._client = null;
	}

	private _saveStateAndStopWorker(): void {
		if (!this._worker) {
			return;
		}

		this._worker.getProxy().then(proxy => {
			proxy.getSchema().then(schema => {
				this._storedState = {schema: schema};
				this._stopWorker();
			})
		})
	}

	dispose(): void {
		clearInterval(this._idleCheckInterval);
		this._configChangeListener.dispose();
		this._stopWorker();
	}

	private _checkIfIdle(): void {
		if (!this._worker) {
			return;
		}
		const maxIdleTime = this._defaults.getWorkerMaxIdleTime();
		let timePassedSinceLastUsed = Date.now() - this._lastUsedTime;
		if (maxIdleTime > 0 && timePassedSinceLastUsed > maxIdleTime) {
			this._saveStateAndStopWorker();
		}
	}

	private _getClient(): Promise<KustoWorker> {
		this._lastUsedTime = Date.now();

		if (!this._client) {
			this._worker = monaco.editor.createWebWorker<KustoWorker>({

				// module that exports the create() method and returns a `KustoWorker` instance
				moduleId: 'vs/language/kusto/kustoWorker',

				label: 'kusto',

				// passed in to the create() method
				createData: {
					languageSettings: this._defaults.languageSettings,
					languageId: 'kusto'
				}
			});

			this._client = this._worker.getProxy().then(proxy => {

				// push state we held onto before killing the client.
				if (this._storedState) {
					return proxy.setSchema(this._storedState.schema).then(() => proxy);
				} else {
					return proxy;
				}
			});
		}
		return this._client;
	}

	getLanguageServiceWorker(...resources: Uri[]): Promise<KustoWorker> {
		let _client: KustoWorker;
		return this._getClient().then((client) => {
				_client = client
			}).then(_ => {
				return this._worker.withSyncedResources(resources)
			}).then(_ => _client)
	}
}