import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { build } from 'esbuild';

const bundled = await build({
  entryPoints: ['src/utils/sunoImport.ts'],
  platform: 'node', format: 'esm', bundle: true, write: false,
  define: { 'import.meta.env': '{}' },
});
const url = `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`;
const { isPlayableAudio, fetchSunoAudio } = await import(url);
const clipId = '123e4567-e89b-42d3-a456-426614174000';

test('recognizes genuine audio signatures and refuses HTML or JSON from broken proxy', () => {
  assert.equal(isPlayableAudio(new Uint8Array(Buffer.from('ID3\0\0\0\0\0\0\0\0\0'))), true);
  assert.equal(isPlayableAudio(new Uint8Array(Buffer.from('<html>wrong endpoint</html>'))), false);
  assert.equal(isPlayableAudio(new Uint8Array(Buffer.from('{"error":"forbidden"}'))), false);
  assert.equal(isPlayableAudio(new Uint8Array(Buffer.from('0000ftypM4A '.replace('0000', '\0\0\0\0')))), true);
});

test('imports audio from the same-origin resolver before trying another source', async () => {
  const originalFetch = globalThis.fetch;
  const requested = [];
  try {
    globalThis.fetch = async url => {
      requested.push(url);
      return new Response(new Uint8Array(Buffer.from('ID3\0\0\0\0\0\0\0\0\0')), { status: 200, headers: { 'Content-Type': 'audio/mpeg' } });
    };
    const file = await fetchSunoAudio(clipId, 'Lantern Lights');
    assert.equal(file?.name, 'Lantern Lights.mp3');
    assert.equal(file?.type, 'audio/mpeg');
    assert.deepEqual(requested, [`/api/suno-audio?clipId=${clipId}`]);
  } finally { globalThis.fetch = originalFetch; }
});

test('falls back to legacy MP3 after proxy and encoded-stream paths are unavailable', async () => {
  const originalFetch = globalThis.fetch;
  const requested = [];
  try {
    globalThis.fetch = async url => {
      requested.push(url);
      if (url === `https://cdn1.suno.ai/${clipId}.mp3`)
        return new Response(new Uint8Array(Buffer.from('ID3\0\0\0\0\0\0\0\0\0')), { status: 200 });
      return new Response('unavailable', { status: 404 });
    };
    const file = await fetchSunoAudio(clipId, 'Older Track');
    assert.equal(file?.name, 'Older Track.mp3');
    assert.equal(requested.at(-1), `https://cdn1.suno.ai/${clipId}.mp3`);
  } finally { globalThis.fetch = originalFetch; }
});

test('decodes a valid provider-granted AES-GCM/AES-CTR audio stream', async () => {
  const originalFetch = globalThis.fetch;
  try {
    const subtle = webcrypto.subtle;
    const glt = 'an-authorized-test-token';
    const hash = await subtle.digest('SHA-256', new TextEncoder().encode(glt));
    const wrapKey = await subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt']);
    const contentKeyBytes = webcrypto.getRandomValues(new Uint8Array(32));
    const counter = webcrypto.getRandomValues(new Uint8Array(16));
    const contentKey = await subtle.importKey('raw', contentKeyBytes, 'AES-CTR', false, ['encrypt']);
    const audio = new Uint8Array(Buffer.from('ID3\0\0\0\0\0\0\0\0\0test audio'));
    const encrypted = await subtle.encrypt({ name: 'AES-CTR', counter, length: 128 }, contentKey, audio);
    const wrap = async raw => {
      const iv = webcrypto.getRandomValues(new Uint8Array(12));
      const cipher = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(clipId) }, wrapKey, raw));
      return Buffer.concat([Buffer.from(iv), Buffer.from(cipher)]).toString('base64');
    };
    const rights = { glt, key: await wrap(contentKeyBytes), iv: await wrap(counter) };
    globalThis.fetch = async url => {
      if (url === '/api/suno-rights?clipId=' + clipId) return Response.json(rights);
      if (String(url).includes('cloudfront.net')) return new Response(encrypted, { status: 200 });
      return new Response('unavailable', { status: 404 });
    };
    const file = await fetchSunoAudio(clipId, 'Authorized Track');
    assert.equal(file?.name, 'Authorized Track.mp3');
    assert.deepEqual(new Uint8Array(await file.arrayBuffer()), audio);
  } finally { globalThis.fetch = originalFetch; }
});

test('does not claim transcription when providers do not supply playable audio', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('{"error":"unavailable"}', { status: 404 });
    assert.equal(await fetchSunoAudio(clipId, 'Unreachable'), null);
    assert.equal(await fetchSunoAudio('invalid-id', 'Unsafe'), null);
  } finally { globalThis.fetch = originalFetch; }
});
