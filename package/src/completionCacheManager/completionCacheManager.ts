import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import * as ls from 'vscode-languageserver-types';

export const createCompletionCacheManager = (getFromLanguageService: GetFromLanguageService) => {
    let completionList: Promise<ls.CompletionList> | undefined;
    let lastWord: string | undefined;

    return {
        getCompletionItems: (word: string | undefined, resource: monaco.Uri, position: ls.Position) => {
            const shouldGetItems = !lastWord || !word || !word?.includes(lastWord);
            if (shouldGetItems) {
                completionList = getFromLanguageService(resource, position);
            }

            lastWord = word;
            return completionList;
        },
    };
};

export type CompletionCacheManager = ReturnType<typeof createCompletionCacheManager>;
export type GetFromLanguageService = (resource: monaco.Uri, position: ls.Position) => Promise<ls.CompletionList>;
