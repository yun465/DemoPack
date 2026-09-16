import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Demo, Release } from './config.js';
import type { Event } from './bundle.js';
import { binary, run } from './process.js';
import { cardHtml, projectHtml } from './kit-view.js';
import { markdown } from './text.js';

export type Clip = { step: number; start: number; duration: number };
export type MediaInfo = { durationSeconds: number; width: number; height: number; bytes: number };
export type Kit = {
  version: 1;
  files: string[];
  clips: Clip[];
  cards: { step: number; screenshot: string; file: string }[];
  short: MediaInfo;
  social: MediaInfo;
};
export function planClips(
  events: Pick<Event, 'index' | 'startMs' | 'endMs'>[],
  config: Release['short'],
): Clip[] {
  return config.steps.map((step) => {
    const event = events.find((e) => e.index === step - 1);
    if (
      !event ||
      !Number.isFinite(event.endMs) ||
      !Number.isFinite(event.startMs) ||
      event.endMs <= event.startMs
    )
      throw new Error(`Cannot create short clip for step ${step}: missing or empty time range`);
    const end = event.endMs / 1000;
    const available = (event.endMs - event.startMs) / 1000;
    const duration = Math.min(config.secondsPerStep, available);
    return { step, start: Math.max(event.startMs / 1000, end - duration), duration };
  });
}

export async function exportKit(
  dir: string,
  demo: Demo,
  events: Event[],
  signal?: AbortSignal,
  progress = (_: string) => {},
): Promise<Kit> {
  const release = demo.release!;
  const check = () => {
    if (signal?.aborted) throw new Error('Cancelled');
  };
  const ffmpeg = await binary('ffmpeg');
  const ffprobe = await binary('ffprobe');
  const encode = (args: string[]) =>
    run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { cwd: dir, signal });
  const inspect = async (name: string): Promise<MediaInfo> => {
    const probe = JSON.parse(
      await run(ffprobe, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', name], {
        cwd: dir,
        signal,
      }),
    );
    const stream = probe.streams.find((s: { codec_type: string }) => s.codec_type === 'video');
    if (!stream || !Number.isFinite(+probe.format.duration) || +probe.format.duration <= 0)
      throw new Error(`Invalid exported media: ${name}`);
    return {
      durationSeconds: +probe.format.duration,
      width: stream.width,
      height: stream.height,
      bytes: +probe.format.size,
    };
  };
  check();
  progress('Exporting short video… / 导出简短视频');
  const clips = planClips(events, release.short);
  const filters = clips.map(
    (c, i) => `[0:v]trim=start=${c.start}:duration=${c.duration},setpts=PTS-STARTPTS[v${i}]`,
  );
  filters.push(clips.map((_, i) => `[v${i}]`).join('') + `concat=n=${clips.length}:v=1:a=0[out]`);
  await encode([
    '-i',
    'demo.mp4',
    '-filter_complex',
    filters.join(';'),
    '-map',
    '[out]',
    '-an',
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
    'short.mp4',
  ]);
  check();
  progress('Rendering social cards… / 绘制竖屏图文');
  await mkdir(path.join(dir, 'cards'));
  const cards: Kit['cards'] = [];
  const browser = await chromium.launch();
  const abort = () => {
    void browser.close().catch(() => {});
  };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    check();
    const context = await browser.newContext({
      viewport: { width: 1080, height: 1920 },
      deviceScaleFactor: 1,
      offline: true,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(demo.timeoutMs);
    for (const [i, card] of release.social.cards.entries()) {
      check();
      const source = events[card.step - 1]?.screenshot;
      if (!source) throw new Error(`Social card ${i + 1}: step ${card.step} has no screenshot`);
      const image = (await readFile(path.join(dir, source))).toString('base64');
      await page.setContent(cardHtml(demo.title, card, i, release.social.cards.length, image));
      await page.locator('img').evaluate(async (img) => {
        await (img as HTMLImageElement).decode();
        await document.fonts.ready;
      });
      const overflow = await page.evaluate(() => {
        const content = document.querySelector('.body')!.getBoundingClientRect();
        const footer = document.querySelector('.footer')!.getBoundingClientRect();
        const title = document.querySelector('h1')!.getBoundingClientRect();
        return (
          content.bottom > footer.top - 24 ||
          title.height > 285 ||
          document.documentElement.scrollWidth > 1080
        );
      });
      if (overflow)
        throw new Error(
          `Social card ${i + 1} text overflows. Shorten release.social.cards.${i}.title/body or remove line breaks.`,
        );
      const file = `cards/${String(i + 1).padStart(2, '0')}.png`;
      await page.screenshot({ path: path.join(dir, file) });
      cards.push({ step: card.step, screenshot: source, file });
    }
  } finally {
    signal?.removeEventListener('abort', abort);
    await browser.close().catch(() => {});
  }
  check();
  progress('Exporting social video… / 导出竖屏图文视频');
  await encode([
    '-framerate',
    `1/${release.social.secondsPerCard}`,
    '-start_number',
    '1',
    '-i',
    'cards/%02d.png',
    '-t',
    String(cards.length * release.social.secondsPerCard),
    '-r',
    '25',
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '19',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    'social.mp4',
  ]);
  const short = await inspect('short.mp4'),
    social = await inspect('social.mp4');
  if (social.width !== 1080 || social.height !== 1920)
    throw new Error('Social video resolution mismatch');
  if (
    Math.abs(social.durationSeconds - cards.length * release.social.secondsPerCard) > 0.15 ||
    Math.abs(short.durationSeconds - clips.reduce((n, c) => n + c.duration, 0)) > 0.15
  )
    throw new Error('Release video duration mismatch');
  const paragraphs = (s: string) => s.split(/\r?\n/).map(markdown).join('\n');
  await writeFile(
    path.join(dir, 'project.md'),
    `# ${markdown(demo.title)}\n\n${paragraphs(release.project.summary)}\n\n${release.project.sections.map((s) => `## ${markdown(s.heading)}\n\n${paragraphs(s.body)}\n`).join('\n')}`,
  );
  await writeFile(path.join(dir, 'project.html'), projectHtml(demo));
  await writeFile(
    path.join(dir, 'social-caption.md'),
    release.socialCaption ??
      `# ${markdown(demo.title)}\n\n${paragraphs(release.project.summary)}\n\n${release.social.cards.map((c) => `${markdown(c.title)}\n${paragraphs(c.body)}`).join('\n\n')}\n`,
  );
  check();
  return {
    version: 1,
    files: [
      'short.mp4',
      'social.mp4',
      'project.md',
      'project.html',
      'social-caption.md',
      'walkthrough.html',
      ...cards.map((c) => c.file),
    ],
    clips,
    cards,
    short,
    social,
  };
}
