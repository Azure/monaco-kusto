import { Page } from '@playwright/test';
import { Locator } from 'playwright';

export class IntelliSenseDriver {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    getAllOptions(): Locator {
        return this.page.getByRole('option');
    }

    getOptionByIndex(index: number): Locator {
        return this.page.getByRole('option').nth(index);
    }
}
