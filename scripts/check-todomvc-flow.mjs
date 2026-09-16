import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const d = JSON.parse(await readFile('examples/todomvc/demo.json'));
const b = await chromium.launch();
const checks = [];
try {
  const p = await b.newPage();
  for (const [i, s] of d.steps.entries()) {
    if (s.action === 'open') await p.goto(d.url);
    if (s.action === 'fill') await p.locator(s.selector).fill(s.value);
    if (s.action === 'press') await p.locator(s.selector).press(s.key);
    if (s.action === 'click') await p.locator(s.selector).click();
    if (s.action === 'wait') {
      if (s.selector) await p.locator(s.selector).waitFor();
      if (s.text) await p.getByText(s.text).waitFor();
    }
    if ([6, 8, 10, 11, 14].includes(i)) {
      if (i === 11) await p.locator('.todo-list li.completed label').waitFor();
      const labels = await p.locator('.todo-list li label').allTextContents();
      if (i === 6)
        assert.deepEqual(
          [...labels].sort(),
          ['整理项目介绍', '录制功能演示', '检查发布材料'].sort(),
        );
      if (i === 8)
        assert.deepEqual(await p.locator('.todo-list li.completed label').allTextContents(), [
          '整理项目介绍',
        ]);
      if (i === 10 || i === 14)
        assert.deepEqual([...labels].sort(), ['录制功能演示', '检查发布材料'].sort());
      if (i === 11) assert.deepEqual(labels, ['整理项目介绍']);
      checks.push({ step: i + 1, labels });
    }
  }
} finally {
  await b.close();
}
await writeFile(
  'test-results/todomvc-flow.json',
  JSON.stringify({ status: 'passed', checks }, null, 2),
);
console.log('PASS 5 independent DOM state assertions');
