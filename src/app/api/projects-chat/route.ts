import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: `أنت مستشار مالي متخصص في المشاريع الصغيرة والمتوسطة في الكويت والخليج العربي. مهمتك حصراً:
1. مساعدة المستخدم في التخطيط لمشاريعه المستقبلية
2. حساب التكاليف التقريبية بالدينار الكويتي
3. تقديم خطوات عملية لتنفيذ المشروع
4. نصائح استثمارية وتمويلية للمشاريع
5. تحليل مخاطر المشاريع وفرص النجاح

لا تتحدث في أي موضوع خارج المشاريع والاستثمار والتخطيط المالي. ردودك باللغة العربية بشكل مختصر ومفيد مع نقاط واضحة.`,
        messages: messages,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'AI service error' }, { status: 500 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || 'عذراً، لم أتمكن من الرد.';
    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
