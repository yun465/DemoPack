import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { run } from '../dist/process.js';
import { serve } from '../dist/server.js';
const root = path.resolve('test-results', `cli-${Date.now()}`);
await mkdir(root, { recursive: true });
const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, status: 'passed' });
  } catch (e) {
    results.push({ name, status: 'failed', reason: e.message });
    process.exitCode = 1;
  }
}
await test('validate works without media/browser dependencies', async () => {
  const ffmpeg = process.env.DEMOPACK_FFMPEG;
  process.env.DEMOPACK_FFMPEG = 'nonexistent-ffmpeg';
  try {
    assert.match(
      await run(process.execPath, ['dist/cli.js', 'validate', 'examples/launch/demo.json']),
      /VALID: 7 steps/,
    );
  } finally {
    if (ffmpeg === undefined) delete process.env.DEMOPACK_FFMPEG;
    else process.env.DEMOPACK_FFMPEG = ffmpeg;
  }
});
await test('verify and root README snippet CLI', async () => {
  assert.match(await run(process.execPath, ['dist/cli.js', 'verify', 'docs/showcase']), /verified/);
  assert.match(
    await run(process.execPath, [
      'dist/cli.js',
      'snippet',
      'docs/showcase',
      '--prefix',
      'docs/my demo',
    ]),
    /docs\/my%20demo\/demo.gif/,
  );
});
await test('occupied port has an actionable error', async () => {
  const server = await serve('docs');
  try {
    const port = new URL(server.url).port;
    await assert.rejects(
      run(process.execPath, ['dist/cli.js', 'preview', 'docs', '--port', port]),
      /occupied.*--port 0/,
    );
  } finally {
    await server.close();
  }
});
await test('port zero produces a reachable URL; preview remains alive', async () => {
  const child = spawn(process.execPath, ['dist/cli.js', 'preview', 'docs', '--port', '0'], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    const url = await new Promise((resolve, reject) => {
      let text = '';
      const timer = setTimeout(() => reject(new Error('Preview startup timeout')), 6000);
      child.on('error', (e) => {
        clearTimeout(timer);
        reject(e);
      });
      child.stdout.on('data', (d) => {
        text += d;
        const match = text.match(/http:\/\/127\.0\.0\.1:\d+/);
        if (match) {
          clearTimeout(timer);
          resolve(match[0]);
        }
      });
      child.once('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`Preview exited ${code}`));
      });
    });
    const response = await fetch(url);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /DemoPack/);
    assert.equal(child.exitCode, null);
  } finally {
    child.kill();
    await new Promise((resolve) => child.once('close', resolve));
  }
});
await test('missing preview index and malformed JSON are actionable', async () => {
  await assert.rejects(run(process.execPath, ['dist/cli.js', 'preview', root]), /No index.html/);
  const file = path.join(root, 'broken.json');
  await writeFile(file, '{ broken');
  await assert.rejects(
    run(process.execPath, ['dist/cli.js', 'validate', file]),
    /Cannot read demo JSON/,
  );
});
await writeFile(path.join(root, 'results.json'), JSON.stringify(results, null, 2));
console.log(results);
console.log(root);
