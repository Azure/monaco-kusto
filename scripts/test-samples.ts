import { readdirSync } from 'node:fs';
import cp from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert';

import waitOn from 'wait-on';
import { chromium, firefox, webkit } from 'playwright';

const samplesFolder = path.join(__dirname, '../samples');

async function main() {
    for (const dir of readdirSync(samplesFolder)) {
        const cwd = path.join(samplesFolder, dir);

        const pkg = JSON.parse(await fs.readFile(path.join(cwd, 'package.json'), { encoding: 'utf-8' }));

        if ('playwright:prepare' in pkg.scripts) {
            cp.execSync('yarn playwright:prepare', { cwd, stdio: 'inherit' });
        }

        const webserver = cp.exec('yarn playwright:webserver', { cwd }, (err) => {
            if (err && !err.killed) {
                throw err;
            }
        });

        try {
            webserver.stderr?.pipe(process.stderr);
            webserver.stdout?.pipe(process.stdout);

            await waitOn({ resources: ['http://localhost:3000'] });

            for (const browserType of [chromium, firefox, webkit]) {
                console.log('samples/' + dir + ' ' + browserType.name());

                const browser = await browserType.launch();
                const page = await browser.newPage();

                await page.goto('localhost:3000');

                assert(await page.evaluate('sanityCheck()'));

                await browser.close();
            }
        } finally {
            webserver.kill();
        }
    }
}

main();