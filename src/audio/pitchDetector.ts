// Pitch Detection Engine using Autocorrelation / YIN-inspired peak finding
// Works with live microphone or decoded AudioBuffer

import { midiToFrequency, midiToPitchName } from '../music/diziTheory';

export interface PitchRange {
  minMidi: number;
  maxMidi: number;
}

export interface PitchDetectionResult {
  frequency: number;       // in Hz
  midi: number;            // MIDI note
  pitchName: string;       // e.g. "D5"
  cents: number;           // -50 to +50 cents offset
  clarity: number;         // 0 to 1 confidence
  volumeDb: number;        // in dB (-100 to 0)
}

export class PitchDetector {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private buffer: Float32Array<ArrayBuffer> | null = null;
  private isListening = false;

  public async startMicrophone(onPitch: (res: PitchDetectionResult | null) => void): Promise<boolean> {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtx();
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });

      const source = this.audioCtx.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 4096;
      source.connect(this.analyser);

      this.buffer = new Float32Array(this.analyser.fftSize);
      this.isListening = true;

      const detectLoop = () => {
        if (!this.isListening || !this.analyser || !this.audioCtx) return;
        this.analyser.getFloatTimeDomainData(this.buffer!);
        const res = this.detectPitchFromBuffer(this.buffer!, this.audioCtx.sampleRate);
        onPitch(res);
        requestAnimationFrame(detectLoop);
      };

      requestAnimationFrame(detectLoop);
      return true;
    } catch (err) {
      console.error('Failed to open microphone', err);
      return false;
    }
  }

  public stopMicrophone() {
    this.isListening = false;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  // YIN's cumulative mean normalized difference rejects unrelated peaks more
  // reliably than choosing the strongest autocorrelation lag (a common source
  // of octave/harmonic errors with breathy flute tones).
  public detectPitchFromBuffer(buf: Float32Array, sampleRate: number, range?: PitchRange, minRms = 0.008): PitchDetectionResult | null {
    // 1. Calculate RMS volume
    let sumSquares = 0;
    for (let i = 0; i < buf.length; i++) {
      sumSquares += buf[i] * buf[i];
    }
    const rms = Math.sqrt(sumSquares / buf.length);
    const volumeDb = 20 * Math.log10(Math.max(1e-5, rms));

    // Silence gate threshold
    if (!Number.isFinite(rms) || rms < minRms) return null;

    const minFrequency = range ? midiToFrequency(range.minMidi - 0.45) : 180;
    const maxFrequency = range ? midiToFrequency(range.maxMidi + 0.45) : 2600;
    const minPeriod = Math.max(2, Math.floor(sampleRate / maxFrequency));
    const maxPeriod = Math.min(buf.length / 3, Math.ceil(sampleRate / minFrequency));
    if (maxPeriod <= minPeriod + 1) return null;

    const yin = new Float32Array(maxPeriod + 2);
    let runningSum = 0;
    // Use the same comparison length for each lag so late lags don't acquire
    // artificially better scores. Striding by 2 keeps mobile analysis fast.
    const sampleCount = buf.length - maxPeriod - 2;
    for (let tau = 1; tau <= maxPeriod + 1; tau++) {
      let difference = 0;
      for (let i = 0; i < sampleCount; i += 2) {
        const delta = buf[i] - buf[i + tau];
        difference += delta * delta;
      }
      runningSum += difference;
      yin[tau] = runningSum > 0 ? (difference * tau) / runningSum : 1;
    }

    // First credible local valley corresponds to the shortest plausible
    // fundamental period. Noise-only regions lack a deep, stable valley.
    let bestPeriod = -1;
    for (let tau = minPeriod; tau <= maxPeriod; tau++) {
      if (yin[tau] < 0.2 && yin[tau] <= yin[tau - 1] && yin[tau] <= yin[tau + 1]) {
        bestPeriod = tau;
        break;
      }
    }
    if (bestPeriod < 0) {
      let bestScore = 0.14;
      for (let tau = minPeriod; tau <= maxPeriod; tau++) {
        if (yin[tau] < bestScore) {
          bestScore = yin[tau];
          bestPeriod = tau;
        }
      }
    }
    if (bestPeriod < 0) return null;

    const y0 = yin[bestPeriod - 1];
    const y1 = yin[bestPeriod];
    const y2 = yin[bestPeriod + 1];
    const denominator = y0 - 2 * y1 + y2;
    const adjustment = Math.abs(denominator) > 1e-8 ? Math.max(-0.5, Math.min(0.5, (y0 - y2) / (2 * denominator))) : 0;
    const frequency = sampleRate / (bestPeriod + adjustment);
    if (frequency < minFrequency || frequency > maxFrequency) return null;

    const midiFloat = 69 + 12 * Math.log2(frequency / 440);
    const midi = Math.round(midiFloat);
    const cents = Math.round((midiFloat - midi) * 100);
    const pitchName = midiToPitchName(midi);

    return {
      frequency,
      midi,
      pitchName,
      cents,
      clarity: 1 - yin[bestPeriod],
      volumeDb
    };
  }

  // Analyze an entire AudioBuffer and extract segmented melody notes
  public analyzeMelodyFromAudioBuffer(audioBuffer: AudioBuffer, range?: PitchRange): Array<{
    pitch: string;
    midi: number;
    startTime: number;
    duration: number;
  }> {
    return this.analyzeMelodyFromSamples(audioBuffer.getChannelData(0), audioBuffer.sampleRate, undefined, range);
  }

  public analyzeMelodyFromSamples(channelData: Float32Array, sampleRate: number, onProgress?: (percent: number) => void, range?: PitchRange): Array<{
    pitch: string;
    midi: number;
    startTime: number;
    duration: number;
  }> {
    const windowSize = 2048;
    const hopSize = Math.max(256, Math.round(sampleRate * 0.032));
    const detectedPitches: Array<{ time: number; midi: number | null }> = [];

    // Set a recording-relative noise floor. Quiet flute passages shouldn't be
    // discarded by a hard global volume threshold, and silence shouldn't turn
    // into a stream of invented notes.
    let peakRms = 0;
    for (let offset = 0; offset + windowSize <= channelData.length; offset += windowSize) {
      let sum = 0;
      for (let i = offset; i < offset + windowSize; i += 2) sum += channelData[i] * channelData[i];
      peakRms = Math.max(peakRms, Math.sqrt(sum / (windowSize / 2)));
    }
    const noiseFloor = Math.max(0.004, peakRms * 0.1);
    const tempBuf = new Float32Array(windowSize);
    let frameIndex = 0;
    for (let offset = 0; offset + windowSize <= channelData.length; offset += hopSize) {
      if (onProgress && frameIndex % 160 === 0) onProgress(Math.round(offset / channelData.length * 100));
      tempBuf.set(channelData.subarray(offset, offset + windowSize));
      const result = this.detectPitchFromBuffer(tempBuf, sampleRate, range, noiseFloor);
      detectedPitches.push({ time: (offset + windowSize / 4) / sampleRate, midi: result && result.clarity >= 0.82 ? result.midi : null });
      frameIndex++;
    }
    // Majority smoothing eliminates one-off false triggers and octave spikes.
    // Missing/ambiguous frames stay silent: never fill gaps with guessed notes.
    const smoothed = detectedPitches.map((frame, i) => {
      if (frame.midi === null) return null;
      const votes = new Map<number, number>();
      for (let j = Math.max(0, i - 2); j <= Math.min(detectedPitches.length - 1, i + 2); j++) {
        const midi = detectedPitches[j].midi;
        if (midi !== null) votes.set(midi, (votes.get(midi) || 0) + 1);
      }
      let bestMidi: number | null = null;
      let bestVotes = 0;
      for (const [midi, count] of votes) {
        if (count > bestVotes) { bestVotes = count; bestMidi = midi; }
      }
      return bestVotes >= 3 ? bestMidi : null;
    });

    const notes: Array<{ pitch: string; midi: number; startTime: number; duration: number }> = [];
    let segmentStart = -1;
    let segmentMidi: number | null = null;
    const flush = (end: number) => {
      if (segmentMidi === null || segmentStart < 0) return;
      const duration = Math.max(0, end - detectedPitches[segmentStart].time);
      if (duration >= 0.09) notes.push({
        pitch: midiToPitchName(segmentMidi), midi: segmentMidi,
        startTime: Math.max(0, detectedPitches[segmentStart].time), duration
      });
    };
    for (let i = 0; i <= smoothed.length; i++) {
      const midi = smoothed[i] ?? null;
      if (midi === segmentMidi) continue;
      if (segmentMidi !== null) flush(i < detectedPitches.length ? detectedPitches[i].time : channelData.length / sampleRate);
      segmentMidi = midi;
      segmentStart = midi === null ? -1 : i;
    }

    onProgress?.(100);

    return notes;
  }
}

export const pitchDetector = new PitchDetector();
