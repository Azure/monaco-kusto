import type { OnDidProvideCompletionItems } from '../types';

export interface LanguageSettings {
    includeControlCommands?: boolean;
    newlineAfterPipe?: boolean;
    openSuggestionDialogAfterPreviousSuggestionAccepted?: boolean;
    useIntellisenseV2: boolean;
    useSemanticColorization?: boolean;
    useTokenColorization?: boolean;
    disabledCompletionItems?: string[];
    onDidProvideCompletionItems?: OnDidProvideCompletionItems;
    enableHover?: boolean;
    formatter?: FormatterOptions;
    syntaxErrorAsMarkDown?: SyntaxErrorAsMarkDownOptions;
    enableQueryWarnings?: boolean;
    enableQuerySuggestions?: boolean;
    disabledDiagnosticCodes?: string[];
    quickFixCodeActions?: QuickFixCodeActionOptions[];
    enableQuickFixes?: boolean;
    documentationBaseUrl?: boolean;
    /**
     * will be added to the end of the documentation url in suggestions
     */
    documentationSuffix?: string;
}

export interface FormatterOptions {
    indentationSize?: number;
    pipeOperatorStyle?: FormatterPlacementStyle;
}

export interface SyntaxErrorAsMarkDownOptions {
    header?: string;
    icon?: string;
    enableSyntaxErrorAsMarkDown?: boolean;
}

export type QuickFixCodeActionOptions = 'Extract Expression' | 'Extract Function' | 'Change to' | 'FixAll';

export type FormatterPlacementStyle = 'None' | 'NewLine' | 'Smart';
