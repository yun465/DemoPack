import assert from 'node:assert/strict';
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { generate } from '../dist/capture.js';
const root = path.resolve('test-results', `edges-${Date.now()}`);
await mkdir(root, { recursive: true });
const html =
  "<meta charset=\"utf-8\"><h1>Sample</h1><button onclick=\"setTimeout(()=>{let p=document.createElement('p');p.id='late';p.textContent='Ready';document.body.append(p)},600)\">Start</button>";
await writeFile(path.join(root, 'index.html'), html);
const results = [];
async function config(name, steps, extra = {}) {
  const file = path.join(root, name + '.json');
  await writeFile(
    file,
    JSON.stringify({ title: 'Edge check', url: 'index.html', steps, ...extra }),
  );
  return file;
}
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, status: 'passed' });
  } catch (e) {
    results.push({ name, status: 'failed', reason: e.message });
    process.exitCode = 1;
  }
}
await test('Delayed element wait and fresh screenshot timestamp', async () => {
  const file = await config('delayed', [
    { action: 'click', selector: 'button', caption: 'Start', holdMs: 200 },
    { action: 'wait', selector: '#late', caption: 'Ready', holdMs: 200, screenshot: true },
  ]);
  const { manifest } = await generate(file, path.join(root, 'delayed'));
  const event = manifest.events[1];
  assert.ok(event.screenshotAtMs >= event.startMs && event.screenshotAtMs <= event.endMs);
});
await test('Minimum viewport/padding, long title, low capture cadence', async () => {
  const file = await config(
    'narrow',
    [{ action: 'screenshot', caption: 'Readable caption', holdMs: 200 }],
    {
      title: 'A very long project title that needs to fit in a narrow frame safely',
      viewport: { width: 320, height: 320 },
      theme: { padding: 16 },
      captureFps: 4,
    },
  );
  const { manifest, dir } = await generate(file, path.join(root, 'narrow'));
  assert.equal(manifest.media.width, 352);
  assert.equal(manifest.media.height, 468);
  assert.ok(manifest.events[0].screenshotAtMs >= 0);
  console.log('Narrow visual:', dir);
});
await test('Cancellation during GIF encoding leaves diagnostics only', async () => {
  const file = await config('cancel', [
    { action: 'screenshot', caption: 'Cancel GIF', holdMs: 300 },
  ]);
  const controller = new AbortController();
  let timer;
  try {
    await assert.rejects(
      generate(file, path.join(root, 'cancel'), controller.signal, (p) => {
        if (p === 'Exporting GIF…') timer = setTimeout(() => controller.abort(), 20);
      }),
      /CANCELLED/,
    );
  } finally {
    clearTimeout(timer);
  }
  const dirs = await readdir(path.join(root, 'cancel'));
  const directory = path.join(root, 'cancel', dirs[0]);
  assert.deepEqual(await readdir(directory), ['failure.json']);
  const failure = JSON.parse(await readFile(path.join(directory, 'failure.json')));
  assert.equal(failure.phase, 'export-gif');
});
await writeFile(path.join(root, 'results.json'), JSON.stringify(results, null, 2));
console.log(results);
console.log(root);
