// import * as monaco from 'monaco-editor';
// import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
// import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/editor/browser/coreCommands.js';
import 'monaco-editor/esm/vs/editor/contrib/find/browser/findController.js';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';

// import '@kusto/language-service/bridge';
// import '@kusto/language-service/newtonsoft.json';
// import '@kusto/language-service/Kusto.JavaScript.Client.min';

import tsWorkerUrl from 'url:monaco-editor/esm/vs/language/typescript/ts.worker.js';
// import editorWorkerUrl from 'url:monaco-editor/esm/vs/editor/editor.worker.js';
import kustoWorkerUrl from 'url:@kusto/monaco-kusto/release/esm/kustoWorker.js';

/// <reference types="@kusto/monaco-kusto/src/monaco.d.ts" />

import './index.css';
import {
    LanguageServiceDefaultsImpl,
    setupMonacoKusto,
    defaultLanguageSettings,
} from '@kusto/monaco-kusto/release/esm/monaco.contribution';

// https://github.com/microsoft/monaco-editor/blob/main/samples/browser-esm-parcel/src/index.js
// eslint-disable-next-line no-restricted-globals
self.MonacoEnvironment = {
    getWorkerUrl(_moduleId, label) {
        console.log({ _moduleId, label });
        if (label === 'typescript' || label === 'javascript') {
            return tsWorkerUrl;
        }

        // if (label === 'kusto') {
        return kustoWorkerUrl;
        // }

        // return editorWorkerUrl;
    },
};

// setupMonacoKusto(monaco, monaco.languages.g)

monaco.languages.register({
    id: 'kusto',
    extensions: ['.csl', '.kql'],
});

monaco.languages.kusto = { kustoDefaults: new LanguageServiceDefaultsImpl(defaultLanguageSettings) };

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const editor = monaco.editor.create(document.getElementById('root')!, {
    value: 'console.log("Hello World");',
    language: 'kusto',
});

// eslint-disable-next-line no-restricted-globals
self.addEventListener('resize', () => {
    editor.layout();
});

// eslint-disable-next-line no-restricted-globals
// self.monaco = monaco;
