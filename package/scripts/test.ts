import concurrently from 'concurrently';
import { packageFolder } from './lib';

async function main() {
    const build = 'yarn rollup -c ./scripts/rollup.esm.js -w --bundleConfigAsCjs';
    const tests = 'yarn playwright test --ui --trace=on -c tests/playwright.config.ts';

    console.log('Running build and tests in watch mode');
    concurrently([build, tests], {
        cwd: packageFolder,
    });
}

main();
