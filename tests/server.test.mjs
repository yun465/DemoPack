import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { serve } from '../dist/server.js';
test('preview supports HEAD, suffix ranges, invalid ranges and method rejection', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'demopack-http-'));
  await writeFile(path.join(dir, 'demo.mp4'), '0123456789');
  const server = await serve(dir);
  try {
    const head = await fetch(server.url + '/demo.mp4', { method: 'HEAD' });
    assert.equal(head.headers.get('content-length'), '10');
    assert.equal(await head.text(), '');
    const suffix = await fetch(server.url + '/demo.mp4', { headers: { Range: 'bytes=-3' } });
    assert.equal(suffix.status, 206);
    assert.equal(await suffix.text(), '789');
    const invalid = await fetch(server.url + '/demo.mp4', { headers: { Range: 'bytes=20-' } });
    assert.equal(invalid.status, 416);
    assert.equal(invalid.headers.get('content-range'), 'bytes */10');
    assert.equal((await fetch(server.url + '/demo.mp4', { method: 'POST' })).status, 405);
  } finally {
    await server.close();
  }
});
