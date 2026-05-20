import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';

type IncomingMessage = { role: 'user' | 'assistant' | 'system'; content: string };

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

function isIncomingMessage(value: unknown): value is IncomingMessage {
  if (!value || typeof value !== 'object') return false;
  const maybe = value as Record<string, unknown>;
  return typeof maybe.content === 'string'
    && (maybe.role === 'user' || maybe.role === 'assistant' || maybe.role === 'system');
}

function mockResponse(messages: IncomingMessage[]) {
  const last = messages.filter(message => message.role === 'user').at(-1)?.content || '';
  return `تم استلام سؤالك: ${last || 'طلب تحليل مالي'}. حالياً لا يوجد مفتاح ذكاء اصطناعي مفعّل، لذلك هذه إجابة آمنة: راجع الدخل، المصروفات، والادخار الشهري، ثم اختر إجراءً واحداً قابلاً للتنفيذ هذا الأسبوع.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { messages?: unknown };
    const messages = Array.isArray(body.messages) ? body.messages.filter(isIncomingMessage) : [];

    if (!process.env.AI_GATEWAY_TOKEN && !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ text: mockResponse(messages) });
    }

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
      messages: messages.map(message => ({ role: message.role, content: message.content })),
      maxTokens: 800,
    });

    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ text: 'عذراً، حدث خطأ في الخدمة. حاول مرة أخرى.' }, { status: 200 });
  }
}
