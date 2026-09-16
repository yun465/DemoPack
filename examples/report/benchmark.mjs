import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.dirname(fileURLToPath(import.meta.url));
const values = Array.from({ length: 20000 }, (_, i) => i * 2);
const queries = Array.from({ length: 5000 }, (_, i) => (i * 7919) % 50000);
const before = () => queries.filter((x) => values.includes(x)).length;
const after = () => {
  const index = new Set(values);
  return queries.filter((x) => index.has(x)).length;
};
assert.equal(before(), after());
before();
after();
const timings = { before: [], after: [] };
for (let i = 0; i < 7; i++) {
  for (const [name, fn] of i % 2
    ? [
        ['after', after],
        ['before', before],
      ]
    : [
        ['before', before],
        ['after', after],
      ]) {
    const start = performance.now();
    fn();
    timings[name].push(performance.now() - start);
  }
}
const median = (xs) => [...xs].sort((a, b) => a - b)[3];
await writeFile(
  path.join(root, 'metrics.json'),
  JSON.stringify(
    [
      {
        label: '批量查找中位耗时（越低越好）',
        before: +median(timings.before).toFixed(3),
        after: +median(timings.after).toFixed(3),
        unit: 'ms',
      },
    ],
    null,
    2,
  ),
);
await writeFile(
  path.join(root, 'runs.txt'),
  `时间：${new Date().toISOString()}\nNode ${process.version} / ${process.platform} ${process.arch}\n输入：20000 个整数，5000 次固定查询\n一次预热后运行 7 轮，交替执行顺序\nArray.includes: ${timings.before.map((x) => x.toFixed(3)).join(', ')} ms\nSet.has（含建表）: ${timings.after.map((x) => x.toFixed(3)).join(', ')} ms\n结果一致性：${before()} === ${after()}，PASS\n只测试当前固定输入，未测内存，不是普遍性能结论。\n`,
);
await writeFile(
  path.join(root, 'change.diff'),
  '- queries.filter(x => values.includes(x)).length\n+ const index = new Set(values);\n+ queries.filter(x => index.has(x)).length\n\nSet 建表时间已计入优化后耗时；结果数量已断言一致。\n',
);
await writeFile(
  path.join(root, 'limits.txt'),
  '本例真实执行了本机 Node.js 基准测试。\n报告视频是结果文件回放，不是终端现场录屏。\n仅证明固定输入下的观测；CPU、JIT 和系统负载会影响耗时。\n未测试内存占用，不声称该写法对所有输入更好。\n重新运行 benchmark.mjs 可得到你本机的新结果。\n',
);
console.log('Wrote measured report inputs to', root);
