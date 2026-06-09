import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';

const getProvider = () => {
  const gatewayToken = process.env.AI_GATEWAY_TOKEN;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (gatewayToken) {
    return createAnthropic({
      apiKey: gatewayToken,
      baseURL: 'https://ai-gateway.vercel.sh/v1/anthropic',
    });
  }
  return createAnthropic({ apiKey: anthropicKey || '' });
};

export async function GET() {
  try {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const anthropic = getProvider();

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
