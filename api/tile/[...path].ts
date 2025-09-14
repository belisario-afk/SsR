import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || '*';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const parts = (req.query.path as string[] | undefined) || [];
  // Expect: [z, x, y.png]
  if (parts.length < 3) return res.status(400).json({ error: 'Expected /api/tile/{z}/{x}/{y}.png' });
  const [z, x, yfile] = parts;
  const y = yfile.replace(/\.png$/i, '');

  const upstream = `https://tile.openstreetmap.org/${encodeURIComponent(z)}/${encodeURIComponent(x)}/${encodeURIComponent(y)}.png`;

  try {
    const upstreamRes = await fetch(upstream, {
      headers: {
        'user-agent': 'ss-r-app/1.0 (https://ss-r.vercel.app)',
        'referer': 'https://ss-r.vercel.app/',
        'accept': 'image/png',
      },
    });

    if (!upstreamRes.ok || !upstreamRes.body) {
      const text = await upstreamRes.text().catch(() => '');
      return res.status(upstreamRes.status).send(text || 'Tile fetch failed');
    }

    res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400');

    // @ts-ignore web stream -> Node res in Vercel runtime
    upstreamRes.body.pipe(res);
  } catch (e: any) {
    res.status(502).json({ error: 'Upstream error', details: e?.message || String(e) });
  }
}