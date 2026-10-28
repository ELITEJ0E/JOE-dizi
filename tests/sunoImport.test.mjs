import test from 'node:test';
import assert from 'node:assert/strict';
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

test('imports direct Suno MP3 when same-origin API is missing', async () => {
  const originalFetch = globalThis.fetch;
  const requested = [];
  try {
    globalThis.fetch = async url => {
      requested.push(url);
      if (url.startsWith('/api/')) return new Response('<html>SPA fallback</html>', { status: 200 });
      return new Response(new Uint8Array(Buffer.from('ID3\0\0\0\0\0\0\0\0\0')), { status: 200, headers: { 'Content-Type': 'audio/mpeg' } });
    };
    const file = await fetchSunoAudio(clipId, 'Lantern Lights');
    assert.equal(file?.name, 'Lantern Lights.mp3');
    assert.equal(file?.type, 'audio/mpeg');
    assert.equal(requested.length, 2);
    assert.equal(requested[1], `https://cdn1.suno.ai/${clipId}.mp3`);
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
