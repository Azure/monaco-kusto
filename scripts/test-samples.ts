import { readdirSync } from 'node:fs';
import cp from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert';

import waitOn from 'wait-on';
import treeKill from 'tree-kill';
import { chromium, firefox, webkit } from 'playwright';

const samplesFolder = path.join(__dirname, '../samples');

async function main() {
    for (const dir of readdirSync(samplesFolder)) {
        const cwd = path.join(samplesFolder, dir);

        const pkg = JSON.parse(await fs.readFile(path.join(cwd, 'package.json'), { encoding: 'utf-8' }));

        if ('playwright:prepare' in pkg.scripts) {
            cp.execSync('yarn playwright:prepare', { cwd, stdio: 'inherit' });
        }

        const webserver = cp.spawn('yarn', ['playwright:webserver'], { cwd, stdio: 'inherit' });

        // webserver.stderr?.pipe(process.stderr);
        // webserver.stdout?.pipe(process.stdout);

        console.log('Waiting for webserver to start');
        await waitOn({ resources: ['http://localhost:3000'], timeout: 120_000 });

        for (const browserType of [chromium, firefox, webkit]) {
            console.log('samples/' + dir + ' ' + browserType.name());

            const browser = await browserType.launch();
            const page = await browser.newPage();

            await page.goto('localhost:3000');

            assert(await page.evaluate('healthCheck()'));

            console.log('Sanity check passed!');

            await browser.close();
        }

        const exited = new Promise((resolve) => {
            webserver.on('close', resolve);
        });

        webserver.kill();

        // worker.kill() wasn't working in ci
        // await new Promise((resolve) => treeKill(webserver.pid!, 'SIGTERM', resolve));

        // Webserver takes a moment to close after kill signal is sent
        console.log('Waiting for webserver to stop');
        await exited;
    }
}

main();
