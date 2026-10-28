import React from 'react';
import { DiziKey, FingeringSystem, DiziNote, SixHoles } from '../types/dizi';
import { DiziFingeringDiagram } from './DiziFingeringDiagram';
import { findFingering, DIZI_TECHNIQUES, getFingeringsFor } from '../music/diziTheory';
import { Volume2, Sparkles, HelpCircle } from 'lucide-react';
import { diziAudio } from '../audio/diziSynth';

interface LiveFingeringPanelProps {
  currentNote: DiziNote | null;
  nextNote: DiziNote | null;
  diziKey: DiziKey;
  fingeringSystem: FingeringSystem;
  className?: string;
}

export const LiveFingeringPanel: React.FC<LiveFingeringPanelProps> = ({
  currentNote,
  nextNote,
  diziKey,
  fingeringSystem,
  className = ''
}) => {
  // Compute fingering for current note
  const targetPitch = currentNote?.pitch || 'D5';
  const fingering = findFingering(targetPitch, diziKey, fingeringSystem);
  const nextFingering = nextNote ? findFingering(nextNote.pitch, diziKey, fingeringSystem) : null;

  const holes: SixHoles = fingering?.holes || [1, 1, 1, 1, 1, 1];
  const nextHoles: SixHoles = nextFingering?.holes || [0, 1, 1, 1, 1, 1];

  // Find alternative fingerings for this note if any exist
  const allFingerings = getFingeringsFor(diziKey, fingeringSystem);
  const alternatives = allFingerings.filter(
    f => f.pitch === targetPitch && f.alternative
  );

  // Technique info for current note
  const tech = currentNote?.technique ? DIZI_TECHNIQUES[currentNote.technique] : DIZI_TECHNIQUES.dieyin;

  const handlePlayCurrentNote = () => {
    if (fingering) {
      diziAudio.playNote(fingering.frequency, 1.2, currentNote?.technique);
    }
  };

  return (
    <div className={`bg-[#111D20] border border-[#1A2E33] rounded-xl p-5 flex flex-col justify-between select-none ${className}`}>
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[#1A2E33]/60 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[#F3F5F4] tracking-wide">
              Live Fingering
            </h3>
            <span className="text-[11px] text-[#94A3A7] font-mono">
              实时指法
            </span>
          </div>

          <button
            onClick={handlePlayCurrentNote}
            className="p-1.5 rounded-lg bg-[#16272C] hover:bg-[#1C333A] text-[#B4F45A] transition-colors"
            title="Audition Note"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>

        {/* Main Central Layout: Dizi Diagram on Left + Pitch Info on Right */}
        <div className="grid grid-cols-12 gap-3 items-center">
          {/* Vertical Dizi Flute Diagram */}
          <div className="col-span-5 flex justify-center py-1">
            <DiziFingeringDiagram holes={holes} size="md" />
          </div>

          {/* Right Pitch Details */}
          <div className="col-span-7 flex flex-col justify-center space-y-3.5 pl-1">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[#94A3A7] font-mono">
                Pitch / 音高
              </div>
              <div className="text-4xl font-extrabold text-[#B4F45A] font-mono tracking-tight flex items-baseline gap-2 mt-0.5">
                {currentNote?.pitch || fingering?.pitch || 'D5'}
                <span className="text-sm font-normal text-[#94A3A7]">
                  {Math.round(fingering?.frequency || 587)} Hz
                </span>
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-[#94A3A7] font-mono">
                Jianpu / 简谱唱名
              </div>
              <div className="text-xl font-bold text-[#F3F5F4] font-serif flex items-center gap-2 mt-0.5">
                <span>Jianpu</span>
                <span className="text-2xl text-[#36B39B] font-bold">
                  {currentNote?.jianpu || fingering?.jianpuDegree || '5'}
                </span>
                {fingering?.octaveDot ? (
                  <span className="text-xs text-[#94A3A7]">
                    ({fingering.octaveDot > 0 ? '高音区' : '低音区'})
                  </span>
                ) : null}
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-[#94A3A7] font-mono">
                Breath Control / 气息
              </div>
              <div className="text-sm font-medium text-[#F3F5F4] flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-[#36B39B]" />
                <span>
                  Breath:{' '}
                  {fingering?.register === 'low'
                    ? 'Low (缓吹)'
                    : fingering?.register === 'high'
                    ? 'High (超吹)'
                    : 'Medium (急吹)'}
                </span>
              </div>
            </div>

            {/* Hole Legend */}
            <div className="pt-2 border-t border-[#1A2E33]/60 flex items-center gap-3 text-xs text-[#94A3A7]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0D1114] border border-[#283B42] inline-block" />
                <span>Closed 按闭</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FAF5E8] border border-[#524334] inline-block" />
                <span>Open 开放</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Technique Card + Upcoming Note */}
      <div className="space-y-3 mt-4 pt-3 border-t border-[#1A2E33]">
        {/* Chinese Dizi Technique Card */}
        <div className="bg-[#0E171A] border border-[#1A2E33] rounded-lg p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#F3F5F4] mb-1">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#B4F45A]" />
              <span>Technique: {tech.nameZh}</span>
            </span>
            <span className="text-sm font-serif font-bold text-[#B4F45A]">
              {tech.symbol}
            </span>
          </div>

          <div className="text-xs text-[#36B39B] font-medium mb-1">
            {tech.nameEn}
          </div>

          <p className="text-[11px] text-[#94A3A7] leading-relaxed">
            {tech.description}
          </p>
        </div>

        {/* Upcoming Note Preview */}
        {nextNote && (
          <div className="bg-[#0E171A]/70 border border-[#1A2E33]/60 rounded-lg px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#94A3A7]">Next:</span>
              <span className="text-xs font-mono font-bold text-[#B4F45A]">
                {nextNote.pitch} ({nextNote.jianpu})
              </span>
            </div>

            <DiziFingeringDiagram holes={nextHoles} isCompact={true} />
          </div>
        )}

        {/* Alternative Fingering notification if available */}
        {alternatives.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#36B39B]">
            <HelpCircle className="w-3 h-3 shrink-0" />
            <span>Alternate fingering (叉口) available</span>
          </div>
        )}
      </div>
    </div>
  );
};
