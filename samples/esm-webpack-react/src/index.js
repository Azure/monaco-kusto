import React from 'react';
import ReactDOM from 'react-dom/client';

// Imports all monaco features and no languages. See monaco example (1) for a
// more details on importing specific features
// (1) https://github.com/microsoft/monaco-editor/blob/main/samples/browser-esm-webpack-small/index.js
//
// Replace edcore.main import with this to import all monaco-editor languages
// import * as monaco from 'monaco-editor';
//
import * as monaco from 'monaco-editor/esm/vs/editor/edcore.main';

import { getKustoWorker } from '@kusto/monaco-kusto';

import './index.css';

// Called by playwright script in ci to validate things are working
window.healthCheck = async function () {
    return !!(await getKustoWorker());
};

self.MonacoEnvironment = {
    getWorker(_moduleId, label) {
        // https://webpack.js.org/guides/web-workers/
        if (label === 'kusto') {
            return new Worker(
                /* webpackChunkName: "kusto-worker" */ new URL(
                    '@kusto/monaco-kusto/release/esm/kusto.worker',
                    import.meta.url
                )
            );
        }
        return new Worker(
            /* webpackChunkName: "editor-worker" */ new URL(
                'monaco-editor/esm/vs/editor/editor.worker',
                import.meta.url
            )
        );
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

function App() {
    const divRef = React.useRef(null);

    React.useLayoutEffect(() => {
        let disposed = false;

        const editor = monaco.editor.create(divRef.current, {
            value: 'StormEvents | take 10',
            language: 'kusto',
            theme: 'kusto-light',
        });

        getKustoWorker().then((workerAccessor) => {
            if (disposed) {
                return;
            }
            const model = editor.getModel();
            workerAccessor(model.uri).then((worker) => {
                if (disposed) {
                    return;
                }
                worker.setSchemaFromShowSchema(schema, 'https://help.kusto.windows.net', 'Samples');
            });
        });

        return () => {
            disposed = true;
            editor.dispose();
        };
    });

    return <div className="editor" ref={divRef} />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
