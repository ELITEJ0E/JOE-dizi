/** Same-origin rights-token relay used by the JOE-Music audio resolver. */
const CLIP_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HOSTS = ['https://studio-api-prod.suno.com', 'https://studio-api.suno.ai', 'https://suno.com'];

export default async function handler(req: { method?: string; query?: Record<string, unknown> }, res: {
  status: (code: number) => { json: (body: object) => void };
}) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const id = String(req.query?.clipId || '');
  if (!CLIP_ID.test(id)) { res.status(400).json({ error: 'Invalid clip ID' }); return; }
  for (const host of HOSTS) {
    try {
      const response = await fetch(`${host}/api/mango/rights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://suno.com', Referer: `https://suno.com/song/${id}` },
        body: JSON.stringify({ content_params: { content_id: id, content_type: 'clip' } }),
        signal: AbortSignal.timeout(9000),
      });
      if (!response.ok) continue;
      const value: unknown = await response.json();
      if (value && typeof value === 'object' && 'key' in value && 'iv' in value && 'glt' in value &&
        typeof value.key === 'string' && typeof value.iv === 'string' && typeof value.glt === 'string') {
        res.status(200).json(value);
        return;
      }
    } catch { /* Try next authorized provider endpoint. */ }
  }
  res.status(502).json({ error: 'Clip rights unavailable' });
}
