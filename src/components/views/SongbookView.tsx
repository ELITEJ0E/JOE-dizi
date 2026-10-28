import React, { useState } from 'react';
import { Song } from '../../types/dizi';
import { PRESET_SONGS } from '../../data/presetSongs';
import { readUserSongs } from '../../utils/songStorage';
import { BookMarked, Search, Play, Download, Upload, Music, Sparkles } from 'lucide-react';

interface SongbookViewProps {
  currentSong: Song;
  onSelectSong: (song: Song) => void;
}

export const SongbookView: React.FC<SongbookViewProps> = ({
  currentSong,
  onSelectSong
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>(() => [...readUserSongs(), ...PRESET_SONGS]);

  const filteredSongs = songs.filter(
    s =>
      s.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.titleZh.includes(searchQuery) ||
      s.artistZh.includes(searchQuery)
  );

  const handleExportSongJson = (s: Song) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(s, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${s.titleEn.toLowerCase().replace(/\s+/g, '_')}_dizi_score.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
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
            <span>My Songbook</span>
            <span className="text-sm font-calligraphy text-[#36B39B]">名曲谱库与曲目管理</span>
          </h2>
          <p className="text-xs text-[#94A3A7] mt-1">
            Curated traditional Chinese flute masterworks, modern arrangements, and custom transcribed pieces.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3A7]" />
            <input
              type="text"
              placeholder="Search songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#111D20] border border-[#1A2E33] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#F3F5F4] focus:outline-none focus:border-[#36B39B]"
            />
          </div>

          {/* Import JSON button */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111D20] border border-[#1A2E33] text-xs text-[#94A3A7] hover:text-[#F3F5F4] cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON</span>
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
                    {song.notes.length} notes
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
                  <span>{isCurrent ? 'Current Workstation Song' : 'Load into Studio'}</span>
                </button>

                <button
                  onClick={() => handleExportSongJson(song)}
                  className="p-1.5 rounded-lg text-[#94A3A7] hover:text-[#F3F5F4] hover:bg-[#16272C] transition-colors"
                  title="Export Score JSON"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
