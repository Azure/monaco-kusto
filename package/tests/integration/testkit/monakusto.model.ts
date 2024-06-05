import { Page } from '@playwright/test';
import { LanguageSettings } from '../../../src/languageServiceManager/settings';

export const createMonaKustoModel = (page: Page) => {
    const editor = page.locator('[role="textbox"]');

    return {
        intellisense: () => ({
            wait: async () => page.waitForSelector('[role="listbox"]'),
            options: () => ({ locator: page.getByRole('option') }),
            option: (index: number) => ({ locator: page.locator('[role="option"]').nth(index) }),
            selected: () => ({ locator: page.locator('[role="option"].focused') }),
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
