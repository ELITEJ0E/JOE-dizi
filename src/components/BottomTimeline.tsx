import React, { useState, useRef } from 'react';
import { Song, SongSection } from '../types/dizi';
import { ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';

interface BottomTimelineProps {
  song: Song;
  activeNoteIndex: number;
  onSeekToNote: (index: number) => void;
  onSeekToMeasure: (measure: number) => void;
  className?: string;
}

export const BottomTimeline: React.FC<BottomTimelineProps> = ({
  song,
  activeNoteIndex,
  onSeekToNote,
  onSeekToMeasure,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'sections' | 'loop'>('timeline');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  const totalNotes = song.notes.length;
  const currentNote = song.notes[activeNoteIndex] || song.notes[0];
  const progressPercent = totalNotes > 0 ? (activeNoteIndex / (totalNotes - 1)) * 100 : 0;

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || totalNotes === 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetIdx = Math.round(ratio * (totalNotes - 1));
    onSeekToNote(targetIdx);
  };

  const handleSectionClick = (section: SongSection) => {
    onSeekToMeasure(section.startMeasure);
  };

  const timeTicks = ['00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:42'];

  return (
    <footer className={`bg-[#0B1014] border-t border-[#16272C] p-4 select-none ${className}`}>
      {/* 1. Header Toolbar: Tabs on Left + Zoom/Fit on Right */}
      <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#16272C]/70">
        {/* Left Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'timeline'
                ? 'bg-[#16272C] text-[#B4F45A] font-semibold border border-[#1F3D3D]'
                : 'text-[#94A3A7] hover:text-[#F3F5F4]'
            }`}
          >
            Timeline 时间轴
          </button>
          <button
            onClick={() => setActiveTab('sections')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'sections'
                ? 'bg-[#16272C] text-[#B4F45A] font-semibold border border-[#1F3D3D]'
                : 'text-[#94A3A7] hover:text-[#F3F5F4]'
            }`}
          >
            Sections 曲式分段
          </button>
          <button
            onClick={() => setActiveTab('loop')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'loop'
                ? 'bg-[#16272C] text-[#B4F45A] font-semibold border border-[#1F3D3D]'
                : 'text-[#94A3A7] hover:text-[#F3F5F4]'
            }`}
          >
            Loop 循环区间
          </button>
        </div>

        {/* Right Zoom Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-[#94A3A7]">
            <button
              onClick={() => setZoomLevel(Math.max(50, zoomLevel - 20))}
              className="p-1 hover:text-[#F3F5F4] transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <input
              type="range"
              min="50"
              max="200"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(Number(e.target.value))}
              className="w-16 h-1 bg-[#1A2E33] rounded-lg appearance-none cursor-pointer accent-[#B4F45A]"
            />

            <button
              onClick={() => setZoomLevel(Math.min(200, zoomLevel + 20))}
              className="p-1 hover:text-[#F3F5F4] transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setZoomLevel(100)}
            className="px-2 py-0.5 rounded bg-[#111D20] border border-[#1A2E33] text-[11px] text-[#94A3A7] hover:text-[#F3F5F4] transition-colors"
          >
            Fit 适屏
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 text-[#94A3A7] hover:text-[#F3F5F4] transition-colors"
            title="Toggle View"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Song Structure Section Blocks (Intro / Verse / Chorus) */}
      <div className="grid grid-cols-12 gap-1 mb-2">
        {song.sections.map((sec, idx) => {
          const colSpan = idx === 0 ? 'col-span-3' : idx === 1 ? 'col-span-5' : 'col-span-4';
          const isCurrentSection =
            currentNote &&
            currentNote.measureNumber >= sec.startMeasure &&
            currentNote.measureNumber <= sec.endMeasure;

          return (
            <button
              key={sec.id}
              onClick={() => handleSectionClick(sec)}
              className={`py-1 px-2 rounded text-center text-xs font-semibold tracking-wide transition-all border ${colSpan} ${
                isCurrentSection
                  ? 'border-[#B4F45A] shadow-[0_0_8px_rgba(180,244,90,0.2)]'
                  : 'border-transparent opacity-85 hover:opacity-100'
              }`}
              style={{
                backgroundColor: sec.color + '40',
                color: '#F3F5F4'
              }}
            >
              {sec.name}
            </button>
          );
        })}
      </div>

      {/* 3. Interactive Note Density & Scrubber Track */}
      <div
        ref={timelineRef}
        onClick={handleTimelineClick}
        className="relative h-7 bg-[#111D20] border border-[#1A2E33] rounded-md px-3 flex items-center cursor-pointer group"
      >
        {/* Playhead Vertical Line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-[#B4F45A] shadow-[0_0_10px_#B4F45A] pointer-events-none z-20 transition-all duration-75"
          style={{ left: `${progressPercent}%` }}
        >
          {/* Top marker indicator */}
          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-[#B4F45A] shadow-md" />
        </div>

        {/* Note Scatter Dots representing musical density */}
        <div className="w-full flex items-center justify-between">
          {song.notes.map((n, i) => {
            const isPlayed = i <= activeNoteIndex;
            return (
              <div
                key={n.id}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === activeNoteIndex
                    ? 'w-2.5 h-2.5 bg-[#B4F45A] shadow-[0_0_8px_#B4F45A]'
                    : isPlayed
                    ? 'bg-[#36B39B]'
                    : 'bg-[#283C41]'
                }`}
                title={`M${n.measureNumber}: ${n.pitch}`}
              />
            );
          })}
        </div>
      </div>

      {/* 4. Time Ticks Row */}
      <div className="flex items-center justify-between mt-1 text-[10px] font-mono tabular-nums text-[#627376]">
        {timeTicks.map((t, idx) => (
          <span key={idx}>{t}</span>
        ))}
      </div>
    </footer>
  );
};
