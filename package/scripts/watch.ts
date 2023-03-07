import path from 'node:path';
import * as fs from 'node:fs';

import concurrently from 'concurrently';

import { packageFolder } from './lib';

fs.cpSync(path.dirname(require.resolve('monaco-editor-core/dev/vs/loader.js')), path.join(packageFolder, './out/vs'), {
    recursive: true,
});

// This is super weird. Why do we do this?
fs.writeFileSync(path.join(packageFolder, 'test/mode.txt'), 'dev');

concurrently(
    [
        'live-server ./',
        'tsc -w -p ./scripts/tsconfig.watch.json',
        'yarn rollup -c ./scripts/rollup.esm.js -w --bundleConfigAsCjs',
    ],
    { cwd: packageFolder }
);
