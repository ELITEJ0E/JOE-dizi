import { midiToFrequency, midiToPitchName } from '../music/diziTheory';
import type { PitchRange } from './pitchDetector';

export interface MelodyEvent {
  pitch: string;
  midi: number;
  startTime: number;
  duration: number;
  confidence?: number;
}

const FFT_SIZE = 2048;
const harmonicWeights = [1, 0.555, 0.393, 0.308, 0.254, 0.216];

// This is a lightweight, browser-native predominant-PITCH tracker, not a
// trained dizi source-separation model. It is a best-effort fallback for mixes
// where YIN quite correctly refuses to assign an isolated fundamental.
export function analyzeSpectralMelody(
  samples: Float32Array,
  sampleRate: number,
  range: PitchRange,
  onProgress?: (percent: number) => void,
  onTempo?: (bpm: number) => void,
): MelodyEvent[] {
  if (samples.length < FFT_SIZE || sampleRate <= 0) return [];
  const hop = Math.max(64, Math.round(sampleRate * 0.01));
  const frames = Math.floor((samples.length - FFT_SIZE) / hop) + 1;
  const noteCount = range.maxMidi - range.minMidi + 1;
  if (noteCount < 1 || noteCount > 72) return [];

  const re = new Float32Array(FFT_SIZE);
  const im = new Float32Array(FFT_SIZE);
  const magnitude = new Float32Array(FFT_SIZE / 2 + 1);
  const contrast = new Float32Array(magnitude.length);
  const previous = new Float32Array(magnitude.length);
  const window = new Float32Array(FFT_SIZE);
  const cos = new Float32Array(FFT_SIZE / 2);
  const sin = new Float32Array(FFT_SIZE / 2);
  const scores = new Float32Array(frames * noteCount);
  const rmsByFrame = new Float32Array(frames);
  const onsetFlux = new Float32Array(frames);
  const bestByFrame = new Float32Array(frames);
  const confidenceByFrame = new Float32Array(frames);

  for (let i = 0; i < FFT_SIZE; i++) window[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (FFT_SIZE - 1));
  for (let i = 0; i < cos.length; i++) {
    cos[i] = Math.cos(-2 * Math.PI * i / FFT_SIZE);
    sin[i] = Math.sin(-2 * Math.PI * i / FFT_SIZE);
  }

  // Precompute nearby bin indices for each flute pitch and its upper partials.
  const harmonics = Array.from({ length: noteCount }, (_, index) => {
    const f0 = midiToFrequency(range.minMidi + index);
    return harmonicWeights.map((weight, harmonic) => {
      const center = Math.round((harmonic + 1) * f0 * FFT_SIZE / sampleRate);
      if (center >= magnitude.length - 4) return { low: 0, high: -1, weight: 0 };
      const radius = 2 + Math.floor(harmonic / 3);
      return { low: Math.max(1, center - radius), high: Math.min(magnitude.length - 1, center + radius), weight };
    });
  });

  let loudestRms = 0;
  for (let frame = 0; frame < frames; frame++) {
    const offset = frame * hop;
    let power = 0;
    for (let i = 0; i < FFT_SIZE; i++) {
      const value = samples[offset + i];
      power += value * value;
      re[i] = value * window[i];
      im[i] = 0;
    }
    const rms = Math.sqrt(power / FFT_SIZE);
    rmsByFrame[frame] = rms;
    loudestRms = Math.max(loudestRms, rms);

    // In-place radix-2 FFT. The worker keeps the UI responsive on mobile.
    for (let i = 1, j = 0; i < FFT_SIZE; i++) {
      let bit = FFT_SIZE >> 1;
      while (j & bit) { j ^= bit; bit >>= 1; }
      j ^= bit;
      if (i < j) {
        const tmpRe = re[i]; re[i] = re[j]; re[j] = tmpRe;
        const tmpIm = im[i]; im[i] = im[j]; im[j] = tmpIm;
      }
    }
    for (let length = 2; length <= FFT_SIZE; length <<= 1) {
      const half = length >> 1;
      const stride = FFT_SIZE / length;
      for (let base = 0; base < FFT_SIZE; base += length) {
        for (let i = 0; i < half; i++) {
          const j = i * stride;
          const c = cos[j], s = sin[j];
          const right = base + i + half;
          const real = c * re[right] - s * im[right];
          const imaginary = s * re[right] + c * im[right];
          const left = base + i;
          re[right] = re[left] - real;
          im[right] = im[left] - imaginary;
          re[left] += real;
          im[left] += imaginary;
        }
      }
    }

    let flux = 0;
    for (let bin = 0; bin < magnitude.length; bin++) {
      const amp = 2 * Math.hypot(re[bin], im[bin]) / FFT_SIZE;
      magnitude[bin] = amp;
      if (frame > 0 && bin > 35 && bin < 700) flux += Math.max(0, amp - previous[bin]);
      previous[bin] = amp;
    }
    onsetFlux[frame] = flux;

    // Spectral whitening reduces broad drum/noise energy relative to narrow
    // harmonic ridges. This must be computed for EVERY frame, including rests.
    let running = 0;
    for (let bin = 0; bin <= 9; bin++) running += magnitude[bin];
    let peakContrast = 0;
    for (let bin = 0; bin < magnitude.length; bin++) {
      const count = Math.min(magnitude.length - 1, bin + 9) - Math.max(0, bin - 9) + 1;
      const background = Math.max(0, running / count);
      const detail = Math.max(0, magnitude[bin] - background * 0.85);
      contrast[bin] = detail;
      peakContrast = Math.max(peakContrast, detail);
      if (bin + 10 < magnitude.length) running += magnitude[bin + 10];
      if (bin >= 9) running -= magnitude[bin - 9];
    }

    let best = 0, second = 0;
    for (let noteIndex = 0; noteIndex < noteCount; noteIndex++) {
      let salience = 0;
      let fundamental = 0;
      for (let harmonic = 0; harmonic < harmonicWeights.length; harmonic++) {
        const { low, high, weight } = harmonics[noteIndex][harmonic];
        if (!weight) continue;
        let peak = 0;
        for (let bin = low; bin <= high; bin++) peak = Math.max(peak, contrast[bin]);
        if (harmonic === 0) fundamental = peak;
        salience += Math.sqrt(peak) * weight;
      }
      const relativeFundamental = peakContrast > 1e-8 ? Math.min(1, 3 * Math.sqrt(fundamental / peakContrast)) : 0;
      salience *= 0.25 + 0.75 * relativeFundamental;
      scores[frame * noteCount + noteIndex] = salience;
      if (salience > best) { second = best; best = salience; }
      else if (salience > second) second = salience;
    }
    bestByFrame[frame] = best;
    confidenceByFrame[frame] = best / Math.max(1e-8, second);
    if (frame % 320 === 0) onProgress?.(Math.round(frame / frames * 80));
  }

  // Viterbi tracks a coherent melodic contour, while spectral onset strength
  // reduces the penalty for genuine rapid jumps.
  const sortedFlux = Array.from(onsetFlux).sort((a, b) => a - b);
  const onsetScale = Math.max(1e-8, sortedFlux[Math.floor(sortedFlux.length * 0.9)]);
  // Estimate tempo from pulse autocorrelation, so uploaded recordings do not
  // inherit an unrelated preset song's beats-per-minute value.
  if (frames > 180) {
    const floor = sortedFlux[Math.floor(sortedFlux.length * 0.55)];
    const pulse = onsetFlux.map(value => Math.max(0, value - floor));
    const minLag = Math.max(2, Math.ceil(sampleRate * 60 / (190 * hop)));
    const maxLag = Math.min(frames - 1, Math.floor(sampleRate * 60 / (70 * hop)));
    let bestLag = 0;
    let bestCorrelation = 0;
    const correlations = new Float64Array(maxLag + 1);
    for (let lag = minLag; lag <= maxLag; lag++) {
      let correlation = 0;
      for (let i = lag; i < frames; i++) correlation += pulse[i] * pulse[i - lag];
      correlation /= frames - lag;
      correlations[lag] = correlation;
      if (correlation > bestCorrelation) { bestCorrelation = correlation; bestLag = lag; }
    }
    if (bestLag > 0) {
      let refinedLag = bestLag;
      if (bestLag > minLag && bestLag < maxLag) {
        const left = correlations[bestLag - 1], center = correlations[bestLag], right = correlations[bestLag + 1];
        const denominator = left - 2 * center + right;
        if (Math.abs(denominator) > 1e-12) refinedLag += Math.max(-0.5, Math.min(0.5, (left - right) / (2 * denominator)));
      }
      onTempo?.(Math.round(60 * sampleRate / (refinedLag * hop)));
    }
  }
  const back = new Uint8Array(frames * noteCount);
  let previousCost = new Float64Array(noteCount);
  let currentCost = new Float64Array(noteCount);
  for (let i = 0; i < noteCount; i++) previousCost[i] = Math.log(scores[i] + 1e-5);
  for (let frame = 1; frame < frames; frame++) {
    const onsetStrength = Math.min(1, onsetFlux[frame] / onsetScale);
    const jumpPenalty = 0.45 - 0.32 * onsetStrength;
    for (let current = 0; current < noteCount; current++) {
      let bestPrevious = 0;
      let bestCost = -Infinity;
      for (let prior = 0; prior < noteCount; prior++) {
        const cost = previousCost[prior] - Math.abs(current - prior) * jumpPenalty;
        if (cost > bestCost) { bestCost = cost; bestPrevious = prior; }
      }
      currentCost[current] = Math.log(scores[frame * noteCount + current] + 1e-5) + bestCost;
      back[frame * noteCount + current] = bestPrevious;
    }
    [previousCost, currentCost] = [currentCost, previousCost];
    if (frame % 1000 === 0) onProgress?.(80 + Math.round(frame / frames * 15));
  }

  const path = new Int16Array(frames);
  let last = 0;
  for (let i = 1; i < noteCount; i++) if (previousCost[i] > previousCost[last]) last = i;
  path[frames - 1] = last;
  for (let frame = frames - 1; frame > 0; frame--) {
    path[frame - 1] = back[frame * noteCount + path[frame]];
  }

  const events: MelodyEvent[] = [];
  const minRms = Math.max(0.003, loudestRms * 0.06);
  const sortedScores = Array.from(bestByFrame).sort((a, b) => a - b);
  const salienceFloor = sortedScores[Math.floor(sortedScores.length * 0.35)] * 0.44;
  let start = -1;
  let active = -1;
  let validCount = 0;
  let claritySum = 0;
  const emit = (end: number) => {
    if (start < 0 || active < 0 || validCount < 3) return;
    const duration = (end - start) * hop / sampleRate;
    if (duration < 0.03) return;
    const midi = range.minMidi + active;
    const time = Math.max(0, (start * hop + FFT_SIZE / 2) / sampleRate - 0.03);
    // Candidate separation is an ambiguity indicator, NOT a probability that
    // the source is a dizi in a polyphonic mix.
    const confidence = Math.min(1, Math.max(0, claritySum / Math.max(1, validCount) / 0.7));
    events.push({ pitch: midiToPitchName(midi), midi, startTime: time, duration, confidence });
  };
  for (let frame = 0; frame <= frames; frame++) {
    const chosen = frame < frames && rmsByFrame[frame] >= minRms && bestByFrame[frame] >= salienceFloor
      ? path[frame] : -1;
    if (chosen !== active) {
      emit(frame);
      start = chosen < 0 ? -1 : frame;
      active = chosen;
      validCount = 0;
      claritySum = 0;
    }
    if (chosen >= 0) {
      validCount++;
      claritySum += Math.max(0, confidenceByFrame[frame] - 1);
    }
  }
  onProgress?.(100);
  return events;
}
