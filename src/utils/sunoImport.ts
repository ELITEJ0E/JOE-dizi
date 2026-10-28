/**
 * Obtain a Suno recording only when the provider exposes an ordinary playable
 * audio response. An iframe/share page is NOT a decoded audio file; encrypted
 * streams and authenticated downloads require an authorized provider export.
 *
 * For deployments with a licensed first-party media service, configure
 * VITE_SUNO_AUDIO_API_BASE to point at its verified audio-download endpoint.
 */
const MAX_AUDIO_BYTES = 80 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPlayableAudio(data: Uint8Array): boolean {
  if (data.length < 12) return false;
  const ascii = (offset: number, length: number) => String.fromCharCode(...data.subarray(offset, offset + length));
  return ascii(0, 3) === 'ID3' ||
    (data[0] === 0xff && (data[1] & 0xe0) === 0xe0) ||
    ascii(4, 4) === 'ftyp' ||
    ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WAVE' ||
    ascii(0, 4) === 'OggS' ||
    (data[0] === 0x1a && data[1] === 0x45 && data[2] === 0xdf && data[3] === 0xa3);
}

function audioExtension(data: Uint8Array): { ext: string; mime: string } {
  const signature = String.fromCharCode(...data.subarray(0, 4));
  if (signature === 'RIFF') return { ext: 'wav', mime: 'audio/wav' };
  if (signature === 'OggS') return { ext: 'ogg', mime: 'audio/ogg' };
  if (data[0] === 0x1a) return { ext: 'webm', mime: 'audio/webm' };
  if (String.fromCharCode(...data.subarray(4, 8)) === 'ftyp') return { ext: 'm4a', mime: 'audio/mp4' };
  return { ext: 'mp3', mime: 'audio/mpeg' };
}

export async function fetchSunoAudio(clipId: string, title: string): Promise<File | null> {
  if (!UUID.test(clipId)) return null;

  const configuredBase = import.meta.env.VITE_SUNO_AUDIO_API_BASE?.trim();
  const authorizedEndpoint = configuredBase && /^https:\/\//.test(configuredBase)
    ? `${configuredBase.replace(/\/$/, '')}/api/suno-audio?clipId=${encodeURIComponent(clipId)}`
    : `/api/suno-audio?clipId=${encodeURIComponent(clipId)}`;

  const candidates = [authorizedEndpoint, `https://cdn1.suno.ai/${clipId}.mp3`];
  for (const url of candidates) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) continue;
      const size = Number(response.headers.get('content-length'));
      if (size > MAX_AUDIO_BYTES) continue;
      const content = new Uint8Array(await response.arrayBuffer());
      if (content.length > MAX_AUDIO_BYTES || !isPlayableAudio(content)) continue;
      const { ext, mime } = audioExtension(content);
      return new File([content], `${title.replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 70) || 'Suno Song'}.${ext}`, { type: mime });
    } catch { /* Try the next authorized, browser-accessible source. */ }
  }
  return null;
}
