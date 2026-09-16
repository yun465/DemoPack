import { z } from 'zod';
import { readFile, writeFile, mkdir, realpath, stat, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { escapeHtml as e } from './text.js';
import { generate } from './capture.js';
import { binary, run } from './process.js';
import { parseDemo } from './config.js';
export const storySchema = z.strictObject({
  title: z.string().min(1).max(60),
  summary: z.string().min(1).max(400),
  conditions: z.string().min(1).max(1600),
  limitations: z.string().min(1).max(1600),
  chapters: z
    .array(
      z.strictObject({
        title: z.string().min(1).max(40),
        caption: z.string().min(1).max(100),
        file: z.string().min(1),
        kind: z.enum(['text', 'metrics', 'image', 'video']),
        origin: z.string().min(1).max(500),
        seconds: z.number().min(3).max(20).default(6),
        startSeconds: z.number().nonnegative().default(0),
      }),
    )
    .min(1)
    .max(8),
});
const metricsSchema = z
  .array(
    z.strictObject({
      label: z.string().min(1).max(80),
      before: z.number().finite(),
      after: z.number().finite(),
      unit: z.string().max(30),
    }),
  )
  .min(1)
  .max(5);
const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex');
const css = `*{box-sizing:border-box}body{margin:0;overflow-wrap:anywhere;background:#f3f2ec;color:#173d36;font:19px/1.65 'Microsoft YaHei',sans-serif}main{max-width:1120px;margin:auto;padding:28px 42px}header{font-size:15px;color:#63796b;border-bottom:1px solid #cbd4c6;padding-bottom:12px}h1{font-size:34px;margin:18px 0}p{margin:10px 0}pre{max-height:350px;overflow:hidden;white-space:pre-wrap;overflow-wrap:anywhere;background:#173d36;color:#f3f2ec;border-radius:16px;padding:22px;font:17px/1.55 monospace}img,video{display:block;width:100%;height:410px;object-fit:contain;background:#e4e8de;border-radius:16px}table{border-collapse:collapse;width:100%;margin:25px 0;background:#fafbf5}td,th{text-align:left;border-bottom:1px solid #cbd4c6;padding:8px}small{font-size:14px;color:#526c5d}a{color:inherit}article{border-top:1px solid #cbd4c6;padding:24px 0}`;
const html = (body: string, script = '') =>
  `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'"><style>${css}</style><main>${body}</main>${script}</html>`;

export async function prepareStory(
  file: string,
  kind: 'report' | 'media',
  root: string,
  signal?: AbortSignal,
) {
  const check = () => {
    if (signal?.aborted) throw new Error('Cancelled');
  };
  check();
  const configPath = await realpath(file),
    base = path.dirname(configPath);
  const story = storySchema.parse(
    JSON.parse((await readFile(configPath, 'utf8')).replace(/^\uFEFF/, '')),
  );
  const label =
    kind === 'report' ? '结果报告回放 · 非测试现场录屏' : '外部素材回放 · 非现场设备操作';
  await mkdir(path.join(root, 'sources'), { recursive: true });
  const sources = [],
    pages = [],
    steps: object[] = [],
    chosen: number[] = [];
  let totalBytes = 0;
  for (const [i, c] of story.chapters.entries()) {
    check();
    if (kind === 'report' && !['text', 'metrics'].includes(c.kind))
      throw new Error('report accepts text or metrics chapters');
    if (path.isAbsolute(c.file) || /^[a-z]+:/i.test(c.file))
      throw new Error('Sources must be relative local paths');
    const source = await realpath(path.resolve(base, c.file));
    const rel = path.relative(base, source);
    if (rel.startsWith('..') || path.isAbsolute(rel))
      throw new Error('Source escapes config directory');
    const info = await stat(source);
    totalBytes += info.size;
    if (!info.isFile() || info.size > 100 * 1024 * 1024 || totalBytes > 250 * 1024 * 1024)
      throw new Error('Source exceeds file/pack limit (100/250 MiB)');
    const ext = path.extname(source).toLowerCase();
    const allowed = {
      text: ['.txt', '.log', '.diff', '.md', '.json'],
      metrics: ['.json'],
      image: ['.jpg', '.jpeg', '.png'],
      video: ['.mp4'],
    };
    if (!allowed[c.kind].includes(ext)) throw new Error(`Unsupported ${c.kind} source: ${ext}`);
    if (['text', 'metrics'].includes(c.kind) && info.size > 64000)
      throw new Error('Text source exceeds 64000 bytes; provide a focused excerpt');
    const data = await readFile(source),
      name = `sources/${String(i + 1).padStart(2, '0')}${ext}`;
    await writeFile(path.join(root, name), data);
    let content = '',
      script = '';
    if (c.kind === 'text') {
      const text = data.toString('utf8'),
        lines = text.split(/\r?\n/);
      content = `<pre>${e(lines.slice(0, 13).join('\n').slice(0, 900))}</pre><small>画面为有限区域节选（前 13 行 / 最多 900 字符）；完整内容见原始文件。</small>`;
    } else if (c.kind === 'metrics') {
      const rows = metricsSchema.parse(JSON.parse(data.toString('utf8')));
      content = `<table><tr><th>指标</th><th>之前</th><th>之后</th></tr>${rows.map((r) => `<tr><td>${e(r.label)}</td><td>${r.before} ${e(r.unit)}</td><td>${r.after} ${e(r.unit)}</td></tr>`).join('')}</table><small>数值来自导入文件；工具未独立验证实验方法，不自动推断提升或因果。</small>`;
    } else if (c.kind === 'image') {
      content = `<img src="${name}" alt="${e(c.title)}">`;
      script = `<script>document.querySelector('img').decode().then(()=>document.body.dataset.ready='yes').catch(()=>document.body.dataset.error='image');</script>`;
    } else {
      const probe = JSON.parse(
        await run(
          await binary('ffprobe'),
          ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', path.join(root, name)],
          { signal },
        ),
      );
      if (
        !probe.streams.some((s: { codec_type: string }) => s.codec_type === 'video') ||
        !Number.isFinite(+probe.format.duration) ||
        c.startSeconds + c.seconds > +probe.format.duration
      )
        throw new Error('Video segment exceeds source duration or video is invalid');
      content = `<video muted playsinline preload="auto" src="${name}"></video><small>静音回放 · 从 ${c.startSeconds} 秒开始 · 原始视频另附</small>`;
      script = `<script>const v=document.querySelector('video');v.addEventListener('loadeddata',async()=>{try{if(${c.startSeconds}>0){v.currentTime=${c.startSeconds};await new Promise(r=>v.addEventListener('seeked',r,{once:true}));}await v.play();document.body.dataset.ready='yes';setTimeout(()=>{v.pause();v.currentTime=${c.startSeconds + c.seconds};},${c.seconds * 1000});}catch{document.body.dataset.error='playback';}},{once:true});</script>`;
    }
    const body = `<header>${e(label)} · ${i + 1} / ${story.chapters.length}</header><h1>${e(c.title)}</h1>${content}<p>${e(c.caption)}</p><small>来源：${e(c.origin.slice(0, 100))}${c.origin.length > 100 ? '…（完整说明见来源页）' : ''}</small>`;
    const page = `chapter-${i + 1}.html`;
    await writeFile(path.join(root, page), html(body, script));
    sources.push({
      file: name,
      kind: c.kind,
      origin: c.origin,
      title: c.title,
      sha256: hash(data),
      bytes: data.length,
      startSeconds: c.startSeconds,
      seconds: c.seconds,
    });
    pages.push(
      `<article><h2>${e(c.title)}</h2><p>${e(c.caption)}</p><p>来源：${e(c.origin)}</p><a href="${name}">打开原始${e(c.kind)}文件</a><p><small>SHA-256: ${hash(data)}</small></p>${c.kind === 'image' ? `<img src="${name}" alt="${e(c.title)}">` : c.kind === 'video' ? `<video controls preload="metadata" src="${name}"></video>` : ''}</article>`,
    );
    const waitAsset = c.kind === 'video' || c.kind === 'image';
    steps.push({
      action: 'open',
      url: page,
      caption: `${label}：${c.caption}`,
      holdMs: waitAsset ? 200 : c.seconds * 1000,
      screenshot: !waitAsset,
    });
    if (waitAsset)
      steps.push({
        action: 'wait',
        selector: 'body[data-ready="yes"]',
        caption: `${label}：${c.caption}`,
        holdMs: c.seconds * 1000,
        screenshot: true,
      });
    chosen.push(steps.length);
  }
  const provenance = {
    version: 1,
    kind,
    title: story.title,
    conditions: story.conditions,
    limitations: story.limitations,
    sources,
  };
  await writeFile(path.join(root, 'sources.json'), JSON.stringify(provenance, null, 2));
  await writeFile(
    path.join(root, 'source.html'),
    html(
      `<header>${e(label)}</header><h1>${e(story.title)}</h1><p>${e(story.summary)}</p><h2>测试 / 拍摄条件</h2><p>${e(story.conditions)}</p><h2>已知限制</h2><p>${e(story.limitations)}</p><p>说明由作者提供；哈希用于核对字节一致性，不证明来源真实性。<a href="sources.json">下载来源清单</a></p>${pages.join('')}`,
    ),
  );
  const demo = parseDemo({
    title: story.title,
    url: 'chapter-1.html',
    viewport: { width: 1120, height: 760 },
    gif: { seconds: 8 },
    steps,
    release: {
      short: { steps: chosen, secondsPerStep: 3 },
      social: {
        secondsPerCard: 5,
        cards: story.chapters.map((c, i) => ({ step: chosen[i], title: c.title, body: c.caption })),
      },
      project: {
        summary: `${label}。${story.summary}`,
        sections: [
          { heading: '测试 / 拍摄条件', body: story.conditions },
          ...story.chapters.map((c) => ({
            heading: c.title,
            body: `${c.caption}\n来源：${c.origin}`,
          })),
          { heading: '当前限制', body: story.limitations },
          {
            heading: '材料生成方式',
            body: '本包视频为材料页的真实浏览器回放，不是直接执行基准测试或控制硬件。原始材料与哈希见 source.html / sources.json。导入视频静音采样，无音轨合成。',
          },
        ],
      },
    },
  });
  await writeFile(path.join(root, 'demo.json'), JSON.stringify(demo, null, 2));
  check();
  return {
    config: path.join(root, 'demo.json'),
    attachments: {
      root,
      kind,
      files: ['source.html', 'sources.json', ...sources.map((s) => s.file)],
    },
  };
}

export async function generateStory(
  file: string,
  kind: 'report' | 'media',
  out?: string,
  signal?: AbortSignal,
) {
  const root = await mkdtemp(path.join(tmpdir(), 'demopack-import-'));
  try {
    const prepared = await prepareStory(file, kind, root, signal);
    return await generate(prepared.config, out, signal, console.log, prepared.attachments);
  } finally {
    // mkdtemp created this exact directory; never remove an input or user output directory.
    const resolved = path.resolve(root),
      parent = path.resolve(tmpdir());
    if (path.dirname(resolved) === parent && path.basename(resolved).startsWith('demopack-import-'))
      await rm(resolved, { recursive: true, force: true });
  }
}
