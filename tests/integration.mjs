import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, readdir, cp, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { generate } from '../dist/capture.js';
import { run, binary } from '../dist/process.js';
import { serve } from '../dist/server.js';

const root = path.resolve('test-results', `integration-${Date.now()}`);
await mkdir(root, { recursive: true });
const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, status: 'passed' });
    console.log('PASS', name);
  } catch (e) {
    results.push({ name, status: 'failed', reason: e.stack });
    console.error('FAIL', name, e);
    process.exitCode = 1;
  }
}
async function fixture(name, steps, extra = {}) {
  const folder = path.join(root, name);
  await mkdir(folder);
  await cp('examples/中文便签/index.html', path.join(folder, 'index.html'));
  const file = path.join(folder, 'demo.json');
  await writeFile(
    file,
    JSON.stringify({
      title: '中文测试 <script> & 安全',
      url: './index.html',
      timeoutMs: 500,
      steps,
      ...extra,
    }),
  );
  return file;
}
async function failureIn(output, status) {
  const folders = await readdir(output);
  assert.equal(folders.length, 1);
  const folder = path.join(output, folders[0]);
  assert.deepEqual(await readdir(folder), ['failure.json']);
  const failure = JSON.parse(await readFile(path.join(folder, 'failure.json')));
  assert.equal(failure.status, status);
  return failure;
}
await check('missing element reports exact step and never emits successful media', async () => {
  const file = await fixture('missing', [
    { action: 'click', selector: '#does-not-exist', caption: '缺失元素' },
  ]);
  const out = path.join(root, 'missing-output');
  await assert.rejects(generate(file, out), /step 1 \(click\)/);
  const failure = await failureIn(out, 'failed');
  assert.match(failure.reason, /#does-not-exist/);
});
await check('missing media dependency gives actionable failure', async () => {
  const file = await fixture('dependency', [{ action: 'screenshot', caption: '测试' }]);
  const out = path.join(root, 'dependency-output');
  const before = process.env.DEMOPACK_FFMPEG;
  process.env.DEMOPACK_FFMPEG = path.join(root, 'missing-ffmpeg');
  try {
    await assert.rejects(generate(file, out), /Install FFmpeg/);
    await failureIn(out, 'failed');
  } finally {
    if (before === undefined) delete process.env.DEMOPACK_FFMPEG;
    else process.env.DEMOPACK_FFMPEG = before;
  }
});
await check('missing ffprobe and Chromium have actionable doctor errors', async () => {
  const beforeProbe = process.env.DEMOPACK_FFPROBE,
    beforeBrowser = process.env.PLAYWRIGHT_BROWSERS_PATH;
  try {
    process.env.DEMOPACK_FFPROBE = path.join(root, 'no-ffprobe');
    await assert.rejects(run(process.execPath, ['dist/cli.js', 'doctor']), /FFPROBE/);
    if (beforeProbe === undefined) delete process.env.DEMOPACK_FFPROBE;
    else process.env.DEMOPACK_FFPROBE = beforeProbe;
    process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, 'no-browsers');
    await assert.rejects(
      run(process.execPath, ['dist/cli.js', 'doctor']),
      /playwright install chromium/,
    );
  } finally {
    if (beforeProbe === undefined) delete process.env.DEMOPACK_FFPROBE;
    else process.env.DEMOPACK_FFPROBE = beforeProbe;
    if (beforeBrowser === undefined) delete process.env.PLAYWRIGHT_BROWSERS_PATH;
    else process.env.PLAYWRIGHT_BROWSERS_PATH = beforeBrowser;
  }
});
await check('cancel during recording cleans partial files', async () => {
  const file = await fixture('cancel-capture', [
    { action: 'wait', ms: 10000, caption: '取消录制' },
  ]);
  const out = path.join(root, 'cancel-capture-output');
  const controller = new AbortController();
  let timer;
  try {
    await assert.rejects(
      generate(file, out, controller.signal, (s) => {
        if (s.startsWith('Step')) timer = setTimeout(() => controller.abort(), 350);
      }),
      /CANCELLED/,
    );
    await failureIn(out, 'cancelled');
  } finally {
    clearTimeout(timer);
  }
});
await check('cancel during encoding terminates export and cleans partial files', async () => {
  const file = await fixture('cancel-export', [
    { action: 'screenshot', caption: '取消导出', holdMs: 300 },
  ]);
  const out = path.join(root, 'cancel-export-output');
  const controller = new AbortController();
  let timer;
  try {
    await assert.rejects(
      generate(file, out, controller.signal, (s) => {
        if (s === 'Exporting MP4…') timer = setTimeout(() => controller.abort(), 25);
      }),
      /CANCELLED/,
    );
    const f = await failureIn(out, 'cancelled');
    assert.equal(f.phase, 'export-mp4');
  } finally {
    clearTimeout(timer);
  }
});
let good;
await check('Chinese input/output paths and Unicode captions export playable media', async () => {
  const file = await fixture('中文 空间', [
    {
      action: 'fill',
      selector: '#content',
      value: '虚构数据',
      caption: '中文字幕与虚构数据',
      holdMs: 500,
    },
    {
      action: 'click',
      selector: 'form button',
      caption: '保存本地便签',
      holdMs: 500,
      screenshot: true,
    },
    { action: 'wait', text: '便签已保存', caption: '已经保存', holdMs: 400 },
    { action: 'screenshot', caption: '查看保存结果', holdMs: 400 },
  ]);
  good = await generate(file, path.join(root, '中文 产物'));
  assert.equal(good.manifest.status, 'success');
  assert.equal(good.manifest.events.length, 4);
  assert.equal(good.manifest.media.width, 1024);
  assert.equal(good.manifest.media.height, 720);
  assert.ok(good.manifest.media.durationSeconds > 2);
  await run(await binary('ffmpeg'), [
    '-v',
    'error',
    '-i',
    path.join(good.dir, 'demo.mp4'),
    '-f',
    'null',
    '-',
  ]);
});
await check(
  'moved offline file:// preview, media playback and relative README images',
  async () => {
    assert.ok(good);
    const moved = path.join(root, '移动 后的独立材料包');
    await cp(good.dir, moved, { recursive: true });
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({ offline: true });
      let networkRequests = 0;
      context.on('request', (r) => {
        if (/^https?:/.test(r.url())) networkRequests++;
      });
      const page = await context.newPage();
      await page.goto(pathToFileURL(path.join(moved, 'index.html')).href);
      await page.locator('img').last().scrollIntoViewIfNeeded();
      assert.equal(
        await page
          .locator('img')
          .evaluateAll((images) => images.every((i) => i.complete && i.naturalWidth > 0)),
        true,
      );
      await page.locator('video').evaluate(async (v) => {
        await v.play();
      });
      await page.waitForTimeout(600);
      assert.ok((await page.locator('video').evaluate((v) => v.currentTime)) > 0);
      assert.equal(networkRequests, 0);
      assert.equal(await page.locator('script').count(), 0);
      await page.screenshot({ path: path.join(root, 'offline-preview.png'), fullPage: true });
      const md = await readFile(path.join(moved, 'README-snippet.md'), 'utf8');
      for (const match of md.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
        assert.ok(!path.isAbsolute(match[1]));
        assert.ok((await stat(path.join(moved, match[1]))).size > 0);
      }
    } finally {
      await browser.close();
    }
  },
);
await check('preview serves byte ranges and does not escape its root', async () => {
  const server = await serve(good.dir);
  try {
    const res = await fetch(server.url + '/demo.mp4', { headers: { Range: 'bytes=0-63' } });
    assert.equal(res.status, 206);
    assert.equal((await res.arrayBuffer()).byteLength, 64);
    const forbidden = await fetch(server.url + '/%2e%2e%2f%2e%2e%2fpackage.json');
    assert.notEqual(forbidden.status, 200);
  } finally {
    await server.close();
  }
});
await check('init protects existing directories and generated starter works', async () => {
  const cli = path.resolve('dist/cli.js');
  const starter = path.join(root, 'starter');
  await run(process.execPath, [cli, 'init', starter]);
  assert.ok((await stat(path.join(starter, 'demo.json'))).size);
  await assert.rejects(run(process.execPath, [cli, 'init', starter]), /Destination exists/);
});
await writeFile(path.join(root, 'results.json'), JSON.stringify(results, null, 2));
console.log('Evidence:', root);
if (results.some((r) => r.status === 'failed')) process.exitCode = 1;
