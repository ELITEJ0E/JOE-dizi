import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Song, DiziNote, DiziKey, FingeringSystem } from '../types/dizi';
import { DIZI_TECHNIQUES } from '../music/diziTheory';
import { useLanguage } from '../i18n/LanguageContext';

interface SheetMusicViewProps {
  song: Song;
  activeNoteIndex: number;
  notationMode: 'jianpu' | 'staff' | 'dual';
  diziKey: DiziKey;
  fingeringSystem: FingeringSystem;
  onSelectNote: (index: number) => void;
  followPlayback?: boolean;
  className?: string;
}

export const SheetMusicView: React.FC<SheetMusicViewProps> = ({
  song,
  activeNoteIndex,
  notationMode = 'dual',
  diziKey,
  fingeringSystem,
  onSelectNote,
  followPlayback = false,
  className = ''
}) => {
  const { t } = useLanguage();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetWidth, setSheetWidth] = useState(0);

  // Real container measurements matter: four dense measures at 100% zoom
  // would otherwise overlap inside the narrower score column.
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const resize = new ResizeObserver(entries => setSheetWidth(Math.round(entries[0].contentRect.width)));
    resize.observe(el);
    return () => resize.disconnect();
  }, []);

  const measures = useMemo(() => {
    const map = new Map<number, { notes: Array<{ note: DiziNote; originalIdx: number }>; chord?: string }>();
    song.notes.forEach((note, idx) => {
      if (!map.has(note.measureNumber)) map.set(note.measureNumber, { notes: [], chord: note.chord });
      const measure = map.get(note.measureNumber)!;
      measure.notes.push({ note, originalIdx: idx });
      if (!measure.chord && note.chord) measure.chord = note.chord;
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [song.notes]);

  // On phones the old 140px per measure forced two measures per row.
  // A denser proportional width keeps up to 3–4 measures (12–16 notes)
  // readable at 360–430px, instead of scattering 4–5 notes across a line.
  const measureMinWidth = (notes: number) =>
    sheetWidth < 640 ? Math.max(76, notes * 17 + 10) : Math.max(112, notes * 23 + 16);
  const measureRows = useMemo(() => {
    const rows: Array<typeof measures> = [];
    const available = Math.max(240, (sheetWidth || 750) - (sheetWidth >= 640 ? 42 : 18));
    let row: typeof measures = [];
    let used = 0;
    for (const measure of measures) {
      const width = measureMinWidth(measure[1].notes.length);
      if (row.length && (row.length >= (sheetWidth < 640 ? 6 : 8) || used + width > available)) {
        rows.push(row);
        row = [];
        used = 0;
      }
      row.push(measure);
      used += width;
    }
    if (row.length) rows.push(row);
    return rows;
  }, [measures, sheetWidth]);

  // Follow by notation row, not by each 30ms ornament: the highlighted note
  // stays in the viewport without fighting the user's vertical layout.
  useEffect(() => {
    if (!followPlayback || activeNoteIndex < 0) return;
    const frame = requestAnimationFrame(() => {
      const note = sheetRef.current?.querySelector<HTMLElement>(`[data-score-note="${activeNoteIndex}"]`);
      const row = note?.closest<HTMLElement>('[data-score-row]');
      const viewport = sheetRef.current?.closest<HTMLElement>('[data-score-scroll-viewport]');
      if (!note || !row || !viewport) return;

      const viewportRect = viewport.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const safeTop = viewportRect.top + Math.min(90, viewportRect.height * 0.18);
      const safeBottom = viewportRect.bottom - Math.min(90, viewportRect.height * 0.18);
      if (rowRect.top < safeTop || rowRect.bottom > safeBottom) {
        const offset = rowRect.top - (viewportRect.top + Math.min(68, viewportRect.height * 0.14));
        viewport.scrollBy({ top: offset, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      }

      const scroller = note.closest<HTMLElement>('[data-score-row-scroll]');
      if (!scroller) return;
      const noteRect = note.getBoundingClientRect();
      const clip = scroller.getBoundingClientRect();
      if (noteRect.left < clip.left + 16 || noteRect.right > clip.right - 16) {
        scroller.scrollBy({ left: noteRect.left - clip.left - clip.width * 0.35, behavior: 'auto' });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [activeNoteIndex, followPlayback, measureRows]);

  // Staff positions are DIATONIC, not semitone-proportional. The previous
  // implementation clamped most high dizi notes to the same y-coordinate.
  const diatonicStep = (pitch: string, midi: number) => {
    const letter = /^[A-G]/.exec(pitch)?.[0] || 'C';
    const stepInOctave = 'CDEFGAB'.indexOf(letter);
    return (Math.floor(midi / 12) - 5) * 7 + stepInOctave; // C4 = step 0
  };
  const highestStep = Math.max(10, ...song.notes.map(note => diatonicStep(note.pitch, note.midi)));
  const lowestStep = Math.min(2, ...song.notes.map(note => diatonicStep(note.pitch, note.midi)));
  const extraTop = Math.max(0, (highestStep - 10) * 4);
  const extraBottom = Math.max(0, (2 - lowestStep) * 4);
  const staffHeight = 60 + extraTop + extraBottom;
  const topStaffLine = 13 + extraTop;
  const bottomStaffLine = topStaffLine + 32;
  const getStaffY = (pitch: string, midi: number) => topStaffLine + (10 - diatonicStep(pitch, midi)) * 4;

  return (
    <div ref={sheetRef} className={`relative min-w-0 xuan-paper rounded-xl shadow-2xl p-3 sm:p-5 text-[#1D2928] overflow-hidden select-none border border-[#E5DFD0] ${className}`}>
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
      <div className="absolute top-4 right-4 hidden lg:flex items-start gap-2 pointer-events-none">
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
      <div className="mb-4 relative z-10 pr-8 lg:pr-20">
        <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-[#111A19] break-words">
          {song.sections[0]?.name || song.titleEn || t('Transcription', '转谱')}
        </h2>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1.5 text-xs sm:text-sm font-serif font-medium text-[#3E4947]">
          <span className="font-bold">{song.musicalKey}</span>
          <span>{song.timeSignature}</span>
          <span className="flex items-center gap-1 font-mono text-xs">
            <span className="text-base font-serif">♩</span> = {song.bpm}
          </span>
          <span className="text-xs text-[#6A7876]">
            {diziKey} {t('dizi', '调笛')} · {fingeringSystem === 'tongyin_5' ? '筒音作5' : fingeringSystem === 'tongyin_2' ? '筒音作2' : '筒音作1'}
          </span>
        </div>
      </div>

      {/* Measures and Notation Rows */}
      <div className="space-y-5 relative z-10">
        {measureRows.map((rowMeasures, rowIdx) => (
          <div key={`${rowMeasures[0][0]}-${rowIdx}`} data-score-row className="border-b border-[#DCD5C5] pb-4 last:border-b-0">
            <div data-score-row-scroll className="min-w-0 overflow-x-auto overflow-y-visible">
            <div style={{ minWidth: rowMeasures.reduce((sum, measure) => sum + measureMinWidth(measure[1].notes.length), 0) }}>
            {/* 1. Chords Row (aligned above measures) */}
            <div className="grid mb-1.5 sm:mb-2 px-1" style={{ gridTemplateColumns: rowMeasures.map(measure => `${measureMinWidth(measure[1].notes.length)}fr`).join(' ') }}>
              {rowMeasures.map(([mNum, mData]) => (
                <div key={mNum} className="text-xs font-mono font-bold text-[#4B6960] tracking-wide">
                  {mData.chord ? `${mData.chord}` : ''}
                </div>
              ))}
            </div>

            {/* 2. Main Notation Row (Jianpu + Staff) */}
            <div className="grid border-l border-[#8E8675] border-r" style={{ gridTemplateColumns: rowMeasures.map(measure => `${measureMinWidth(measure[1].notes.length)}fr`).join(' ') }}>
              {rowMeasures.map(([mNum, mData], colIdx) => (
                <div
                  key={mNum}
                  className={`relative flex min-w-0 flex-col justify-between px-0.5 sm:px-1.5 py-1 ${
                    colIdx < rowMeasures.length - 1 ? 'border-r border-[#8E8675]' : ''
                  }`}
                >
                  {/* Measure Number Stamp */}
                  <span className="absolute -top-3.5 left-1 text-[9px] font-mono text-[#8C9895]">
                    {mNum}
                  </span>

                  {/* A. Jianpu Notation Section */}
                  {(notationMode === 'jianpu' || notationMode === 'dual') && (
                    <div className="flex items-center justify-around py-1 sm:py-2">
                      {mData.notes.map(({ note, originalIdx }) => {
                        const isActive = originalIdx === activeNoteIndex;
                        const tech = note.technique ? DIZI_TECHNIQUES[note.technique] : null;

                        return (
                          <div
                            key={note.id}
                            data-score-note={originalIdx}
                            onClick={() => onSelectNote(originalIdx)}
                            className={`relative flex flex-col items-center justify-center cursor-pointer px-0.5 sm:px-1 py-0.5 sm:py-1 rounded-md transition-colors shrink-0 ${
                              isActive
                                ? 'bg-[#B4F45A]/35 ring-1 ring-[#36B39B]'
                                : 'hover:bg-black/5'
                            }`}
                            title={`Note: ${note.pitch} (${note.jianpu})${note.confidence !== undefined && note.confidence < 0.35 ? ' · Review uncertain pitch' : ''}`}
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
                            <div className="relative flex items-center justify-center min-w-[12px] sm:min-w-[20px]">
                              {/* Slur Curve Arc */}
                              {note.slurStart && (
                                <div className="absolute -top-2 left-1/2 w-8 h-2 border-t-2 border-[#3E4947] rounded-t-full pointer-events-none" />
                              )}

                              <span className="text-xl font-serif font-bold text-[#1D2928] leading-none">
                                {note.jianpu}
                              </span>
                              {note.confidence !== undefined && note.confidence < 0.35 && (
                                <span title="Low spectral separation — review against the audio" className="absolute -right-2.5 -top-2 text-xs font-bold text-amber-700">?</span>
                              )}

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
                              {note.duration <= 0.125 && (
                                <div className="w-full h-[1.5px] bg-[#1D2928]" />
                              )}
                              {note.duration <= 0.0625 && (
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
                    <div className="relative w-full mt-1" style={{ height: staffHeight }}>
                      <svg className="w-full h-full overflow-visible" role="img" aria-label="Treble staff with pitch-accurate notes and ledger lines">
                        {/* 5 Staff lines */}
                        {[0, 8, 16, 24, 32].map((offset, lIdx) => (
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
                            fontSize="26"
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
                          for (let y = topStaffLine - 8; y >= noteY - 1; y -= 8) ledgerYs.push(y);
                          for (let y = bottomStaffLine + 8; y <= noteY + 1; y += 8) ledgerYs.push(y);
                          const stemDown = noteY < topStaffLine + 8;

                          return (
                            <g
                              key={note.id}
                              data-score-note={originalIdx}
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
                                y2={noteY + (stemDown ? 20 : -20)}
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
