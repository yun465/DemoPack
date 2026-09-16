import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { generate } from '../dist/capture.js';
const root = path.resolve('test-results', `keyboard-${Date.now()}`);
await mkdir(root, { recursive: true });
await writeFile(
  path.join(root, 'index.html'),
  '<input id="task"><p id="result"></p><script>task.addEventListener("keydown", e => { if(e.key === "Enter") result.textContent = task.value; });</script>',
);
const demo = {
  title: '键盘回归',
  url: './index.html',
  timeoutMs: 1000,
  gif: { seconds: 1 },
  steps: [
    {
      action: 'fill',
      selector: '#task',
      value: '已通过真实按键提交',
      caption: '填写',
      holdMs: 200,
    },
    { action: 'press', selector: '#task', key: 'Enter', caption: '回车提交', holdMs: 200 },
    { action: 'wait', text: '已通过真实按键提交', caption: '核对键盘事件结果', holdMs: 200 },
  ],
};
await writeFile(path.join(root, 'demo.json'), JSON.stringify(demo));
const result = await generate(path.join(root, 'demo.json'), path.join(root, 'success'));
assert.equal(result.manifest.events[1].action, 'press');
demo.steps = [
  { action: 'press', selector: '#missing', key: 'Enter', caption: '缺失目标', holdMs: 200 },
];
await writeFile(path.join(root, 'demo.json'), JSON.stringify(demo));
await assert.rejects(
  generate(path.join(root, 'demo.json'), path.join(root, 'failure')),
  /missing|Timeout/,
);
const failureDir = path.join(root, 'failure', (await readdir(path.join(root, 'failure')))[0]);
assert.deepEqual(await readdir(failureDir), ['failure.json']);
const failure = JSON.parse(await readFile(path.join(failureDir, 'failure.json')));
await writeFile(
  path.join(root, 'results.json'),
  JSON.stringify(
    {
      status: 'passed',
      cases: ['Enter dispatch changes DOM', 'Missing keyboard target produces only failure.json'],
      failure,
    },
    null,
    2,
  ),
);
console.log('PASS keyboard browser regression:', root);
