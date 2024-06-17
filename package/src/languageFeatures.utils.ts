import * as ls from 'vscode-languageserver-types';

export function createCompletionFilteredText(
    searchWord: string | undefined,
    completionItem: ls.CompletionItem
): string {
    if (!searchWord) return completionItem.filterText;

    const containedInFilterText = completionItem.filterText.toLowerCase().includes(searchWord.toLowerCase());
    const shouldPrependSearchWord = completionItem.data.forcePrecedence && containedInFilterText;

    return shouldPrependSearchWord ? `${searchWord}${completionItem.filterText}` : completionItem.filterText;
}
