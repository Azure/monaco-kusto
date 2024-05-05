const loader_dev_config = {
    baseUrl: '..',
    paths: {
        'vs/language/kusto': '../release/dev',
        vs: 'out/vs',
    },
};

const loader_release_config = {
    baseUrl: '..',
    paths: {
        'vs/language/kusto': `../release/min`,
        vs: 'out/vs',
    },
};

fetch('./test/mode.txt')
    .then((response) => response.text())
    .then((mode) => {
        const dev = mode == 'dev';
        console.log(`dev: ${dev}`);
        mode = mode.trim();
        require.config(dev ? loader_dev_config : loader_release_config);
        // 'vs/editor/editor.main' is not required here, but makes things load a little faster
        require(['vs/editor/editor.main', 'vs/language/kusto/monaco.contribution'], function () {
            const defaultValue = 'StormEvents \n| project StartTime , State \n| where State contains "Texas" \n| count';
            const storageValue = localStorage.getItem('dev-kusto-query');
            const value = storageValue?.trim().length ? storageValue : defaultValue;

            const editor = monaco.editor.create(document.getElementById('editor'), {
                value,
                language: 'kusto',
                selectionHighlight: false,
                theme: 'kusto-light',
                folding: true,
                suggest: {
                    selectionMode: 'whenQuickSuggestion',
                },
            });

            const updateEditorValueInLocalStorage = () => {
                localStorage.setItem('dev-kusto-query', editor.getValue());
            };
            const debouncedUpdateEditorValueInLocalStorage = (function () {
                let timeoutID;
                return () => {
                    clearTimeout(timeoutID);
                    timeoutID = setTimeout(() => {
                        updateEditorValueInLocalStorage();
                    }, 1000);
                };
            })();
            editor.onDidChangeModelContent(debouncedUpdateEditorValueInLocalStorage);

            window.getCurrentCommand = () => {
                monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
                    const model = editor.getModel();
                    workerAccessor(model.uri).then((worker) => {
                        worker
                            .getCommandAndLocationInContext(
                                model.uri.toString(),
                                model.getOffsetAt(editor.getPosition())
                            )
                            .then((command) => {
                                const { text, range } = command;
                                const currentCommand = document.getElementById('currentCommand');
                                currentCommand.innerHTML = JSON.stringify(range) + text;
                            });
                    });
                });
            };

            window.getQueryParams = () => {
                monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
                    const model = editor.getModel();
                    workerAccessor(model.uri).then((worker) => {
                        worker
                            .getQueryParams(model.uri.toString(), model.getOffsetAt(editor.getPosition()))
                            .then((queryParams) => {
                                currentCommand.innerHTML = JSON.stringify(queryParams);
                            });
                    });
                });
            };

            window.getGlobalParams = () => {
                monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
                    const model = editor.getModel();
                    workerAccessor(model.uri).then((worker) => {
                        worker.getGlobalParams(model.uri.toString()).then((queryParams) => {
                            currentCommand.innerHTML = JSON.stringify(queryParams);
                        });
                    });
                });
            };

            window.getReferencedSymbols = () => {
                monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
                    const model = editor.getModel();
                    workerAccessor(model.uri).then((worker) => {
                        worker
                            .getReferencedSymbols(model.uri.toString(), model.getOffsetAt(editor.getPosition()))
                            .then((referencedParams) => {
                                currentCommand.innerHTML = JSON.stringify(referencedParams);
                            });
                    });
                });
            };

            window.getReferencedGlobalParams = () => {
                monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
                    const model = editor.getModel();
                    workerAccessor(model.uri).then((worker) => {
                        worker
                            .getReferencedGlobalParams(model.uri.toString(), model.getOffsetAt(editor.getPosition()))
                            .then((referencedParams) => {
                                currentCommand.innerHTML = JSON.stringify(referencedParams);
                            });
                    });
                });
            };

            window.getRenderInfo = () => {
                monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
                    const model = editor.getModel();
                    workerAccessor(model.uri).then((worker) => {
                        worker
                            .getRenderInfo(model.uri.toString(), model.getOffsetAt(editor.getPosition()))
                            .then((renderInfo) => {
                                currentCommand.innerHTML = JSON.stringify(renderInfo);
                            });
                    });
                });
            };

            window.setDM = () => {
                monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
                    const model = editor.getModel();
                    workerAccessor(model.uri).then((worker) => {
                        worker.setSchema(null, 'DataManagement');
                    });
                });
            };

            window.setCustomSchema = () => {
                fetch('./test/custom_schema.json')
                    .then((response) => response.json())
                    .then((customSchema) => {
                        monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
                            const model = editor.getModel();
                            workerAccessor(model.uri).then((worker) => {
                                worker.setSchema(customSchema);
                            });
                        });
                    });
            };

            const schema = {
                Plugins: [
                    {
                        Name: 'pivot',
                    },
                ],
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
                                        Name: 'EndTime',
                                        Type: 'System.DateTime',
                                        CslType: 'datetime',
                                        DocString: 'The end time',
                                    },
                                    {
                                        Name: 'EpisodeId',
                                        Type: 'System.Int32',
                                        CslType: 'int',
                                    },
                                    {
                                        Name: 'EventId',
                                        Type: 'System.Int32',
                                        CslType: 'int',
                                    },
                                    {
                                        Name: 'State',
                                        Type: 'System.String',
                                        CslType: 'string',
                                        Examples: ['Custom State 1', 'Custom State 2'],
                                    },
                                ],
                            },
                            ForecastExample: {
                                Name: 'ForecastExample',
                                OrderedColumns: [
                                    {
                                        Name: 'Timestamp',
                                        Type: 'System.DateTime',
                                        CslType: 'datetime',
                                    },
                                    {
                                        Name: 'RequestCount',
                                        Type: 'System.Int64',
                                        CslType: 'long',
                                    },
                                ],
                            },
                            MaterializedViewExamples: {
                                Name: 'MaterializedViewExamples',
                                EntityType: 'MaterializedViewTable',
                                OrderedColumns: [
                                    {
                                        Name: 'MVTimestamp',
                                        Type: 'System.DateTime',
                                        CslType: 'datetime',
                                    },
                                    {
                                        Name: 'MVRequestCount',
                                        Type: 'System.Int64',
                                        CslType: 'long',
                                    },
                                ],
                            },
                        },
                        ExternalTables: {
                            TaxiRides: {
                                Name: 'TaxiRides',
                                Folder: 'ExternalTables',
                                DocString:
                                    'NYC taxi rides. Data source: https://www1.nyc.gov/site/tlc/about/tlc-trip-record-data.page',
                                OrderedColumns: [
                                    {
                                        Name: 'trip_id',
                                        Type: 'System.Int64',
                                        CslType: 'long',
                                    },
                                    {
                                        Name: 'vendor_id',
                                        Type: 'System.String',
                                        CslType: 'string',
                                    },
                                    {
                                        Name: 'pickup_datetime',
                                        Type: 'System.DateTime',
                                        CslType: 'datetime',
                                    },
                                    {
                                        Name: 'dropoff_datetime',
                                        Type: 'System.DateTime',
                                        CslType: 'datetime',
                                    },
                                    {
                                        Name: 'store_and_fwd_flag',
                                        Type: 'System.String',
                                        CslType: 'string',
                                    },
                                    {
                                        Name: 'rate_code_id',
                                        Type: 'System.Int32',
                                        CslType: 'int',
                                    },
                                ],
                            },
                        },
                        Functions: {
                            MyFunction1: {
                                Name: 'MyFunction1',
                                InputParameters: [],
                                Body: '{     StormEvents     | limit 100 }  ',
                                Folder: 'Demo',
                                DocString: 'Simple demo function',
                                FunctionKind: 'Unknown',
                                OutputColumns: [],
                            },
                            MyFunction2: {
                                Name: 'MyFunction2',
                                InputParameters: [
                                    {
                                        Name: 'myLimit',
                                        Type: 'System.Int64',
                                        CslType: 'long',
                                        DocString: 'Demo for a parameter',
                                        CslDefaultValue: '6',
                                    },
                                ],
                                Body: '{     StormEvents     | limit myLimit }  ',
                                Folder: 'Demo',
                                DocString: 'Demo function with parameter',
                                FunctionKind: 'Unknown',
                                OutputColumns: [],
                            },
                            $__timeFilter: {
                                Name: '$__timeFilter',
                                Body: '{ true }',
                                InputParameters: [
                                    {
                                        Name: 'timeColumn',
                                        Type: 'System.String',
                                        DefaultValue: 'TimeGenerated',
                                        CslDefaultValue: 'TimeGenerated',
                                    },
                                ],
                            },
                        },
                    },
                },
            };
            const schema2 = {
                Plugins: [
                    {
                        Name: 'pivot',
                    },
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
                                        CslType: 'datetime',
                                    },
                                    {
                                        Name: 'EventText',
                                        Type: 'System.String',
                                        CslType: 'string',
                                    },
                                    {
                                        Name: 'Level',
                                        Type: 'System.String',
                                        CslType: 'string',
                                    },
                                    {
                                        Name: 'Source',
                                        Type: 'System.String',
                                        CslType: 'string',
                                    },
                                ],
                            },
                            Usage: {
                                Name: 'Usage',
                                OrderedColumns: [
                                    {
                                        Name: 'StartedOn',
                                        Type: 'System.DateTime',
                                        CslType: 'datetime',
                                    },
                                    {
                                        Name: 'User',
                                        Type: 'System.String',
                                        CslType: 'string',
                                    },
                                ],
                            },
                        },
                        Functions: {
                            FindCIDPast24h: {
                                Name: 'FindCIDPast24h',
                                InputParameters: [],
                                Body: '{     KustoLogs     | limit 100 }  ',
                                Folder: 'Demo',
                                DocString: 'Find CID past 24 hours',
                                FunctionKind: 'Unknown',
                                OutputColumns: [],
                            },
                            MyFunction2: {
                                Name: 'FindCID',
                                InputParameters: [
                                    {
                                        Name: 'cid',
                                        Type: 'System.String',
                                        CslType: 'string',
                                    },
                                    {
                                        Name: 'startTime',
                                        Type: 'System.Datetime',
                                        CslType: 'datetime',
                                    },
                                ],
                                Body: '{     KustoLogs     | where Timestamp > startTime | where EventText has cid }  ',
                                Folder: 'Demo',
                                DocString: 'Find  CID in after a cetain time',
                                FunctionKind: 'Unknown',
                                OutputColumns: [],
                            },
                        },
                    },
                },
            };
            window.setHelp = () =>
                monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
                    const model = editor.getModel();
                    workerAccessor(model.uri).then((worker) => {
                        worker.setSchemaFromShowSchema(schema, 'https://help.kusto.windows.net', 'Samples');
                    });
                });
            window.setHelpWithParameter = () =>
                monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
                    const model = editor.getModel();
                    workerAccessor(model.uri).then((worker) => {
                        worker.setSchemaFromShowSchema(
                            schema,
                            'https://help.kusto.windows.net',
                            'Samples',
                            [{ name: 'region', type: 'System.String', cslType: 'string' }],
                            [
                                {
                                    name: 'tableParameter',
                                    type: 'type',
                                    docstring: '**Table**',
                                    columns: [
                                        { name: 'col1', cslType: 'int', type: 'int' },
                                        { name: 'col2', cslType: 'double', type: 'double' },
                                    ],
                                },
                            ]
                        );
                    });
                });
            window.setKuskus = () =>
                monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
                    const model = editor.getModel();
                    workerAccessor(model.uri).then((worker) => {
                        worker.setSchemaFromShowSchema(schema2, 'https://kuskus.kusto.windows.net', 'Kuskus');
                    });
                });
            window.setSemanticOff = () =>
                monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
                    const monacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
                    monacoSettings.useSemanticColorization = false;
                    monaco.languages.kusto.kustoDefaults.setLanguageSettings(monacoSettings);
                });
            window.setNewLineFormatting = () =>
                monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
                    const monacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
                    monacoSettings.formatter.pipeOperatorStyle = 'NewLine';
                    monaco.languages.kusto.kustoDefaults.setLanguageSettings(monacoSettings);
                });
            window.setSmartFormatting = () =>
                monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
                    const monacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
                    monacoSettings.formatter.pipeOperatorStyle = 'Smart';
                    monaco.languages.kusto.kustoDefaults.setLanguageSettings(monacoSettings);
                });
            window.enableSyntaxErrorAsMarkDown = () => {
                const monacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
                monacoSettings.syntaxErrorAsMarkDown = {
                    enableSyntaxErrorAsMarkDown: true,
                    header: 'Error',
                };
                monaco.languages.kusto.kustoDefaults.setLanguageSettings(monacoSettings);
            };
            window.disableSyntaxErrorAsMarkDown = () => {
                const monacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
                monacoSettings.syntaxErrorAsMarkDown = {
                    enableSyntaxErrorAsMarkDown: false,
                };
                monaco.languages.kusto.kustoDefaults.setLanguageSettings(monacoSettings);
            };
            window.setSemanticOn = () =>
                monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
                    const monacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
                    monacoSettings.useSemanticColorization = true;
                    monaco.languages.kusto.kustoDefaults.setLanguageSettings(monacoSettings);
                });
            window.setIntellisenseV1 = () =>
                monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
                    const monacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
                    monacoSettings.useIntellisenseV2 = false;
                    monaco.languages.kusto.kustoDefaults.setLanguageSettings(monacoSettings);
                });
            window.setIntellisenseV2 = () =>
                monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
                    const monacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
                    monacoSettings.useIntellisenseV2 = true;
                    monaco.languages.kusto.kustoDefaults.setLanguageSettings(monacoSettings);
                });
            window.enableQueryWarnings = () => {
                const monacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
                monacoSettings.enableQueryWarnings = true;
                monaco.languages.kusto.kustoDefaults.setLanguageSettings(monacoSettings);
            };
            window.disableQueryWarnings = () => {
                const monacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
                monacoSettings.enableQueryWarnings = false;
                monaco.languages.kusto.kustoDefaults.setLanguageSettings(monacoSettings);
            };
            window.enableQuerySuggestions = () => {
                const monacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
                monacoSettings.enableQuerySuggestions = true;
                monaco.languages.kusto.kustoDefaults.setLanguageSettings(monacoSettings);
            };
            window.disableQuerySuggestions = () => {
                const monacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
                monacoSettings.enableQuerySuggestions = false;
                monaco.languages.kusto.kustoDefaults.setLanguageSettings(monacoSettings);
            };
            window.enableQuickFix = () => {
                const monacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
                monacoSettings.enableQuickFix = true;
                monaco.languages.kusto.kustoDefaults.setLanguageSettings(monacoSettings);
            };
            window.disableQuickFix = () => {
                const monacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
                monacoSettings.enableQuickFix = false;
                monaco.languages.kusto.kustoDefaults.setLanguageSettings(monacoSettings);
            };
            window.setDarkTheme = () => monaco.editor.setTheme('kusto-dark');
            window.setLightTheme = () => monaco.editor.setTheme('kusto-light');
            window.setDisableClusterCompletion = () =>
                monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
                    const monacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
                    monacoSettings.disabledCompletionItems = ['cluster', 'database'];
                    monaco.languages.kusto.kustoDefaults.setLanguageSettings(monacoSettings);
                });
            window.setEnableClusterCompletion = () =>
                monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
                    const monacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
                    monacoSettings.disabledCompletionItems = [];
                    monaco.languages.kusto.kustoDefaults.setLanguageSettings(monacoSettings);
                });
            window.checkOnDidProvideCompletionItems = () => {
                monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
                    const monacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
                    monacoSettings.onDidProvideCompletionItems = (completionItems) => {
                        completionItems.items = completionItems.items.map((item) => {
                            item.label += ' onDidProvideCompletionItems WORKS';
                            return item;
                        });
                        return completionItems;
                    };
                    monaco.languages.kusto.kustoDefaults.setLanguageSettings(monacoSettings);
                });
            };
            window.getDatabaseReferences = () => {
                monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
                    const model = editor.getModel();
                    workerAccessor(model.uri).then((worker) => {
                        worker
                            .getDatabaseReferences(model.uri.toString(), model.getOffsetAt(editor.getPosition()))
                            .then((renderInfo) => {
                                currentCommand.innerHTML = JSON.stringify(renderInfo);
                            });
                    });
                });
            };
            window.getClusterReferences = () => {
                monaco.languages.kusto.getKustoWorker().then((workerAccessor) => {
                    const model = editor.getModel();
                    workerAccessor(model.uri).then((worker) => {
                        worker
                            .getClusterReferences(model.uri.toString(), model.getOffsetAt(editor.getPosition()))
                            .then((renderInfo) => {
                                currentCommand.innerHTML = JSON.stringify(renderInfo);
                            });
                    });
                });
            };
            window.setHelp();
        });
    });
