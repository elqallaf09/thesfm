import { NextRequest, NextResponse } from 'next/server';
import { AUTH_ACCESS_COOKIE, EMAIL_MFA_PROOF_COOKIE } from '@/lib/auth/sessionSecurity';
import { checkRateLimit, getClientIp } from '@/lib/server/rateLimiter';
import { bearerToken, inspectSessionSecurity } from '@/lib/server/authSession';

export const runtime = 'nodejs';

function errorResponse(code: string, status: number) {
  const messages = {
    ar: code === 'RATE_LIMITED' ? 'تم بلوغ حد تحويل النص إلى صوت مؤقتاً.' : 'تعذر تشغيل خدمة تحويل النص إلى صوت حالياً.',
    en: code === 'RATE_LIMITED' ? 'The text-to-speech request limit was reached.' : 'Text-to-speech is unavailable right now.',
    fr: code === 'RATE_LIMITED' ? 'La limite de synthèse vocale a été atteinte.' : 'La synthèse vocale est indisponible pour le moment.',
  };
  return NextResponse.json({ success: false, code, message: messages.ar, messageEn: messages.en, messageFr: messages.fr }, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function POST(req: NextRequest) {
  const token = bearerToken(req) || req.cookies.get(AUTH_ACCESS_COOKIE)?.value || '';
  const session = await inspectSessionSecurity(token, req.cookies.get(EMAIL_MFA_PROOF_COOKIE)?.value);
  if (session.status === 'unauthenticated') return errorResponse('UNAUTHORIZED', 401);
  if (session.status === 'unavailable') return errorResponse('AUTH_UNAVAILABLE', 503);
  if (session.mfaRequirement !== 'none') return errorResponse('MFA_REQUIRED', 403);

  const allowed = checkRateLimit(`${session.userId}:${getClientIp(req)}`, {
    max: 10,
    windowMs: 60_000,
    prefix: 'tts',
  });
  if (!allowed) return errorResponse('RATE_LIMITED', 429);

  const body = await req.json().catch(() => null) as { text?: unknown } | null;
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text || text.length > 2_000) return errorResponse('INVALID_REQUEST', 400);

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim();
  if (!apiKey || !voiceId || !/^[A-Za-z0-9_-]{1,100}$/.test(voiceId)) {
    return errorResponse('TTS_MISCONFIGURED', 503);
  }

  let response: Response;
  try {
    response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'content-type': 'application/json',
        accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    });
  } catch {
    return errorResponse('TTS_PROVIDER_UNAVAILABLE', 503);
  }

  if (!response.ok || !response.body) return errorResponse('TTS_PROVIDER_UNAVAILABLE', 502);
  return new NextResponse(response.body, {
    headers: {
      'content-type': 'audio/mpeg',
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
