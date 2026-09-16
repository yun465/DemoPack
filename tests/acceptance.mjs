import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { generate } from '../dist/capture.js';
import { run, binary } from '../dist/process.js';
const root = path.resolve('test-results', `acceptance-${Date.now()}`);
await mkdir(root, { recursive: true });
const results = [];
async function test(name, fn) {
  const start = performance.now();
  try {
    await fn();
    results.push({ name, status: 'passed', seconds: (performance.now() - start) / 1000 });
    console.log('PASS', name);
  } catch (e) {
    results.push({ name, status: 'failed', reason: e.message });
    console.error('FAIL', name, e.message);
    process.exitCode = 1;
  }
}
async function fixture(name, steps, extra = {}) {
  const dir = path.join(root, name);
  await mkdir(dir);
  await writeFile(
    path.join(dir, 'index.html'),
    '<meta charset="utf-8"><p style="display:none">Saved</p><h1>Local acceptance</h1><button onclick="document.querySelector(\'#result\').textContent=\'Saved\'">Save</button><p id="result"></p>',
  );
  await writeFile(path.join(dir, 'next.html'), '<h1>Second page</h1>');
  const config = path.join(dir, 'demo.json');
  await writeFile(
    config,
    JSON.stringify({ title: 'Acceptance', url: 'index.html', timeoutMs: 1000, steps, ...extra }),
  );
  return config;
}
await test('Fresh CLI init to full 20–40 second playable pack', async () => {
  const starter = path.join(root, 'new user 中文');
  const start = performance.now();
  await run(process.execPath, ['dist/cli.js', 'init', starter]);
  const output = await run(process.execPath, [
    'dist/cli.js',
    'generate',
    path.join(starter, 'demo.json'),
    '--out',
    path.join(root, 'first-export'),
  ]);
  assert.match(output, /SUCCESS/);
  const dirs = await readdir(path.join(root, 'first-export'));
  const dir = path.join(root, 'first-export', dirs[0]);
  const manifest = JSON.parse(await readFile(path.join(dir, 'manifest.json')));
  assert.ok(manifest.media.durationSeconds >= 20 && manifest.media.durationSeconds <= 40);
  await run(await binary('ffmpeg'), [
    '-v',
    'error',
    '-i',
    path.join(dir, 'demo.mp4'),
    '-f',
    'null',
    '-',
  ]);
  console.log(
    'First export seconds (dependencies preinstalled):',
    ((performance.now() - start) / 1000).toFixed(2),
  );
});
await test('Wait for visible text ignores an earlier hidden duplicate', async () => {
  const config = await fixture('hidden-text', [
    { action: 'click', selector: 'button', caption: 'Save', holdMs: 200 },
    { action: 'wait', text: 'Saved', caption: 'Saved result', holdMs: 200, screenshot: true },
  ]);
  const result = await generate(config, path.join(root, 'hidden-output'));
  assert.equal(result.manifest.status, 'success');
  const shot = result.manifest.events[1];
  assert.ok(shot.screenshotAtMs >= shot.startMs && shot.screenshotAtMs <= shot.endMs);
});
await test('Relative open navigation, repeat export and previous files preserved', async () => {
  const config = await fixture('navigation', [
    { action: 'open', url: 'next.html', caption: 'Next page', holdMs: 200 },
    { action: 'wait', text: 'Second page', caption: 'Confirmed', holdMs: 200, screenshot: true },
  ]);
  const first = await generate(config, path.join(root, 'repeat-output'));
  const before = await readFile(path.join(first.dir, 'manifest.json'));
  const second = await generate(config, path.join(root, 'repeat-output'));
  assert.notEqual(first.dir, second.dir);
  assert.deepEqual(await readFile(path.join(first.dir, 'manifest.json')), before);
});
for (const [name, extra, steps, pattern] of [
  [
    'caption-overflow',
    { viewport: { width: 320, height: 320 } },
    [{ action: 'screenshot', caption: '很长的中文字幕'.repeat(15), holdMs: 200 }],
    /Caption exceeds two lines/,
  ],
  [
    'invalid-gif',
    { gif: { start: 1000 } },
    [{ action: 'screenshot', caption: 'Short clip', holdMs: 200 }],
    /GIF start/,
  ],
  [
    'http-error',
    {},
    [{ action: 'open', url: 'not-found.html', caption: 'Missing page', holdMs: 200 }],
    /HTTP 404/,
  ],
])
  await test(`${name} fails without success media`, async () => {
    const config = await fixture(name, steps, extra),
      out = path.join(root, name + '-output');
    await assert.rejects(generate(config, out), pattern);
    const dirs = await readdir(out);
    assert.equal(dirs.length, 1);
    assert.deepEqual(await readdir(path.join(out, dirs[0])), ['failure.json']);
  });
await writeFile(path.join(root, 'results.json'), JSON.stringify(results, null, 2));
console.log('Evidence:', root);
