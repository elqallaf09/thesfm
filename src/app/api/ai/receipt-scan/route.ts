import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_RECEIPTS = 10;
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

type ReceiptItem = {
  name: string;
  quantity?: number;
  unitPrice?: number;
  price?: number;
  total?: number;
};

type ReceiptScanResult = {
  merchantName?: string;
  invoiceNumber?: string;
  totalAmount?: number;
  subtotal?: number;
  currency?: string;
  taxAmount?: number;
  paidAmount?: number;
  changeAmount?: number;
  receiptDate?: string;
  date?: string;
  category?: string;
  paymentMethod?: string;
  items?: ReceiptItem[];
  rawText?: string;
  confidenceScore?: number;
  confidence?: number;
};

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

function normalizeArabicNumbers(value: string) {
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  return value
    .replace(/[٠-٩]/g, digit => String(arabic.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String(persian.indexOf(digit)))
    .replace(/\u066B/g, '.')
    .replace(/\u066C/g, ',');
}

function parseMoney(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Number(value.toFixed(3));
  if (typeof value !== 'string') return undefined;
  const normalized = normalizeArabicNumbers(value)
    .replace(/(?:KWD|KD|د\.?ك|د\s*ك)/gi, '')
    .replace(/[^\d.,-]/g, '')
    .trim();
  if (!normalized) return undefined;
  const decimal = normalized.includes('.') ? normalized.replace(/,/g, '') : normalized.replace(',', '.');
  const amount = Number(decimal);
  return Number.isFinite(amount) && amount > 0 ? Number(amount.toFixed(3)) : undefined;
}

function parseReceiptTotal(text: string) {
  const normalized = normalizeArabicNumbers(text);
  const patterns = [
    /(?:الإجمالي\s*النهائي|إجمالي\s*الفاتورة|المجموع\s*النهائي|الصافي\s*المستحق|الصافي)\s*[:：]?\s*(?:KWD|KD|د\.?ك|د\s*ك)?\s*([\d.,]+)/i,
    /(?:Grand\s*Total|Total\s*Amount|Amount\s*Due|Total\s*Due|Net\s*Total|Final\s*Total)\s*[:：]?\s*(?:KWD|KD)?\s*([\d.,]+)/i,
    /(?:Total\s*final|Montant\s*total|Total\s*à\s*payer)\s*[:：]?\s*(?:KWD|KD)?\s*([\d.,]+)/i,
    /(?:الإجمالي|المجموع|الصافي)\s*[:：]?\s*(?:KWD|KD|د\.?ك|د\s*ك)?\s*([\d.,]+)/i,
    /(?:KWD|KD)\s*([\d.,]+)\s*(?:Grand\s*Total|Total)?/i,
    /([\d.,]+)\s*(?:د\.?ك|د\s*ك)\s*(?:الإجمالي|المجموع|Total)?/i,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const amount = parseMoney(match?.[1]);
    if (amount) return amount;
  }
  return undefined;
}

function parseReceiptNumber(text: string, patterns: RegExp[]) {
  const normalized = normalizeArabicNumbers(text);
  for (const pattern of patterns) {
    const amount = parseMoney(normalized.match(pattern)?.[1]);
    if (amount) return amount;
  }
  return undefined;
}

function parseInvoiceNumber(text: string) {
  const normalized = normalizeArabicNumbers(text);
  return normalized.match(/(?:invoice|inv|فاتورة|رقم\s*الفاتورة)\s*[-#:：]?\s*([A-Z0-9-]+)/i)?.[1];
}

function parseMerchantName(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  return lines.find(line => !/(invoice|inv-|date|payment|total|الإجمالي|المجموع|التاريخ|الدفع|فاتورة)/i.test(line));
}

function normalizeDate(value: unknown, rawText?: string) {
  if (typeof value === 'string') {
    const normalized = normalizeArabicNumbers(value.trim());
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
    const match = normalized.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (match) {
      const [, day, month, year] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  if (rawText) {
    const match = normalizeArabicNumbers(rawText).match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (match) {
      const [, day, month, year] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  return undefined;
}

function normalizeCategory(value: unknown, rawText?: string) {
  const text = `${String(value || '')} ${rawText || ''}`.toLowerCase();
  if (/restaurant|cafe|food|مطعم|قهوة|كافيه/.test(text)) return 'restaurants';
  if (/bill|invoice|utility|فاتورة|كهرباء|ماء/.test(text)) return 'bills';
  if (/taxi|fuel|transport|uber|بنزين|مواصلات/.test(text)) return 'transport';
  if (/clinic|pharmacy|health|صيدلية|عيادة|صحة/.test(text)) return 'health';
  if (/school|education|تعليم|مدرسة/.test(text)) return 'education';
  if (/rent|إيجار|ايجار/.test(text)) return 'rent';
  if (/loan|قرض|قروض/.test(text)) return 'loans';
  if (/subscription|اشتراك/.test(text)) return 'subscriptions';
  if (/shopping|market|store|مشتريات|جمعية|تجارة|سوق/.test(text)) return 'shopping';
  return 'other';
}

function normalizePayment(value: unknown, rawText?: string) {
  const text = `${String(value || '')} ${rawText || ''}`.toLowerCase();
  if (/knet|كي\s?نت|كي-?نت/.test(text)) return 'knet';
  if (/apple\s*pay|applepay/.test(text)) return 'apple_pay';
  if (/cash|كاش|نقد/.test(text)) return 'cash';
  if (/transfer|تحويل/.test(text)) return 'transfer';
  if (/card|visa|mastercard|بطاقة/.test(text)) return 'card';
  return 'other';
}

function normalizeItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => item && typeof item === 'object' ? item as Record<string, unknown> : null)
    .filter(Boolean)
    .map(item => {
      const total = parseMoney(item?.total) ?? parseMoney(item?.price) ?? 0;
      const unitPrice = parseMoney(item?.unitPrice);
      return {
        name: String(item?.name || 'Item'),
        quantity: Number(item?.quantity) || undefined,
        unitPrice,
        price: total,
        total,
      };
    })
    .filter(item => item.total >= 0)
    .slice(0, 20);
}

function getFirstAmount(data: Record<string, unknown>, rawText?: string) {
  const keys = ['totalAmount', 'finalTotal', 'grandTotal', 'total_amount', 'amountDue', 'netTotal', 'total', 'amount'];
  for (const key of keys) {
    const amount = parseMoney(data[key]);
    if (amount) return amount;
  }
  return rawText ? parseReceiptTotal(rawText) : undefined;
}

function normalizeResult(value: unknown, fileName: string): ReceiptScanResult {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const rawText = typeof data.rawText === 'string' ? data.rawText : typeof data.text === 'string' ? data.text : '';
  const totalAmount = getFirstAmount(data, rawText);
  const taxAmount = parseMoney(data.taxAmount);
  const subtotal = parseMoney(data.subtotal) ?? (rawText ? parseReceiptNumber(rawText, [/(?:subtotal|sub\s*total|المجموع\s*الفرعي|قبل\s*الضريبة)\s*[:：]?\s*([\d.,]+)/i]) : undefined);
  const paidAmount = parseMoney(data.paidAmount) ?? (rawText ? parseReceiptNumber(rawText, [/(?:paid|paid\s*amount|amount\s*paid|المدفوع|المبلغ\s*المدفوع)\s*[:：]?\s*([\d.,]+)/i]) : undefined);
  const changeAmount = parseMoney(data.changeAmount) ?? (rawText ? parseReceiptNumber(rawText, [/(?:change|balance|الباقي|المتبقي)\s*[:：]?\s*([\d.,]+)/i]) : undefined);
  const confidenceScore = Number(data.confidenceScore ?? data.confidence);
  const merchant = data.merchantName ?? data.merchant ?? data.storeName ?? data.vendor ?? (rawText ? parseMerchantName(rawText) : undefined);

  return {
    merchantName: typeof merchant === 'string' && merchant.trim() ? merchant.trim() : undefined,
    invoiceNumber: typeof data.invoiceNumber === 'string' ? data.invoiceNumber : rawText ? parseInvoiceNumber(rawText) : undefined,
    totalAmount,
    subtotal,
    currency: typeof data.currency === 'string' ? data.currency : 'KWD',
    taxAmount,
    paidAmount,
    changeAmount,
    receiptDate: normalizeDate(data.receiptDate ?? data.date, rawText),
    date: normalizeDate(data.receiptDate ?? data.date, rawText),
    category: normalizeCategory(data.category, rawText),
    paymentMethod: normalizePayment(data.paymentMethod, rawText),
    items: normalizeItems(data.items),
    rawText: rawText || undefined,
    confidenceScore: Number.isFinite(confidenceScore) ? Math.max(0, Math.min(1, confidenceScore)) : totalAmount ? 0.84 : 0.48,
    confidence: Number.isFinite(confidenceScore) ? Math.max(0, Math.min(1, confidenceScore)) : totalAmount ? 0.84 : 0.48,
  };
}

function readOutputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === 'string') return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    const content = item && typeof item === 'object' && Array.isArray((item as Record<string, unknown>).content)
      ? (item as Record<string, unknown>).content as Array<Record<string, unknown>>
      : [];
    for (const part of content) {
      if (typeof part.text === 'string') return part.text;
      if (typeof part.output_text === 'string') return part.output_text;
    }
  }
  return '';
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
            text: [
              'Extract receipt data as strict JSON only.',
              'Prioritize the final payable receipt total, not subtotal, tax, paid amount, or change.',
              'Total labels include: الإجمالي النهائي, المجموع النهائي, Grand Total, Total Amount, Net Total, Amount Due, Total, الإجمالي.',
              'Convert Arabic/Persian digits to normal decimal numbers.',
              'Use this schema: {"merchantName":"string","invoiceNumber":"string|null","subtotal":number|null,"totalAmount":number,"currency":"KWD","taxAmount":number|null,"paidAmount":number|null,"changeAmount":number|null,"receiptDate":"YYYY-MM-DD","category":"restaurants|shopping|bills|transport|health|education|rent|loans|subscriptions|other","paymentMethod":"cash|knet|card|transfer|apple_pay|other","items":[{"name":"string","quantity":number|null,"unitPrice":number|null,"total":number}],"confidenceScore":number,"rawText":"string"}.',
            ].join(' '),
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
              invoiceNumber: { type: ['string', 'null'] },
              subtotal: { type: ['number', 'null'] },
              totalAmount: { type: 'number' },
              currency: { type: 'string' },
              taxAmount: { type: ['number', 'null'] },
              paidAmount: { type: ['number', 'null'] },
              changeAmount: { type: ['number', 'null'] },
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
                    quantity: { type: ['number', 'null'] },
                    unitPrice: { type: ['number', 'null'] },
                    total: { type: 'number' },
                  },
                  required: ['name', 'quantity', 'unitPrice', 'total'],
                },
              },
              confidenceScore: { type: 'number' },
              rawText: { type: 'string' },
            },
            required: ['merchantName', 'invoiceNumber', 'subtotal', 'totalAmount', 'currency', 'taxAmount', 'paidAmount', 'changeAmount', 'receiptDate', 'category', 'paymentMethod', 'items', 'confidenceScore', 'rawText'],
          },
        },
      },
    }),
  });

  if (!response.ok) return null;
  const payload = await response.json() as Record<string, unknown>;
  const text = readOutputText(payload);
  if (!text) return null;
  return normalizeResult(JSON.parse(text), file.name);
}

async function scanFile(file: File, receiptText?: string) {
  if (!SUPPORTED_TYPES.has(file.type)) {
    return { fileName: file.name, success: false, error: 'Unsupported file type' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { fileName: file.name, success: false, error: 'File size is too large' };
  }

  const bytes = await file.arrayBuffer();
  if (receiptText?.trim()) {
    const parsed = normalizeResult({ rawText: receiptText }, file.name);
    return { fileName: file.name, success: Boolean(parsed.totalAmount), data: parsed, error: parsed.totalAmount ? undefined : 'Could not read receipt amount clearly' };
  }

  const aiResult = await analyzeWithOpenAI(file, bytes).catch(error => {
    console.error('Receipt AI scan failed:', { fileName: file.name, error });
    return null;
  });
  if (!aiResult?.totalAmount) {
    return { fileName: file.name, success: false, data: undefined, error: 'Could not read receipt amount clearly' };
  }
  return { fileName: file.name, success: true, data: aiResult };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = [...formData.getAll('receipt'), ...formData.getAll('receipts')].filter((file): file is File => file instanceof File);
    if (!files.length) return errorResponse('No receipt file uploaded');
    if (files.length > MAX_RECEIPTS) return errorResponse('You can upload up to 10 receipts at once', 413);
    const receiptText = formData.get('receiptText');
    const results = await Promise.all(files.map(file => scanFile(file, typeof receiptText === 'string' ? receiptText : undefined)));
    if (files.length === 1) {
      const [result] = results;
      return NextResponse.json({ success: result.success, data: result.data, error: result.error, results });
    }
    return NextResponse.json({ success: results.some(result => result.success), results });
  } catch (error) {
    console.error('Receipt scan route failed:', error);
    return errorResponse('We could not read the receipt clearly', 500);
  }
}
