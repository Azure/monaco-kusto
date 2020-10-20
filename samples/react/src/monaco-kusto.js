import { monaco } from '@monaco-editor/react';

/**
 * A promise to be returned by the init function.
 */
let promiseResolve = null;
const monacoKustoInitPromise = new Promise((resolve) => {
    promiseResolve = resolve;
});

/**
 * when monaco is loaded, it also loads a UMD module loader. the following script tag will load monaco kusto using that loader.
 */
const loadMonacoKusto = () => {
    const script = document.createElement('script');
    script.innerHTML = `require(['vs/language/kusto/monaco.contribution'], function() {
    document.dispatchEvent(new Event('kusto_init'));
  });
`;
    return document.body.appendChild(script);
};

/**
 * Configuring monaco's UMD loader to load all the rest of monaco (and monaco-kusto) from the following location (that's why we're copying everything to public folder).
 */
monaco.config({
    paths: {
        vs: `${process.env.PUBLIC_URL}/monaco-editor/min/vs`,
    },
});

/**
 * remove evnent listener and resolve init promise once script is loaded.
 */
const onMonacoKustoLoaded = () => {
    document.removeEventListener('kusto_init', onMonacoKustoLoaded);
    promiseResolve(window.monaco);
};

/**
 * import monaco and monaco-kusto.
 * @returns a promise that will be resolved once all dependencies are loaded.
 */
export const init = () => {
    monaco.init().then(() => {
        document.addEventListener('kusto_init', onMonacoKustoLoaded);
        loadMonacoKusto();
    });
    return monacoKustoInitPromise;
};
