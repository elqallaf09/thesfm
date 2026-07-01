import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

async function getUserId(req: NextRequest): Promise<string | null> {
  return req.headers.get('x-user-id');
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { text } = (await req.json()) as { text?: string };
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });

  const voiceId = process.env.ELEVENLABS_VOICE_ID as string;
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY as string,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!r.ok) return NextResponse.json({ error: 'tts_failed' }, { status: 502 });

  return new NextResponse(r.body, {
    headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' },
  });
}
