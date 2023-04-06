import React from 'react';
import './App.css';

// https://webpack.js.org/guides/web-workers/
const kustoWorker = new Worker(new URL('@kusto/monaco-kusto/release/esm/kusto.worker', import.meta.url));
const editorWorker = new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url));

console.log({ kustoWorkerUrl, editorWorkerUrl });

self.MonacoEnvironment = {
    globalAPI: true,
    getWorker(_moduleId, label) {
        if (label === 'kusto') {
            return kustoWorker;
        }
        return editorWorker;
    },
};

// Must occur _after_ self.MonacoEnvironment.globalApi is defined
import * as monaco from 'monaco-editor';

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

        monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
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

    return <div className="Editor" ref={divRef} />;
}

export default App;
