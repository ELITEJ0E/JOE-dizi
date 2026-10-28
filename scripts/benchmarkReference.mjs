// Local research utility: run with a 12 kHz mono raw f32le excerpt generated
// from your own audio file, e.g. ffmpeg -i input.wav -ar 12000 -ac 1 -f f32le output.f32.
// Never commit source music to the repo.
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const path = process.argv[2];
const start = Number(process.argv[3] || 0);
if (!path) throw new Error('Usage: node scripts/benchmarkReference.mjs excerpt.f32 [source-start-seconds]');
const bundled = await build({ entryPoints: ['src/audio/pitchDetector.ts'], platform: 'node', format: 'esm', bundle: true, write: false });
const url = `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`;
const { pitchDetector } = await import(url);
const bytes = readFileSync(path);
const samples = new Float32Array(bytes.byteLength / 4);
for (let i = 0; i < samples.length; i++) samples[i] = bytes.readFloatLE(i * 4);
const t = performance.now();
let tempo;
const notes = pitchDetector.analyzeMelodyFromSamples(samples, 12000, undefined, { minMidi: 74, maxMidi: 98 }, bpm => { tempo = bpm; });
console.log(`Analyzed ${(samples.length / 12000).toFixed(2)}s in ${((performance.now() - t) / 1000).toFixed(2)}s. Detected ${notes.length} note events. Estimated ${tempo || 'unknown'} BPM.`);
console.log('Ambiguous spectral events', notes.filter(note => note.confidence !== undefined && note.confidence < 0.35).length, 'out of', notes.length);
console.log('Length ms: min/median/max', notes.length && [
  Math.round(Math.min(...notes.map(note => note.duration)) * 1000),
  Math.round(notes.map(note => note.duration).sort((a, b) => a - b)[Math.floor(notes.length / 2)] * 1000),
  Math.round(Math.max(...notes.map(note => note.duration)) * 1000),
]);
console.log(notes.slice(0, 100).map(n => `${(start+n.startTime).toFixed(2)}:${n.pitch}[${Math.round(n.duration*1000)}ms]`).join(' '));
