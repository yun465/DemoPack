import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSerialQueue } from '../dist/serial.js';
test('navigation waits for an in-flight capture and errors do not poison the queue', async () => {
  const exclusive = createSerialQueue();
  const events = [];
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const capture = exclusive(async () => {
    events.push('capture start');
    await gate;
    events.push('capture end');
  });
  const navigation = exclusive(async () => {
    events.push('navigate');
    throw new Error('HTTP failure');
  });
  const rejected = assert.rejects(navigation, /HTTP failure/);
  await Promise.resolve();
  assert.deepEqual(events, ['capture start']);
  release();
  await capture;
  await rejected;
  assert.equal(await exclusive(async () => 'next capture'), 'next capture');
  assert.deepEqual(events, ['capture start', 'capture end', 'navigate']);
});
