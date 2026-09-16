import { readFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';
import { parseDemo } from './config.js';

export async function inspectConfig(file: string) {
  let value: unknown;
  try {
    value = JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new Error(`Cannot read demo JSON: ${error instanceof Error ? error.message : error}`);
  }
  try {
    return parseDemo(value);
  } catch (error) {
    if (error instanceof z.ZodError)
      throw new Error(
        'Invalid demo configuration:\n' +
          error.issues.map((i) => `${i.path.join('.') || 'config'}: ${i.message}`).join('\n'),
      );
    throw error;
  }
}

const assetSchema = z.object({
  path: z.string(),
  bytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  status: z.literal('success'),
  files: z.array(assetSchema).min(5),
  events: z.array(
    z.object({
      screenshot: z.string().optional(),
      startMs: z.number().optional(),
      endMs: z.number().optional(),
    }),
  ),
  deliverables: z
    .object({
      version: z.literal(1),
      files: z.array(z.string()).min(7),
      clips: z
        .array(
          z.object({
            step: z.number().int().min(1),
            start: z.number().nonnegative(),
            duration: z.number().positive(),
          }),
        )
        .min(1),
      cards: z
        .array(
          z.object({ step: z.number().int().min(1), screenshot: z.string(), file: z.string() }),
        )
        .min(1),
      short: z.object({
        durationSeconds: z.number().positive(),
        width: z.number().positive(),
        height: z.number().positive(),
        bytes: z.number().positive(),
      }),
      social: z.object({
        durationSeconds: z.number().positive(),
        width: z.literal(1080),
        height: z.literal(1920),
        bytes: z.number().positive(),
      }),
    })
    .optional(),
});
export async function verifyPack(directory: string) {
  const root = await realpath(directory);
  let manifest: z.infer<typeof manifestSchema>;
  try {
    manifest = manifestSchema.parse(
      JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8')),
    );
  } catch {
    throw new Error('A valid success manifest.json is required; this may be an incomplete run.');
  }
  const paths = new Set<string>();
  for (const file of manifest.files) {
    if (
      !/^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+$/.test(file.path) ||
      file.path.split('/').some((p) => p === '.' || p === '..')
    )
      throw new Error(`Unsafe asset path: ${file.path}`);
    if (paths.has(file.path)) throw new Error(`Duplicate asset path: ${file.path}`);
    paths.add(file.path);
    const target = path.resolve(root, file.path);
    let real: string;
    try {
      real = await realpath(target);
    } catch {
      throw new Error(`Missing asset: ${file.path}`);
    }
    const relative = path.relative(root, real);
    if (relative.startsWith('..') || path.isAbsolute(relative))
      throw new Error(`Unsafe asset path: ${file.path}`);
    const data = await readFile(real);
    if (
      data.length !== file.bytes ||
      createHash('sha256').update(data).digest('hex') !== file.sha256
    )
      throw new Error(`Integrity mismatch: ${file.path}`);
  }
  for (const required of ['demo.mp4', 'demo.gif', 'cover.jpg', 'README-snippet.md', 'index.html'])
    if (!paths.has(required)) throw new Error(`Manifest is missing required asset: ${required}`);
  for (const event of manifest.events)
    if (event.screenshot && !paths.has(event.screenshot))
      throw new Error(`Manifest is missing referenced screenshot: ${event.screenshot}`);
  if (manifest.deliverables) {
    const kit = manifest.deliverables;
    for (const required of [
      'short.mp4',
      'social.mp4',
      'project.md',
      'project.html',
      'social-caption.md',
      'walkthrough.html',
      ...kit.files,
    ])
      if (!paths.has(required)) throw new Error(`Manifest is missing deliverable: ${required}`);
    for (const card of kit.cards)
      if (!paths.has(card.file) || manifest.events[card.step - 1]?.screenshot !== card.screenshot)
        throw new Error(`Invalid deliverable card source: step ${card.step}`);
    for (const clip of kit.clips) {
      const event = manifest.events[clip.step - 1];
      if (
        !event ||
        event.startMs === undefined ||
        event.endMs === undefined ||
        clip.start < event.startMs / 1000 - 0.001 ||
        clip.start + clip.duration > event.endMs / 1000 + 0.001
      )
        throw new Error(`Invalid deliverable clip source: step ${clip.step}`);
    }
  }
  return {
    status: 'verified' as const,
    files: paths.size,
    note: 'Checks completeness and hashes, not visual quality or authenticity.',
  };
}

export async function rootSnippet(directory: string, prefix: string) {
  if (
    !prefix ||
    /[:\\?#\r\n]/.test(prefix) ||
    prefix.startsWith('/') ||
    prefix.split('/').some((p) => !p || p === '.' || p === '..')
  )
    throw new Error('Prefix must be a relative repository directory, for example docs/demo.');
  await verifyPack(directory);
  const safe = prefix.split('/').map(encodeURIComponent).join('/');
  const source = await readFile(path.join(directory, 'README-snippet.md'), 'utf8');
  return source.replace(
    /\]\((demo\.(?:gif|mp4)|index\.html|screenshots\/[a-zA-Z0-9_.-]+)\)/g,
    `](${safe}/$1)`,
  );
}
