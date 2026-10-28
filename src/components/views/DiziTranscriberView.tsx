import React, { useState, useRef, useEffect } from 'react';
import { Song, DiziKey, FingeringSystem, DiziNote } from '../../types/dizi';
import { pitchDetector } from '../../audio/pitchDetector';
import { analyzeMelodyInBackground } from '../../audio/analyzeMelody';
import { midiToPitchName, findFingering, DIZI_KEYS_SPEC, getJianpuForMidi, pitchNameToMidi, midiToFrequency } from '../../music/diziTheory';
import { diziAudio } from '../../audio/diziSynth';
import { getShareMetadata, parseMediaSource } from '../../utils/mediaSources';
import { StudioSelect } from '../StudioSelect';
import {
  Upload,
  Mic,
  MicOff,
  Music,
  Plus,
  Trash2,
  Play,
  Link as LinkIcon,
  CheckCircle2,
  FileAudio,
  AlertCircle,
  ChevronDown
} from 'lucide-react';

interface DiziTranscriberViewProps {
  currentSong: Song;
  onUpdateSong: (song: Song) => void;
  onLoadSong: (song: Song) => void;
  diziKey: DiziKey;
  onDiziKeyChange: (key: DiziKey) => void;
  fingeringSystem: FingeringSystem;
}

export const DiziTranscriberView: React.FC<DiziTranscriberViewProps> = ({
  currentSong,
  onUpdateSong,
  onLoadSong,
  diziKey,
  onDiziKeyChange,
  fingeringSystem
}) => {
  const [transcribeMethod, setTranscribeMethod] = useState<'upload' | 'mic' | 'url'>('upload');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedPitches, setRecordedPitches] = useState<string[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusError, setStatusError] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [pitchDraft, setPitchDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => pitchDetector.stopMicrophone(), []);

  const transcribeFile = async (file: File) => {
    setIsProcessing(true);
    setStatusError(false);
    setStatusMessage(`Decoding audio file "${file.name}"...`);
    let ctx: AudioContext | null = null;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AudioCtx();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      setStatusMessage(`Tracking dizi melody within the ${diziKey}-key instrument range…`);
      const { rangeStartMidi, rangeEndMidi } = DIZI_KEYS_SPEC[diziKey];
      const { notes: segments, estimatedBpm } = await analyzeMelodyInBackground(audioBuffer, percent => {
        setStatusMessage(`Analyzing melody in the background… ${percent}%`);
      }, { minMidi: rangeStartMidi, maxMidi: rangeEndMidi });
      if (segments.length === 0) {
        setStatusError(true);
        setStatusMessage('No clear single-note melody detected. Try a solo dizi or isolated melodic stem.');
        return;
      }

      const bpm = estimatedBpm || currentSong.bpm;
      const secondsPerBeat = 60 / Math.max(bpm, 1);
      const notes: DiziNote[] = segments.map((segment, index) => {
        const startingBeat = segment.startTime / secondsPerBeat;
        return {
          id: `transcribed_${Date.now()}_${index}`,
          pitch: midiToPitchName(segment.midi, diziKey),
          midi: segment.midi,
          ...getJianpuForMidi(segment.midi, diziKey, fingeringSystem),
          duration: Math.max(0.0625, Math.round(segment.duration / secondsPerBeat * 16) / 16),
          measureNumber: Math.floor(startingBeat / 4) + 1,
          beatInMeasure: Math.round((startingBeat % 4 + 1) * 100) / 100,
          startTime: segment.startTime,
          durationSeconds: segment.duration,
          confidence: segment.confidence,
        };
      });

      const attachesToLink = (currentSong.source === 'youtube' || currentSong.source === 'suno');
      const newSong: Song = {
        ...currentSong,
        id: attachesToLink ? currentSong.id : `transcription_${Date.now()}`,
        titleEn: attachesToLink ? currentSong.titleEn : file.name.replace(/\.[^/.]+$/, ''),
        titleZh: attachesToLink ? currentSong.titleZh : '新转谱乐曲',
        source: attachesToLink ? currentSong.source : 'upload',
        sourceDetails: `${attachesToLink ? currentSong.source === 'youtube' ? 'YouTube' : 'Suno' : 'Audio File'} • Audio analyzed`,
        audioUrl: URL.createObjectURL(file),
        audioDuration: audioBuffer.duration,
        bpm,
        notes,
        sections: [],
        totalMeasures: Math.max(...notes.map(note => note.measureNumber), 1),
      };
      onLoadSong(newSong);
      const uncertainCount = notes.filter(note => note.confidence !== undefined && note.confidence < 0.35).length;
      setStatusMessage(`Found ${notes.length} candidate melody events${estimatedBpm ? ` at ≈${estimatedBpm} BPM` : ''}, including fast ornaments. ${uncertainCount} ambiguous pitch candidates are marked '?' for review. Full mixes can contain other instruments; use an isolated dizi stem for the most reliable results.`);
      setStatusError(false);
    } catch (err) {
      console.error('Audio transcription failed', err);
      setStatusError(true);
      setStatusMessage('Unable to decode this file. Try a standard MP3 or WAV recording.');
    } finally {
      if (ctx) await ctx.close().catch(() => {});
      setIsProcessing(false);
    }
  };

  // Audio file upload and decoding
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await transcribeFile(file);
    e.target.value = '';
  };

  const handleImportUrl = async () => {
    const source = parseMediaSource(youtubeUrl);
    if (!source) {
      setStatusError(true);
      setStatusMessage('Enter a valid YouTube video URL or Suno /song/ link.');
      return;
    }
    setIsProcessing(true);
    setStatusError(false);
    setStatusMessage(`Importing ${source.kind === 'youtube' ? 'YouTube video' : 'Suno song'}…`);
    const metadata = await getShareMetadata(source);
    const newSong: Song = {
      ...currentSong,
      id: `${source.kind}_${source.id}`,
      titleEn: metadata.title || (source.kind === 'youtube' ? `YouTube video ${source.id}` : `Suno track ${source.id.slice(0, 8)}`),
      titleZh: '',
      artistEn: metadata.artist || '',
      artistZh: '',
      source: source.kind,
      sourceUrl: source.url,
      youtubeVideoId: source.kind === 'youtube' ? source.id : undefined,
      sunoClipId: source.kind === 'suno' ? source.id : undefined,
      sourceDetails: source.kind === 'youtube' ? 'YouTube • Embedded playback' : 'Suno • Link imported',
      imageUrl: metadata.thumbnail || (source.kind === 'youtube' ? `https://i.ytimg.com/vi/${source.id}/hqdefault.jpg` : undefined),
      audioUrl: undefined,
      audioDuration: undefined,
      notes: [],
      sections: [],
      totalMeasures: 0,
    };
    onLoadSong(newSong);
    setIsProcessing(false);
    setStatusMessage(source.kind === 'youtube'
      ? 'YouTube player loaded. To create a real note-by-note dizi score, attach a matching audio recording below.'
      : 'Suno song link imported. Attach the audio file downloaded from your Suno account to transcribe it.');
    setTranscribeMethod('upload');
  };

  // Real-time microphone whistling/humming transcription
  const handleToggleMicRecording = async () => {
    if (isRecording) {
      pitchDetector.stopMicrophone();
      setIsRecording(false);
      setStatusMessage(`Recording finished with ${recordedPitches.length} detected notes.`);
    } else {
      setRecordedPitches([]);
      setStatusMessage('Listening to your whistle or dizi... Sing or play a phrase.');
      const ok = await pitchDetector.startMicrophone((res) => {
        if (res && res.clarity > 0.8) {
          setRecordedPitches((prev) => {
            if (prev[prev.length - 1] !== res.pitchName) {
              return [...prev.slice(-30), res.pitchName];
            }
            return prev;
          });
        }
      });
      setIsRecording(ok);
    }
  };

  // Add recorded notes to current song
  const handleApplyRecordedNotes = () => {
    if (recordedPitches.length === 0) return;
    let measure = currentSong.notes.length > 0 ? currentSong.notes[currentSong.notes.length - 1].measureNumber + 1 : 1;
    let beat = 1;

    const addedNotes: DiziNote[] = recordedPitches.map((p, idx) => {
      const midi = pitchNameToMidi(p);
      const note: DiziNote = {
        id: `mic_${Date.now()}_${idx}`,
        pitch: p,
        midi,
        ...getJianpuForMidi(midi, diziKey, fingeringSystem),
        duration: 1,
        measureNumber: measure,
        beatInMeasure: beat
      };
      beat += 1;
      if (beat > 4) {
        measure += 1;
        beat = 1;
      }
      return note;
    });

    onUpdateSong({
      ...currentSong,
      notes: [...currentSong.notes, ...addedNotes],
      totalMeasures: measure + 1
    });
    setRecordedPitches([]);
    setStatusMessage(`Appended ${addedNotes.length} notes to the sheet music!`);
  };

  // Add single manual note in editor
  const handleAddManualNote = () => {
    const lastNote = currentSong.notes[currentSong.notes.length - 1];
    const newMeasure = lastNote ? lastNote.measureNumber : 1;
    const newBeat = lastNote ? (lastNote.beatInMeasure % 4) + 1 : 1;

    const pitch = DIZI_KEYS_SPEC[diziKey].tongyinPitch;
    const midi = pitchNameToMidi(pitch);
    const newNote: DiziNote = {
      id: `manual_${Date.now()}`,
      pitch,
      midi,
      ...getJianpuForMidi(midi, diziKey, fingeringSystem),
      duration: 1,
      measureNumber: newBeat === 1 ? newMeasure + 1 : newMeasure,
      beatInMeasure: newBeat
    };

    onUpdateSong({
      ...currentSong,
      notes: [...currentSong.notes, newNote],
      totalMeasures: Math.max(currentSong.totalMeasures, newNote.measureNumber + 1)
    });
    diziAudio.playNote(midiToFrequency(midi), 0.8);
  };

  const handleSavePitch = (noteId: string) => {
    if (!/^[A-G](?:#|b)?-?\d$/.test(pitchDraft)) {
      setStatusError(true);
      setStatusMessage('Enter a valid sounding note, such as D5, F#5, or Bb4.');
      return;
    }
    const midi = pitchNameToMidi(pitchDraft);
    onUpdateSong({
      ...currentSong,
      notes: currentSong.notes.map(note => note.id === noteId
        ? { ...note, pitch: midiToPitchName(midi, diziKey), midi, ...getJianpuForMidi(midi, diziKey, fingeringSystem) }
        : note),
    });
    setEditingNoteId(null);
    setStatusError(false);
    setStatusMessage(`Corrected sounding pitch to ${midiToPitchName(midi, diziKey)}.`);
  };

  // Delete note from editor
  const handleDeleteNote = (noteId: string) => {
    onUpdateSong({
      ...currentSong,
      notes: currentSong.notes.filter(n => n.id !== noteId)
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A2E33]">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#F3F5F4] flex items-center gap-2">
            <span>Dizi Transcriber</span>
            <span className="text-sm font-calligraphy text-[#36B39B]">智能转谱与简谱工作台</span>
          </h2>
          <p className="text-xs text-[#94A3A7] mt-1 max-w-2xl">
            Import songs from audio files, hum/whistle via live microphone, or sync YouTube/Suno tracks.
            Melodies are decoded and mapped onto physical 6-hole Dizi fingerings and Jianpu notation.
          </p>
        </div>

        {/* Input Method Segmented Tabs */}
        <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-[#111D20] p-1 rounded-lg border border-[#1A2E33] w-full sm:w-auto">
          <button
            onClick={() => setTranscribeMethod('upload')}
            className={`flex justify-center items-center gap-1.5 px-2 sm:px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              transcribeMethod === 'upload'
                ? 'bg-[#16272C] text-[#B4F45A] shadow-sm'
                : 'text-[#94A3A7] hover:text-[#F3F5F4]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Audio File</span>
          </button>
          <button
            onClick={() => setTranscribeMethod('mic')}
            className={`flex justify-center items-center gap-1.5 px-2 sm:px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              transcribeMethod === 'mic'
                ? 'bg-[#16272C] text-[#B4F45A] shadow-sm'
                : 'text-[#94A3A7] hover:text-[#F3F5F4]'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Live Mic</span>
          </button>
          <button
            onClick={() => setTranscribeMethod('url')}
            className={`flex justify-center items-center gap-1.5 px-2 sm:px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              transcribeMethod === 'url'
                ? 'bg-[#16272C] text-[#B4F45A] shadow-sm'
                : 'text-[#94A3A7] hover:text-[#F3F5F4]'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>YouTube / Suno</span>
          </button>
        </div>
      </div>

      {/* 2. Transcription Input Cards */}
      <div className="bg-[#111D20] border border-[#1A2E33] rounded-xl p-3 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#264049] bg-[#0E171A] px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#F3F5F4]">Dizi note range / 笛调</p>
            <p className="mt-0.5 text-[11px] text-[#94A3A7]">Choose the flute in the recording before transcribing. {DIZI_KEYS_SPEC[diziKey].tongyinPitch}–{midiToPitchName(DIZI_KEYS_SPEC[diziKey].rangeEndMidi, diziKey)} will be tracked; backing instruments may still need isolation.</p>
          </div>
          <StudioSelect label="Dizi key to detect" compact value={diziKey} onChange={onDiziKeyChange}
            options={(['G', 'D', 'C', 'F', 'A', 'E', 'Bb'] as DiziKey[]).map(key => ({ value: key, label: `${key} Dizi` }))} />
        </div>
        {transcribeMethod === 'upload' && (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-[#1A2E33] hover:border-[#36B39B] rounded-xl p-4 sm:p-8 text-center transition-colors">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="audio/*"
              className="hidden"
            />
            <FileAudio className="w-10 h-10 text-[#36B39B] mb-3" />
            <h3 className="text-sm font-semibold text-[#F3F5F4]">
              {currentSong.source === 'youtube' || currentSong.source === 'suno' ? 'Attach audio to imported song' : 'Upload Monophonic Audio'}
            </h3>
            <p className="text-xs text-[#94A3A7] mt-1 max-w-md">
              {currentSong.source === 'youtube' || currentSong.source === 'suno'
                ? `Use an audio file you have permission to analyze from the same ${currentSong.source === 'youtube' ? 'YouTube' : 'Suno'} song. Notes will synchronize to its playback timeline.`
                : 'Upload a solo dizi or isolated flute stem (MP3/WAV and browser-supported formats). The pitch tracker is range-constrained, but it cannot reliably separate flute from dense backing instruments.'}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="mt-4 px-4 py-2 rounded-lg bg-[#B4F45A] text-[#0B1014] text-xs font-semibold hover:bg-[#c3f77a] transition-all disabled:opacity-50 shadow-md"
            >
              {isProcessing ? 'Analyzing Audio...' : 'Select Audio File'}
            </button>
          </div>
        )}

        {transcribeMethod === 'mic' && (
          <div className="flex flex-col items-center text-center p-6 space-y-4">
            <button
              onClick={handleToggleMicRecording}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-[#B4F45A] text-[#0B1014] hover:scale-105'
              }`}
            >
              {isRecording ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </button>
            <div>
              <h3 className="text-sm font-semibold text-[#F3F5F4]">
                {isRecording ? 'Listening in Real-time...' : 'Click to Whistle / Play Dizi'}
              </h3>
              <p className="text-xs text-[#94A3A7] mt-1">
                Sing or play into your microphone to transcribe individual notes into your score.
              </p>
            </div>

            {recordedPitches.length > 0 && (
              <div className="w-full max-w-md bg-[#0E171A] border border-[#1A2E33] rounded-lg p-3">
                <div className="text-xs text-[#94A3A7] mb-2 font-mono">
                  Captured Notes: {recordedPitches.length}
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center max-h-24 overflow-y-auto">
                  {recordedPitches.map((p, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-[#16272C] border border-[#1F3D3D] text-[#B4F45A] font-mono text-xs"
                    >
                      {p}
                    </span>
                  ))}
                </div>
                <button
                  onClick={handleApplyRecordedNotes}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-[#36B39B] text-[#0B1014] text-xs font-bold hover:bg-[#43d4b7] transition-all"
                >
                  Insert Notes into Current Score
                </button>
              </div>
            )}
          </div>
        )}

        {transcribeMethod === 'url' && (
          <div className="p-2 sm:p-4 max-w-xl mx-auto space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#F3F5F4] mb-1">
                YouTube URL or Suno AI Audio Track Link
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleImportUrl(); }}
                  placeholder="https://www.youtube.com/watch?v=... or https://suno.com/song/..."
                  className="flex-1 min-w-0 bg-[#0E171A] border border-[#1A2E33] rounded-lg px-3 py-2.5 text-xs text-[#F3F5F4] focus:outline-none focus:border-[#36B39B]"
                />
                <button
                  onClick={() => void handleImportUrl()}
                  disabled={isProcessing}
                  className="px-4 py-2.5 bg-[#B4F45A] text-[#0B1014] rounded-lg text-xs font-semibold hover:bg-[#c3f77a] disabled:opacity-50"
                >
                  {isProcessing ? 'Importing…' : 'Import Link'}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-[#94A3A7] leading-relaxed">
              YouTube videos play through the official embedded player. Suno links are saved with their source information. Transcription requires actual accessible audio; the iframe itself cannot provide audio samples.
            </p>
          </div>
        )}

        {statusMessage && (
          <div role="status" className={`mt-4 p-3 bg-[#0E171A] border rounded-lg text-xs flex items-center gap-2 ${statusError ? 'border-amber-600/50 text-amber-200' : 'border-[#1A2E33] text-[#B4F45A]'}`}>
            {statusError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-[#36B39B] shrink-0" />}
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* 3. Interactive Note List & Transcribed Score Editor */}
      <details onToggle={event => setEditorOpen(event.currentTarget.open)} className="bg-[#111D20] border border-[#1A2E33] rounded-xl p-3 sm:p-5 group">
        <summary className="flex items-center justify-between cursor-pointer list-none text-sm font-semibold text-[#F3F5F4]">
          Edit detected notes ({currentSong.notes.length})
          <ChevronDown className="w-4 h-4 text-[#36B39B] group-open:rotate-180 transition-transform" />
        </summary>
        {editorOpen && <div className="mt-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1A2E33] mb-4">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-[#B4F45A]" />
            <h3 className="text-sm font-semibold text-[#F3F5F4]">
              Score Note Editor ({currentSong.notes.length} notes)
            </h3>
          </div>

          <button
            onClick={handleAddManualNote}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#16272C] hover:bg-[#1C333A] text-[#B4F45A] rounded-lg text-xs font-medium border border-[#1F3D3D] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Note</span>
          </button>
        </div>

        {/* Scrollable Note Rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1A2E33] text-[#94A3A7] font-mono">
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Pitch / Review</th>
                <th className="py-2 px-3">Jianpu</th>
                <th className="py-2 px-3">Duration</th>
                <th className="py-2 px-3">Measure</th>
                <th className="py-2 px-3">Technique</th>
                <th className="py-2 px-3">Fingering</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2E33]/60">
              {currentSong.notes.map((note, idx) => {
                const fingering = findFingering(note.pitch, diziKey, fingeringSystem);
                return (
                  <tr key={note.id} className="hover:bg-[#16272C]/50 transition-colors">
                    <td className="py-2 px-3 font-mono text-[#94A3A7]">{idx + 1}</td>
                    <td className="py-2 px-3 font-mono font-bold text-[#B4F45A]">
                      {editingNoteId === note.id ? (
                        <input aria-label="Correct pitch name" value={pitchDraft} onChange={event => setPitchDraft(event.target.value.trim())}
                          onKeyDown={event => { if (event.key === 'Enter') handleSavePitch(note.id); if (event.key === 'Escape') setEditingNoteId(null); }}
                          className="w-20 rounded border border-[#36B39B] bg-[#0B1014] px-2 py-1 text-xs outline-none" autoFocus />
                      ) : <span className="inline-flex items-center gap-1.5">{note.pitch}{note.confidence !== undefined && note.confidence < 0.35 && <span title="Competing pitches are similarly prominent; confirm this note by ear" className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-200">Review</span>}</span>}
                    </td>
                    <td className="py-2 px-3 font-serif font-bold text-base text-[#F3F5F4]">
                      {note.jianpu}
                      {note.octaveDot > 0 ? '̇' : note.octaveDot < 0 ? '̣' : ''}
                    </td>
                    <td className="py-2 px-3 font-mono text-[#94A3A7]">
                      {note.duration === 1 ? 'Quarter (1)' : note.duration === 0.5 ? '8th (1/2)' : note.duration === 2 ? 'Half (2)' : `${note.duration} beats`}
                    </td>
                    <td className="py-2 px-3 font-mono text-[#94A3A7]">
                      M{note.measureNumber} · B{note.beatInMeasure}
                    </td>
                    <td className="py-2 px-3 text-[#36B39B]">
                      {note.technique || 'Standard'}
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-[#8C9C98]">
                      {fingering ? `6-hole · ${fingering.registerZh}` : 'Not in library'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => editingNoteId === note.id ? handleSavePitch(note.id) : (setEditingNoteId(note.id), setPitchDraft(note.pitch))}
                          className="px-2 py-1 rounded border border-[#264049] text-[#36B39B] hover:border-[#36B39B] transition-colors"
                          title="Correct the detected pitch name"
                        >{editingNoteId === note.id ? 'Save' : 'Edit'}</button>
                        <button
                          onClick={() => {
                            if (fingering) diziAudio.playNote(fingering.frequency, 0.6, note.technique);
                          }}
                          className="p-1 hover:text-[#B4F45A] transition-colors"
                          title="Preview Note"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 hover:text-red-400 transition-colors"
                          title="Delete Note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>}
      </details>
    </div>
  );
};
