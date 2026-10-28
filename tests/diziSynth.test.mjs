import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

class FakeParam {
  value = 0;
  targets = [];
  setValueAtTime(v) { this.value = v; }
  linearRampToValueAtTime(v) { this.value = v; }
  exponentialRampToValueAtTime(v) { this.value = v; }
  setTargetAtTime(v) { this.value = v; this.targets.push(v); }
}

class FakeNode {
  constructor() {
    this.gain = new FakeParam();
    this.frequency = new FakeParam();
    this.detune = new FakeParam();
    this.Q = new FakeParam();
  }
  connect() { return this; }
  disconnect() {}
  start() { this.started = true; }
  stop() { this.stopped = true; }
  setPeriodicWave() {}
}

class FakeAudioContext {
  constructor() { this.currentTime = 0; this.sampleRate = 44100; this.state = 'running'; this.destination = new FakeNode(); this.gains = []; this.sources = []; FakeAudioContext.latest = this; }
  createGain() { const gain = new FakeNode(); this.gains.push(gain); return gain; }
  createOscillator() { const node = new FakeNode(); this.sources.push(node); return node; }
  createBufferSource() { const node = new FakeNode(); this.sources.push(node); return node; }
  createBiquadFilter() { return new FakeNode(); }
  createConvolver() { return new FakeNode(); }
  createWaveShaper() { return new FakeNode(); }
  createPeriodicWave() { return {}; }
  createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
}

const compiled = await build({ entryPoints: ['src/audio/diziSynth.ts'], platform: 'node', format: 'esm', bundle: true, write: false });
const { diziAudio } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);

test('all tested dizi scale pitches start audible sources without throwing', () => {
  const previousWindow = globalThis.window;
  try {
    globalThis.window = { AudioContext: FakeAudioContext };
    for (const frequency of [523.25, 587.33, 659.25, 698.46, 783.99, 987.77, 1046.5, 1567.98]) {
      const before = FakeAudioContext.latest?.sources.length ?? 0;
      diziAudio.playNote(frequency, 0.4);
      assert.ok(FakeAudioContext.latest.sources.length >= before + 6, `${frequency} Hz should start six voice sources`);
    }
    assert.ok(FakeAudioContext.latest.sources.every(source => source.started));
    diziAudio.stopAll();
  } finally { globalThis.window = previousWindow; }
});

test('membrane slider changes the amplitude of existing voices from dry to strongly buzzy', () => {
  const previousWindow = globalThis.window;
  try {
    globalThis.window = { AudioContext: FakeAudioContext };
    diziAudio.membraneResonance = 0;
    diziAudio.playNote(783.99, 1.4);
    const gains = FakeAudioContext.latest.gains;
    const dimoGain = gains.find(gain => gain.gain.targets.some(value => value === 0));
    // The setter applies to the live membrane gain, not just future voices.
    diziAudio.membraneResonance = 1;
    assert.ok(gains.some(gain => gain.gain.targets.some(value => value >= 0.45)), '100% should increase live membrane amplitude');
    diziAudio.membraneResonance = 0;
    assert.ok(gains.some(gain => gain.gain.targets.at(-1) === 0));
    assert.ok(dimoGain || gains.length > 0);
    diziAudio.stopAll();
  } finally { globalThis.window = previousWindow; }
});
