import { previewHtml } from './preview.js';
import { writeFile, stat, readFile, cp, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import type { Demo } from './config.js';
import { escapeHtml, markdown } from './text.js';
import type { Kit } from './kit.js';
import { kitHtml } from './kit-view.js';
export { escapeHtml, markdown };
export type Event = {
  index: number;
  action: string;
  caption: string;
  startMs: number;
  endMs: number;
  screenshot?: string;
  screenshotAtMs?: number;
};
export type Attachments = { root: string; files: string[]; kind: 'report' | 'media' };
export async function writeBundle(
  dir: string,
  demo: Demo,
  events: Event[],
  runId: string,
  media: unknown,
  kit?: Kit,
  attachments?: Attachments,
) {
  const screenshots = events.filter((s) => s.screenshot);
  await writeFile(
    path.join(dir, 'README-snippet.md'),
    `## ${markdown(demo.title)}\n\n![演示动图](demo.gif)\n\n[观看完整视频](demo.mp4) · [离线预览](index.html)\n\n${events.map((s) => `### ${s.index + 1}. ${markdown(s.caption)}\n\n${s.screenshot ? `![步骤 ${s.index + 1}](${s.screenshot})\n` : ''}`).join('\n')}\n生成记录 \`${runId}\`. 请整体复制此文件夹，以保留相对图片链接。\n`,
  );
  const label =
    attachments?.kind === 'report'
      ? '导入结果报告的浏览器回放，不是测试现场录屏'
      : '外部素材的浏览器回放，不是现场设备操作';
  const identify = (html: string) =>
    attachments
      ? html
          .replace(
            '<main>',
            `<main><p style="padding:20px;color:#173d36;background:#eef0e5">${label} · <a href="source.html">查看原始素材、条件与来源</a></p>`,
          )
          .replace('完整浏览器演示', '来源材料讲解')
          .replace(
            '视频、关键画面与图文说明来自同一次浏览器运行。',
            '视频为本次材料页回放；原始来源可能来自不同运行或拍摄，请查看来源清单。',
          )
      : html;
  const walkthrough = identify(previewHtml(demo.title, events, runId));
  if (kit) await writeFile(path.join(dir, 'walkthrough.html'), walkthrough);
  const warnings = (media as { captureWarnings?: string[] })?.captureWarnings ?? [];
  await writeFile(
    path.join(dir, 'index.html'),
    kit ? identify(kitHtml(demo, kit, runId, warnings)) : walkthrough,
  );
  if (attachments) {
    for (const name of attachments.files) {
      if (!/^(?:sources\/)?[a-zA-Z0-9_.-]+$/.test(name)) throw new Error('Unsafe attachment path');
      await mkdir(path.dirname(path.join(dir, name)), { recursive: true });
      await cp(path.join(attachments.root, name), path.join(dir, name), {
        errorOnExist: true,
        force: false,
      });
    }
    const snippet = path.join(dir, 'README-snippet.md');
    await writeFile(
      snippet,
      (await readFile(snippet, 'utf8')) + `\n${label}。[来源与原始文件](source.html)\n`,
    );
  }
  const names = [
    'demo.mp4',
    'demo.gif',
    'cover.jpg',
    'README-snippet.md',
    'index.html',
    ...screenshots.map((s) => s.screenshot!),
    ...(kit?.files ?? []),
    ...(attachments?.files ?? []),
  ];
  const files = await Promise.all(
    names.map(async (name) => ({
      path: name,
      bytes: (await stat(path.join(dir, name))).size,
      sha256: createHash('sha256')
        .update(await readFile(path.join(dir, name)))
        .digest('hex'),
    })),
  );
  return {
    schemaVersion: 1,
    status: 'success',
    runId,
    title: demo.title,
    events,
    media,
    files,
    ...(kit ? { deliverables: kit } : {}),
    ...(attachments
      ? { source: { kind: attachments.kind, manifest: 'sources.json', page: 'source.html' } }
      : {}),
  };
}
