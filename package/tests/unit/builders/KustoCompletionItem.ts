import k2 = Kusto.Language.Editor;
import { faker } from '@faker-js/faker';

interface KustoCompletionItem extends k2.CompletionItem {
    Priority: number;
}

export function kustoCompletionItemBuilder() {
    const completionItem: KustoCompletionItem = {
        Kind: k2.CompletionKind.Unknown,
        DisplayText: faker.lorem.word(),
        MatchText: null,
        Priority: null,
        ApplyTexts: null,
        BeforeText: null,
        AfterText: null,
        EditText: null,
        Retrigger: null,
        WithKind: null,
        WithDisplayText: null,
        WithMatchText: null,
        WithApplyTexts$1: null,
        WithApplyTexts: null,
        WithApplyTexts$2: null,
        WithBeforeText: null,
        WithEditText: null,
        WithAfterText: null,
        WithRetrigger: null,
    };

    const builder = {
        withKind: (kind: k2.CompletionKind) => {
            completionItem.Kind = kind;
            return builder;
        },
        withMatchText: (matchText: string) => {
            completionItem.MatchText = matchText;
            return builder;
        },
        withPriority: (priority: number) => {
            completionItem.Priority = priority;
            return builder;
        },
        build: (): k2.CompletionItem => completionItem,
    };

    return builder;
}
