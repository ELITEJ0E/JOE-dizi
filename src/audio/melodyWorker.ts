import { pitchDetector, PitchRange } from './pitchDetector';

type AnalyzeRequest = { samples: Float32Array; sampleRate: number; range?: PitchRange };

self.onmessage = (event: MessageEvent<AnalyzeRequest>) => {
  try {
    const { samples, sampleRate, range } = event.data;
    const notes = pitchDetector.analyzeMelodyFromSamples(samples, sampleRate, percent => {
      self.postMessage({ type: 'progress', percent });
    }, range);
    self.postMessage({ type: 'result', notes });
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Analysis failed.' });
  }
};
