import { NextRequest, NextResponse } from 'next/server';
import { getUserFromBearerToken } from '@/lib/server/adminAccess';
import { aiUsageLimitResponse, consumeAiUsage } from '@/lib/server/aiUsage';
import { normalizeDigits } from '@/lib/locale';
import {
  getGoogleAccessToken,
  getGoogleReceiptConfig,
  getReceiptProviderStatus,
  maskGoogleClientEmail,
  readGoogleErrorResponse,
  safeProviderErrorMessage,
  type ReceiptProviderErrorCode,
} from '@/lib/server/receiptProviderConfig';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_RECEIPTS = 10;
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
// Flip this with a real subscription check when receipt scanning becomes a paid feature.
const RECEIPT_SCANNING_REQUIRES_PAID_PLAN = false;

function bearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization') ?? '';
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
}

async function requestUser(request: NextRequest) {
  const token = bearerToken(request) || request.cookies.get('sfm_access_token')?.value || null;
  return getUserFromBearerToken(token);
}

function receiptScanningPlanGateEnabled() {
  return RECEIPT_SCANNING_REQUIRES_PAID_PLAN;
}

function inferReceiptMimeType(file: File) {
  const explicitType = file.type?.trim().toLowerCase();
  if (explicitType && explicitType !== 'application/octet-stream') return explicitType;
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'pdf') return 'application/pdf';
  return explicitType || 'application/octet-stream';
}

type ScanProvider = 'google-document-ai' | 'openai-vision' | 'manual';
type ConfidenceLevel = 'high' | 'medium' | 'low';
type ScanErrorCode =
  | 'scan_success'
  | 'google_env_missing'
  | 'google_credentials_json_invalid'
  | 'google_credentials_private_key_missing'
  | 'google_credentials_private_key_invalid'
  | 'google_client_init_failed'
  | 'google_processor_path_invalid'
  | 'google_process_document_failed'
  | 'google_permission_denied'
  | 'google_processor_not_found'
  | 'google_invalid_location'
  | 'google_api_not_enabled'
  | 'google_invalid_credentials'
  | 'google_invalid_argument'
  | 'google_unsupported_file_type'
  | 'google_quota_exceeded'
  | 'google_request_failed'
  | 'openai_env_missing'
  | 'openai_fallback_failed'
  | 'OCR_NOT_CONFIGURED'
  | 'no_provider_configured'
  | 'provider_unavailable'
  | 'all_providers_unavailable'
  | 'plan_blocked'
  | 'upload_failed'
  | 'file_missing'
  | 'file_too_large'
  | 'unsupported_file_type'
  | 'file_type_unsupported'
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
  providerStatusCode?: number;
  providerReason?: string;
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

type GoogleDocumentEntity = {
  type?: string;
  mentionText?: string;
  confidence?: number;
  pageAnchor?: unknown;
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

class ReceiptScanProviderError extends Error {
  code: ReceiptProviderErrorCode;
  providerStatusCode?: number;
  providerReason?: string;

  constructor(code: ReceiptProviderErrorCode, providerStatusCode?: number, providerReason?: string) {
    super(code);
    this.name = 'ReceiptScanProviderError';
    this.code = code;
    this.providerStatusCode = providerStatusCode;
    this.providerReason = providerReason;
  }
}

function providerErrorDetails(error: unknown) {
  if (error instanceof ReceiptScanProviderError) {
    return {
      message: error.code,
      providerStatusCode: error.providerStatusCode,
      providerReason: error.providerReason,
    };
  }
  if (error && typeof error === 'object' && 'code' in error) {
    const diagnostic = error as { code?: string; status?: number; reason?: string };
    if (diagnostic.code) {
      return {
        message: diagnostic.code,
        providerStatusCode: diagnostic.status,
        providerReason: diagnostic.reason,
      };
    }
  }
  return {
    message: error instanceof Error ? error.message : 'scan_failed',
    providerStatusCode: undefined,
    providerReason: undefined,
  };
}

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
  return getReceiptProviderStatus().google.configured;
}

function openaiConfigured() {
  return getReceiptProviderStatus().openai.configured;
}

function buildDebug(file: File, stage: ScanDebug['stage'], patch: Partial<ScanDebug> = {}): ScanDebug {
  return {
    stage,
    fileName: file.name,
    fileType: inferReceiptMimeType(file),
    fileSize: file.size,
    googleConfigured: googleConfigured(),
    openaiConfigured: openaiConfigured(),
    ...patch,
  };
}

function normalizeArabicNumbers(value: string) {
  return normalizeDigits(value);
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
  if (/\u062c\u0646\u064a\u0647|\bEGP\b/.test(text)) return 'EGP';
  if (/\u062f\.?\s*\u0643|\bKWD\b|\bKD\b/.test(text)) return 'KWD';
  if (/\u0631\.?\s*\u0633|\bSAR\b/.test(text)) return 'SAR';
  if (/\u062f\.?\s*\u0625|\bAED\b/.test(text)) return 'AED';
  if (/\u20ac|\bEUR\b/.test(text)) return 'EUR';
  if (/\u00a3|\bGBP\b/.test(text)) return 'GBP';
  if (/\$|\bUSD\b|US\s*DOLLAR/.test(text)) return 'USD';
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
    duplicate.confidence = Math.max(0, Math.min(1, Math.max(duplicate.confidence, candidate.confidence)));
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
    ['amount_due', 'amount_due', 'Amount Due', 0.96],
    ['balanceDue', 'amount_due', 'Balance Due', 0.96],
    ['balance_due', 'amount_due', 'Balance Due', 0.96],
    ['grandTotal', 'grand_total', 'Grand Total', 0.96],
    ['grand_total', 'grand_total', 'Grand Total', 0.96],
    ['finalTotal', 'grand_total', 'Final Total', 0.95],
    ['final_total', 'grand_total', 'Final Total', 0.95],
    ['invoiceTotal', 'invoice_total', 'Invoice Total', 0.96],
    ['invoice_total', 'invoice_total', 'Invoice Total', 0.96],
    ['invoiceAmount', 'invoice_total', 'Invoice Amount', 0.95],
    ['invoice_amount', 'invoice_total', 'Invoice Amount', 0.95],
    ['totalAmount', 'total', 'Total', 0.92],
    ['total_amount', 'total', 'Total', 0.92],
    ['total', 'total', 'Total', 0.9],
    ['subtotal', 'subtotal', 'Subtotal', 0.64],
    ['subTotal', 'subtotal', 'Subtotal', 0.64],
    ['sub_total', 'subtotal', 'Subtotal', 0.64],
    ['netAmount', 'subtotal', 'Net Amount', 0.64],
    ['net_amount', 'subtotal', 'Net Amount', 0.64],
    ['taxAmount', 'tax', 'Tax', 0.48],
    ['tax_amount', 'tax', 'Tax', 0.48],
    ['totalTaxAmount', 'tax', 'Tax', 0.5],
    ['total_tax_amount', 'tax', 'Tax', 0.5],
    ['tax', 'tax', 'Tax', 0.48],
    ['discountAmount', 'discount', 'Discount', 0.5],
    ['discount_amount', 'discount', 'Discount', 0.5],
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

const TOTAL_KEYWORD_RULES: Array<{ kind: NonNullable<AmountCandidate['kind']>; label: string; confidence: number; pattern: RegExp }> = [
  { kind: 'grand_total', label: 'Grand Total', confidence: 0.99, pattern: /\u0627\u0644\u0645\u062c\u0645\u0648\u0639\s+\u0627\u0644\u0643\u0644\u064a|grand\s+total/i },
  { kind: 'total', label: 'Total', confidence: 0.98, pattern: /\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a(?!\s+\u0627\u0644\u0641\u0631\u0639\u064a)|\u0625\u062c\u0645\u0627\u0644\u064a(?!\s+\u0641\u0631\u0639\u064a)|\btotal\b/i },
  { kind: 'invoice_total', label: 'Invoice Total', confidence: 0.97, pattern: /\u0627\u0644\u0645\u0628\u0644\u063a\s+\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a|invoice\s+total/i },
  { kind: 'total', label: 'Total', confidence: 0.96, pattern: /\u0627\u0644\u0645\u062c\u0645\u0648\u0639(?!\s+\u0627\u0644\u0641\u0631\u0639\u064a)/i },
  { kind: 'amount_due', label: 'Amount Due', confidence: 0.98, pattern: /\u0627\u0644\u0645\u0637\u0644\u0648\u0628\s+\u062f\u0641\u0639\u0647|amount\s+due|balance\s+due/i },
  { kind: 'subtotal', label: 'Subtotal', confidence: 0.66, pattern: /subtotal|sub\s+total|\u0627\u0644\u0645\u062c\u0645\u0648\u0639\s+\u0627\u0644\u0641\u0631\u0639\u064a|\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a\s+\u0627\u0644\u0641\u0631\u0639\u064a/i },
  { kind: 'tax', label: 'Tax', confidence: 0.5, pattern: /\btax\b|vat|\u0636\u0631\u064a\u0628\u0629|\u0627\u0644\u0636\u0631\u064a\u0628\u0629/i },
  { kind: 'discount', label: 'Discount', confidence: 0.48, pattern: /discount|\u062e\u0635\u0645|\u0627\u0644\u062e\u0635\u0645/i },
];

function rawTextPriorityCandidates(rawText: string) {
  const candidates: AmountCandidate[] = [];
  const lines = normalizeArabicNumbers(removeTemplatePlaceholders(rawText || ''))
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  lines.forEach((line, index) => {
    const rule = TOTAL_KEYWORD_RULES.find(item => item.pattern.test(line));
    if (!rule) return;
    const valueLine = amountTokensFromLine(line).some(token => !token.isPercent)
      ? line
      : lines.slice(index + 1, index + 3).find(nextLine => amountTokensFromLine(nextLine).some(token => !token.isPercent));
    if (!valueLine) return;
    const tokens = amountTokensFromLine(valueLine).filter(token => !token.isPercent);
    const chosen = [...tokens].reverse()[0];
    if (!chosen) return;
    pushCandidate(candidates, {
      label: rule.label,
      kind: rule.kind,
      amount: rule.kind === 'discount' ? -Math.abs(chosen.amount) : Math.abs(chosen.amount),
      currency: normalizeCurrency(chosen.token, `${line} ${valueLine} ${rawText}`),
      confidence: valueLine === line ? rule.confidence : Math.min(0.99, rule.confidence + 0.01),
      source: valueLine === line ? line : `${line} ${valueLine}`,
    });
  });

  return candidates;
}

function extractAmountCandidates(rawText: string, data: Record<string, unknown>) {
  const normalized = normalizeArabicNumbers(removeTemplatePlaceholders(rawText || ''));
  const lines = normalized
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const candidates = candidatesFromStructuredData(data, normalized);
  for (const candidate of rawTextPriorityCandidates(normalized)) {
    pushCandidate(candidates, candidate);
  }

  lines.forEach((line, index) => {
    if (isTemplatePlaceholder(line)) return;
    const classified = classifyAmountLine(line);
    const tokens = amountTokensFromLine(line).filter(token => !(token.isPercent && !/[€£$]|KWD|KD|USD|SAR|AED|EUR|GBP|EGP|جنيه|د\.?\s*ك|ر\.?\s*س|د\.?\s*إ/i.test(token.token)));
    if (!tokens.length) {
      if (!['amount_due', 'grand_total', 'invoice_total', 'total', 'subtotal', 'tax', 'discount'].includes(classified.kind || '')) return;
      const nextValueLine = lines.slice(index + 1, index + 3).find(nextLine => amountTokensFromLine(nextLine).some(token => !token.isPercent));
      if (!nextValueLine) return;
      const nextTokens = amountTokensFromLine(nextValueLine).filter(token => !token.isPercent);
      const chosen = [...nextTokens].reverse()[0];
      if (!chosen) return;
      pushCandidate(candidates, {
        ...classified,
        amount: classified.kind === 'discount' ? -Math.abs(chosen.amount) : Math.abs(chosen.amount),
        currency: normalizeCurrency(chosen.token, `${line} ${nextValueLine}`),
        confidence: Math.min(0.99, classified.confidence + 0.04),
        source: `${line} ${nextValueLine}`,
      });
      return;
    }

    const previousLabelLine = classified.kind === 'other' || classified.kind === 'line_item'
      ? lines
        .slice(Math.max(0, index - 2), index)
        .reverse()
        .find(previousLine => {
          const previous = classifyAmountLine(previousLine);
          return ['amount_due', 'grand_total', 'invoice_total', 'total', 'subtotal', 'tax', 'discount'].includes(previous.kind || '')
            && !amountTokensFromLine(previousLine).length;
        })
      : undefined;
    const effective = previousLabelLine ? classifyAmountLine(previousLabelLine) : classified;

    const lastNonPercent = [...tokens].reverse().find(token => !token.isPercent);
    const chosen = effective.kind === 'line_item' || effective.kind === 'other'
      ? tokens[tokens.length - 1]
      : lastNonPercent || tokens[tokens.length - 1];
    if (!chosen) return;

    const bottomBoost = lines.length > 1 ? Math.max(0, (index / (lines.length - 1)) * 0.04) : 0;
    const amount = effective.kind === 'discount' ? -Math.abs(chosen.amount) : Math.abs(chosen.amount);
    pushCandidate(candidates, {
      ...effective,
      amount,
      currency: normalizeCurrency(chosen.token, `${previousLabelLine || ''} ${line}`),
      confidence: effective.confidence + bottomBoost + (previousLabelLine ? 0.04 : 0),
      source: previousLabelLine ? `${previousLabelLine} ${line}` : line,
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
  const hasUsefulPartialData = Boolean(
    fields.total
    || fields.currency
    || fields.description
    || fields.merchantName
    || fields.invoiceNumber
    || fields.subtotal
    || fields.tax
    || fields.discount
    || candidates.length
    || rawText.trim(),
  );
  if (!fields.total && hasUsefulPartialData) {
    warnings.push(fields.currency
      ? 'Currency was detected, but no total amount was identified with confidence.'
      : 'Some invoice data was extracted, but no total amount was identified with confidence.');
  }
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
    success: hasUsefulPartialData,
    provider: extraction.provider,
    confidence,
    code: fields.total ? 'scan_success' : 'no_clear_total',
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

function googleEntityType(entity?: GoogleDocumentEntity) {
  return String(entity?.type || '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_');
}

function flattenGoogleEntities(entities: GoogleDocumentEntity[], parentType = ''): GoogleDocumentEntity[] {
  const flattened: GoogleDocumentEntity[] = [];
  for (const entity of entities) {
    const ownType = String(entity.type || '').trim();
    const inheritedType = parentType && ownType && !ownType.includes('/') ? `${parentType}/${ownType}` : ownType;
    const normalizedEntity = inheritedType ? { ...entity, type: inheritedType } : entity;
    flattened.push(normalizedEntity);
    if (Array.isArray(entity.properties)) {
      flattened.push(...flattenGoogleEntities(entity.properties, googleEntityType(normalizedEntity)));
    }
  }
  return flattened;
}

function bestGoogleEntity(entities: GoogleDocumentEntity[]) {
  return entities
    .filter(Boolean)
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
}

function findGoogleEntity(
  entities: GoogleDocumentEntity[],
  exactTypes: string[],
  patterns: RegExp[] = [],
  options: { excludeLineItems?: boolean } = {},
) {
  const pool = options.excludeLineItems
    ? entities.filter(entity => !googleEntityType(entity).includes('line_item'))
    : entities;

  for (const exactType of exactTypes.map(type => type.toLowerCase().replace(/[-\s]+/g, '_'))) {
    const matches = pool.filter(entity => {
      const type = googleEntityType(entity);
      const collapsedType = type.replace(/\//g, '_');
      return type === exactType || type.endsWith(`/${exactType}`) || collapsedType === exactType;
    });
    const match = bestGoogleEntity(matches);
    if (match) return match;
  }

  return bestGoogleEntity(pool.filter(entity => patterns.some(pattern => pattern.test(googleEntityType(entity)))));
}

function googleAmountKind(entity?: GoogleDocumentEntity): AmountCandidate['kind'] {
  const type = googleEntityType(entity);
  if (/tax|vat/.test(type)) return 'tax';
  if (/discount|coupon|deduction/.test(type)) return 'discount';
  if (/subtotal|sub_total|net_amount|total_net_amount/.test(type)) return 'subtotal';
  if (/amount_due|balance_due|total_due|due_amount/.test(type)) return 'amount_due';
  if (/grand_total|final_total/.test(type)) return 'grand_total';
  if (/invoice_total|total_amount/.test(type)) return 'invoice_total';
  if (/(^|\/)total$/.test(type)) return 'total';
  if (/line_item.*amount|line_item.*total/.test(type)) return 'line_item';
  return 'other';
}

function googleAmountLabel(kind: AmountCandidate['kind'], entity?: GoogleDocumentEntity) {
  if (kind === 'amount_due') return 'Amount Due';
  if (kind === 'grand_total') return 'Grand Total';
  if (kind === 'invoice_total') return 'Invoice Total';
  if (kind === 'total') return 'Total';
  if (kind === 'subtotal') return 'Subtotal';
  if (kind === 'tax') return 'Tax';
  if (kind === 'discount') return 'Discount';
  if (kind === 'line_item') return 'Line item';
  return cleanTextValue(entity?.type) || 'Amount';
}

function googleEntityDebugValue(entity: GoogleDocumentEntity) {
  const normalizedValue = entity.normalizedValue;
  if (!normalizedValue) return undefined;
  return {
    hasText: Boolean(cleanTextValue(normalizedValue.text)),
    moneyValue: normalizedValue.moneyValue ? {
      currencyCode: normalizedValue.moneyValue.currencyCode,
      hasAmount: normalizedValue.moneyValue.units !== undefined || normalizedValue.moneyValue.nanos !== undefined,
    } : undefined,
    hasDateValue: Boolean(normalizedValue.dateValue),
  };
}

function logGoogleEntitySummary(entities: GoogleDocumentEntity[]) {
  if (process.env.NODE_ENV === 'production') return;
  const flattened = flattenGoogleEntities(entities);
  console.info('Google Document AI invoice entities', flattened.slice(0, 80).map(entity => ({
    type: entity.type,
    hasMentionText: Boolean(entity.mentionText),
    normalizedValue: googleEntityDebugValue(entity),
    confidence: entity.confidence,
    pageAnchor: Boolean(entity.pageAnchor),
  })));
}

function googleLineItems(entities: GoogleDocumentEntity[]) {
  return entities
    .filter(entity => googleEntityType(entity).includes('line_item') && Array.isArray(entity.properties))
    .map(entity => {
      const props = flattenGoogleEntities(entity.properties || [], googleEntityType(entity));
      const description = entityText(findGoogleEntity(props, [
        'line_item/description',
        'description',
        'product_service',
        'product_service_description',
        'item_name',
        'name',
      ], [/description|product.*service|item.*name|name/]));
      const quantity = parseMoney(entityText(findGoogleEntity(props, ['line_item/quantity', 'quantity', 'qty'], [/quantity|qty/])));
      const unit = entityMoney(findGoogleEntity(props, ['line_item/unit_price', 'unit_price', 'price'], [/unit.*price|price/]));
      const amount = entityMoney(findGoogleEntity(props, ['line_item/amount', 'line_item/total', 'amount', 'total'], [/amount|total/]));
      return {
        description,
        quantity,
        unitPrice: unit?.amount,
        amount: amount?.amount,
      };
    })
    .filter(item => item.description || item.amount);
}

function normalizeGoogleInvoiceEntities(document: { text?: string; entities?: GoogleDocumentEntity[] }) {
  const entities = document.entities || [];
  logGoogleEntitySummary(entities);
  const flattened = flattenGoogleEntities(entities);
  const entityTextBlock = flattened
    .map(entity => [entity.type, entityText(entity), entity.mentionText].filter(Boolean).join(' '))
    .filter(Boolean)
    .join('\n');
  const rawText = [document.text, entityTextBlock].filter(Boolean).join('\n');
  const supplier = findGoogleEntity(flattened, [
    'supplier_name',
    'vendor_name',
    'merchant_name',
    'store_name',
    'seller_name',
    'receiver_name',
  ], [/supplier.*name|vendor.*name|merchant.*name|store.*name|seller.*name/], { excludeLineItems: true });
  const invoiceId = findGoogleEntity(flattened, [
    'invoice_id',
    'invoice_number',
    'invoice_no',
    'invoice_num',
  ], [/invoice.*(id|number|no|num)/], { excludeLineItems: true });
  const invoiceDate = findGoogleEntity(flattened, [
    'invoice_date',
    'date',
  ], [/invoice.*date|(^|\/)date$/], { excludeLineItems: true });
  const total = findGoogleEntity(flattened, [
    'total_amount',
    'invoice_total',
    'amount_due',
    'balance_due',
    'invoice_amount',
    'grand_total',
    'total_due',
    'total',
  ], [/(^|\/)(total_amount|invoice_total|amount_due|balance_due|invoice_amount|grand_total|total_due|total)$/], { excludeLineItems: true });
  const subtotal = findGoogleEntity(flattened, [
    'subtotal',
    'sub_total',
    'net_amount',
    'total_net_amount',
  ], [/subtotal|sub_total|net_amount|total_net_amount/], { excludeLineItems: true });
  const tax = findGoogleEntity(flattened, [
    'total_tax_amount',
    'tax_amount',
    'vat',
    'tax',
  ], [/tax|vat/], { excludeLineItems: true });
  const discount = findGoogleEntity(flattened, [
    'discount_amount',
    'discount',
    'coupon',
  ], [/discount|coupon/], { excludeLineItems: true });
  const currencyEntity = findGoogleEntity(flattened, [
    'currency',
    'currency_code',
    'invoice_currency',
    'document_currency',
  ], [/currency/], { excludeLineItems: true });
  const totalMoney = entityMoney(total);
  const subtotalMoney = entityMoney(subtotal);
  const taxMoney = entityMoney(tax);
  const discountMoney = entityMoney(discount);
  const lineItems = googleLineItems(entities);

  const amountCandidates: AmountCandidate[] = [];
  for (const entity of flattened) {
    const kind = googleAmountKind(entity);
    if (kind === 'other') continue;
    const money = entityMoney(entity);
    if (money?.amount) {
      const candidateKind: NonNullable<AmountCandidate['kind']> = kind || 'other';
      const confidenceByKind = {
        amount_due: 0.98,
        grand_total: 0.97,
        invoice_total: 0.96,
        total: 0.94,
        subtotal: 0.7,
        tax: 0.5,
        discount: 0.52,
        line_item: 0.42,
        computed: 0.7,
        other: 0.3,
      } as Record<NonNullable<AmountCandidate['kind']>, number>;
      pushCandidate(amountCandidates, {
        label: googleAmountLabel(candidateKind, entity),
        kind: candidateKind,
        amount: candidateKind === 'discount' ? -Math.abs(money.amount) : money.amount,
        currency: money.currency || normalizeCurrency(entityText(entity), rawText),
        confidence: Math.max(entity.confidence || 0, confidenceByKind[candidateKind]),
        source: [entity.type, entityText(entity)].filter(Boolean).join(': '),
      });
    }
  }

  const merchantName = entityText(supplier) || parseMerchantName(rawText);
  const selectedTotal = selectBestAmount(amountCandidates);
  const selectedFinalTotal = selectedTotal && ['amount_due', 'grand_total', 'invoice_total', 'total', 'computed'].includes(selectedTotal.kind || '')
    ? selectedTotal
    : undefined;
  return {
    merchantName,
    invoiceNumber: entityText(invoiceId),
    date: entityDate(invoiceDate),
    subtotal: subtotalMoney?.amount,
    tax: taxMoney?.amount,
    discount: discountMoney?.amount,
    total: totalMoney?.amount || selectedFinalTotal?.value,
    currency: totalMoney?.currency
      || selectedFinalTotal?.currency
      || subtotalMoney?.currency
      || taxMoney?.currency
      || normalizeCurrency(entityText(currencyEntity), rawText)
      || normalizeCurrency(undefined, rawText),
    description: parseDescription(rawText, lineItems, merchantName),
    lineItems,
    candidates: amountCandidates,
    rawText,
  };
}

function googleEntityData(document: { text?: string; entities?: GoogleDocumentEntity[] }) {
  const normalized = normalizeGoogleInvoiceEntities(document);
  return {
    rawText: normalized.rawText,
    data: {
      merchantName: normalized.merchantName,
      invoiceNumber: normalized.invoiceNumber,
      date: normalized.date,
      subtotal: normalized.subtotal,
      taxAmount: normalized.tax,
      discountAmount: normalized.discount,
      totalAmount: normalized.total,
      currency: normalized.currency,
      description: normalized.description,
      lineItems: normalized.lineItems,
      amountCandidates: normalized.candidates,
      rawText: normalized.rawText,
    },
    confidence: Math.max(
      normalized.merchantName ? 0.55 : 0,
      normalized.invoiceNumber ? 0.55 : 0,
      normalized.date ? 0.55 : 0,
      normalized.total ? 0.82 : 0,
      normalized.candidates.length ? 0.58 : 0,
      0.45,
    ),
  };
}

async function scanWithGoogleDocumentAI(file: File, bytes: ArrayBuffer): Promise<ProviderExtraction> {
  const { config, error } = getGoogleReceiptConfig();
  if (!config) {
    throw new ReceiptScanProviderError(error || 'google_env_missing');
  }
  const mimeType = inferReceiptMimeType(file);
  if (!SUPPORTED_TYPES.has(mimeType)) {
    throw new ReceiptScanProviderError('google_unsupported_file_type', undefined, mimeType);
  }
  const token = await getGoogleAccessToken(config.credentials);
  const processorPath = config.processorPath;
  const endpoint = `https://${config.location}-documentai.googleapis.com/v1/${processorPath}:process`;
  console.info('Google Document AI process request', {
    env: {
      hasProjectId: Boolean(config.projectId),
      hasLocation: Boolean(config.location),
      hasProcessorId: Boolean(config.processorId),
      hasCredentialsJson: Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim()),
    },
    projectIdPresent: Boolean(config.projectId),
    location: config.location,
    processorIdPresent: Boolean(config.processorId),
    processorPath,
    serviceAccount: maskGoogleClientEmail(config.credentials.client_email),
    file: { mimeType, size: file.size },
  });
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rawDocument: {
          content: Buffer.from(bytes).toString('base64'),
          mimeType,
        },
      }),
    });
  } catch (error) {
    console.error('Google Document AI fetch failed', {
      processorPath,
      location: config.location,
      file: { mimeType, size: file.size },
      errorName: error instanceof Error ? error.name : 'unknown',
      errorMessage: error instanceof Error ? error.message : 'google_request_failed',
    });
    throw new ReceiptScanProviderError('google_request_failed');
  }
  if (!response.ok) {
    const detail = await readGoogleErrorResponse(response);
    console.error('Google Document AI process failed', {
      projectIdPresent: Boolean(config.projectId),
      location: config.location,
      processorIdPresent: Boolean(config.processorId),
      processorPath,
      serviceAccount: maskGoogleClientEmail(config.credentials.client_email),
      file: { mimeType, size: file.size },
      googleStatus: detail.status,
      googleReason: detail.reason,
      googleCode: detail.code,
      googleMessage: detail.message,
    });
    throw new ReceiptScanProviderError(detail.code, detail.status, detail.reason);
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
  if (!apiKey) throw new ReceiptScanProviderError('openai_env_missing');
  const mimeType = inferReceiptMimeType(file);
  if (mimeType === 'application/pdf') throw new ReceiptScanProviderError('openai_fallback_failed', undefined, 'PDF_NOT_SUPPORTED');

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
            image_url: `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`,
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
  if (!response.ok) {
    let providerReason: string | undefined;
    try {
      const body = await response.json() as { error?: { type?: string; code?: string } };
      providerReason = body.error?.code || body.error?.type;
    } catch {
      providerReason = undefined;
    }
    throw new ReceiptScanProviderError('openai_fallback_failed', response.status, providerReason);
  }
  const payload = await response.json() as Record<string, unknown>;
  const text = readOutputText(payload);
  if (!text) throw new ReceiptScanProviderError('openai_fallback_failed', undefined, 'EMPTY_RESPONSE');
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new ReceiptScanProviderError('openai_fallback_failed', undefined, 'INVALID_JSON_OUTPUT');
  }
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
  const sourceCode = errorSource.split(':')[0] || errorSource;
  errorSource = sourceCode;
  if (errorSource === 'scan_success') return 'scan_success';
  if (/plan|subscription|paid|premium|business/.test(errorSource)) return 'plan_blocked';
  if (errorSource === 'missing_google_and_openai' || errorSource === 'all_providers_unavailable' || errorSource === 'no_provider_configured') return 'no_provider_configured';
  if (/missing_google_|google_env_missing|provider_unavailable/.test(errorSource)) return 'google_env_missing';
  if (/invalid_google_credentials_json|google_credentials_json_invalid/.test(errorSource)) return 'google_credentials_json_invalid';
  if (/google_credentials_private_key_missing/.test(errorSource)) return 'google_credentials_private_key_missing';
  if (/google_credentials_private_key_invalid/.test(errorSource)) return 'google_credentials_private_key_invalid';
  if (errorSource === 'google_client_init_failed') return 'google_client_init_failed';
  if (errorSource === 'google_processor_path_invalid') return 'google_processor_path_invalid';
  if (errorSource === 'google_permission_denied') return 'google_permission_denied';
  if (errorSource === 'google_processor_not_found') return 'google_processor_not_found';
  if (errorSource === 'google_invalid_location') return 'google_invalid_location';
  if (errorSource === 'google_api_not_enabled') return 'google_api_not_enabled';
  if (errorSource === 'google_invalid_credentials') return 'google_invalid_credentials';
  if (errorSource === 'google_invalid_argument') return 'google_invalid_argument';
  if (errorSource === 'google_unsupported_file_type') return 'google_unsupported_file_type';
  if (errorSource === 'google_quota_exceeded') return 'google_quota_exceeded';
  if (errorSource === 'google_request_failed') return 'google_request_failed';
  if (/google_document_ai_request_failed|google_process_document_failed/.test(errorSource)) return 'google_process_document_failed';
  if (/openai_key_missing|openai_env_missing|openai_vision_not_configured/.test(errorSource)) return 'openai_env_missing';
  if (/openai_fallback_failed|openai_vision_failed|openai_pdf_not_supported|openai_vision_empty_response/.test(errorSource)) return 'openai_fallback_failed';
  if (/unsupported_file_type|file_type_unsupported/.test(errorSource)) return 'file_type_unsupported';
  if (/file_too_large/.test(errorSource)) return 'file_too_large';
  if (/file_missing/.test(errorSource)) return 'file_missing';
  if (/no_clear_total|parser_no_final_total/.test(errorSource)) return 'no_clear_total';
  if (/provider|google_missing|providers_failed|not_configured|unavailable/.test(errorSource)) return 'no_provider_configured';
  return 'scan_failed';
}

function scanErrorMessage(code: ScanErrorCode, fallback: string) {
  if (code === 'scan_success') return 'Receipt scan completed';
  if (code === 'plan_blocked') return 'Receipt scanning requires a paid plan.';
  if (code === 'all_providers_unavailable' || code === 'no_provider_configured') return safeProviderErrorMessage('no_provider_configured');
  if (code === 'google_env_missing') return safeProviderErrorMessage('google_env_missing');
  if (code === 'google_credentials_json_invalid') return safeProviderErrorMessage('google_credentials_json_invalid');
  if (code === 'google_credentials_private_key_missing') return safeProviderErrorMessage('google_credentials_private_key_missing');
  if (code === 'google_credentials_private_key_invalid') return safeProviderErrorMessage('google_credentials_private_key_invalid');
  if (code === 'google_client_init_failed') return safeProviderErrorMessage('google_client_init_failed');
  if (code === 'google_processor_path_invalid') return safeProviderErrorMessage('google_processor_path_invalid');
  if (code === 'google_process_document_failed') return safeProviderErrorMessage('google_process_document_failed');
  if (code === 'google_permission_denied') return safeProviderErrorMessage('google_permission_denied');
  if (code === 'google_processor_not_found') return safeProviderErrorMessage('google_processor_not_found');
  if (code === 'google_invalid_location') return safeProviderErrorMessage('google_invalid_location');
  if (code === 'google_api_not_enabled') return safeProviderErrorMessage('google_api_not_enabled');
  if (code === 'google_invalid_credentials') return safeProviderErrorMessage('google_invalid_credentials');
  if (code === 'google_invalid_argument') return safeProviderErrorMessage('google_invalid_argument');
  if (code === 'google_unsupported_file_type') return safeProviderErrorMessage('google_unsupported_file_type');
  if (code === 'google_quota_exceeded') return safeProviderErrorMessage('google_quota_exceeded');
  if (code === 'google_request_failed') return safeProviderErrorMessage('google_request_failed');
  if (code === 'openai_env_missing') return safeProviderErrorMessage('openai_env_missing');
  if (code === 'openai_fallback_failed') return safeProviderErrorMessage('openai_fallback_failed');
  if (code === 'provider_unavailable') return safeProviderErrorMessage('no_provider_configured');
  if (code === 'file_missing') return 'No receipt file uploaded';
  if (code === 'unsupported_file_type') return 'Unsupported file type';
  if (code === 'file_type_unsupported') return 'Unsupported file type';
  if (code === 'file_too_large') return 'File size is too large';
  if (code === 'no_clear_total') return 'Not enough invoice data was found. You can enter the details manually and save the image as an attachment.';
  return fallback;
}

function providerFailureResult(file: File, warnings: string[], errorSource: string): ScanFileResult {
  const code = scanErrorCode(errorSource);
  const detail = warnings
    .map(warning => {
      const [, statusCode, reason] = warning.match(/^(?:google_[a-z_]+|openai_fallback_failed):(\d+)?(?::([A-Z0-9_.$-]+))?$/i) || [];
      return { statusCode: statusCode ? Number(statusCode) : undefined, reason };
    })
    .find(item => item.statusCode || item.reason);
  return {
    fileName: file.name,
    success: false,
    provider: 'manual',
    confidence: 'low',
    code,
    fields: {},
    candidates: { amounts: [] },
    warnings,
    error: scanErrorMessage(code, 'Receipt scanning failed. You can still enter the expense manually and save the attachment.'),
    debug: buildDebug(file, 'provider', {
      provider: 'manual',
      errorSource,
      providerStatusCode: detail?.statusCode,
      providerReason: detail?.reason,
    }),
  };
}

async function scanFile(file: File, receiptText?: string): Promise<ScanFileResult> {
  const mimeType = inferReceiptMimeType(file);
  if (!SUPPORTED_TYPES.has(mimeType)) {
    return providerFailureResult(file, ['file_type_unsupported'], 'file_type_unsupported');
  }
  if (file.size > MAX_FILE_SIZE) {
    return providerFailureResult(file, ['file_too_large'], 'file_too_large');
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
  const providerStatus = getReceiptProviderStatus();
  const googleUnavailableCode: ReceiptProviderErrorCode = providerStatus.google.error || 'google_env_missing';

  if (process.env.NODE_ENV !== 'production') {
    const { config } = getGoogleReceiptConfig();
    console.info('Receipt scan provider trace', {
      providerSelected: providerStatus.google.configured ? 'google-document-ai' : providerStatus.openai.configured ? 'openai-vision' : 'manual',
      envPresence: {
        hasGoogleProjectId: providerStatus.google.hasProjectId,
        hasGoogleLocation: providerStatus.google.hasLocation,
        hasGoogleProcessorId: providerStatus.google.hasProcessorId,
        hasGoogleCredentialsJson: providerStatus.google.hasCredentialsJson,
        hasOpenAiKey: providerStatus.openai.hasApiKey,
      },
      file: { type: file.type, inferredMimeType: mimeType, size: file.size },
      googleClientInit: providerStatus.google.clientInitValid,
      processorLocation: process.env.GOOGLE_DOCUMENT_AI_LOCATION || null,
      processorIdPresent: providerStatus.google.hasProcessorId,
      processorPath: config?.processorPath,
      serviceAccount: maskGoogleClientEmail(config?.credentials.client_email),
      errorCode: providerStatus.google.error,
    });
  }

  if (providerStatus.google.configured) {
    try {
      googleResult = withFileDebug(normalizeExtraction(await scanWithGoogleDocumentAI(file, bytes), file.name), file, { provider: 'google-document-ai' });
    } catch (error) {
      const detail = providerErrorDetails(error);
      const message = [
        detail.message,
        detail.providerStatusCode ? String(detail.providerStatusCode) : undefined,
        detail.providerReason,
      ].filter(Boolean).join(':');
      warnings.push(message);
      if (process.env.NODE_ENV !== 'production') {
        console.error('Google Document AI receipt scan failed:', {
          fileType: file.type,
          inferredMimeType: mimeType,
          fileSize: file.size,
          errorCode: detail.message,
          providerStatusCode: detail.providerStatusCode,
          providerReason: detail.providerReason,
        });
      }
    }
  } else {
    warnings.push(googleUnavailableCode);
  }

  if (shouldFallbackToOpenAI(googleResult)) {
    if (providerStatus.openai.configured) {
      try {
        const openai = withFileDebug(normalizeExtraction(await scanWithOpenAIVision(file, bytes), file.name), file, { provider: 'openai-vision' });
        openai.warnings = [...warnings, ...openai.warnings];
        return openai;
      } catch (error) {
        const detail = providerErrorDetails(error);
        const message = [
          detail.message,
          detail.providerStatusCode ? String(detail.providerStatusCode) : undefined,
          detail.providerReason,
        ].filter(Boolean).join(':');
        warnings.push(message);
        if (process.env.NODE_ENV !== 'production') {
          console.error('OpenAI Vision receipt scan failed:', {
            errorCode: detail.message,
            providerStatusCode: detail.providerStatusCode,
            providerReason: detail.providerReason,
          });
        }
      }
    } else {
      warnings.push('openai_env_missing');
    }
  }

  if (googleResult) {
    googleResult.warnings = [...warnings, ...googleResult.warnings];
    return googleResult;
  }

  const errorSource = !providerStatus.google.configured && !providerStatus.openai.configured
    ? 'no_provider_configured'
    : !providerStatus.google.configured
      ? googleUnavailableCode
      : warnings.find(warning => scanErrorCode(warning) !== 'scan_failed' && scanErrorCode(warning) !== 'openai_env_missing')?.split(':')[0]
        || (!providerStatus.openai.configured ? 'openai_env_missing' : 'google_process_document_failed');
  return providerFailureResult(file, warnings, errorSource);
}

export async function POST(request: NextRequest) {
  try {
    const user = await requestUser(request);
    if (!user) return errorResponse('Unauthorized', 401, undefined, 'scan_failed');
    if (receiptScanningPlanGateEnabled()) {
      return errorResponse('Receipt scanning requires a paid plan.', 403, { stage: 'provider', errorSource: 'plan_blocked' }, 'plan_blocked');
    }

    const formData = await request.formData();
    const files = [...formData.getAll('receipt'), ...formData.getAll('receipts')].filter((file): file is File => file instanceof File);
    if (!files.length) return errorResponse('No receipt file uploaded', 400, undefined, 'file_missing');
    if (files.length > MAX_RECEIPTS) return errorResponse('You can upload up to 10 receipts at once', 413, undefined, 'upload_failed');

    const receiptText = formData.get('receiptText');
    const hasReceiptText = typeof receiptText === 'string' && receiptText.trim().length > 0;
    const providerStatus = getReceiptProviderStatus();
    const openAiUnits = providerStatus.openai.configured && !hasReceiptText
      ? files.filter(file => {
        const mimeType = inferReceiptMimeType(file);
        return SUPPORTED_TYPES.has(mimeType) && mimeType !== 'application/pdf' && file.size <= MAX_FILE_SIZE;
      }).length
      : 0;

    if (openAiUnits > 0) {
      const usage = await consumeAiUsage({
        userId: user.id,
        feature: 'receipt_scan',
        units: openAiUnits,
        metadata: {
          route: '/api/receipts/scan',
          fileCount: files.length,
          openAiUnits,
        },
      });
      if (!usage.allowed) return aiUsageLimitResponse(usage);
    }

    if (!providerStatus.google.configured && !providerStatus.openai.configured && !hasReceiptText) {
      const googleError = providerStatus.google.error || 'google_env_missing';
      return NextResponse.json({
        success: false,
        reason: 'OCR_NOT_CONFIGURED',
        provider: 'manual',
        confidence: 'low',
        code: 'OCR_NOT_CONFIGURED',
        fields: {},
        candidates: { amounts: [] },
        warnings: [googleError, 'openai_env_missing'],
        error: 'خدمة قراءة الفواتير غير مفعلة حالياً. يمكنك إدخال البيانات يدوياً.',
        debug: {
          stage: 'provider',
          fileName: files[0]?.name || '',
          fileType: files[0]?.type || '',
          fileSize: files[0]?.size || 0,
          googleConfigured: providerStatus.google.configured,
          openaiConfigured: providerStatus.openai.configured,
          provider: 'manual',
          errorSource: 'OCR_NOT_CONFIGURED',
          message: googleError,
        },
      }, { status: 503 });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.info('Receipt scan request started', {
        googleConfigured: googleConfigured(),
        openaiConfigured: openaiConfigured(),
      files: files.map(file => ({ type: file.type, size: file.size })),
      effectiveMimeTypes: files.map(file => inferReceiptMimeType(file)),
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
