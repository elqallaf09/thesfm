import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: `أنت مستشار مالي متخصص. مهمتك إنشاء نصيحة مالية يومية مختصرة ومفيدة مستوحاة من كتب الأعمال والمال العالمية.
النصيحة يجب أن تكون:
- مختصرة (جملة واحدة أو جملتان كحد أقصى)
- عملية وقابلة للتطبيق
- مستوحاة من كتاب أو مفكر مشهور
- باللغة العربية والإنجليزية

أجب فقط بـ JSON بهذا الشكل بدون أي نص إضافي:
{"titleAr":"اسم الكتاب أو المفكر بالعربي","contentAr":"النصيحة بالعربي","titleEn":"Book/Author name","contentEn":"Tip in English"}`,
        messages: [
          {
            role: 'user',
            content: `اليوم رقم ${dayOfYear} من السنة. أعطني نصيحة مالية يومية مميزة ومختلفة.`
          }
        ]
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ tip: null }, { status: 200 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    // تنظيف الـ JSON
    const clean = text.replace(/```json|```/g, '').trim();
    const tip = JSON.parse(clean);

    return NextResponse.json({ tip });
  } catch {
    // إذا فشل الـ API، أرجع null وسيستخدم الكود النصائح الثابتة
    return NextResponse.json({ tip: null });
  }
}
