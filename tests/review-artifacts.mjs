import { readFile, writeFile, mkdir, cp, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { binary, run } from '../dist/process.js';
const root = path.resolve('test-results', `artifact-review-${Date.now()}`);
await mkdir(root, { recursive: true });
const browser = await chromium.launch();
const reports = [];
try {
  for (const name of ['showcase', 'showcase-zh', 'self-showcase']) {
    const source = path.resolve('docs', name),
      destination = path.join(root, '移动后的材料包', name);
    await cp(source, destination, { recursive: true });
    const manifest = JSON.parse(await readFile(path.join(destination, 'manifest.json'), 'utf8'));
    assert.equal(manifest.status, 'success');
    for (const file of manifest.files) {
      const data = await readFile(path.join(destination, file.path));
      assert.equal(data.length, file.bytes);
      assert.equal(createHash('sha256').update(data).digest('hex'), file.sha256);
    }
    for (const ext of ['mp4', 'gif'])
      await run(await binary('ffmpeg'), [
        '-v',
        'error',
        '-i',
        path.join(destination, `demo.${ext}`),
        '-f',
        'null',
        '-',
      ]);
    const mp4 = JSON.parse(
      await run(await binary('ffprobe'), [
        '-v',
        'error',
        '-show_format',
        '-show_streams',
        '-of',
        'json',
        path.join(destination, 'demo.mp4'),
      ]),
    );
    const gif = JSON.parse(
      await run(await binary('ffprobe'), [
        '-v',
        'error',
        '-show_format',
        '-show_streams',
        '-of',
        'json',
        path.join(destination, 'demo.gif'),
      ]),
    );
    assert.equal(mp4.streams[0].width, manifest.media.width);
    assert.equal(mp4.streams[0].height, manifest.media.height);
    assert.ok(Math.abs(Number(mp4.format.duration) - manifest.media.durationSeconds) < 0.05);
    for (const event of manifest.events) {
      assert.ok(event.startMs >= 0);
      assert.ok(event.endMs > event.startMs);
      assert.ok(event.endMs / 1000 <= Number(mp4.format.duration) + 0.15);
    }
    const context = await browser.newContext({
      offline: true,
      viewport: { width: 1200, height: 850 },
    });
    let network = 0;
    context.on('request', (r) => {
      if (/^https?:/.test(r.url())) network++;
    });
    const page = await context.newPage();
    await page.goto(pathToFileURL(path.join(destination, 'index.html')).href);
    for (const image of await page.locator('img').all()) {
      await image.scrollIntoViewIfNeeded();
      assert.equal(await image.evaluate((i) => i.complete && i.naturalWidth > 0), true);
    }
    await page.locator('video').evaluate(async (v) => {
      await v.play();
    });
    await page.waitForTimeout(750);
    assert.ok((await page.locator('video').evaluate((v) => v.currentTime)) > 0);
    assert.equal(network, 0);
    assert.deepEqual(
      await page.locator('ol li').allTextContents(),
      manifest.events.map((s) => `${s.caption} (${(s.startMs / 1000).toFixed(1)}s)`),
    );
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(root, `${name}-offline.png`), fullPage: true });
    const md = await readFile(path.join(destination, 'README-snippet.md'), 'utf8');
    for (const match of md.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g))
      assert.ok((await stat(path.join(destination, match[1]))).size > 0);
    await context.close();
    const gifFrameDurations = await run(await binary('ffprobe'), [
      '-v',
      'error',
      '-show_entries',
      'frame=pkt_duration_time',
      '-of',
      'csv=p=0',
      path.join(destination, 'demo.gif'),
    ]);
    const gifSeconds = gifFrameDurations
      .trim()
      .split(/\s+/)
      .reduce((total, value) => total + Number(value), 0);
    assert.ok(Number.isFinite(gifSeconds));
    assert.ok(Math.abs(gifSeconds - manifest.media.gif.seconds) < 0.3);
    const report = {
      name,
      runId: manifest.runId,
      mp4: {
        seconds: Number(mp4.format.duration),
        width: mp4.streams[0].width,
        height: mp4.streams[0].height,
        bytes: Number(mp4.format.size),
      },
      gif: {
        seconds: Number(gifSeconds.toFixed(3)),
        width: gif.streams[0].width,
        height: gif.streams[0].height,
        bytes: Number(gif.format.size),
      },
      meanCaptureFps: manifest.media.meanCaptureFps,
      maxCaptureGapMs: manifest.media.maxCaptureGapMs,
      hashes: 'passed',
      fullDecode: 'passed',
      movedOfflinePlayback: 'passed',
      externalRequests: network,
      readmeImages: 'passed',
      previewCaptionsMatchManifest: 'passed',
    };
    reports.push(report);
    console.log(JSON.stringify(report));
  }
} finally {
  await browser.close();
}
await writeFile(path.join(root, 'results.json'), JSON.stringify(reports, null, 2));
console.log('Evidence:', root);
