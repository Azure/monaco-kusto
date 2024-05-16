import { test, expect } from '@playwright/test';

const initialValue = 'StormEvents \n| take 10 ';

test('trigger completion on "("', async ({ page }) => {
    await page.goto('http://localhost:7777/');

    const value = `${initialValue} \n| where StartTime > ago`;
    await page.getByRole('textbox').fill(value);
    await page.keyboard.type('(');

    const option = page.getByRole('option').first();
    await expect(option).toHaveText('1dbreak');
});
