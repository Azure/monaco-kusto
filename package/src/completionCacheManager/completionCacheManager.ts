import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import * as ls from 'vscode-languageserver-types';

export const createCompletionCacheManager = (getFromLanguageService: GetFromLanguageService) => {
    let completionList: ls.CompletionList | undefined;
    let lastWord: string | undefined;

    return {
        getCompletionItems: async (word: string | undefined, resource: monaco.Uri, position: ls.Position) => {
            const isIncluded = word?.includes(lastWord);
            const shouldGetItems = !lastWord || !word || !isIncluded;
            if (shouldGetItems) {
                completionList = await getFromLanguageService(resource, position);
            }

            lastWord = word;
            return Promise.resolve(completionList);
        },
    };
};

export type CompletionCacheManager = ReturnType<typeof createCompletionCacheManager>;
export type GetFromLanguageService = (resource: monaco.Uri, position: ls.Position) => Promise<ls.CompletionList>;
