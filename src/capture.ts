import { chromium, type Browser } from 'playwright';
import { mkdir, writeFile, cp, rm, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { inspectConfig } from './release.js';
import { binary, run } from './process.js';
import { writeBundle, type Event } from './bundle.js';
import { serve } from './server.js';
import { exportKit } from './kit.js';

export async function doctor() {
  const checks: Record<string, string> = { node: process.version };
  if (+process.versions.node.split('.')[0] < 24) throw new Error('Node.js 24 LTS required.');
  for (const name of ['ffmpeg', 'ffprobe'] as const)
    checks[name] = (await run(await binary(name), ['-version'])).split('\n')[0];
  const encoders = await run(await binary('ffmpeg'), ['-hide_banner', '-encoders']);
  if (!encoders.includes('libx264')) throw new Error('FFmpeg needs the libx264 encoder for MP4.');
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch();
    checks.chromium = browser.version();
  } catch {
    throw new Error('Chromium unavailable. Run: npx playwright install chromium');
  } finally {
    await browser?.close();
  }
  return checks;
}

type Point = { x: number; y: number };
type Frame = { file: string; atMs: number };
export async function generate(
  configFile: string,
  outRoot = 'output',
  signal?: AbortSignal,
  onProgress = (s: string) => console.log(s),
) {
  const configPath = path.resolve(configFile);
  const demo = await inspectConfig(configPath);
  const runId = new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8);
  const dir = path.resolve(outRoot, runId),
    work = path.join(dir, '_work');
  await mkdir(work, { recursive: true });
  await mkdir(path.join(dir, 'screenshots'));
  let browser: Browser | undefined, local: Awaited<ReturnType<typeof serve>> | undefined;
  let capturing = false,
    captureTask: Promise<void> | undefined,
    captureError: unknown,
    current = -1,
    phase = 'preflight';
  const events: Event[] = [],
    frames: Frame[] = [];
  const check = () => {
    if (signal?.aborted) throw new Error('Cancelled');
    if (captureError) throw captureError;
  };
  const abort = () => {
    void browser?.close().catch(() => {});
  };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    check();
    const environment = await doctor();
    check();
    const isRemote = /^https?:\/\//.test(demo.url);
    if (!isRemote) {
      if (/^[a-z]+:/i.test(demo.url)) throw new Error('Use http(s) URL or relative HTML path.');
      local = await serve(path.dirname(configPath));
    }
    const resolveUrl = (url: string) => {
      if (/^https?:\/\//.test(url)) return url;
      if (/^[a-z]+:/i.test(url))
        throw new Error('Only http(s) URLs and relative paths are supported.');
      return new URL(url, local ? local.url + '/' : demo.url).href;
    };
    const initial = resolveUrl(demo.url);
    browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: demo.viewport,
      deviceScaleFactor: 1,
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(demo.timeoutMs);
    page.setDefaultNavigationTimeout(demo.timeoutMs);
    phase = 'navigation';
    const response = await page.goto(initial, { waitUntil: 'load' });
    if (response && response.status() >= 400)
      throw new Error(`Initial page returned HTTP ${response.status()}`);
    await page.evaluate(() => document.fonts.ready);
    const renderer = await browser.newPage({
      viewport: {
        width: demo.viewport.width + demo.theme.padding * 2,
        height: demo.viewport.height + demo.theme.padding * 2 + 116,
      },
      deviceScaleFactor: 1,
    });
    await renderer.setContent('<html><body style="margin:0"><canvas></canvas></body></html>');
    let caption = demo.steps[0].caption,
      stepNumber = 0,
      zoom = 1,
      focus: Point = { x: demo.viewport.width / 2, y: demo.viewport.height / 2 },
      click: Point | undefined,
      clickUntil = 0;
    const epoch = performance.now();
    let lastFrame: { file: string; atMs: number; step: number } | undefined;
    async function capture() {
      const atMs = performance.now() - epoch;
      const state = {
        caption,
        stepNumber,
        zoom,
        focus: { ...focus },
        click: atMs < clickUntil ? click : undefined,
      };
      const source = (
        await page.screenshot({
          type: 'jpeg',
          quality: 90,
          animations: 'allow',
          timeout: demo.timeoutMs,
        })
      ).toString('base64');
      const rendered = await renderer.evaluate(
        async ({ source, demo, state }) => {
          const image = new Image();
          image.src = 'data:image/jpeg;base64,' + source;
          await image.decode();
          const canvas = document.querySelector('canvas')!;
          const p = demo.theme.padding,
            w = demo.viewport.width,
            h = demo.viewport.height;
          canvas.width = w + 2 * p;
          canvas.height = h + 2 * p + 116;
          const c = canvas.getContext('2d')!;
          c.fillStyle = demo.theme.background;
          c.fillRect(0, 0, canvas.width, canvas.height);
          c.font = '600 15px "Segoe UI", "Noto Sans CJK SC", sans-serif';
          c.fillStyle = '#dbe6f1';
          let title = demo.title;
          while (c.measureText(title).width > w - 100 && title.length > 1)
            title = title.slice(0, -1);
          if (title !== demo.title) title = title.slice(0, -1) + '…';
          c.fillText(title, p, p + 2);
          c.textAlign = 'right';
          c.fillStyle = demo.theme.accent;
          c.fillText(
            `${String(state.stepNumber + 1).padStart(2, '0')} / ${String(demo.steps.length).padStart(2, '0')}`,
            canvas.width - p,
            p + 2,
          );
          c.textAlign = 'left';
          const top = p + 22;
          const cw = w / state.zoom,
            ch = h / state.zoom;
          const sx = Math.max(0, Math.min(w - cw, state.focus.x - cw / 2)),
            sy = Math.max(0, Math.min(h - ch, state.focus.y - ch / 2));
          c.save();
          c.beginPath();
          c.roundRect(p, top, w, h, 10);
          c.clip();
          c.drawImage(image, sx, sy, cw, ch, p, top, w, h);
          if (state.click) {
            const x = p + (state.click.x - sx) * state.zoom,
              y = top + (state.click.y - sy) * state.zoom;
            c.beginPath();
            c.arc(x, y, 20, 0, Math.PI * 2);
            c.fillStyle = demo.theme.accent + '55';
            c.fill();
            c.strokeStyle = demo.theme.accent;
            c.lineWidth = 3;
            c.stroke();
            c.beginPath();
            c.arc(x, y, 5, 0, Math.PI * 2);
            c.fillStyle = '#ffffff';
            c.fill();
          }
          c.restore();
          c.fillStyle = '#f4f8fc';
          c.font = '600 23px "Segoe UI", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
          const lines: string[] = [];
          let line = '';
          for (const ch of Array.from(state.caption)) {
            if (c.measureText(line + ch).width > w - 28) {
              lines.push(line);
              line = ch;
            } else line += ch;
          }
          if (line) lines.push(line);
          if (lines.length > 2)
            throw new Error(
              'Caption exceeds two lines; shorten caption or increase viewport width.',
            );
          lines.forEach((line, i) => c.fillText(line, p + 4, top + h + 39 + i * 30));
          return canvas.toDataURL('image/jpeg', 0.94).split(',')[1];
        },
        { source, demo, state },
      );
      const file = `frame-${String(frames.length).padStart(6, '0')}.jpg`;
      await writeFile(path.join(work, file), Buffer.from(rendered, 'base64'));
      frames.push({ file, atMs });
      lastFrame = { file, atMs, step: state.stepNumber };
    }
    phase = 'capture';
    capturing = true;
    captureTask = (async () => {
      while (capturing) {
        check();
        const start = performance.now();
        await capture();
        await delay(Math.max(0, 1000 / demo.captureFps - (performance.now() - start)));
      }
    })().catch((e) => {
      captureError = e;
      capturing = false;
    });
    const hold = async (ms: number) => {
      for (let remaining = ms; remaining > 0; remaining -= Math.min(100, remaining)) {
        check();
        await delay(Math.min(100, remaining));
      }
      check();
    };
    for (let i = 0; i < demo.steps.length; i++) {
      current = i;
      check();
      const step = demo.steps[i];
      caption = step.caption;
      stepNumber = i;
      zoom = step.zoom;
      click = undefined;
      focus = { x: demo.viewport.width / 2, y: demo.viewport.height / 2 };
      const startMs = performance.now() - epoch;
      onProgress(`Step ${i + 1}/${demo.steps.length}: ${step.action} — ${step.caption}`);
      const focusSelector = step.focus || ('selector' in step ? step.selector : undefined);
      if (focusSelector) {
        const locator = page.locator(focusSelector);
        await locator.waitFor({ state: 'visible' });
        await locator.scrollIntoViewIfNeeded();
        const box = await locator.boundingBox();
        if (box) focus = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      }
      await hold(250);
      if (step.action === 'open') {
        const response = await page.goto(step.url ? resolveUrl(step.url) : initial, {
          waitUntil: 'load',
        });
        if (response && response.status() >= 400)
          throw new Error(`Page returned HTTP ${response.status()}`);
      }
      if (step.action === 'click') {
        const target = page.locator(step.selector);
        await target.scrollIntoViewIfNeeded();
        const box = await target.boundingBox();
        if (box) click = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        clickUntil = performance.now() - epoch + 1000;
        await target.click();
      }
      if (step.action === 'fill') await page.locator(step.selector).fill(step.value);
      if (step.action === 'press') await page.locator(step.selector).press(step.key);
      if (step.action === 'wait') {
        if (step.selector) await page.locator(step.selector).waitFor({ state: 'visible' });
        if (step.text)
          await page
            .getByText(step.text, { exact: false })
            .filter({ visible: true })
            .first()
            .waitFor({ state: 'visible' });
        if (step.ms) await hold(step.ms);
      }
      const actionCompletedAt = performance.now() - epoch;
      await hold(step.holdMs);
      let screenshot: string | undefined;
      let screenshotAtMs: number | undefined;
      if (
        step.action === 'screenshot' ||
        step.screenshot ||
        demo.release?.social.cards.some((card) => card.step === i + 1)
      ) {
        screenshot = `screenshots/step-${String(i + 1).padStart(2, '0')}.jpg`;
        const deadline = performance.now() + demo.timeoutMs;
        while (!lastFrame || lastFrame.step !== i || lastFrame.atMs < actionCompletedAt) {
          if (performance.now() > deadline)
            throw new Error('No current-step frame captured after action completion');
          await hold(50);
        }
        const selected = lastFrame;
        screenshotAtMs = selected.atMs;
        await cp(path.join(work, selected.file), path.join(dir, screenshot));
      }
      events.push({
        index: i,
        action: step.action,
        caption: step.caption,
        startMs,
        endMs: performance.now() - epoch,
        ...(screenshot ? { screenshot, screenshotAtMs } : {}),
      });
    }
    capturing = false;
    await captureTask;
    check();
    const endMs = performance.now() - epoch;
    await browser.close();
    browser = undefined;
    await local?.close();
    local = undefined;
    const offset = frames[0].atMs;
    for (const event of events) {
      event.startMs = Math.max(0, event.startMs - offset);
      event.endMs -= offset;
      if (event.screenshotAtMs !== undefined) event.screenshotAtMs -= offset;
    }
    await cp(
      path.join(dir, events.find((e) => e.screenshot)?.screenshot || '_work/' + frames[0].file),
      path.join(dir, 'cover.jpg'),
    );
    const concat =
      frames
        .map(
          (f, i) =>
            `file '${f.file}'\nduration ${((i + 1 < frames.length ? frames[i + 1].atMs : endMs) - f.atMs) / 1000}\n`,
        )
        .join('') + `file '${frames.at(-1)!.file}'\n`;
    await writeFile(path.join(work, 'frames.txt'), concat);
    phase = 'export-mp4';
    onProgress('Exporting MP4…');
    check();
    const ffmpeg = await binary('ffmpeg');
    await run(
      ffmpeg,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-f',
        'concat',
        '-safe',
        '1',
        '-i',
        'frames.txt',
        '-vf',
        'fps=25',
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-crf',
        '20',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        'video.mp4',
      ],
      { cwd: work, signal },
    );
    const probe = JSON.parse(
      await run(
        await binary('ffprobe'),
        ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', 'video.mp4'],
        { cwd: work, signal },
      ),
    );
    const duration = +probe.format.duration;
    if (!Number.isFinite(duration) || duration <= 0)
      throw new Error('Invalid encoded video duration');
    if (demo.gif.start >= duration)
      throw new Error('GIF start must be before the end of the recording');
    phase = 'export-gif';
    onProgress('Exporting GIF…');
    check();
    await run(
      ffmpeg,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-ss',
        String(demo.gif.start),
        '-t',
        String(Math.min(demo.gif.seconds, duration - demo.gif.start)),
        '-i',
        'video.mp4',
        '-filter_complex',
        `fps=${demo.gif.fps},scale=${demo.gif.width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=3`,
        '-loop',
        '0',
        'demo.gif',
      ],
      { cwd: work, signal },
    );
    check();
    await rename(path.join(work, 'video.mp4'), path.join(dir, 'demo.mp4'));
    await rename(path.join(work, 'demo.gif'), path.join(dir, 'demo.gif'));
    phase = 'bundle';
    const width = demo.viewport.width + demo.theme.padding * 2,
      height = demo.viewport.height + demo.theme.padding * 2 + 116;
    if (probe.streams[0].width !== width || probe.streams[0].height !== height)
      throw new Error('Encoded resolution mismatch');
    const media = {
      durationSeconds: duration,
      width,
      height,
      encodedFps: 25,
      capturedFrames: frames.length,
      meanCaptureFps: frames.length / ((endMs - offset) / 1000),
      maxCaptureGapMs: Math.max(0, ...frames.slice(1).map((f, i) => f.atMs - frames[i].atMs)),
      gif: { ...demo.gif, seconds: Math.min(demo.gif.seconds, duration - demo.gif.start) },
      environment,
    };
    const captureWarnings: string[] = [];
    if (media.maxCaptureGapMs > 500)
      captureWarnings.push(
        `Capture paused for ${(media.maxCaptureGapMs / 1000).toFixed(2)}s. Inspect motion before publishing; close competing browser workloads and rerun if needed.`,
      );
    if (media.meanCaptureFps < demo.captureFps * 0.6)
      captureWarnings.push(
        `Capture averaged ${media.meanCaptureFps.toFixed(1)} fps against a ${demo.captureFps} fps target.`,
      );
    for (const warning of captureWarnings) onProgress(`QUALITY WARNING: ${warning}`);
    phase = 'export-kit';
    const kit = demo.release ? await exportKit(dir, demo, events, signal, onProgress) : undefined;
    phase = 'bundle';
    const manifest = await writeBundle(
      dir,
      demo,
      events,
      runId,
      { ...media, captureWarnings },
      kit,
    );
    check();
    await rm(work, { recursive: true, force: true });
    check();
    await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    onProgress(`SUCCESS ${dir}`);
    return { dir, manifest };
  } catch (error) {
    capturing = false;
    await captureTask;
    await browser?.close().catch(() => {});
    browser = undefined;
    await local?.close().catch(() => {});
    local = undefined;
    const status = signal?.aborted ? 'cancelled' : 'failed';
    const reason = signal?.aborted
      ? 'Cancelled by user'
      : error instanceof Error
        ? error.message
        : String(error);
    // This is a newly created, UUID-owned run directory. Never remove user-selected roots.
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, 'failure.json'),
      JSON.stringify(
        {
          schemaVersion: 1,
          status,
          runId,
          phase,
          step: current < 0 ? null : current + 1,
          action: demo.steps[current]?.action,
          reason,
        },
        null,
        2,
      ),
    );
    throw new Error(
      `${status.toUpperCase()}${current >= 0 ? ` at step ${current + 1} (${demo.steps[current].action})` : ''}, ${phase}: ${reason}\nDiagnostic: ${path.join(dir, 'failure.json')}`,
    );
  } finally {
    signal?.removeEventListener('abort', abort);
    await browser?.close().catch(() => {});
    await local?.close().catch(() => {});
  }
}
