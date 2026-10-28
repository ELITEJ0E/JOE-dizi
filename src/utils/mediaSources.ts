export type MediaSource =
  | { kind: 'youtube'; id: string; url: string }
  | { kind: 'suno'; id: string; url: string };

const SUNO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/;

/** Restrict embeds and metadata lookups to supported, well-formed share URLs. */
export function parseMediaSource(value: string): MediaSource | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.toLowerCase();
  let id = '';
  if (host === 'youtu.be') {
    id = url.pathname.split('/')[1] || '';
  } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
    if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
    else if (/^\/(shorts|embed|live)\//.test(url.pathname)) id = url.pathname.split('/')[2] || '';
  }
  if (YOUTUBE_ID.test(id)) {
    return { kind: 'youtube', id, url: `https://www.youtube.com/watch?v=${id}` };
  }

  if (['suno.com', 'www.suno.com', 'suno.ai', 'www.suno.ai'].includes(host)) {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'song' && SUNO_ID.test(parts[1] || '')) {
      id = parts[1];
      return { kind: 'suno', id, url: `https://suno.com/song/${id}` };
    }
  }
  return null;
}

type SongMetadata = { title?: string; artist?: string; thumbnail?: string };

/** Metadata is optional: many providers do not send browser CORS headers. */
export async function getShareMetadata(source: MediaSource): Promise<SongMetadata> {
  const endpoint = source.kind === 'youtube'
    ? `https://www.youtube.com/oembed?url=${encodeURIComponent(source.url)}&format=json`
    : `https://studio-api-prod.suno.com/api/oembed?url=${encodeURIComponent(source.url)}`;
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(6500) });
    if (!response.ok) return {};
    const data = await response.json();
    return {
      title: typeof data.title === 'string' ? data.title : undefined,
      artist: typeof data.author_name === 'string' ? data.author_name : undefined,
      thumbnail: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : undefined,
    };
  } catch {
    return {};
  }
}
