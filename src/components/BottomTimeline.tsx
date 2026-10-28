import React, { useState } from 'react';
import { useDeferredScrub } from '../hooks/useDeferredScrub';
import { Song, SongSection } from '../types/dizi';
import { ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface BottomTimelineProps {
  song: Song;
  activeNoteIndex: number;
  onSeekToNote: (index: number) => void;
  onSeekToMeasure: (measure: number) => void;
  currentTimeSeconds?: number;
  durationSeconds?: number;
  onSeekPercent?: (percent: number) => void;
  className?: string;
}

export const BottomTimeline: React.FC<BottomTimelineProps> = ({
  song,
  activeNoteIndex,
  onSeekToNote,
  onSeekToMeasure,
  currentTimeSeconds,
  durationSeconds,
  onSeekPercent,
  className = ''
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'timeline' | 'sections' | 'loop'>('timeline');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const totalNotes = song.notes.length;
  const currentNote = song.notes[activeNoteIndex] || song.notes[0];
  const hasMediaTime = durationSeconds !== undefined && durationSeconds > 0;
  const progressPercent = hasMediaTime
    ? Math.min(100, Math.max(0, (currentTimeSeconds || 0) / durationSeconds * 100))
    : totalNotes > 1 ? (activeNoteIndex / (totalNotes - 1)) * 100 : 0;

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
  const seekToPercent = (percent: number) => {
    if (hasMediaTime && onSeekPercent) {
      onSeekPercent(percent);
    } else if (totalNotes > 0) {
      onSeekToNote(Math.round(percent / 100 * (totalNotes - 1)));
    }
  };
  const scrub = useDeferredScrub(
    progressPercent,
    seekToPercent,
    percent => hasMediaTime ? formatTime(percent / 100 * durationSeconds) : `${Math.round(percent / 100 * Math.max(0, totalNotes - 1)) + 1} / ${totalNotes}`
  );

  const handleSectionClick = (section: SongSection) => {
    onSeekToMeasure(section.startMeasure);
  };

  const timeTicks = Array.from({ length: 5 }, (_, i) => formatTime((hasMediaTime ? durationSeconds : totalNotes * 60 / Math.max(song.bpm, 1)) * i / 4));

  return (
    <footer className={`bg-[#0B1014] border-t border-[#16272C] px-3 py-1.5 select-none shrink-0 ${className}`}>
      {/* 1. Header Toolbar: Tabs on Left + Zoom/Fit on Right */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 mb-1 border-b border-[#16272C]/70">
        {/* Left Tabs */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
              activeTab === 'timeline'
                ? 'bg-[#16272C] text-[#B4F45A] font-semibold border border-[#1F3D3D]'
                : 'text-[#94A3A7] hover:text-[#F3F5F4]'
            }`}
          >
            {t('Timeline', '时间轴')}
          </button>
          <button
            onClick={() => setActiveTab('sections')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
              activeTab === 'sections'
                ? 'bg-[#16272C] text-[#B4F45A] font-semibold border border-[#1F3D3D]'
                : 'text-[#94A3A7] hover:text-[#F3F5F4]'
            }`}
          >
            {t('Sections', '曲式分段')}
          </button>
          <button
            onClick={() => setActiveTab('loop')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
              activeTab === 'loop'
                ? 'bg-[#16272C] text-[#B4F45A] font-semibold border border-[#1F3D3D]'
                : 'text-[#94A3A7] hover:text-[#F3F5F4]'
            }`}
          >
            {t('Loop', '循环')}
          </button>
        </div>

        {/* Right Zoom Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
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
            className="px-2 py-0.5 rounded bg-[#111D20] border border-[#1A2E33] text-[10px] text-[#94A3A7] hover:text-[#F3F5F4] transition-colors"
          >
            {t('Fit', '适屏')}
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
      {song.sections.length > 0 && <div className="grid grid-cols-12 gap-1 mb-1">
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
      </div>}

      {/* 3. Interactive Note Density & Scrubber Track */}
      <div
        ref={scrub.trackRef}
        {...scrub.handlers}
        role="slider"
        tabIndex={0}
        aria-label={t('Timeline seek: drag to preview and release to jump', '时间轴：拖动预览，松开跳转')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progressPercent)}
        aria-valuetext={hasMediaTime ? formatTime((currentTimeSeconds || 0)) : `${activeNoteIndex + 1} / ${totalNotes}`}
        className={`joe-deferred-scrub relative h-6 bg-[#111D20] border border-[#1A2E33] rounded-md px-2 flex items-center cursor-ew-resize touch-none group focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B4F45A] ${scrub.dragging ? 'scrubbing' : ''}`}
      >
        {/* Playhead Vertical Line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-[#B4F45A] shadow-[0_0_10px_#B4F45A] pointer-events-none z-20 transition-all duration-75"
          style={{ left: 'var(--seek-percent, 0%)' }}
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
                style={hasMediaTime && n.startTime !== undefined ? {
                  position: 'absolute', left: `${Math.min(100, n.startTime / durationSeconds * 100)}%`
                } : undefined}
                title={`M${n.measureNumber}: ${n.pitch}`}
              />
            );
          })}
        </div>
      </div>

      {/* 4. Time Ticks Row */}
      <div className="flex items-center justify-between mt-0.5 text-[9px] font-mono tabular-nums text-[#627376]">
        {timeTicks.map((t, idx) => (
          <span key={idx}>{t}</span>
        ))}
      </div>
    </footer>
  );
};
