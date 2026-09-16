import assert from 'node:assert/strict';
import { mkdir, cp, readFile, writeFile, readdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { generateStory, prepareStory } from '../dist/imports.js';
import { verifyPack, rootSnippet } from '../dist/release.js';
import { binary, run } from '../dist/process.js';
const root = path.resolve('test-results', `imports-${Date.now()}`);
await mkdir(root, { recursive: true });
const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, status: 'passed' });
    console.log('PASS', name);
  } catch (e) {
    results.push({ name, status: 'failed', reason: e.stack });
    process.exitCode = 1;
    console.error('FAIL', name, e);
  }
}
let pack;
await test('CLI report and media export real four-deliverable packs', async () => {
  for (const mode of ['report', 'media']) {
    const out = path.join(root, mode);
    await run(process.execPath, ['dist/cli.js', mode, `examples/${mode}/story.json`, '--out', out]);
    const folder = path.join(out, (await readdir(out))[0]);
    if (mode === 'media') pack = folder;
    assert.equal((await verifyPack(folder)).status, 'verified');
    const m = JSON.parse(await readFile(path.join(folder, 'manifest.json')));
    assert.equal(m.source.kind, mode);
    const sources = JSON.parse(await readFile(path.join(folder, 'sources.json')));
    for (const s of sources.sources)
      assert.equal(
        createHash('sha256')
          .update(await readFile(path.join(folder, s.file)))
          .digest('hex'),
        s.sha256,
      );
    for (const file of ['demo.mp4', 'short.mp4', 'social.mp4', 'demo.gif'])
      await run(await binary('ffmpeg'), [
        '-v',
        'error',
        '-i',
        path.join(folder, file),
        '-f',
        'null',
        '-',
      ]);
  }
});
await test('moved Chinese path: offline videos, source media and README links', async () => {
  assert.ok(pack);
  const moved = path.join(root, '中文 移动材料');
  await cp(pack, moved, { recursive: true });
  const b = await chromium.launch();
  try {
    for (const width of [375, 1280]) {
      const c = await b.newContext({ offline: true, viewport: { width, height: 900 } });
      const p = await c.newPage();
      const external = [];
      p.on('request', (r) => {
        if (/^https?:/.test(r.url())) external.push(r.url());
      });
      await p.goto(pathToFileURL(path.join(moved, 'index.html')).href);
      assert.ok(
        await p.getByText('外部素材的浏览器回放，不是现场设备操作', { exact: false }).count(),
      );
      for (const file of ['index.html', 'source.html']) {
        await p.goto(pathToFileURL(path.join(moved, file)).href);
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        for (const v of await p.locator('video').all()) {
          await v.evaluate(async (el) => {
            el.muted = true;
            await el.play();
          });
          await p.waitForTimeout(350);
          assert.ok(await v.evaluate((el) => el.currentTime > 0));
          await v.evaluate((el) => el.pause());
        }
        for (const img of await p.locator('img').all()) {
          await img.scrollIntoViewIfNeeded();
          await img.evaluate((el) => el.decode());
        }
        await p.screenshot({ path: path.join(root, `${width}-${file}.png`) });
      }
      assert.deepEqual(external, []);
      await c.close();
    }
  } finally {
    await b.close();
  }
  const snippet = await rootSnippet(moved, 'docs/example');
  assert.ok(snippet.includes('(docs/example/source.html)'));
  const readme = await readFile(path.join(moved, 'README-snippet.md'), 'utf8');
  for (const match of readme.matchAll(/\]\(([^)]+)\)/g)) await access(path.join(moved, match[1]));
});
await test('tampered provenance is rejected even when its file hash is updated', async () => {
  const dir = path.join(root, 'tamper');
  await cp(pack, dir, { recursive: true });
  const f = path.join(dir, 'sources.json');
  const s = JSON.parse(await readFile(f));
  s.sources[0].sha256 = '0'.repeat(64);
  await writeFile(f, JSON.stringify(s));
  const m = JSON.parse(await readFile(path.join(dir, 'manifest.json')));
  const data = await readFile(f);
  Object.assign(
    m.files.find((x) => x.path === 'sources.json'),
    { bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') },
  );
  await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(m));
  await assert.rejects(verifyPack(dir), /Source integrity mismatch/);
});
await test('video beyond duration fails in preflight', async () => {
  const dir = path.join(root, 'invalid-video');
  await cp('examples/media', dir, { recursive: true });
  const s = JSON.parse(await readFile(path.join(dir, 'story.json')));
  s.chapters = [{ ...s.chapters[1], seconds: 20 }];
  await writeFile(path.join(dir, 'story.json'), JSON.stringify(s));
  await assert.rejects(
    prepareStory(path.join(dir, 'story.json'), 'media', path.join(root, 'invalid-snapshot')),
    /duration/,
  );
});
await test('cancel import recording leaves only failure.json', async () => {
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), 2500);
  const out = path.join(root, 'cancel');
  try {
    await assert.rejects(
      generateStory('examples/media/story.json', 'media', out, control.signal),
      /CANCELLED|Cancelled/,
    );
  } finally {
    clearTimeout(timer);
  }
  const folder = path.join(out, (await readdir(out))[0]);
  assert.deepEqual(await readdir(folder), ['failure.json']);
});
await test('corrupt image fails instead of exporting a broken-image demo', async () => {
  const dir = path.join(root, 'bad-image');
  await mkdir(dir);
  await writeFile(path.join(dir, 'bad.png'), 'not an image');
  const s = JSON.parse(await readFile('examples/media/story.json'));
  s.chapters = [{ ...s.chapters[0], file: 'bad.png' }];
  await writeFile(path.join(dir, 'story.json'), JSON.stringify(s));
  const out = path.join(root, 'broken');
  await assert.rejects(generateStory(path.join(dir, 'story.json'), 'media', out), /FAILED/);
  const folder = path.join(out, (await readdir(out))[0]);
  assert.deepEqual(await readdir(folder), ['failure.json']);
});
await writeFile(path.join(root, 'results.json'), JSON.stringify(results, null, 2));
console.log(root);
