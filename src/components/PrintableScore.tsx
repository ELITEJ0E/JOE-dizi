import React from 'react';
import { Song, DiziNote } from '../types/dizi';
import { groupScoreMeasures } from '../utils/scoreExport';

interface PrintableScoreProps {
  song: Song;
  notationMode: 'jianpu' | 'staff' | 'dual';
}

const letters = 'CDEFGAB';
function diatonicStep(note: DiziNote): number {
  return (Math.floor(note.midi / 12) - 5) * 7 + Math.max(0, letters.indexOf(note.pitch[0]));
}

function PrintableStaff({ notes }: { notes: DiziNote[] }) {
  const steps = notes.map(diatonicStep);
  const extraTop = Math.max(0, (Math.max(10, ...steps) - 10) * 4);
  const extraBottom = Math.max(0, (2 - Math.min(2, ...steps)) * 4);
  const height = 82 + extraTop + extraBottom;
  const bottomLineY = 54 + extraTop;
  return <svg viewBox={`0 0 276 ${height}`} className="print-staff" role="img" aria-label="Western staff notation">
    {[0, 8, 16, 24, 32].map(offset => <line key={offset} x1="6" x2="270" y1={bottomLineY - offset} y2={bottomLineY - offset} stroke="#454c47" strokeWidth="0.8" />)}
    <text x="8" y={bottomLineY + 5} fontSize="29" fontFamily="serif">𝄞</text>
    {notes.map((note, index) => {
      const x = 38 + (index + 0.5) * (228 / Math.max(1, notes.length));
      const y = bottomLineY - (diatonicStep(note) - 2) * 4;
      const ledgerLines: number[] = [];
      for (let ledger = bottomLineY - 40; ledger >= y; ledger -= 8) ledgerLines.push(ledger);
      for (let ledger = bottomLineY + 8; ledger <= y; ledger += 8) ledgerLines.push(ledger);
      const isHigh = y < bottomLineY - 16;
      return <g key={note.id}>
        {ledgerLines.map(line => <line key={line} x1={x - 8} x2={x + 8} y1={line} y2={line} stroke="#343b36" strokeWidth="0.8" />)}
        {/[#b]/.test(note.pitch) && <text x={x - 13} y={y + 3} fontSize="11">{note.pitch.includes('#') ? '♯' : '♭'}</text>}
        <ellipse cx={x} cy={y} rx="4.5" ry="3.4" fill="#1c2925" />
        <line x1={x + (isHigh ? -4 : 4)} x2={x + (isHigh ? -4 : 4)} y1={y} y2={y + (isHigh ? 21 : -21)} stroke="#1c2925" strokeWidth="1" />
      </g>;
    })}
  </svg>;
}

export const PrintableScore: React.FC<PrintableScoreProps> = ({ song, notationMode }) => {
  const measures = groupScoreMeasures(song.notes);
  return <article id="dizi-print-score" aria-label="Printable dizi music score">
    <header className="print-title">
      <div className="print-brand">✦ JOE DIZI · FLUTE STUDIO</div>
      <h1>{song.titleEn || song.titleZh || 'Untitled Score'}</h1>
      {song.titleZh && <div className="print-subtitle">{song.titleZh}</div>}
      <div className="print-meta">
        <span>{song.musicalKey}</span><span>{song.timeSignature}</span>
        <span>♩ = {song.bpm} BPM</span><span>{song.diziKey} Dizi</span>
        <span>{song.fingeringSystem.replace('tongyin_', '筒音作')}</span>
      </div>
    </header>
    <div className="print-measure-grid">
      {measures.map(measure => <section className="print-measure" key={measure.number}>
        <div className="print-measure-label">{measure.number} {measure.notes.find(note => note.chord)?.chord && <span className="print-chord">{measure.notes.find(note => note.chord)?.chord}</span>}</div>
        {Array.from({ length: Math.ceil(measure.notes.length / 14) }, (_, i) => measure.notes.slice(i * 14, (i + 1) * 14)).map((lineNotes, lineIndex) => <div key={lineIndex} className="print-note-line">
        {(notationMode === 'jianpu' || notationMode === 'dual') && <div className="print-jianpu">
          {lineNotes.map(note => <div key={note.id} className="print-note">
            {note.octaveDot > 0 && <div className="print-dots">{'•'.repeat(note.octaveDot)}</div>}
            <div className="print-digit">{note.jianpu}{note.isDotted ? '·' : ''}</div>
            {note.octaveDot < 0 && <div className="print-dots">{'•'.repeat(-note.octaveDot)}</div>}
            {note.duration <= 0.5 && <div className="print-beam" />}
            {note.duration <= 0.25 && <div className="print-beam" />}
            {note.lyric && <div className="print-lyric">{note.lyric}</div>}
          </div>)}
        </div>}
        {(notationMode === 'staff' || notationMode === 'dual') && <PrintableStaff notes={lineNotes} />}
        </div>)}
      </section>)}
    </div>
    {measures.length === 0 && <p>No notes in this score yet.</p>}
    <footer>JOE Dizi Studio · {measures.length} measures · {song.notes.length} notes</footer>
  </article>;
};
