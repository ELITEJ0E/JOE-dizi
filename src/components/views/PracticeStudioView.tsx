import React, { useState, useEffect, useRef } from 'react';
import { Song, DiziKey, FingeringSystem } from '../../types/dizi';
import { diziAudio } from '../../audio/diziSynth';
import {
  Play,
  Pause,
  Repeat,
  Gauge,
  Wind,
  Sliders,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';

interface PracticeStudioViewProps {
  currentSong: Song;
  diziKey: DiziKey;
  fingeringSystem: FingeringSystem;
  onJumpToMeasure: (m: number) => void;
}

export const PracticeStudioView: React.FC<PracticeStudioViewProps> = ({
  currentSong,
  diziKey,
  fingeringSystem,
  onJumpToMeasure
}) => {
  const [bpm, setBpm] = useState<number>(currentSong.bpm || 92);
  const [isMetronomeActive, setIsMetronomeActive] = useState<boolean>(false);
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [loopStartMeasure, setLoopStartMeasure] = useState<number>(3); // Verse 01 start
  const [loopEndMeasure, setLoopEndMeasure] = useState<number>(6);
  const [isAutoSpeedUp, setIsAutoSpeedUp] = useState<boolean>(false);
  const [practiceSpeed, setPracticeSpeed] = useState<number>(0.75);

  const metronomeTimerRef = useRef<number | null>(null);

  // Metronome interval loop
  useEffect(() => {
    if (!isMetronomeActive) {
      if (metronomeTimerRef.current) clearInterval(metronomeTimerRef.current);
      return;
    }

    const intervalMs = (60 / bpm) * 1000;
    let beat = 0;

    metronomeTimerRef.current = window.setInterval(() => {
      const isDownbeat = beat % 4 === 0;
      diziAudio.playClapper(isDownbeat);
      setCurrentBeat(beat % 4);
      beat = (beat + 1) % 4;
    }, intervalMs);

    return () => {
      if (metronomeTimerRef.current) clearInterval(metronomeTimerRef.current);
    };
  }, [isMetronomeActive, bpm]);

  return (
    <div className="space-y-6">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A2E33]">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#F3F5F4] flex items-center gap-2">
            <span>Practice Studio</span>
            <span className="text-sm font-calligraphy text-[#36B39B]">慢练工作台与节拍器</span>
          </h2>
          <p className="text-xs text-[#94A3A7] mt-1">
            Loop difficult phrases, isolate finger movements, slow down complex ornaments, and build rock-solid rhythm with the traditional clapper metronome.
          </p>
        </div>

        <button
          onClick={() => {
            onJumpToMeasure(loopStartMeasure);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#B4F45A] text-[#0B1014] text-xs font-bold hover:bg-[#c3f77a] transition-all shadow-md shrink-0"
        >
          <Repeat className="w-4 h-4" />
          <span>Practice Loop M{loopStartMeasure} - M{loopEndMeasure}</span>
        </button>
      </div>

      {/* 2. Metronome & Tempo Control Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Metronome Card */}
        <div className="bg-[#111D20] border border-[#1A2E33] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1A2E33]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#B4F45A]" />
                <h3 className="text-sm font-semibold text-[#F3F5F4]">
                  Traditional Clapper Metronome (檀板节拍器)
                </h3>
              </div>

              <button
                onClick={() => setIsMetronomeActive(!isMetronomeActive)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  isMetronomeActive
                    ? 'bg-red-500 text-white'
                    : 'bg-[#B4F45A] text-[#0B1014] hover:bg-[#c3f77a]'
                }`}
              >
                {isMetronomeActive ? 'Stop Metronome' : 'Start Metronome'}
              </button>
            </div>

            {/* Visual Beat Indicator Dots */}
            <div className="flex items-center justify-center gap-6 my-6">
              {[0, 1, 2, 3].map((b) => {
                const isActive = isMetronomeActive && currentBeat === b;
                const isDownbeat = b === 0;

                return (
                  <div key={b} className="flex flex-col items-center gap-2">
                    <div
                      className={`w-12 h-12 rounded-full border flex items-center justify-center font-mono font-bold text-base transition-all duration-75 ${
                        isActive
                          ? isDownbeat
                            ? 'bg-[#B4F45A] text-[#0B1014] border-[#B4F45A] scale-110 shadow-[0_0_15px_#B4F45A]'
                            : 'bg-[#36B39B] text-[#0B1014] border-[#36B39B] scale-105 shadow-[0_0_10px_#36B39B]'
                          : 'bg-[#0E171A] text-[#94A3A7] border-[#1A2E33]'
                      }`}
                    >
                      {b + 1}
                    </div>
                    <span className="text-[10px] text-[#94A3A7]">
                      {isDownbeat ? '板 (Down)' : '眼 (Up)'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* BPM adjustment slider */}
          <div className="space-y-2 pt-3 border-t border-[#1A2E33]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#94A3A7]">Tempo (BPM):</span>
              <span className="font-mono font-bold text-lg text-[#B4F45A]">{bpm} BPM</span>
            </div>
            <input
              type="range"
              min="40"
              max="180"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-full h-1.5 bg-[#0E171A] rounded-lg appearance-none cursor-pointer accent-[#B4F45A]"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#6E7E81]">
              <span>40 (慢板)</span>
              <span>90 (中板)</span>
              <span>180 (快板)</span>
            </div>
          </div>
        </div>

        {/* A-B Loop Section */}
        <div className="bg-[#111D20] border border-[#1A2E33] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1A2E33]">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-[#36B39B]" />
                <h3 className="text-sm font-semibold text-[#F3F5F4]">
                  A-B Phrase Isolation (小节循环)
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 my-5">
              <div className="bg-[#0E171A] border border-[#1A2E33] rounded-lg p-3">
                <span className="text-[11px] text-[#94A3A7] block">Loop Start Point A (起)</span>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xl font-bold font-mono text-[#F3F5F4]">
                    Measure {loopStartMeasure}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setLoopStartMeasure(Math.max(1, loopStartMeasure - 1))}
                      className="px-2 py-0.5 rounded bg-[#16272C] text-xs hover:bg-[#1C333A]"
                    >
                      -
                    </button>
                    <button
                      onClick={() => setLoopStartMeasure(Math.min(loopEndMeasure - 1, loopStartMeasure + 1))}
                      className="px-2 py-0.5 rounded bg-[#16272C] text-xs hover:bg-[#1C333A]"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-[#0E171A] border border-[#1A2E33] rounded-lg p-3">
                <span className="text-[11px] text-[#94A3A7] block">Loop End Point B (止)</span>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xl font-bold font-mono text-[#F3F5F4]">
                    Measure {loopEndMeasure}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setLoopEndMeasure(Math.max(loopStartMeasure + 1, loopEndMeasure - 1))}
                      className="px-2 py-0.5 rounded bg-[#16272C] text-xs hover:bg-[#1C333A]"
                    >
                      -
                    </button>
                    <button
                      onClick={() => setLoopEndMeasure(Math.min(currentSong.totalMeasures, loopEndMeasure + 1))}
                      className="px-2 py-0.5 rounded bg-[#16272C] text-xs hover:bg-[#1C333A]"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Speed Presets */}
          <div className="pt-3 border-t border-[#1A2E33]">
            <span className="text-xs text-[#94A3A7] block mb-2">Practice Speed Multiplier:</span>
            <div className="grid grid-cols-4 gap-2">
              {[0.5, 0.75, 0.9, 1.0].map((s) => (
                <button
                  key={s}
                  onClick={() => setPracticeSpeed(s)}
                  className={`py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                    practiceSpeed === s
                      ? 'bg-[#B4F45A] text-[#0B1014] font-bold shadow-sm'
                      : 'bg-[#0E171A] text-[#94A3A7] hover:text-[#F3F5F4]'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Breath & Technique Practice Guide */}
      <div className="bg-[#111D20] border border-[#1A2E33] rounded-xl p-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#1A2E33] mb-4">
          <Wind className="w-4 h-4 text-[#B4F45A]" />
          <h3 className="text-sm font-semibold text-[#F3F5F4]">
            Dizi Breath Control & Tone Production Guide (气功与风门要诀)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-[#0E171A] p-4 rounded-lg border border-[#1A2E33]">
            <h4 className="font-bold text-[#F3F5F4] flex items-center gap-1.5 mb-1 text-sm">
              <span className="w-2 h-2 rounded-full bg-[#36B39B]" />
              缓吹 (Low Register Breath)
            </h4>
            <p className="text-[#94A3A7] leading-relaxed">
              Used for low notes (筒音 5̣, 6̣, 7̣). Relax the lip embouchure (风门放大), point the airstream slightly more downward into the blowhole, and maintain deep abdominal diaphragm support.
            </p>
          </div>

          <div className="bg-[#0E171A] p-4 rounded-lg border border-[#1A2E33]">
            <h4 className="font-bold text-[#F3F5F4] flex items-center gap-1.5 mb-1 text-sm">
              <span className="w-2 h-2 rounded-full bg-[#B4F45A]" />
              急吹 (Middle Register Breath)
            </h4>
            <p className="text-[#94A3A7] leading-relaxed">
              Used for standard octave notes (1, 2, 3, 4, 5, 6, 7). Slightly compress the lips, increase airflow velocity, and maintain steady, unforced air column pressure for pure resonant tone.
            </p>
          </div>

          <div className="bg-[#0E171A] p-4 rounded-lg border border-[#1A2E33]">
            <h4 className="font-bold text-[#F3F5F4] flex items-center gap-1.5 mb-1 text-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              超吹 (High Register Overblowing)
            </h4>
            <p className="text-[#94A3A7] leading-relaxed">
              Used for high octave notes (1̇, 2̇, 3̇, 5̇). Narrow the aperture tightly (风门收紧), tighten the lip corners, and aim a fast, concentrated jet of air across the outer edge of the blowhole.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
