import React, { useState } from 'react';
import { DiziKey, FingeringSystem } from '../../types/dizi';
import { CHINESE_MODES, ChineseMode, findFingering } from '../../music/diziTheory';
import { DiziFingeringDiagram } from '../DiziFingeringDiagram';
import { diziAudio } from '../../audio/diziSynth';
import { Play, Sparkles, Music2, BookOpen } from 'lucide-react';

interface ScalesModesViewProps {
  diziKey: DiziKey;
  fingeringSystem: FingeringSystem;
}

export const ScalesModesView: React.FC<ScalesModesViewProps> = ({
  diziKey,
  fingeringSystem
}) => {
  const [selectedModeId, setSelectedModeId] = useState<string>('gong');
  const [isPlayingScale, setIsPlayingScale] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);

  const currentMode = CHINESE_MODES.find(m => m.id === selectedModeId) || CHINESE_MODES[0];

  // Play full scale up and down
  const handlePlayScale = async () => {
    if (isPlayingScale) return;
    setIsPlayingScale(true);

    const degrees = currentMode.degrees;
    // Ascend then descend
    const sequence = [...degrees, ...degrees.slice(0, -1).reverse()];

    for (let i = 0; i < sequence.length; i++) {
      setActiveStepIndex(i);
      const degree = sequence[i];
      // Map degree to pitch based on G dizi (or active key)
      const pitchMap: Record<string, string> = {
        '1': 'G5', '2': 'A5', '3': 'B5', '4': 'C6', '5': 'D6', '6': 'E6', '7': 'F#6',
        '1̇': 'G6', '2̇': 'A6', '3̇': 'B6', '4̇': 'C7', '5̇': 'D7', '6̇': 'E7'
      };
      const pitch = pitchMap[degree] || 'G5';
      const fingering = findFingering(pitch, diziKey, fingeringSystem);
      if (fingering) {
        diziAudio.playNote(fingering.frequency, 0.45);
      }
      await new Promise(r => setTimeout(r, 480));
    }

    setActiveStepIndex(-1);
    setIsPlayingScale(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A2E33]">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#F3F5F4] flex items-center gap-2">
            <span>Chinese Scales & Pentatonic Modes</span>
            <span className="text-sm font-calligraphy text-[#36B39B]">中国传统五声音阶与调式</span>
          </h2>
          <p className="text-xs text-[#94A3A7] mt-1">
            Explore 宫 (Gong), 商 (Shang), 角 (Jue), 徵 (Zhi), and 羽 (Yu) modes. Learn how traditional Chinese modal tonality shapes emotional colors in Dizi solo works.
          </p>
        </div>

        <button
          onClick={handlePlayScale}
          disabled={isPlayingScale}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#B4F45A] text-[#0B1014] text-xs font-bold hover:bg-[#c3f77a] transition-all disabled:opacity-50 shadow-md shrink-0"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isPlayingScale ? 'Playing Mode...' : 'Play Scale Demo'}</span>
        </button>
      </div>

      {/* 2. Mode Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {CHINESE_MODES.map((mode) => {
          const isSelected = mode.id === selectedModeId;
          return (
            <button
              key={mode.id}
              onClick={() => setSelectedModeId(mode.id)}
              className={`p-4 rounded-xl text-left border transition-all ${
                isSelected
                  ? 'bg-[#122527] border-[#36B39B] shadow-md'
                  : 'bg-[#111D20] border-[#1A2E33] hover:border-[#1F3D3D]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-serif font-bold text-[#F3F5F4]">
                  {mode.namePinyin}
                </span>
                <span
                  className={`text-xs font-calligraphy font-bold ${
                    isSelected ? 'text-[#B4F45A]' : 'text-[#94A3A7]'
                  }`}
                >
                  {mode.nameZh.slice(0, 1)}
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#36B39B] mt-1">
                {mode.degrees.join(' - ')}
              </div>
              <div className="text-[11px] text-[#94A3A7] mt-2 line-clamp-2">
                {mode.characteristic}
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Detailed Modal Inspection & Step-by-Step Fingering Grid */}
      <div className="bg-[#111D20] border border-[#1A2E33] rounded-xl p-6 space-y-6">
        <div>
          <h3 className="text-lg font-serif font-bold text-[#F3F5F4]">
            {currentMode.nameZh}
          </h3>
          <p className="text-xs text-[#94A3A7] mt-1">
            {currentMode.characteristic} — <span className="text-[#36B39B]">{currentMode.emotionalFeel}</span>
          </p>
        </div>

        {/* Degrees Step Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {currentMode.degrees.map((deg, idx) => {
            const pitchMap: Record<string, string> = {
              '1': 'G5', '2': 'A5', '3': 'B5', '4': 'C6', '5': 'D6', '6': 'E6', '7': 'F#6',
              '1̇': 'G6', '2̇': 'A6', '3̇': 'B6', '4̇': 'C7', '5̇': 'D7', '6̇': 'E7'
            };
            const targetPitch = pitchMap[deg] || 'G5';
            const fingering = findFingering(targetPitch, diziKey, fingeringSystem);
            const isStepActive = activeStepIndex === idx;

            return (
              <div
                key={idx}
                onClick={() => {
                  if (fingering) diziAudio.playNote(fingering.frequency, 0.8);
                }}
                className={`bg-[#0E171A] border rounded-xl p-3 flex flex-col items-center cursor-pointer transition-all ${
                  isStepActive
                    ? 'border-[#B4F45A] shadow-[0_0_12px_rgba(180,244,90,0.3)] bg-[#122527]'
                    : 'border-[#1A2E33] hover:border-[#36B39B]'
                }`}
              >
                <span className="text-[11px] font-mono text-[#94A3A7]">Step {idx + 1}</span>
                <span className="text-3xl font-serif font-extrabold text-[#B4F45A] my-1">
                  {deg}
                </span>
                <span className="text-xs font-mono text-[#F3F5F4]">
                  {targetPitch}
                </span>

                <div className="my-2">
                  <DiziFingeringDiagram
                    holes={fingering?.holes || [1, 1, 1, 1, 1, 1]}
                    size="sm"
                  />
                </div>

                <span className="text-[10px] text-[#36B39B] font-medium">
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
