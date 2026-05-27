import { createSign } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_RECEIPTS = 10;
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const GOOGLE_TOKEN_AUDIENCE = 'https://oauth2.googleapis.com/token';

type ScanProvider = 'google-document-ai' | 'openai-vision' | 'manual';
type ConfidenceLevel = 'high' | 'medium' | 'low';
type ScanErrorCode =
  | 'provider_unavailable'
  | 'all_providers_unavailable'
  | 'upload_failed'
  | 'file_too_large'
  | 'unsupported_file_type'
  | 'no_clear_total'
  | 'scan_failed';

type LineItem = {
  description?: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
};

type AmountCandidate = {
  label: string;
  kind?: 'amount_due' | 'grand_total' | 'invoice_total' | 'total' | 'subtotal' | 'tax' | 'discount' | 'line_item' | 'computed' | 'other';
  value: number;
  amount: number;
  currency?: string;
  confidence: number;
  source?: string;
};

type ScanFields = {
  merchantName?: string;
  invoiceNumber?: string;
  date?: string;
  subtotal?: number;
  tax?: number;
  discount?: number;
  total?: number;
  currency?: string;
  description?: string;
  category?: string;
  paymentMethod?: string;
  lineItems?: LineItem[];
};

type ScanData = {
  merchantName?: string;
  description?: string;
  invoiceNumber?: string;
  totalAmount?: number;
  subtotal?: number;
  currency?: string;
  taxAmount?: number;
  discountAmount?: number;
  receiptDate?: string;
  date?: string;
  category?: string;
  paymentMethod?: string;
  items?: Array<{ name: string; quantity?: number; unitPrice?: number; total?: number; price?: number }>;
  amountCandidates?: AmountCandidate[];
  selectedAmountLabel?: string;
  confidenceLevel?: ConfidenceLevel;
  warnings?: string[];
  rawText?: string;
  confidenceScore?: number;
  confidence?: number;
  provider?: ScanProvider;
};

type ProviderExtraction = {
  provider: ScanProvider;
  rawText: string;
  data: Record<string, unknown>;
  providerConfidence: number;
  warnings: string[];
  rawProvider?: string;
};

type ScanDebug = {
  stage: 'upload' | 'provider' | 'google' | 'openai' | 'parser' | 'ui';
  fileName: string;
  fileType: string;
  fileSize: number;
  googleConfigured: boolean;
  openaiConfigured: boolean;
  provider?: ScanProvider;
  rawTextLength?: number;
  candidateCount?: number;
  selectedAmount?: number;
  confidence?: ConfidenceLevel;
  errorSource?: string;
  message?: string;
};

type ScanFileResult = {
  fileName: string;
  success: boolean;
  provider: ScanProvider;
  confidence: ConfidenceLevel;
  code?: ScanErrorCode;
  fields: ScanFields;
  candidates: { amounts: AmountCandidate[] };
  warnings: string[];
  rawProvider?: string;
  data?: ScanData;
  error?: string;
  debug: ScanDebug;
};

type GoogleServiceAccount = {
  client_email?: string;
  private_key?: string;
  token_uri?: string;
};

type GoogleDocumentEntity = {
  type?: string;
  mentionText?: string;
  confidence?: number;
  normalizedValue?: {
    text?: string;
    moneyValue?: {
      currencyCode?: string;
      units?: string | number;
      nanos?: number;
    };
    dateValue?: {
      year?: number;
      month?: number;
      day?: number;
    };
  };
  properties?: GoogleDocumentEntity[];
};

let cachedGoogleToken: { token: string; expiresAt: number } | null = null;

function errorResponse(error: string, status = 400, debug?: Partial<ScanDebug>, code: ScanErrorCode = 'scan_failed', provider: ScanProvider = 'manual') {
  return NextResponse.json({
    success: false,
    provider,
    confidence: 'low',
    code,
    fields: {},
    candidates: { amounts: [] },
    warnings: [error],
    error,
    debug,
  }, { status });
}

function googleConfigured() {
  return Boolean(
    process.env.GOOGLE_CLOUD_PROJECT_ID
    && process.env.GOOGLE_DOCUMENT_AI_LOCATION
    && process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID
    && process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
  );
}

function openaiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function buildDebug(file: File, stage: ScanDebug['stage'], patch: Partial<ScanDebug> = {}): ScanDebug {
  return {
    stage,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    googleConfigured: googleConfigured(),
    openaiConfigured: openaiConfigured(),
    ...patch,
  };
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

function containsArabic(value: string) {
  return /[\u0600-\u06FF]/.test(value);
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

function pushCandidate(candidates: AmountCandidate[], candidate: Omit<AmountCandidate, 'value'>) {
  if (!Number.isFinite(candidate.amount) || candidate.amount === 0) return;
  const duplicate = candidates.find(existing =>
    existing.kind === candidate.kind && Math.abs(Math.abs(existing.value) - Math.abs(candidate.amount)) < 0.01
  );
  if (duplicate) {
    duplicate.confidence = Math.max(duplicate.confidence, candidate.confidence);
    duplicate.currency ||= candidate.currency;
    duplicate.source ||= candidate.source;
    return;
  }
  const amount = Number(candidate.amount.toFixed(3));
  candidates.push({
    ...candidate,
    value: amount,
    amount,
    confidence: Math.max(0, Math.min(1, candidate.confidence)),
  });
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

function candidatesFromStructuredData(data: Record<string, unknown>, rawText: string) {
  const candidates: AmountCandidate[] = [];
  const structured = Array.isArray(data.amountCandidates) ? data.amountCandidates : [];
  for (const item of structured) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const amount = parseSignedMoney(row.amount ?? row.value);
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

  const fieldMap: Array<[string, AmountCandidate['kind'], string, number]> = [
    ['amountDue', 'amount_due', 'Amount Due', 0.96],
    ['grandTotal', 'grand_total', 'Grand Total', 0.96],
    ['finalTotal', 'grand_total', 'Final Total', 0.95],
    ['totalAmount', 'total', 'Total', 0.92],
    ['total', 'total', 'Total', 0.9],
    ['subtotal', 'subtotal', 'Subtotal', 0.64],
    ['taxAmount', 'tax', 'Tax', 0.48],
    ['tax', 'tax', 'Tax', 0.48],
    ['discountAmount', 'discount', 'Discount', 0.5],
    ['discount', 'discount', 'Discount', 0.5],
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

  const subtotal = candidates.find(candidate => candidate.kind === 'subtotal')?.value;
  const tax = candidates.find(candidate => candidate.kind === 'tax')?.value;
  const discount = candidates.find(candidate => candidate.kind === 'discount')?.value;
  const lineItem = candidates.find(candidate => candidate.kind === 'line_item')?.value;

  if (subtotal && tax && !candidates.some(candidate => ['total', 'amount_due', 'grand_total', 'invoice_total'].includes(candidate.kind || ''))) {
    pushCandidate(candidates, {
      label: 'Computed total',
      kind: 'computed',
      amount: Math.abs(subtotal) + Math.abs(tax),
      currency: candidates.find(candidate => candidate.currency)?.currency,
      confidence: 0.76,
      source: 'subtotal + tax',
    });
  } else if (lineItem && tax && discount && !candidates.some(candidate => ['total', 'amount_due', 'grand_total', 'invoice_total'].includes(candidate.kind || ''))) {
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
    .filter(candidate => preferredKinds.has(candidate.kind || '') && candidate.value > 0)
    .sort((a, b) => b.confidence - a.confidence);
  if (preferred[0]) return preferred[0];

  const fallback = candidates
    .filter(candidate => !['tax', 'discount'].includes(candidate.kind || '') && candidate.value > 0)
    .sort((a, b) => b.confidence - a.confidence || b.value - a.value);
  return fallback[0];
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

function parseDescription(text: string, items: LineItem[] = [], merchantName?: string) {
  const normalized = removeTemplatePlaceholders(text);
  const lines = normalized.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const labor = lines.find(line => /labor|service|consulting|خدمة|عمل/i.test(line));
  if (labor) return /labor/i.test(labor) ? 'Invoice - Labor service' : cleanTextValue(labor);
  const isInvoice = /invoice|فاتورة/i.test(normalized);
  if (merchantName && isInvoice) return containsArabic(merchantName) ? `${merchantName} - فاتورة` : `${merchantName} - Invoice`;
  const itemName = items.find(item => cleanTextValue(item.description))?.description;
  if (itemName && !isTemplatePlaceholder(itemName)) return cleanTextValue(itemName);
  if (isInvoice) return containsArabic(normalized) ? 'فاتورة' : 'Invoice';
  return undefined;
}

function parseMerchantName(text: string) {
  const merchant = removeTemplatePlaceholders(text)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .find(line =>
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

function confidenceLevel(score: number, selected?: AmountCandidate): ConfidenceLevel {
  if (score >= 0.82 && selected && ['amount_due', 'grand_total', 'invoice_total', 'total'].includes(selected.kind || '')) return 'high';
  if (score >= 0.58 || selected?.kind === 'computed') return 'medium';
  return 'low';
}

function toLineItems(value: unknown): LineItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => item && typeof item === 'object' ? item as Record<string, unknown> : null)
    .filter(Boolean)
    .map(item => ({
      description: cleanTextValue(item?.description) || cleanTextValue(item?.name),
      quantity: Number(item?.quantity) || undefined,
      unitPrice: parseMoney(item?.unitPrice),
      amount: parseMoney(item?.amount) ?? parseMoney(item?.total) ?? parseMoney(item?.price),
    }))
    .filter(item => item.description || item.amount)
    .slice(0, 30);
}

function normalizeExtraction(extraction: ProviderExtraction, fileName: string): ScanFileResult {
  const rawText = extraction.rawText || String(extraction.data.rawText || '');
  const lineItems = toLineItems(extraction.data.lineItems ?? extraction.data.items);
  const candidates = extractAmountCandidates(rawText || JSON.stringify(extraction.data), extraction.data);
  const selected = selectBestAmount(candidates);
  const taxCandidate = candidates.find(candidate => candidate.kind === 'tax');
  const discountCandidate = candidates.find(candidate => candidate.kind === 'discount');
  const subtotalCandidate = candidates.find(candidate => candidate.kind === 'subtotal');
  const providerScore = Number(extraction.providerConfidence);
  const score = Number.isFinite(providerScore)
    ? Math.max(0, Math.min(1, providerScore))
    : selected?.confidence ?? 0.36;
  const currency = normalizeCurrency(extraction.data.currency, `${selected?.source || ''} ${rawText}`) || selected?.currency;
  const date = normalizeDate(extraction.data.date ?? extraction.data.receiptDate, rawText);
  const warnings = [...extraction.warnings];
  if (!date) warnings.push('No clear invoice date found.');
  if (!currency) warnings.push('Currency was not detected from the receipt.');

  const merchantName = cleanTextValue(extraction.data.merchantName)
    || cleanTextValue(extraction.data.merchant)
    || cleanTextValue(extraction.data.supplierName)
    || (rawText ? parseMerchantName(rawText) : undefined);
  const description = cleanTextValue(extraction.data.description)
    || (rawText ? parseDescription(rawText, lineItems, merchantName) : undefined)
    || merchantName;
  const total = selected?.value && selected.value > 0 ? Number(selected.value.toFixed(3)) : undefined;
  const confidence = confidenceLevel(Math.max(score, selected?.confidence ?? 0), selected);
  const fields: ScanFields = {
    merchantName,
    invoiceNumber: cleanTextValue(extraction.data.invoiceNumber) || (rawText ? parseInvoiceNumber(rawText) : undefined),
    date,
    subtotal: parseMoney(extraction.data.subtotal) ?? (subtotalCandidate ? Math.abs(subtotalCandidate.value) : undefined),
    tax: parseMoney(extraction.data.tax) ?? parseMoney(extraction.data.taxAmount) ?? (taxCandidate ? Math.abs(taxCandidate.value) : undefined),
    discount: parseSignedMoney(extraction.data.discount) ?? parseSignedMoney(extraction.data.discountAmount) ?? (discountCandidate ? discountCandidate.value : undefined),
    total,
    currency,
    description,
    category: normalizeCategory(extraction.data.category, rawText),
    paymentMethod: normalizePayment(extraction.data.paymentMethod, rawText),
    lineItems,
  };
  const data: ScanData = {
    merchantName: fields.merchantName,
    description: fields.description,
    invoiceNumber: fields.invoiceNumber,
    totalAmount: fields.total,
    subtotal: fields.subtotal,
    currency: fields.currency,
    taxAmount: fields.tax,
    discountAmount: fields.discount,
    receiptDate: fields.date,
    date: fields.date,
    category: fields.category,
    paymentMethod: fields.paymentMethod,
    items: lineItems.map(item => ({
      name: item.description || 'Item',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.amount,
      price: item.amount,
    })),
    amountCandidates: candidates.slice(0, 10),
    selectedAmountLabel: selected?.label,
    confidenceLevel: confidence,
    warnings,
    rawText: rawText || undefined,
    confidenceScore: selected ? Math.max(score, selected.confidence) : score,
    confidence: selected ? Math.max(score, selected.confidence) : score,
    provider: extraction.provider,
  };

  return {
    fileName,
    success: Boolean(fields.total),
    provider: extraction.provider,
    confidence,
    fields,
    candidates: { amounts: data.amountCandidates || [] },
    warnings,
    rawProvider: extraction.rawProvider,
    data,
    error: fields.total ? undefined : 'Could not identify a final total. Please review the candidates or enter it manually.',
    debug: {
      stage: 'parser',
      fileName,
      fileType: '',
      fileSize: 0,
      googleConfigured: googleConfigured(),
      openaiConfigured: openaiConfigured(),
      provider: extraction.provider,
      rawTextLength: rawText.length,
      candidateCount: candidates.length,
      selectedAmount: fields.total,
      confidence,
      errorSource: fields.total ? undefined : 'parser_no_final_total',
    },
  };
}

function getGoogleConfig() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = process.env.GOOGLE_DOCUMENT_AI_LOCATION;
  const processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID;
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!projectId || !location || !processorId || !credentialsJson) return null;
  return { projectId, location, processorId, credentialsJson };
}

async function getGoogleAccessToken(credentialsJson: string) {
  if (cachedGoogleToken && cachedGoogleToken.expiresAt > Date.now() + 60_000) {
    return cachedGoogleToken.token;
  }

  let credentials: GoogleServiceAccount;
  try {
    credentials = JSON.parse(credentialsJson) as GoogleServiceAccount;
  } catch {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON is not valid JSON');
  }
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('Google service account credentials are missing client_email or private_key');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: credentials.client_email,
    scope: GOOGLE_SCOPE,
    aud: GOOGLE_TOKEN_AUDIENCE,
    exp: now + 3600,
    iat: now,
  })).toString('base64url');
  const unsigned = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(credentials.private_key.replace(/\\n/g, '\n')).toString('base64url');
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch(credentials.token_uri || GOOGLE_TOKEN_AUDIENCE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!response.ok) {
    throw new Error(`Google OAuth token request failed (${response.status})`);
  }
  const token = await response.json() as { access_token?: string; expires_in?: number };
  if (!token.access_token) throw new Error('Google OAuth token response did not include access_token');
  cachedGoogleToken = {
    token: token.access_token,
    expiresAt: Date.now() + Math.max(60, token.expires_in || 3600) * 1000,
  };
  return token.access_token;
}

function entityText(entity?: GoogleDocumentEntity) {
  return cleanTextValue(entity?.normalizedValue?.text)
    || cleanTextValue(entity?.mentionText);
}

function entityMoney(entity?: GoogleDocumentEntity) {
  const money = entity?.normalizedValue?.moneyValue;
  if (money) {
    const units = Number(money.units || 0);
    const nanos = Number(money.nanos || 0);
    const sign = units < 0 || nanos < 0 ? -1 : 1;
    const amount = Math.abs(units) + Math.abs(nanos) / 1_000_000_000;
    if (Number.isFinite(amount) && amount !== 0) {
      return {
        amount: Number((amount * sign).toFixed(3)),
        currency: normalizeCurrency(money.currencyCode),
      };
    }
  }
  const text = `${entityText(entity) || ''} ${entity?.mentionText || ''}`;
  const amount = parseSignedMoney(text);
  return amount === undefined ? undefined : { amount, currency: normalizeCurrency(undefined, text) };
}

function entityDate(entity?: GoogleDocumentEntity) {
  const date = entity?.normalizedValue?.dateValue;
  if (date?.year && date?.month && date?.day) {
    return `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
  }
  return normalizeDate(entityText(entity) || entity?.mentionText);
}

function findEntity(entities: GoogleDocumentEntity[], pattern: RegExp) {
  return entities
    .filter(entity => pattern.test(String(entity.type || '').toLowerCase()))
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
}

function googleEntityData(document: { text?: string; entities?: GoogleDocumentEntity[] }) {
  const entities = document.entities || [];
  const supplier = findEntity(entities, /supplier.*name|vendor.*name|merchant.*name|store.*name/);
  const invoiceId = findEntity(entities, /invoice.*id|invoice.*number|invoice_id/);
  const invoiceDate = findEntity(entities, /invoice.*date|due_date|date/);
  const total = findEntity(entities, /total.*amount|invoice.*total|amount_due|balance_due|grand_total|total/);
  const subtotal = findEntity(entities, /subtotal|net_amount|total_net_amount/);
  const tax = findEntity(entities, /tax|vat/);
  const discount = findEntity(entities, /discount|coupon/);
  const totalMoney = entityMoney(total);
  const subtotalMoney = entityMoney(subtotal);
  const taxMoney = entityMoney(tax);
  const discountMoney = entityMoney(discount);
  const lineItems: LineItem[] = entities
    .filter(entity => /line.*item|line_item|item/.test(String(entity.type || '').toLowerCase()) && Array.isArray(entity.properties))
    .map(entity => {
      const props = entity.properties || [];
      const description = entityText(findEntity(props, /description|item.*name|name/));
      const quantity = Number(entityText(findEntity(props, /quantity|qty/))) || undefined;
      const unit = entityMoney(findEntity(props, /unit.*price|price/));
      const amount = entityMoney(findEntity(props, /amount|total/));
      return {
        description,
        quantity,
        unitPrice: unit?.amount,
        amount: amount?.amount,
      };
    })
    .filter(item => item.description || item.amount);

  const amountCandidates: AmountCandidate[] = [];
  for (const [label, kind, entity] of [
    ['Total', 'total', total],
    ['Subtotal', 'subtotal', subtotal],
    ['Tax', 'tax', tax],
    ['Discount', 'discount', discount],
  ] as const) {
    const money = entityMoney(entity);
    if (money?.amount) {
      pushCandidate(amountCandidates, {
        label,
        kind,
        amount: kind === 'discount' ? -Math.abs(money.amount) : money.amount,
        currency: money.currency,
        confidence: entity?.confidence || 0.7,
        source: entity?.type || label,
      });
    }
  }

  const rawText = document.text || '';
  return {
    rawText,
    data: {
      merchantName: entityText(supplier),
      invoiceNumber: entityText(invoiceId),
      date: entityDate(invoiceDate),
      subtotal: subtotalMoney?.amount,
      taxAmount: taxMoney?.amount,
      discountAmount: discountMoney?.amount,
      totalAmount: totalMoney?.amount,
      currency: totalMoney?.currency || subtotalMoney?.currency || taxMoney?.currency || normalizeCurrency(undefined, rawText),
      lineItems,
      amountCandidates,
      rawText,
    },
    confidence: Math.max(
      supplier?.confidence || 0,
      invoiceId?.confidence || 0,
      invoiceDate?.confidence || 0,
      total?.confidence || 0,
      0.45,
    ),
  };
}

async function scanWithGoogleDocumentAI(file: File, bytes: ArrayBuffer): Promise<ProviderExtraction> {
  const config = getGoogleConfig();
  if (!config) {
    throw new Error('google_document_ai_not_configured');
  }
  const token = await getGoogleAccessToken(config.credentialsJson);
  const endpoint = `https://${config.location}-documentai.googleapis.com/v1/projects/${config.projectId}/locations/${config.location}/processors/${config.processorId}:process`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rawDocument: {
        content: Buffer.from(bytes).toString('base64'),
        mimeType: file.type,
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`google_document_ai_failed_${response.status}`);
  }
  const payload = await response.json() as { document?: { text?: string; entities?: GoogleDocumentEntity[] } };
  const normalized = googleEntityData(payload.document || {});
  return {
    provider: 'google-document-ai',
    rawText: normalized.rawText,
    data: normalized.data,
    providerConfidence: normalized.confidence,
    warnings: [],
    rawProvider: 'google-document-ai',
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

async function scanWithOpenAIVision(file: File, bytes: ArrayBuffer): Promise<ProviderExtraction> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('openai_vision_not_configured');
  if (file.type === 'application/pdf') throw new Error('openai_pdf_not_supported');

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
              'You are reading a receipt or invoice image. Extract only real visible values as strict JSON.',
              'Ignore template placeholders like {{CompanyName}}, {{date}}, {{InvoiceNum}}, {{BillToName}}, and {{ContactEmail}}.',
              'The expense amount must be the final payable amount. Prefer Grand Total, Total, Amount Due, Balance Due, Invoice Total, المجموع الكلي, الإجمالي, المبلغ الإجمالي, المطلوب دفعه.',
              'Do not choose subtotal, tax, discount, unit price, or line-item amount as final total when a final total exists.',
              'Detect currencies: جنيه/EGP=EGP, $/USD=USD, د.ك/KD/KWD=KWD, ر.س/SAR=SAR, د.إ/AED=AED, €/EUR=EUR, £/GBP=GBP.',
              'Return amountCandidates for total, subtotal, tax, discount, and line item values when visible.',
              'For Arabic invoices with a merchant, description should be "merchant - فاتورة". For labor invoices, use "Invoice - Labor service".',
            ].join(' '),
          },
          {
            type: 'input_image',
            image_url: `data:${file.type};base64,${Buffer.from(bytes).toString('base64')}`,
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
              date: { type: ['string', 'null'] },
              subtotal: { type: ['number', 'null'] },
              taxAmount: { type: ['number', 'null'] },
              discountAmount: { type: ['number', 'null'] },
              totalAmount: { type: ['number', 'null'] },
              currency: { type: ['string', 'null'] },
              category: { type: 'string' },
              paymentMethod: { type: 'string' },
              lineItems: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    description: { type: ['string', 'null'] },
                    quantity: { type: ['number', 'null'] },
                    unitPrice: { type: ['number', 'null'] },
                    amount: { type: ['number', 'null'] },
                  },
                  required: ['description', 'quantity', 'unitPrice', 'amount'],
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
              rawText: { type: 'string' },
              warnings: { type: 'array', items: { type: 'string' } },
            },
            required: ['merchantName', 'description', 'invoiceNumber', 'date', 'subtotal', 'taxAmount', 'discountAmount', 'totalAmount', 'currency', 'category', 'paymentMethod', 'lineItems', 'amountCandidates', 'confidenceScore', 'rawText', 'warnings'],
          },
        },
      },
    }),
  });
  if (!response.ok) throw new Error(`openai_vision_failed_${response.status}`);
  const payload = await response.json() as Record<string, unknown>;
  const text = readOutputText(payload);
  if (!text) throw new Error('openai_vision_empty_response');
  const parsed = JSON.parse(text) as Record<string, unknown>;
  return {
    provider: 'openai-vision',
    rawText: typeof parsed.rawText === 'string' ? parsed.rawText : '',
    data: parsed,
    providerConfidence: Number(parsed.confidenceScore) || 0.72,
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings.filter((item): item is string => typeof item === 'string') : [],
    rawProvider: 'openai-vision',
  };
}

function shouldFallbackToOpenAI(result: ScanFileResult | null) {
  return !result
    || !result.fields.total
    || !result.fields.currency
    || result.confidence === 'low';
}

function withFileDebug(result: ScanFileResult, file: File, patch: Partial<ScanDebug> = {}) {
  return {
    ...result,
    debug: {
      ...result.debug,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      ...patch,
    },
  };
}

function scanErrorCode(errorSource: string): ScanErrorCode {
  if (errorSource === 'missing_google_and_openai') return 'all_providers_unavailable';
  if (/unsupported_file_type/.test(errorSource)) return 'unsupported_file_type';
  if (/file_too_large/.test(errorSource)) return 'file_too_large';
  if (/no_clear_total|parser_no_final_total/.test(errorSource)) return 'no_clear_total';
  if (/provider|google_missing|providers_failed|not_configured|unavailable/.test(errorSource)) return 'provider_unavailable';
  return 'scan_failed';
}

function scanErrorMessage(code: ScanErrorCode, fallback: string) {
  if (code === 'all_providers_unavailable') return 'No receipt scanning provider is configured';
  if (code === 'provider_unavailable') return 'Google Document AI is not configured';
  if (code === 'unsupported_file_type') return 'Unsupported file type';
  if (code === 'file_too_large') return 'File size is too large';
  if (code === 'no_clear_total') return 'No clear total was found';
  return fallback;
}

function providerFailureResult(file: File, warnings: string[], errorSource: string): ScanFileResult {
  const code = scanErrorCode(errorSource);
  return {
    fileName: file.name,
    success: false,
    provider: 'manual',
    confidence: 'low',
    code,
    fields: {},
    candidates: { amounts: [] },
    warnings,
    error: scanErrorMessage(code, 'Provider unavailable. You can still enter the expense manually and save the attachment.'),
    debug: buildDebug(file, 'provider', { provider: 'manual', errorSource }),
  };
}

async function scanFile(file: File, receiptText?: string): Promise<ScanFileResult> {
  if (!SUPPORTED_TYPES.has(file.type)) {
    return providerFailureResult(file, ['Unsupported file type.'], 'unsupported_file_type');
  }
  if (file.size > MAX_FILE_SIZE) {
    return providerFailureResult(file, ['File size is too large.'], 'file_too_large');
  }

  if (receiptText?.trim()) {
    const parsed = normalizeExtraction({
      provider: 'manual',
      rawText: receiptText,
      data: { rawText: receiptText },
      providerConfidence: 0.7,
      warnings: [],
      rawProvider: 'manual-text-fallback',
    }, file.name);
    return withFileDebug(parsed, file, { provider: 'manual' });
  }

  const bytes = await file.arrayBuffer();
  const warnings: string[] = [];
  let googleResult: ScanFileResult | null = null;

  if (googleConfigured()) {
    try {
      googleResult = withFileDebug(normalizeExtraction(await scanWithGoogleDocumentAI(file, bytes), file.name), file, { provider: 'google-document-ai' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'google_document_ai_failed';
      warnings.push(message);
      if (process.env.NODE_ENV !== 'production') {
        console.error('Google Document AI receipt scan failed:', { fileName: file.name, error: message });
      }
    }
  } else {
    warnings.push('Google Document AI is not configured.');
  }

  if (shouldFallbackToOpenAI(googleResult)) {
    if (openaiConfigured()) {
      try {
        const openai = withFileDebug(normalizeExtraction(await scanWithOpenAIVision(file, bytes), file.name), file, { provider: 'openai-vision' });
        openai.warnings = [...warnings, ...openai.warnings];
        return openai;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'openai_vision_failed';
        warnings.push(message);
        if (process.env.NODE_ENV !== 'production') {
          console.error('OpenAI Vision receipt scan failed:', { fileName: file.name, error: message });
        }
      }
    } else {
      warnings.push('OpenAI Vision fallback is not configured.');
    }
  }

  if (googleResult) {
    googleResult.warnings = [...warnings, ...googleResult.warnings];
    return googleResult;
  }

  return providerFailureResult(file, warnings, googleConfigured() ? 'providers_failed' : openaiConfigured() ? 'google_missing_openai_failed' : 'missing_google_and_openai');
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = [...formData.getAll('receipt'), ...formData.getAll('receipts')].filter((file): file is File => file instanceof File);
    if (!files.length) return errorResponse('No receipt file uploaded', 400, undefined, 'upload_failed');
    if (files.length > MAX_RECEIPTS) return errorResponse('You can upload up to 10 receipts at once', 413, undefined, 'upload_failed');

    const receiptText = formData.get('receiptText');
    if (!googleConfigured() && !openaiConfigured() && typeof receiptText !== 'string') {
      return NextResponse.json({
        success: false,
        provider: 'manual',
        confidence: 'low',
        code: 'all_providers_unavailable',
        fields: {},
        candidates: { amounts: [] },
        warnings: ['Google Document AI is not configured.', 'OpenAI Vision fallback is not configured.'],
        error: 'No receipt scanning provider is configured',
        debug: {
          stage: 'provider',
          fileName: files[0]?.name || '',
          fileType: files[0]?.type || '',
          fileSize: files[0]?.size || 0,
          googleConfigured: false,
          openaiConfigured: false,
          provider: 'manual',
          errorSource: 'missing_google_and_openai',
          message: 'No receipt scanning provider is configured',
        },
      }, { status: 503 });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.info('Receipt scan request started', {
        googleConfigured: googleConfigured(),
        openaiConfigured: openaiConfigured(),
        files: files.map(file => ({ name: file.name, type: file.type, size: file.size })),
      });
    }

    const results = await Promise.all(files.map(file => scanFile(file, typeof receiptText === 'string' ? receiptText : undefined)));
    if (files.length === 1) {
      const [result] = results;
      return NextResponse.json({
        success: result.success,
        provider: result.provider,
        confidence: result.confidence,
        code: result.code,
        fields: result.fields,
        candidates: result.candidates,
        warnings: result.warnings,
        rawProvider: result.rawProvider,
        data: result.data,
        error: result.error,
        debug: result.debug,
        results,
      });
    }

    return NextResponse.json({
      success: results.some(result => result.success),
      provider: results.find(result => result.success)?.provider || 'manual',
      confidence: results.some(result => result.confidence === 'high') ? 'high' : results.some(result => result.confidence === 'medium') ? 'medium' : 'low',
      code: results.find(result => result.code)?.code,
      fields: {},
      candidates: { amounts: [] },
      warnings: results.flatMap(result => result.warnings),
      results,
    });
  } catch (error) {
    console.error('Receipt scan route failed:', error);
    return errorResponse('We could not read the receipt clearly', 500);
  }
}
