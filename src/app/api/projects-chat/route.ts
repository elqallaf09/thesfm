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
  return anthropicKey ? createAnthropic({ apiKey: anthropicKey }) : null;
};

function isIncomingMessage(value: unknown): value is IncomingMessage {
  if (!value || typeof value !== 'object') return false;
  const maybe = value as Record<string, unknown>;
  return typeof maybe.content === 'string'
    && (maybe.role === 'user' || maybe.role === 'assistant' || maybe.role === 'system');
}

function unavailableResponse() {
  return [
    'لا توجد بيانات كافية لإعطاء تحليل دقيق.',
    'There is not enough data to provide an accurate analysis.',
    'Les données sont insuffisantes pour fournir une analyse précise.',
  ].join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { messages?: unknown };
    const messages = Array.isArray(body.messages) ? body.messages.filter(isIncomingMessage) : [];
    const anthropic = getProvider();

    if (!anthropic) {
      return NextResponse.json({ text: unavailableResponse(), source: 'unavailable' });
    }

    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system: [
        'You are a planning assistant for THE SFM projects.',
        'Use only user-provided messages and clearly say when data is missing.',
        'Do not invent revenue, costs, market size, legal requirements, success probabilities, or investment recommendations.',
        'Your answer must be educational and planning-focused, not financial or legal advice.',
      ].join(' '),
      messages: messages.map(message => ({ role: message.role, content: message.content })),
      maxTokens: 800,
    });

    return NextResponse.json({ text, source: 'ai' });
  } catch {
    return NextResponse.json({ text: unavailableResponse(), source: 'error' }, { status: 200 });
  }
}
