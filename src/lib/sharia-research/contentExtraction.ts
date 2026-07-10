import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { PDFParse } from 'pdf-parse';
import type { ReliabilityLevel, SourceDocument, SourceTier, SourceType } from './types';

const MAX_TEXT_CHARS = 450_000;
const MAX_PDF_PAGES = 80;

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…',
};

export function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return ENTITIES[entity.toLowerCase()] ?? match;
  });
}

export function sanitizeText(value: unknown, maxLength = MAX_TEXT_CHARS) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function metaContent(html: string, key: string) {
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${key}["'][^>]*>`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return sanitizeText(decodeHtmlEntities(match[1]), 2_000);
  }
  return null;
}

function titleContent(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return title ? sanitizeText(decodeHtmlEntities(title), 500) : null;
}

function extractJsonLd(html: string) {
  const values: unknown[] = [];
  const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    if (!match[1] || match[1].length > 250_000) continue;
    try {
      values.push(JSON.parse(match[1]));
    } catch {
      // Invalid remote JSON-LD is ignored, never executed.
    }
  }
  return values;
}

function jsonLdText(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(jsonLdText);
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  return ['name', 'legalName', 'description', 'articleBody', 'headline']
    .map(key => typeof record[key] === 'string' ? sanitizeText(record[key], 25_000) : '')
    .filter(Boolean)
    .concat(record['@graph'] ? jsonLdText(record['@graph']) : []);
}

export function htmlToPlainText(html: string) {
  const withoutUnsafeBlocks = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template|svg|canvas|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|p|div|section|article|header|footer|main|aside|li|tr|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return sanitizeText(decodeHtmlEntities(withoutUnsafeBlocks));
}

export function extractHtmlContent(html: string) {
  const jsonLd = extractJsonLd(html);
  const title = metaContent(html, 'og:title') ?? titleContent(html);
  const description = metaContent(html, 'og:description') ?? metaContent(html, 'description');
  const publishedAt = metaContent(html, 'article:published_time') ?? metaContent(html, 'date');
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ?? null;
  const jsonText = jsonLd.flatMap(jsonLdText);
  const text = sanitizeText([description, ...jsonText, htmlToPlainText(html)].filter(Boolean).join('\n'));
  return { title, description, publishedAt, canonical, jsonLd, text };
}

export async function extractPdfText(body: Uint8Array, maxPages = MAX_PDF_PAGES) {
  if (body.byteLength > 15 * 1024 * 1024) throw new Error('PDF_SIZE_LIMIT_EXCEEDED');
  const parser = new PDFParse({ data: body });
  try {
    const info = await parser.getInfo({ parsePageInfo: false });
    const totalPages = Number(info.total ?? 0);
    if (totalPages > maxPages) throw new Error('PDF_PAGE_LIMIT_EXCEEDED');
    const result = await parser.getText({ first: Math.max(totalPages || 1, 1) });
    return {
      text: sanitizeText(result.text),
      pages: totalPages,
      title: typeof info.info?.Title === 'string' ? sanitizeText(info.info.Title, 500) : null,
    };
  } finally {
    await parser.destroy();
  }
}

export function evidenceSnippets(text: string, terms: string[], limit = 8) {
  const normalized = sanitizeText(text);
  const lower = normalized.toLowerCase();
  const snippets: string[] = [];
  for (const term of terms) {
    const index = lower.indexOf(term.toLowerCase());
    if (index < 0) continue;
    const start = Math.max(0, index - 220);
    const end = Math.min(normalized.length, index + term.length + 360);
    const snippet = normalized.slice(start, end).trim();
    if (snippet && !snippets.some(existing => existing.includes(snippet) || snippet.includes(existing))) snippets.push(snippet);
    if (snippets.length >= limit) break;
  }
  return snippets;
}

export function contentHash(value: string | Uint8Array) {
  return createHash('sha256').update(value).digest('hex');
}

export function createSourceDocument(input: {
  adapterId: string;
  sourceTitle: string;
  publisher: string;
  url: string;
  publicationDate?: string | null;
  filingDate?: string | null;
  retrievalDate: string;
  sourceType: SourceType;
  tier: SourceTier;
  reliability: ReliabilityLevel;
  extractedText: string;
  evidenceSnippets?: string[];
  companyIdentifier: string;
  reportingPeriod?: string | null;
  mimeType?: string | null;
  extractionStatus?: SourceDocument['extractionStatus'];
  error?: SourceDocument['error'];
  supports?: string[];
  canonicalUrl?: string | null;
}): SourceDocument {
  const url = new URL(input.url);
  const extractedText = sanitizeText(input.extractedText);
  return {
    id: randomUUID(),
    adapterId: input.adapterId,
    sourceTitle: sanitizeText(input.sourceTitle, 500) || url.hostname,
    publisher: sanitizeText(input.publisher, 240) || url.hostname,
    domain: url.hostname.replace(/^www\./, '').toLowerCase(),
    sourceUrl: url.toString(),
    canonicalUrl: input.canonicalUrl ? new URL(input.canonicalUrl, url).toString() : url.toString(),
    publicationDate: input.publicationDate ?? null,
    filingDate: input.filingDate ?? null,
    retrievalDate: input.retrievalDate,
    sourceType: input.sourceType,
    tier: input.tier,
    reliability: input.reliability,
    extractedText,
    evidenceSnippets: (input.evidenceSnippets ?? []).map(snippet => sanitizeText(snippet, 1_500)).filter(Boolean),
    companyIdentifier: input.companyIdentifier,
    reportingPeriod: input.reportingPeriod ?? null,
    contentHash: contentHash(extractedText || input.url),
    mimeType: input.mimeType ?? null,
    extractionStatus: input.extractionStatus ?? 'success',
    error: input.error ?? null,
    supports: input.supports ?? [],
  };
}
