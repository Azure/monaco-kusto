import * as monaco from 'monaco-editor';
import { getKustoWorker } from '@kusto/monaco-kusto';

import kustoWorkerUrl from 'url:@kusto/monaco-kusto/release/esm/kusto.worker';
import editorWorkerUrl from 'url:monaco-editor/esm/vs/editor/editor.worker';

import './index.css';

declare global {
    interface Window {
        healthCheck(): Promise<boolean>;
    }
}

self.MonacoEnvironment = {
    getWorkerUrl(_moduleId, label) {
        if (label === 'kusto') {
            return kustoWorkerUrl;
        }
        return editorWorkerUrl;
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

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const editor = monaco.editor.create(document.getElementById('root')!, {
    value: 'StormEvents | take 10',
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
