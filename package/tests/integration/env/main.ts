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

getKustoWorker().then((workerAccessor) => {
    const model = editor.getModel();
    if (model) {
        workerAccessor(model.uri).then((worker) => {
            worker.setSchemaFromShowSchema(schema, 'https://help.kusto.windows.net', 'Samples');
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

(window as any).updateLanguageSettings = updateLanguageSettings;
