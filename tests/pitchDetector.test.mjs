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

test('fast notes remain as separate events over bass, chord tones, and drum attacks', () => {
  const rate = 12000;
  const notesHz = [587.33, 659.25, 739.99, 783.99, 880, 783.99, 739.99, 659.25, 587.33, 880, 739.99, 783.99];
  const noteDuration = 0.085;
  const samples = new Float32Array(Math.ceil((notesHz.length * noteDuration + 0.2) * rate));
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate;
    const idx = Math.min(notesHz.length - 1, Math.floor(t / noteDuration));
    const f = notesHz[idx];
    const local = t - idx * noteDuration;
    const env = Math.min(1, local / 0.012) * Math.min(1, Math.max(0, (noteDuration - local) / 0.008));
    const flute = env * (0.21 * Math.sin(2 * Math.PI * f * t) + 0.13 * Math.sin(4 * Math.PI * f * t));
    const backing = 0.12 * Math.sin(2 * Math.PI * 185 * t) + 0.065 * Math.sin(2 * Math.PI * 293.66 * t);
    const percussive = (t % 0.21 < 0.009) ? 0.14 * Math.sin(2 * Math.PI * 3000 * t) : 0;
    samples[i] = flute + backing + percussive;
  }
  const detected = pitchDetector.analyzeMelodyFromSamples(samples, rate, undefined, { minMidi: 74, maxMidi: 98 });
  assert.ok(detected.length >= 7, `Missed most of the fast run: ${JSON.stringify(detected)}`);
  assert.ok(detected.some(note => note.duration < 0.11), 'No short-note event was retained');
  assert.ok(detected.some(note => note.pitch === 'F#5'), 'Flute F#5 should remain detectable');
});
