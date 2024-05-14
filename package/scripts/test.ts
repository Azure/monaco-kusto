import concurrently from 'concurrently';

import { packageFolder } from './lib';

async function main() {
    const server = 'vite tests';
    const build = 'yarn rollup -c ./scripts/rollup.esm.js -w --bundleConfigAsCjs';
    const playwright = 'playwright test --ui --trace=retain-on-failure -c tests/playwright.config.ts';

    concurrently([server, build, playwright], {
        cwd: packageFolder,
    });
}

main();
