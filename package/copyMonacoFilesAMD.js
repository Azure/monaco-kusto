const path = require('node:path');
const fs = require('node:fs/promises');

async function main() {
    const destination = process.argv[2];

    // Create shared folders first so fs.cp commands don't race to create them
    await fs.mkdir(path.join(destination, 'vs/language'), { recursive: true });

    Promise.all([
        fs.cp(path.dirname(require.resolve('monaco-editor/min/vs/loader.js')), path.join(destination, 'vs'), {
            recursive: true,
            force: true,
            filter(source) {
                return !source.includes('/basic-languages') && !source.includes('/language');
            },
        }),
        fs.cp(path.join(__dirname, 'release/min'), path.join(destination, 'vs/language/kusto'), {
            recursive: true,
            force: true,
            filter(source) {
                return !source.endsWith('.d.ts');
            },
        }),
    ]);
}

main();
