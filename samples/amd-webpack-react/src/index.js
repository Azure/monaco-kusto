import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

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

// Called by playwright script in ci to validate things are working
window.sanityCheck = async function () {
    await new Promise((resolve) =>
        __non_webpack_require__(['vs/editor/editor.main', 'vs/language/kusto/monaco.contribution'], () => resolve())
    );
    return !!(await monaco.languages.kusto.getKustoWorker());
};

function App() {
    const divRef = React.useRef(null);

    React.useLayoutEffect(() => {
        let disposed = false;
        let editor;
        // monaco-editor's loader is called via a global `require` function. We need to call this via `__non_webpack_require__` to avoid webpack's module resolution.
        //
        // https://webpack.js.org/api/module-variables/#__non_webpack_require__-webpack-specific
        __non_webpack_require__(['vs/editor/editor.main', 'vs/language/kusto/monaco.contribution'], () => {
            if (disposed) {
                return;
            }
            editor = monaco.editor.create(divRef.current, {
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
        });

        return () => {
            disposed = true;
            editor?.dispose();
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
