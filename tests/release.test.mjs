import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, cp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { inspectConfig, verifyPack, rootSnippet } from '../dist/release.js';
test('config validation names the invalid field without launching a browser', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'demopack-config-'));
  const file = path.join(dir, 'demo.json');
  await writeFile(
    file,
    JSON.stringify({
      title: 'Example',
      url: 'index.html',
      steps: [{ action: 'click', caption: 'Click' }],
    }),
  );
  await assert.rejects(inspectConfig(file), /steps\.0\.selector/);
});
test('verifier detects missing files and altered bytes', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'demopack-integrity-'));
  await cp('docs/showcase', dir, { recursive: true });
  assert.equal((await verifyPack(dir)).status, 'verified');
  await writeFile(path.join(dir, 'cover.jpg'), 'tampered');
  await assert.rejects(verifyPack(dir), /cover\.jpg/);
});
test('verifier rejects manifest traversal before reading referenced paths', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'demopack-paths-'));
  const manifest = JSON.parse(await readFile('docs/showcase/manifest.json', 'utf8'));
  manifest.files[0].path = '../secret';
  await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
  await assert.rejects(verifyPack(dir), /Unsafe asset path/);
});
test('root snippet prefixes all local image and download links', async () => {
  const snippet = await rootSnippet('docs/showcase', 'docs/my demo');
  assert.match(snippet, /\]\(docs\/my%20demo\/demo.gif\)/);
  assert.match(snippet, /\]\(docs\/my%20demo\/screenshots\/step-01.jpg\)/);
  await assert.rejects(rootSnippet('docs/showcase', 'https://host'), /relative/);
});
test('verifier rejects incomplete four-deliverable claims', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'demopack-four-'));
  await cp('docs/showcase', dir, { recursive: true });
  const file = path.join(dir, 'manifest.json');
  const manifest = JSON.parse(await readFile(file, 'utf8'));
  manifest.deliverables = { version: 1, files: ['short.mp4'], cards: [], clips: [] };
  await writeFile(file, JSON.stringify(manifest));
  await assert.rejects(verifyPack(dir), /manifest|deliverable|short/i);
});
