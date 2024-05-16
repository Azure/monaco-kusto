import { ElementHandle, Page } from '@playwright/test';

export class IntelliSenseDriver {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async getAllOptions(): Promise<string[]> {
        const options = await this.page.$$eval('[role="option"]', (options) =>
            options.map((option) => option.textContent || '')
        );
        return options;
    }

    async getOptionByIndex(index: number): Promise<string | null> {
        const option = this.page.getByRole('option').nth(index);
        return option.textContent();
    }
}
