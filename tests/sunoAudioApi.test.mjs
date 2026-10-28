import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['api/suno-audio.ts'], platform: 'node', format: 'esm', bundle: true, write: false });
const { default: handler } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const clipId = '123e4567-e89b-42d3-a456-426614174001';

function responseCapture() {
  const state = { status: 200, headers: {}, body: undefined };
  const response = {
    status(code) { state.status = code; return this; },
    setHeader(name, value) { state.headers[name.toLowerCase()] = value; },
    json(data) { state.body = data; },
    end(data) { state.body = data; },
  };
  return { state, response };
}

test('rejects invalid audio IDs before requesting any external resource', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = () => { throw new Error('Must not perform external fetch'); };
    const { state, response } = responseCapture();
    await handler({ method: 'GET', query: { clipId: 'bad' } }, response);
    assert.equal(state.status, 400);
  } finally { globalThis.fetch = originalFetch; }
});

test('server decrypts provider-granted media and supports byte-range playback', async () => {
  const originalFetch = globalThis.fetch;
  try {
    const subtle = webcrypto.subtle;
    const audio = new Uint8Array(Buffer.from('ID3\0\0\0\0\0\0\0\0\0stream data'));
    const glt = 'server-provided-test-rights';
    const hash = await subtle.digest('SHA-256', new TextEncoder().encode(glt));
    const wrapKey = await subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt']);
    const contentKeyBytes = webcrypto.getRandomValues(new Uint8Array(32));
    const counter = webcrypto.getRandomValues(new Uint8Array(16));
    const streamKey = await subtle.importKey('raw', contentKeyBytes, 'AES-CTR', false, ['encrypt']);
    const encrypted = new Uint8Array(await subtle.encrypt({ name: 'AES-CTR', counter, length: 128 }, streamKey, audio));
    const wrap = async raw => {
      const iv = webcrypto.getRandomValues(new Uint8Array(12));
      const cipher = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(clipId) }, wrapKey, raw));
      return Buffer.concat([Buffer.from(iv), Buffer.from(cipher)]).toString('base64');
    };
    const rights = { glt, key: await wrap(contentKeyBytes), iv: await wrap(counter) };
    const requested = [];
    globalThis.fetch = async url => {
      requested.push(url);
      if (String(url).includes('/api/mango/rights')) return Response.json(rights);
      if (String(url).includes('cloudfront.net')) return new Response(encrypted, { status: 200 });
      return new Response('not found', { status: 404 });
    };
    const complete = responseCapture();
    await handler({ method: 'GET', query: { clipId } }, complete.response);
    assert.equal(complete.state.status, 200);
    assert.equal(complete.state.headers['content-type'], 'audio/mpeg');
    assert.deepEqual(complete.state.body, Buffer.from(audio));

    const partial = responseCapture();
    await handler({ method: 'GET', query: { clipId }, headers: { range: 'bytes=0-2' } }, partial.response);
    assert.equal(partial.state.status, 206);
    assert.equal(partial.state.headers['content-range'], `bytes 0-2/${audio.length}`);
    assert.equal(partial.state.body.toString(), 'ID3');
    assert.equal(requested.length, 2, 'second request should be served from memory cache');
  } finally { globalThis.fetch = originalFetch; }
});
