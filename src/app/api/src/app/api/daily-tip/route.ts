import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);

    const apiKey = process.env.AI_GATEWAY_TOKEN || process.env.ANTHROPIC_API_KEY || '';
    const isGateway = !!process.env.AI_GATEWAY_TOKEN;

    const url = isGateway
      ? 'https://ai-gateway.vercel.sh/v1/anthropic/v1/messages'
      : 'https://api.anthropic.com/v1/messages';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'anthropic-version': '2023-06-01',
        ...(!isGateway ? { 'x-api-key': apiKey } : {}),
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: `أنت مستشار مالي. أنشئ نصيحة مالية يومية مستوحاة من كتب مشهورة. أجب فقط بـ JSON هكذا بدون أي نص إضافي:
{"titleAr":"اسم الكتاب أو المفكر","contentAr":"النصيحة بالعربي","titleEn":"Book/Author","contentEn":"Tip in English"}`,
        messages: [{ role: 'user', content: `نصيحة مالية مميزة لليوم رقم ${dayOfYear}` }],
      }),
    });

    if (!response.ok) return NextResponse.json({ tip: null });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const tip = JSON.parse(clean);
    return NextResponse.json({ tip });
  } catch {
    return NextResponse.json({ tip: null });
  }
}
