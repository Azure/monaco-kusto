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

const defaultSchema = {
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
            },
            Functions: {},
        },
    },
};

function getEditorValue(): string {
    const defaultValue = '';
    const storageValue = localStorage.getItem('dev-kusto-query');
    return storageValue?.trim().length ? storageValue : defaultValue;
}

const editor = monaco.editor.create(document.getElementById('editor'), {
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

const schema = window.schema === undefined ? defaultSchema : window.schema;

getKustoWorker().then((workerAccessor) => {
    const model = editor.getModel();
    if (model && schema !== null) {
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
