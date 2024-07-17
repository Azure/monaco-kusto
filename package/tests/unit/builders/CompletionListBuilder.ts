import { CompletionList, CompletionItem } from 'vscode-languageserver-types';
import { faker } from '@faker-js/faker';

export function completionListBuilder() {
    const completionList: CompletionList = {
        isIncomplete: false,
        items: [],
    };

    const builder = {
        addItem: (completionItem: CompletionItem) => {
            completionList.items = [...completionList.items, completionItem];
            return builder;
        },
        build: (): CompletionList => completionList,
    };

    return builder;
}

export function completionItemBuilder() {
    const completionItem: CompletionItem = {
        label: faker.lorem.word(),
        filterText: faker.lorem.word(),
    };

    const builder = {
        withFilterText: (filterText: string) => {
            completionItem.filterText = filterText;
            return builder;
        },
        build: (): CompletionItem => completionItem,
    };

    return builder;
}
