import React from 'react';
import { ViewMode, DiziKey } from '../../types/dizi';
import {
  Music4,
  LayoutGrid,
  Target,
  Activity,
  Sparkles,
  ArrowRight,
  BookOpen,
  Wind
} from 'lucide-react';

interface OverviewViewProps {
  onNavigate: (view: ViewMode) => void;
  diziKey: DiziKey;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onNavigate,
  diziKey
}) => {
  return (
    <div className="space-y-8 select-none">
      {/* 1. Hero Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#111D20] via-[#0E1A1D] to-[#0A1417] border border-[#1A2E33] p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#122527] border border-[#1F3D3D] text-xs text-[#B4F45A] font-mono mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Intelligent Chinese Dizi Workstation</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#F3F5F4] tracking-tight leading-tight">
            JOE Dizi Studio — 智能笛子学习与转谱平台
          </h1>

          <p className="text-sm text-[#94A3A7] mt-3 leading-relaxed">
            Inspired by the JOE-Music guitar workstation, engineered specifically for the monophonic Chinese transverse bamboo flute.
            Transcribe audio into Jianpu (简谱), master traditional 6-hole fingerings, practice at variable speeds, and tune your instrument with acoustic precision.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={() => onNavigate('transcribe')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#B4F45A] text-[#0B1014] text-xs font-bold hover:bg-[#c3f77a] transition-all shadow-md"
            >
              <Music4 className="w-4 h-4" />
              <span>Open Sheet Music Studio</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>

            <button
              onClick={() => onNavigate('fingering')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#16272C] hover:bg-[#1C333A] text-[#F3F5F4] text-xs font-semibold border border-[#1F3D3D] transition-colors"
            >
              <LayoutGrid className="w-4 h-4 text-[#36B39B]" />
              <span>Explore 6-Hole Fingerings</span>
            </button>

            <button
              onClick={() => onNavigate('tuner')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#16272C] hover:bg-[#1C333A] text-[#F3F5F4] text-xs font-semibold border border-[#1F3D3D] transition-colors"
            >
              <Activity className="w-4 h-4 text-[#B4F45A]" />
              <span>Chromatic Tuner</span>
            </button>
          </div>
        </div>

        {/* Decorative background Chinese calligraphy seal and flute motif */}
        <div className="absolute right-6 -bottom-6 pointer-events-none opacity-20 hidden md:block">
          <div className="font-calligraphy text-9xl text-[#36B39B] font-bold">
            笛
          </div>
        </div>
      </div>

      {/* 2. Quick Feature Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('transcribe')}
          className="bg-[#111D20] border border-[#1A2E33] hover:border-[#36B39B] rounded-xl p-5 cursor-pointer transition-all hover:-translate-y-1 group"
        >
          <div className="w-10 h-10 rounded-lg bg-[#16272C] flex items-center justify-center text-[#B4F45A] mb-3 group-hover:bg-[#1F3D3D]">
            <Music4 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-[#F3F5F4]">
            Dizi Transcriber
          </h3>
          <p className="text-xs text-[#94A3A7] mt-1 leading-relaxed">
            Upload audio files, hum via microphone, or sync YouTube/Suno tracks to generate Jianpu & staff notation.
          </p>
        </div>

        <div
          onClick={() => onNavigate('fingering')}
          className="bg-[#111D20] border border-[#1A2E33] hover:border-[#36B39B] rounded-xl p-5 cursor-pointer transition-all hover:-translate-y-1 group"
        >
          <div className="w-10 h-10 rounded-lg bg-[#16272C] flex items-center justify-center text-[#36B39B] mb-3 group-hover:bg-[#1F3D3D]">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-[#F3F5F4]">
            Fingering Library
          </h3>
          <p className="text-xs text-[#94A3A7] mt-1 leading-relaxed">
            Comprehensive database of 6-hole fingerings across C, D, E, F, G, A, Bb keys and 5 traditional systems.
          </p>
        </div>

        <div
          onClick={() => onNavigate('practice')}
          className="bg-[#111D20] border border-[#1A2E33] hover:border-[#36B39B] rounded-xl p-5 cursor-pointer transition-all hover:-translate-y-1 group"
        >
          <div className="w-10 h-10 rounded-lg bg-[#16272C] flex items-center justify-center text-[#B4F45A] mb-3 group-hover:bg-[#1F3D3D]">
            <Target className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-[#F3F5F4]">
            Practice Studio
          </h3>
          <p className="text-xs text-[#94A3A7] mt-1 leading-relaxed">
            Metronome with traditional Chinese clapper click, A-B phrase looping, and progressive speed training.
          </p>
        </div>

        <div
          onClick={() => onNavigate('tuner')}
          className="bg-[#111D20] border border-[#1A2E33] hover:border-[#36B39B] rounded-xl p-5 cursor-pointer transition-all hover:-translate-y-1 group"
        >
          <div className="w-10 h-10 rounded-lg bg-[#16272C] flex items-center justify-center text-[#36B39B] mb-3 group-hover:bg-[#1F3D3D]">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-[#F3F5F4]">
            Acoustic Tuner
          </h3>
          <p className="text-xs text-[#94A3A7] mt-1 leading-relaxed">
            Real-time live microphone chromatic pitch detection with cents needle dial and embouchure roll feedback.
          </p>
        </div>
      </div>

      {/* 3. Bamboo Flute Acoustics & Anatomy Guide */}
      <div className="bg-[#111D20] border border-[#1A2E33] rounded-xl p-6">
        <h2 className="text-base font-serif font-bold text-[#F3F5F4] flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4 text-[#B4F45A]" />
          <span>Chinese Dizi Anatomy & Acoustic Guide (中国笛构造与发音原理)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-[#94A3A7]">
          <div className="space-y-2">
            <h3 className="font-bold text-[#F3F5F4] text-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#B4F45A]" />
              吹孔与笛膜孔 (Mouthpiece & Dimo)
            </h3>
            <p className="leading-relaxed">
              The blow hole (吹孔) converts the player's airstream into acoustic oscillation. Right below it lies the membrane hole (膜孔), covered with a natural reed or bamboo shoot skin called <strong>Dimo (笛膜)</strong>. The delicate wrinkles in the dimo vibrate non-linearly, creating the Dizi's bright, buzzing, resonant voice.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-[#F3F5F4] text-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#36B39B]" />
              曲笛 vs 梆笛 (Qudi vs Bangdi)
            </h3>
            <p className="leading-relaxed">
              <strong>Qudi (曲笛)</strong>: In keys C or D, longer and thicker bore, mellow and poetic timbre favored in southern Jiangnan Sizhu and Kunqu opera.
              <br />
              <strong>Bangdi (梆笛)</strong>: In keys G, F, or A, shorter and narrower bore, loud, crisp, and agile for northern Bangzi opera.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-[#F3F5F4] text-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              筒音与调高判定 (Fundamental Tube Tone)
            </h3>
            <p className="leading-relaxed">
              The flute's nominal key is defined by the note produced when the 3 bottom holes are open. With the popular <strong>筒音作5 (Tongyin as 5)</strong> system, the G Dizi plays the tonic G on the 3rd hole, making it effortless to read standard Jianpu notation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
