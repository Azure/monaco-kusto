import { Range, TextDocument } from 'vscode-languageserver-types';
import { getKustoLanguageService } from './kustoLanguageService';
import { getTrailingSeparatorStart } from '../util';

jest.mock('language-service', () => ({}), { virtual: true });

const service = getKustoLanguageService();

function document(text: string): TextDocument {
    return TextDocument.create('file:///formatting.kql', 'kusto', 1, text);
}

describe('document formatting separators', () => {
    test('formats the full command range while skipping whitespace-only blocks', async () => {
        const doc = document('print x=1\n\n\n\nprint y=2');
        const range = Range.create(doc.positionAt(0), doc.positionAt(doc.getText().length));
        expect(await service.doRangeFormat(doc, range)).toEqual([{ range, newText: 'print x = 1\r\nprint y = 2' }]);
    });

    test('returns no range edits for a blank document', async () => {
        const doc = document(' \t\n\n');
        const range = Range.create(doc.positionAt(0), doc.positionAt(doc.getText().length));
        expect(await service.doRangeFormat(doc, range)).toEqual([]);
    });

    test.each(['\n', '\r\n'])('preserves a large multiline literal using %j newlines', async (newline) => {
        const literal = '```first' + newline.repeat(10000) + 'last```';
        const separator = newline + ' \t' + newline;
        const input = 'print x=' + literal + separator + 'print y=2';
        const doc = document(input);
        const edits = await service.doDocumentFormat(doc);

        expect(edits).toEqual([
            {
                range: Range.create(doc.positionAt(0), doc.positionAt(input.length)),
                newText: 'print x = ' + literal + separator + 'print y = 2',
            },
        ]);
    });

    const cases = [
        {
            name: 'LF',
            input: 'print x=1|project x\n\nprint y=2|project y',
            expected: 'print x = 1 | project x\n\nprint y = 2 | project y',
            selection: 'print x = 1 | project x\r\nprint y = 2 | project y',
        },
        {
            name: 'CRLF',
            input: 'print x=1|project x\r\n\r\nprint y=2|project y',
            expected: 'print x = 1 | project x\r\n\r\nprint y = 2 | project y',
            selection: 'print x = 1 | project x\r\nprint y = 2 | project y',
        },
        {
            name: 'multiple blank parser blocks',
            input: 'print x=1\n\n\n\nprint y=2',
            expected: 'print x = 1\n\n\n\nprint y = 2',
            selection: 'print x = 1\r\nprint y = 2',
        },
        {
            name: 'spaces and tabs in separators',
            input: 'print x=1 \n \t\n\t\nprint y=2',
            expected: 'print x = 1\n \t\n\t\nprint y = 2',
            selection: 'print x = 1\r\nprint y = 2',
        },
        {
            name: 'comments-only block',
            input: 'print x=1\n\n// comment only\n\nprint y=2',
            expected: 'print x = 1\n\n// comment only\n\nprint y = 2',
            selection: 'print x = 1\r\n// comment only\n\nprint y = 2',
        },
        {
            name: 'let group',
            input: 'let x=1;\nprint x|project x\n\nprint y=2',
            expected: 'let x = 1;\r\nprint x | project x\n\nprint y = 2',
            selection: 'let x = 1;\r\nprint x | project x\r\nprint y = 2',
        },
        {
            name: 'known management command',
            input: '.show tables\n\nprint y=2',
            expected: '.show tables\n\nprint y = 2',
            selection: '.show tables\r\nprint y = 2',
        },
        {
            name: 'unknown management command',
            input: '.unknown command\n\nprint y=2',
            expected: '.unknown command\n\nprint y = 2',
            selection: '.unknown command\r\nprint y = 2',
        },
        {
            name: 'multiline literal',
            input: 'print x=```first\n\nlast```\n\nprint y=2',
            expected: 'print x = ```first\n\nlast```\n\nprint y = 2',
            selection: 'print x = ```first\n\nlast```\r\nprint y = 2',
        },
        {
            name: 'incomplete syntax',
            input: 'print x=1|where\n\nprint y=2',
            expected: 'print x = 1 | where\n\nprint y = 2',
            selection: 'print x = 1 | where\r\nprint y = 2',
        },
        {
            name: 'three queries with unchanged EOF formatting',
            input: 'print x=1\n\nprint y=2\n \n\nprint z=3\n\n',
            expected: 'print x = 1\n\nprint y = 2\n \n\nprint z = 3\r\n',
            selection: 'print x = 1\r\nprint y = 2\r\nprint z = 3\r\n',
        },
    ];

    test.each(cases)('preserves $name and is idempotent', async ({ input, expected }) => {
        const doc = document(input);
        const range = Range.create(doc.positionAt(0), doc.positionAt(input.length));
        expect(await service.doDocumentFormat(doc)).toEqual([{ range, newText: expected }]);
        expect((await service.doDocumentFormat(document(expected)))[0].newText).toBe(expected);
    });

    test.each(cases)('does not change $name selection formatting', async ({ input, selection }) => {
        const doc = document(input);
        const range = Range.create(doc.positionAt(0), doc.positionAt(input.length));
        await service.doDocumentFormat(doc);
        expect(await service.doRangeFormat(doc, range)).toEqual([{ range, newText: selection }]);
    });

    test('does not change formatting the current or final command', async () => {
        const doc = document('print x=1|project x\n\nprint y=2|project y\n \t\n');
        const range = Range.create(2, 0, 4, 0);
        const expected = [{ range, newText: 'print y = 2 | project y\r\n' }];
        await service.doDocumentFormat(doc);
        expect(await service.doRangeFormat(doc, range)).toEqual(expected);
        expect(await service.doCurrentCommandFormat(doc, doc.positionAt(25))).toEqual(expected);
    });

    test.each([
        ['single query', 'print x=1|project x', 'print x = 1 | project x'],
        ['leading whitespace', '\n \n  print x=1|project x', 'print x = 1 | project x'],
        ['EOF whitespace', 'print x=1|project x\n \t\n', 'print x = 1 | project x\r\n'],
        ['blank document', ' \t\n\n', ''],
        ['empty document', '', ''],
        ['no command separator', 'print x=1\n|project x', 'print x = 1\r\n| project x'],
        ['semicolons within one command', 'print x=1;\nprint y=2;', 'print x = 1;\r\nprint y = 2;'],
    ])('keeps existing %s output', async (_name, input, expected) => {
        expect((await service.doDocumentFormat(document(input)))[0].newText).toBe(expected);
    });
});

describe('trailing separator scan', () => {
    test.each([
        ['', ''],
        ['text', ''],
        ['text \t', ''],
        ['text \t\n \t\r\n', '\n \t\r\n'],
        ['text\r\n \t\r\n', '\r\n \t\r\n'],
        ['text\r \t', '\r \t'],
        ['text\n\u00a0 \t', ''],
        ['text\n\u00a0\r\n', '\r\n'],
    ])('finds only the newline-started ASCII whitespace suffix of %j', (text, suffix) => {
        expect(getTrailingSeparatorStart(text)).toBe(text.length - suffix.length);
    });

    test.each(['\n', '\r\n'])('does not rescan 60000 %j newlines inside a literal', (newline) => {
        const literal = 'print x = ```first' + newline.repeat(60000) + 'last```';
        const separator = newline + ' \t' + newline;
        const original = literal + separator;
        const formatted = literal + '\r\n';
        const readCharacter = jest.spyOn(String.prototype, 'charAt');
        let separatorStart: number;
        let formattedEnd: number;
        try {
            separatorStart = getTrailingSeparatorStart(original);
            formattedEnd = getTrailingSeparatorStart(formatted);
            expect(readCharacter).toHaveBeenCalledTimes(separator.length + 1 + 2 + 1);
        } finally {
            readCharacter.mockRestore();
        }
        expect(original.slice(separatorStart)).toBe(separator);
        expect(formatted.slice(0, formattedEnd)).toBe(literal);
    });
});
