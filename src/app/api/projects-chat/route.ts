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
        max_tokens: 800,
        system: 'أنت مستشار مالي متخصص في المشاريع الصغيرة في الكويت والخليج. ساعد في التخطيط للمشاريع وحساب التكاليف بالدينار الكويتي. لا تتحدث في مواضيع خارج المشاريع والمال. ردودك مختصرة ومفيدة بالعربية.',
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic error:', response.status, errText);
      return NextResponse.json({ text: `خطأ ${response.status}: تحقق من مفتاح API` }, { status: 200 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || 'عذراً، لم أتمكن من الرد.';
    return NextResponse.json({ text });
  } catch (error) {
    console.error('Route error:', error);
    return NextResponse.json({ text: 'عذراً، حدث خطأ في الاتصال بالخادم.' }, { status: 200 });
  }
}
