/** The JOE-Music audio-resolution order: server clip proxy, then client
 * rights-granted media decoding, then ordinary legacy audio URLs. */
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

type Rights = { key: string; iv: string; glt: string };
function validRights(data: unknown): data is Rights {
  return Boolean(data && typeof data === 'object' &&
    'key' in data && typeof data.key === 'string' &&
    'iv' in data && typeof data.iv === 'string' &&
    'glt' in data && typeof data.glt === 'string');
}

async function getRights(clipId: string): Promise<Rights | null> {
  const body = JSON.stringify({ content_params: { content_id: clipId, content_type: 'clip' } });
  const attempts: Array<[string, RequestInit]> = [
    [`/api/suno-rights?clipId=${clipId}`, { method: 'GET' }],
    ['https://studio-api-prod.suno.com/api/mango/rights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }],
  ];
  for (const [url, init] of attempts) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(9000) });
      if (!response.ok) continue;
      const raw: unknown = await response.json();
      if (validRights(raw)) return raw;
    } catch { /* Try the other provider path. */ }
  }
  return null;
}

async function decryptProviderStream(clipId: string, stream: ArrayBuffer, rights: Rights): Promise<Uint8Array> {
  const subtle = crypto.subtle;
  const text = new TextEncoder();
  const hash = await subtle.digest('SHA-256', text.encode(rights.glt));
  const userKey = await subtle.importKey('raw', hash, 'AES-GCM', false, ['decrypt']);
  const additionalData = text.encode(clipId);
  const unwrap = (encoded: string) => {
    const wrapped = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    if (wrapped.length < 29) throw new Error('Invalid rights token');
    return subtle.decrypt({ name: 'AES-GCM', iv: wrapped.slice(0, 12), additionalData }, userKey, wrapped.slice(12));
  };
  const key = await subtle.importKey('raw', await unwrap(rights.key), 'AES-CTR', false, ['decrypt']);
  const counter = new Uint8Array(await unwrap(rights.iv));
  if (counter.length !== 16) throw new Error('Invalid content counter');
  return new Uint8Array(await subtle.decrypt({ name: 'AES-CTR', counter, length: 128 }, key, stream));
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
  const endpoint = `/api/suno-audio?clipId=${encodeURIComponent(clipId)}`;
  const candidates = configuredBase && /^https:\/\//.test(configuredBase)
    ? [`${configuredBase.replace(/\/$/, '')}/api/suno-audio?clipId=${encodeURIComponent(clipId)}`, endpoint]
    : [endpoint];

  const toFile = (content: Uint8Array): File => {
    const { ext, mime } = audioExtension(content);
    return new File([Uint8Array.from(content)], `${title.replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 70) || 'Audio Track'}.${ext}`, { type: mime });
  };
  for (const url of candidates) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) continue;
      const size = Number(response.headers.get('content-length'));
      if (size > MAX_AUDIO_BYTES) continue;
      const content = new Uint8Array(await response.arrayBuffer());
      if (content.length > MAX_AUDIO_BYTES || !isPlayableAudio(content)) continue;
      return toFile(content);
    } catch { /* Try the next provider path. */ }
  }

  // Browser-side path mirrors JOE-Music when its serverless endpoint is absent.
  try {
    const rights = await getRights(clipId);
    const response = await fetch(`https://d2lwuy8qc234o3.cloudfront.net/1/clip/${clipId}.m4a`, { signal: AbortSignal.timeout(30000) });
    if (response.ok && Number(response.headers.get('content-length')) <= MAX_AUDIO_BYTES) {
      const stream = await response.arrayBuffer();
      if (stream.byteLength && stream.byteLength <= MAX_AUDIO_BYTES) {
        const data = rights ? await decryptProviderStream(clipId, stream, rights) : new Uint8Array(stream);
        if (isPlayableAudio(data)) return toFile(data);
      }
    }
  } catch { /* Fall back to legacy public MP3 if supported. */ }

  try {
    const response = await fetch(`https://cdn1.suno.ai/${clipId}.mp3`, { signal: AbortSignal.timeout(15000) });
    if (response.ok && Number(response.headers.get('content-length')) <= MAX_AUDIO_BYTES) {
      const content = new Uint8Array(await response.arrayBuffer());
      if (content.length <= MAX_AUDIO_BYTES && isPlayableAudio(content)) return toFile(content);
    }
  } catch { /* Song has no accessible playable stream. */ }
  return null;
}
