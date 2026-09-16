import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, readdir, cp, access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { generate } from '../dist/capture.js';
import { verifyPack } from '../dist/release.js';
import { run, binary } from '../dist/process.js';

const root = path.resolve('test-results', `kit-${Date.now()}`);
await mkdir(root, { recursive: true });
const results = [];
const artifacts = [];
async function test(name, fn) {
  if (process.argv[2] && !name.includes(process.argv[2])) return;
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
const starter = path.join(root, '中文 初始化');
await run(process.execPath, ['dist/cli.js', 'init', starter]);
let full;
await test('init -> generate produces four real deliverables', async () => {
  // Exercise the exact public command, not the one-off innovation script.
  const out = path.join(root, 'starter');
  const logs = await run(process.execPath, [
    'dist/cli.js',
    'generate',
    path.join(starter, 'demo.json'),
    '--out',
    out,
  ]);
  assert.match(logs, /SUCCESS/);
  full = path.join(out, (await readdir(out))[0]);
  const m = JSON.parse(await readFile(path.join(full, 'manifest.json')));
  assert.ok(m.media.durationSeconds >= 20 && m.media.durationSeconds <= 40);
  assert.equal(m.deliverables.cards.length, 4);
  assert.equal(m.deliverables.social.width, 1080);
  assert.equal(m.deliverables.social.height, 1920);
  assert.ok(Math.abs(m.deliverables.social.durationSeconds - 24) < 0.15);
  assert.equal((await verifyPack(full)).status, 'verified');
  for (const file of ['demo.mp4', 'short.mp4', 'social.mp4', 'demo.gif'])
    await run(await binary('ffmpeg'), [
      '-v',
      'error',
      '-i',
      path.join(full, file),
      '-f',
      'null',
      '-',
    ]);
  artifacts.push({ name: 'starter', dir: full, media: m.media, deliverables: m.deliverables });
});
await test('second standalone Chinese example exports the same four-part format', async () => {
  const result = await generate('examples/中文便签/demo.json', path.join(root, 'notes'));
  assert.equal((await verifyPack(result.dir)).status, 'verified');
  for (const file of ['demo.mp4', 'short.mp4', 'social.mp4', 'demo.gif'])
    await run(await binary('ffmpeg'), [
      '-v',
      'error',
      '-i',
      path.join(result.dir, file),
      '-f',
      'null',
      '-',
    ]);
  artifacts.push({
    name: 'notes',
    dir: result.dir,
    media: result.manifest.media,
    deliverables: result.manifest.deliverables,
  });
});
await test('moved offline pack: all three videos, cards, article and relative links work', async () => {
  assert.ok(full);
  const moved = path.join(root, '移动 后的材料');
  await cp(full, moved, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const width of [320, 375, 1280]) {
      const context = await browser.newContext({ offline: true, viewport: { width, height: 900 } });
      const page = await context.newPage();
      const external = [];
      page.on('request', (r) => {
        if (/^https?:/.test(r.url())) external.push(r.url());
      });
      await page.goto(pathToFileURL(path.join(moved, 'index.html')).href);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(root, `preview-${width}.png`) });
      for (const v of await page.locator('video').all()) {
        await v.evaluate(async (el) => {
          el.muted = true;
          await el.play();
        });
        await page.waitForTimeout(500);
        assert.ok(await v.evaluate((el) => el.currentTime > 0));
        await v.evaluate((el) => el.pause());
      }
      for (const img of await page.locator('img').all()) {
        await img.scrollIntoViewIfNeeded();
        await img.evaluate((el) => el.decode());
      }
      for (const href of await page
        .locator('a')
        .evaluateAll((ns) => ns.map((n) => n.getAttribute('href'))))
        if (href && !href.startsWith('#')) await access(path.join(moved, href));
      await page.locator('a[href="project.html"]').click();
      await page.getByRole('heading', { name: '当前限制' }).waitFor();
      assert.equal(external.length, 0);
      await context.close();
    }
  } finally {
    await browser.close();
  }
});
await test('verifier detects omitted video and mismatched source provenance', async () => {
  const folder = path.join(root, 'tamper');
  await cp(full, folder, { recursive: true });
  const file = path.join(folder, 'manifest.json');
  const m = JSON.parse(await readFile(file));
  await writeFile(
    file,
    JSON.stringify({ ...m, files: m.files.filter((f) => f.path !== 'short.mp4') }),
  );
  await assert.rejects(verifyPack(folder), /short.mp4/);
  m.deliverables.cards[0].step = 2;
  await writeFile(file, JSON.stringify(m));
  await assert.rejects(verifyPack(folder), /card source/);
});
const fixture = path.join(root, 'edge-input');
await mkdir(fixture);
await cp('examples/中文便签/index.html', path.join(fixture, 'index.html'));
const basic = {
  title: '边界 <img src=x> & 安全',
  url: 'index.html',
  gif: { seconds: 1 },
  steps: [{ action: 'open', caption: '打开本地页面', holdMs: 300 }],
  release: {
    short: { steps: [1], secondsPerStep: 1 },
    social: {
      secondsPerCard: 3,
      cards: [{ step: 1, title: '真实截图', body: '作者提供 <script>说明</script>' }],
    },
    project: {
      summary: '人工介绍',
      sections: [{ heading: '边界', body: '<script>alert(1)</script>' }],
    },
  },
};
const file = path.join(fixture, 'demo.json');
async function failure(out, status) {
  const dirs = await readdir(out);
  assert.equal(dirs.length, 1);
  const dir = path.join(out, dirs[0]);
  assert.deepEqual(await readdir(dir), ['failure.json']);
  const f = JSON.parse(await readFile(path.join(dir, 'failure.json')));
  assert.equal(f.status, status);
  return f;
}
await test('card references automatically capture steps; authored HTML remains inert', async () => {
  await writeFile(file, JSON.stringify(basic));
  const r = await generate(file, path.join(root, 'auto-shots'));
  assert.equal(r.manifest.events[0].screenshot, 'screenshots/step-01.jpg');
  const html = await readFile(path.join(r.dir, 'project.html'), 'utf8');
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.equal((await verifyPack(r.dir)).status, 'verified');
});
await test('social text overflow fails atomically with card-specific reason', async () => {
  const d = structuredClone(basic);
  d.release.social.cards[0].title = '行\n'.repeat(20);
  await writeFile(file, JSON.stringify(d));
  const out = path.join(root, 'overflow');
  await assert.rejects(generate(file, out), /Social card 1 text overflows/);
  assert.equal((await failure(out, 'failed')).phase, 'export-kit');
});
for (const phase of ['Exporting short video', 'Rendering social cards', 'Exporting social video']) {
  await test(`cancellation cleans partial kit at ${phase}`, async () => {
    await writeFile(file, JSON.stringify(basic));
    const controller = new AbortController();
    const out = path.join(root, 'cancel-' + phase.replaceAll(' ', '-'));
    await assert.rejects(
      generate(file, out, controller.signal, (line) => {
        if (line.startsWith(phase)) controller.abort();
      }),
      /CANCELLED/,
    );
    assert.equal((await failure(out, 'cancelled')).phase, 'export-kit');
  });
}
await test('media dependency disappearing during kit export leaves only failure', async () => {
  await writeFile(file, JSON.stringify(basic));
  const out = path.join(root, 'missing-encoder');
  const before = process.env.DEMOPACK_FFMPEG;
  try {
    await assert.rejects(
      generate(file, out, undefined, (line) => {
        if (line.startsWith('QUALITY WARNING')) return;
        if (line === 'Exporting GIF…')
          process.env.DEMOPACK_FFMPEG = path.join(root, 'missing-encoder.exe');
      }),
      /Install FFmpeg/,
    );
    await failure(out, 'failed');
  } finally {
    if (before === undefined) delete process.env.DEMOPACK_FFMPEG;
    else process.env.DEMOPACK_FFMPEG = before;
  }
});
await writeFile(path.join(root, 'results.json'), JSON.stringify({ results, artifacts }, null, 2));
console.log(root);
