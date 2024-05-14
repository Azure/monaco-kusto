import concurrently from 'concurrently';

import { packageFolder } from './lib';

async function main() {
    const server = 'vite tests';
    const build = 'yarn rollup -c ./scripts/rollup.esm.js -w --bundleConfigAsCjs';
    concurrently([server, build], {
        cwd: packageFolder,
    });
}

main();
