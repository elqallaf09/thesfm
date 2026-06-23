import { NextRequest, NextResponse } from 'next/server';
import { getUserFromBearerToken } from '@/lib/server/adminAccess';
import { aiUsageLimitResponse, consumeAiUsage } from '@/lib/server/aiUsage';

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

type AmountCandidate = {
  label: string;
  kind: 'amount_due' | 'grand_total' | 'invoice_total' | 'total' | 'subtotal' | 'tax' | 'discount' | 'line_item' | 'computed' | 'other';
  amount: number;
  currency?: string;
  confidence: number;
  source?: string;
};

type ReceiptScanResult = {
  merchantName?: string;
  description?: string;
  invoiceNumber?: string;
  totalAmount?: number;
  subtotal?: number;
  currency?: string;
  taxAmount?: number;
  discountAmount?: number;
  paidAmount?: number;
  changeAmount?: number;
  receiptDate?: string;
  date?: string;
  category?: string;
  paymentMethod?: string;
  items?: ReceiptItem[];
  amountCandidates?: AmountCandidate[];
  selectedAmountLabel?: string;
  confidenceLevel?: 'high' | 'medium' | 'low';
  warnings?: string[];
  rawText?: string;
  confidenceScore?: number;
  confidence?: number;
};

type ScanDebug = {
  stage: 'upload' | 'provider' | 'ai' | 'parser' | 'ui';
  fileName: string;
  fileType: string;
  fileSize: number;
  providerConfigured: boolean;
  rawTextLength?: number;
  candidateCount?: number;
  selectedAmount?: number;
  confidence?: string;
  errorSource?: string;
  status?: number;
  message?: string;
};

type ScanFileResult = {
  fileName: string;
  success: boolean;
  data?: ReceiptScanResult;
  error?: string;
  debug: ScanDebug;
};

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

function bearerToken(request: NextRequest) {
  const auth = request.headers.get('Authorization') ?? '';
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
}

async function requestUser(request: NextRequest) {
  return getUserFromBearerToken(bearerToken(request) || request.cookies.get('sfm_access_token')?.value || null);
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

function isTemplatePlaceholder(value: unknown) {
  return typeof value === 'string' && /^\s*\{\{[^}]+}}\s*$/.test(value);
}

function removeTemplatePlaceholders(value: string) {
  return value.replace(/\{\{[^}]+}}/g, ' ');
}

function cleanTextValue(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const cleaned = removeTemplatePlaceholders(value).replace(/\s+/g, ' ').trim();
  return cleaned && !isTemplatePlaceholder(cleaned) ? cleaned : undefined;
}

function parseSignedMoney(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return Number(value.toFixed(3));
  if (typeof value !== 'string') return undefined;
  const normalized = normalizeArabicNumbers(value);
  const negative = /^\s*-/.test(normalized) || /\([^)]*\d[^)]*\)/.test(normalized);
  const cleaned = normalized
    .replace(/\{\{[^}]+}}/g, '')
    .replace(/(?:KWD|KD|USD|SAR|AED|EUR|GBP|EGP|جنيه(?:ا|ات)?|د\.?\s*ك|دك|ر\.?\s*س|د\.?\s*إ|\$|€|£)/gi, '')
    .replace(/[^\d.,-]/g, '')
    .replace(/(?!^)-/g, '')
    .trim();
  if (!cleaned || !/\d/.test(cleaned)) return undefined;

  const withoutSign = cleaned.replace(/^-/, '');
  const lastDot = withoutSign.lastIndexOf('.');
  const lastComma = withoutSign.lastIndexOf(',');
  let decimal = withoutSign;

  if (lastDot >= 0 && lastComma >= 0) {
    const decimalSeparator = lastDot > lastComma ? '.' : ',';
    const groupSeparator = decimalSeparator === '.' ? ',' : '.';
    decimal = withoutSign.replaceAll(groupSeparator, '').replace(decimalSeparator, '.');
  } else if (lastComma >= 0) {
    const decimals = withoutSign.length - lastComma - 1;
    decimal = decimals > 0 && decimals <= 3
      ? withoutSign.replace(',', '.')
      : withoutSign.replaceAll(',', '');
  } else {
    decimal = withoutSign.replaceAll(',', '');
  }

  const amount = Number(decimal.replace(/\s/g, ''));
  if (!Number.isFinite(amount)) return undefined;
  return Number((negative ? -Math.abs(amount) : amount).toFixed(3));
}

function parseMoney(value: unknown) {
  const amount = parseSignedMoney(value);
  return typeof amount === 'number' && amount > 0 ? Number(amount.toFixed(3)) : undefined;
}

function normalizeCurrency(value?: unknown, context = '') {
  const text = `${typeof value === 'string' ? value : ''} ${context}`.toUpperCase();
  if (/\bEGP\b|جنيه|جنيها|جنيهات/.test(text)) return 'EGP';
  if (/\bKWD\b|\bKD\b|د\.?\s*ك|دك/.test(text)) return 'KWD';
  if (/\bSAR\b|ر\.?\s*س/.test(text)) return 'SAR';
  if (/\bAED\b|د\.?\s*إ/.test(text)) return 'AED';
  if (/\bEUR\b|€/.test(text)) return 'EUR';
  if (/\bGBP\b|£/.test(text)) return 'GBP';
  if (/\bUSD\b|US\s*DOLLAR|\$/.test(text)) return 'USD';
  if (typeof value === 'string') {
    const upper = value.trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(upper)) return upper;
  }
  return undefined;
}

function classifyAmountLine(line: string): Pick<AmountCandidate, 'kind' | 'label' | 'confidence'> {
  const lower = line.toLowerCase();
  if (/amount\s*due|balance\s*due|total\s*due|المستحق|مستحق\s*الدفع|المبلغ\s*المستحق|المطلوب\s*دفعه/.test(lower)) {
    return { kind: 'amount_due', label: 'Amount Due', confidence: 0.98 };
  }
  if (/grand\s*total|final\s*total|المجموع\s*الكلي|المجموع\s*النهائي|الإجمالي\s*الكلي|الإجمالي\s*النهائي|اجمالي\s*كلي|إجمالي\s*كلي/.test(lower)) {
    return { kind: 'grand_total', label: 'Grand Total', confidence: 0.97 };
  }
  if (/invoice\s*total|total\s*amount|إجمالي\s*الفاتورة/.test(lower)) {
    return { kind: 'invoice_total', label: 'Invoice Total', confidence: 0.96 };
  }
  if (/subtotal|sub\s*total|المجموع\s*الفرعي|الإجمالي\s*الفرعي|قبل\s*الضريبة/.test(lower)) {
    return { kind: 'subtotal', label: 'Subtotal', confidence: 0.68 };
  }
  if (/discount|coupon|خصم|الخصم/.test(lower)) {
    return { kind: 'discount', label: 'Discount', confidence: 0.52 };
  }
  if (/\btax\b|vat|ضريبة|الضريبة/.test(lower)) {
    return { kind: 'tax', label: 'Tax', confidence: 0.48 };
  }
  if (/\btotal\b|الإجمالي|اجمالي|المجموع|المبلغ/.test(lower)) {
    return { kind: 'total', label: 'Total', confidence: 0.94 };
  }
  if (/labor|service|description|item|amount|خدمة|وصف|بند/.test(lower)) {
    return { kind: 'line_item', label: 'Line item', confidence: 0.38 };
  }
  return { kind: 'other', label: 'Amount', confidence: 0.28 };
}

function amountTokensFromLine(line: string) {
  const pattern = /(?:[$€£]|KWD|KD|USD|SAR|AED|EUR|GBP|EGP|جنيه(?:ا|ات)?|د\.?\s*ك|دك|ر\.?\s*س|د\.?\s*إ)?\s*\(?-?\d[\d\s,]*(?:[.,]\d{1,3})?\)?/gi;
  return [...line.matchAll(pattern)]
    .map(match => {
      const token = match[0];
      const amount = parseSignedMoney(token);
      const after = line.slice((match.index || 0) + token.length, (match.index || 0) + token.length + 2);
      const isPercent = after.includes('%');
      return amount === undefined ? null : { token, amount, isPercent };
    })
    .filter((token): token is { token: string; amount: number; isPercent: boolean } => Boolean(token));
}

function pushCandidate(candidates: AmountCandidate[], candidate: AmountCandidate) {
  if (!Number.isFinite(candidate.amount) || candidate.amount === 0) return;
  const duplicate = candidates.find(existing =>
    existing.kind === candidate.kind && Math.abs(Math.abs(existing.amount) - Math.abs(candidate.amount)) < 0.01
  );
  if (duplicate) {
    duplicate.confidence = Math.max(duplicate.confidence, candidate.confidence);
    duplicate.currency ||= candidate.currency;
    duplicate.source ||= candidate.source;
    return;
  }
  candidates.push({
    ...candidate,
    amount: Number(candidate.amount.toFixed(3)),
    confidence: Math.max(0, Math.min(1, candidate.confidence)),
  });
}

function candidatesFromStructuredData(data: Record<string, unknown>, rawText: string) {
  const candidates: AmountCandidate[] = [];
  const structured = Array.isArray(data.amountCandidates) ? data.amountCandidates : [];
  for (const item of structured) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const amount = parseSignedMoney(row.amount);
    if (amount === undefined) continue;
    const line = cleanTextValue(row.label) || cleanTextValue(row.source) || 'Amount';
    const classified = classifyAmountLine(line);
    pushCandidate(candidates, {
      label: cleanTextValue(row.label) || classified.label,
      kind: classified.kind,
      amount,
      currency: normalizeCurrency(row.currency, `${line} ${rawText}`),
      confidence: Number(row.confidence) || classified.confidence,
      source: cleanTextValue(row.source) || line,
    });
  }

  const fieldMap: Array<[keyof ReceiptScanResult | 'finalTotal' | 'grandTotal' | 'amountDue' | 'total' | 'amount', AmountCandidate['kind'], string, number]> = [
    ['amountDue', 'amount_due', 'Amount Due', 0.96],
    ['grandTotal', 'grand_total', 'Grand Total', 0.96],
    ['finalTotal', 'grand_total', 'Final Total', 0.95],
    ['totalAmount', 'total', 'Total', 0.92],
    ['total', 'total', 'Total', 0.9],
    ['amount', 'other', 'Amount', 0.55],
    ['subtotal', 'subtotal', 'Subtotal', 0.64],
    ['taxAmount', 'tax', 'Tax', 0.48],
    ['discountAmount', 'discount', 'Discount', 0.5],
  ];
  for (const [key, kind, label, confidence] of fieldMap) {
    const amount = kind === 'discount' ? parseSignedMoney(data[key]) : parseMoney(data[key]);
    if (amount !== undefined) {
      pushCandidate(candidates, {
        label,
        kind,
        amount: kind === 'discount' ? -Math.abs(amount) : amount,
        currency: normalizeCurrency(data.currency, rawText),
        confidence,
        source: label,
      });
    }
  }
  return candidates;
}

function extractAmountCandidates(rawText: string, data: Record<string, unknown>) {
  const normalized = normalizeArabicNumbers(removeTemplatePlaceholders(rawText || ''));
  const lines = normalized
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const candidates = candidatesFromStructuredData(data, normalized);

  lines.forEach((line, index) => {
    if (isTemplatePlaceholder(line)) return;
    const classified = classifyAmountLine(line);
    const tokens = amountTokensFromLine(line).filter(token => !(token.isPercent && !/[€£$]|KWD|KD|USD|SAR|AED|EUR|GBP|EGP|جنيه|د\.?\s*ك|ر\.?\s*س|د\.?\s*إ/i.test(token.token)));
    if (!tokens.length) return;

    const lastNonPercent = [...tokens].reverse().find(token => !token.isPercent);
    const chosen = classified.kind === 'line_item' || classified.kind === 'other'
      ? tokens[tokens.length - 1]
      : lastNonPercent || tokens[tokens.length - 1];
    if (!chosen) return;

    const bottomBoost = lines.length > 1 ? Math.max(0, (index / (lines.length - 1)) * 0.04) : 0;
    const amount = classified.kind === 'discount' ? -Math.abs(chosen.amount) : Math.abs(chosen.amount);
    pushCandidate(candidates, {
      ...classified,
      amount,
      currency: normalizeCurrency(chosen.token, line),
      confidence: classified.confidence + bottomBoost,
      source: line,
    });
  });

  const subtotal = candidates.find(candidate => candidate.kind === 'subtotal')?.amount;
  const tax = candidates.find(candidate => candidate.kind === 'tax')?.amount;
  const discount = candidates.find(candidate => candidate.kind === 'discount')?.amount;
  const lineItem = candidates.find(candidate => candidate.kind === 'line_item')?.amount;

  if (subtotal && tax && !candidates.some(candidate => ['total', 'amount_due', 'grand_total', 'invoice_total'].includes(candidate.kind))) {
    pushCandidate(candidates, {
      label: 'Computed total',
      kind: 'computed',
      amount: Math.abs(subtotal) + Math.abs(tax),
      currency: candidates.find(candidate => candidate.currency)?.currency,
      confidence: 0.76,
      source: 'subtotal + tax',
    });
  } else if (lineItem && tax && discount && !candidates.some(candidate => ['total', 'amount_due', 'grand_total', 'invoice_total'].includes(candidate.kind))) {
    pushCandidate(candidates, {
      label: 'Computed total',
      kind: 'computed',
      amount: Math.abs(lineItem) + discount + Math.abs(tax),
      currency: candidates.find(candidate => candidate.currency)?.currency,
      confidence: 0.72,
      source: 'line item - discount + tax',
    });
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}

function selectBestAmount(candidates: AmountCandidate[]) {
  const preferredKinds = new Set(['amount_due', 'grand_total', 'invoice_total', 'total', 'computed']);
  const preferred = candidates
    .filter(candidate => preferredKinds.has(candidate.kind) && candidate.amount > 0)
    .sort((a, b) => b.confidence - a.confidence);
  if (preferred[0]) return preferred[0];

  const fallback = candidates
    .filter(candidate => !['tax', 'discount'].includes(candidate.kind) && candidate.amount > 0)
    .sort((a, b) => b.confidence - a.confidence || b.amount - a.amount);
  return fallback[0];
}

function parseReceiptNumber(text: string, patterns: RegExp[]) {
  const normalized = normalizeArabicNumbers(removeTemplatePlaceholders(text));
  for (const pattern of patterns) {
    const amount = parseMoney(normalized.match(pattern)?.[1]);
    if (amount) return amount;
  }
  return undefined;
}

function parseInvoiceNumber(text: string) {
  const normalized = normalizeArabicNumbers(removeTemplatePlaceholders(text));
  const lines = normalized.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  for (const line of lines) {
    if (!/(invoice\s*(?:number|no|#)|inv\s*(?:no|#)|رقم\s*الفاتورة)/i.test(line)) continue;
    const match = line.match(/(?:invoice\s*(?:number|no|#)|inv\s*(?:no|#)|رقم\s*الفاتورة)\s*[-#:：]?\s*([A-Z0-9][A-Z0-9-]{1,})/i)?.[1];
    const value = cleanTextValue(match);
    if (value && !/^invoice$/i.test(value)) return value;
  }
  return undefined;
}

function containsArabic(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

function parseDescription(text: string, items: ReceiptItem[] = [], merchantName?: string) {
  const normalized = removeTemplatePlaceholders(text);
  const lines = normalized.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const labor = lines.find(line => /labor|service|consulting|خدمة|عمل/i.test(line));
  if (labor) return /labor/i.test(labor) ? 'Invoice - Labor service' : cleanTextValue(labor);
  const isInvoice = /invoice|فاتورة/i.test(normalized);
  if (merchantName && isInvoice) return containsArabic(merchantName) ? `${merchantName} - فاتورة` : `${merchantName} - Invoice`;
  const itemName = items.find(item => cleanTextValue(item.name))?.name;
  if (itemName && !isTemplatePlaceholder(itemName)) return cleanTextValue(itemName);
  if (isInvoice) return containsArabic(normalized) ? 'فاتورة' : 'Invoice';
  return undefined;
}

function parseMerchantName(text: string, items: ReceiptItem[] = []) {
  const lines = removeTemplatePlaceholders(text)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const merchant = lines.find(line =>
    !isTemplatePlaceholder(line)
    && !/\d/.test(line)
    && !/(invoice|date|payment|total|subtotal|tax|discount|bill\s*to|description|qty|unit\s*price|amount|الإجمالي|المجموع|التاريخ|الدفع|فاتورة|ضريبة|خصم)/i.test(line)
  );
  return cleanTextValue(merchant);
}

function normalizeDate(value: unknown, rawText?: string) {
  if (isTemplatePlaceholder(value)) return undefined;
  if (typeof value === 'string') {
    const normalized = normalizeArabicNumbers(removeTemplatePlaceholders(value).trim());
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
    const match = normalized.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (match) {
      const [, day, month, year] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  if (rawText) {
    const match = normalizeArabicNumbers(removeTemplatePlaceholders(rawText)).match(/(?:invoice\s*date|date|التاريخ)\s*[:：]?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{4})/i);
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
  if (/flower|florist|wedding|event|bouquet|زهور|ورود|باقة|زفاف|استقبال|تزيين/.test(text)) return 'other';
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
        name: cleanTextValue(item?.name) || 'Item',
        quantity: Number(item?.quantity) || undefined,
        unitPrice,
        price: total,
        total,
      };
    })
    .filter(item => item.total >= 0)
    .slice(0, 20);
}

function confidenceLevel(score: number, selected?: AmountCandidate): ReceiptScanResult['confidenceLevel'] {
  if (score >= 0.82 && selected && ['amount_due', 'grand_total', 'invoice_total', 'total'].includes(selected.kind)) return 'high';
  if (score >= 0.58 || selected?.kind === 'computed') return 'medium';
  return 'low';
}

function normalizeResult(value: unknown, fileName: string): ReceiptScanResult {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const rawText = typeof data.rawText === 'string' ? data.rawText : typeof data.text === 'string' ? data.text : '';
  const items = normalizeItems(data.items);
  const candidates = extractAmountCandidates(rawText || JSON.stringify(data), data);
  const selected = selectBestAmount(candidates);
  const taxCandidate = candidates.find(candidate => candidate.kind === 'tax');
  const discountCandidate = candidates.find(candidate => candidate.kind === 'discount');
  const subtotalCandidate = candidates.find(candidate => candidate.kind === 'subtotal');
  const confidenceScore = Number(data.confidenceScore ?? data.confidence);
  const score = Number.isFinite(confidenceScore)
    ? Math.max(0, Math.min(1, confidenceScore))
    : selected?.confidence ?? 0.36;
  const currency = normalizeCurrency(data.currency, `${selected?.source || ''} ${rawText}`) || selected?.currency;
  const receiptDate = normalizeDate(data.receiptDate ?? data.date, rawText);
  const warnings: string[] = Array.isArray(data.warnings) ? data.warnings.filter((item): item is string => typeof item === 'string') : [];
  if (!receiptDate) warnings.push('No clear invoice date found.');
  if (!currency) warnings.push('Currency was not detected from the receipt.');

  const merchant = cleanTextValue(data.merchantName)
    || cleanTextValue(data.merchant)
    || cleanTextValue(data.storeName)
    || cleanTextValue(data.vendor)
    || (rawText ? parseMerchantName(rawText, items) : undefined);
  const description = cleanTextValue(data.description)
    || cleanTextValue(data.expenseDescription)
    || (rawText ? parseDescription(rawText, items, merchant) : undefined)
    || merchant;

  const result: ReceiptScanResult = {
    merchantName: merchant,
    description,
    invoiceNumber: cleanTextValue(data.invoiceNumber) || (rawText ? parseInvoiceNumber(rawText) : undefined),
    totalAmount: selected?.amount && selected.amount > 0 ? Number(selected.amount.toFixed(3)) : undefined,
    subtotal: parseMoney(data.subtotal) ?? (subtotalCandidate ? Math.abs(subtotalCandidate.amount) : undefined) ?? (rawText ? parseReceiptNumber(rawText, [/(?:subtotal|sub\s*total|المجموع\s*الفرعي|الإجمالي\s*الفرعي|قبل\s*الضريبة)\s*[:：]?\s*([\d.,]+)/i]) : undefined),
    currency,
    taxAmount: parseMoney(data.taxAmount) ?? (taxCandidate ? Math.abs(taxCandidate.amount) : undefined),
    discountAmount: parseSignedMoney(data.discountAmount) ?? (discountCandidate ? discountCandidate.amount : undefined),
    paidAmount: parseMoney(data.paidAmount),
    changeAmount: parseMoney(data.changeAmount),
    receiptDate,
    date: receiptDate,
    category: normalizeCategory(data.category, rawText),
    paymentMethod: normalizePayment(data.paymentMethod, rawText),
    items,
    amountCandidates: candidates.slice(0, 10),
    selectedAmountLabel: selected?.label,
    confidenceLevel: confidenceLevel(score, selected),
    warnings,
    rawText: rawText || undefined,
    confidenceScore: selected ? Math.max(score, selected.confidence) : score,
    confidence: selected ? Math.max(score, selected.confidence) : score,
  };

  if (process.env.NODE_ENV !== 'production') {
    console.info('Receipt scan debug', {
      fileName,
      rawTextLength: rawText.length,
      candidateCount: result.amountCandidates?.length || 0,
      selectedAmount: result.totalAmount,
      selectedAmountLabel: result.selectedAmountLabel,
      confidenceLevel: result.confidenceLevel,
    });
  }

  return result;
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
              'Extract receipt or invoice data as strict JSON only.',
              'Invoice parsing rule: the expense amount must be the final payable amount.',
              'Priority: Grand Total, Total, Amount Due, Balance Due, Invoice Total, المجموع الكلي, الإجمالي, المبلغ الإجمالي, المطلوب دفعه; then bottom-most Total; then Subtotal + Tax minus/including Discount if no final total exists.',
              'Do not use line item amount, unit price, subtotal, tax, or discount as final total when a final total is visible.',
              'Return amountCandidates with labels for Total, Subtotal, line item amount, Tax, Discount, and computed total when visible.',
              'Detect currency symbols: $=USD, USD=USD, جنيه/EGP=EGP, KD/KWD/د.ك=KWD, SAR/ر.س=SAR, AED/د.إ=AED, €=EUR, £=GBP.',
              'Ignore template placeholders wrapped in {{...}}. Never return {{date}}, {{InvoiceNum}}, {{CompanyName}}, or {{BillToName}} as real values.',
              'If the date is a placeholder or unclear, use null for receiptDate.',
              'Set description to a concise real expense description. For Arabic invoices with a merchant, use "merchant - فاتورة"; for labor invoices, use "Invoice - Labor service".',
              'For the sample pattern "Labor: 12 hours at $105/hr" with subtotal, discount, tax, and total, choose the final Total amount.',
              'Use this schema: {"merchantName":"string|null","description":"string|null","invoiceNumber":"string|null","subtotal":number|null,"totalAmount":number|null,"currency":"string|null","taxAmount":number|null,"discountAmount":number|null,"paidAmount":number|null,"changeAmount":number|null,"receiptDate":"YYYY-MM-DD|null","category":"restaurants|shopping|bills|transport|health|education|rent|loans|subscriptions|other","paymentMethod":"cash|knet|card|transfer|apple_pay|other","items":[{"name":"string","quantity":number|null,"unitPrice":number|null,"total":number}],"amountCandidates":[{"label":"string","amount":number,"currency":"string|null","confidence":number,"source":"string"}],"confidenceScore":number,"confidenceLevel":"high|medium|low","warnings":["string"],"rawText":"string"}.',
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
              merchantName: { type: ['string', 'null'] },
              description: { type: ['string', 'null'] },
              invoiceNumber: { type: ['string', 'null'] },
              subtotal: { type: ['number', 'null'] },
              totalAmount: { type: ['number', 'null'] },
              currency: { type: ['string', 'null'] },
              taxAmount: { type: ['number', 'null'] },
              discountAmount: { type: ['number', 'null'] },
              paidAmount: { type: ['number', 'null'] },
              changeAmount: { type: ['number', 'null'] },
              receiptDate: { type: ['string', 'null'] },
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
              amountCandidates: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    label: { type: 'string' },
                    amount: { type: 'number' },
                    currency: { type: ['string', 'null'] },
                    confidence: { type: 'number' },
                    source: { type: 'string' },
                  },
                  required: ['label', 'amount', 'currency', 'confidence', 'source'],
                },
              },
              confidenceScore: { type: 'number' },
              confidenceLevel: { type: 'string' },
              warnings: { type: 'array', items: { type: 'string' } },
              rawText: { type: 'string' },
            },
            required: ['merchantName', 'description', 'invoiceNumber', 'subtotal', 'totalAmount', 'currency', 'taxAmount', 'discountAmount', 'paidAmount', 'changeAmount', 'receiptDate', 'category', 'paymentMethod', 'items', 'amountCandidates', 'confidenceScore', 'confidenceLevel', 'warnings', 'rawText'],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OpenAI receipt scan failed (${response.status})${body ? `: ${body.slice(0, 240)}` : ''}`);
  }
  const payload = await response.json() as Record<string, unknown>;
  const text = readOutputText(payload);
  if (!text) throw new Error('OpenAI receipt scan returned no output text');
  return normalizeResult(JSON.parse(text), file.name);
}

function buildDebug(file: File, stage: ScanDebug['stage'], patch: Partial<ScanDebug> = {}): ScanDebug {
  return {
    stage,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    providerConfigured: Boolean(process.env.OPENAI_API_KEY),
    ...patch,
  };
}

function dataDebug(file: File, data: ReceiptScanResult, stage: ScanDebug['stage'] = 'parser', patch: Partial<ScanDebug> = {}): ScanDebug {
  return buildDebug(file, stage, {
    rawTextLength: data.rawText?.length || 0,
    candidateCount: data.amountCandidates?.length || 0,
    selectedAmount: data.totalAmount,
    confidence: data.confidenceLevel,
    ...patch,
  });
}

function publicFields(data?: ReceiptScanResult) {
  if (!data) return undefined;
  return {
    amount: data.totalAmount,
    currency: data.currency,
    date: data.receiptDate || data.date,
    description: data.description || data.merchantName,
    category: data.category,
    tax: data.taxAmount,
    subtotal: data.subtotal,
    discount: data.discountAmount,
    invoiceNumber: data.invoiceNumber,
  };
}

function publicCandidates(data?: ReceiptScanResult) {
  return { amounts: data?.amountCandidates ?? [] };
}

async function scanFile(file: File, receiptText?: string): Promise<ScanFileResult> {
  if (!SUPPORTED_TYPES.has(file.type)) {
    return { fileName: file.name, success: false, error: 'Unsupported file type', debug: buildDebug(file, 'upload', { errorSource: 'unsupported_file_type' }) };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { fileName: file.name, success: false, error: 'File size is too large', debug: buildDebug(file, 'upload', { errorSource: 'file_too_large' }) };
  }

  if (receiptText?.trim()) {
    const parsed = normalizeResult({ rawText: receiptText }, file.name);
    return {
      fileName: file.name,
      success: Boolean(parsed.totalAmount),
      data: parsed,
      error: parsed.totalAmount ? undefined : 'Could not identify a final total. Please review the candidates or enter it manually.',
      debug: dataDebug(file, parsed, 'parser', parsed.totalAmount ? {} : { errorSource: 'parser_no_final_total' }),
    };
  }

  if (file.type === 'application/pdf') {
    return {
      fileName: file.name,
      success: false,
      data: undefined,
      error: 'PDF receipt OCR is not configured yet. You can still enter the expense manually and save the attachment.',
      debug: buildDebug(file, 'provider', { errorSource: 'pdf_ocr_not_configured' }),
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      fileName: file.name,
      success: false,
      data: undefined,
      error: 'Receipt AI provider is not configured. You can still enter the expense manually and save the attachment.',
      debug: buildDebug(file, 'provider', { errorSource: 'missing_OPENAI_API_KEY' }),
    };
  }

  const bytes = await file.arrayBuffer();

  const aiResult = await analyzeWithOpenAI(file, bytes).catch(error => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Receipt AI scan failed:', { fileName: file.name, error });
    }
    return { error };
  });
  if (!aiResult || 'error' in aiResult) {
    const message = aiResult && 'error' in aiResult && aiResult.error instanceof Error ? aiResult.error.message : 'AI provider returned no result';
    return {
      fileName: file.name,
      success: false,
      data: undefined,
      error: 'Could not read the receipt clearly. You can still enter the expense manually and save the attachment.',
      debug: buildDebug(file, 'ai', {
        errorSource: 'ai_provider_failed',
        message: process.env.NODE_ENV !== 'production' ? message : undefined,
      }),
    };
  }
  if (!aiResult.totalAmount) {
    return {
      fileName: file.name,
      success: false,
      data: aiResult,
      error: 'Could not identify a final total. Please review the candidates or enter it manually.',
      debug: dataDebug(file, aiResult, 'parser', { errorSource: 'parser_no_final_total' }),
    };
  }
  return { fileName: file.name, success: true, data: aiResult, debug: dataDebug(file, aiResult, 'parser') };
}

export async function POST(request: NextRequest) {
  try {
    const user = await requestUser(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const formData = await request.formData();
    const files = [...formData.getAll('receipt'), ...formData.getAll('receipts')].filter((file): file is File => file instanceof File);
    if (!files.length) return errorResponse('No receipt file uploaded');
    if (files.length > MAX_RECEIPTS) return errorResponse('You can upload up to 10 receipts at once', 413);
    const receiptText = formData.get('receiptText');
    const hasReceiptText = typeof receiptText === 'string' && receiptText.trim().length > 0;
    const openAiUnits = process.env.OPENAI_API_KEY && !hasReceiptText
      ? files.filter(file => SUPPORTED_TYPES.has(file.type) && file.type !== 'application/pdf' && file.size <= MAX_FILE_SIZE).length
      : 0;

    if (openAiUnits > 0) {
      const usage = await consumeAiUsage({
        userId: user.id,
        feature: 'receipt_scan',
        units: openAiUnits,
        metadata: {
          route: '/api/ai/receipt-scan',
          fileCount: files.length,
          openAiUnits,
          legacy: true,
        },
      });
      if (!usage.allowed) return aiUsageLimitResponse(usage);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.info('Receipt scan request started', {
        providerConfigured: Boolean(process.env.OPENAI_API_KEY),
        files: files.map(file => ({ name: file.name, type: file.type, size: file.size })),
      });
    }
    const results = await Promise.all(files.map(file => scanFile(file, typeof receiptText === 'string' ? receiptText : undefined)));
    if (files.length === 1) {
      const [result] = results;
      return NextResponse.json({
        success: result.success,
        data: result.data,
        fields: publicFields(result.data),
        candidates: publicCandidates(result.data),
        error: result.error,
        debug: result.debug,
        results,
      });
    }
    return NextResponse.json({ success: results.some(result => result.success), results });
  } catch (error) {
    console.error('Receipt scan route failed:', error);
    return errorResponse('We could not read the receipt clearly', 500);
  }
}
