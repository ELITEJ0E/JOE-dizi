import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundled = await build({
  entryPoints: ['src/music/diziTheory.ts'], platform: 'node', format: 'esm', bundle: true, write: false,
});
const url = `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`;
const { findFingering, getFingeringsFor, getJianpuForMidi, midiToPitchName } = await import(url);

test('out-of-range F#7 does not get mislabelled with D7 Jianpu 5', () => {
  assert.equal(findFingering('F#7', 'G', 'tongyin_5'), null);
  assert.equal(findFingering('D7', 'G', 'tongyin_5')?.jianpuDegree, '5');
});

test('Jianpu changes with fingering system and preserves correct octave dots', () => {
  assert.deepEqual(getJianpuForMidi(74, 'G', 'tongyin_5'), { jianpu: '5', octaveDot: -1 });
  assert.deepEqual(getJianpuForMidi(74, 'G', 'tongyin_1'), { jianpu: '1', octaveDot: 0 });
  assert.deepEqual(getJianpuForMidi(84, 'G', 'tongyin_2'), { jianpu: '1', octaveDot: 0 });
  assert.deepEqual(getJianpuForMidi(79, 'G', 'tongyin_2'), { jianpu: '5', octaveDot: -1 });
  assert.deepEqual(getJianpuForMidi(78, 'G', 'tongyin_5'), { jianpu: '7', octaveDot: -1 });
  assert.deepEqual(getJianpuForMidi(80, 'G', 'tongyin_5'), { jianpu: '#1', octaveDot: 0 });
});

test('Bb dizi uses flat note names and enharmonic input can match exact MIDI pitch', () => {
  assert.equal(midiToPitchName(70, 'Bb'), 'Bb4');
  assert.ok(getFingeringsFor('Bb', 'tongyin_5').some(note => note.pitch === 'Bb4'));
  assert.equal(findFingering('A#4', 'Bb', 'tongyin_5')?.pitch, 'Bb4');
});
