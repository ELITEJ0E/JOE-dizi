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
