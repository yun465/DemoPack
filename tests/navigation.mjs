import assert from 'node:assert/strict';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { generate } from '../dist/capture.js';
import { verifyPack } from '../dist/release.js';
const root = path.resolve('test-results', `navigation-${Date.now()}`);
await mkdir(root, { recursive: true });
await copyFile('examples/media/synthetic.mp4', path.join(root, 'sample.mp4'));
for (let i = 0; i < 3; i++)
  await writeFile(
    path.join(root, `page-${i}.html`),
    `<body style="background:${['#ddeedd', '#eedddd', '#ddddee'][i]}"><h1>Navigation ${i}</h1><video src="sample.mp4" autoplay muted loop width="600"></video></body>`,
  );
const config = {
  title: 'Rapid navigation capture regression',
  url: 'page-0.html',
  gif: { seconds: 1 },
  steps: Array.from({ length: 12 }, (_, i) => ({
    action: 'open',
    url: `page-${i % 3}.html`,
    caption: `Page ${i % 3}`,
    holdMs: 200,
    screenshot: true,
  })),
};
await writeFile(path.join(root, 'demo.json'), JSON.stringify(config));
const result = await generate(path.join(root, 'demo.json'), path.join(root, 'output'));
assert.equal(result.manifest.events.length, 12);
for (const e of result.manifest.events) {
  assert.ok(e.screenshot);
  assert.ok(e.screenshotAtMs >= e.startMs && e.screenshotAtMs <= e.endMs);
}
await verifyPack(result.dir);
console.log('PASS 12 repeated video-page navigations with concurrent capture loop');
