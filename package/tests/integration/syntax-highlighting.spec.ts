import { test, expect, Page, Locator } from '@playwright/test';
import { createMonaKustoModel, MonaKustoModel, loadPageAndWait } from './testkit';
import { ThemeName, themes } from '../../src/syntaxHighlighting/themes';
import { Token } from '../../src/syntaxHighlighting/types';
import convert from 'color-convert';

const query = `// Query to analyze storm events 
StormEvents
| extend [\`\`\`Multi
line
Column\`\`\`] = "test"
| where State == "Custom State 1"
| project StartTime, EndTime, Duration = datetime_diff('minute', EndTime, StartTime)
| summarize TotalDuration = avg(Duration) by State
| order by TotalDuration desc`;

const queryTokensToQueryParts = {
    [Token.Comment]: ['// Query to analyze storm events'],
    [Token.Table]: ['StormEvents'],
    [Token.QueryOperator]: ['where', 'project', 'summarize', 'order', 'extend'],
    [Token.Column]: ['StartTime', 'EndTime', 'Duration', 'TotalDuration'],
    [Token.Function]: ['datetime_diff', 'avg'],
    [Token.StringLiteral]: ['Custom State 1', 'minute', 'Multi', 'line', 'Column', 'test', '```'],
    [Token.MathOperator]: ['=='],
    [Token.Punctuation]: ['|', ',', '(', ')', '=', '[', ']'],
};

const themeNames = [ThemeName.light, ThemeName.dark];

test.describe('syntax highlighting', () => {
    let model: MonaKustoModel;
    let assertTextColor: (text: string, expectedColor: string) => Promise<void>;

    test.beforeEach(async ({ page }) => {
        await loadPageAndWait(page);
        model = createMonaKustoModel(page);

        const editor = model.editor().locator;
        await editor.focus();
        await editor.fill(query);
        await page.keyboard.press('Enter');

        assertTextColor = createAssertTextColor(page);
    });

    themeNames.forEach(async (theme) => {
        test.describe(`theme: ${theme}`, () => {
            const tokensToColors = getTokensToColors(theme);

            test.beforeEach(async () => {
                await model.editor().setTheme(theme);
            });

            for (const [token, queryParts] of Object.entries(queryTokensToQueryParts)) {
                const colorInHex = tokensToColors[token];
                test(`${token} foreground color is ${colorInHex}`, async () => {
                    const queryAssertions = queryParts.map((part) => assertTextColor(part, colorInHex));
                    await Promise.all(queryAssertions);
                });
            }
        });
    });
});

function getTokensToColors(theme: ThemeName) {
    const themeRules = themes.find((t) => t.name === theme)?.data.rules;
    return themeRules.reduce((tokensToColorsAcc, rule) => {
        tokensToColorsAcc[rule.token] = rule.foreground;
        return tokensToColorsAcc;
    }, {});
}

function createAssertTextColor(page: Page) {
    return async (text: string, expectedColorInHex: string) => {
        const expectedColor = hexToRgb(expectedColorInHex);
        const elements = await page.getByText(text).all();

        if (elements.length === 0) {
            return expect(elements.length).not.toBe(0);
        }

        await Promise.all(elements.map((element) => expect(element).toHaveCSS('color', expectedColor)));
    };
}

function hexToRgb(hex: string): string {
    const [r, g, b] = convert.hex.rgb(hex);
    return `rgb(${r}, ${g}, ${b})`;
}
