import type { VercelRequest, VercelResponse } from '@vercel/node';

// Configure in Vercel Project Settings -> Environment Variables (Server-side)
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
const DEFAULT_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';

// Optional: lock CORS to your site in production
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || '*';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Basic CORS
  res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing ELEVENLABS_API_KEY on server' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const text: string = body.text || '';
    const voiceId: string = body.voiceId || DEFAULT_VOICE_ID;
    const modelId: string = body.modelId || DEFAULT_MODEL_ID;
    const outputFormat: string = body.outputFormat || 'mp3_44100_128';

    if (!text.trim()) {
      return res.status(400).json({ error: 'Missing text' });
    }

    const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const elevenRes = await fetch(`${endpoint}?optimize_streaming_latency=0`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'content-type': 'application/json',
        'accept': outputFormat.startsWith('mp3') ? 'audio/mpeg' : 'audio/wav',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        // Optional: tweak voice settings:
        // voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true }
      }),
    });

    if (!elevenRes.ok || !elevenRes.body) {
      const msg = await elevenRes.text().catch(() => '');
      return res.status(502).json({ error: 'ElevenLabs request failed', details: msg });
    }

    // Set headers before streaming
    res.setHeader('Content-Type', outputFormat.startsWith('mp3') ? 'audio/mpeg' : 'audio/wav');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);

    // Pipe audio stream back
    // @ts-ignore Vercel supports piping web streams to the response
    elevenRes.body.pipe(res);
  } catch (e: any) {
    return res.status(500).json({ error: 'TTS proxy failed', details: e?.message || String(e) });
  }
}