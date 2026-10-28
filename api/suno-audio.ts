/**
 * Optional Vercel function for publicly downloadable Suno MP3s.
 * Does not retrieve private/authenticated files or bypass stream encryption.
 */
export default async function handler(req: { method?: string; query?: Record<string, unknown> }, res: {
  status: (code: number) => { json: (data: object) => void };
  setHeader: (name: string, value: string) => void;
  end: (data?: Uint8Array) => void;
}) {
  const clipId = String(req.query?.clipId || '');
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clipId)) {
    res.status(400).json({ error: 'Invalid Suno clip ID' }); return;
  }
  try {
    const response = await fetch(`https://cdn1.suno.ai/${clipId}.mp3`, { signal: AbortSignal.timeout(25000) });
    if (!response.ok) { res.status(404).json({ error: 'Suno download is not publicly available; use an authorized file export' }); return; }
    if (Number(response.headers.get('content-length')) > 80 * 1024 * 1024) {
      res.status(413).json({ error: 'Audio too large' }); return;
    }
    const content = new Uint8Array(await response.arrayBuffer());
    if (content.byteLength < 12 || content.byteLength > 80 * 1024 * 1024 ||
      !(String.fromCharCode(...content.subarray(0, 3)) === 'ID3' || (content[0] === 0xff && (content[1] & 0xe0) === 0xe0))) {
      res.status(415).json({ error: 'No playable MP3 available for this song' }); return;
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'private, max-age=900');
    res.end(content);
  } catch {
    res.status(502).json({ error: 'Unable to retrieve publicly available Suno audio' });
  }
}
