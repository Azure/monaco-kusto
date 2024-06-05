import { Page } from '@playwright/test';
import { LanguageSettings } from '../../../src/languageServiceManager/settings';

export class SettingsDriver {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async set(property: keyof LanguageSettings, checked: boolean): Promise<void> {
        const checkbox = await this.page.waitForSelector(`[role="checkbox"][id="${property}"]`);
        await checkbox.setChecked(checked);
    }
}
