import React from 'react';
import { DiziKey, FingeringSystem, DiziNote, SixHoles } from '../types/dizi';
import { DiziFingeringDiagram } from './DiziFingeringDiagram';
import { findFingering, DIZI_TECHNIQUES, getFingeringsFor, midiToFrequency, pitchNameToMidi } from '../music/diziTheory';
import { Volume2, Sparkles, HelpCircle } from 'lucide-react';
import { diziAudio } from '../audio/diziSynth';
import { useLanguage } from '../i18n/LanguageContext';

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
  const { t } = useLanguage();
  // Compute fingering for current note
  const targetPitch = currentNote?.pitch || '';
  const fingering = currentNote ? findFingering(targetPitch, diziKey, fingeringSystem) : null;
  const nextFingering = nextNote ? findFingering(nextNote.pitch, diziKey, fingeringSystem) : null;

  const holes: SixHoles = fingering?.holes || [1, 1, 1, 1, 1, 1];
  const nextHoles: SixHoles = nextFingering?.holes || [0, 1, 1, 1, 1, 1];

  // Find alternative fingerings for this note if any exist
  const allFingerings = getFingeringsFor(diziKey, fingeringSystem);
  const alternatives = allFingerings.filter(
    f => f.pitch === targetPitch && f.alternative
  );

  // Technique info for current note
  const tech = currentNote?.technique ? DIZI_TECHNIQUES[currentNote.technique] : null;

  const handlePlayCurrentNote = () => {
    if (fingering) {
      diziAudio.playNote(fingering.frequency, 1.2, currentNote?.technique);
    }
  };

  return (
    <div className={`bg-[#111D20] border border-[#1A2E33] rounded-xl p-3 lg:p-3.5 flex min-w-0 flex-col justify-between select-none ${className}`}>
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-[#1A2E33]/60 mb-2.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[#F3F5F4] tracking-wide">
              {t('Live Fingering', '实时指法')}
            </h3>
          </div>

          <button
            onClick={handlePlayCurrentNote}
            className="p-1.5 rounded-lg bg-[#16272C] hover:bg-[#1C333A] text-[#B4F45A] transition-colors"
            title={t('Audition note', '试听音符')}
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>

        {!currentNote ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#31545B] bg-[#0E171A] p-5 text-center">
            <span className="text-2xl text-[#36B39B]">♪</span>
            <span className="text-sm font-medium text-[#F3F5F4]">{t('Rest / no detected dizi note', '休止 / 未检测到笛音')}</span>
            <span className="text-xs leading-relaxed text-[#94A3A7]">{t('The fingering diagram resumes when a detected note begins.', '检测到笛音时将显示对应指法。')}</span>
          </div>
        ) : <>

        {/* Main Central Layout: Dizi Diagram on Left + Pitch Info on Right */}
        <div className="grid grid-cols-[minmax(64px,0.35fr)_minmax(0,1fr)] gap-2.5 items-center min-w-0">
          {/* Vertical Dizi Flute Diagram */}
          <div className="min-w-0 flex flex-col items-center justify-center py-0.5">
            {fingering ? (
              <DiziFingeringDiagram holes={holes} size="md" />
            ) : (
              <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-3 text-center text-xs text-amber-200">
                <span className="text-2xl">♪</span>
                <span>{t('No verified fingering', '暂无可靠指法')}: {targetPitch} · {diziKey}</span>
              </div>
            )}
          </div>

          {/* Right Pitch Details */}
          <div className="flex min-w-0 flex-col justify-center gap-2 overflow-hidden">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[#94A3A7] font-mono">
                {t('Pitch', '音高')}
              </div>
              <div className="text-2xl xl:text-3xl font-extrabold text-[#B4F45A] font-mono tracking-tight flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 mt-0.5">
                {currentNote?.pitch || fingering?.pitch || 'D5'}
                <span className="text-[11px] font-normal text-[#94A3A7]">
                  {Math.round(midiToFrequency(pitchNameToMidi(targetPitch)))} Hz
                </span>
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-[#94A3A7] font-mono">
                {t('Jianpu', '简谱唱名')}
              </div>
              <div className="text-base font-bold text-[#F3F5F4] font-serif flex flex-wrap items-center gap-1.5 mt-0.5">
                <span>{t('Jianpu', '简谱')}</span>
                <span className="text-xl text-[#36B39B] font-bold">
                  {currentNote?.jianpu || fingering?.jianpuDegree || '—'}
                </span>
                {fingering?.octaveDot ? (
                  <span className="text-xs text-[#94A3A7]">
                    ({fingering.octaveDot > 0 ? t('High', '高音区') : t('Low', '低音区')})
                  </span>
                ) : null}
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-[#94A3A7] font-mono">
                {t('Breath Control', '气息控制')}
              </div>
              <div className="text-sm font-medium text-[#F3F5F4] flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-[#36B39B]" />
                <span>
                  {t('Breath:', '气息：')}{' '}
                  {!fingering ? t('No supported fingering', '无对应指法')
                    : fingering.register === 'low'
                    ? t('Low', '缓吹')
                    : fingering?.register === 'high'
                    ? t('High', '超吹')
                    : t('Medium', '急吹')}
                </span>
              </div>
            </div>

            {/* Hole Legend */}
            {fingering && <div className="pt-1.5 border-t border-[#1A2E33]/60 flex flex-wrap items-center gap-2 text-[11px] text-[#94A3A7]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0D1114] border border-[#283B42] inline-block" />
                <span>{t('Closed', '按闭')}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FAF5E8] border border-[#524334] inline-block" />
                <span>{t('Open', '开放')}</span>
              </span>
            </div>}
          </div>
        </div>
        </>}
      </div>

      {/* Bottom Section: Technique Card + Upcoming Note */}
      <div className="space-y-2 mt-2.5 pt-2 border-t border-[#1A2E33]">
        {/* Chinese Dizi Technique Card */}
        {tech ? <div className="bg-[#0E171A] border border-[#1A2E33] rounded-lg p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#F3F5F4] mb-1">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#B4F45A]" />
              <span>{t('Technique:', '技巧：')} {t(tech.nameEn, tech.nameZh)}</span>
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
        </div> : currentNote && <div className="rounded-lg border border-[#1A2E33] bg-[#0E171A] px-3 py-2 text-[11px] leading-relaxed text-[#94A3A7]">
          {t('Technique not classified. Pitch alone cannot verify ornaments.', '尚未分类演奏技巧；仅凭音高无法判断装饰音。')}
        </div>}

        {/* Upcoming Note Preview */}
        {currentNote && nextNote && (
          <div className="bg-[#0E171A]/70 border border-[#1A2E33]/60 rounded-lg px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#94A3A7]">{t('Next:', '下一音：')}</span>
              <span className="text-xs font-mono font-bold text-[#B4F45A]">
                {nextNote.pitch} ({nextNote.jianpu})
              </span>
            </div>

            {nextFingering && <DiziFingeringDiagram holes={nextHoles} isCompact={true} />}
          </div>
        )}

        {/* Alternative Fingering notification if available */}
        {alternatives.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#36B39B]">
            <HelpCircle className="w-3 h-3 shrink-0" />
            <span>{t('Alternate fingering available', '有替代指法可用')}</span>
          </div>
        )}
      </div>
    </div>
  );
};
