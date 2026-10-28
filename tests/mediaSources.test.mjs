import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMediaSource } from '../src/utils/mediaSources.ts';

test('normalizes supported YouTube watch, short, and share links', () => {
  for (const url of [
    'https://www.youtube.com/watch?v=aqz-KE-bpKQ&t=10',
    'https://youtu.be/aqz-KE-bpKQ',
    'https://m.youtube.com/shorts/aqz-KE-bpKQ',
  ]) {
    assert.deepEqual(parseMediaSource(url), {
      kind: 'youtube', id: 'aqz-KE-bpKQ', url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    });
  }
});

test('normalizes Suno song URLs', () => {
  const id = '123e4567-e89b-42d3-a456-426614174000';
  assert.deepEqual(parseMediaSource(`https://suno.com/song/${id}?share=1`), {
    kind: 'suno', id, url: `https://suno.com/song/${id}`,
  });
});

test('rejects unsupported domains, malformed IDs and non-web URLs', () => {
  for (const url of [
    'https://notyoutube.com/watch?v=aqz-KE-bpKQ',
    'https://suno.com/song/not-a-song-id',
    'javascript:alert(1)',
    'https://www.youtube.com/watch?v=too-short',
    'not a URL',
  ]) assert.equal(parseMediaSource(url), null);
});
