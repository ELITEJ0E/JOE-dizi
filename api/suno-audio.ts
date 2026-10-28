/**
 * Server-side clip resolver matching the audio pipeline in JOE-Music.
 * The provider must grant a clip rights token before encrypted media can be
 * decoded. No browser sessions, user credentials or private endpoints are used.
 */
import { webcrypto } from 'node:crypto';

const MAX_BYTES = 80 * 1024 * 1024;
const CLIP_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RIGHTS_HOSTS = ['https://studio-api-prod.suno.com', 'https://studio-api.suno.ai', 'https://suno.com'];
type Rights = { key: string; iv: string; glt: string };
type AudioResult = { buffer: Buffer; mime: string };
const cache = new Map<string, { value: AudioResult; created: number }>();
const inFlight = new Map<string, Promise<AudioResult | null>>();

function detectMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  const ascii = (start: number, length: number) => String.fromCharCode(...bytes.subarray(start, start + length));
  if (ascii(4, 4) === 'ftyp') return 'audio/mp4';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WAVE') return 'audio/wav';
  if (ascii(0, 4) === 'OggS') return 'audio/ogg';
  if (ascii(0, 3) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) return 'audio/mpeg';
  if (ascii(0, 4) === '\x1a\x45\xdf\xa3') return 'audio/webm';
  return null;
}

async function fetchSmallRights(clipId: string): Promise<Rights | null> {
  for (const host of RIGHTS_HOSTS) {
    try {
      const response = await fetch(`${host}/api/mango/rights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://suno.com',
          Referer: `https://suno.com/song/${clipId}`,
        },
        body: JSON.stringify({ content_params: { content_id: clipId, content_type: 'clip' } }),
        signal: AbortSignal.timeout(9000),
      });
      if (!response.ok) continue;
      const raw: unknown = await response.json();
      if (raw && typeof raw === 'object' && 'key' in raw && 'iv' in raw && 'glt' in raw &&
        typeof raw.key === 'string' && typeof raw.iv === 'string' && typeof raw.glt === 'string') {
        return raw as Rights;
      }
    } catch { /* Provider host unavailable, try next. */ }
  }
  return null;
}

async function unwrapSunoAudio(clipId: string, encrypted: Buffer, rights: Rights): Promise<Buffer> {
  const crypto = globalThis.crypto?.subtle || webcrypto.subtle;
  const text = new TextEncoder();
  const userKeyHash = await crypto.digest('SHA-256', text.encode(rights.glt));
  const userKey = await crypto.importKey('raw', userKeyHash, 'AES-GCM', false, ['decrypt']);
  const additionalData = text.encode(clipId);
  const unwrap = (base64: string) => {
    const bytes = Buffer.from(base64, 'base64');
    if (bytes.length < 29) throw new Error('Invalid provider rights token');
    return crypto.decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, 12), additionalData }, userKey, bytes.subarray(12));
  };
  const rawKey = await unwrap(rights.key);
  const rawIv = new Uint8Array(await unwrap(rights.iv));
  if (rawIv.byteLength !== 16) throw new Error('Invalid audio counter');
  const contentKey = await crypto.importKey('raw', rawKey, 'AES-CTR', false, ['decrypt']);
  const decrypted = await crypto.decrypt({ name: 'AES-CTR', counter: rawIv, length: 128 }, contentKey, Uint8Array.from(encrypted));
  return Buffer.from(decrypted);
}

async function fetchAudio(clipId: string): Promise<AudioResult | null> {
  const cached = cache.get(clipId);
  if (cached && Date.now() - cached.created < 20 * 60_000) return cached.value;
  if (inFlight.has(clipId)) return inFlight.get(clipId)!;
  const request = (async () => {
    try {
      // First follow the existing JOE-Music path: rights + media stream.
      const rights = await fetchSmallRights(clipId);
      const media = await fetch(`https://d2lwuy8qc234o3.cloudfront.net/1/clip/${clipId}.m4a`, {
        signal: AbortSignal.timeout(30000),
      });
      if (media.ok && Number(media.headers.get('content-length')) <= MAX_BYTES) {
        const bytes = Buffer.from(await media.arrayBuffer());
        if (bytes.length > 0 && bytes.length <= MAX_BYTES) {
          const decoded = detectMime(bytes) ? bytes : rights ? await unwrapSunoAudio(clipId, bytes, rights) : bytes;
          const mime = detectMime(decoded);
          if (mime) return { buffer: decoded, mime };
        }
      }
    } catch (error) {
      console.warn('Clip stream unavailable', error instanceof Error ? error.message : error);
    }

    // Legacy tracks can still provide ordinary MP3 download responses.
    try {
      const response = await fetch(`https://cdn1.suno.ai/${clipId}.mp3`, { signal: AbortSignal.timeout(15000) });
      if (!response.ok || Number(response.headers.get('content-length')) > MAX_BYTES) return null;
      const buffer = Buffer.from(await response.arrayBuffer());
      const mime = detectMime(buffer);
      return buffer.length <= MAX_BYTES && mime ? { buffer, mime } : null;
    } catch { return null; }
  })();
  inFlight.set(clipId, request);
  try {
    const result = await request;
    if (result) {
      if (cache.size >= 4) cache.delete(cache.keys().next().value!);
      cache.set(clipId, { value: result, created: Date.now() });
    }
    return result;
  } finally { inFlight.delete(clipId); }
}

type Request = { method?: string; query?: Record<string, unknown>; headers?: { range?: string } };
type Response = {
  status: (code: number) => Response;
  json: (body: object) => void;
  setHeader: (name: string, value: string) => void;
  end: (data?: Buffer) => void;
};

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const clipId = String(req.query?.clipId || req.query?.id || '');
  if (!CLIP_ID.test(clipId)) { res.status(400).json({ error: 'Invalid clip ID' }); return; }
  const file = await fetchAudio(clipId);
  if (!file) { res.status(404).json({ error: 'Playable clip unavailable' }); return; }
  res.setHeader('Content-Type', file.mime);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'private, max-age=600');
  const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers?.range || '');
  if (range) {
    const start = Number(range[1]);
    const end = range[2] ? Number(range[2]) : file.buffer.length - 1;
    if (start > end || end >= file.buffer.length) {
      res.setHeader('Content-Range', `bytes */${file.buffer.length}`);
      res.status(416).end();
      return;
    }
    res.setHeader('Content-Range', `bytes ${start}-${end}/${file.buffer.length}`);
    res.setHeader('Content-Length', String(end - start + 1));
    res.status(206).end(file.buffer.subarray(start, end + 1));
    return;
  }
  res.setHeader('Content-Length', String(file.buffer.length));
  res.end(file.buffer);
}
