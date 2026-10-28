export type DiziKey = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'Bb';

export type DiziType = 'Qudi' | 'Bangdi' | 'Dadi';

export type FingeringSystem = 'tongyin_5' | 'tongyin_2' | 'tongyin_1' | 'tongyin_6' | 'tongyin_3';

export type BreathRegister = 'low' | 'medium' | 'high' | 'ultra';

export type HoleState = 0 | 1 | 0.5; // 0: Open (○), 1: Closed (●), 0.5: Half-hole (◐)

export type SixHoles = [HoleState, HoleState, HoleState, HoleState, HoleState, HoleState];

export interface FingeringEntry {
  pitch: string;              // e.g. 'D5', 'G4', 'C5'
  midi: number;               // MIDI note number (e.g. 60 = C4, 74 = D5)
  frequency: number;          // Hz (e.g. 587.33)
  jianpuDegree: string;       // '1', '2', '3', '4', 'b7', etc.
  octaveDot: -2 | -1 | 0 | 1 | 2; // -1: dot below, 0: middle, +1: dot above
  holes: SixHoles;            // [h1, h2, h3, h4, h5, h6] from bottom (hole 1) to top (hole 6)
  register: BreathRegister;   // 'low' (缓吹), 'medium' (急吹), 'high' (超吹)
  registerZh: string;         // '缓吹', '急吹', '超吹'
  alternative?: boolean;      // True if alternate fingering (叉口/半孔)
  description?: string;
}

export type TechniqueType =
  | 'dieyin'   // 叠音 - Upper grace note (~)
  | 'dayin'    // 打音 - Lower strike
  | 'chanyin'  // 颤音 - Trill (tr)
  | 'liyin'    // 历音 - Glissando / cascade
  | 'huayin'   // 滑音 - Portamento slide
  | 'tuyin'    // 吐音 - Staccato / tonguing
  | 'duoyin'   // 剁音 - Heavy drop attack
  | 'huashe'   // 花舌 - Flutter tongue
  | 'zengyin'; // 赠音 - Subtle release grace

export interface TechniqueInfo {
  type: TechniqueType;
  nameZh: string;
  nameEn: string;
  symbol: string;
  description: string;
  audioEffect: string;
}

export interface DiziNote {
  id: string;
  pitch: string;              // Western scientific pitch (e.g. "D5")
  midi: number;
  jianpu: string;             // Jianpu base digit: "1", "2", "3", "4", "5", "6", "7", "0" (rest), "-" (sustain)
  octaveDot: -2 | -1 | 0 | 1 | 2; // dots below (-) or above (+)
  accidental?: '#' | 'b' | 'n';
  duration: number;           // in beats (e.g. 1 = quarter, 0.5 = 8th, 0.25 = 16th, 2 = half, 4 = whole)
  isDotted?: boolean;
  isDashed?: boolean;         // true for "-" sustain extension
  isRest?: boolean;           // true for "0"
  slurStart?: boolean;
  slurEnd?: boolean;
  technique?: TechniqueType;
  chord?: string;             // e.g. "G", "D", "Em", "C"
  lyric?: string;             // e.g. "明", "月", "出", "天", "山"
  measureNumber: number;
  beatInMeasure: number;
  holes?: SixHoles;
  register?: BreathRegister;
}

export interface SongSection {
  id: string;
  name: string;               // e.g. "Intro", "Verse 01", "Chorus"
  startMeasure: number;
  endMeasure: number;
  color: string;
}

export interface Song {
  id: string;
  titleZh: string;
  titleEn: string;
  artistZh: string;
  artistEn: string;
  source: 'preset' | 'upload' | 'youtube' | 'suno';
  sourceDetails?: string;     // e.g. "YouTube • Synced", "Audio File", "Suno AI Gen"
  diziKey: DiziKey;
  fingeringSystem: FingeringSystem;
  musicalKey: string;         // e.g. "1 = G", "1 = D"
  timeSignature: string;      // e.g. "4/4", "2/4", "3/4"
  bpm: number;
  notes: DiziNote[];
  sections: SongSection[];
  totalMeasures: number;
  backgroundPoem?: {
    text: string;
    dynasty: string;
    poet: string;
  };
  sealName?: string;          // e.g. "關山月"
}

export type ViewMode =
  | 'overview'
  | 'transcribe'
  | 'fingering'
  | 'scales'
  | 'harmony'
  | 'practice'
  | 'songbook'
  | 'tuner'
  | 'settings';
