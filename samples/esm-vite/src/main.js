import * as monaco from 'monaco-editor/esm/vs/editor/edcore.main';
import { getKustoWorker } from '@kusto/monaco-kusto';
import './index.css';

// Vite doesn't let us directly import files in dependencies as url's for some
// reason. Instead, we'll import local files as url's, and they'll import what
// we really want.
import kustoWorkerUrl from './kustoWorker?url';
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

// Called by playwright script in ci to validate things are working
window.healthCheck = async function () {
    return !!(await getKustoWorker());
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
    value: 'StormEvents | take 10',
    language: 'kusto',
    theme: 'kusto-light',
    'semanticHighlighting.enabled': true,
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
