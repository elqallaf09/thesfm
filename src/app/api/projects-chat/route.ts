import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const anthropic = getProvider();

    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system: `أنت مستشار مالي متخصص في المشاريع الصغيرة والمتوسطة في الكويت والخليج العربي.
مهمتك حصراً:
- مساعدة المستخدم في التخطيط لمشاريعه المستقبلية
- حساب التكاليف التقريبية بالدينار الكويتي
- تقديم خطوات عملية لتنفيذ المشروع
- نصائح استثمارية وتمويلية للمشاريع
- تحليل مخاطر المشاريع وفرص النجاح
لا تتحدث في أي موضوع خارج المشاريع والاستثمار. ردودك بالعربية مختصرة ومفيدة.`,
      messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
      maxTokens: 800,
    });

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('AI error:', error?.message || error);
    return NextResponse.json({ text: 'عذراً، حدث خطأ في الخدمة. حاول مرة أخرى.' }, { status: 200 });
  }
}
