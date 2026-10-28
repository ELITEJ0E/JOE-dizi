import React, { useState } from 'react';
import { DiziKey, FingeringSystem } from '../types/dizi';
import { diziAudio } from '../audio/diziSynth';
import { X, Sliders, Volume2, Sparkles, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  diziKey: DiziKey;
  onDiziKeyChange: (key: DiziKey) => void;
  fingeringSystem: FingeringSystem;
  onFingeringSystemChange: (sys: FingeringSystem) => void;
  notationMode: 'jianpu' | 'staff' | 'dual';
  onNotationModeChange: (mode: 'jianpu' | 'staff' | 'dual') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  diziKey,
  onDiziKeyChange,
  fingeringSystem,
  onFingeringSystemChange,
  notationMode,
  onNotationModeChange
}) => {
  const [membraneResonance, setMembraneResonance] = useState<number>(
    Math.round(diziAudio.membraneResonance * 100)
  );

  if (!isOpen) return null;

  const handleMembraneChange = (val: number) => {
    setMembraneResonance(val);
    diziAudio.membraneResonance = val / 100;
  };

  const handleTestSound = () => {
    diziAudio.playNote(783.99, 1.2, 'dieyin'); // G5 with dieyin
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="bg-[#111D20] border border-[#1A2E33] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1A2E33]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#B4F45A]" />
            <h3 className="text-base font-serif font-bold text-[#F3F5F4]">
              Studio & Dizi Sound Settings (笛韵设置)
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#94A3A7] hover:text-[#F3F5F4] hover:bg-[#16272C]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 text-xs">
          {/* 1. Dimo Membrane Resonance Level */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#F3F5F4]">
                Dimo (笛膜) Membrane Buzzing Timbre
              </span>
              <span className="font-mono text-[#B4F45A] font-bold">
                {membraneResonance}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={membraneResonance}
              onChange={(e) => handleMembraneChange(Number(e.target.value))}
              className="w-full h-1.5 bg-[#0E171A] rounded-lg appearance-none cursor-pointer accent-[#B4F45A]"
            />
            <div className="flex justify-between text-[10px] text-[#6E7E81] font-mono">
              <span>Dry Wood (木质素音)</span>
              <span>Tight Dimo (紧膜)</span>
              <span>Vibrant Buzz (松透脆亮)</span>
            </div>
            <button
              onClick={handleTestSound}
              className="mt-1 flex items-center gap-1.5 px-3 py-1 rounded bg-[#16272C] text-[#B4F45A] text-[11px] hover:bg-[#1C333A] transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Audition Membrane Buzz (试听笛音)</span>
            </button>
          </div>

          {/* 2. Sheet Notation Preference */}
          <div className="space-y-2 pt-3 border-t border-[#1A2E33]">
            <span className="font-semibold text-[#F3F5F4] block">
              Default Sheet Notation View (记谱显示模式)
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(['jianpu', 'staff', 'dual'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => onNotationModeChange(m)}
                  className={`py-2 rounded-lg border text-center transition-all ${
                    notationMode === m
                      ? 'bg-[#16272C] border-[#B4F45A] text-[#B4F45A] font-bold'
                      : 'bg-[#0E171A] border-[#1A2E33] text-[#94A3A7] hover:text-[#F3F5F4]'
                  }`}
                >
                  {m === 'jianpu' ? 'Jianpu Only 简谱' : m === 'staff' ? 'Staff Only 五线谱' : 'Dual 双谱对照'}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Instrument Key */}
          <div className="space-y-2 pt-3 border-t border-[#1A2E33]">
            <span className="font-semibold text-[#F3F5F4] block">
              Flute Key Selection (当前笛调)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(['G', 'D', 'C', 'F', 'A', 'E', 'Bb'] as DiziKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => onDiziKeyChange(k)}
                  className={`px-3 py-1 rounded-md font-mono text-xs transition-colors ${
                    diziKey === k
                      ? 'bg-[#B4F45A] text-[#0B1014] font-bold'
                      : 'bg-[#0E171A] text-[#94A3A7] hover:text-[#F3F5F4] border border-[#1A2E33]'
                  }`}
                >
                  {k} 调
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0E171A] border-t border-[#1A2E33] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#B4F45A] text-[#0B1014] text-xs font-bold hover:bg-[#c3f77a] transition-all"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
