import { NextRequest, NextResponse } from 'next/server';
import { computeZakat, buildSystemPrompt } from '@/lib/wakeel';
import { loadProfile } from '@/lib/supabase/portfolio';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Msg = {
  role: 'user' | 'assistant';
  content: string;
};

function toGeminiRole(role: 'user' | 'assistant') {
  return role === 'assistant' ? 'model' : 'user';
}

function extractGeminiText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((p: any) => p?.text ?? '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is missing' },
        { status: 500 },
      );
    }

    const userId = 'test-user';

    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages as Msg[] : [];
    const name = body?.name || 'محمد';

    if (!messages.length) {
      return NextResponse.json(
        { error: 'messages required' },
        { status: 400 },
      );
    }

    const profile = await loadProfile(userId);
    const summary = computeZakat(profile);
    const system = buildSystemPrompt(name, summary);

    const contents = messages.slice(-12).map((m) => ({
      role: toGeminiRole(m.role),
      parts: [{ text: String(m.content ?? '') }],
    }));

    const endpoint =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent' +
      `?key=${process.env.GEMINI_API_KEY}`;

    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: system }],
        },
        contents,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 700,
        },
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      return NextResponse.json(
        {
          error:
            data?.error?.message ||
            data?.error ||
            'gemini_error',
        },
        { status: r.status },
      );
    }

    const text = extractGeminiText(data);

    if (!text) {
      return NextResponse.json(
        { error: 'empty_response' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      reply: text,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || 'wakeel_api_error',
      },
      { status: 500 },
    );
  }
}
