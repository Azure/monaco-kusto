import path from 'node:path';
import * as fs from 'node:fs/promises';
import { mkdirSync } from 'node:fs';

import concurrently from 'concurrently';

import { copyLanguageServerFiles, packageFolder } from './lib';

async function main() {
    console.log('Copying static dependencies...');

    // Create this folder first to avoid a race condition in it's creation by
    // the following fs.cp() calls
    mkdirSync(path.join(packageFolder, 'out/vs'), { recursive: true });

    await Promise.all([
        fs.cp(path.dirname(require.resolve('monaco-editor/dev/vs/loader.js')), path.join(packageFolder, './out/vs'), {
            recursive: true,
            filter(source) {
                return !source.includes('/basic-languages') && !source.includes('/language');
            },
        }),

        fs.cp(
            require.resolve('monaco-editor/dev/vs/editor/editor.main.css'),
            path.join(packageFolder, 'monaco-editor.css')
        ),

        copyLanguageServerFiles('out/vs/language/kusto'),

        // This is super weird. Why do we do this?
        fs.writeFile(path.join(packageFolder, 'test/mode.txt'), 'dev'),
    ]);

    // This creates a race condition between live-sever and rollup 😢. App
    // starts broken and contributors need to wait for rollup and then refresh
    // the page
    concurrently(
        [
            'browser-sync start --server ./ --files ./',
            'tsc -w -p ./scripts/tsconfig.watch.json',
            'yarn rollup -c ./scripts/rollup.dev.js -w --bundleConfigAsCjs',
        ],
        { cwd: packageFolder }
    );
}

main();
