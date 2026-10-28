import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundled = await build({
  entryPoints: ['src/utils/youtubeImport.ts'],
  platform: 'node', format: 'esm', bundle: true, write: false,
  define: { 'import.meta.env': '{}' },
});
const encoded = Buffer.from(bundled.outputFiles[0].text).toString('base64');
const { fetchYouTubeAudio } = await import(`data:text/javascript;base64,${encoded}`);
const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

test('extracts genuine audio from the same URL endpoint and keeps video metadata', async () => {
  const originalFetch = globalThis.fetch;
  const requested = [];
  try {
    globalThis.fetch = async (url, init) => {
      requested.push({ url, init });
      return new Response(new Uint8Array(Buffer.from('ID3\0\0\0\0\0\0\0\0\0')), {
        status: 200,
        headers: { 'X-Video-Title': encodeURIComponent('A Test Tune'), 'X-Video-Artist': encodeURIComponent('Test Performer') },
      });
    };
    const result = await fetchYouTubeAudio(videoUrl);
    assert.equal(result?.file.name, 'A Test Tune.mp3');
    assert.equal(result?.file.type, 'audio/mpeg');
    assert.equal(result?.artist, 'Test Performer');
    assert.equal(requested[0].url, '/api/youtube/extract');
    assert.deepEqual(JSON.parse(requested[0].init.body), { url: videoUrl });
    assert.equal(requested.length, 1);
  } finally { globalThis.fetch = originalFetch; }
});

test('falls back to the reference extractor when the same-origin route is unavailable', async () => {
  const originalFetch = globalThis.fetch;
  const requested = [];
  try {
    globalThis.fetch = async url => {
      requested.push(url);
      return String(url).startsWith('/api/')
        ? new Response('<html>SPA fallback</html>', { status: 200 })
        : new Response(new Uint8Array(Buffer.from('ID3\0\0\0\0\0\0\0\0\0')), { status: 200 });
    };
    assert.equal((await fetchYouTubeAudio(videoUrl))?.file.type, 'audio/mpeg');
    assert.equal(requested[1], 'https://chord-extractor-1.onrender.com/extract');
  } finally { globalThis.fetch = originalFetch; }
});

test('rejects HTML and JSON pretending to be audio', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('<html>No audio</html>', { status: 200 });
    assert.equal(await fetchYouTubeAudio(videoUrl), null);
  } finally { globalThis.fetch = originalFetch; }
});
