import path from 'node:path';
import * as fs from 'node:fs/promises';

import concurrently from 'concurrently';

import { packageFolder } from './lib';

async function main() {
    // await Promise.all([
    //     fs.cp(
    //         path.dirname(require.resolve('monaco-editor/dev/vs/loader.js')),
    //         path.join(packageFolder, './out/vs'),
    //         {
    //             recursive: true,
    //         }
    //     ),

    //     // copyRunTimeDepsToOut('out/vs/language/kusto'),

    //     // This is super weird. Why do we do this?
    //     fs.writeFile(path.join(packageFolder, 'test/mode.txt'), 'dev'),
    // ]);

    // This is super weird. Why do we do this?
    fs.writeFile(path.join(packageFolder, 'test/mode.txt'), 'dev'),
        concurrently(
            [
                'live-server ./',
                'tsc -w -p ./scripts/tsconfig.watch.json',
                'yarn rollup -c ./scripts/rollup.dev.js -w --bundleConfigAsCjs',
            ],
            { cwd: packageFolder }
        );
}

main();
