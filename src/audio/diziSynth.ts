// A procedural bamboo dizi voice. For a perfectly faithful timbre a licensed
// dizi sample library would still be needed; this models breath and dimo instead
// of using the prior organ-like stack of triangle/sine oscillators.
import { TechniqueType } from '../types/dizi';

class DiziAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private voices = new Set<{ stop: () => void; updateMembrane: (amount: number) => void }>();
  public isMuted = false;
  private membraneAmount = 0.65;

  get membraneResonance(): number { return this.membraneAmount; }
  set membraneResonance(value: number) {
    this.membraneAmount = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.65;
    // Slider feedback also reaches notes that are currently sounding.
    this.voices.forEach(voice => voice.updateMembrane(this.membraneAmount));
    try { localStorage.setItem('joe-dizi-membrane-v1', String(this.membraneAmount)); } catch { /* private browsing */ }
  }

  constructor() {
    try {
      const saved = Number(localStorage.getItem('joe-dizi-membrane-v1'));
      if (Number.isFinite(saved) && saved >= 0 && saved <= 1 && localStorage.getItem('joe-dizi-membrane-v1') !== null)
        this.membraneAmount = saved;
    } catch { /* no storage in test or SSR environments */ }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      this.ctx = ctx;
      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = 0.58;
      this.masterGain.connect(ctx.destination);

      const wet = ctx.createGain();
      wet.gain.value = 0.095;
      const reverb = ctx.createConvolver();
      const impulse = ctx.createBuffer(2, Math.round(ctx.sampleRate * 0.78), ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const samples = impulse.getChannelData(ch);
        for (let i = 0; i < samples.length; i++) {
          const t = i / ctx.sampleRate;
          samples[i] = (Math.random() * 2 - 1) * Math.pow(1 - t / 0.78, 3) * 0.5;
        }
      }
      reverb.buffer = impulse;
      this.masterGain.connect(reverb);
      reverb.connect(wet);
      wet.connect(ctx.destination);

      // A filtered, looping turbulent-air source shared by all notes.
      this.noiseBuffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.34), ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      let pink = 0;
      for (let i = 0; i < data.length; i++) {
        pink = pink * 0.84 + (Math.random() * 2 - 1) * 0.16;
        data[i] = pink;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private makeHarmonics(ctx: AudioContext, frequency: number, membrane: boolean) {
    const max = Math.min(20, Math.floor(ctx.sampleRate * 0.46 / frequency));
    const real = new Float32Array(max + 1);
    const imag = new Float32Array(max + 1);
    for (let n = 1; n <= max; n++) {
      if (membrane) {
        imag[n] = Math.pow(n, -0.57) * (n >= 3 ? 1 : 0.13) * (n % 2 === 0 ? 0.85 : 1);
      } else {
        const rolloff = frequency > 1000 ? 1.9 : frequency > 650 ? 1.55 : 1.3;
        imag[n] = Math.pow(n, -rolloff) * (n === 2 ? 0.74 : 1);
      }
    }
    return ctx.createPeriodicWave(real, imag);
  }

  public playNote(freq: number, durationSec = 1, technique?: TechniqueType, slideFromFreq?: number) {
    if (this.isMuted || !Number.isFinite(freq) || freq <= 0) return;
    try {
      this.initContext();
      const ctx = this.ctx;
      if (!ctx || !this.masterGain || !this.noiseBuffer) return;
      const start = ctx.currentTime;
      const duration = Math.max(0.04, durationSec);
      const finish = start + duration;
      const release = Math.min(0.12, Math.max(0.016, duration * (technique === 'tuyin' ? 0.2 : 0.3)));
      const attack = Math.min(technique === 'tuyin' || technique === 'duoyin' ? 0.008 : 0.028, duration * 0.28);
      const hold = Math.max(start + attack + 0.005, finish - release);

      const envelope = ctx.createGain();
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.linearRampToValueAtTime(0.85, start + attack);
      envelope.gain.linearRampToValueAtTime(0.7, Math.min(hold, start + attack + 0.08));
      envelope.gain.setValueAtTime(0.7, hold);
      envelope.gain.exponentialRampToValueAtTime(0.0001, finish);
      envelope.connect(this.masterGain);

      const toneFilter = ctx.createBiquadFilter();
      toneFilter.type = 'lowpass';
      toneFilter.frequency.value = Math.min(6500, Math.max(2300, freq * 6.5));
      toneFilter.Q.value = 0.5;
      toneFilter.connect(envelope);
      const main = ctx.createOscillator();
      main.setPeriodicWave(this.makeHarmonics(ctx, freq, false));
      const tonalGain = ctx.createGain();
      tonalGain.gain.value = 0.57;
      main.connect(tonalGain);
      tonalGain.connect(toneFilter);

      // The dimo is a vibrating reed membrane, not simply a louder sine wave.
      // Add a saturated, slightly detuned bright carrier plus a narrow, airy
      // buzz band that flutters as the membrane rattles. At 0% it is truly dry.
      const membrane = ctx.createOscillator();
      membrane.setPeriodicWave(this.makeHarmonics(ctx, freq, true));
      membrane.detune.value = 4.5;
      const saturation = ctx.createWaveShaper();
      const saturationCurve = new Float32Array(1024);
      for (let i = 0; i < saturationCurve.length; i++) {
        const input = (2 * i) / (saturationCurve.length - 1) - 1;
        saturationCurve[i] = Math.tanh(input * 2.5);
      }
      saturation.curve = saturationCurve;
      saturation.oversample = '2x';
      const dimoFilter = ctx.createBiquadFilter();
      dimoFilter.type = 'bandpass';
      dimoFilter.frequency.value = Math.min(5400, Math.max(950, freq * 3.2));
      dimoFilter.Q.value = 0.7;
      const dimoGain = ctx.createGain();
      membrane.connect(saturation);
      saturation.connect(dimoFilter);
      dimoFilter.connect(dimoGain);
      dimoGain.connect(envelope);

      const membraneNoise = ctx.createBufferSource();
      membraneNoise.buffer = this.noiseBuffer;
      membraneNoise.loop = true;
      const rattlingFilter = ctx.createBiquadFilter();
      rattlingFilter.type = 'bandpass';
      rattlingFilter.frequency.value = Math.min(6200, Math.max(1800, freq * 4.1));
      rattlingFilter.Q.value = 1.7;
      const rattlingGain = ctx.createGain();
      rattlingGain.gain.value = 0.24;
      membraneNoise.connect(rattlingFilter);
      rattlingFilter.connect(rattlingGain);
      rattlingGain.connect(dimoGain);

      const flutter = ctx.createOscillator();
      flutter.type = 'sine';
      flutter.frequency.value = 29 + Math.min(12, freq / 180);
      const flutterDepth = ctx.createGain();
      flutter.connect(flutterDepth);
      flutterDepth.connect(dimoGain.gain);
      const updateMembrane = (amount: number) => {
        const level = Math.pow(amount, 1.35) * (freq > 1400 ? 0.47 : 0.68);
        dimoGain.gain.setTargetAtTime(level, ctx.currentTime, 0.015);
        flutterDepth.gain.setTargetAtTime(level * 0.17, ctx.currentTime, 0.015);
      };
      dimoGain.gain.value = Math.pow(this.membraneAmount, 1.35) * (freq > 1400 ? 0.47 : 0.68);
      flutterDepth.gain.value = dimoGain.gain.value * 0.17;

      // Continuous breath, with a short consonant-like chiff on tongue attacks.
      const breath = ctx.createBufferSource();
      breath.buffer = this.noiseBuffer;
      breath.loop = true;
      const airFilter = ctx.createBiquadFilter();
      airFilter.type = 'bandpass';
      airFilter.frequency.value = Math.min(5300, Math.max(1100, freq * 3.6));
      airFilter.Q.value = 0.38;
      const airGain = ctx.createGain();
      const breathLevel = technique === 'tuyin' || technique === 'duoyin' ? 0.21 : 0.13;
      airGain.gain.setValueAtTime(0.0001, start);
      airGain.gain.linearRampToValueAtTime(breathLevel * 1.4, start + Math.max(0.006, attack));
      airGain.gain.linearRampToValueAtTime(breathLevel * 0.45, Math.min(hold, start + attack + 0.11));
      airGain.gain.setValueAtTime(breathLevel * 0.45, hold);
      airGain.gain.exponentialRampToValueAtTime(0.0001, finish);
      breath.connect(airFilter);
      airFilter.connect(airGain);
      airGain.connect(envelope);

      const from = slideFromFreq && slideFromFreq > 0 ? slideFromFreq : freq;
      for (const oscillator of [main, membrane]) {
        oscillator.frequency.setValueAtTime(from, start);
        if (slideFromFreq && from !== freq) {
          oscillator.frequency.exponentialRampToValueAtTime(freq, start + Math.min(0.16, duration * 0.65));
        } else if (technique === 'dieyin' || technique === 'dayin') {
          oscillator.frequency.setValueAtTime(freq * Math.pow(2, (technique === 'dieyin' ? 2 : -1) / 12), start);
          oscillator.frequency.exponentialRampToValueAtTime(freq, start + Math.min(0.045, duration * 0.45));
        }
      }

      // Breath vibrato (气震音): starts after the attack instead of instantly.
      const vibrato = ctx.createOscillator();
      const depth = ctx.createGain();
      vibrato.frequency.value = technique === 'chanyin' ? 7.2 : technique === 'huashe' ? 19 : 5.2;
      depth.gain.setValueAtTime(0, start);
      const onset = start + Math.min(0.19, duration * 0.32);
      depth.gain.setValueAtTime(0, onset);
      depth.gain.linearRampToValueAtTime(freq * (technique === 'chanyin' ? 0.031 : 0.006), Math.min(finish, onset + 0.12));
      vibrato.connect(depth);
      depth.connect(main.frequency);
      depth.connect(membrane.frequency);

      const sources = [main, membrane, membraneNoise, flutter, breath, vibrato];
      for (const source of sources) { source.start(start); source.stop(finish + 0.012); }
      const voice = { stop: () => {
        for (const source of sources) { try { source.stop(); } catch { /* already ended */ } }
      }, updateMembrane };
      this.voices.add(voice);
      main.onended = () => {
        this.voices.delete(voice);
        sources.forEach(source => source.disconnect());
        envelope.disconnect();
      };
    } catch (error) {
      console.warn('Dizi sound unavailable', error);
    }
  }

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
    } catch { /* AudioContext unavailable */ }
  }

  public stopAll() {
    this.voices.forEach(voice => voice.stop());
    this.voices.clear();
  }
}

export const diziAudio = new DiziAudioEngine();
