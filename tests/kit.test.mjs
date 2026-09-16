import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDemo } from '../dist/config.js';
const release = {
  short: { steps: [1, 2], secondsPerStep: 4 },
  social: { cards: [{ step: 2, title: '完成任务', body: '结果来自本次运行。' }] },
  project: { summary: '本地示例', sections: [{ heading: '功能', body: '使用人工填写的说明。' }] },
};
const base = {
  title: '中文发布材料',
  url: 'index.html',
  steps: [
    { action: 'open', caption: '打开页面' },
    { action: 'screenshot', caption: '查看结果' },
  ],
};
test('release config accepts four deliverables and keeps old configs valid', () => {
  assert.equal(parseDemo(base).release, undefined);
  const d = parseDemo({ ...base, release });
  assert.equal(d.release.social.secondsPerCard, 6);
  assert.equal(d.release.project.summary, '本地示例');
});
test('release rejects missing, duplicate and out-of-range source steps', () => {
  for (const steps of [[0], [3], [1, 1], []])
    assert.throws(() => parseDemo({ ...base, release: { ...release, short: { steps } } }));
  assert.throws(() =>
    parseDemo({
      ...base,
      release: { ...release, social: { cards: [{ step: 3, title: 'x', body: 'y' }] } },
    }),
  );
});
test('release rejects unbounded copy and invalid durations', () => {
  assert.throws(() =>
    parseDemo({
      ...base,
      release: { ...release, social: { secondsPerCard: 0, cards: release.social.cards } },
    }),
  );
  assert.throws(() =>
    parseDemo({
      ...base,
      release: { ...release, social: { cards: [{ step: 1, title: '超'.repeat(100), body: 'x' }] } },
    }),
  );
});
test('short clip planner stays within actual events, including brief actions', async () => {
  const { planClips } = await import('../dist/kit.js');
  const clips = planClips(
    [
      { index: 0, startMs: 0, endMs: 500 },
      { index: 1, startMs: 500, endMs: 6000 },
    ],
    { steps: [1, 2], secondsPerStep: 4 },
  );
  assert.equal(clips.length, 2);
  assert.ok(clips[0].start >= 0 && clips[0].start + clips[0].duration <= 0.5);
  assert.ok(clips[1].start >= 0.5 && clips[1].start + clips[1].duration <= 6);
  assert.throws(() =>
    planClips([{ index: 0, startMs: 0, endMs: 0 }], { steps: [1], secondsPerStep: 4 }),
  );
});
