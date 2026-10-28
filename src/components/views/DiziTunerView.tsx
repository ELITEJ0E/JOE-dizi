import React, { useState, useEffect } from 'react';
import { DiziKey, FingeringSystem } from '../../types/dizi';
import { pitchDetector, PitchDetectionResult } from '../../audio/pitchDetector';
import { findFingering } from '../../music/diziTheory';
import { DiziFingeringDiagram } from '../DiziFingeringDiagram';
import { diziAudio } from '../../audio/diziSynth';
import { Mic, MicOff, Volume2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface DiziTunerViewProps {
  diziKey: DiziKey;
  fingeringSystem: FingeringSystem;
}

export const DiziTunerView: React.FC<DiziTunerViewProps> = ({
  diziKey,
  fingeringSystem
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [pitchResult, setPitchResult] = useState<PitchDetectionResult | null>(null);
  const [referencePlaying, setReferencePlaying] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      if (isListening) {
        pitchDetector.stopMicrophone();
      }
    };
  }, [isListening]);

  const handleToggleTuner = async () => {
    if (isListening) {
      pitchDetector.stopMicrophone();
      setIsListening(false);
      setPitchResult(null);
    } else {
      const ok = await pitchDetector.startMicrophone((res) => {
        setPitchResult(res);
      });
      setIsListening(ok);
    }
  };

  const handlePlayReference = (freq: number) => {
    diziAudio.playNote(freq, 2.5);
    setReferencePlaying(true);
    setTimeout(() => setReferencePlaying(false), 2500);
  };

  const cents = pitchResult?.cents ?? 0;
  const isInTune = Math.abs(cents) <= 5;
  const isFlat = cents < -5;
  const isSharp = cents > 5;

  const currentFingering = pitchResult
    ? findFingering(pitchResult.pitchName, diziKey, fingeringSystem)
    : null;

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A2E33]">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#F3F5F4] flex items-center gap-2">
            <span>Dizi Chromatic Tuner</span>
            <span className="text-sm font-calligraphy text-[#36B39B]">笛子高精度校音器</span>
          </h2>
          <p className="text-xs text-[#94A3A7] mt-1">
            Real-time acoustic frequency detection with cents deviation and embouchure angle guidance.
          </p>
        </div>

        <button
          onClick={handleToggleTuner}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md shrink-0 ${
            isListening
              ? 'bg-red-500 text-white'
              : 'bg-[#B4F45A] text-[#0B1014] hover:bg-[#c3f77a]'
          }`}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span>{isListening ? 'Stop Listening' : 'Start Tuner Mic'}</span>
        </button>
      </div>

      {/* 2. Main Tuner Gauge Dial */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-[#111D20] border border-[#1A2E33] rounded-xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
          {/* Circular Dial Needle SVG */}
          <div className="relative w-64 h-36 flex items-center justify-center">
            <svg viewBox="0 0 240 140" className="w-full h-full overflow-visible">
              {/* Dial Arc Track */}
              <path
                d="M 20 120 A 100 100 0 0 1 220 120"
                fill="none"
                stroke="#1A2E33"
                strokeWidth="10"
                strokeLinecap="round"
              />
              {/* Sweet spot green zone (-5 to +5 cents) */}
              <path
                d="M 110 20 A 100 100 0 0 1 130 20"
                fill="none"
                stroke="#B4F45A"
                strokeWidth="12"
                strokeLinecap="round"
              />

              {/* Ticks: -50, -25, 0, +25, +50 */}
              <line x1="20" y1="120" x2="30" y2="120" stroke="#94A3A7" strokeWidth="2" />
              <line x1="120" y1="20" x2="120" y2="32" stroke="#B4F45A" strokeWidth="3" />
              <line x1="220" y1="120" x2="210" y2="120" stroke="#94A3A7" strokeWidth="2" />

              {/* Needle Indicator */}
              {isListening && pitchResult && (
                <g transform={`rotate(${Math.max(-45, Math.min(45, cents * 0.9))}, 120, 120)`}>
                  <line
                    x1="120"
                    y1="120"
                    x2="120"
                    y2="28"
                    stroke={isInTune ? '#B4F45A' : '#EF4444'}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    className="transition-transform duration-100 ease-out"
                  />
                  <circle cx="120" cy="120" r="7" fill="#B4F45A" />
                </g>
              )}
            </svg>

            <span className="absolute bottom-2 text-xs font-mono text-[#94A3A7]">
              -50 ¢ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 0 ¢ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; +50 ¢
            </span>
          </div>

          {/* Large Pitch Display */}
          <div className="mt-4">
            <div className="text-5xl font-mono font-extrabold text-[#F3F5F4] tracking-tight">
              {pitchResult ? pitchResult.pitchName : isListening ? '...' : '--'}
            </div>

            <div className="flex items-center justify-center gap-3 mt-2 text-sm">
              <span className="font-mono text-[#94A3A7]">
                {pitchResult ? `${pitchResult.frequency.toFixed(1)} Hz` : '440.0 Hz'}
              </span>

              {pitchResult && (
                <span
                  className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                    isInTune
                      ? 'bg-[#B4F45A]/20 text-[#B4F45A]'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {cents > 0 ? `+${cents} ¢` : `${cents} ¢`}
                </span>
              )}
            </div>

            {/* Embouchure Tuning Tip */}
            {pitchResult && (
              <div className="mt-4 text-xs font-medium max-w-sm">
                {isInTune ? (
                  <span className="text-[#B4F45A] flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Accurate Pitch! 纯准 (音高饱满稳定)
                  </span>
                ) : isFlat ? (
                  <span className="text-amber-400">
                    Pitch is Flat (偏低). Rotate flute slightly outward or increase breath velocity. (稍向外转笛身/加快气速)
                  </span>
                ) : (
                  <span className="text-amber-400">
                    Pitch is Sharp (偏高). Roll flute slightly inward or gently ease breath pressure. (稍向内扣笛身/舒缓气息)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Info: Physical Hole Guidance */}
        <div className="lg:col-span-4 bg-[#111D20] border border-[#1A2E33] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#F3F5F4] pb-2 border-b border-[#1A2E33]">
              Target Dizi Fingering ({diziKey} 调笛)
            </h3>

            {currentFingering ? (
              <div className="flex flex-col items-center my-4 space-y-3">
                <div className="text-sm font-bold text-[#B4F45A]">
                  Jianpu: {currentFingering.jianpuDegree} ({currentFingering.registerZh})
                </div>

                <DiziFingeringDiagram holes={currentFingering.holes} size="sm" />

                <p className="text-[11px] text-[#94A3A7] text-center">
                  {currentFingering.description}
                </p>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[#94A3A7]">
                Blow a note into the microphone to inspect the matching finger holes.
              </div>
            )}
          </div>

          {/* Reference Tone Generator */}
          <div className="pt-3 border-t border-[#1A2E33]">
            <span className="text-[11px] text-[#94A3A7] block mb-2 font-mono">
              Reference Tuning Tones (标准基准音):
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handlePlayReference(440)}
                className="py-1.5 rounded bg-[#0E171A] hover:bg-[#16272C] text-xs font-mono text-[#F3F5F4] border border-[#1A2E33]"
              >
                A4 (440Hz)
              </button>
              <button
                onClick={() => handlePlayReference(587.33)}
                className="py-1.5 rounded bg-[#0E171A] hover:bg-[#16272C] text-xs font-mono text-[#B4F45A] border border-[#1A2E33]"
              >
                D5 (筒音)
              </button>
              <button
                onClick={() => handlePlayReference(783.99)}
                className="py-1.5 rounded bg-[#0E171A] hover:bg-[#16272C] text-xs font-mono text-[#36B39B] border border-[#1A2E33]"
              >
                G5 (主音1)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
