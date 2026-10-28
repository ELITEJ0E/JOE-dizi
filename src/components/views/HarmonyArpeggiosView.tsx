import React, { useState } from 'react';
import { DiziKey, FingeringSystem } from '../../types/dizi';
import { findFingering, jianpuDegreeToMidi, midiToFrequency, midiToPitchName } from '../../music/diziTheory';
import { DiziFingeringDiagram } from '../DiziFingeringDiagram';
import { diziAudio } from '../../audio/diziSynth';
import { Play, Volume2, Sparkles, Layers } from 'lucide-react';

interface HarmonyArpeggiosViewProps {
  diziKey: DiziKey;
  fingeringSystem: FingeringSystem;
}

interface ArpeggioPattern {
  name: string;
  nameZh: string;
  minor?: boolean;
  degrees: string[];
  description: string;
}

export const HarmonyArpeggiosView: React.FC<HarmonyArpeggiosViewProps> = ({
  diziKey,
  fingeringSystem
}) => {
  const [activePatternIndex, setActivePatternIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const patterns: ArpeggioPattern[] = [
    {
      name: 'Tonic Major Arpeggio',
      nameZh: '主音大三和弦 (1 - 3 - 5 - 1̇)',
      degrees: ['1', '3', '5', '1̇'],
      description: 'The tonic major arpeggio for the selected dizi key. Bright, noble, and expansive.'
    },
    {
      name: 'Second Degree Major Cascade',
      nameZh: '二级大三和弦 (2 - #4 - 6 - 2̇)',
      degrees: ['2', '#4', '6', '2̇'],
      description: 'Dominant tension resolution. Requires smooth finger movement on hole 5 and 6.'
    },
    {
      name: 'Relative Minor Arpeggio',
      nameZh: '羽调小三和弦 (6̣ - 1 - 3 - 6)',
      minor: true,
      degrees: ['6̣', '1', '3', '6'],
      description: 'Poetic, gentle, evoking moonlit rivers and evening solitude.'
    },
    {
      name: 'Subdominant Major Flow',
      nameZh: '下属大三和弦 (4 - 6 - 1̇ - 4̇)',
      degrees: ['4', '6', '1̇', '4̇'],
      description: 'Subdominant progression. Common in modern pentatonic pop arrangements.'
    }
  ];

  const currentPattern = patterns[activePatternIndex];
  const pitchOf = (degree: string) => {
    const midi = jianpuDegreeToMidi(degree, diziKey, fingeringSystem);
    return { midi, pitch: midi === null ? '—' : midiToPitchName(midi, diziKey) };
  };
  const chordOf = (pattern: ArpeggioPattern) => `${pitchOf(pattern.degrees[0]).pitch.replace(/-?\d+$/, '')}${pattern.minor ? 'm' : ''}`;

  const handlePlayArpeggio = async (pat: ArpeggioPattern) => {
    if (isPlaying) return;
    setIsPlaying(true);

    for (const degree of pat.degrees) {
      const { midi } = pitchOf(degree);
      if (midi !== null) diziAudio.playNote(midiToFrequency(midi), 0.45);
      await new Promise(r => setTimeout(r, 420));
    }

    setIsPlaying(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A2E33]">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#F3F5F4] flex items-center gap-2">
            <span>Harmony & Arpeggio Studio</span>
            <span className="text-sm font-calligraphy text-[#36B39B]">笛子和声琶音与重奏训练</span>
          </h2>
          <p className="text-xs text-[#94A3A7] mt-1">
            Master rapid chord tone arpeggios and multi-flute counter-melodies across registers.
          </p>
        </div>

        <button
          onClick={() => handlePlayArpeggio(currentPattern)}
          disabled={isPlaying}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#B4F45A] text-[#0B1014] text-xs font-bold hover:bg-[#c3f77a] transition-all disabled:opacity-50 shadow-md shrink-0"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isPlaying ? 'Playing Arpeggio...' : 'Play Arpeggio'}</span>
        </button>
      </div>

      {/* 2. Patterns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {patterns.map((pat, idx) => {
          const isSelected = idx === activePatternIndex;
          return (
            <div
              key={idx}
              onClick={() => setActivePatternIndex(idx)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-[#122527] border-[#36B39B] shadow-md'
                  : 'bg-[#111D20] border-[#1A2E33] hover:border-[#1F3D3D]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#B4F45A] px-2 py-0.5 rounded bg-[#16272C]">
                  {chordOf(pat)}
                </span>
                <span className="text-xs text-[#94A3A7] font-mono">
                  {pat.degrees.join(' - ')}
                </span>
              </div>

              <h4 className="text-sm font-semibold text-[#F3F5F4] mt-3">
                {pat.nameZh}
              </h4>
              <p className="text-[11px] text-[#94A3A7] mt-1 line-clamp-2">
                {pat.description}
              </p>

              <div className="mt-4 pt-3 border-t border-[#1A2E33]/60 flex items-center justify-between">
                <span className="text-xs font-mono text-[#36B39B]">
                  {pat.degrees.map(degree => pitchOf(degree).pitch).join(' · ')}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayArpeggio(pat);
                  }}
                  className="p-1 rounded bg-[#16272C] hover:bg-[#1F3D3D] text-[#B4F45A]"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Chord Tone Fingering Inspection */}
      <div className="bg-[#111D20] border border-[#1A2E33] rounded-xl p-6">
        <h3 className="text-base font-serif font-bold text-[#F3F5F4] mb-4">
          Fingering Sequence for {currentPattern.name}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {currentPattern.degrees.map((degree, pIdx) => {
            const { pitch, midi } = pitchOf(degree);
            const fingering = findFingering(pitch, diziKey, fingeringSystem);
            return (
              <div
                key={pIdx}
                onClick={() => {
                  if (midi !== null) diziAudio.playNote(midiToFrequency(midi), 0.8);
                }}
                className="bg-[#0E171A] border border-[#1A2E33] hover:border-[#36B39B] rounded-xl p-4 flex flex-col items-center cursor-pointer transition-all"
              >
                <span className="text-xs font-mono text-[#94A3A7]">Tone {pIdx + 1}</span>
                <span className="text-2xl font-bold font-mono text-[#B4F45A] my-1">
                  {pitch}
                </span>
                <span className="text-base font-serif font-bold text-[#F3F5F4]">
                  {currentPattern.degrees[pIdx]}
                </span>

                <div className="my-2">
                  {fingering ? <DiziFingeringDiagram holes={fingering.holes} size="sm" /> : <span className="flex min-h-28 items-center text-center text-xs text-amber-200">No verified fingering</span>}
                </div>

                <span className="text-[11px] text-[#36B39B]">
                  {fingering?.registerZh || 'Pitch preview only'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
