import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundled = await build({
  entryPoints: ['src/utils/songStorage.ts'],
  platform: 'node', format: 'esm', bundle: true, write: false,
});
const url = `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`;
const { readUserSongs, saveUserSong, rememberCurrentSong, restoreCurrentSong } = await import(url);

test('song scores and source links persist, while expired blob URLs do not', () => {
  const memory = new Map();
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value) };
  try {
    saveUserSong({ id: 'suno-123', titleEn: 'Test', source: 'suno', sourceUrl: 'https://suno.com/song/123', audioUrl: 'blob:temporary', notes: [] });
    rememberCurrentSong('suno-123');
    const [saved] = readUserSongs();
    assert.equal(saved.sourceUrl, 'https://suno.com/song/123');
    assert.equal(saved.audioUrl, undefined);
    assert.equal(restoreCurrentSong()?.id, 'suno-123');
  } finally { globalThis.localStorage = previousStorage; }
});
