import React, { useState, useRef, useEffect } from 'react';
import { Song, DiziKey, FingeringSystem, DiziNote } from '../../types/dizi';
import { pitchDetector } from '../../audio/pitchDetector';
import { analyzeMelodyInBackground } from '../../audio/analyzeMelody';
import { midiToPitchName, findFingering, DIZI_KEYS_SPEC, getJianpuForMidi, pitchNameToMidi, midiToFrequency } from '../../music/diziTheory';
import { diziAudio } from '../../audio/diziSynth';
import { getShareMetadata, parseMediaSource } from '../../utils/mediaSources';
import { fetchSunoAudio } from '../../utils/sunoImport';
import { fetchYouTubeAudio } from '../../utils/youtubeImport';
import { saveAudioFile } from '../../utils/audioLibrary';
import { StudioSelect } from '../StudioSelect';
import { useLanguage } from '../../i18n/LanguageContext';
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
  const { t } = useLanguage();
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

  const transcribeFile = async (file: File, linkedSong?: Song) => {
    setIsProcessing(true);
    setStatusError(false);
    setStatusMessage(t(`Decoding audio file "${file.name}"...`, `正在解码音频「${file.name}」…`));
    let ctx: AudioContext | null = null;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AudioCtx();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      setStatusMessage(t(`Tracking dizi melody within the ${diziKey}-key range…`, `正在追踪 ${diziKey} 调笛的旋律…`));
      const { rangeStartMidi, rangeEndMidi } = DIZI_KEYS_SPEC[diziKey];
      const { notes: segments, estimatedBpm } = await analyzeMelodyInBackground(audioBuffer, percent => {
        setStatusMessage(t(`Analyzing melody… ${percent}%`, `正在分析旋律… ${percent}%`));
      }, { minMidi: rangeStartMidi, maxMidi: rangeEndMidi });
      if (segments.length === 0) {
        setStatusError(true);
        setStatusMessage(t('No clear melody detected. Try a solo dizi or isolated melodic stem.', '未检测到清晰旋律，请尝试独奏笛音或分离的笛子音轨。'));
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

      const baseSong = linkedSong || currentSong;
      const attachesToLink = (baseSong.source === 'youtube' || baseSong.source === 'suno');
      const newSong: Song = {
        ...baseSong,
        id: attachesToLink ? baseSong.id : `transcription_${Date.now()}`,
        titleEn: attachesToLink ? baseSong.titleEn : file.name.replace(/\.[^/.]+$/, ''),
        titleZh: attachesToLink ? baseSong.titleZh : '新转谱乐曲',
        source: attachesToLink ? baseSong.source : 'upload',
        sourceDetails: `${attachesToLink ? 'URL' : 'Audio File'} • Audio analyzed`,
        audioUrl: URL.createObjectURL(file),
        audioDuration: audioBuffer.duration,
        bpm,
        notes,
        sections: [],
        totalMeasures: Math.max(...notes.map(note => note.measureNumber), 1),
      };
      const savedOffline = await saveAudioFile(newSong.id, file);
      onLoadSong(newSong);
      const uncertainCount = notes.filter(note => note.confidence !== undefined && note.confidence < 0.35).length;
      setStatusMessage(t(`Found ${notes.length} candidate notes${estimatedBpm ? ` at ≈${estimatedBpm} BPM` : ''}. ${uncertainCount} uncertain pitches need review. ${savedOffline ? 'Audio and score saved locally.' : 'Score saved; audio could not be stored offline.'}`, `找到 ${notes.length} 个候选音符${estimatedBpm ? `，约 ${estimatedBpm} BPM` : ''}。有 ${uncertainCount} 个音高需要核对。${savedOffline ? '音频与乐谱已保存在本机。' : '乐谱已保存，音频离线存储失败。'}`));
      setStatusError(false);
    } catch (err) {
      console.error('Audio transcription failed', err);
      setStatusError(true);
      setStatusMessage(t('Unable to decode the URL audio. Please upload an MP3/WAV file if the source stream cannot be decoded.', '无法解码网址音频。如果在线音频不可用，请上传 MP3/WAV 文件。'));
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
      setStatusMessage(t('Enter a supported song or video URL.', '请输入支持的歌曲或视频网址。'));
      return;
    }
    setIsProcessing(true);
    setStatusError(false);
    setStatusMessage(t('Importing URL…', '正在导入网址…'));
    try {
      const metadata = await getShareMetadata(source);
      const newSong: Song = {
        ...currentSong,
        id: `${source.kind}_${source.id}`,
        titleEn: metadata.title || `URL track ${source.id.slice(0, 8)}`,
        titleZh: '',
        artistEn: metadata.artist || '',
        artistZh: '',
        source: source.kind,
        sourceUrl: source.url,
        youtubeVideoId: source.kind === 'youtube' ? source.id : undefined,
        sunoClipId: source.kind === 'suno' ? source.id : undefined,
        sourceDetails: 'URL • Importing audio',
        imageUrl: source.kind === 'youtube' ? metadata.thumbnail || `https://i.ytimg.com/vi/${source.id}/hqdefault.jpg` : undefined,
        audioUrl: undefined,
        audioDuration: undefined,
        notes: [],
        sections: [],
        totalMeasures: 0,
      };

      // Keep the source URL even when the remote extractor is unavailable.
      onLoadSong(newSong);
      setStatusMessage(t('Fetching the audio stream and preparing transcription…', '正在获取音频并准备转谱…'));
      const resolved = source.kind === 'suno'
        ? { file: await fetchSunoAudio(source.id, newSong.titleEn), title: undefined, artist: undefined }
        : await fetchYouTubeAudio(source.url, message => setStatusMessage(t(message, '正在提取音频…')));
      if (resolved?.file) {
        await transcribeFile(resolved.file, {
          ...newSong,
          titleEn: resolved.title && resolved.title !== 'Imported URL Audio' ? resolved.title : newSong.titleEn,
          artistEn: resolved.artist || newSong.artistEn,
        });
        return;
      }
      setStatusError(true);
      setStatusMessage(t('URL saved. The extractor could not retrieve this recording. Try again or attach an authorized MP3/WAV file.', '网址已保存，但无法提取该录音。请重试或上传获授权的 MP3/WAV 文件。'));
    } catch (error) {
      console.error('Song import failed', error);
      setStatusError(true);
      setStatusMessage(t('Could not import this link. Check your connection or attach audio directly.', '导入链接失败，请检查网络或直接上传音频。'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Real-time microphone whistling/humming transcription
  const handleToggleMicRecording = async () => {
    if (isRecording) {
      pitchDetector.stopMicrophone();
      setIsRecording(false);
      setStatusMessage(t(`Recording finished with ${recordedPitches.length} notes.`, `录音结束，检测到 ${recordedPitches.length} 个音符。`));
    } else {
      setRecordedPitches([]);
      setStatusMessage(t('Listening for dizi notes… Sing or play a phrase.', '正在监听笛音…请演奏一段旋律。'));
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
    setStatusMessage(t(`Added ${addedNotes.length} notes to the score.`, `已将 ${addedNotes.length} 个音符加入乐谱。`));
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
      setStatusMessage(t('Enter a valid sounding note, such as D5, F#5, or Bb4.', '请输入有效音名，例如 D5、F#5 或 Bb4。'));
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
    setStatusMessage(t(`Corrected sounding pitch to ${midiToPitchName(midi, diziKey)}.`, `已将音高更正为 ${midiToPitchName(midi, diziKey)}。`));
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
            <span>{t('Dizi Transcriber', '笛子转谱')}</span>
          </h2>
          <p className="text-xs text-[#94A3A7] mt-1 max-w-2xl">
            {t('Import audio files, record a melody or paste a URL. Detected notes follow the six-hole dizi fingering chart and Jianpu score.', '导入音频、录制旋律或粘贴网址。识别的音符将同步显示在六孔笛指法图和简谱中。')}
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
            <span>{t('Audio File', '音频文件')}</span>
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
            <span>{t('Live Mic', '实时麦克风')}</span>
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
            <span>URL</span>
          </button>
        </div>
      </div>

      {/* 2. Transcription Input Cards */}
      <div className="bg-[#111D20] border border-[#1A2E33] rounded-xl p-3 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#264049] bg-[#0E171A] px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#F3F5F4]">{t('Dizi note range', '笛调音域')}</p>
            <p className="mt-0.5 text-[11px] text-[#94A3A7]">{t('Select your dizi key before transcription.', '转谱前请先选择笛子的调。')} {DIZI_KEYS_SPEC[diziKey].tongyinPitch}–{midiToPitchName(DIZI_KEYS_SPEC[diziKey].rangeEndMidi, diziKey)}</p>
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
              {currentSong.source === 'youtube' || currentSong.source === 'suno' ? t('Attach audio to imported URL', '为导入网址添加音频') : t('Upload Audio', '上传音频')}
            </h3>
            <p className="text-xs text-[#94A3A7] mt-1 max-w-md">
              {currentSong.source === 'youtube' || currentSong.source === 'suno'
                ? t('Use a permitted audio file matching the URL. Notes will sync to its timeline.', '请导入与网址对应的获授权音频，音符将按时间轴同步。')
                : t('For best results, upload a solo dizi or isolated flute stem (MP3/WAV).', '为获得更佳结果，请上传笛子独奏或分离的笛子音轨（MP3/WAV）。')}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="mt-4 px-4 py-2 rounded-lg bg-[#B4F45A] text-[#0B1014] text-xs font-semibold hover:bg-[#c3f77a] transition-all disabled:opacity-50 shadow-md"
            >
              {isProcessing ? t('Analyzing Audio…', '正在分析音频…') : t('Select Audio File', '选择音频文件')}
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
                {isRecording ? t('Listening in real time…', '正在实时聆听…') : t('Whistle or play the dizi', '吹口哨或演奏笛子')}
              </h3>
              <p className="text-xs text-[#94A3A7] mt-1">
                {t('Sing or play into your microphone to transcribe notes into the score.', '对着麦克风歌唱或吹奏，即可将音符转写至乐谱。')}
              </p>
            </div>

            {recordedPitches.length > 0 && (
              <div className="w-full max-w-md bg-[#0E171A] border border-[#1A2E33] rounded-lg p-3">
                <div className="text-xs text-[#94A3A7] mb-2 font-mono">
                  {t('Captured notes:', '已捕捉音符：')} {recordedPitches.length}
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
                  {t('Insert Notes into Current Score', '将音符加入当前乐谱')}
                </button>
              </div>
            )}
          </div>
        )}

        {transcribeMethod === 'url' && (
          <div className="p-2 sm:p-4 max-w-xl mx-auto space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#F3F5F4] mb-1">
                URL
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleImportUrl(); }}
                  placeholder={t('Paste a song or video URL…', '粘贴歌曲或视频网址…')}
                  className="flex-1 min-w-0 bg-[#0E171A] border border-[#1A2E33] rounded-lg px-3 py-2.5 text-xs text-[#F3F5F4] focus:outline-none focus:border-[#36B39B]"
                />
                <button
                  onClick={() => void handleImportUrl()}
                  disabled={isProcessing}
                  className="px-4 py-2.5 bg-[#B4F45A] text-[#0B1014] rounded-lg text-xs font-semibold hover:bg-[#c3f77a] disabled:opacity-50"
                >
                  {isProcessing ? t('Importing…', '正在导入…') : t('Extract & Transcribe', '提取并转谱')}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-[#94A3A7] leading-relaxed">
              {t('Paste a supported URL to extract audio and transcribe dizi notes. The link and score are saved locally.', '粘贴受支持的网址以提取音频并转写笛子音符。网址和乐谱将保存在本机。')}
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
          {t('Edit detected notes', '编辑检测到的音符')} ({currentSong.notes.length})
          <ChevronDown className="w-4 h-4 text-[#36B39B] group-open:rotate-180 transition-transform" />
        </summary>
        {editorOpen && <div className="mt-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1A2E33] mb-4">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-[#B4F45A]" />
            <h3 className="text-sm font-semibold text-[#F3F5F4]">
              {t('Score Note Editor', '乐谱音符编辑器')} ({currentSong.notes.length} {t('notes', '个音符')})
            </h3>
          </div>

          <button
            onClick={handleAddManualNote}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#16272C] hover:bg-[#1C333A] text-[#B4F45A] rounded-lg text-xs font-medium border border-[#1F3D3D] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('Add Note', '添加音符')}</span>
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
