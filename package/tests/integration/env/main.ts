import * as monaco from 'monaco-editor/esm/vs/editor/edcore.main';
import { getKustoWorker } from '../../../release/esm/monaco.contribution';
import './index.css';
import debounce from 'lodash/debounce';

// Vite doesn't let us directly import files in dependencies as url's for some
// reason. Instead, we'll import local files as url's, and they'll import what
// we really want.
// @ts-ignore
import kustoWorkerUrl from './kustoWorker?url';
// @ts-ignore
import editorWorker from './editorWorker?url';
import type { ScalarParameter, TabularParameter } from '../../../src/monaco.contribution';

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

interface TestableMonacoEditorElement extends HTMLElement {
    __containerRef: monaco.editor.IStandaloneCodeEditor;
}

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
                SimpleGraph_Edges: {
                    Name: 'SimpleGraph_Edges',
                    Folder: 'Graph/Simple',
                    DocString:
                        'Represents a relationship table capturing interactions between entities such as people, companies, and cities.',
                    OrderedColumns: [
                        {
                            Name: 'source',
                            Type: 'System.String',
                            CslType: 'string',
                        },
                        {
                            Name: 'target',
                            Type: 'System.String',
                            CslType: 'string',
                        },
                        {
                            Name: 'lbl',
                            Type: 'System.String',
                            CslType: 'string',
                        },
                        {
                            Name: 'since',
                            Type: 'System.String',
                            CslType: 'string',
                        },
                    ],
                },
                SimpleGraph_Nodes: {
                    Name: 'SimpleGraph_Nodes',
                    Folder: 'Graph/Simple',
                    DocString:
                        'Represents a nodes table including people, companies, and cities, with associated metadata.',
                    OrderedColumns: [
                        {
                            Name: 'id',
                            Type: 'System.String',
                            CslType: 'string',
                        },
                        {
                            Name: 'lbl',
                            Type: 'System.String',
                            CslType: 'string',
                        },
                        {
                            Name: 'name',
                            Type: 'System.String',
                            CslType: 'string',
                        },
                        {
                            Name: 'properties',
                            Type: 'System.Object',
                            CslType: 'dynamic',
                        },
                    ],
                },
            },
            Functions: {
                MyFunc: {
                    Name: 'MyFunc',
                    InputParameters: [],
                    Body: '{     StormEvents     | limit 100 }  ',
                    Folder: 'Demo',
                    DocString: 'Simple demo function',
                    FunctionKind: 'Unknown',
                    OutputColumns: [],
                },
            },
            Graphs: {
                Simple: {
                    Name: 'Simple',
                    EntityType: 'Graph',
                    Nodes: ['SimpleGraph_Nodes'],
                    Edges: ['SimpleGraph_Edges'],
                    Snapshots: [],
                },
            },
        },
    },
};

function getEditorValue(): string {
    const defaultValue = '';
    const storageValue = localStorage.getItem('dev-kusto-query');
    return storageValue?.trim().length ? storageValue : defaultValue;
}

const container = document.getElementById('editor');
const editor = monaco.editor.create(container, {
    value: getEditorValue(),
    language: 'kusto',
    theme: 'kusto-light',
    selectOnLineNumbers: true,
    automaticLayout: true,
    minimap: {
        enabled: false,
    },
    fixedOverflowWidgets: true,
    suggest: {
        selectionMode: 'whenQuickSuggestion',
    },
    copyWithSyntaxHighlighting: true,
    'semanticHighlighting.enabled': true,
});
(container as TestableMonacoEditorElement).__containerRef = editor;

const updateEditorValueInLocalStorage = () => localStorage.setItem('dev-kusto-query', editor.getValue());
const debouncedUpdateEditorValueInLocalStorage = debounce(updateEditorValueInLocalStorage, 1000);
editor.onDidChangeModelContent(debouncedUpdateEditorValueInLocalStorage);

window.addEventListener('resize', () => {
    editor.layout();
});

const scalarParameter: ScalarParameter = {
    name: '_time_zone',
    type: 'string',
    docstring: 'IANA time zone. For example: "America/Los_Angeles", UTC, or "Europe/Stockholm"',
};

const tabularParameter: TabularParameter = {
    columns: [
        {
            name: 'StartTime',
            type: 'datetime',
        },
    ],
    name: '_base_query',
    docstring: '# Base query\n\n## Availability: Inline\n\nBase query will be inlined into this query\n',
};

getKustoWorker().then((workerAccessor) => {
    const model = editor.getModel();
    if (model) {
        workerAccessor(model.uri).then((worker) => {
            worker.setSchemaFromShowSchema(
                schema,
                'https://help.kusto.windows.net',
                'Samples',
                [scalarParameter],
                [tabularParameter]
            );
        });
    }
});

applyDefaultsOnDomElements();

function applyDefaultsOnDomElements() {
    const languageSettings = monaco.languages.kusto.kustoDefaults.languageSettings;

    const openSuggestionDialogAfterPreviousSuggestionAccepted = document.getElementById(
        'openSuggestionDialogAfterPreviousSuggestionAccepted'
    );
    (openSuggestionDialogAfterPreviousSuggestionAccepted as HTMLInputElement).checked =
        languageSettings.openSuggestionDialogAfterPreviousSuggestionAccepted;
}

function updateLanguageSettings(event: Event) {
    const property = (event.target as HTMLInputElement).id;
    const value = (event.target as HTMLInputElement).checked;

    monaco.languages.kusto.getKustoWorker().then(() => {
        const currentMonacoSettings = monaco.languages.kusto.kustoDefaults.languageSettings;
        const newMonacoSettings = Object.assign({}, currentMonacoSettings, {
            [property]: value,
        });
        monaco.languages.kusto.kustoDefaults.setLanguageSettings(newMonacoSettings);
    });
}

function setThemeMode(event: Event) {
    const theme = (event.target as HTMLInputElement).value;
    updateThemeInLocalStorage(theme);
    monaco.editor.setTheme(theme);
}

const updateThemeInLocalStorage = (theme = 'kusto-light') => {
    localStorage.setItem('dev-theme', theme);
};

applyDefaultTheme();

function getInitialThemeValue(): string {
    const defaultValue = 'kusto-light';
    const storageValue = localStorage.getItem('dev-theme');
    return storageValue?.trim().length ? storageValue : defaultValue;
}

function applyDefaultTheme() {
    const value = getInitialThemeValue();
    const themeRadios = document.getElementsByName('theme');
    const radioArray = Array.from(themeRadios);
    const radioToCheck = radioArray.find((radio: HTMLInputElement) => radio.value === value);
    (radioToCheck as HTMLInputElement).checked = true;
    monaco.editor.setTheme(value);
}

(window as any).updateLanguageSettings = updateLanguageSettings;
(window as any).setThemeMode = setThemeMode;
(window as any).getReferencedGlobalParamsButton = async () =>
    getKustoWorker()
        .then((workerAccessor) => workerAccessor(editor.getModel().uri))
        .then((worker) => worker.getReferencedGlobalParams(editor.getModel().uri.toString(), 0))
        .then(
            (result) => alert('success: ' + JSON.stringify(result)),
            (result) => alert('exception: ' + JSON.stringify(result))
        );
