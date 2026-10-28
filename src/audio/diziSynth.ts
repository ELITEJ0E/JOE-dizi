// Real-time Web Audio Synthesizer for Authentic Chinese Dizi Timbre
// Models:
// 1. Resonating bamboo air column (fundamental + overtone series)
// 2. Dimo (笛膜) non-linear buzzing membrane resonance
// 3. Breath attack noise chiff
// 4. Expression & Traditional ornaments (Dieyin, Chanyin, Huayin, etc.)

import { TechniqueType } from '../types/dizi';

class DiziAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private activeVoices: Set<{ stop: () => void }> = new Set();
  public isMuted: boolean = false;
  public membraneResonance: number = 0.65; // 0 (dry wood) to 1.0 (buzzing dimo)

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Generate subtle bamboo room reverb impulse
  private createReverbImpulse(duration = 1.2, decay = 2.0) {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / length;
      const factor = Math.exp(-t * decay);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }
    return impulse;
  }

  // Play a note with authentic Dizi acoustics
  public playNote(
    freq: number,
    durationSec = 1.0,
    technique?: TechniqueType,
    slideFromFreq?: number
  ) {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const now = this.ctx.currentTime;
      const ctx = this.ctx;

      // Master note gain node
      const noteGain = ctx.createGain();
      noteGain.gain.setValueAtTime(0.0001, now);

      // --- 1. Core Air Column Oscillators (Fundamental + Harmonics) ---
      const oscFundamental = ctx.createOscillator();
      const oscH2 = ctx.createOscillator();
      const oscH3 = ctx.createOscillator();
      const oscH4 = ctx.createOscillator();

      oscFundamental.type = 'sine';
      oscH2.type = 'triangle';
      oscH3.type = 'sine';
      oscH4.type = 'triangle';

      const baseFreq = slideFromFreq || freq;
      oscFundamental.frequency.setValueAtTime(baseFreq, now);
      oscH2.frequency.setValueAtTime(baseFreq * 2, now);
      oscH3.frequency.setValueAtTime(baseFreq * 3, now);
      oscH4.frequency.setValueAtTime(baseFreq * 4, now);

      // Handle pitch sliding (Huayin 滑音)
      if (slideFromFreq && slideFromFreq !== freq) {
        oscFundamental.frequency.exponentialRampToValueAtTime(freq, now + 0.18);
        oscH2.frequency.exponentialRampToValueAtTime(freq * 2, now + 0.18);
        oscH3.frequency.exponentialRampToValueAtTime(freq * 3, now + 0.18);
        oscH4.frequency.exponentialRampToValueAtTime(freq * 4, now + 0.18);
      }

      // Handle Dieyin (叠音 - Upper grace scoop)
      if (technique === 'dieyin') {
        const graceFreq = freq * Math.pow(2, 2 / 12); // upper whole tone
        oscFundamental.frequency.setValueAtTime(graceFreq, now);
        oscFundamental.frequency.exponentialRampToValueAtTime(freq, now + 0.04);
        oscH2.frequency.setValueAtTime(graceFreq * 2, now);
        oscH2.frequency.exponentialRampToValueAtTime(freq * 2, now + 0.04);
      }

      // Handle Chanyin (颤音 - Trill)
      let trillLfo: OscillatorNode | null = null;
      if (technique === 'chanyin') {
        trillLfo = ctx.createOscillator();
        const trillGain = ctx.createGain();
        trillLfo.frequency.setValueAtTime(6.0, now); // 6 Hz trill
        trillGain.gain.setValueAtTime(freq * 0.06, now); // ~1 semitone swing
        trillLfo.connect(trillGain);
        trillGain.connect(oscFundamental.frequency);
        trillGain.connect(oscH2.frequency);
        trillLfo.start(now);
      }

      // Natural subtle vibrato (气震音) starting after 250ms
      const vibratoLfo = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      vibratoLfo.frequency.setValueAtTime(5.0, now);
      vibratoGain.gain.setValueAtTime(0, now);
      vibratoGain.gain.setValueAtTime(0, now + 0.25);
      vibratoGain.gain.linearRampToValueAtTime(freq * 0.015, now + 0.6); // subtle ~25 cents vibrato
      vibratoLfo.connect(vibratoGain);
      vibratoGain.connect(oscFundamental.frequency);
      vibratoLfo.start(now);

      // Relative harmonic gains
      const gainFund = ctx.createGain();
      const gainH2 = ctx.createGain();
      const gainH3 = ctx.createGain();
      const gainH4 = ctx.createGain();

      gainFund.gain.setValueAtTime(0.7, now);
      gainH2.gain.setValueAtTime(0.35, now);
      gainH3.gain.setValueAtTime(0.18, now);
      gainH4.gain.setValueAtTime(0.08, now);

      oscFundamental.connect(gainFund);
      oscH2.connect(gainH2);
      oscH3.connect(gainH3);
      oscH4.connect(gainH4);

      const airColumnMix = ctx.createGain();
      gainFund.connect(airColumnMix);
      gainH2.connect(airColumnMix);
      gainH3.connect(airColumnMix);
      gainH4.connect(airColumnMix);

      // --- 2. Dimo (笛膜) Membrane Buzzing Filter & Non-linear waveshaping ---
      const membraneFilter = ctx.createBiquadFilter();
      membraneFilter.type = 'bandpass';
      membraneFilter.frequency.setValueAtTime(2400, now); // distinctive 2.4kHz membrane buzz
      membraneFilter.Q.setValueAtTime(2.2, now);

      const membraneGain = ctx.createGain();
      const buzzLevel = Math.max(0.1, this.membraneResonance * 0.45);
      membraneGain.gain.setValueAtTime(buzzLevel, now);

      airColumnMix.connect(membraneFilter);
      membraneFilter.connect(membraneGain);

      // --- 3. Breath Air Noise (吹孔气流声) ---
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBuffer.length; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * 0.2;
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(freq * 1.5, now);
      noiseFilter.Q.setValueAtTime(1.5, now);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.2, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06); // quick chiff

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(noteGain);

      // Mix clean air column + buzzing membrane to noteGain
      airColumnMix.connect(noteGain);
      membraneGain.connect(noteGain);

      // --- 4. Envelope (ADSR tailored for Dizi) ---
      const attackTime = technique === 'tuyin' || technique === 'duoyin' ? 0.015 : 0.05;
      const decayTime = 0.08;
      const sustainLevel = 0.75;
      const releaseTime = technique === 'tuyin' ? 0.04 : 0.12;

      // Attack
      noteGain.gain.linearRampToValueAtTime(technique === 'duoyin' ? 1.0 : 0.85, now + attackTime);
      // Decay to sustain
      noteGain.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);

      // Release
      const stopTime = now + durationSec;
      noteGain.gain.setValueAtTime(sustainLevel, stopTime - releaseTime);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      noteGain.connect(this.masterGain);

      // Start sound sources
      oscFundamental.start(now);
      oscH2.start(now);
      oscH3.start(now);
      oscH4.start(now);
      noiseSource.start(now);

      const stopVoice = () => {
        try {
          oscFundamental.stop();
          oscH2.stop();
          oscH3.stop();
          oscH4.stop();
          vibratoLfo.stop();
          if (trillLfo) trillLfo.stop();
        } catch {
          // ignore already stopped
        }
      };

      const voice = { stop: stopVoice };
      this.activeVoices.add(voice);

      setTimeout(() => {
        stopVoice();
        this.activeVoices.delete(voice);
      }, durationSec * 1000 + 150);

    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  // Play wooden Chinese Clapper / Ban (檀板) click for metronome
  public playClapper(isDownbeat = false) {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isDownbeat ? 1200 : 880, now);
      osc.frequency.exponentialRampToValueAtTime(isDownbeat ? 240 : 200, now + 0.04);

      gain.gain.setValueAtTime(isDownbeat ? 0.6 : 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      // AudioContext unavailable
    }
  }

  public stopAll() {
    this.activeVoices.forEach(v => v.stop());
    this.activeVoices.clear();
  }
}

export const diziAudio = new DiziAudioEngine();
