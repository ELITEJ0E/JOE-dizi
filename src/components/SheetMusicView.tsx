import React from 'react';
import { Song, DiziNote, DiziKey, FingeringSystem } from '../types/dizi';
import { DIZI_TECHNIQUES } from '../music/diziTheory';

interface SheetMusicViewProps {
  song: Song;
  activeNoteIndex: number;
  notationMode: 'jianpu' | 'staff' | 'dual';
  diziKey: DiziKey;
  fingeringSystem: FingeringSystem;
  onSelectNote: (index: number) => void;
  className?: string;
}

export const SheetMusicView: React.FC<SheetMusicViewProps> = ({
  song,
  activeNoteIndex,
  notationMode = 'dual',
  diziKey,
  fingeringSystem,
  onSelectNote,
  className = ''
}) => {
  // Group notes by measures for structured musical layout
  const measuresMap = new Map<number, { notes: Array<{ note: DiziNote; originalIdx: number }>; chord?: string }>();

  song.notes.forEach((note, idx) => {
    if (!measuresMap.has(note.measureNumber)) {
      measuresMap.set(note.measureNumber, { notes: [], chord: note.chord });
    }
    const m = measuresMap.get(note.measureNumber)!;
    m.notes.push({ note, originalIdx: idx });
    if (!m.chord && note.chord) {
      m.chord = note.chord;
    }
  });

  const measures = Array.from(measuresMap.entries()).sort((a, b) => a[0] - b[0]);

  // We group measures into rows of 4 measures each, matching standard Chinese sheet music printing
  const measureRows: Array<typeof measures> = [];
  for (let i = 0; i < measures.length; i += 4) {
    measureRows.push(measures.slice(i, i + 4));
  }

  // Staff positions are DIATONIC, not semitone-proportional. The previous
  // implementation clamped most high dizi notes to the same y-coordinate.
  const diatonicStep = (pitch: string, midi: number) => {
    const letter = /^[A-G]/.exec(pitch)?.[0] || 'C';
    const stepInOctave = 'CDEFGAB'.indexOf(letter);
    return (Math.floor(midi / 12) - 5) * 7 + stepInOctave; // C4 = step 0
  };
  const highestStep = Math.max(10, ...song.notes.map(note => diatonicStep(note.pitch, note.midi)));
  const lowestStep = Math.min(2, ...song.notes.map(note => diatonicStep(note.pitch, note.midi)));
  const extraTop = Math.max(0, (highestStep - 10) * 5);
  const extraBottom = Math.max(0, (2 - lowestStep) * 5);
  const staffHeight = 76 + extraTop + extraBottom;
  const topStaffLine = 16 + extraTop;
  const bottomStaffLine = topStaffLine + 40;
  const getStaffY = (pitch: string, midi: number) => topStaffLine + (10 - diatonicStep(pitch, midi)) * 5;

  return (
    <div className={`relative xuan-paper rounded-xl shadow-2xl p-3 sm:p-8 text-[#1D2928] overflow-hidden select-none border border-[#E5DFD0] ${className}`}>
      {/* Decorative Ink Wash Mountain Watermark & Calligraphy header */}
      <div className="absolute top-0 right-0 w-80 sm:w-96 h-40 pointer-events-none opacity-45 overflow-hidden hidden sm:block">
        {/* Artistic SVG Ink Mountain Range & Moon */}
        <svg viewBox="0 0 400 160" className="w-full h-full">
          {/* Pale Moon */}
          <circle cx="280" cy="50" r="28" fill="#E6DECA" opacity="0.8" />
          {/* Distant mountain layer */}
          <path
            d="M 120 160 Q 180 80 230 110 T 310 70 Q 350 90 400 130 L 400 160 Z"
            fill="#C2B8A3"
            opacity="0.35"
          />
          {/* Midground mountain layer */}
          <path
            d="M 170 160 Q 230 65 270 95 T 350 60 Q 380 75 400 110 L 400 160 Z"
            fill="#8F8573"
            opacity="0.45"
          />
          {/* Foreground mountain ridge */}
          <path
            d="M 210 160 Q 260 90 290 120 T 370 85 Q 390 100 400 140 L 400 160 Z"
            fill="#4F4638"
            opacity="0.55"
          />
        </svg>
      </div>

      {/* Traditional Calligraphy Title Stamp & Seal */}
      <div className="absolute top-6 right-6 hidden sm:flex items-start gap-3 pointer-events-none">
        {/* Vertical Chinese Calligraphy Title */}
        <div className="text-right">
          <div className="font-calligraphy text-2xl font-bold tracking-widest text-[#242A28] leading-tight writing-vertical">
            {song.titleZh}
          </div>
          <div className="text-[10px] text-[#697472] font-serif tracking-wider mt-1">
            {song.artistZh}
          </div>
        </div>
        {/* Red Seal Stamps */}
        <div className="flex flex-col gap-1.5 pt-0.5">
          <div className="seal-stamp w-7 h-7 text-xs" title="印章">
            {song.sealName?.slice(0, 2) || '笛'}
          </div>
          <div className="seal-stamp w-5 h-5 text-[9px]">
            简
          </div>
        </div>
      </div>

      {/* Sheet Music Header Metadata */}
      <div className="mb-6 relative z-10">
        <h2 className="text-xl sm:text-3xl font-serif font-bold tracking-tight text-[#111A19]">
          {song.sections[0]?.name || song.titleEn || 'Transcription'}
        </h2>
        <div className="flex flex-wrap items-center gap-2 sm:gap-5 mt-2 text-sm font-serif font-medium text-[#3E4947]">
          <span className="font-bold">{song.musicalKey}</span>
          <span>{song.timeSignature}</span>
          <span className="flex items-center gap-1 font-mono text-xs">
            <span className="text-base font-serif">♩</span> = {song.bpm}
          </span>
          <span className="text-xs text-[#6A7876]">
            {diziKey} 调笛 · {fingeringSystem === 'tongyin_5' ? '筒音作5' : fingeringSystem === 'tongyin_2' ? '筒音作2' : '筒音作1'}
          </span>
        </div>
      </div>

      {/* Measures and Notation Rows */}
      <div className="space-y-10 relative z-10">
        {measureRows.map((rowMeasures, rowIdx) => (
          <div key={rowIdx} className="border-b border-[#DCD5C5] pb-6 last:border-b-0">
            {/* 1. Chords Row (aligned above measures) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 mb-2 px-1">
              {rowMeasures.map(([mNum, mData]) => (
                <div key={mNum} className="text-xs font-mono font-bold text-[#4B6960] tracking-wide">
                  {mData.chord ? `${mData.chord}` : ''}
                </div>
              ))}
            </div>

            {/* 2. Main Notation Row (Jianpu + Staff) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 border-l border-[#8E8675] border-r">
              {rowMeasures.map(([mNum, mData], colIdx) => (
                <div
                  key={mNum}
                  className={`relative flex flex-col justify-between px-2 py-1 ${
                    colIdx < rowMeasures.length - 1 ? 'border-r border-[#8E8675]' : ''
                  }`}
                >
                  {/* Measure Number Stamp */}
                  <span className="absolute -top-3.5 left-1 text-[9px] font-mono text-[#8C9895]">
                    {mNum}
                  </span>

                  {/* A. Jianpu Notation Section */}
                  {(notationMode === 'jianpu' || notationMode === 'dual') && (
                    <div className="flex items-center justify-around py-3">
                      {mData.notes.map(({ note, originalIdx }) => {
                        const isActive = originalIdx === activeNoteIndex;
                        const tech = note.technique ? DIZI_TECHNIQUES[note.technique] : null;

                        return (
                          <div
                            key={note.id}
                            onClick={() => onSelectNote(originalIdx)}
                            className={`relative flex flex-col items-center justify-center cursor-pointer px-1.5 py-1 rounded-md transition-all ${
                              isActive
                                ? 'bg-[#B4F45A]/35 ring-1 ring-[#36B39B]'
                                : 'hover:bg-black/5'
                            }`}
                            title={`Note: ${note.pitch} (${note.jianpu})`}
                          >
                            {/* Active Down Arrow Marker (as seen in screenshot) */}
                            {isActive && (
                              <div className="absolute -top-4 text-[#2BA388] text-[10px] animate-bounce">
                                ▼
                              </div>
                            )}

                            {/* Technique Symbol (e.g. ~, tr, ▾) */}
                            {tech && (
                              <span
                                className="absolute -top-2.5 text-[11px] font-serif font-bold text-[#8F3D1F]"
                                title={tech.nameZh}
                              >
                                {tech.symbol}
                              </span>
                            )}

                            {/* High Octave Dot(s) above digit */}
                            <div className="h-2 flex items-center justify-center">
                              {note.octaveDot > 0 && (
                                <div className="flex gap-0.5">
                                  {Array.from({ length: note.octaveDot }).map((_, i) => (
                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#1D2928]" />
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Main Jianpu Digit / Slur */}
                            <div className="relative flex items-center justify-center min-w-[20px]">
                              {/* Slur Curve Arc */}
                              {note.slurStart && (
                                <div className="absolute -top-2 left-1/2 w-8 h-2 border-t-2 border-[#3E4947] rounded-t-full pointer-events-none" />
                              )}

                              <span className="text-xl sm:text-2xl font-serif font-bold text-[#1D2928] leading-none">
                                {note.jianpu}
                              </span>

                              {/* Dotted note dot */}
                              {note.isDotted && (
                                <span className="text-lg font-bold ml-0.5 text-[#1D2928]">
                                  ·
                                </span>
                              )}
                            </div>

                            {/* Low Octave Dot(s) below digit */}
                            <div className="h-2 flex items-center justify-center">
                              {note.octaveDot < 0 && (
                                <div className="flex gap-0.5">
                                  {Array.from({ length: Math.abs(note.octaveDot) }).map((_, i) => (
                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#1D2928]" />
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Rhythm Underlines for 8th / 16th notes */}
                            <div className="w-full flex flex-col items-center gap-0.5 mt-0.5">
                              {note.duration <= 0.5 && (
                                <div className="w-full h-[1.5px] bg-[#1D2928]" />
                              )}
                              {note.duration <= 0.25 && (
                                <div className="w-full h-[1.5px] bg-[#1D2928]" />
                              )}
                            </div>

                            {/* Lyrics under note if present */}
                            {note.lyric && (
                              <span className="text-[11px] font-calligraphy text-[#44504E] mt-1">
                                {note.lyric}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* B. Western 5-Line Staff Notation Section */}
                  {(notationMode === 'staff' || notationMode === 'dual') && (
                    <div className="relative w-full mt-2" style={{ height: staffHeight }}>
                      <svg className="w-full h-full overflow-visible" role="img" aria-label="Treble staff with pitch-accurate notes and ledger lines">
                        {/* 5 Staff lines */}
                        {[0, 10, 20, 30, 40].map((offset, lIdx) => (
                          <line
                            key={lIdx}
                            x1="0"
                            y1={topStaffLine + offset}
                            x2="100%"
                            y2={topStaffLine + offset}
                            stroke="#5B6664"
                            strokeWidth="1"
                          />
                        ))}

                        {/* Treble Clef icon for the first measure */}
                        {colIdx === 0 && (
                          <text
                            x="4"
                            y={topStaffLine + 33}
                            fontSize="32"
                            fontFamily="serif"
                            fill="#1D2928"
                            className="select-none"
                          >
                            𝄞
                          </text>
                        )}

                        {/* Render notes on the staff */}
                        {mData.notes.map(({ note, originalIdx }, nIdx) => {
                          const isActive = originalIdx === activeNoteIndex;
                          const noteCount = mData.notes.length;
                          const xPercent = ((nIdx + 0.6) / noteCount) * 100;
                          const noteY = getStaffY(note.pitch, note.midi);
                          const ledgerYs: number[] = [];
                          for (let y = topStaffLine - 10; y >= noteY - 1; y -= 10) ledgerYs.push(y);
                          for (let y = bottomStaffLine + 10; y <= noteY + 1; y += 10) ledgerYs.push(y);
                          const stemDown = noteY < topStaffLine + 10;

                          return (
                            <g
                              key={note.id}
                              className="cursor-pointer"
                              onClick={() => onSelectNote(originalIdx)}
                            >
                              {/* Real ledger lines for notes beyond the staff */}
                              {ledgerYs.map(y => (
                                <line
                                  key={y}
                                  x1={`${xPercent - 5}%`}
                                  y1={y}
                                  x2={`${xPercent + 5}%`}
                                  y2={y}
                                  stroke="#1D2928"
                                  strokeWidth="1.2"
                                />
                              ))}

                              {/[#b]/.test(note.pitch) && <text x={`${xPercent - 7}%`} y={noteY + 3}
                                fontFamily="serif" fontSize="12" fill="#1D2928">{note.pitch.includes('#') ? '♯' : '♭'}</text>}

                              {/* Note head (quarter / eighth note) */}
                              <ellipse
                                cx={`${xPercent}%`}
                                cy={noteY}
                                rx="4.5"
                                ry="3.5"
                                fill={isActive ? '#36B39B' : '#1D2928'}
                              />

                              {/* Note Stem */}
                              <line
                                x1={`${xPercent + (stemDown ? -4 : 4)}%`}
                                y1={noteY}
                                x2={`${xPercent + (stemDown ? -4 : 4)}%`}
                                y2={noteY + (stemDown ? 24 : -24)}
                                stroke={isActive ? '#36B39B' : '#1D2928'}
                                strokeWidth="1.2"
                              />
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
