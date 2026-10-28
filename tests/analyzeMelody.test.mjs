import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundled = await build({
  entryPoints: ['src/audio/analyzeMelody.ts'],
  platform: 'node', format: 'esm', bundle: true, write: false,
});
const url = `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`;
const { analyzeMelodyInBackground } = await import(url);

test('full audio pipeline returns fast note events and optional tempo metadata without Worker', async () => {
  const rate = 48000;
  const length = Math.round(2.3 * rate);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  const melody = [587.33, 659.25, 739.99, 880, 783.99];
  for (let i = 0; i < length; i++) {
    const t = i / rate;
    const freq = melody[Math.floor(t / 0.085) % melody.length];
    const flute = 0.19 * Math.sin(2 * Math.PI * freq * t) + 0.07 * Math.sin(4 * Math.PI * freq * t);
    const bass = 0.12 * Math.sin(2 * Math.PI * 185 * t);
    left[i] = flute + bass;
    right[i] = flute + 0.07 * Math.sin(2 * Math.PI * 293.66 * t);
  }
  const mockBuffer = {
    sampleRate: rate,
    numberOfChannels: 2,
    length,
    duration: length / rate,
    getChannelData(index) { return index === 0 ? left : right; },
  };
  const result = await analyzeMelodyInBackground(mockBuffer, undefined, { minMidi: 74, maxMidi: 98 });
  assert.ok(Array.isArray(result.notes));
  assert.ok(result.notes.length >= 5, `The import pipeline missed fast melody notes: ${JSON.stringify(result.notes)}`);
  assert.ok(result.notes.every(note => note.startTime >= 0 && note.duration >= 0.03));
});
