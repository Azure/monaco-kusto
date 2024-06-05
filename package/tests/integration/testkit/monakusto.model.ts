import { Page } from '@playwright/test';
import { LanguageSettings } from '../../../src/languageServiceManager/settings';

export const createMonaKustoModel = (page: Page) => {
    const editor = page.locator('[role="textbox"]');

    return {
        intellisense: () => ({
            wait: () => {
                return page.waitForSelector('[role="listbox"]');
            },
            options: () => {
                return page.getByRole('option');
            },
            option: (index: number) => {
                return page.locator('[role="option"]').nth(index);
            },
            selected: () => {
                return page.locator('[role="option"].focused');
            },
        }),
        editor: () => ({
            locator: editor,
        }),
        settings: () => ({
            set: async (property: keyof LanguageSettings, checked: boolean) => {
                const checkbox = page.locator(`[role="checkbox"][id="${property}"]`);
                await checkbox.setChecked(checked);
            },
        }),
    };
};

export type MonaKustoModel = ReturnType<typeof createMonaKustoModel>;
