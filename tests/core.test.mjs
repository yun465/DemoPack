import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDemo } from '../dist/config.js';
import { escapeHtml, markdown } from '../dist/bundle.js';
const base = {
  title: 'Example',
  url: './index.html',
  steps: [{ action: 'screenshot', caption: 'Hello' }],
};
test('validates defaults and Chinese captions', () => {
  const d = parseDemo({
    ...base,
    steps: [{ action: 'fill', selector: '#name', value: '虚构用户', caption: '输入姓名' }],
  });
  assert.equal(d.viewport.width, 960);
  assert.equal(d.steps[0].holdMs, 2500);
});
test('rejects unknown actions, malformed locators and unsafe durations', () => {
  for (const step of [
    { action: 'exec', caption: 'x' },
    { action: 'click', caption: 'x' },
    { action: 'wait', caption: 'x', ms: -1 },
    { action: 'screenshot', caption: 'x', zoom: 4 },
  ])
    assert.throws(() => parseDemo({ ...base, steps: [step] }));
  assert.throws(() => parseDemo({ ...base, viewport: { width: 961, height: 600 } }));
  assert.throws(() => parseDemo({ ...base, cookies: [] }));
});
test('text cannot inject HTML or README images', () => {
  assert.equal(escapeHtml('<script>"&'), '&lt;script&gt;&quot;&amp;');
  assert.ok(!markdown('![evil](https://evil) <img>').includes('!['));
});

test('keyboard actions require an explicit target and a supported key', () => {
  const step = { action: 'press', selector: '.new-todo', key: 'Enter', caption: '提交任务' };
  assert.equal(parseDemo({ ...base, steps: [step] }).steps[0].key, 'Enter');
  for (const invalid of [
    { ...step, key: '' },
    { ...step, selector: '' },
    { ...step, key: 'arbitrary' },
  ])
    assert.throws(() => parseDemo({ ...base, steps: [invalid] }));
});
