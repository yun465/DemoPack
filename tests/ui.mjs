import { chromium } from 'playwright';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { writeBundle } from '../dist/bundle.js';
import { parseDemo } from '../dist/config.js';
const dir = path.resolve('test-results', `ui-${Date.now()}`);
await mkdir(dir, { recursive: true });
await cp('docs/showcase', dir, { recursive: true });
const source = JSON.parse(await readFile('docs/showcase/manifest.json'));
await writeBundle(
  dir,
  parseDemo({
    title: 'Portable preview',
    url: 'index.html',
    steps: [{ action: 'screenshot', caption: 'Example' }],
  }),
  source.events,
  'test',
  source.media,
);
const browser = await chromium.launch();
const results = [];
try {
  for (const width of [320, 375, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 800 }, offline: true });
    await page.goto(pathToFileURL(path.join(dir, 'index.html')).href);
    const sizes = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    await page.screenshot({ path: path.join(dir, `preview-${width}.png`), fullPage: true });
    try {
      assert.ok(
        sizes.scroll <= sizes.client,
        `width ${width}: content ${sizes.scroll}px exceeds viewport`,
      );
      results.push({ width, status: 'passed' });
    } catch (e) {
      results.push({ width, status: 'failed', reason: e.message });
      process.exitCode = 1;
    }
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(path.join(dir, 'results.json'), JSON.stringify(results, null, 2));
console.log(results);
console.log(dir);
