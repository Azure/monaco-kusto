import { ElementHandle, Page } from '@playwright/test';

export class EditorDriver {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async fill(value: string): Promise<void> {
        const editor = await this.page.waitForSelector('[role="textbox"]');
        await editor.fill(value);
    }

    async appendToEnd(value: string): Promise<void> {
        const editor = await this.page.waitForSelector('[role="textbox"]');
        await editor.focus();
        await this.page.keyboard.type(value);
    }
}
