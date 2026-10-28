import {
  DiziKey,
  DiziType,
  FingeringSystem,
  FingeringEntry,
  SixHoles,
  TechniqueInfo,
  TechniqueType
} from '../types/dizi';

// Note frequencies and names
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function frequencyToMidi(freq: number): number {
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

export function midiToPitchName(midi: number, diziKey?: DiziKey): string {
  const names = diziKey === 'F' || diziKey === 'Bb' ? FLAT_NOTE_NAMES : NOTE_NAMES;
  const note = names[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

export function pitchNameToMidi(name: string): number {
  const match = name.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!match) return 60;
  const [, note, oct] = match;
  let idx = NOTE_NAMES.indexOf(note);
  if (idx === -1) {
    if (note === 'Db') idx = 1;
    else if (note === 'Eb') idx = 3;
    else if (note === 'Gb') idx = 6;
    else if (note === 'Ab') idx = 8;
    else if (note === 'Bb') idx = 10;
  }
  return (parseInt(oct, 10) + 1) * 12 + idx;
}

// Dizi Instrument properties
export interface DiziKeySpec {
  key: DiziKey;
  type: DiziType;
  typeZh: string;
  nameZh: string;
  tongyinPitch: string;      // 筒音 (all 6 closed)
  thirdHolePitch: string;    // 第三孔开放 (standard keynote)
  rangeStartMidi: number;
  rangeEndMidi: number;
  description: string;
}

export const DIZI_KEYS_SPEC: Record<DiziKey, DiziKeySpec> = {
  'G': {
    key: 'G',
    type: 'Bangdi',
    typeZh: '梆笛',
    nameZh: 'G调梆笛 (高音笛)',
    tongyinPitch: 'D5',
    thirdHolePitch: 'G5',
    rangeStartMidi: 74, // D5
    rangeEndMidi: 98,   // D7
    description: 'Crisp, bright Northern style Bangdi. Ideal for passionate, swift melodies like 《关山月》 and 《扬鞭催马运粮忙》.'
  },
  'A': {
    key: 'A',
    type: 'Bangdi',
    typeZh: '梆笛',
    nameZh: 'A调小梆笛',
    tongyinPitch: 'E5',
    thirdHolePitch: 'A5',
    rangeStartMidi: 76,
    rangeEndMidi: 100,
    description: 'Very high, brilliant timbre. Highly responsive for northern opera and quick ornaments.'
  },
  'F': {
    key: 'F',
    type: 'Bangdi',
    typeZh: '中音笛 / 梆笛',
    nameZh: 'F调中音笛',
    tongyinPitch: 'C5',
    thirdHolePitch: 'F5',
    rangeStartMidi: 72,
    rangeEndMidi: 96,
    description: 'Balanced between crisp Bangdi brilliance and warm lyrical body.'
  },
  'D': {
    key: 'D',
    type: 'Qudi',
    typeZh: '曲笛',
    nameZh: 'D调曲笛 (大笛/昆笛)',
    tongyinPitch: 'A4',
    thirdHolePitch: 'D5',
    rangeStartMidi: 69, // A4
    rangeEndMidi: 93,
    description: 'Classic Southern Jiangnan Sizhu and Kunqu opera flute. Mellow, poetic, sweet and expressive.'
  },
  'C': {
    key: 'C',
    type: 'Qudi',
    typeZh: '曲笛',
    nameZh: 'C调大曲笛',
    tongyinPitch: 'G4',
    thirdHolePitch: 'C5',
    rangeStartMidi: 67, // G4
    rangeEndMidi: 91,
    description: 'Deep, serene, traditional Jiangnan masterpiece flute. Deep breathing, rich membrane resonance.'
  },
  'E': {
    key: 'E',
    type: 'Qudi',
    typeZh: '曲笛',
    nameZh: 'E调曲笛',
    tongyinPitch: 'B4',
    thirdHolePitch: 'E5',
    rangeStartMidi: 71,
    rangeEndMidi: 95,
    description: 'Lyrical, versatile key for contemporary and traditional ensemble solo.'
  },
  'Bb': {
    key: 'Bb',
    type: 'Dadi',
    typeZh: '大笛',
    nameZh: '降B调大笛 (低音笛)',
    tongyinPitch: 'F4',
    thirdHolePitch: 'Bb4',
    rangeStartMidi: 65,
    rangeEndMidi: 89,
    description: 'Deep bass flute with contemplative resonance, reminiscent of ancient court music.'
  }
};

// Verified traditional 6-hole fingerings
// Holes array: [H1, H2, H3, H4, H5, H6] where H1 is bottom (right pinky/ring), H6 is top (left index)
// 1: closed (●), 0: open (○), 0.5: half-hole (◐)

// For standard G Dizi with 筒音作5 (most common system, where 1 = G)
// Scale degrees: 5̣, 6̣, 7̣, 1, 2, 3, 4, 5, 6, 7, 1̇, 2̇, 3̇, 4̇, 5̇, 6̇
export const FINGERINGS_G_TONGYIN_5: FingeringEntry[] = [
  // Low octave (缓吹)
  { pitch: 'D5', midi: 74, frequency: 587.33, jianpuDegree: '5', octaveDot: -1, holes: [1, 1, 1, 1, 1, 1], register: 'low', registerZh: '缓吹', description: '筒音基音，全按，缓吹，气息沉稳充实' },
  { pitch: 'E5', midi: 76, frequency: 659.25, jianpuDegree: '6', octaveDot: -1, holes: [0, 1, 1, 1, 1, 1], register: 'low', registerZh: '缓吹', description: '开第一孔，缓吹' },
  { pitch: 'F#5', midi: 78, frequency: 739.99, jianpuDegree: '7', octaveDot: -1, holes: [0, 0, 1, 1, 1, 1], register: 'low', registerZh: '缓吹', description: '开第一、二孔，缓吹' },
  { pitch: 'F5', midi: 77, frequency: 698.46, jianpuDegree: 'b7', octaveDot: -1, holes: [0, 0.5, 1, 1, 1, 1], register: 'low', registerZh: '缓吹', alternative: true, description: '第二孔按半孔，缓吹' },
  
  // Middle octave (急吹 / 超吹泛音)
  { pitch: 'G5', midi: 79, frequency: 783.99, jianpuDegree: '1', octaveDot: 0, holes: [0, 0, 0, 1, 1, 1], register: 'medium', registerZh: '急吹', description: '开一二三孔，主音 Do，中度气流' },
  { pitch: 'A5', midi: 81, frequency: 880.00, jianpuDegree: '2', octaveDot: 0, holes: [0, 0, 0, 0, 1, 1], register: 'medium', registerZh: '急吹', description: '按五六孔，开一二三四孔' },
  { pitch: 'B5', midi: 83, frequency: 987.77, jianpuDegree: '3', octaveDot: 0, holes: [0, 0, 0, 0, 0, 1], register: 'medium', registerZh: '急吹', description: '仅按第六孔' },
  { pitch: 'C6', midi: 84, frequency: 1046.50, jianpuDegree: '4', octaveDot: 0, holes: [0, 0, 0, 0, 0, 0], register: 'medium', registerZh: '急吹', description: '全开（或开六孔按四五孔叉口）' },
  { pitch: 'C6', midi: 84, frequency: 1046.50, jianpuDegree: '4', octaveDot: 0, holes: [0, 0, 0, 1, 1, 0], register: 'medium', registerZh: '急吹', alternative: true, description: '叉口指法：按四五孔，音准更稳定' },
  { pitch: 'C#6', midi: 85, frequency: 1108.73, jianpuDegree: '#4', octaveDot: 0, holes: [0, 0, 0, 0, 0.5, 1], register: 'medium', registerZh: '急吹', alternative: true, description: '升4半孔' },
  { pitch: 'D6', midi: 86, frequency: 1174.66, jianpuDegree: '5', octaveDot: 0, holes: [1, 1, 1, 1, 1, 1], register: 'medium', registerZh: '急吹', description: '全按急吹（八度泛音）' },
  { pitch: 'D6', midi: 86, frequency: 1174.66, jianpuDegree: '5', octaveDot: 0, holes: [1, 1, 1, 1, 1, 0], register: 'medium', registerZh: '急吹', alternative: true, description: '开第六孔高音5，发音灵敏' },
  { pitch: 'E6', midi: 88, frequency: 1318.51, jianpuDegree: '6', octaveDot: 0, holes: [0, 1, 1, 1, 1, 1], register: 'medium', registerZh: '急吹', description: '开第一孔急吹' },
  { pitch: 'F#6', midi: 90, frequency: 1479.98, jianpuDegree: '7', octaveDot: 0, holes: [0, 0, 1, 1, 1, 1], register: 'medium', registerZh: '急吹', description: '开一二孔急吹' },

  // High octave (超吹)
  { pitch: 'G6', midi: 91, frequency: 1567.98, jianpuDegree: '1', octaveDot: 1, holes: [0, 0, 0, 1, 1, 1], register: 'high', registerZh: '超吹', description: '高音1，开一二三孔超吹' },
  { pitch: 'G6', midi: 91, frequency: 1567.98, jianpuDegree: '1', octaveDot: 1, holes: [0, 0, 0, 1, 1, 0], register: 'high', registerZh: '超吹', alternative: true, description: '开六孔替代指法' },
  { pitch: 'A6', midi: 93, frequency: 1760.00, jianpuDegree: '2', octaveDot: 1, holes: [0, 0, 0, 0, 1, 1], register: 'high', registerZh: '超吹', description: '高音2，风门收窄，气速饱满' },
  { pitch: 'B6', midi: 95, frequency: 1975.53, jianpuDegree: '3', octaveDot: 1, holes: [0, 0, 0, 0, 0, 1], register: 'high', registerZh: '超吹', description: '高音3，按第六孔超吹' },
  { pitch: 'C7', midi: 96, frequency: 2093.00, jianpuDegree: '4', octaveDot: 1, holes: [0, 0, 1, 1, 0, 1], register: 'high', registerZh: '超吹', description: '高音4叉口：按三四六孔' },
  { pitch: 'D7', midi: 98, frequency: 2349.32, jianpuDegree: '5', octaveDot: 1, holes: [0, 1, 1, 0, 1, 1], register: 'high', registerZh: '超吹', description: '高音5极音：按二三五六孔' }
];

// Helper to calculate transpose intervals between Dizi keys
export const KEY_TRANSPOSITION_SEMITONES: Record<DiziKey, number> = {
  'C': 0,
  'D': 2,
  'E': 4,
  'F': 5,
  'G': 7,
  'A': 9,
  'Bb': 10
};

// The tonic octave depends on where "1" sits on the flute, not just its
// pitch class. Keep this independent of the fingering table: accidentals and
// notes outside the physical range must still receive honest notation.
const G_DIZI_TONIC_MIDI: Record<FingeringSystem, number> = {
  tongyin_5: 79, // G5
  tongyin_2: 84, // C6
  tongyin_1: 74, // D5
  tongyin_6: 77, // F5
  tongyin_3: 70, // Bb4
};

const CHROMATIC_JIANPU = [
  '1', '#1', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'
] as const;

/** Translate actual Jianpu degrees into sounding MIDI for the selected flute.
 * Do not use a fixed G-flute lookup for scale previews: that silently skips
 * notes when the fingering chart is transposed to another dizi key. */
export function jianpuDegreeToMidi(degree: string, diziKey: DiziKey, system: FingeringSystem): number | null {
  const match = /^([#b]?)([1-7])([\u0307\u0323]*)$/u.exec(degree);
  if (!match) return null;
  const steps = [0, 2, 4, 5, 7, 9, 11];
  const [, accidental, number, octaveMarks] = match;
  const tonic = G_DIZI_TONIC_MIDI[system] + pitchNameToMidi(DIZI_KEYS_SPEC[diziKey].tongyinPitch) - 74;
  const octaves = [...octaveMarks].reduce((shift, mark) => shift + (mark === '\u0307' ? 1 : -1), 0);
  return tonic + steps[Number(number) - 1] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0) + 12 * octaves;
}

export function getJianpuForMidi(midi: number, diziKey: DiziKey, system: FingeringSystem): {
  jianpu: string;
  octaveDot: -2 | -1 | 0 | 1 | 2;
} {
  const tonic = G_DIZI_TONIC_MIDI[system] + pitchNameToMidi(DIZI_KEYS_SPEC[diziKey].tongyinPitch) - 74;
  const semitones = midi - tonic;
  const octave = Math.floor(semitones / 12);
  const degree = CHROMATIC_JIANPU[((semitones % 12) + 12) % 12];
  return { jianpu: degree, octaveDot: Math.max(-2, Math.min(2, octave)) as -2 | -1 | 0 | 1 | 2 };
}

// Calculate musical tonic given dizi key and fingering system
export function calculateMusicalTonic(diziKey: DiziKey, system: FingeringSystem): string {
  // If diziKey = G:
  // tongyin_5 -> 1 = G
  // tongyin_2 -> 1 = C
  // tongyin_1 -> 1 = D
  // tongyin_6 -> 1 = F
  // tongyin_3 -> 1 = Bb
  const diziMidi = KEY_TRANSPOSITION_SEMITONES[diziKey];
  let tonicOffset = 0;
  switch (system) {
    case 'tongyin_5': tonicOffset = 0; break;
    case 'tongyin_2': tonicOffset = 5; break; // +5 semitones (4th degree)
    case 'tongyin_1': tonicOffset = 7; break; // +7 semitones (5th degree)
    case 'tongyin_6': tonicOffset = 10; break; // +10 semitones (minor 7th)
    case 'tongyin_3': tonicOffset = 3; break; // +3 semitones (minor 3rd)
  }
  const targetMidi = (diziMidi + tonicOffset) % 12;
  const tonicNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  return `1 = ${tonicNames[targetMidi]}`;
}

// Generate full dynamic fingering table for any Dizi Key and Fingering System
export function getFingeringsFor(diziKey: DiziKey, system: FingeringSystem): FingeringEntry[] {
  // Use the sounding tube-note octave, not just the pitch class. A Bb dizi is
  // *lower* than G, despite Bb's pitch-class number being greater than G's.
  const semitoneShift = pitchNameToMidi(DIZI_KEYS_SPEC[diziKey].tongyinPitch) - 74;

  // Shift base G entries by semitones
  return FINGERINGS_G_TONGYIN_5.map(entry => {
    const shiftedMidi = entry.midi + semitoneShift;
    const pitch = midiToPitchName(shiftedMidi, diziKey);
    const freq = midiToFrequency(shiftedMidi);

    const { jianpu: jianpuDegree, octaveDot } = getJianpuForMidi(shiftedMidi, diziKey, system);

    return {
      ...entry,
      pitch,
      midi: shiftedMidi,
      frequency: freq,
      jianpuDegree,
      octaveDot
    };
  });
}

// Exact matching only. A nearby six-hole pattern is NOT a valid fingering for
// a different sounding pitch (e.g. F#7 was previously shown as D7 / Jianpu 5).
export function findFingering(
  targetPitch: string,
  diziKey: DiziKey = 'G',
  system: FingeringSystem = 'tongyin_5'
): FingeringEntry | null {
  const table = getFingeringsFor(diziKey, system);
  // Match equivalent enharmonic spellings by MIDI, but never a nearby note.
  if (!/^[A-G](?:#|b)?-?\d+$/.test(targetPitch)) return null;
  const targetMidi = pitchNameToMidi(targetPitch);
  const exact = table.find(e => e.midi === targetMidi && !e.alternative);
  if (exact) return exact;
  const any = table.find(e => e.midi === targetMidi);
  if (any) return any;
  return null;
}

// Techniques database
export const DIZI_TECHNIQUES: Record<TechniqueType, TechniqueInfo> = {
  dieyin: {
    type: 'dieyin',
    nameZh: '叠音 Dieyin',
    nameEn: 'Upper Grace Note',
    symbol: '~',
    description: 'A rapid upper grace note played by flicking the finger above the target hole right at the attack, creating a bright, fluid, shimmering start.',
    audioEffect: 'Quick upper auxiliary pitch scoop (15-20ms) before primary tone.'
  },
  dayin: {
    type: 'dayin',
    nameZh: '打音 Dayin',
    nameEn: 'Lower Strike Tap',
    symbol: '▾',
    description: 'A crisp finger strike directly down onto the hole of the note being played, breaking repeating notes with an earthy percussive bamboo articulation.',
    audioEffect: 'Micro instant tap cutting the sound column without tongue.'
  },
  chanyin: {
    type: 'chanyin',
    nameZh: '颤音 Chanyin',
    nameEn: 'Finger Trill',
    symbol: 'tr',
    description: 'Rapid, rhythmic alternation between the main note and the note a whole or half step above using rapid finger vibration.',
    audioEffect: '5.5 Hz rapid pitch oscillation between adjacent semitones.'
  },
  liyin: {
    type: 'liyin',
    nameZh: '历音 Liyin',
    nameEn: 'Glissando Cascade',
    symbol: '≈',
    description: 'A dazzling sweep up or down through adjacent finger holes in rapid succession, evoking wind, rivers, or racing steeds.',
    audioEffect: 'Rapid pentatonic arpeggio sweep across 4-6 holes.'
  },
  huayin: {
    type: 'huayin',
    nameZh: '滑音 Huayin',
    nameEn: 'Portamento Slide',
    symbol: '↗',
    description: 'Continuous pitch sliding achieved by slowly wiping/sliding fingers off the hole or rotating the embouchure angle.',
    audioEffect: 'Continuous exponential pitch glide from one note to the next.'
  },
  tuyin: {
    type: 'tuyin',
    nameZh: '吐音 Tuyin',
    nameEn: 'Tonguing Articulation',
    symbol: '▲',
    description: 'Crisp tongue articulation: 单吐 (Single tongue "T"), 双吐 (Double tongue "T-K"), and 三吐 (Triple tongue "T-K-T").',
    audioEffect: 'Sharp noise attack burst and abbreviated envelope.'
  },
  duoyin: {
    type: 'duoyin',
    nameZh: '剁音 Duoyin',
    nameEn: 'Explosive Drop Attack',
    symbol: '▼',
    description: 'An explosive, forceful attack combining strong breath blast and abrupt finger drop, typical of passionate northern Bangdi music.',
    audioEffect: 'Fortissimo transient with sharp overblowing harmonic pop.'
  },
  huashe: {
    type: 'huashe',
    nameZh: '花舌 Huashe',
    nameEn: 'Flutter Tonguing',
    symbol: '≋',
    description: 'Flutter tonguing created by rolling the tip of the tongue with a gentle "R" or "Trrr" sound while blowing.',
    audioEffect: 'Continuous 18 Hz amplitude and frequency flutter modulation.'
  },
  zengyin: {
    type: 'zengyin',
    nameZh: '赠音 Zengyin',
    nameEn: 'Trailing Grace',
    symbol: '∿',
    description: 'A delicate, upward trailing ghost note produced at the very tail of a sustained note as the finger lifts gracefully.',
    audioEffect: 'Soft decrescendo grace note at the tail of the note.'
  }
};

// Chinese Pentatonic and Heptatonic Modes
export interface ChineseMode {
  id: string;
  nameZh: string;
  namePinyin: string;
  degrees: string[];
  characteristic: string;
  emotionalFeel: string;
}

export const CHINESE_MODES: ChineseMode[] = [
  {
    id: 'gong',
    nameZh: '宫调式 Gong Mode',
    namePinyin: 'Gōng',
    degrees: ['1', '2', '3', '5', '6', '1̇'],
    characteristic: 'Rooted on Do (1). Bright, grand, noble, and dignified.',
    emotionalFeel: 'Celebratory, majestic, and grounded.'
  },
  {
    id: 'shang',
    nameZh: '商调式 Shang Mode',
    namePinyin: 'Shāng',
    degrees: ['2', '3', '5', '6', '1̇', '2̇'],
    characteristic: 'Rooted on Re (2). Solemn, heroic, longing, and resolute.',
    emotionalFeel: 'Ancient battlefield songs, valiant determination.'
  },
  {
    id: 'jue',
    nameZh: '角调式 Jue Mode',
    namePinyin: 'Jué',
    degrees: ['3', '5', '6', '1̇', '2̇', '3̇'],
    characteristic: 'Rooted on Mi (3). Fresh, rustic, springtime, pastoral.',
    emotionalFeel: 'Gentle, contemplative, reminiscent of mountain streams.'
  },
  {
    id: 'zhi',
    nameZh: '徵调式 Zhi Mode',
    namePinyin: 'Zhǐ',
    degrees: ['5', '6', '1̇', '2̇', '3̇', '5̇'],
    characteristic: 'Rooted on Sol (5). Warm, enthusiastic, cheerful, flowing.',
    emotionalFeel: 'Joyful harvest dances, lively countryside festivities.'
  },
  {
    id: 'yu',
    nameZh: '羽调式 Yu Mode',
    namePinyin: 'Yǔ',
    degrees: ['6', '1̇', '2̇', '3̇', '5̇', '6̇'],
    characteristic: 'Rooted on La (6). Soft, sorrowful, poetic, introspective.',
    emotionalFeel: 'Misty water towns, nocturnal moon reflections, melancholic beauty.'
  }
];
