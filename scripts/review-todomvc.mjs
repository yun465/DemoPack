import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, cp, access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { verifyPack } from '../dist/release.js';
import { binary, run } from '../dist/process.js';
const source = path.resolve(process.argv[2]);
const evidence = path.resolve('test-results', `todomvc-review-${Date.now()}`);
const moved = path.join(evidence, '中文路径 移动后的演示');
await mkdir(evidence, { recursive: true });
await cp(source, moved, { recursive: true });
await verifyPack(moved);
const m = JSON.parse(await readFile(path.join(moved, 'manifest.json')));
const media = {};
for (const file of ['demo.mp4', 'short.mp4', 'social.mp4', 'demo.gif']) {
  await run(await binary('ffmpeg'), [
    '-v',
    'error',
    '-i',
    path.join(moved, file),
    '-f',
    'null',
    '-',
  ]);
  media[file] = JSON.parse(
    await run(await binary('ffprobe'), [
      '-v',
      'error',
      '-show_entries',
      'format=duration,size:stream=width,height,codec_name',
      '-of',
      'json',
      path.join(moved, file),
    ]),
  );
}
await run(await binary('ffmpeg'), [
  '-y',
  '-i',
  path.join(moved, 'demo.mp4'),
  '-vf',
  'fps=1/10,scale=512:-1,tile=3x2',
  '-frames:v',
  '1',
  path.join(evidence, 'filmstrip.jpg'),
]);
const b = await chromium.launch();
const external = [];
try {
  for (const width of [375, 1280]) {
    const c = await b.newContext({ offline: true, viewport: { width, height: 900 } });
    const p = await c.newPage();
    p.on('request', (r) => {
      if (/^https?:/.test(r.url())) external.push(r.url());
    });
    await p.goto(pathToFileURL(path.join(moved, 'index.html')).href);
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await p.screenshot({ path: path.join(evidence, `preview-${width}.png`) });
    assert.equal(await p.locator('video').count(), 3);
    for (const v of await p.locator('video').all()) {
      await v.evaluate(async (el) => {
        el.muted = true;
        await el.play();
      });
      await p.waitForTimeout(500);
      assert.ok(await v.evaluate((el) => el.currentTime > 0));
      await v.evaluate((el) => el.pause());
    }
    for (const img of await p.locator('img').all()) {
      await img.scrollIntoViewIfNeeded();
      await img.evaluate((el) => el.decode());
    }
    for (const href of await p
      .locator('a')
      .evaluateAll((ns) => ns.map((n) => n.getAttribute('href'))))
      if (href && !href.startsWith('#')) await access(path.join(moved, href));
    await p.locator('a[href="project.html"]').click();
    await p.getByRole('heading', { name: '当前限制' }).waitFor();
    await c.close();
  }
} finally {
  await b.close();
}
assert.deepEqual(external, []);
const readme = await readFile(path.join(moved, 'README-snippet.md'), 'utf8');
const refs = [...readme.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)];
assert.ok(refs.length > 0);
for (const match of refs) await access(path.resolve(moved, match[1]));
await writeFile(
  path.join(evidence, 'results.json'),
  JSON.stringify(
    {
      status: 'passed',
      source,
      moved,
      media,
      steps: m.events.length,
      readmeImages: refs.length,
      offlineWidths: [375, 1280],
      externalRequests: external.length,
      capture: m.capture,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ evidence, media, capture: m.media }, null, 2));
