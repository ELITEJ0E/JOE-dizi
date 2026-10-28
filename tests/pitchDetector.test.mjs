import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundled = await build({
  entryPoints: ['src/audio/pitchDetector.ts'],
  platform: 'node',
  format: 'esm',
  bundle: true,
  write: false,
});
const url = `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`;
const { pitchDetector } = await import(url);

test('pure sustained notes retain the correct octave', () => {
  const rate = 12000;
  for (const [frequency, expected] of [
    [261.63, 'C4'], [440, 'A4'], [587.33, 'D5'],
    [783.99, 'G5'], [1046.50, 'C6'], [1568, 'G6'],
  ]) {
    const samples = new Float32Array(2048);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = 0.3 * Math.sin(2 * Math.PI * frequency * i / rate);
    }
    const detected = pitchDetector.detectPitchFromBuffer(samples, rate);
    assert.equal(detected?.pitchName, expected, `${frequency} Hz was misidentified`);
  }
});

test('a dizi tone with strong overtones is assigned to its fundamental', () => {
  const rate = 12000;
  const base = 783.99;
  const samples = new Float32Array(2048);
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate;
    samples[i] = 0.10 * Math.sin(2 * Math.PI * base * t) +
      0.22 * Math.sin(2 * Math.PI * base * 2 * t) +
      0.08 * Math.sin(2 * Math.PI * base * 3 * t);
  }
  assert.equal(pitchDetector.detectPitchFromBuffer(samples, rate)?.pitchName, 'G5');
});

test('out-of-range notes are rejected for the selected dizi and silence has no pitch', () => {
  const rate = 12000;
  const range = { minMidi: 74, maxMidi: 98 }; // G dizi: D5-D7
  const high = new Float32Array(2048);
  for (let i = 0; i < high.length; i++) high[i] = 0.3 * Math.sin(2 * Math.PI * 2349 * 1.12 * i / rate);
  assert.equal(pitchDetector.detectPitchFromBuffer(high, rate, range), null);
  assert.equal(pitchDetector.detectPitchFromBuffer(new Float32Array(2048), rate, range), null);
});

test('a three-note flute phrase respects note names and a genuine rest', () => {
  const rate = 12000;
  const samples = new Float32Array(Math.round(2.05 * rate));
  const sections = [
    [0, 0.45, 587.33], [0.45, 0.65, 0], [0.65, 1.15, 783.99],
    [1.15, 1.35, 0], [1.35, 2.05, 880],
  ];
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate;
    const section = sections.find(([start, end]) => t >= start && t < end);
    if (section?.[2]) samples[i] = 0.17 * Math.sin(2 * Math.PI * section[2] * t) + 0.08 * Math.sin(4 * Math.PI * section[2] * t);
  }
  const notes = pitchDetector.analyzeMelodyFromSamples(samples, rate, undefined, { minMidi: 74, maxMidi: 98 });
  assert.deepEqual(notes.map(note => note.pitch), ['D5', 'G5', 'A5']);
  assert.ok(notes[1].startTime >= 0.55 && notes[1].startTime <= 0.8, JSON.stringify(notes));
});
