import { previewHtml } from './preview.js';
import { writeFile, stat, readFile } from 'node:fs/promises';
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
export async function writeBundle(
  dir: string,
  demo: Demo,
  events: Event[],
  runId: string,
  media: unknown,
  kit?: Kit,
) {
  const screenshots = events.filter((s) => s.screenshot);
  await writeFile(
    path.join(dir, 'README-snippet.md'),
    `## ${markdown(demo.title)}\n\n![演示动图](demo.gif)\n\n[观看完整视频](demo.mp4) · [离线预览](index.html)\n\n${events.map((s) => `### ${s.index + 1}. ${markdown(s.caption)}\n\n${s.screenshot ? `![步骤 ${s.index + 1}](${s.screenshot})\n` : ''}`).join('\n')}\n生成记录 \`${runId}\`. 请整体复制此文件夹，以保留相对图片链接。\n`,
  );
  const walkthrough = previewHtml(demo.title, events, runId);
  if (kit) await writeFile(path.join(dir, 'walkthrough.html'), walkthrough);
  const warnings = (media as { captureWarnings?: string[] })?.captureWarnings ?? [];
  await writeFile(
    path.join(dir, 'index.html'),
    kit ? kitHtml(demo, kit, runId, warnings) : walkthrough,
  );
  const names = [
    'demo.mp4',
    'demo.gif',
    'cover.jpg',
    'README-snippet.md',
    'index.html',
    ...screenshots.map((s) => s.screenshot!),
    ...(kit?.files ?? []),
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
  };
}
