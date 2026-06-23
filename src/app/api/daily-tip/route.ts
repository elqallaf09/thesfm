import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { getUserFromBearerToken } from '@/lib/server/adminAccess';
import { aiUsageLimitResponse, consumeAiUsage } from '@/lib/server/aiUsage';
import { cookies } from 'next/headers';

const getProvider = () => {
  const gatewayToken = process.env.AI_GATEWAY_TOKEN;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (gatewayToken) {
    return createAnthropic({
      apiKey: gatewayToken,
      baseURL: 'https://ai-gateway.vercel.sh/v1/anthropic',
    });
  }
  return anthropicKey ? createAnthropic({ apiKey: anthropicKey }) : null;
};

async function getAuthUser(request: NextRequest) {
  const header = request.headers.get('authorization') ?? '';
  const bearerToken = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null;
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get('sfm_access_token')?.value ?? null;
  return getUserFromBearerToken(bearerToken || cookieToken);
}

export async function GET(request: NextRequest) {
  // Auth check — only logged-in users
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ tip: null }, { status: 401 });
  }

  // Rate limit: max 10 requests per hour per user
  const limited = await rateLimitRequest(request, { max: 10, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;

  try {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const anthropic = getProvider();
    if (!anthropic) return NextResponse.json({ tip: null });

    const usage = await consumeAiUsage({
      userId: user.id,
      feature: 'daily_tip',
      metadata: {
        route: '/api/daily-tip',
        dayOfYear,
      },
    });
    if (!usage.allowed) return aiUsageLimitResponse(usage);

    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system: 'أنت مستشار مالي. أنشئ نصيحة مالية يومية من كتاب مشهور. أجب فقط بـ JSON بدون نص إضافي: {"titleAr":"اسم الكتاب","contentAr":"النصيحة","titleEn":"Book Name","contentEn":"Tip"}',
      prompt: `نصيحة مالية مميزة لليوم رقم ${dayOfYear}`,
      maxTokens: 200,
    });

    const clean = text.replace(/```json|```/g, '').trim();
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start === -1 || end === -1) return NextResponse.json({ tip: null });
    const tip = JSON.parse(clean.slice(start, end + 1));
    return NextResponse.json({ tip });
  } catch {
    return NextResponse.json({ tip: null });
  }
}
