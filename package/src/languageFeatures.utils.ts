import * as ls from 'vscode-languageserver-types';

export function createCompletionFilteredText(
    searchWord: string | undefined,
    completionItem: ls.CompletionItem
): string {
    if (!searchWord) return completionItem.filterText;

    const containedInFilterText = completionItem.filterText.toLowerCase().includes(searchWord.toLowerCase());
    if (!containedInFilterText) return completionItem.filterText;

    return `${searchWord}${completionItem.filterText}`;
}
