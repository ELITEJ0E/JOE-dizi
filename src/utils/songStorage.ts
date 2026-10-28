import { Song } from '../types/dizi';

const STORAGE_KEY = 'joe-dizi-user-songs-v1';
const RECENT_KEY = 'joe-dizi-last-song-v1';

export function readUserSongs(): Song[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((song): song is Song => Boolean(song && typeof song === 'object' &&
      typeof song.id === 'string' && typeof song.titleEn === 'string' && Array.isArray(song.notes)));
  } catch {
    return [];
  }
}

/** Save the editable score and source details; temporary blob URLs cannot survive reloads. */
export function saveUserSong(song: Song): void {
  if (song.source === 'preset') return;
  try {
    const portable: Song = {
      ...song,
      audioUrl: song.audioUrl?.startsWith('blob:') ? undefined : song.audioUrl,
    };
    const others = readUserSongs().filter(saved => saved.id !== portable.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([portable, ...others].slice(0, 100)));
  } catch (error) {
    console.warn('Unable to save song metadata locally', error);
  }
}

/** Delete only user-saved scores; built-in preset songs are immutable. */
export function deleteUserSong(songId: string): boolean {
  try {
    const current = readUserSongs();
    if (!current.some(song => song.id === songId)) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current.filter(song => song.id !== songId)));
    if (localStorage.getItem(RECENT_KEY) === songId) localStorage.removeItem(RECENT_KEY);
    return true;
  } catch { return false; }
}

export function rememberCurrentSong(id: string): void {
  try { localStorage.setItem(RECENT_KEY, id); } catch { /* storage disabled */ }
}

export function restoreCurrentSong(): Song | null {
  try {
    const id = localStorage.getItem(RECENT_KEY);
    return readUserSongs().find(song => song.id === id) || null;
  } catch { return null; }
}
