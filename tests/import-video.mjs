import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, cp } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { prepareStory } from '../dist/imports.js';
import { serve } from '../dist/server.js';
const root = path.resolve('test-results', `import-video-${Date.now()}`);
await mkdir(root, { recursive: true });
await cp('examples/media', path.join(root, 'input'), { recursive: true });
const s = JSON.parse(await readFile(path.join(root, 'input/story.json')));
s.chapters = [{ ...s.chapters[1], startSeconds: 1, seconds: 3 }];
await writeFile(path.join(root, 'input/story.json'), JSON.stringify(s));
await prepareStory(path.join(root, 'input/story.json'), 'media', path.join(root, 'page'));
const server = await serve(path.join(root, 'page'));
const browser = await chromium.launch();
try {
  const p = await browser.newPage();
  await p.goto(server.url + '/chapter-1.html');
  await p.locator('body[data-ready="yes"]').waitFor();
  await p.waitForTimeout(3900);
  const state = await p
    .locator('video')
    .evaluate((v) => ({ time: v.currentTime, paused: v.paused }));
  assert.equal(state.paused, true);
  assert.ok(Math.abs(state.time - 4) < 0.1);
  console.log('PASS imported video stops at the selected end', state);
} finally {
  await browser.close();
  await server.close();
}
