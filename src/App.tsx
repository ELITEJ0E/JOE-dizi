import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ViewMode, Song, DiziKey, FingeringSystem } from './types/dizi';
import { PRESET_SONGS } from './data/presetSongs';
import { calculateMusicalTonic, findFingering, getJianpuForMidi, pitchNameToMidi, midiToPitchName } from './music/diziTheory';
import { diziAudio } from './audio/diziSynth';
import { saveUserSong } from './utils/songStorage';

// Components
import { Sidebar } from './components/Sidebar';
import { TopTransportBar } from './components/TopTransportBar';
import { SheetMusicView } from './components/SheetMusicView';
import { LiveFingeringPanel } from './components/LiveFingeringPanel';
import { BottomTimeline } from './components/BottomTimeline';
import { YouTubeSyncPlayer } from './components/YouTubeSyncPlayer';
import { StudioSelect } from './components/StudioSelect';
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
import { ChevronDown, Home, Music, BookOpen, Activity, Menu, Upload, ExternalLink, Clock3 } from 'lucide-react';

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
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(true);
  const [mediaTime, setMediaTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [youtubeSeekRequest, setYoutubeSeekRequest] = useState<{ seconds: number; token: number } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileTimelineOpen, setMobileTimelineOpen] = useState(false);
  const [showImporter, setShowImporter] = useState(true);

  // Modals
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Playback step timer ref
  const playbackTimerRef = useRef<number | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastRenderedAudioClockRef = useRef(-1);

  const hasYouTube = Boolean(currentSong.youtubeVideoId);
  const hasLocalAudio = Boolean(currentSong.audioUrl) && !hasYouTube;
  const usesSourcePlayback = hasYouTube || hasLocalAudio;

  const onMediaClock = useCallback((seconds: number, duration: number) => {
    // The live note highlight needs ~60 Hz precision for 30–50ms ornaments;
    // the heavier time labels/waveform only need a refresh every ~80ms.
    if (Number.isFinite(seconds) && (lastRenderedAudioClockRef.current < 0 || Math.abs(seconds - lastRenderedAudioClockRef.current) > 0.08)) {
      lastRenderedAudioClockRef.current = seconds;
      setMediaTime(seconds);
    }
    if (Number.isFinite(duration) && duration > 0) setMediaDuration(duration);
    const notes = currentSong.notes;
    if (!notes.length || notes[0].startTime === undefined) return;
    let index = -1;
    let low = 0, high = notes.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if ((notes[mid].startTime ?? Infinity) <= seconds) { index = mid; low = mid + 1; }
      else high = mid - 1;
    }
    if (index >= 0 && seconds > (notes[index].startTime ?? 0) + (notes[index].durationSeconds ?? 0) + 0.025) index = -1;
    setActiveNoteIndex(previous => previous === index ? previous : index);
  }, [currentSong.notes]);

  const loadSong = useCallback((song: Song) => {
    diziAudio.stopAll();
    setIsPlaying(false);
    setCurrentSong(song);
    setDiziKey(song.diziKey);
    setFingeringSystem(song.fingeringSystem);
    setActiveNoteIndex(0);
    setMediaTime(0);
    lastRenderedAudioClockRef.current = -1;
    setMediaDuration(song.audioDuration || 0);
    setYoutubeSeekRequest(null);
    setCurrentView('transcribe');
    saveUserSong(song);
  }, []);

  useEffect(() => {
    if (currentSong.source !== 'preset') saveUserSong(currentSong);
  }, [currentSong]);

  // Always derive displayed Jianpu from the *actual sounding pitch* and
  // selected tonic. Persisted Jianpu from a different key must not be shown.
  const displaySong = useMemo<Song>(() => ({
    ...currentSong,
    diziKey,
    fingeringSystem,
    musicalKey: calculateMusicalTonic(diziKey, fingeringSystem),
    notes: currentSong.notes.map(note => ({
      ...note,
      pitch: midiToPitchName(pitchNameToMidi(note.pitch), diziKey),
      ...getJianpuForMidi(pitchNameToMidi(note.pitch), diziKey, fingeringSystem),
    })),
  }), [currentSong, diziKey, fingeringSystem]);
  const currentNote = usesSourcePlayback
    ? displaySong.notes[activeNoteIndex] || null
    : displaySong.notes[activeNoteIndex] || displaySong.notes[0] || null;
  const nextNote = displaySong.notes[activeNoteIndex + 1] || null;

  // Formatted timestamps
  const totalNotes = currentSong.notes.length;
  const totalDurationSeconds = usesSourcePlayback
    ? (mediaDuration || currentSong.audioDuration || 0)
    : (totalNotes * (60 / currentSong.bpm)) / playbackSpeed;
  const currentSeconds = usesSourcePlayback
    ? mediaTime
    : (activeNoteIndex * (60 / currentSong.bpm)) / playbackSpeed;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = usesSourcePlayback
    ? (totalDurationSeconds > 0 ? Math.min(100, mediaTime / totalDurationSeconds * 100) : 0)
    : totalNotes > 1 ? (activeNoteIndex / (totalNotes - 1)) * 100 : 0;

  // Handle Play/Pause
  const handleTogglePlayPause = () => {
    if (hasYouTube) {
      setIsPlaying(previous => !previous);
      return;
    }
    if (hasLocalAudio) {
      const audio = localAudioRef.current;
      if (!audio) return;
      if (audio.paused) {
        audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      } else {
        audio.pause();
        setIsPlaying(false);
      }
      return;
    }
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
    if (usesSourcePlayback) return;
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
  }, [isPlaying, activeNoteIndex, currentSong, diziKey, fingeringSystem, playbackSpeed, isLooping, usesSourcePlayback]);

  useEffect(() => {
    if (localAudioRef.current) {
      localAudioRef.current.playbackRate = playbackSpeed;
      localAudioRef.current.loop = isLooping;
    }
  }, [playbackSpeed, isLooping, currentSong.audioUrl]);

  // HTMLAudioElement's `timeupdate` event only fires a few times each second,
  // which makes rapid dizi fingering changes impossible to follow. Use the
  // actual media clock on animation frames while the recording is playing.
  useEffect(() => {
    if (!hasLocalAudio || !isPlaying) return;
    let frame: number;
    const tick = () => {
      const audio = localAudioRef.current;
      if (audio && Number.isFinite(audio.currentTime)) onMediaClock(audio.currentTime, audio.duration);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [hasLocalAudio, isPlaying, onMediaClock]);

  // Release the previous local recording once it is no longer referenced.
  const lastObjectUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const next = currentSong.audioUrl?.startsWith('blob:') ? currentSong.audioUrl : null;
    if (lastObjectUrlRef.current && lastObjectUrlRef.current !== next) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
    }
    lastObjectUrlRef.current = next;
  }, [currentSong.audioUrl]);
  useEffect(() => () => {
    if (lastObjectUrlRef.current) URL.revokeObjectURL(lastObjectUrlRef.current);
  }, []);

  // Note Selection
  const handleSelectNote = (idx: number) => {
    setActiveNoteIndex(idx);
    const note = currentSong.notes[idx];
    if (note) {
      if (usesSourcePlayback && note.startTime !== undefined) {
        if (hasYouTube) setYoutubeSeekRequest({ seconds: note.startTime, token: Date.now() });
        else if (localAudioRef.current) localAudioRef.current.currentTime = note.startTime;
        setMediaTime(note.startTime);
        return;
      }
      const fingering = findFingering(note.pitch, diziKey, fingeringSystem);
      if (fingering) {
        diziAudio.playNote(fingering.frequency, 0.8, note.technique);
      }
    }
  };

  // Seek by timeline percent
  const handleSeek = (percent: number) => {
    if (usesSourcePlayback && totalDurationSeconds > 0) {
      const seconds = Math.max(0, Math.min(totalDurationSeconds, percent / 100 * totalDurationSeconds));
      if (hasYouTube) setYoutubeSeekRequest({ seconds, token: Date.now() });
      else if (localAudioRef.current) localAudioRef.current.currentTime = seconds;
      onMediaClock(seconds, totalDurationSeconds);
      return;
    }
    if (currentSong.notes.length === 0) return;
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
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#0B1014] text-[#F3F5F4] select-none font-sans">
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

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <button className="absolute inset-0 bg-black/70" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} />
          <Sidebar currentView={currentView} onSelectView={(view) => {
            setMobileMenuOpen(false);
            if (view === 'settings') setIsSettingsOpen(true);
            else setCurrentView(view);
          }} className="relative z-10 flex h-full max-w-[85vw]" />
        </div>
      )}

      {/* 2. Main Content & Workstation Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Transport & Song Bar */}
        <TopTransportBar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          playbackAvailable={usesSourcePlayback || currentSong.notes.length > 0}
          currentSong={currentSong}
          isPlaying={isPlaying}
          onPlayPauseToggle={handleTogglePlayPause}
          onPrevNote={() => handleSelectNote(Math.max(0, activeNoteIndex - 1))}
          onNextNote={() => handleSelectNote(Math.max(0, Math.min(currentSong.notes.length - 1, activeNoteIndex + 1)))}
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

        {hasLocalAudio && (
          <audio
            key={currentSong.audioUrl}
            ref={localAudioRef}
            src={currentSong.audioUrl}
            preload="metadata"
            onLoadedMetadata={(event) => onMediaClock(event.currentTarget.currentTime, event.currentTarget.duration)}
            onTimeUpdate={(event) => onMediaClock(event.currentTarget.currentTime, event.currentTarget.duration)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        )}

        {/* Dynamic Center Workstation Content */}
        <main className="flex-1 min-h-0 overflow-y-auto p-3 pb-24 sm:p-6 md:pb-6">
          {currentView === 'overview' && (
            <OverviewView onNavigate={setCurrentView} diziKey={diziKey} />
          )}

          {currentView === 'transcribe' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#94A3A7]">Import a new song or open its synchronized score</span>
                <button onClick={() => setShowImporter(previous => !previous)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#1A2E33] bg-[#111D20] px-3 py-2 text-xs text-[#B4F45A] shrink-0">
                  <Upload className="w-3.5 h-3.5" /> {showImporter ? 'Hide importer' : 'Import song'}
                </button>
              </div>

              {showImporter && (
                <DiziTranscriberView
                  currentSong={displaySong}
                  diziKey={diziKey}
                  onDiziKeyChange={setDiziKey}
                  fingeringSystem={fingeringSystem}
                  onUpdateSong={setCurrentSong}
                  onLoadSong={loadSong}
                />
              )}

              {hasYouTube && currentSong.youtubeVideoId && (
                <div className="max-w-4xl mx-auto">
                  <YouTubeSyncPlayer
                    videoId={currentSong.youtubeVideoId}
                    isPlaying={isPlaying}
                    playbackSpeed={playbackSpeed}
                    isLooping={isLooping}
                    seekRequest={youtubeSeekRequest}
                    onTimeChange={onMediaClock}
                    onPlayingChange={setIsPlaying}
                  />
                </div>
              )}

              {currentSong.source === 'suno' && currentSong.sourceUrl && (
                <div className="rounded-xl border border-[#1A2E33] bg-[#111D20] overflow-hidden">
                  <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-[#94A3A7]">{currentSong.audioUrl ? 'Playing the audio you attached.' : 'Listen using the Suno player below, or attach a downloaded audio file for transcription. The embed cannot expose audio samples or sync with the top transport.'}</p>
                    <a href={currentSong.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#B4F45A] flex items-center gap-1 shrink-0">
                      Open on Suno <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  {currentSong.sunoClipId && !currentSong.audioUrl && (
                    <iframe title="Suno song player" src={`https://suno.com/embed/${currentSong.sunoClipId}`}
                      loading="lazy" allow="autoplay; encrypted-media; clipboard-write" className="w-full h-[220px] border-0 bg-[#0B1014]" />
                  )}
                </div>
              )}

              {currentSong.notes.length === 0 && (
                <div className="border border-amber-700/40 bg-amber-500/5 text-amber-200 rounded-xl p-4 flex items-start gap-2 text-xs leading-relaxed">
                  <Clock3 className="w-4 h-4 shrink-0" /> No note transcription yet. Importing a URL loads its source; attach matching audio above to generate real, timestamped Jianpu notes and fingering diagrams.
                </div>
              )}
              {/* Header Title & Instrument Controls Strip (matches screenshot) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#16272C]">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-[#F3F5F4]">
                    Dizi Transcription
                  </h2>
                  <span className="text-[#3E5054] font-mono">|</span>

                  {/* Dropdown 1: Dizi Key (e.g. G Dizi ▾) */}
                  <StudioSelect label="Select Dizi Key" compact value={diziKey} onChange={setDiziKey}
                    options={(['G', 'D', 'C', 'F', 'A', 'E', 'Bb'] as DiziKey[]).map(key => ({ value: key, label: `${key} Dizi` }))} />

                  {/* Dropdown 2: Fingering System (e.g. 筒音作5 ▾) */}
                  <StudioSelect label="Select Fingering System" compact value={fingeringSystem} onChange={setFingeringSystem} options={[
                    { value: 'tongyin_5', label: '筒音作5' },
                    { value: 'tongyin_2', label: '筒音作2' },
                    { value: 'tongyin_1', label: '筒音作1' },
                    { value: 'tongyin_6', label: '筒音作6' },
                    { value: 'tongyin_3', label: '筒音作3' },
                  ]} />

                  {/* Dropdown 3: Musical Tonic (e.g. 1 = G ▾) */}
                  <div className="relative">
                    <div className="bg-[#111D20] border border-[#1A2E33] rounded-lg px-3 py-1 text-xs font-serif font-bold text-[#B4F45A]">
                      {calculateMusicalTonic(diziKey, fingeringSystem)}
                    </div>
                  </div>

                  {/* Dropdown 4: Notation Format (e.g. Jianpu ▾) */}
                  <StudioSelect label="Select Notation Format" compact value={notationMode} onChange={setNotationMode} options={[
                    { value: 'dual', label: 'Dual (Jianpu + Staff)' },
                    { value: 'jianpu', label: 'Jianpu 简谱' },
                    { value: 'staff', label: 'Staff 五线谱' },
                  ]} />

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
              {currentSong.notes.length > 0 && <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
                {/* Center: Sheet Music View (7 cols on lg, or 8 cols on xl) */}
                <div className="lg:col-span-8 xl:col-span-8">
                  <SheetMusicView
                    song={displaySong}
                    activeNoteIndex={activeNoteIndex}
                    notationMode={notationMode}
                    diziKey={diziKey}
                    fingeringSystem={fingeringSystem}
                    onSelectNote={handleSelectNote}
                  />
                </div>

                {/* Right: Live Fingering Panel (4 cols) */}
                <div className="lg:col-span-4 xl:col-span-4 lg:sticky top-4">
                  <LiveFingeringPanel
                    currentNote={currentNote}
                    nextNote={nextNote}
                    diziKey={diziKey}
                    fingeringSystem={fingeringSystem}
                  />
                </div>
              </div>}
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
              currentSong={displaySong}
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
              onSelectSong={loadSong}
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
          currentTimeSeconds={usesSourcePlayback ? currentSeconds : undefined}
          durationSeconds={usesSourcePlayback ? totalDurationSeconds : undefined}
          onSeekPercent={handleSeek}
          className="hidden md:block"
        />

        <div className="md:hidden border-t border-[#16272C] bg-[#0B1014]">
          <button className="w-full px-4 py-2 text-xs flex items-center justify-between text-[#94A3A7]" onClick={() => setMobileTimelineOpen(value => !value)}>
            <span>Timeline · {formatTime(currentSeconds)} / {formatTime(totalDurationSeconds)}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${mobileTimelineOpen ? 'rotate-180' : ''}`} />
          </button>
          {mobileTimelineOpen && <BottomTimeline song={currentSong} activeNoteIndex={activeNoteIndex} onSeekToNote={handleSelectNote} onSeekToMeasure={handleSeekToMeasure} currentTimeSeconds={usesSourcePlayback ? currentSeconds : undefined} durationSeconds={usesSourcePlayback ? totalDurationSeconds : undefined} onSeekPercent={handleSeek} className="max-h-44 overflow-y-auto" />}
        </div>
      </div>

      <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#1A2E33] bg-[#091014]/95 backdrop-blur-lg grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {([
          ['overview', Home, 'Home'], ['transcribe', Music, 'Transcribe'], ['songbook', BookOpen, 'Songs'], ['tuner', Activity, 'Tuner'],
        ] as const).map(([view, Icon, label]) => (
          <button key={view} onClick={() => setCurrentView(view)} className={`min-h-14 flex flex-col items-center justify-center gap-1 text-[10px] ${currentView === view ? 'text-[#B4F45A]' : 'text-[#94A3A7]'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
        <button onClick={() => setMobileMenuOpen(true)} className="min-h-14 flex flex-col items-center justify-center gap-1 text-[10px] text-[#94A3A7]">
          <Menu className="w-4 h-4" />More
        </button>
      </nav>

      {/* Modals */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        song={displaySong}
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
