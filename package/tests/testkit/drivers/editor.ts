import { Page } from '@playwright/test';
import { ElementHandle } from 'playwright';

export class EditorDriver {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async fill(value: string): Promise<void> {
        const editor = await this.getEditor();
        await editor.fill(value);
    }

    async type(value: string): Promise<void> {
        await this.getEditor();
        await this.page.keyboard.type(value);
    }

    async press(key: string): Promise<void> {
        await this.getEditor();
        await this.page.keyboard.press(key);
    }

    async value(): Promise<string> {
        const editor = await this.getEditor();
        return editor.inputValue();
    }

    private async getEditor(): Promise<ElementHandle<SVGElement | HTMLElement>> {
        const editor = await this.page.waitForSelector('[role="textbox"]');
        await editor.focus();
        return editor;
    }
}
