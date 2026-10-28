import React, { useState, useRef } from 'react';
import { Song } from '../types/dizi';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Share2,
  Sliders,
  Volume2,
  VolumeX,
  Target,
  Menu
} from 'lucide-react';
import { diziAudio } from '../audio/diziSynth';
import { StudioSelect } from './StudioSelect';
import { PWAInstallButton } from './PWAInstallButton';
import { useLanguage } from '../i18n/LanguageContext';

interface TopTransportBarProps {
  onOpenMobileMenu?: () => void;
  playbackAvailable?: boolean;
  currentSong: Song;
  isPlaying: boolean;
  onPlayPauseToggle: () => void;
  onPrevNote: () => void;
  onNextNote: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  isLooping: boolean;
  onLoopToggle: () => void;
  isPracticeMode: boolean;
  onPracticeModeToggle: () => void;
  onOpenExport: () => void;
  onOpenSettings: () => void;
  progressPercent: number; // 0 to 100
  currentTimeFormatted: string; // e.g. "01:24"
  totalDurationFormatted: string; // e.g. "03:42"
  onSeek: (percent: number) => void;
  className?: string;
}

export const TopTransportBar: React.FC<TopTransportBarProps> = ({
  onOpenMobileMenu,
  playbackAvailable = true,
  currentSong,
  isPlaying,
  onPlayPauseToggle,
  onPrevNote,
  onNextNote,
  playbackSpeed,
  onSpeedChange,
  isLooping,
  onLoopToggle,
  isPracticeMode,
  onPracticeModeToggle,
  onOpenExport,
  onOpenSettings,
  progressPercent,
  currentTimeFormatted,
  totalDurationFormatted,
  onSeek,
  className = ''
}) => {
  const { t } = useLanguage();
  const [isMuted, setIsMuted] = useState(false);
  const waveformRef = useRef<HTMLDivElement>(null);

  // Generate simulated waveform peaks
  const waveformBars = [
    12, 18, 28, 45, 60, 35, 75, 90, 80, 50, 65, 85, 95, 70, 55, 40,
    30, 48, 70, 85, 60, 92, 100, 75, 50, 65, 80, 45, 30, 20, 35, 55,
    70, 85, 95, 65, 40, 55, 75, 90, 80, 60, 45, 30, 20, 15, 25, 40
  ];

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    onSeek(percent);
  };

  const handleToggleMute = () => {
    diziAudio.isMuted = !isMuted;
    setIsMuted(!isMuted);
  };

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5];

  return (
    <header className={`joe-dizi-transport bg-[#0B1014] border-b border-[#16272C] px-2 sm:px-3 py-1.5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-1.5 lg:gap-2 select-none shrink-0 ${className}`}>
      {/* 1. Left Zone: Current Song Card */}
      <div className="joe-transport-song flex items-center gap-2 min-w-0 flex-1 lg:flex-none lg:w-[clamp(140px,17vw,235px)] max-w-[245px]">
        {onOpenMobileMenu && <button onClick={onOpenMobileMenu} aria-label={t('Open navigation', '打开导航')} className="md:hidden rounded-lg border border-[#1A2E33] p-1.5 text-[#B4F45A] shrink-0"><Menu className="w-4 h-4" /></button>}
        {/* Album Art / Traditional Pagoda & Moon thumbnail */}
        <div className="relative w-8 h-8 rounded-lg bg-[#111D20] border border-[#1A2E33] overflow-hidden flex items-center justify-center shrink-0 shadow-md">
          {currentSong.imageUrl ? (
            <img src={currentSong.imageUrl} alt="Song artwork" className="w-full h-full object-cover" />
          ) : (
          <svg viewBox="0 0 44 44" className="w-full h-full">
            <rect width="44" height="44" fill="#0E1A1D" />
            <circle cx="28" cy="14" r="8" fill="#F4ECE1" opacity="0.8" />
            {/* Distant mountain */}
            <path d="M 0 44 L 16 26 L 30 38 L 44 28 L 44 44 Z" fill="#20363C" />
            {/* Traditional Chinese Pagoda pavilion silhouette */}
            <path
              d="M 12 36 L 16 30 L 20 36 Z M 13 30 L 16 25 L 19 30 Z M 16 25 L 16 22"
              stroke="#B4F45A"
              strokeWidth="1.2"
              fill="#12252A"
            />
          </svg>
          )}
        </div>

        {/* Title & Source Indicator */}
        <div className="min-w-0">
          <h1 className="text-xs sm:text-[13px] font-semibold text-[#F3F5F4] truncate tracking-tight">
            {currentSong.titleEn}
          </h1>
          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-[#94A3A7]">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B4F45A] animate-pulse" />
              <span className="text-[10px] text-[#94A3A7] truncate">
                {(currentSong.sourceDetails || 'Synced').replace(/^(Suno|YouTube)(?=\s*•)/, 'URL')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Center Zone: Playback Transport & Waveform */}
      <div className="joe-transport-playback order-3 lg:order-none w-full lg:w-auto flex-1 max-w-full flex items-center gap-1.5 lg:gap-2.5 min-w-0">
        {/* Transport buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onPrevNote}
            className="p-1 rounded-lg text-[#94A3A7] hover:text-[#F3F5F4] hover:bg-[#111D20] transition-colors"
            title={t('Previous Note / Measure', '上一音 / 小节')}
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onPlayPauseToggle}
            disabled={!playbackAvailable}
            className="w-8 h-8 rounded-full bg-[#B4F45A] text-[#0B1014] flex items-center justify-center hover:bg-[#c3f77a] hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(180,244,90,0.3)] disabled:opacity-30 disabled:cursor-not-allowed"
            title={!playbackAvailable ? t('Attach audio to play', '请先导入音频') : isPlaying ? t('Pause', '暂停') : t('Play', '播放')}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={onNextNote}
            className="p-1 rounded-lg text-[#94A3A7] hover:text-[#F3F5F4] hover:bg-[#111D20] transition-colors"
            title={t('Next Note / Measure', '下一音 / 小节')}
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Timestamp: 01:24 / 03:42 */}
        <div className="joe-transport-hide-mobile font-mono text-[10px] sm:text-[11px] tabular-nums text-[#94A3A7] shrink-0">
          <span className="text-[#F3F5F4] font-medium">{currentTimeFormatted}</span>
          <span className="text-[#4E5C60] mx-1">/</span>
          <span>{totalDurationFormatted}</span>
        </div>

        {/* Audio Waveform Scrubber */}
        <div
          ref={waveformRef}
          onClick={handleWaveformClick}
          className="joe-transport-hide-mobile flex-1 min-w-8 h-5 bg-[#111D20] border border-[#1A2E33] rounded-md px-1.5 flex items-center gap-0.5 cursor-pointer relative group overflow-hidden"
          title={t('Click to seek', '点击跳转')}
        >
          {/* Progress fill overlay */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-[#B4F45A]/10 pointer-events-none"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Green playhead indicator line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#B4F45A] shadow-[0_0_8px_#B4F45A] pointer-events-none z-10 transition-all duration-75"
            style={{ left: `${progressPercent}%` }}
          />

          {waveformBars.map((height, i) => {
            const barPercent = (i / waveformBars.length) * 100;
            const isPassed = barPercent <= progressPercent;
            return (
              <div
                key={i}
                className="flex-1 rounded-full transition-all duration-100"
                style={{
                  height: `${Math.max(15, height * 0.7)}%`,
                  backgroundColor: isPassed ? '#B4F45A' : '#2A3C41'
                }}
              />
            );
          })}
        </div>

        {/* Unified accessible dropdown — default speed is 1.0x. */}
        <StudioSelect
          label={t('Playback speed', '播放速度')}
          compact
          className="w-[70px] shrink-0 font-mono"
          value={String(playbackSpeed)}
          onChange={(speed) => onSpeedChange(Number(speed))}
          disabled={!playbackAvailable}
          options={speeds.map(speed => ({ value: String(speed), label: `${speed.toFixed(speed === 1 ? 1 : speed === 0.5 || speed === 1.5 ? 1 : 2)}x` }))}
        />

        {/* Loop Toggle */}
        <button
          onClick={onLoopToggle}
          className={`p-1 rounded-lg border transition-colors shrink-0 ${
            isLooping
              ? 'bg-[#B4F45A]/20 border-[#B4F45A] text-[#B4F45A]'
              : 'bg-[#111D20] border-[#1A2E33] text-[#94A3A7] hover:text-[#F3F5F4]'
          }`}
          title={isLooping ? t('Loop active', '循环已开启') : t('Enable loop', '开启循环')}
        >
          <Repeat className="w-3.5 h-3.5" />
        </button>

        {/* Mute button */}
        <button
          onClick={handleToggleMute}
          className={`p-1 rounded-lg border transition-colors shrink-0 ${
            isMuted
              ? 'bg-red-500/20 border-red-500 text-red-400'
              : 'bg-[#111D20] border-[#1A2E33] text-[#94A3A7] hover:text-[#F3F5F4]'
          }`}
          title={isMuted ? t('Unmute dizi', '取消静音') : t('Mute dizi', '笛音静音')}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 3. Right Zone: Action buttons */}
      <div className="joe-transport-right order-2 lg:order-none flex items-center gap-1 sm:gap-1.5 shrink-0">
        <PWAInstallButton />
        {/* Practice Mode Toggle */}
        <button
          onClick={onPracticeModeToggle}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            isPracticeMode
              ? 'bg-[#16272C] border-[#B4F45A] text-[#B4F45A]'
              : 'bg-[#111D20] border-[#1A2E33] text-[#94A3A7] hover:text-[#F3F5F4]'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isPracticeMode ? 'bg-[#B4F45A] shadow-[0_0_6px_#B4F45A]' : 'bg-[#4B5E63]'
            }`}
          />
          <span className="hidden 2xl:inline">{t('Practice mode', '练习模式')}</span>
        </button>

        {/* Export Sheet Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#B4F45A] text-[#0B1014] hover:bg-[#c3f77a] transition-all shadow-sm"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">{t('Export Sheet', '导出乐谱')}</span>
        </button>

        {/* Studio Settings */}
        <button
          onClick={onOpenSettings}
          className="p-1 rounded-lg bg-[#111D20] border border-[#1A2E33] text-[#94A3A7] hover:text-[#F3F5F4] transition-colors"
          title={t('Studio Settings', '工作室设置')}
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
