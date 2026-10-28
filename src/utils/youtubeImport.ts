import { isPlayableAudio } from './sunoImport';

/** JOE-Music uses its extractor's POST /extract endpoint for YouTube URLs. */
const DEFAULT_EXTRACTOR = 'https://chord-extractor-1.onrender.com';
const MAX_BYTES = 80 * 1024 * 1024;

export interface ExtractedAudio {
  file: File;
  title?: string;
  artist?: string;
}

function decodeHeader(value: string | null): string | undefined {
  if (!value) return undefined;
  try { return decodeURIComponent(value).trim(); } catch { return value.trim(); }
}

export async function fetchYouTubeAudio(url: string, onProgress?: (message: string) => void): Promise<ExtractedAudio | null> {
  const configured = import.meta.env.VITE_EXTRACTOR_API?.trim();
  const custom = configured && /^https:\/\//.test(configured) ? configured.replace(/\/$/, '') : DEFAULT_EXTRACTOR;
  const candidates = ['/api/youtube/extract', `${custom}/extract`];

  for (let i = 0; i < candidates.length; i++) {
    try {
      onProgress?.(i === 0 ? 'Connecting to audio extractor…' : 'Trying extractor fallback…');
      const response = await fetch(candidates[i], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(120000),
      });
      if (!response.ok || Number(response.headers.get('content-length')) > MAX_BYTES) continue;
      onProgress?.('Downloading audio for transcription…');
      const data = new Uint8Array(await response.arrayBuffer());
      if (!data.length || data.length > MAX_BYTES || !isPlayableAudio(data)) continue;
      const signature = String.fromCharCode(...data.subarray(0, 4));
      const isMp4 = String.fromCharCode(...data.subarray(4, 8)) === 'ftyp';
      const { mime, ext } = isMp4 ? { mime: 'audio/mp4', ext: 'm4a' }
        : signature === 'RIFF' ? { mime: 'audio/wav', ext: 'wav' }
        : signature === 'OggS' ? { mime: 'audio/ogg', ext: 'ogg' }
        : data[0] === 0x1a ? { mime: 'audio/webm', ext: 'webm' }
        : { mime: 'audio/mpeg', ext: 'mp3' };
      const title = decodeHeader(response.headers.get('X-Video-Title')) || 'Imported URL Audio';
      const artist = decodeHeader(response.headers.get('X-Video-Artist'));
      const filename = `${title.replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 70) || 'Audio Track'}.${ext}`;
      return { file: new File([data], filename, { type: mime }), title, artist };
    } catch { /* The backend can cold-start or restrict individual videos. */ }
  }
  return null;
}
