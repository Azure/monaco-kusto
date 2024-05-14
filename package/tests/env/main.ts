import * as monaco from 'monaco-editor/esm/vs/editor/edcore.main';
import { getKustoWorker } from '../../release/esm/monaco.contribution';
import './index.css';

// Vite doesn't let us directly import files in dependencies as url's for some
// reason. Instead, we'll import local files as url's, and they'll import what
// we really want.
// @ts-ignore
import kustoWorkerUrl from './kustoWorker?url';
// @ts-ignore
import editorWorker from './editorWorker?url';

window.MonacoEnvironment = {
    getWorker(_moduleId, label) {
        switch (label) {
            case 'kusto':
                return new Worker(kustoWorkerUrl, { type: 'module' });
            default:
                return new Worker(editorWorker, { type: 'module' });
        }
    },
};

const schema = {
    Plugins: [],
    Databases: {
        Samples: {
            Name: 'Samples',
            Tables: {
                StormEvents: {
                    Name: 'StormEvents',
                    DocString:
                        'A dummy description to test that docstring shows as expected when hovering over a table',
                    OrderedColumns: [
                        {
                            Name: 'StartTime',
                            Type: 'System.DateTime',
                            CslType: 'datetime',
                            DocString: 'The start time',
                        },
                        {
                            Name: 'State',
                            Type: 'System.String',
                            CslType: 'string',
                        },
                    ],
                },
            },
            Functions: {},
        },
    },
};

const editor = monaco.editor.create(document.getElementById('root'), {
    value: 'StormEvents \n| take 10 \n| where StartTime > ago(1d)',
    language: 'kusto',
    theme: 'kusto-light',
});

window.addEventListener('resize', () => {
    editor.layout();
});

getKustoWorker().then((workerAccessor) => {
    const model = editor.getModel();
    if (model) {
        workerAccessor(model.uri).then((worker) => {
            worker.setSchemaFromShowSchema(schema, 'https://help.kusto.windows.net', 'Samples');
        });
    }
});
