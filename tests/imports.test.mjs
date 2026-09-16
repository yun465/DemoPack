import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storySchema, prepareStory } from '../dist/imports.js';
import { mkdir, writeFile, readFile, symlink } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('test-results', `imports-unit-${Date.now()}`);
const valid = {
  title: '测试',
  summary: '实测报告',
  conditions: '本机固定输入',
  limitations: '非普遍结论',
  chapters: [
    { title: '结果', caption: '查看结果', file: '结果.json', origin: '本机运行', kind: 'text' },
  ],
};
test('source story requires context and explicit provenance', () => {
  assert.equal(storySchema.parse(valid).chapters[0].seconds, 6);
  for (const change of [
    { conditions: '' },
    { limitations: '' },
    { chapters: [{ ...valid.chapters[0], origin: '' }] },
    { command: 'arbitrary' },
  ])
    assert.throws(() => storySchema.parse({ ...valid, ...change }));
});

test('source snapshots escape text and keep content-addressed provenance', async () => {
  const dir = path.join(root, '中文 输入');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, '结果.json'), '<script>alert(1)</script>');
  await writeFile(path.join(dir, 'story.json'), JSON.stringify(valid));
  const out = path.join(root, 'snapshot');
  const prepared = await prepareStory(path.join(dir, 'story.json'), 'report', out);
  const page = await readFile(path.join(out, 'chapter-1.html'), 'utf8');
  assert.ok(page.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!page.includes('<script>alert'));
  const evidence = JSON.parse(await readFile(path.join(out, 'sources.json')));
  assert.equal(evidence.sources[0].file, 'sources/01.json');
  assert.equal(evidence.sources[0].sha256.length, 64);
  assert.ok(prepared.attachments.files.includes('source.html'));
});

test('rejects missing files, traversal, absolute paths, symlink escape and cancelled preparation', async () => {
  const dir = path.join(root, 'boundaries');
  await mkdir(dir, { recursive: true });
  const outer = path.join(root, 'outside');
  await mkdir(outer, { recursive: true });
  await writeFile(path.join(outer, 'result.txt'), 'outside');
  await symlink(outer, path.join(dir, 'link'), process.platform === 'win32' ? 'junction' : 'dir');
  for (const [i, file] of [
    'missing.txt',
    '../outside/result.txt',
    path.join(outer, 'result.txt'),
    'link/result.txt',
    'https://example.com/file.txt',
  ].entries()) {
    const story = { ...valid, chapters: [{ ...valid.chapters[0], file }] };
    await writeFile(path.join(dir, 'story.json'), JSON.stringify(story));
    await assert.rejects(
      prepareStory(path.join(dir, 'story.json'), 'report', path.join(root, `bad-${i}`)),
    );
  }
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    prepareStory(
      path.join(dir, 'story.json'),
      'report',
      path.join(root, 'cancelled'),
      controller.signal,
    ),
    /Cancelled/,
  );
});

test('report rejects media and nonfinite/invalid measurement documents', async () => {
  const dir = path.join(root, 'invalid');
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, 'bad.json'),
    '[{"label":"x","before":"fast","after":2,"unit":"ms"}]',
  );
  for (const kind of ['metrics', 'image']) {
    await writeFile(
      path.join(dir, 'story.json'),
      JSON.stringify({ ...valid, chapters: [{ ...valid.chapters[0], file: 'bad.json', kind }] }),
    );
    await assert.rejects(
      prepareStory(path.join(dir, 'story.json'), 'report', path.join(root, kind)),
    );
  }
});
