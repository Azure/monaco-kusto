import concurrently from 'concurrently';

import { packageFolder } from './lib';

function main() {
    const server = 'vite tests/integration serve --config ./tests/integration/vite.config.ts';
    const build = 'yarn rollup -c ./scripts/rollup.esm.js -w --bundleConfigAsCjs';

    concurrently([server, build], {
        cwd: packageFolder,
    });
}

main();
