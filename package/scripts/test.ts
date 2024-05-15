import concurrently from 'concurrently';
import { packageFolder } from './lib';
import { argv } from 'process';
import { execSync } from 'child_process';

async function main() {
    const watch = argv.includes('--watch');

    const buildOnce = 'yarn rollup -c ./scripts/rollup.esm.js --bundleConfigAsCjs';
    const buildWatch = 'yarn rollup -c ./scripts/rollup.esm.js --bundleConfigAsCjs';
    const build = watch ? buildWatch : buildOnce;

    const testsRun = 'yarn playwright test --trace=retain-on-failure -c tests/playwright.config.ts';
    const testsWatch = 'yarn playwright test --ui --headed --trace=on -c tests/playwright.config.ts';
    const tests = watch ? testsWatch : testsRun;

    if (watch) {
        console.log('Running build and tests in watch mode');
        concurrently([build, tests], {
            cwd: packageFolder,
        });
    } else {
        console.log('Running build');
        execSync(build, { cwd: packageFolder, stdio: 'inherit' });
        console.log('Build completed');

        console.log('Running tests');
        execSync(tests, { cwd: packageFolder, stdio: 'inherit' });
        console.log('Tests completed');
    }
}

main();
