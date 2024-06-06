import { readdirSync } from 'node:fs';
import cp from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert';

import waitOn from 'wait-on';
import { chromium, firefox, webkit } from 'playwright';

const samplesFolder = path.join(__dirname, '../samples');

async function main() {
    let errorOccurred = false;

    for (const dir of readdirSync(samplesFolder)) {
        const cwd = path.join(samplesFolder, dir);

        const pkg = JSON.parse(await fs.readFile(path.join(cwd, 'package.json'), { encoding: 'utf-8' }));

        if ('playwright:prepare' in pkg.scripts) {
            cp.execSync('yarn playwright:prepare', { cwd, stdio: 'inherit' });
        }

        // Running with cp.exec causes us to be unable to easily close some
        // webservers in CI
        const webserver = cp.spawn('yarn', ['playwright:webserver'], { cwd, stdio: 'inherit' });

        console.log('Waiting for webserver to start');
        await waitOn({ resources: ['http://localhost:3000'], timeout: 120_000 });

        for (const browserType of [chromium, firefox, webkit]) {
            console.log('samples/' + dir + ' ' + browserType.name());

            const browser = await browserType.launch();
            const page = await browser.newPage();

            await page.goto('localhost:3000');

            try {
                assert(await page.evaluate('healthCheck()'));
                console.log('Sanity check passed!');
            } catch (error) {
                console.error('Sanity check failed!', error);
                errorOccurred = true;
            } finally {
                await browser.close();
            }
        }

        const exited = new Promise((resolve) => {
            webserver.on('close', resolve);
        });

        webserver.kill();

        // Webserver takes a moment to close after kill signal is sent
        console.log('Waiting for webserver to stop');
        await exited;
    }

    if (errorOccurred) {
        throw new Error('One or more samples failed the sanity check.');
    }
}

main();
