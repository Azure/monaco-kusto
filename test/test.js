var shim = {
    'language-service/kusto.javascript.client.min': {
        deps: ['language-service/bridge.min']
    },
    'language-service-next/Kusto.Language.Bridge.min': {
        deps: ['language-service/kusto.javascript.client.min']
    },
    'vs/language/kusto/monaco.contribution': {
        deps: ['vs/editor/editor.main']
    },
};

var requirejs_dev_config = {
    baseUrl: '../',
    paths: {
        'vs/language/kusto': '../out/amd',
        'vs': '../out/vs',
        'language-service': './node_modules/@kusto/language-service/',
        'language-service-next': './node_modules/@kusto/language-service-next/',
        'lodash-amd': './node_modules/lodash-amd/main',
        'vscode-languageserver-types': '../node_modules/vscode-languageserver-types/lib/umd/main',
        // For worker:
        'xregexp': '../../../node_modules/xregexp/xregexp-all',
    },
    shim: shim
}

var requirejs_release_config = {
    baseUrl: '../',
    paths: {
        'vs/language/kusto': `../release/min`,
        'vs':'./out/vs',
        'language-service': `../release/min`,
        'language-service-next': `../release/min`
    },
    shim: shim
}

fetch('./test/mode.txt')
    .then(response => response.text())
    .then(mode => {
        mode = mode.trim();
        requirejs.config(mode == "dev" ? requirejs_dev_config : requirejs_release_config);
        requirejs(['vs/loader', 'vs/editor/editor.main', 'vs/editor/editor.main.nls', 'language-service/bridge.min', 'language-service/kusto.javascript.client.min',
        'language-service-next/Kusto.Language.Bridge.min', 'vs/language/kusto/monaco.contribution'], function () {
            var editor = monaco.editor.create(document.getElementById('container'), {
                value: ['StormEvents | project StartTime , State | where toupper(State) == "Texas" | count'].join(
                    '\n'
                ),
                language: 'kusto',
                selectionHighlight: false,
                theme: 'kusto-light',
                folding: true
            });

            window.getCurrentCommand = () => {
                monaco.languages.kusto.getKustoWorker().then(workerAccessor => {
                    const model = editor.getModel();
                    workerAccessor(model.uri).then(worker => {
                        worker
                            .getCommandAndLocationInContext(
                                model.uri.toString(),
                                model.getOffsetAt(editor.getPosition())
                            )
                            .then(command => {
                                const { text, range } = command;
                                const currentCommand = document.getElementById('currentCommand');
                                currentCommand.innerHTML = range.toString() + text;
                            });
                    });
                });
            };

            window.getQueryParams = () => {
                monaco.languages.kusto.getKustoWorker().then(workerAccessor => {
                    const model = editor.getModel();
                    workerAccessor(model.uri).then(worker => {
                        worker
                            .getQueryParams(model.uri.toString(), model.getOffsetAt(editor.getPosition()))
                            .then(queryParams => {
                                currentCommand.innerHTML = JSON.stringify(queryParams);
                            });
                    });
                });
            };

            window.getGlobalParams = () => {
                monaco.languages.kusto.getKustoWorker().then(workerAccessor => {
                    const model = editor.getModel();
                    workerAccessor(model.uri).then(worker => {
                        worker.getGlobalParams(model.uri.toString()).then(queryParams => {
                            currentCommand.innerHTML = JSON.stringify(queryParams);
                        });
                    });
                });
            };

            window.getReferencedGlobalParams = () => {
                monaco.languages.kusto.getKustoWorker().then(workerAccessor => {
                    const model = editor.getModel();
                    workerAccessor(model.uri).then(worker => {
                        worker
                            .getReferencedGlobalParams(
                                model.uri.toString(),
                                model.getOffsetAt(editor.getPosition())
                            )
                            .then(referencedParams => {
                                currentCommand.innerHTML = JSON.stringify(referencedParams);
                            });
                    });
                });
            };

            window.getRenderInfo = () => {
                monaco.languages.kusto.getKustoWorker().then(workerAccessor => {
                    const model = editor.getModel();
                    workerAccessor(model.uri).then(worker => {
                        worker
                            .getRenderInfo(model.uri.toString(), model.getOffsetAt(editor.getPosition()))
                            .then(renderInfo => {
                                currentCommand.innerHTML = JSON.stringify(renderInfo);
                            });
                    });
                });
            };

            window.setDM = () => {
                monaco.languages.kusto.getKustoWorker().then(workerAccessor => {
                    const model = editor.getModel();
                    workerAccessor(model.uri).then(worker => {
                        worker.setSchema(null, 'DataManagement');
                    });
                });
            };

            window.setCustomSchema = () => {

                let table = {
                    name: "table1",
                    columns: [
                        {
                            name: "col1",
                            type: "string",
                        }
                    ]
                }

                let database = {
                    name: "customSchema",
                    tables: [
                        table
                    ],
                    majorVersion: 0,
                    functions: [],
                    minorVersion: 0
                }

                let customSchema = {
                    clusterType: 'Engine',
                    cluster: {
                        connectionString: "",
                        databases: [database]
                    },
                    database: database
                }


                monaco.languages.kusto.getKustoWorker().then(workerAccessor => {
                    const model = editor.getModel();
                    workerAccessor(model.uri).then(worker => {
                        worker.setSchema(customSchema);
                    });
                });
            };

            const schema = {
                Plugins: [
                    {
                        Name: 'pivot'
                    }
                ],
                Databases: {
                    Samples: {
                        Name: 'Samples',
                        Tables: {
                            StormEvents: {
                                Name: 'StormEvents',
                                OrderedColumns: [
                                    {
                                        Name: 'StartTime',
                                        Type: 'System.DateTime',
                                        CslType: 'datetime'
                                    },
                                    {
                                        Name: 'EndTime',
                                        Type: 'System.DateTime',
                                        CslType: 'datetime'
                                    },
                                    {
                                        Name: 'EpisodeId',
                                        Type: 'System.Int32',
                                        CslType: 'int'
                                    },
                                    {
                                        Name: 'EventId',
                                        Type: 'System.Int32',
                                        CslType: 'int'
                                    },
                                    {
                                        Name: 'State',
                                        Type: 'System.String',
                                        CslType: 'string'
                                    }
                                ]
                            },
                            ForecastExample: {
                                Name: 'ForecastExample',
                                OrderedColumns: [
                                    {
                                        Name: 'Timestamp',
                                        Type: 'System.DateTime',
                                        CslType: 'datetime'
                                    },
                                    {
                                        Name: 'RequestCount',
                                        Type: 'System.Int64',
                                        CslType: 'long'
                                    }
                                ]
                            }
                        },
                        Functions: {
                            MyFunction1: {
                                Name: 'MyFunction1',
                                InputParameters: [],
                                Body: '{     StormEvents     | limit 100 }  ',
                                Folder: 'Demo',
                                DocString: 'Simple demo function',
                                FunctionKind: 'Unknown',
                                OutputColumns: []
                            },
                            MyFunction2: {
                                Name: 'MyFunction2',
                                InputParameters: [
                                    {
                                        Name: 'myLimit',
                                        Type: 'System.Int64',
                                        CslType: 'long'
                                    }
                                ],
                                Body: '{     StormEvents     | limit myLimit }  ',
                                Folder: 'Demo',
                                DocString: 'Demo function with parameter',
                                FunctionKind: 'Unknown',
                                OutputColumns: []
                            }
                        }
                    }
                }
            };
            const schema2 = {
                Plugins: [
                    {
                        Name: 'pivot'
                    }
                ],
                Databases: {
                    Kuskus: {
                        Name: 'Kuskus',
                        Tables: {
                            KustoLogs: {
                                Name: 'KustoLogs',
                                OrderedColumns: [
                                    {
                                        Name: 'Timestamp',
                                        Type: 'System.DateTime',
                                        CslType: 'datetime'
                                    },
                                    {
                                        Name: 'EventText',
                                        Type: 'System.String',
                                        CslType: 'string'
                                    },
                                    {
                                        Name: 'Level',
                                        Type: 'System.String',
                                        CslType: 'string'
                                    },
                                    {
                                        Name: 'Source',
                                        Type: 'System.String',
                                        CslType: 'string'
                                    }
                                ]
                            },
                            Usage: {
                                Name: 'Usage',
                                OrderedColumns: [
                                    {
                                        Name: 'StartedOn',
                                        Type: 'System.DateTime',
                                        CslType: 'datetime'
                                    },
                                    {
                                        Name: 'User',
                                        Type: 'System.String',
                                        CslType: 'string'
                                    }
                                ]
                            }
                        },
                        Functions: {
                            FindCIDPast24h: {
                                Name: 'FindCIDPast24h',
                                InputParameters: [],
                                Body: '{     KustoLogs     | limit 100 }  ',
                                Folder: 'Demo',
                                DocString: 'Find CID past 24 hours',
                                FunctionKind: 'Unknown',
                                OutputColumns: []
                            },
                            MyFunction2: {
                                Name: 'FindCID',
                                InputParameters: [
                                    {
                                        Name: 'cid',
                                        Type: 'System.String',
                                        CslType: 'string'
                                    },
                                    {
                                        Name: 'startTime',
                                        Type: 'System.Datetime',
                                        CslType: 'datetime'
                                    }
                                ],
                                Body:
                                    '{     KustoLogs     | where Timestamp > startTime | where EventText has cid }  ',
                                Folder: 'Demo',
                                DocString: 'Find  CID in after a cetain time',
                                FunctionKind: 'Unknown',
                                OutputColumns: []
                            }
                        }
                    }
                }
            };
            window.setHelp = () =>
                monaco.languages.kusto.getKustoWorker().then(workerAccessor => {
                    const model = editor.getModel();
                    workerAccessor(model.uri).then(worker => {
                        worker.setSchemaFromShowSchema(schema, 'https://help.kusto.windows.net', 'Samples');
                    });
                });
            window.setHelpWithParameter = () =>
                monaco.languages.kusto.getKustoWorker().then(workerAccessor => {
                    const model = editor.getModel();
                    workerAccessor(model.uri).then(worker => {
                        worker.setSchemaFromShowSchema(schema, 'https://help.kusto.windows.net', 'Samples', [
                            { name: 'region', type: 'System.String', cslType: 'string' }
                        ]);
                    });
                });
            window.setKuskus = () =>
                monaco.languages.kusto.getKustoWorker().then(workerAccessor => {
                    const model = editor.getModel();
                    workerAccessor(model.uri).then(worker => {
                        worker.setSchemaFromShowSchema(schema2, 'https://kuskus.kusto.windows.net', 'Kuskus');
                    });
                });
            window.setSemanticOff = () =>
                monaco.languages.kusto.getKustoWorker().then(workerAccessor => {
                    const monacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
                    monaco.useSemanticColorization = false;
                    monaco.languages.kusto.kustoDefaults.setLanguageSettings(monacoSettings);
                });
            window.setSemanticOn = () =>
                monaco.languages.kusto.getKustoWorker().then(workerAccessor => {
                    const monacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
                    monaco.useSemanticColorization = true;
                    monaco.languages.kusto.kustoDefaults.setLanguageSettings(monacoSettings);
                });
            window.setIntellisenseV1 = () =>
                monaco.languages.kusto.getKustoWorker().then(workerAccessor => {
                    const monacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
                    monacoSettings.useIntellisenseV2 = false;
                    monaco.languages.kusto.kustoDefaults.setLanguageSettings(monacoSettings);
                });
            window.setIntellisenseV2 = () =>
                monaco.languages.kusto.getKustoWorker().then(workerAccessor => {
                    const monacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
                    monacoSettings.useIntellisenseV2 = true;
                    monaco.languages.kusto.kustoDefaults.setLanguageSettings(monacoSettings);
                });
            window.setDarkTheme = () => monaco.editor.setTheme('kusto-dark');
            window.setLightTheme = () => monaco.editor.setTheme('kusto-light');
            window.setDisableClusterCompletion = () =>
                monaco.languages.kusto.getKustoWorker().then(workerAccessor => {
                    const monacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
                    monacoSettings.disabledCompletionItems = ['cluster', 'database'];
                    monaco.languages.kusto.kustoDefaults.setLanguageSettings(monacoSettings);
                });
            window.setEnableClusterCompletion = () =>
                monaco.languages.kusto.getKustoWorker().then(workerAccessor => {
                    const monacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
                    monacoSettings.disabledCompletionItems = [];
                    monaco.languages.kusto.kustoDefaults.setLanguageSettings(monacoSettings);
                });
            window.setHelp();
        });
    });