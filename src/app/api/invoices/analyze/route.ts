import { NextRequest, NextResponse } from 'next/server';
import { POST as scanReceipt } from '@/app/api/receipts/scan/route';
import { getUserFromBearerToken } from '@/lib/server/adminAccess';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

type InvoiceAnalyzeCode = 'UNSUPPORTED_FILE' | 'OCR_FAILED' | 'AI_FAILED' | 'NO_TEXT_FOUND';

type ScanLineItem = {
  description?: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
  total?: number;
  price?: number;
  name?: string;
};

type ScanResponse = {
  success?: boolean;
  confidence?: 'high' | 'medium' | 'low';
  code?: string;
  fields?: Record<string, unknown> & {
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
    lineItems?: ScanLineItem[];
  };
  candidates?: { amounts?: Array<{ value?: number; confidence?: number; label?: string }> };
  warnings?: string[];
  data?: Record<string, unknown> & {
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
    items?: ScanLineItem[];
    confidenceScore?: number;
    confidence?: number;
    rawText?: string;
  };
  debug?: {
    rawTextLength?: number;
    errorSource?: string;
  };
  error?: string;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

function inferMimeType(file: File) {
  const explicitType = file.type?.trim().toLowerCase();
  if (explicitType) return explicitType;
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'pdf') return 'application/pdf';
  return 'application/octet-stream';
}

function errorResponse(code: InvoiceAnalyzeCode, message: string, status = 400) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

function cleanString(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized || null;
}

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/[^\d.,-]/g, '').replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const numeric = toNumber(value);
    if (numeric !== null) return numeric;
  }
  return null;
}

function normalizeCurrency(value: unknown) {
  const normalized = cleanString(value)?.toUpperCase();
  if (!normalized) return null;
  const match = normalized.match(/\b[A-Z]{3}\b/);
  return match?.[0] || null;
}

function normalizeDate(value: unknown) {
  const normalized = cleanString(value);
  if (!normalized) return null;
  const iso = normalized.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (iso) return iso[0];
  const parsed = Date.parse(normalized);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 10);
}

function confidenceScore(scan: ScanResponse, fallback = 0.45) {
  const numeric = firstNumber(scan.data?.confidenceScore, scan.data?.confidence);
  if (numeric !== null) return Math.max(0, Math.min(1, numeric));
  if (scan.confidence === 'high') return 0.9;
  if (scan.confidence === 'medium') return 0.68;
  if (scan.confidence === 'low') return 0.38;
  return fallback;
}

function fieldConfidence(value: unknown, base: number) {
  if (value === null || value === undefined || value === '') return 0;
  return Math.max(0.35, Math.min(0.98, base));
}

function normalizeLineItems(items: unknown) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => item && typeof item === 'object' ? item as ScanLineItem : null)
    .filter(Boolean)
    .map((item) => ({
      description: cleanString(item?.description) || cleanString(item?.name) || '',
      quantity: firstNumber(item?.quantity),
      unitPrice: firstNumber(item?.unitPrice),
      total: firstNumber(item?.total, item?.amount, item?.price),
    }))
    .filter((item) => item.description || item.total !== null)
    .slice(0, 20);
}

function chooseStatus(dueDate: string | null, amount: number | null) {
  if (!amount || amount <= 0) return 'draft';
  if (!dueDate) return 'sent';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00.000Z`);
  return due < today ? 'overdue' : 'sent';
}

function daysUntil(date: string | null) {
  if (!date) return null;
  const due = new Date(`${date}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(due)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((due - today.getTime()) / 86_400_000);
}

function suggestCategory(text: string) {
  const normalized = text.toLowerCase();
  if (/rent|lease|إيجار|ايجار/.test(normalized)) return 'rent';
  if (/salary|payroll|wage|رواتب|راتب|أجور|اجور/.test(normalized)) return 'payroll';
  if (/marketing|ads|advertising|campaign|تسويق|إعلان|اعلان/.test(normalized)) return 'marketing';
  if (/software|cloud|hosting|subscription|saas|تقنية|استضافة|اشتراك|برمجيات/.test(normalized)) return 'technology';
  if (/supplier|vendor|purchase|materials|مورد|توريد|مشتريات|مواد/.test(normalized)) return 'suppliers';
  if (/operation|utilities|maintenance|تشغيل|صيانة|مرافق|خدمات/.test(normalized)) return 'operational';
  return 'other';
}

function scanErrorToInvoiceError(scan: ScanResponse, status: number) {
  const source = `${scan.code || ''} ${scan.debug?.errorSource || ''} ${scan.error || ''}`.toLowerCase();
  if (/unsupported|file_type|google_unsupported/.test(source)) {
    return errorResponse('UNSUPPORTED_FILE', 'نوع الملف غير مدعوم. الرجاء رفع صورة أو PDF.', 415);
  }
  if (/no_provider|not_configured|env_missing|openai_env_missing|google_env_missing/.test(source)) {
    return errorResponse('AI_FAILED', 'تعذر قراءة الفاتورة حالياً لأن خدمة التحليل غير مفعلة.', 503);
  }
  if (/no_clear_total|parser_no_final_total/.test(source)) {
    return errorResponse('NO_TEXT_FOUND', 'لم يتم العثور على بيانات كافية داخل الفاتورة.', 422);
  }
  if (status >= 500) {
    return errorResponse('AI_FAILED', 'تعذر تحليل الفاتورة حالياً. حاول مرة أخرى لاحقاً.', 502);
  }
  return errorResponse('OCR_FAILED', 'تعذر قراءة الفاتورة. حاول رفع صورة أوضح أو أدخل البيانات يدوياً.', status || 400);
}

async function getAuthUser(request: NextRequest) {
  const header = request.headers.get('authorization') ?? '';
  const bearerToken = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null;
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get('sfm_access_token')?.value ?? null;
  return getUserFromBearerToken(bearerToken || cookieToken);
}

export async function POST(request: NextRequest) {
  // Auth check: only logged-in users.
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') || formData.get('invoice') || formData.get('receipt');
    const defaultCurrency = normalizeCurrency(formData.get('defaultCurrency'));

    if (!(file instanceof File)) {
      return errorResponse('OCR_FAILED', 'لم يتم رفع ملف فاتورة صالح.', 400);
    }

    const mimeType = inferMimeType(file);
    if (!SUPPORTED_TYPES.has(mimeType)) {
      return errorResponse('UNSUPPORTED_FILE', 'نوع الملف غير مدعوم. الرجاء رفع صورة أو PDF.', 415);
    }

    if (file.size > MAX_FILE_SIZE) {
      return errorResponse('UNSUPPORTED_FILE', 'حجم الملف كبير جداً. الرجاء رفع ملف أصغر من 10MB.', 413);
    }

    const relayForm = new FormData();
    relayForm.append('receipt', file);
    const relayHeaders = new Headers();
    const cookie = request.headers.get('cookie');
    if (cookie) relayHeaders.set('cookie', cookie);

    const scanRequest = new NextRequest(new URL('/api/receipts/scan', request.url), {
      method: 'POST',
      headers: relayHeaders,
      body: relayForm,
    });

    const scanResponse = await scanReceipt(scanRequest);
    const scan = await scanResponse.json() as ScanResponse;

    if (!scanResponse.ok || !scan.success) {
      return scanErrorToInvoiceError(scan, scanResponse.status);
    }

    const fields = scan.fields || {};
    const data = scan.data || {};
    const baseConfidence = confidenceScore(scan);
    const lineItems = normalizeLineItems(fields.lineItems || data.items);
    const vendorName = cleanString(fields.merchantName) || cleanString(data.merchantName);
    const title = cleanString(fields.description) || cleanString(data.description) || vendorName;
    const amount = firstNumber(fields.total, data.totalAmount, scan.candidates?.amounts?.[0]?.value);
    const currency = normalizeCurrency(fields.currency) || normalizeCurrency(data.currency);
    const invoiceDate = normalizeDate(fields.date || data.receiptDate || data.date);
    const dueDate = normalizeDate((data as Record<string, unknown>).dueDate);
    const taxAmount = firstNumber(fields.tax, data.taxAmount);
    const discountAmount = firstNumber(fields.discount, data.discountAmount);
    const invoiceNumber = cleanString(fields.invoiceNumber) || cleanString(data.invoiceNumber);
    const scanText = [
      vendorName,
      title,
      fields.category,
      data.category,
      ...lineItems.map((item) => item.description),
    ].filter(Boolean).join(' ');

    const extracted = {
      invoiceNumber,
      title,
      vendorName,
      clientName: cleanString((data as Record<string, unknown>).clientName),
      invoiceDate,
      dueDate,
      amount,
      currency,
      taxAmount,
      discountAmount,
      status: chooseStatus(dueDate, amount),
      lineItems,
      notes: null as string | null,
    };

    const warnings: string[] = [];
    if (!invoiceNumber) warnings.push('missing_invoice_number');
    if (!title && !vendorName) warnings.push('missing_vendor_or_title');
    if (!invoiceDate) warnings.push('missing_invoice_date');
    if (!dueDate) warnings.push('missing_due_date');
    if (!amount) warnings.push('missing_amount');
    if (!currency) warnings.push('missing_currency');
    if (currency && defaultCurrency && currency !== defaultCurrency) warnings.push('currency_differs');
    const dueDays = daysUntil(dueDate);
    if (dueDays !== null && dueDays >= 0 && dueDays <= 7) warnings.push('due_soon');
    if (taxAmount && taxAmount > 0) warnings.push('tax_detected');
    if (discountAmount && discountAmount !== 0) warnings.push('discount_detected');
    if (baseConfidence < 0.55) warnings.push('review_low_confidence');

    const isComplete = Boolean(invoiceNumber && (title || vendorName) && invoiceDate && amount && currency);

    return NextResponse.json({
      ok: true,
      extracted,
      confidence: {
        invoiceNumber: fieldConfidence(invoiceNumber, baseConfidence - 0.04),
        amount: fieldConfidence(amount, baseConfidence),
        currency: fieldConfidence(currency, baseConfidence - 0.08),
        invoiceDate: fieldConfidence(invoiceDate, baseConfidence - 0.06),
      },
      analysis: {
        suggestedCategory: suggestCategory(scanText),
        isComplete,
        warnings,
        summary: isComplete ? 'invoice_complete' : 'invoice_needs_review',
      },
    });
  } catch (error) {
    console.error('Invoice analysis route failed', {
      errorName: error instanceof Error ? error.name : 'unknown',
      message: error instanceof Error ? error.message : 'invoice_analysis_failed',
    });
    return errorResponse('AI_FAILED', 'تعذر تحليل الفاتورة حالياً. حاول مرة أخرى لاحقاً.', 500);
  }
}
