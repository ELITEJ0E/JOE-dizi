import { Song, DiziNote } from '../types/dizi';

// Note ID generator helper
let idCounter = 1;
const nId = () => `note_${idCounter++}`;

export const PRESET_SONGS: Song[] = [
  {
    id: 'moon_over_the_pass',
    titleZh: '关山月',
    titleEn: 'Moon Over the Pass',
    artistZh: '李白诗意 / 汉代古琴曲传谱',
    artistEn: 'Ancient Melodies / Tang Dynasty Poetry',
    source: 'preset',
    sourceDetails: 'YouTube • Synced',
    diziKey: 'G',
    fingeringSystem: 'tongyin_5',
    musicalKey: '1 = G',
    timeSignature: '4/4',
    bpm: 92,
    sealName: '關山月',
    backgroundPoem: {
      text: '明月出天山，苍茫云海间。长风几万里，吹度玉门关。',
      dynasty: '唐代',
      poet: '李白'
    },
    sections: [
      { id: 'sec_intro', name: 'Intro', startMeasure: 1, endMeasure: 2, color: '#3A637B' },
      { id: 'sec_verse1', name: 'Verse 01', startMeasure: 3, endMeasure: 10, color: '#36B39B' },
      { id: 'sec_chorus', name: 'Chorus', startMeasure: 11, endMeasure: 18, color: '#9B6A3B' }
    ],
    totalMeasures: 18,
    notes: [
      // Measure 1 (Intro)
      { id: nId(), pitch: 'D5', midi: 74, jianpu: '5', octaveDot: -1, duration: 2, measureNumber: 1, beatInMeasure: 1, chord: 'G', lyric: '明' },
      { id: nId(), pitch: 'G5', midi: 79, jianpu: '1', octaveDot: 0, duration: 2, measureNumber: 1, beatInMeasure: 3, lyric: '月' },

      // Measure 2 (Intro)
      { id: nId(), pitch: 'A5', midi: 81, jianpu: '2', octaveDot: 0, duration: 2, measureNumber: 2, beatInMeasure: 1, chord: 'D', lyric: '出' },
      { id: nId(), pitch: 'B5', midi: 83, jianpu: '3', octaveDot: 0, duration: 2, measureNumber: 2, beatInMeasure: 3, technique: 'dieyin', lyric: '天' },

      // Measure 3 (Verse 01 starts - matches screenshot Line 1 Measure 1)
      { id: nId(), pitch: 'D5', midi: 74, jianpu: '5', octaveDot: -1, duration: 1, measureNumber: 3, beatInMeasure: 1, chord: 'G', lyric: '山' },
      { id: nId(), pitch: 'E5', midi: 76, jianpu: '6', octaveDot: -1, duration: 1, measureNumber: 3, beatInMeasure: 2 },
      { id: nId(), pitch: 'G5', midi: 79, jianpu: '1', octaveDot: 0, duration: 1, measureNumber: 3, beatInMeasure: 3 },
      { id: nId(), pitch: 'A6', midi: 93, jianpu: '2', octaveDot: 1, duration: 1, measureNumber: 3, beatInMeasure: 4, slurStart: true, lyric: '苍' },

      // Measure 4 (Verse 01 - Line 1 Measure 2)
      { id: nId(), pitch: 'B5', midi: 83, jianpu: '3', octaveDot: 0, duration: 1, measureNumber: 4, beatInMeasure: 1, chord: 'D', slurEnd: true, lyric: '茫' },
      { id: nId(), pitch: 'A5', midi: 81, jianpu: '2', octaveDot: 0, duration: 1, measureNumber: 4, beatInMeasure: 2 },
      { id: nId(), pitch: 'G5', midi: 79, jianpu: '1', octaveDot: 0, duration: 1, measureNumber: 4, beatInMeasure: 3, lyric: '云' },
      { id: nId(), pitch: 'E5', midi: 76, jianpu: '6', octaveDot: -1, duration: 1, measureNumber: 4, beatInMeasure: 4, lyric: '海' },

      // Measure 5 (Verse 01 - Line 1 Measure 3)
      { id: nId(), pitch: 'D5', midi: 74, jianpu: '5', octaveDot: -1, duration: 1, measureNumber: 5, beatInMeasure: 1, chord: 'Em', lyric: '间' },
      { id: nId(), pitch: 'E5', midi: 76, jianpu: '6', octaveDot: -1, duration: 1, measureNumber: 5, beatInMeasure: 2 },
      { id: nId(), pitch: 'G5', midi: 79, jianpu: '1', octaveDot: 0, duration: 1, measureNumber: 5, beatInMeasure: 3 },
      { id: nId(), pitch: 'A6', midi: 93, jianpu: '2', octaveDot: 1, duration: 1, measureNumber: 5, beatInMeasure: 4, slurStart: true },

      // Measure 6 (Verse 01 - Line 1 Measure 4)
      { id: nId(), pitch: 'B5', midi: 83, jianpu: '3', octaveDot: 0, duration: 1.5, isDotted: true, measureNumber: 6, beatInMeasure: 1, chord: 'C', slurEnd: true, lyric: '长' },
      { id: nId(), pitch: 'D5', midi: 74, jianpu: '5', octaveDot: -1, duration: 0.5, measureNumber: 6, beatInMeasure: 2.5, lyric: '风' },
      { id: nId(), pitch: 'B5', midi: 83, jianpu: '3', octaveDot: 0, duration: 1, measureNumber: 6, beatInMeasure: 3, lyric: '几' },
      { id: nId(), pitch: 'A5', midi: 81, jianpu: '2', octaveDot: 0, duration: 1, measureNumber: 6, beatInMeasure: 4, lyric: '万' },

      // Measure 7 (Verse 01 - Line 2 Measure 1)
      { id: nId(), pitch: 'G5', midi: 79, jianpu: '1', octaveDot: 0, duration: 1, measureNumber: 7, beatInMeasure: 1, chord: 'G', lyric: '里' },
      { id: nId(), pitch: 'A5', midi: 81, jianpu: '2', octaveDot: 0, duration: 1, measureNumber: 7, beatInMeasure: 2 },
      { id: nId(), pitch: 'B5', midi: 83, jianpu: '3', octaveDot: 0, duration: 1, measureNumber: 7, beatInMeasure: 3 },
      { id: nId(), pitch: 'D6', midi: 86, jianpu: '5', octaveDot: 0, duration: 1, measureNumber: 7, beatInMeasure: 4, technique: 'dieyin', lyric: '吹' },

      // Measure 8 (Verse 01 - Line 2 Measure 2)
      { id: nId(), pitch: 'E6', midi: 88, jianpu: '6', octaveDot: 0, duration: 1.5, isDotted: true, measureNumber: 8, beatInMeasure: 1, chord: 'D', slurStart: true, lyric: '度' },
      { id: nId(), pitch: 'D6', midi: 86, jianpu: '5', octaveDot: 0, duration: 0.5, measureNumber: 8, beatInMeasure: 2.5 },
      { id: nId(), pitch: 'B5', midi: 83, jianpu: '3', octaveDot: 0, duration: 1, measureNumber: 8, beatInMeasure: 3 },
      { id: nId(), pitch: 'A5', midi: 81, jianpu: '2', octaveDot: 0, duration: 1, measureNumber: 8, beatInMeasure: 4, slurEnd: true, lyric: '玉' },

      // Measure 9 (Verse 01 - Line 2 Measure 3)
      { id: nId(), pitch: 'G5', midi: 79, jianpu: '1', octaveDot: 0, duration: 1, measureNumber: 9, beatInMeasure: 1, chord: 'Em', lyric: '门' },
      { id: nId(), pitch: 'E5', midi: 76, jianpu: '6', octaveDot: -1, duration: 1, measureNumber: 9, beatInMeasure: 2 },
      { id: nId(), pitch: 'G5', midi: 79, jianpu: '1', octaveDot: 0, duration: 1, measureNumber: 9, beatInMeasure: 3 },
      { id: nId(), pitch: 'A6', midi: 93, jianpu: '2', octaveDot: 1, duration: 1, measureNumber: 9, beatInMeasure: 4, lyric: '关' },

      // Measure 10 (Verse 01 - Line 2 Measure 4)
      { id: nId(), pitch: 'B5', midi: 83, jianpu: '3', octaveDot: 0, duration: 1, measureNumber: 10, beatInMeasure: 1, chord: 'C', slurStart: true },
      { id: nId(), pitch: 'A5', midi: 81, jianpu: '2', octaveDot: 0, duration: 1, measureNumber: 10, beatInMeasure: 2, slurEnd: true },
      { id: nId(), pitch: 'G5', midi: 79, jianpu: '1', octaveDot: 0, duration: 2, measureNumber: 10, beatInMeasure: 3, technique: 'chanyin' },

      // Measure 11 (Chorus starts)
      { id: nId(), pitch: 'D6', midi: 86, jianpu: '5', octaveDot: 0, duration: 1.5, isDotted: true, measureNumber: 11, beatInMeasure: 1, chord: 'G', technique: 'tuyin', lyric: '汉' },
      { id: nId(), pitch: 'E6', midi: 88, jianpu: '6', octaveDot: 0, duration: 0.5, measureNumber: 11, beatInMeasure: 2.5, lyric: '下' },
      { id: nId(), pitch: 'D6', midi: 86, jianpu: '5', octaveDot: 0, duration: 1, measureNumber: 11, beatInMeasure: 3, lyric: '白' },
      { id: nId(), pitch: 'B5', midi: 83, jianpu: '3', octaveDot: 0, duration: 1, measureNumber: 11, beatInMeasure: 4, lyric: '登' },

      // Measure 12
      { id: nId(), pitch: 'A5', midi: 81, jianpu: '2', octaveDot: 0, duration: 2, measureNumber: 12, beatInMeasure: 1, chord: 'D', lyric: '道' },
      { id: nId(), pitch: 'G5', midi: 79, jianpu: '1', octaveDot: 0, duration: 2, measureNumber: 12, beatInMeasure: 3, technique: 'huayin' },

      // Measure 13
      { id: nId(), pitch: 'B5', midi: 83, jianpu: '3', octaveDot: 0, duration: 1, measureNumber: 13, beatInMeasure: 1, chord: 'Em', lyric: '胡' },
      { id: nId(), pitch: 'D6', midi: 86, jianpu: '5', octaveDot: 0, duration: 1, measureNumber: 13, beatInMeasure: 2, lyric: '窥' },
      { id: nId(), pitch: 'E6', midi: 88, jianpu: '6', octaveDot: 0, duration: 2, measureNumber: 13, beatInMeasure: 3, technique: 'chanyin', lyric: '青' },

      // Measure 14
      { id: nId(), pitch: 'D6', midi: 86, jianpu: '5', octaveDot: 0, duration: 4, measureNumber: 14, beatInMeasure: 1, chord: 'C', lyric: '海' },

      // Measure 15
      { id: nId(), pitch: 'A6', midi: 93, jianpu: '2', octaveDot: 1, duration: 1, measureNumber: 15, beatInMeasure: 1, chord: 'G', technique: 'dieyin', lyric: '由' },
      { id: nId(), pitch: 'B5', midi: 83, jianpu: '3', octaveDot: 0, duration: 1, measureNumber: 15, beatInMeasure: 2, lyric: '来' },
      { id: nId(), pitch: 'A5', midi: 81, jianpu: '2', octaveDot: 0, duration: 1, measureNumber: 15, beatInMeasure: 3, lyric: '征' },
      { id: nId(), pitch: 'G5', midi: 79, jianpu: '1', octaveDot: 0, duration: 1, measureNumber: 15, beatInMeasure: 4, lyric: '战' },

      // Measure 16
      { id: nId(), pitch: 'E5', midi: 76, jianpu: '6', octaveDot: -1, duration: 2, measureNumber: 16, beatInMeasure: 1, chord: 'D', lyric: '地' },
      { id: nId(), pitch: 'D5', midi: 74, jianpu: '5', octaveDot: -1, duration: 2, measureNumber: 16, beatInMeasure: 3 },

      // Measure 17
      { id: nId(), pitch: 'G5', midi: 79, jianpu: '1', octaveDot: 0, duration: 2, measureNumber: 17, beatInMeasure: 1, chord: 'C', lyric: '不' },
      { id: nId(), pitch: 'A5', midi: 81, jianpu: '2', octaveDot: 0, duration: 2, measureNumber: 17, beatInMeasure: 3, lyric: '见' },

      // Measure 18 (Outro tail)
      { id: nId(), pitch: 'G5', midi: 79, jianpu: '1', octaveDot: 0, duration: 4, measureNumber: 18, beatInMeasure: 1, chord: 'G', technique: 'zengyin', lyric: '人' }
    ]
  },
  {
    id: 'gusu_xing',
    titleZh: '姑苏行',
    titleEn: 'Trip to Gusu (Suzhou)',
    artistZh: '江先渭 作曲',
    artistEn: 'Jiang Xianwei (Jiangnan Sizhu Classic)',
    source: 'preset',
    sourceDetails: 'Audio Masterpiece',
    diziKey: 'C',
    fingeringSystem: 'tongyin_5',
    musicalKey: '1 = C',
    timeSignature: '4/4',
    bpm: 68,
    sealName: '姑蘇行',
    backgroundPoem: {
      text: '君到姑苏见，人家尽枕河。古宫闲地少，水巷小桥多。',
      dynasty: '唐代',
      poet: '杜荀鹤'
    },
    sections: [
      { id: 'gusu_s1', name: 'Adagio 散板与慢板', startMeasure: 1, endMeasure: 4, color: '#36B39B' },
      { id: 'gusu_s2', name: 'Allegro 快板', startMeasure: 5, endMeasure: 8, color: '#B4F45A' }
    ],
    totalMeasures: 8,
    notes: [
      { id: nId(), pitch: 'C5', midi: 60, jianpu: '1', octaveDot: 0, duration: 2, measureNumber: 1, beatInMeasure: 1, chord: 'C', technique: 'chanyin' },
      { id: nId(), pitch: 'E5', midi: 64, jianpu: '3', octaveDot: 0, duration: 1, measureNumber: 1, beatInMeasure: 3, technique: 'dieyin' },
      { id: nId(), pitch: 'G5', midi: 67, jianpu: '5', octaveDot: 0, duration: 1, measureNumber: 1, beatInMeasure: 4 },

      { id: nId(), pitch: 'A5', midi: 69, jianpu: '6', octaveDot: 0, duration: 1.5, isDotted: true, measureNumber: 2, beatInMeasure: 1, chord: 'Am' },
      { id: nId(), pitch: 'G5', midi: 67, jianpu: '5', octaveDot: 0, duration: 0.5, measureNumber: 2, beatInMeasure: 2.5 },
      { id: nId(), pitch: 'E5', midi: 64, jianpu: '3', octaveDot: 0, duration: 1, measureNumber: 2, beatInMeasure: 3 },
      { id: nId(), pitch: 'D5', midi: 62, jianpu: '2', octaveDot: 0, duration: 1, measureNumber: 2, beatInMeasure: 4, technique: 'huayin' },

      { id: nId(), pitch: 'C5', midi: 60, jianpu: '1', octaveDot: 0, duration: 1, measureNumber: 3, beatInMeasure: 1, chord: 'F' },
      { id: nId(), pitch: 'D5', midi: 62, jianpu: '2', octaveDot: 0, duration: 1, measureNumber: 3, beatInMeasure: 2 },
      { id: nId(), pitch: 'E5', midi: 64, jianpu: '3', octaveDot: 0, duration: 2, measureNumber: 3, beatInMeasure: 3, technique: 'chanyin' },

      { id: nId(), pitch: 'D5', midi: 62, jianpu: '2', octaveDot: 0, duration: 4, measureNumber: 4, beatInMeasure: 1, chord: 'G' },

      { id: nId(), pitch: 'E5', midi: 64, jianpu: '3', octaveDot: 0, duration: 1, measureNumber: 5, beatInMeasure: 1, chord: 'C', technique: 'tuyin' },
      { id: nId(), pitch: 'G5', midi: 67, jianpu: '5', octaveDot: 0, duration: 1, measureNumber: 5, beatInMeasure: 2, technique: 'tuyin' },
      { id: nId(), pitch: 'E5', midi: 64, jianpu: '3', octaveDot: 0, duration: 1, measureNumber: 5, beatInMeasure: 3, technique: 'tuyin' },
      { id: nId(), pitch: 'D5', midi: 62, jianpu: '2', octaveDot: 0, duration: 1, measureNumber: 5, beatInMeasure: 4 },

      { id: nId(), pitch: 'C5', midi: 60, jianpu: '1', octaveDot: 0, duration: 4, measureNumber: 6, beatInMeasure: 1, chord: 'C' }
    ]
  },
  {
    id: 'qinghua_ci',
    titleZh: '青花瓷',
    titleEn: 'Blue and White Porcelain',
    artistZh: '周杰伦 曲 / 方文山 词',
    artistEn: 'Jay Chou / Vincent Fang (Dizi Arrangement)',
    source: 'preset',
    sourceDetails: 'Suno AI Gen',
    diziKey: 'D',
    fingeringSystem: 'tongyin_5',
    musicalKey: '1 = D',
    timeSignature: '4/4',
    bpm: 78,
    sealName: '青花瓷',
    backgroundPoem: {
      text: '天青色等烟雨，而我在等你。炊烟袅袅升起，隔江千万里。',
      dynasty: '现代',
      poet: '方文山'
    },
    sections: [
      { id: 'qhc_verse', name: 'Verse 主歌', startMeasure: 1, endMeasure: 4, color: '#36B39B' },
      { id: 'qhc_chorus', name: 'Chorus 副歌', startMeasure: 5, endMeasure: 8, color: '#B4F45A' }
    ],
    totalMeasures: 8,
    notes: [
      { id: nId(), pitch: 'A4', midi: 57, jianpu: '5', octaveDot: -1, duration: 0.5, measureNumber: 1, beatInMeasure: 1, chord: 'D', lyric: '素' },
      { id: nId(), pitch: 'B4', midi: 59, jianpu: '6', octaveDot: -1, duration: 0.5, measureNumber: 1, beatInMeasure: 1.5, lyric: '胚' },
      { id: nId(), pitch: 'D5', midi: 62, jianpu: '1', octaveDot: 0, duration: 1, measureNumber: 1, beatInMeasure: 2, lyric: '勾' },
      { id: nId(), pitch: 'D5', midi: 62, jianpu: '1', octaveDot: 0, duration: 0.5, measureNumber: 1, beatInMeasure: 3, lyric: '勒' },
      { id: nId(), pitch: 'E5', midi: 64, jianpu: '2', octaveDot: 0, duration: 0.5, measureNumber: 1, beatInMeasure: 3.5, lyric: '出' },
      { id: nId(), pitch: 'D5', midi: 62, jianpu: '1', octaveDot: 0, duration: 1, measureNumber: 1, beatInMeasure: 4, lyric: '青' },

      { id: nId(), pitch: 'B4', midi: 59, jianpu: '6', octaveDot: -1, duration: 1, measureNumber: 2, beatInMeasure: 1, chord: 'Bm', lyric: '花' },
      { id: nId(), pitch: 'A4', midi: 57, jianpu: '5', octaveDot: -1, duration: 3, measureNumber: 2, beatInMeasure: 2, lyric: '色' },

      { id: nId(), pitch: 'F#5', midi: 66, jianpu: '3', octaveDot: 0, duration: 1, measureNumber: 3, beatInMeasure: 1, chord: 'G', lyric: '天' },
      { id: nId(), pitch: 'E5', midi: 64, jianpu: '2', octaveDot: 0, duration: 1, measureNumber: 3, beatInMeasure: 2, lyric: '青' },
      { id: nId(), pitch: 'D5', midi: 62, jianpu: '1', octaveDot: 0, duration: 1, measureNumber: 3, beatInMeasure: 3, lyric: '色' },
      { id: nId(), pitch: 'E5', midi: 64, jianpu: '2', octaveDot: 0, duration: 1, measureNumber: 3, beatInMeasure: 4, lyric: '等' },

      { id: nId(), pitch: 'F#5', midi: 66, jianpu: '3', octaveDot: 0, duration: 2, measureNumber: 4, beatInMeasure: 1, chord: 'A', lyric: '烟' },
      { id: nId(), pitch: 'E5', midi: 64, jianpu: '2', octaveDot: 0, duration: 2, measureNumber: 4, beatInMeasure: 3, lyric: '雨' }
    ]
  }
];
