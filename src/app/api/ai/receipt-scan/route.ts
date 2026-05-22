import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

type ReceiptScanResult = {
  merchantName?: string;
  totalAmount?: number;
  taxAmount?: number;
  receiptDate?: string;
  category?: string;
  paymentMethod?: string;
  items?: Array<{ name: string; price: number }>;
  confidenceScore?: number;
};

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function normalizeResult(value: unknown, fileName: string): ReceiptScanResult {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const totalAmount = Number(data.totalAmount);
  const taxAmount = Number(data.taxAmount);
  const confidenceScore = Number(data.confidenceScore);
  const items = Array.isArray(data.items)
    ? data.items
      .map(item => item && typeof item === 'object' ? item as Record<string, unknown> : null)
      .filter(Boolean)
      .map(item => ({ name: String(item?.name || 'Item'), price: Number(item?.price) || 0 }))
      .filter(item => item.price >= 0)
      .slice(0, 20)
    : [];

  return {
    merchantName: typeof data.merchantName === 'string' && data.merchantName.trim() ? data.merchantName.trim() : fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
    totalAmount: Number.isFinite(totalAmount) && totalAmount > 0 ? totalAmount : undefined,
    taxAmount: Number.isFinite(taxAmount) && taxAmount >= 0 ? taxAmount : undefined,
    receiptDate: typeof data.receiptDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.receiptDate) ? data.receiptDate : new Date().toISOString().slice(0, 10),
    category: typeof data.category === 'string' ? data.category : 'shopping',
    paymentMethod: typeof data.paymentMethod === 'string' ? data.paymentMethod : 'card',
    items,
    confidenceScore: Number.isFinite(confidenceScore) ? Math.max(0, Math.min(1, confidenceScore)) : 0.72,
  };
}

function fallbackResult(fileName: string): ReceiptScanResult {
  const lower = fileName.toLowerCase();
  const category = /restaurant|cafe|food|مطعم|قهوة/.test(lower)
    ? 'restaurants'
    : /fuel|taxi|uber|transport|بنزين/.test(lower)
      ? 'transport'
      : /clinic|pharmacy|health|صيدلية/.test(lower)
        ? 'health'
        : 'shopping';

  return {
    merchantName: fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') || 'Receipt',
    totalAmount: undefined,
    taxAmount: undefined,
    receiptDate: new Date().toISOString().slice(0, 10),
    category,
    paymentMethod: 'card',
    items: [],
    confidenceScore: 0.58,
  };
}

async function analyzeWithOpenAI(file: File, bytes: ArrayBuffer): Promise<ReceiptScanResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || file.type === 'application/pdf') return null;

  const base64 = Buffer.from(bytes).toString('base64');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_RECEIPT_MODEL || 'gpt-4.1-mini',
      input: [{
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Extract receipt data as strict JSON only. Use this schema: {"merchantName":"string","totalAmount":number,"taxAmount":number|null,"receiptDate":"YYYY-MM-DD","category":"restaurants|shopping|bills|transport|health|education|rent|loans|subscriptions|other","paymentMethod":"cash|knet|card|transfer|apple_pay|other","items":[{"name":"string","price":number}],"confidenceScore":number}.',
          },
          {
            type: 'input_image',
            image_url: `data:${file.type};base64,${base64}`,
          },
        ],
      }],
      text: {
        format: {
          type: 'json_schema',
          name: 'receipt_scan',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              merchantName: { type: 'string' },
              totalAmount: { type: 'number' },
              taxAmount: { type: ['number', 'null'] },
              receiptDate: { type: 'string' },
              category: { type: 'string' },
              paymentMethod: { type: 'string' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    name: { type: 'string' },
                    price: { type: 'number' },
                  },
                  required: ['name', 'price'],
                },
              },
              confidenceScore: { type: 'number' },
            },
            required: ['merchantName', 'totalAmount', 'receiptDate', 'category', 'paymentMethod', 'items', 'confidenceScore'],
          },
        },
      },
    }),
  });

  if (!response.ok) return null;
  const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  const text = payload.output_text || payload.output?.flatMap(item => item.content || []).find(item => item.text)?.text;
  if (!text) return null;
  return normalizeResult(JSON.parse(text), file.name);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('receipt');

    if (!(file instanceof File)) return errorResponse('No receipt file uploaded');
    if (!SUPPORTED_TYPES.has(file.type)) return errorResponse('Unsupported file type', 415);
    if (file.size > MAX_FILE_SIZE) return errorResponse('File size is too large', 413);

    const bytes = await file.arrayBuffer();
    const aiResult = await analyzeWithOpenAI(file, bytes).catch(() => null);
    return NextResponse.json({ data: aiResult ?? fallbackResult(file.name) });
  } catch {
    return errorResponse('We could not read the receipt clearly', 500);
  }
}
