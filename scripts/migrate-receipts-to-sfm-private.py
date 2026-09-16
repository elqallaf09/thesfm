from pathlib import Path
import re

ROOT = Path('.')


def one(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 exact match, got {count}')
    return text.replace(old, new, 1)


def sub_one(text: str, pattern: str, replacement: str, label: str) -> str:
    value, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 regex match, got {count}')
    return value


# Provider status: Google Document AI + SFM Private Vision, no OpenAI key.
path = ROOT / 'src/lib/server/receiptProviderConfig.ts'
text = path.read_text()
text = one(text, "import { createPrivateKey, createSign } from 'node:crypto';\n", "import { createPrivateKey, createSign } from 'node:crypto';\nimport { privateAiVisionConfigured } from '@/lib/server/aiProvider';\n", 'provider import')
text = text.replace("  | 'openai_env_missing'\n  | 'openai_fallback_failed'\n", "  | 'sfm_private_vision_not_configured'\n  | 'sfm_private_vision_failed'\n")
text = text.replace("  openai: {\n    configured: boolean;\n    hasApiKey: boolean;\n  };\n", "  privateVision: {\n    configured: boolean;\n  };\n")
text = text.replace("    openai: {\n      configured: Boolean(process.env.OPENAI_API_KEY),\n      hasApiKey: Boolean(process.env.OPENAI_API_KEY),\n    },\n", "    privateVision: {\n      configured: privateAiVisionConfigured(),\n    },\n")
text = text.replace("    openai_env_missing: 'OpenAI API key is missing.',\n    openai_fallback_failed: 'OpenAI Vision fallback failed.',\n", "    sfm_private_vision_not_configured: 'SFM Private Vision is not configured.',\n    sfm_private_vision_failed: 'SFM Private Vision fallback failed.',\n")
if re.search(r'OPENAI_API_KEY|openai_env_missing|openai_fallback_failed|\bopenai\s*:', text, re.I):
    raise RuntimeError('receiptProviderConfig still contains OpenAI provider dependency')
path.write_text(text)

# Legacy receipt route.
path = ROOT / 'src/app/api/ai/receipt-scan/route.ts'
text = path.read_text()
text = one(text, "import { NextRequest, NextResponse } from 'next/server';\n", "import { randomUUID } from 'node:crypto';\nimport { NextRequest, NextResponse } from 'next/server';\n", 'legacy uuid import')
text = one(text, "import { aiUsageLimitResponse, consumeAiUsage } from '@/lib/server/aiUsage';\n", "import { aiUsageLimitResponse, consumeAiUsage } from '@/lib/server/aiUsage';\nimport { generatePrivateVisionReply, privateAiVisionConfigured } from '@/lib/server/aiProvider';\n", 'legacy private AI import')
private_legacy = r'''function extractPrivateVisionJson(text: string) {
  const cleaned = text.replace(/```json|```/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

async function analyzeWithPrivateVision(file: File, bytes: ArrayBuffer): Promise<ReceiptScanResult | null> {
  if (!privateAiVisionConfigured() || file.type === 'application/pdf') return null;
  const mimeType = file.type || 'image/jpeg';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) return null;
  const generation = await generatePrivateVisionReply({
    correlationId: randomUUID(),
    maxTokens: 1600,
    system: [
      'You are SFM Private Vision, THE SFM receipt and invoice extraction engine.',
      'Use only values visibly present in the supplied image.',
      'Never invent merchant names, totals, dates, currencies, line items, or payment methods.',
      'Return strict JSON only, without markdown or commentary.',
    ].join(' '),
    prompt: [
      'Extract receipt or invoice data as strict JSON only.',
      'The expense amount must be the final payable amount.',
      'Priority: Grand Total, Total, Amount Due, Balance Due, Invoice Total, المجموع الكلي, الإجمالي, المبلغ الإجمالي, المطلوب دفعه; then bottom-most Total; then Subtotal + Tax minus/including Discount if no final total exists.',
      'Do not use line item amount, unit price, subtotal, tax, or discount as final total when a final total is visible.',
      'Return amountCandidates with labels for Total, Subtotal, line item amount, Tax, Discount, and computed total when visible.',
      'Detect currency symbols: $=USD, USD=USD, جنيه/EGP=EGP, KD/KWD/د.ك=KWD, SAR/ر.س=SAR, AED/د.إ=AED, €=EUR, £=GBP.',
      'Ignore template placeholders wrapped in {{...}}. Never return {{date}}, {{InvoiceNum}}, {{CompanyName}}, or {{BillToName}} as real values.',
      'If the date is a placeholder or unclear, use null for receiptDate.',
      'Set description to a concise real expense description.',
      'Use this schema: {"merchantName":"string|null","description":"string|null","invoiceNumber":"string|null","subtotal":number|null,"totalAmount":number|null,"currency":"string|null","taxAmount":number|null,"discountAmount":number|null,"paidAmount":number|null,"changeAmount":number|null,"receiptDate":"YYYY-MM-DD|null","category":"restaurants|shopping|bills|transport|health|education|rent|loans|subscriptions|other","paymentMethod":"cash|knet|card|transfer|apple_pay|other","items":[{"name":"string","quantity":number|null,"unitPrice":number|null,"total":number}],"amountCandidates":[{"label":"string","amount":number,"currency":"string|null","confidence":number,"source":"string"}],"confidenceScore":number,"confidenceLevel":"high|medium|low","warnings":["string"],"rawText":"string"}.',
    ].join(' '),
    imageDataUrl: `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`,
  });
  const parsed = generation?.text ? extractPrivateVisionJson(generation.text) : null;
  if (!parsed) throw new Error('SFM_PRIVATE_VISION_INVALID_RESPONSE');
  return normalizeResult(parsed, file.name);
}

function buildDebug'''
text = sub_one(text, r"function readOutputText\(payload: Record<string, unknown>\) \{.*?\n\}\n\nasync function analyzeWithOpenAI\(file: File, bytes: ArrayBuffer\): Promise<ReceiptScanResult \| null> \{.*?\n\}\n\nfunction buildDebug", private_legacy, 'legacy OpenAI block')
text = text.replace('providerConfigured: Boolean(process.env.OPENAI_API_KEY)', 'providerConfigured: privateAiVisionConfigured()')
text = text.replace("if (!process.env.OPENAI_API_KEY) {", "if (!privateAiVisionConfigured()) {")
text = text.replace('Receipt AI provider is not configured. You can still enter the expense manually and save the attachment.', 'SFM Private Vision is not configured. You can still enter the expense manually and save the attachment.')
text = text.replace("errorSource: 'missing_OPENAI_API_KEY'", "errorSource: 'missing_SFM_PRIVATE_VISION'")
text = text.replace('const aiResult = await analyzeWithOpenAI(file, bytes).catch(error => {', 'const aiResult = await analyzeWithPrivateVision(file, bytes).catch(error => {')
text = text.replace("console.error('Receipt AI scan failed:'", "console.error('SFM Private Vision receipt scan failed:'")
text = text.replace("'AI provider returned no result'", "'SFM Private Vision returned no result'")
text = text.replace('const openAiUnits = process.env.OPENAI_API_KEY && !hasReceiptText', 'const privateVisionUnits = privateAiVisionConfigured() && !hasReceiptText')
text = text.replace('if (openAiUnits > 0) {', 'if (privateVisionUnits > 0) {')
text = text.replace('units: openAiUnits,', 'units: privateVisionUnits,')
text = text.replace('openAiUnits,\n          legacy: true,', "privateVisionUnits,\n          provider: 'sfm-private-vision',\n          legacy: true,")
if re.search(r'OPENAI_API_KEY|api\.openai\.com|analyzeWithOpenAI|openAiUnits', text, re.I):
    raise RuntimeError('legacy receipt route still contains OpenAI dependency')
path.write_text(text)

# Current receipt route.
path = ROOT / 'src/app/api/receipts/scan/route.ts'
text = path.read_text()
text = one(text, "import { NextRequest, NextResponse } from 'next/server';\n", "import { randomUUID } from 'node:crypto';\nimport { NextRequest, NextResponse } from 'next/server';\n", 'modern uuid import')
text = one(text, "import { aiUsageLimitResponse, consumeAiUsage } from '@/lib/server/aiUsage';\n", "import { aiUsageLimitResponse, consumeAiUsage } from '@/lib/server/aiUsage';\nimport { generatePrivateVisionReply, privateAiVisionConfigured } from '@/lib/server/aiProvider';\n", 'modern private AI import')
text = text.replace("type ScanProvider = 'google-document-ai' | 'openai-vision' | 'manual';", "type ScanProvider = 'google-document-ai' | 'sfm-private-vision' | 'manual';")
text = text.replace("  | 'openai_env_missing'\n  | 'openai_fallback_failed'\n", "  | 'sfm_private_vision_not_configured'\n  | 'sfm_private_vision_failed'\n")
text = text.replace("  stage: 'upload' | 'provider' | 'google' | 'openai' | 'parser' | 'ui';", "  stage: 'upload' | 'provider' | 'google' | 'private-ai' | 'parser' | 'ui';")
text = text.replace('  openaiConfigured: boolean;', '  privateVisionConfigured: boolean;')
text = text.replace("function openaiConfigured() {\n  return getReceiptProviderStatus().openai.configured;\n}\n", "function privateVisionAvailable() {\n  return getReceiptProviderStatus().privateVision.configured;\n}\n")
text = text.replace('openaiConfigured: openaiConfigured()', 'privateVisionConfigured: privateVisionAvailable()')
private_modern = r'''function extractPrivateVisionJson(text: string) {
  const cleaned = text.replace(/```json|```/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

async function scanWithPrivateVision(file: File, bytes: ArrayBuffer): Promise<ProviderExtraction> {
  if (!privateAiVisionConfigured()) throw new ReceiptScanProviderError('sfm_private_vision_not_configured');
  const mimeType = inferReceiptMimeType(file);
  if (mimeType === 'application/pdf') throw new ReceiptScanProviderError('sfm_private_vision_failed', undefined, 'PDF_NOT_SUPPORTED');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) throw new ReceiptScanProviderError('sfm_private_vision_failed', undefined, 'UNSUPPORTED_IMAGE_TYPE');
  const generation = await generatePrivateVisionReply({
    correlationId: randomUUID(),
    maxTokens: 1600,
    system: [
      'You are SFM Private Vision, THE SFM receipt and invoice extraction engine.',
      'Use only real visible values from the supplied image.',
      'Never invent totals, dates, currencies, merchant names, line items, or payment methods.',
      'Return strict JSON only without markdown or commentary.',
    ].join(' '),
    prompt: [
      'Extract JSON fields: merchantName, description, invoiceNumber, date, subtotal, taxAmount, discountAmount, totalAmount, currency, category, paymentMethod, lineItems, amountCandidates, confidenceScore, rawText, warnings.',
      'The expense amount must be the final payable amount. Prefer Grand Total, Total, Amount Due, Balance Due, Invoice Total, المجموع الكلي, الإجمالي, المبلغ الإجمالي, المطلوب دفعه.',
      'Do not choose subtotal, tax, discount, unit price, or line-item amount as final total when a final total exists.',
      'Detect currencies: جنيه/EGP=EGP, $/USD=USD, د.ك/KD/KWD=KWD, ر.س/SAR=SAR, د.إ/AED=AED, €/EUR=EUR, £/GBP=GBP.',
      'Ignore template placeholders like {{CompanyName}}, {{date}}, {{InvoiceNum}}, {{BillToName}}, and {{ContactEmail}}.',
      'Use null when a field is unclear instead of guessing. confidenceScore must be between 0 and 1.',
      'lineItems entries use description, quantity, unitPrice, amount. amountCandidates entries use label, amount, currency, confidence, source.',
    ].join(' '),
    imageDataUrl: `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`,
  });
  const parsed = generation?.text ? extractPrivateVisionJson(generation.text) : null;
  if (!parsed) throw new ReceiptScanProviderError('sfm_private_vision_failed', undefined, 'INVALID_JSON_OUTPUT');
  return {
    provider: 'sfm-private-vision',
    rawText: typeof parsed.rawText === 'string' ? parsed.rawText : '',
    data: parsed,
    providerConfidence: Number(parsed.confidenceScore) || 0.72,
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings.filter((item): item is string => typeof item === 'string') : [],
    rawProvider: `${generation.provider}:${generation.model}`,
  };
}

function shouldFallbackToPrivateVision(result: ScanFileResult | null)'''
text = sub_one(text, r"function readOutputText\(payload: Record<string, unknown>\) \{.*?\n\}\n\nasync function scanWithOpenAIVision\(file: File, bytes: ArrayBuffer\): Promise<ProviderExtraction> \{.*?\n\}\n\nfunction shouldFallbackToOpenAI\(result: ScanFileResult \| null\)", private_modern, 'modern OpenAI vision block')
text = text.replace('missing_google_and_openai', 'missing_google_and_private_vision')
text = text.replace("if (/openai_key_missing|openai_env_missing|openai_vision_not_configured/.test(errorSource)) return 'openai_env_missing';", "if (/sfm_private_vision_not_configured|private_vision_not_configured/.test(errorSource)) return 'sfm_private_vision_not_configured';")
text = text.replace("if (/openai_fallback_failed|openai_vision_failed|openai_pdf_not_supported|openai_vision_empty_response/.test(errorSource)) return 'openai_fallback_failed';", "if (/sfm_private_vision_failed|private_vision_failed|private_vision_empty_response/.test(errorSource)) return 'sfm_private_vision_failed';")
text = text.replace("if (code === 'openai_env_missing') return safeProviderErrorMessage('openai_env_missing');", "if (code === 'sfm_private_vision_not_configured') return safeProviderErrorMessage('sfm_private_vision_not_configured');")
text = text.replace("if (code === 'openai_fallback_failed') return safeProviderErrorMessage('openai_fallback_failed');", "if (code === 'sfm_private_vision_failed') return safeProviderErrorMessage('sfm_private_vision_failed');")
text = text.replace("warning.match(/^(?:google_[a-z_]+|openai_fallback_failed):(\\d+)?(?::([A-Z0-9_.$-]+))?$/i)", "warning.match(/^(?:google_[a-z_]+|sfm_private_vision_failed):(\\d+)?(?::([A-Z0-9_.$-]+))?$/i)")
text = text.replace('shouldFallbackToOpenAI(googleResult)', 'shouldFallbackToPrivateVision(googleResult)')
text = text.replace('providerStatus.openai.configured', 'providerStatus.privateVision.configured')
text = text.replace("const openai = withFileDebug(normalizeExtraction(await scanWithOpenAIVision(file, bytes), file.name), file, { provider: 'openai-vision' });\n        openai.warnings = [...warnings, ...openai.warnings];\n        return openai;", "const privateVision = withFileDebug(normalizeExtraction(await scanWithPrivateVision(file, bytes), file.name), file, { provider: 'sfm-private-vision' });\n        privateVision.warnings = [...warnings, ...privateVision.warnings];\n        return privateVision;")
text = text.replace("console.error('OpenAI Vision receipt scan failed:'", "console.error('SFM Private Vision receipt scan failed:'")
text = text.replace("warnings.push('openai_env_missing');", "warnings.push('sfm_private_vision_not_configured');")
text = text.replace("scanErrorCode(warning) !== 'openai_env_missing'", "scanErrorCode(warning) !== 'sfm_private_vision_not_configured'")
text = text.replace("? 'openai_env_missing' : 'google_process_document_failed'", "? 'sfm_private_vision_not_configured' : 'google_process_document_failed'")
text = text.replace('const openAiUnits = providerStatus.privateVision.configured && !hasReceiptText', 'const privateVisionUnits = providerStatus.privateVision.configured && !hasReceiptText')
text = text.replace('if (openAiUnits > 0) {', 'if (privateVisionUnits > 0) {')
text = text.replace('units: openAiUnits,', 'units: privateVisionUnits,')
text = text.replace('openAiUnits,\n        },', "privateVisionUnits,\n          provider: 'sfm-private-vision',\n        },")
text = text.replace("warnings: [googleError, 'openai_env_missing']", "warnings: [googleError, 'sfm_private_vision_not_configured']")
text = text.replace('openaiConfigured: providerStatus.privateVision.configured', 'privateVisionConfigured: providerStatus.privateVision.configured')
if re.search(r'OPENAI_API_KEY|api\.openai\.com|scanWithOpenAI|openai-vision|providerStatus\.openai|openAiUnits|openaiConfigured|openai_env_missing|openai_fallback_failed', text, re.I):
    raise RuntimeError('current receipt route still contains OpenAI dependency')
path.write_text(text)

# Shared dashboard types and user-visible diagnostics.
path = ROOT / 'src/lib/routeDashboard/types.ts'
text = path.read_text().replace("'google-document-ai' | 'openai-vision' | 'manual'", "'google-document-ai' | 'sfm-private-vision' | 'manual'")
text = text.replace("'google' | 'openai'", "'google' | 'private-ai'")
text = text.replace('openaiConfigured?: boolean;', 'privateVisionConfigured?: boolean;')
path.write_text(text)

path = ROOT / 'src/lib/routeDashboard/helpers.ts'
text = path.read_text()
text = text.replace('openaiProvider', 'privateAiProvider').replace("'openai-vision'", "'sfm-private-vision'")
text = text.replace('openai_env_missing', 'sfm_private_vision_not_configured').replace('openai_key_missing', 'sfm_private_vision_not_configured').replace('openai_fallback_failed', 'sfm_private_vision_failed')
text = text.replace('openai_vision_failed', 'private_vision_failed').replace('openai_pdf_not_supported', 'private_vision_pdf_not_supported').replace('openai_vision_empty_response', 'private_vision_empty_response')
text = text.replace('missing_google_and_openai', 'missing_google_and_private_vision')
text = text.replace("{ ar: 'OpenAI Vision', en: 'OpenAI Vision', fr: 'OpenAI Vision' }", "{ ar: 'SFM Private Vision', en: 'SFM Private Vision', fr: 'SFM Private Vision' }")
replacements = {
    'مفتاح OpenAI الاحتياطي غير موجود، ولم تنجح قراءة Google.': 'SFM Private Vision غير مهيأ، ولم تنجح قراءة Google.',
    'OpenAI fallback key is missing, and Google scanning did not complete.': 'SFM Private Vision is not configured, and Google scanning did not complete.',
    'La clé OpenAI de secours est absente et la lecture Google n’a pas abouti.': 'SFM Private Vision n’est pas configuré et la lecture Google n’a pas abouti.',
    'فشل مزود OpenAI الاحتياطي في قراءة الفاتورة.': 'فشل SFM Private Vision في قراءة الفاتورة.',
    'The OpenAI fallback provider could not read the invoice.': 'SFM Private Vision could not read the invoice.',
    'Le fournisseur de secours OpenAI n’a pas pu lire la facture.': 'SFM Private Vision n’a pas pu lire la facture.',
    'OPENAI_API_KEY غير موجود في الخادم، لذلك لا يوجد مزود احتياطي بعد فشل Google.': 'SFM_AI_VISION_MODEL أو إعدادات SFM Private Vision غير موجودة في الخادم.',
    'OPENAI_API_KEY is missing on the server, so there is no fallback after Google fails.': 'SFM Private Vision is not configured on the server, so there is no private fallback after Google fails.',
    'OPENAI_API_KEY est absent côté serveur, donc aucun secours après l’échec de Google.': 'SFM Private Vision n’est pas configuré côté serveur.',
    'فشل مزود OpenAI الاحتياطي بعد محاولة Google.': 'فشل SFM Private Vision بعد محاولة Google.',
    'OpenAI fallback failed after Google was attempted.': 'SFM Private Vision failed after Google was attempted.',
    'Le secours OpenAI a échoué après la tentative Google.': 'SFM Private Vision a échoué après la tentative Google.',
    'OPENAI_API_KEY غير موجود في الخادم.': 'SFM Private Vision غير مهيأ في الخادم.',
    'OPENAI_API_KEY is missing on the server.': 'SFM Private Vision is not configured on the server.',
    'OPENAI_API_KEY est absent côté serveur.': 'SFM Private Vision n’est pas configuré côté serveur.',
}
for old, new in replacements.items():
    text = text.replace(old, new)
duplicate = """    sfm_private_vision_not_configured: {\n      ar: 'SFM Private Vision غير مهيأ في الخادم.',\n      en: 'SFM Private Vision is not configured on the server.',\n      fr: 'SFM Private Vision n’est pas configuré côté serveur.',\n    },\n"""
if text.count(duplicate) == 1:
    text = text.replace(duplicate, '', 1)
text = text.replace('/sfm_private_vision_not_configured|sfm_private_vision_not_configured/', '/sfm_private_vision_not_configured|private_vision_not_configured/')
if re.search(r'OpenAI|openai-vision|openaiProvider|openai_env_missing|openai_fallback_failed|OPENAI_API_KEY', text, re.I):
    raise RuntimeError('routeDashboard helpers still contain OpenAI live UI/dependency')
path.write_text(text)

path = ROOT / 'src/components/finance/RouteDashboardPage.tsx'
path.write_text(path.read_text().replace('receiptDebug.openaiConfigured', 'receiptDebug.privateVisionConfigured'))

path = ROOT / 'src/__tests__/unit/receiptProviderStatusAuth.test.ts'
path.write_text(path.read_text().replace("openai: { configured: false }", "privateVision: { configured: false }"))

# Final migration guard: direct OpenAI receipt dependencies must be gone.
paths = [
    'src/app/api/ai/receipt-scan/route.ts',
    'src/app/api/receipts/scan/route.ts',
    'src/lib/server/receiptProviderConfig.ts',
    'src/lib/routeDashboard/helpers.ts',
    'src/lib/routeDashboard/types.ts',
    'src/components/finance/RouteDashboardPage.tsx',
]
for value in paths:
    source = (ROOT / value).read_text()
    if re.search(r'OPENAI_API_KEY|api\.openai\.com|openai-vision|OpenAI Vision|openaiConfigured|providerStatus\.openai|openAiUnits', source, re.I):
        raise RuntimeError(f'OpenAI receipt dependency remained in {value}')

print('SFM Private Vision receipt migration completed safely.')
