import { pitchDetector, PitchRange } from './pitchDetector';
import { midiToFrequency } from '../music/diziTheory';

export type DetectedMelodyNote = { pitch: string; midi: number; startTime: number; duration: number; confidence?: number };
export interface MelodyAnalysis { notes: DetectedMelodyNote[]; estimatedBpm?: number }

/** Downsample and mix the recording before transferring it to a background worker. */
function makeAnalysisSamples(buffer: AudioBuffer, range?: PitchRange): { samples: Float32Array; sampleRate: number } {
  const targetRate = Math.min(12000, buffer.sampleRate);
  const ratio = buffer.sampleRate / targetRate;
  const samples = new Float32Array(Math.floor(buffer.length / ratio));
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  for (let i = 0; i < samples.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.max(start + 1, Math.min(buffer.length, Math.floor((i + 1) * ratio)));
    let value = 0;
    for (let j = start; j < end; j++) {
      for (const channel of channels) value += channel[j];
    }
    samples[i] = value / ((end - start) * channels.length);
  }
  if (range) {
    // Light high-pass attenuates kick and bass masking the flute fundamental.
    // This is not instrument source separation or a guarantee on full mixes.
    const cutoff = Math.min(380, Math.max(100, midiToFrequency(range.minMidi) * 0.45));
    const alpha = 1 / (1 + 2 * Math.PI * cutoff / targetRate);
    let lastInput = 0;
    let lastOutput = 0;
    for (let i = 0; i < samples.length; i++) {
      const current = samples[i];
      const filtered = alpha * (lastOutput + current - lastInput);
      samples[i] = filtered;
      lastInput = current;
      lastOutput = filtered;
    }
  }
  return { samples, sampleRate: targetRate };
}

export function analyzeMelodyInBackground(buffer: AudioBuffer, onProgress?: (percent: number) => void, range?: PitchRange): Promise<MelodyAnalysis> {
  if (typeof Worker === 'undefined') {
    const { samples, sampleRate } = makeAnalysisSamples(buffer, range);
    let estimatedBpm: number | undefined;
    const notes = pitchDetector.analyzeMelodyFromSamples(samples, sampleRate, onProgress, range, bpm => { estimatedBpm = bpm; });
    return Promise.resolve({ notes, estimatedBpm });
  }
  const { samples, sampleRate } = makeAnalysisSamples(buffer, range);
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./melodyWorker.ts', import.meta.url), { type: 'module' });
    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(new Error('Analysis timed out. Try a shorter or simpler melody.'));
    }, Math.max(120000, Math.min(15 * 60 * 1000, buffer.duration * 1000)));
    const finish = () => {
      window.clearTimeout(timeout);
      worker.terminate();
    };
    worker.onmessage = (event: MessageEvent<{ type: string; percent?: number; notes?: DetectedMelodyNote[]; estimatedBpm?: number; message?: string }>) => {
      if (event.data.type === 'progress') onProgress?.(event.data.percent || 0);
      if (event.data.type === 'result') {
        finish();
        resolve({ notes: event.data.notes || [], estimatedBpm: event.data.estimatedBpm });
      } else if (event.data.type === 'error') {
        finish();
        reject(new Error(event.data.message || 'Pitch analysis failed.'));
      }
    };
    worker.onerror = () => {
      finish();
      reject(new Error('Pitch analysis worker failed.'));
    };
    worker.postMessage({ samples, sampleRate, range }, [samples.buffer]);
  });
}
