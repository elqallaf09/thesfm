import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: 'أنت مستشار مالي. أنشئ نصيحة مالية يومية من كتاب مشهور. أجب فقط بـ JSON هكذا بدون نص إضافي: {"titleAr":"اسم الكتاب","contentAr":"النصيحة","titleEn":"Book Name","contentEn":"Tip"}',
        messages: [{ role: 'user', content: `نصيحة مالية لليوم رقم ${dayOfYear}` }],
      }),
    });

    if (!response.ok) return NextResponse.json({ tip: null });

    const data = await response.json();
    const text = (data.content?.[0]?.text || '').replace(/```json|```/g, '').trim();
    const tip = JSON.parse(text);
    return NextResponse.json({ tip });
  } catch {
    return NextResponse.json({ tip: null });
  }
}
