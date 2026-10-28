// Pitch Detection Engine using Autocorrelation / YIN-inspired peak finding
// Works with live microphone or decoded AudioBuffer

import { frequencyToMidi, midiToPitchName } from '../music/diziTheory';

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
      this.analyser.fftSize = 2048;
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

  // Detect fundamental pitch from time-domain audio samples using normalized autocorrelation
  public detectPitchFromBuffer(buf: Float32Array, sampleRate: number): PitchDetectionResult | null {
    // 1. Calculate RMS volume
    let sumSquares = 0;
    for (let i = 0; i < buf.length; i++) {
      sumSquares += buf[i] * buf[i];
    }
    const rms = Math.sqrt(sumSquares / buf.length);
    const volumeDb = 20 * Math.log10(Math.max(1e-5, rms));

    // Silence gate threshold
    if (rms < 0.015) {
      return null;
    }

    // 2. Autocorrelation
    // Typical dizi range: ~200 Hz (G3) to ~2500 Hz (D7)
    const minPeriod = Math.floor(sampleRate / 2600);
    const maxPeriod = Math.floor(sampleRate / 180);

    let bestPeriod = -1;
    let maxCorrelation = 0;

    for (let period = minPeriod; period <= maxPeriod; period++) {
      let correlation = 0;
      let norm1 = 0;
      let norm2 = 0;
      for (let i = 0; i < buf.length - period; i += 2) {
        correlation += buf[i] * buf[i + period];
        norm1 += buf[i] * buf[i];
        norm2 += buf[i + period] * buf[i + period];
      }
      const norm = Math.sqrt(norm1 * norm2);
      const normalizedCorr = norm > 0 ? correlation / norm : 0;

      if (normalizedCorr > maxCorrelation) {
        maxCorrelation = normalizedCorr;
        bestPeriod = period;
      }
    }

    if (maxCorrelation < 0.72 || bestPeriod <= 0) {
      return null;
    }

    // Parabolic interpolation around peak period for fine cents precision
    let refinedPeriod = bestPeriod;
    if (bestPeriod > minPeriod && bestPeriod < maxPeriod) {
      const p = bestPeriod;
      let cPrev = 0, cNext = 0;
      for (let i = 0; i < buf.length - p; i += 2) {
        cPrev += buf[i] * buf[i + (p - 1)];
        cNext += buf[i] * buf[i + (p + 1)];
      }
      const denom = (2 * maxCorrelation - cPrev - cNext);
      if (denom !== 0) {
        refinedPeriod = bestPeriod + (cPrev - cNext) / (2 * denom);
      }
    }

    const frequency = sampleRate / refinedPeriod;
    if (frequency < 180 || frequency > 3000) return null;

    const midiFloat = 69 + 12 * Math.log2(frequency / 440);
    const midi = Math.round(midiFloat);
    const cents = Math.round((midiFloat - midi) * 100);
    const pitchName = midiToPitchName(midi);

    return {
      frequency,
      midi,
      pitchName,
      cents,
      clarity: maxCorrelation,
      volumeDb
    };
  }

  // Analyze an entire AudioBuffer and extract segmented melody notes
  public analyzeMelodyFromAudioBuffer(audioBuffer: AudioBuffer): Array<{
    pitch: string;
    midi: number;
    startTime: number;
    duration: number;
  }> {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const windowSize = 2048;
    const hopSize = 512; // ~11ms
    const detectedPitches: Array<{ time: number; midi: number; pitch: string }> = [];

    const tempBuf = new Float32Array(windowSize);
    for (let offset = 0; offset + windowSize < channelData.length; offset += hopSize) {
      tempBuf.set(channelData.subarray(offset, offset + windowSize));
      const result = this.detectPitchFromBuffer(tempBuf, sampleRate);
      const time = offset / sampleRate;
      if (result && result.clarity > 0.75) {
        detectedPitches.push({
          time,
          midi: result.midi,
          pitch: result.pitchName
        });
      }
    }

    // Quantize and group into melodic note segments
    const notes: Array<{ pitch: string; midi: number; startTime: number; duration: number }> = [];
    if (detectedPitches.length === 0) return notes;

    let currentSegment = {
      pitch: detectedPitches[0].pitch,
      midi: detectedPitches[0].midi,
      startTime: detectedPitches[0].time,
      endTime: detectedPitches[0].time
    };

    for (let i = 1; i < detectedPitches.length; i++) {
      const p = detectedPitches[i];
      const gap = p.time - currentSegment.endTime;
      if (p.midi === currentSegment.midi && gap < 0.15) {
        currentSegment.endTime = p.time;
      } else {
        const dur = currentSegment.endTime - currentSegment.startTime;
        if (dur >= 0.1) {
          notes.push({
            pitch: currentSegment.pitch,
            midi: currentSegment.midi,
            startTime: currentSegment.startTime,
            duration: dur
          });
        }
        currentSegment = {
          pitch: p.pitch,
          midi: p.midi,
          startTime: p.time,
          endTime: p.time
        };
      }
    }

    const finalDur = currentSegment.endTime - currentSegment.startTime;
    if (finalDur >= 0.1) {
      notes.push({
        pitch: currentSegment.pitch,
        midi: currentSegment.midi,
        startTime: currentSegment.startTime,
        duration: finalDur
      });
    }

    return notes;
  }
}

export const pitchDetector = new PitchDetector();
