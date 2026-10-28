import { pitchDetector } from './pitchDetector';

export type DetectedMelodyNote = { pitch: string; midi: number; startTime: number; duration: number };

/** Downsample and mix the recording before transferring it to a background worker. */
function makeAnalysisSamples(buffer: AudioBuffer): { samples: Float32Array; sampleRate: number } {
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
  return { samples, sampleRate: targetRate };
}

export function analyzeMelodyInBackground(buffer: AudioBuffer, onProgress?: (percent: number) => void): Promise<DetectedMelodyNote[]> {
  if (typeof Worker === 'undefined') {
    return Promise.resolve(pitchDetector.analyzeMelodyFromAudioBuffer(buffer));
  }
  const { samples, sampleRate } = makeAnalysisSamples(buffer);
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./melodyWorker.ts', import.meta.url), { type: 'module' });
    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(new Error('Analysis timed out. Try a shorter or simpler melody.'));
    }, 120000);
    const finish = () => {
      window.clearTimeout(timeout);
      worker.terminate();
    };
    worker.onmessage = (event: MessageEvent<{ type: string; percent?: number; notes?: DetectedMelodyNote[]; message?: string }>) => {
      if (event.data.type === 'progress') onProgress?.(event.data.percent || 0);
      if (event.data.type === 'result') {
        finish();
        resolve(event.data.notes || []);
      } else if (event.data.type === 'error') {
        finish();
        reject(new Error(event.data.message || 'Pitch analysis failed.'));
      }
    };
    worker.onerror = () => {
      finish();
      reject(new Error('Pitch analysis worker failed.'));
    };
    worker.postMessage({ samples, sampleRate }, [samples.buffer]);
  });
}
