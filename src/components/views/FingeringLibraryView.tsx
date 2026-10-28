import React, { useState } from 'react';
import { DiziKey, FingeringSystem, BreathRegister, FingeringEntry } from '../../types/dizi';
import { getFingeringsFor, DIZI_KEYS_SPEC, calculateMusicalTonic } from '../../music/diziTheory';
import { DiziFingeringDiagram } from '../DiziFingeringDiagram';
import { diziAudio } from '../../audio/diziSynth';
import { Volume2, Filter, Info, Sparkles } from 'lucide-react';

interface FingeringLibraryViewProps {
  diziKey: DiziKey;
  onDiziKeyChange: (key: DiziKey) => void;
  fingeringSystem: FingeringSystem;
  onFingeringSystemChange: (sys: FingeringSystem) => void;
}

export const FingeringLibraryView: React.FC<FingeringLibraryViewProps> = ({
  diziKey,
  onDiziKeyChange,
  fingeringSystem,
  onFingeringSystemChange
}) => {
  const [selectedRegister, setSelectedRegister] = useState<BreathRegister | 'all'>('all');
  const [showAlternatives, setShowAlternatives] = useState<boolean>(true);

  const keys: DiziKey[] = ['G', 'D', 'C', 'F', 'A', 'E', 'Bb'];
  const systems: Array<{ id: FingeringSystem; name: string; tonicInfo: string }> = [
    { id: 'tongyin_5', name: '筒音作 5 (正调)', tonicInfo: '最常用指法，主音 1 为第三孔开' },
    { id: 'tongyin_2', name: '筒音作 2 (小工调)', tonicInfo: '抒情婉转，主音 1 为全开孔' },
    { id: 'tongyin_1', name: '筒音作 1 (乙字调)', tonicInfo: '筒音为主音，高昂豪迈' },
    { id: 'tongyin_6', name: '筒音作 6 (尺字调)', tonicInfo: '柔美如歌，多见于戏曲伴奏' },
    { id: 'tongyin_3', name: '筒音作 3 (六字调)', tonicInfo: '特殊调式，用于少数民族风格' },
  ];

  const keySpec = DIZI_KEYS_SPEC[diziKey];
  const allFingerings = getFingeringsFor(diziKey, fingeringSystem);

  const filteredFingerings = allFingerings.filter((f) => {
    if (selectedRegister !== 'all' && f.register !== selectedRegister) return false;
    if (!showAlternatives && f.alternative) return false;
    return true;
  });

  const handlePlayFingering = (f: FingeringEntry) => {
    diziAudio.playNote(f.frequency, 1.2);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Flute Key & Fingering System Selectors */}
      <div className="bg-[#111D20] border border-[#1A2E33] rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1A2E33]">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#F3F5F4] flex items-center gap-2">
              <span>Interactive Fingering Library</span>
              <span className="text-sm font-calligraphy text-[#36B39B]">笛子传统六孔全指法图谱</span>
            </h2>
            <p className="text-xs text-[#94A3A7] mt-1">
              Verified traditional six-hole fingering charts with breath velocity registers and alternate fork fingerings (叉口).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Dizi Key Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#94A3A7]">Key 笛调:</span>
              <div className="flex bg-[#0E171A] p-0.5 rounded-lg border border-[#1A2E33]">
                {keys.map((k) => (
                  <button
                    key={k}
                    onClick={() => onDiziKeyChange(k)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                      diziKey === k
                        ? 'bg-[#B4F45A] text-[#0B1014] font-bold shadow-sm'
                        : 'text-[#94A3A7] hover:text-[#F3F5F4]'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            {/* Fingering System Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#94A3A7]">System 指法:</span>
              <select
                value={fingeringSystem}
                onChange={(e) => onFingeringSystemChange(e.target.value as FingeringSystem)}
                className="bg-[#0E171A] border border-[#1A2E33] rounded-lg px-2.5 py-1 text-xs text-[#F3F5F4] focus:outline-none focus:border-[#36B39B]"
              >
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Current Instrument Info Banner */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-[#0E171A] p-3 rounded-lg border border-[#1A2E33]/70">
            <span className="text-[#94A3A7] block text-[11px]">Instrument Model 乐器形制</span>
            <span className="font-bold text-[#F3F5F4] text-sm mt-0.5 block">
              {keySpec.nameZh} ({keySpec.typeZh})
            </span>
            <span className="text-[11px] text-[#6E7E81] mt-0.5 block">{keySpec.description}</span>
          </div>

          <div className="bg-[#0E171A] p-3 rounded-lg border border-[#1A2E33]/70">
            <span className="text-[#94A3A7] block text-[11px]">Tonic & Sounding Key 本调唱名</span>
            <span className="font-bold text-[#B4F45A] text-sm mt-0.5 block">
              {calculateMusicalTonic(diziKey, fingeringSystem)}
            </span>
            <span className="text-[11px] text-[#6E7E81] mt-0.5 block">
              筒音音高: {keySpec.tongyinPitch} · 3孔音高: {keySpec.thirdHolePitch}
            </span>
          </div>

          <div className="bg-[#0E171A] p-3 rounded-lg border border-[#1A2E33]/70">
            <span className="text-[#94A3A7] block text-[11px]">Register Filters 气息音区过滤</span>
            <div className="flex items-center gap-1.5 mt-1.5">
              {(['all', 'low', 'medium', 'high'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRegister(r)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    selectedRegister === r
                      ? 'bg-[#36B39B] text-[#0B1014] font-bold'
                      : 'bg-[#16272C] text-[#94A3A7] hover:text-[#F3F5F4]'
                  }`}
                >
                  {r === 'all' ? 'All 全部' : r === 'low' ? '缓吹 (低)' : r === 'medium' ? '急吹 (中)' : '超吹 (高)'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Fingering Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filteredFingerings.map((entry, idx) => {
          return (
            <div
              key={`${entry.pitch}_${idx}`}
              onClick={() => handlePlayFingering(entry)}
              className="bg-[#111D20] border border-[#1A2E33] hover:border-[#36B39B] rounded-xl p-3 flex flex-col justify-between items-center text-center cursor-pointer group transition-all hover:-translate-y-0.5 shadow-md"
            >
              {/* Pitch and Jianpu badge */}
              <div className="w-full flex items-center justify-between pb-2 border-b border-[#1A2E33]/60">
                <span className="font-mono font-extrabold text-lg text-[#B4F45A] group-hover:text-[#c3f77a]">
                  {entry.pitch}
                </span>

                <div className="flex items-center gap-1">
                  <span className="font-serif font-bold text-base text-[#F3F5F4]">
                    {entry.jianpuDegree}
                    {entry.octaveDot > 0 ? '̇' : entry.octaveDot < 0 ? '̣' : ''}
                  </span>
                  {entry.alternative && (
                    <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px]">
                      叉口
                    </span>
                  )}
                </div>
              </div>

              {/* Realistic 6-hole Flute SVG */}
              <div className="my-2 py-1">
                <DiziFingeringDiagram holes={entry.holes} size="sm" />
              </div>

              {/* Breath Register & Play CTA */}
              <div className="w-full pt-2 border-t border-[#1A2E33]/60 flex items-center justify-between">
                <span className="text-[11px] text-[#36B39B] font-medium">
                  {entry.registerZh}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayFingering(entry);
                  }}
                  className="p-1 rounded bg-[#16272C] hover:bg-[#1F3D3D] text-[#B4F45A] transition-colors"
                  title="Audition Note"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
