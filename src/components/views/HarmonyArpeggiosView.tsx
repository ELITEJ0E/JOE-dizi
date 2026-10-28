import React, { useState } from 'react';
import { DiziKey, FingeringSystem } from '../../types/dizi';
import { findFingering } from '../../music/diziTheory';
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
  chord: string;
  degrees: string[];
  pitches: string[];
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
      name: 'G Major Pentatonic Arpeggio',
      nameZh: 'G调大五度琶音 (1 - 3 - 5 - 1̇)',
      chord: 'G',
      degrees: ['1', '3', '5', '1̇'],
      pitches: ['G5', 'B5', 'D6', 'G6'],
      description: 'The fundamental tonic arpeggio for G Bangdi. Bright, noble, and expansive.'
    },
    {
      name: 'D Major Triad Cascade',
      nameZh: 'D和弦分解琶音 (2 - #4 - 6 - 2̇)',
      chord: 'D',
      degrees: ['2', '#4', '6', '2̇'],
      pitches: ['A5', 'C#6', 'E6', 'A6'],
      description: 'Dominant tension resolution. Requires smooth finger movement on hole 5 and 6.'
    },
    {
      name: 'E Minor Modal Arpeggio',
      nameZh: 'E小调羽调琶音 (6̣ - 1 - 3 - 6)',
      chord: 'Em',
      degrees: ['6̣', '1', '3', '6'],
      pitches: ['E5', 'G5', 'B5', 'E6'],
      description: 'Poetic, gentle, evoking moonlit rivers and evening solitude.'
    },
    {
      name: 'C Major Lyrical Flow',
      nameZh: 'C和弦四度琶音 (4 - 6 - 1̇ - 4̇)',
      chord: 'C',
      degrees: ['4', '6', '1̇', '4̇'],
      pitches: ['C6', 'E6', 'G6', 'C7'],
      description: 'Subdominant progression. Common in modern pentatonic pop arrangements.'
    }
  ];

  const currentPattern = patterns[activePatternIndex];

  const handlePlayArpeggio = async (pat: ArpeggioPattern) => {
    if (isPlaying) return;
    setIsPlaying(true);

    for (const pitch of pat.pitches) {
      const fingering = findFingering(pitch, diziKey, fingeringSystem);
      if (fingering) {
        diziAudio.playNote(fingering.frequency, 0.45);
      }
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
                  {pat.chord}
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
                  {pat.pitches.join(' · ')}
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
          {currentPattern.pitches.map((pitch, pIdx) => {
            const fingering = findFingering(pitch, diziKey, fingeringSystem);
            return (
              <div
                key={pIdx}
                onClick={() => {
                  if (fingering) diziAudio.playNote(fingering.frequency, 0.8);
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
                  <DiziFingeringDiagram
                    holes={fingering?.holes || [1, 1, 1, 1, 1, 1]}
                    size="sm"
                  />
                </div>

                <span className="text-[11px] text-[#36B39B]">
                  {fingering?.registerZh || '急吹'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
