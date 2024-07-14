import { Page } from '@playwright/test';
import { LanguageSettings } from '../../../src/languageServiceManager/settings';
import { ThemeName } from '../../../src/syntax-highlighting/themes';

export const createMonaKustoModel = (page: Page) => {
    return {
        intellisense: () => ({
            wait: async () => page.waitForSelector('[role="listbox"]'),
            waitForFocused: async () => page.waitForSelector('[role="option"].focused'),
            options: () => ({ locator: page.getByRole('option') }),
            option: (index: number) => ({ locator: page.locator(`[role="option"][data-index="${index}"]`) }),
            focused: () => ({ locator: page.locator('[role="option"].focused') }),
            focus: async (index: number) => {
                const selectedOption = page.locator('[role="option"].focused');
                const hasFocusedItem = await selectedOption.isVisible();
                if (!hasFocusedItem) {
                    await page.keyboard.press('ArrowDown'); // focus the first item
                    return;
                }

                const selectedOptionIndex = await selectedOption.getAttribute('data-index');
                const numOfArrowUpClicks = parseInt(selectedOptionIndex);
                for (let i = 0; i < numOfArrowUpClicks; i++) {
                    await page.keyboard.press('ArrowUp');
                }
            },
        }),
        editor: () => ({
            locator: page.locator('[role="textbox"]'),
            setTheme: async (theme: ThemeName) => {
                const button = page.locator(`#${theme}`);
                await button.click();
            },
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
