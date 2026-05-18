import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

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
        max_tokens: 1000,
        system: `أنت مستشار مالي متخصص في المشاريع الصغيرة والمتوسطة في الكويت والخليج العربي. مهمتك حصراً:
1. مساعدة المستخدم في التخطيط لمشاريعه المستقبلية
2. حساب التكاليف التقريبية بالدينار الكويتي
3. تقديم خطوات عملية لتنفيذ المشروع
4. نصائح استثمارية وتمويلية للمشاريع
لا تتحدث في أي موضوع خارج المشاريع والاستثمار. ردودك باللغة العربية بشكل مختصر.`,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('AI error:', response.status, err);
      return NextResponse.json({ error: 'AI service error' }, { status: 500 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || 'عذراً، لم أتمكن من الرد.';
    return NextResponse.json({ text });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
