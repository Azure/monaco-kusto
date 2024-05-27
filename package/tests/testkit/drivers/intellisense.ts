import { Page } from '@playwright/test';
import { Locator } from 'playwright';

export class IntelliSenseDriver {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async waitForIntelliSense(): Promise<void> {
        await this.page.waitForSelector('[role="listbox"]');
    }

    async getAllOptions(): Promise<Locator[]> {
        await this.waitForIntelliSense();
        return this.page.getByRole('option').all();
    }

    async getOptionByIndex(index: number): Promise<Locator> {
        await this.waitForIntelliSense();
        return this.page.getByRole('option').nth(index);
    }

    async applySelected(): Promise<void> {
        await this.waitForIntelliSense();
        await this.page.keyboard.press('Enter');
    }

    async getSelectedOption(): Promise<Locator> {
        await this.waitForIntelliSense();
        return this.page.locator('[role="option"].focused');
    }
}
