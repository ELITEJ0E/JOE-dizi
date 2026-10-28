import React, { useState, useEffect, useRef } from 'react';
import { ViewMode, Song, DiziKey, FingeringSystem, DiziNote } from './types/dizi';
import { PRESET_SONGS } from './data/presetSongs';
import { calculateMusicalTonic, findFingering } from './music/diziTheory';
import { diziAudio } from './audio/diziSynth';

// Components
import { Sidebar } from './components/Sidebar';
import { TopTransportBar } from './components/TopTransportBar';
import { SheetMusicView } from './components/SheetMusicView';
import { LiveFingeringPanel } from './components/LiveFingeringPanel';
import { BottomTimeline } from './components/BottomTimeline';
import { ExportModal } from './components/ExportModal';
import { SettingsModal } from './components/SettingsModal';

// Views
import { OverviewView } from './components/views/OverviewView';
import { DiziTranscriberView } from './components/views/DiziTranscriberView';
import { FingeringLibraryView } from './components/views/FingeringLibraryView';
import { ScalesModesView } from './components/views/ScalesModesView';
import { HarmonyArpeggiosView } from './components/views/HarmonyArpeggiosView';
import { PracticeStudioView } from './components/views/PracticeStudioView';
import { SongbookView } from './components/views/SongbookView';
import { DiziTunerView } from './components/views/DiziTunerView';

// Icons
import { ChevronDown, SlidersHorizontal, Music } from 'lucide-react';

export default function App() {
  // Navigation & View state
  const [currentView, setCurrentView] = useState<ViewMode>('transcribe');

  // Song & Instrument configuration
  const [currentSong, setCurrentSong] = useState<Song>(PRESET_SONGS[0]); // Moon Over the Pass
  const [diziKey, setDiziKey] = useState<DiziKey>('G');
  const [fingeringSystem, setFingeringSystem] = useState<FingeringSystem>('tongyin_5');
  const [notationMode, setNotationMode] = useState<'jianpu' | 'staff' | 'dual'>('dual');

  // Playback & Practice state
  // Default note index 3 corresponds to Measure 3 Note 4 (2̇ in screenshot!)
  const [activeNoteIndex, setActiveNoteIndex] = useState<number>(3);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.75);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(true);

  // Modals
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Playback step timer ref
  const playbackTimerRef = useRef<number | null>(null);

  const currentNote = currentSong.notes[activeNoteIndex] || currentSong.notes[0] || null;
  const nextNote = currentSong.notes[activeNoteIndex + 1] || null;

  // Formatted timestamps
  const totalNotes = currentSong.notes.length;
  const totalDurationSeconds = (totalNotes * (60 / currentSong.bpm)) / playbackSpeed;
  const currentSeconds = (activeNoteIndex * (60 / currentSong.bpm)) / playbackSpeed;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = totalNotes > 0 ? (activeNoteIndex / (totalNotes - 1)) * 100 : 0;

  // Handle Play/Pause
  const handleTogglePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      diziAudio.stopAll();
      if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
    } else {
      setIsPlaying(true);
    }
  };

  // Playback sequencer effect
  useEffect(() => {
    if (!isPlaying) {
      if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
      return;
    }

    const playCurrentStep = () => {
      const note = currentSong.notes[activeNoteIndex];
      if (!note) {
        setIsPlaying(false);
        return;
      }

      // Compute pitch fingering and sound
      const fingering = findFingering(note.pitch, diziKey, fingeringSystem);
      const beatDurationSec = (60 / currentSong.bpm) / playbackSpeed;
      const noteDurationSec = Math.max(0.2, (note.duration || 1) * beatDurationSec);

      if (fingering) {
        diziAudio.playNote(fingering.frequency, noteDurationSec * 0.92, note.technique);
      }

      // Schedule next note
      playbackTimerRef.current = window.setTimeout(() => {
        setActiveNoteIndex((prev) => {
          const next = prev + 1;
          if (next >= currentSong.notes.length) {
            if (isLooping) {
              return 0;
            } else {
              setIsPlaying(false);
              return 0;
            }
          }
          return next;
        });
      }, noteDurationSec * 1000);
    };

    playCurrentStep();

    return () => {
      if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
    };
  }, [isPlaying, activeNoteIndex, currentSong, diziKey, fingeringSystem, playbackSpeed, isLooping]);

  // Note Selection
  const handleSelectNote = (idx: number) => {
    setActiveNoteIndex(idx);
    const note = currentSong.notes[idx];
    if (note) {
      const fingering = findFingering(note.pitch, diziKey, fingeringSystem);
      if (fingering) {
        diziAudio.playNote(fingering.frequency, 0.8, note.technique);
      }
    }
  };

  // Seek by timeline percent
  const handleSeek = (percent: number) => {
    const targetIdx = Math.round((percent / 100) * (currentSong.notes.length - 1));
    handleSelectNote(Math.max(0, Math.min(currentSong.notes.length - 1, targetIdx)));
  };

  // Seek to specific measure
  const handleSeekToMeasure = (measure: number) => {
    const targetIdx = currentSong.notes.findIndex(n => n.measureNumber >= measure);
    if (targetIdx !== -1) {
      handleSelectNote(targetIdx);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B1014] text-[#F3F5F4] select-none font-sans">
      {/* 1. Left Navigation Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={(v) => {
          if (v === 'settings') {
            setIsSettingsOpen(true);
          } else {
            setCurrentView(v);
          }
        }}
        className="shrink-0 hidden md:flex"
      />

      {/* 2. Main Content & Workstation Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Transport & Song Bar */}
        <TopTransportBar
          currentSong={currentSong}
          isPlaying={isPlaying}
          onPlayPauseToggle={handleTogglePlayPause}
          onPrevNote={() => handleSelectNote(Math.max(0, activeNoteIndex - 1))}
          onNextNote={() => handleSelectNote(Math.min(currentSong.notes.length - 1, activeNoteIndex + 1))}
          playbackSpeed={playbackSpeed}
          onSpeedChange={setPlaybackSpeed}
          isLooping={isLooping}
          onLoopToggle={() => setIsLooping(!isLooping)}
          isPracticeMode={isPracticeMode}
          onPracticeModeToggle={() => setIsPracticeMode(!isPracticeMode)}
          onOpenExport={() => setIsExportOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          progressPercent={progressPercent}
          currentTimeFormatted={formatTime(currentSeconds)}
          totalDurationFormatted={formatTime(totalDurationSeconds)}
          onSeek={handleSeek}
        />

        {/* Dynamic Center Workstation Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {currentView === 'overview' && (
            <OverviewView onNavigate={setCurrentView} diziKey={diziKey} />
          )}

          {currentView === 'transcribe' && (
            <div className="space-y-4">
              {/* Header Title & Instrument Controls Strip (matches screenshot) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#16272C]">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-[#F3F5F4]">
                    Dizi Transcription
                  </h2>
                  <span className="text-[#3E5054] font-mono">|</span>

                  {/* Dropdown 1: Dizi Key (e.g. G Dizi ▾) */}
                  <div className="relative">
                    <select
                      value={diziKey}
                      onChange={(e) => setDiziKey(e.target.value as DiziKey)}
                      aria-label="Select Dizi Key"
                      className="appearance-none bg-[#111D20] border border-[#1A2E33] hover:border-[#36B39B] rounded-lg pl-3 pr-7 py-1 text-xs font-mono font-medium text-[#F3F5F4] focus:outline-none transition-colors cursor-pointer"
                    >
                      {(['G', 'D', 'C', 'F', 'A', 'E', 'Bb'] as DiziKey[]).map((k) => (
                        <option key={k} value={k}>
                          {k} Dizi
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-[#94A3A7] pointer-events-none" />
                  </div>

                  {/* Dropdown 2: Fingering System (e.g. 筒音作5 ▾) */}
                  <div className="relative">
                    <select
                      value={fingeringSystem}
                      onChange={(e) => setFingeringSystem(e.target.value as FingeringSystem)}
                      aria-label="Select Fingering System"
                      className="appearance-none bg-[#111D20] border border-[#1A2E33] hover:border-[#36B39B] rounded-lg pl-3 pr-7 py-1 text-xs font-serif font-medium text-[#F3F5F4] focus:outline-none transition-colors cursor-pointer"
                    >
                      <option value="tongyin_5">筒音作5</option>
                      <option value="tongyin_2">筒音作2</option>
                      <option value="tongyin_1">筒音作1</option>
                      <option value="tongyin_6">筒音作6</option>
                      <option value="tongyin_3">筒音作3</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-[#94A3A7] pointer-events-none" />
                  </div>

                  {/* Dropdown 3: Musical Tonic (e.g. 1 = G ▾) */}
                  <div className="relative">
                    <div className="bg-[#111D20] border border-[#1A2E33] rounded-lg px-3 py-1 text-xs font-serif font-bold text-[#B4F45A]">
                      {calculateMusicalTonic(diziKey, fingeringSystem)}
                    </div>
                  </div>

                  {/* Dropdown 4: Notation Format (e.g. Jianpu ▾) */}
                  <div className="relative">
                    <select
                      value={notationMode}
                      onChange={(e) => setNotationMode(e.target.value as 'jianpu' | 'staff' | 'dual')}
                      aria-label="Select Notation Format"
                      className="appearance-none bg-[#111D20] border border-[#1A2E33] hover:border-[#36B39B] rounded-lg pl-3 pr-7 py-1 text-xs font-mono font-medium text-[#F3F5F4] focus:outline-none transition-colors cursor-pointer"
                    >
                      <option value="dual">Dual (Jianpu + Staff)</option>
                      <option value="jianpu">Jianpu 简谱</option>
                      <option value="staff">Staff 五线谱</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-[#94A3A7] pointer-events-none" />
                  </div>

                  {/* BPM Badge (e.g. 92 BPM) */}
                  <div className="bg-[#111D20] border border-[#1A2E33] rounded-lg px-3 py-1 text-xs font-mono text-[#F3F5F4]">
                    {currentSong.bpm} BPM
                  </div>
                </div>

                {/* Sub-tools link */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentView('songbook')}
                    className="text-xs text-[#36B39B] hover:text-[#B4F45A] transition-colors"
                  >
                    Switch Song...
                  </button>
                </div>
              </div>

              {/* Main Center + Right Split Grid (Exact layout from user screenshot) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Center: Sheet Music View (7 cols on lg, or 8 cols on xl) */}
                <div className="lg:col-span-8 xl:col-span-8">
                  <SheetMusicView
                    song={currentSong}
                    activeNoteIndex={activeNoteIndex}
                    notationMode={notationMode}
                    diziKey={diziKey}
                    fingeringSystem={fingeringSystem}
                    onSelectNote={handleSelectNote}
                  />
                </div>

                {/* Right: Live Fingering Panel (4 cols) */}
                <div className="lg:col-span-4 xl:col-span-4 sticky top-4">
                  <LiveFingeringPanel
                    currentNote={currentNote}
                    nextNote={nextNote}
                    diziKey={diziKey}
                    fingeringSystem={fingeringSystem}
                  />
                </div>
              </div>
            </div>
          )}

          {currentView === 'fingering' && (
            <FingeringLibraryView
              diziKey={diziKey}
              onDiziKeyChange={setDiziKey}
              fingeringSystem={fingeringSystem}
              onFingeringSystemChange={setFingeringSystem}
            />
          )}

          {currentView === 'scales' && (
            <ScalesModesView
              diziKey={diziKey}
              fingeringSystem={fingeringSystem}
            />
          )}

          {currentView === 'harmony' && (
            <HarmonyArpeggiosView
              diziKey={diziKey}
              fingeringSystem={fingeringSystem}
            />
          )}

          {currentView === 'practice' && (
            <PracticeStudioView
              currentSong={currentSong}
              diziKey={diziKey}
              fingeringSystem={fingeringSystem}
              onJumpToMeasure={(m) => {
                handleSeekToMeasure(m);
                setCurrentView('transcribe');
              }}
            />
          )}

          {currentView === 'songbook' && (
            <SongbookView
              currentSong={currentSong}
              onSelectSong={(s) => {
                setCurrentSong(s);
                setDiziKey(s.diziKey);
                setFingeringSystem(s.fingeringSystem);
                setActiveNoteIndex(0);
                setCurrentView('transcribe');
              }}
            />
          )}

          {currentView === 'tuner' && (
            <DiziTunerView
              diziKey={diziKey}
              fingeringSystem={fingeringSystem}
            />
          )}
        </main>

        {/* Bottom Interactive Timeline (matches screenshot) */}
        <BottomTimeline
          song={currentSong}
          activeNoteIndex={activeNoteIndex}
          onSeekToNote={handleSelectNote}
          onSeekToMeasure={handleSeekToMeasure}
        />
      </div>

      {/* Modals */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        song={currentSong}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        diziKey={diziKey}
        onDiziKeyChange={setDiziKey}
        fingeringSystem={fingeringSystem}
        onFingeringSystemChange={setFingeringSystem}
        notationMode={notationMode}
        onNotationModeChange={setNotationMode}
      />
    </div>
  );
}
