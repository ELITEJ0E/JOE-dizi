import React, { useState } from 'react';
import { Song } from '../../types/dizi';
import { PRESET_SONGS } from '../../data/presetSongs';
import { readUserSongs } from '../../utils/songStorage';
import { Search, Play, Download, Upload, Trash2, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface SongbookViewProps {
  currentSong: Song;
  onSelectSong: (song: Song) => void;
  onDeleteSong: (songId: string) => Promise<boolean>;
}

export const SongbookView: React.FC<SongbookViewProps> = ({
  currentSong,
  onSelectSong,
  onDeleteSong
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>(() => [...readUserSongs(), ...PRESET_SONGS]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErrorId, setDeleteErrorId] = useState<string | null>(null);

  const handleDeleteSong = async (songId: string) => {
    setDeletingId(songId);
    setDeleteErrorId(null);
    try {
      if (await onDeleteSong(songId)) {
        setSongs(previous => previous.filter(song => song.id !== songId));
        setConfirmDeleteId(null);
      } else setDeleteErrorId(songId);
    } finally { setDeletingId(null); }
  };

  const filteredSongs = songs.filter(
    s =>
      s.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.titleZh.includes(searchQuery) ||
      s.artistZh.includes(searchQuery)
  );

  const handleExportSongJson = (s: Song) => {
    const file = new Blob([JSON.stringify({ ...s, audioUrl: undefined }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = `${(s.titleEn || 'dizi').toLowerCase().replace(/[^a-z0-9_-]+/g, '_')}_dizi_score.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.titleEn && imported.notes) {
          setSongs(prev => [imported, ...prev]);
          onSelectSong(imported);
        }
      } catch (err) {
        alert('Invalid song JSON file format');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Search / Import Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A2E33]">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#F3F5F4] flex items-center gap-2">
            <span>{t('My Songbook', '我的曲库')}</span>
          </h2>
          <p className="text-xs text-[#94A3A7] mt-1">
            {t('Traditional flute repertoire and locally saved imported scores.', '传统笛曲和保存在本机的导入乐谱。')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3A7]" />
            <input
              type="text"
              placeholder={t('Search songs…', '搜索曲目…')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#111D20] border border-[#1A2E33] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#F3F5F4] focus:outline-none focus:border-[#36B39B]"
            />
          </div>

          {/* Import JSON button */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111D20] border border-[#1A2E33] text-xs text-[#94A3A7] hover:text-[#F3F5F4] cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>{t('Import JSON', '导入 JSON')}</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
        </div>
      </div>

      {/* 2. Songs Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSongs.map((song) => {
          const isCurrent = song.id === currentSong.id;
          return (
            <div
              key={song.id}
              className={`bg-[#111D20] border rounded-xl p-5 flex flex-col justify-between transition-all ${
                isCurrent
                  ? 'border-[#36B39B] shadow-[0_0_15px_rgba(54,179,155,0.15)] bg-[#122527]'
                  : 'border-[#1A2E33] hover:border-[#1F3D3D]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#F3F5F4] tracking-tight">
                      {song.titleEn}
                    </h3>
                    <div className="font-calligraphy text-sm text-[#36B39B] font-medium mt-0.5">
                      {song.titleZh}
                    </div>
                  </div>

                  {song.sealName && (
                    <div className="seal-stamp w-8 h-8 text-[10px]">
                      {song.sealName.slice(0, 2)}
                    </div>
                  )}
                </div>

                <div className="text-xs text-[#94A3A7] mt-2 font-serif">
                  {song.artistZh}
                </div>

                {song.backgroundPoem && (
                  <div className="my-3 p-2.5 rounded bg-[#0E171A] border border-[#1A2E33]/60 text-xs font-calligraphy text-[#B4C4C0] italic">
                    "{song.backgroundPoem.text}"
                  </div>
                )}

                <div className="flex flex-wrap gap-2 text-xs font-mono text-[#94A3A7] mt-3">
                  <span className="px-2 py-0.5 rounded bg-[#16272C] text-[#B4F45A]">
                    {song.diziKey} 调笛
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#16272C]">
                    {song.musicalKey}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#16272C]">
                    {song.timeSignature}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#16272C]">
                    ♩={song.bpm}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#16272C]">
                    {song.notes.length} {t('notes', '个音符')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-[#1A2E33] flex items-center justify-between">
                <button
                  onClick={() => onSelectSong(song)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isCurrent
                      ? 'bg-[#B4F45A] text-[#0B1014]'
                      : 'bg-[#16272C] text-[#F3F5F4] hover:bg-[#B4F45A] hover:text-[#0B1014]'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isCurrent ? t('Current Song', '当前乐曲') : t('Load into Studio', '载入工作台')}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleExportSongJson(song)}
                    className="p-1.5 rounded-lg text-[#94A3A7] hover:text-[#F3F5F4] hover:bg-[#16272C] transition-colors"
                    title={t('Export Score JSON', '导出乐谱 JSON')}
                    aria-label={t(`Export ${song.titleEn}`, `导出 ${song.titleEn}`)}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {song.source !== 'preset' && <button
                    onClick={() => setConfirmDeleteId(song.id)}
                    className="p-1.5 rounded-lg text-[#94A3A7] hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    aria-label={t(`Delete ${song.titleEn}`, `删除 ${song.titleEn}`)}
                    title={t('Delete saved song', '删除已保存的曲目')}
                  ><Trash2 className="w-4 h-4" /></button>}
                </div>
              </div>
              {confirmDeleteId === song.id && <div role="group" aria-label={t('Confirm deletion', '确认删除')} className="mt-3 rounded-lg border border-red-600/40 bg-red-500/10 p-2.5 text-xs">
                <p className="mb-2 text-red-100">{t('Delete this song and its offline audio from this device?', '从本机删除此乐曲及其离线音频？')}</p>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setConfirmDeleteId(null)} disabled={deletingId === song.id} className="flex items-center gap-1 rounded px-2 py-1 text-[#F3F5F4] hover:bg-white/10"><X className="h-3 w-3" />{t('Cancel', '取消')}</button>
                  <button onClick={() => void handleDeleteSong(song.id)} disabled={deletingId === song.id} className="rounded bg-red-500 px-3 py-1 font-semibold text-white disabled:opacity-50">{deletingId === song.id ? t('Deleting…', '正在删除…') : t('Delete', '删除')}</button>
                </div>
              </div>}
              {deleteErrorId === song.id && <p role="alert" className="mt-2 text-xs text-red-300">{t('Could not delete this saved song.', '无法删除此曲目。')}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
