import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const compiled = await build({ entryPoints: ['src/utils/scoreExport.ts'], platform: 'node', format: 'esm', bundle: true, write: false });
const { groupScoreMeasures, formatJianpuText } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);

const notes = [
  { id: 'a', measureNumber: 1, jianpu: '1', octaveDot: 0 },
  { id: 'b', measureNumber: 1, jianpu: '3', octaveDot: 1 },
  { id: 'c', measureNumber: 1, jianpu: '4', octaveDot: 0 },
  { id: 'd', measureNumber: 2, jianpu: '5', octaveDot: -1, isDotted: true },
  { id: 'e', measureNumber: 4, jianpu: '#4', octaveDot: 0 },
];

test('Jianpu export respects actual bars, fast ornaments, and octave marks', () => {
  assert.deepEqual(groupScoreMeasures(notes).map(m => [m.number, m.notes.length]), [[1, 3], [2, 1], [4, 1]]);
  const text = formatJianpuText({ titleEn: 'Lantern', musicalKey: '1 = G', timeSignature: '4/4', bpm: 137, diziKey: 'G', notes });
  assert.match(text, /Lantern/);
  assert.match(text, /\| 1 3̇ 4 \| 5̣· \| #4 \|/);
  assert.match(text, /♩=137/);
});
