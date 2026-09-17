import { randomUUID } from 'node:crypto';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromBearerToken } from '@/lib/server/adminAccess';
import { aiUsageLimitResponse, consumeAiUsage } from '@/lib/server/aiUsage';
import { aiProviderConfigured, generateAssistantReply } from '@/lib/server/aiProvider';
import { cookies } from 'next/headers';

async function getAuthUser(request: NextRequest) {
  const header = request.headers.get('authorization') ?? '';
  const bearerToken = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null;
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get('sfm_access_token')?.value ?? null;
  return getUserFromBearerToken(bearerToken || cookieToken);
}

function extractTipJson(text: string) {
  const clean = text.replace(/```json|```/gi, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(clean.slice(start, end + 1));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    if (![record.titleAr, record.contentAr, record.titleEn, record.contentEn].every(value => typeof value === 'string' && value.trim())) return null;
    return {
      titleAr: String(record.titleAr).trim(),
      contentAr: String(record.contentAr).trim(),
      titleEn: String(record.titleEn).trim(),
      contentEn: String(record.contentEn).trim(),
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ tip: null }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
  }

  const limited = await rateLimitRequest(request, { max: 10, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;

  try {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    if (!aiProviderConfigured()) return NextResponse.json({ tip: null }, { headers: { 'Cache-Control': 'private, no-store' } });

    const usage = await consumeAiUsage({
      userId: user.id,
      feature: 'daily_tip',
      metadata: {
        route: '/api/daily-tip',
        dayOfYear,
        provider: 'sfm-private-ai',
      },
    });
    if (!usage.allowed) return aiUsageLimitResponse(usage);

    const generation = await generateAssistantReply({
      correlationId: randomUUID(),
      system: [
        'You are THE SFM private financial-education tip writer.',
        'Create one short educational personal-finance tip inspired by a well-known published finance book.',
        'Do not fabricate a quotation or page number and do not present the text as a verbatim quote.',
        'Do not provide personalized investment advice or promises of returns.',
        'Return strict JSON only with exactly these string fields: titleAr, contentAr, titleEn, contentEn.',
        'titleAr/titleEn contain the book title; contentAr/contentEn contain a concise paraphrased educational takeaway.',
      ].join(' '),
      messages: [{ role: 'user', content: `Generate the daily financial education tip for deterministic day index ${dayOfYear}.` }],
      maxTokens: 220,
    });

    const tip = generation ? extractTipJson(generation.text) : null;
    return NextResponse.json({ tip }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ tip: null }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
}
