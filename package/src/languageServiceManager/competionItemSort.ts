import k2 = Kusto.Language.Editor;

export const createSortingText = (priority: number) => {
    return priority.toString().padStart(10, '0');
};

export function sortCompletionItems(items: k2.CompletionItem[]) {
    return (
        items
            .sort((i1, i2) => i1.MatchText.localeCompare(i2.MatchText))
            // @ts-ignore
            .sort((i1, i2) => i1.Priority - i2.Priority)
            .sort((i1, i2) => getOrderingRank(i1) - getOrderingRank(i2))
    );
}

const CompletionKind = Kusto.Language.Editor.CompletionKind;
const CompletionRank = Kusto.Language.Editor.CompletionRank;

function getOrderingRank(item: k2.CompletionItem) {
    switch (item.Kind) {
        case CompletionKind.Example:
            return CompletionRank.Literal;

        case CompletionKind.QueryPrefix:
            return CompletionRank.Keyword;

        case CompletionKind.Keyword:
            return CompletionRank.Keyword;

        case CompletionKind.AggregateFunction:
            return CompletionRank.Aggregate;

        case CompletionKind.Column:
            return CompletionRank.Column;

        case CompletionKind.Table:
            return CompletionRank.Table;

        case CompletionKind.MaterialiedView:
        case CompletionKind.EntityGroup:
        case CompletionKind.Graph:
            return CompletionRank.Entity;

        case CompletionKind.Variable:
        case CompletionKind.Parameter:
            if (item.DisplayText == '$left' || item.DisplayText == '$right') {
                return CompletionRank.Literal;
            }
            return CompletionRank.Variable;

        case CompletionKind.BuiltInFunction:
        case CompletionKind.LocalFunction:
        case CompletionKind.DatabaseFunction:
            return CompletionRank.Function;

        case CompletionKind.ScalarInfix: {
            const firstChar = item.DisplayText[0];
            return isLetterOrDigit(firstChar) ? CompletionRank.StringOperator : CompletionRank.MathOperator;
        }

        case CompletionKind.ScalarPrefix:
        case CompletionKind.TabularPrefix:
        case CompletionKind.TabularSuffix:
        case CompletionKind.Identifier:
        case CompletionKind.Cluster:
        case CompletionKind.Database:
        case CompletionKind.Punctuation:
        case CompletionKind.Syntax:
        case CompletionKind.Unknown:
        case CompletionKind.RenderChart:
        default:
            return CompletionRank.Other;
    }
}

function isLetterOrDigit(char: string): boolean {
    const code = char.charCodeAt(0);
    return (
        (code >= 48 && code <= 57) || // 0-9
        (code >= 65 && code <= 90) || // A-Z
        (code >= 97 && code <= 122) // a-z
    );
}
