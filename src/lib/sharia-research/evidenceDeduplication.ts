import { scoreSource } from './sourceScoring';
import type { SourceDocument } from './types';

export function canonicalizeEvidenceUrl(value: string) {
  const url = new URL(value);
  url.hash = '';
  for (const key of Array.from(url.searchParams.keys())) {
    if (/^(utm_|fbclid|gclid|mc_|ref$|source$)/i.test(key)) url.searchParams.delete(key);
  }
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url.toString();
}

function mergeDocuments(preferred: SourceDocument, duplicate: SourceDocument) {
  return {
    ...preferred,
    evidenceSnippets: Array.from(new Set([...preferred.evidenceSnippets, ...duplicate.evidenceSnippets])).slice(0, 12),
    supports: Array.from(new Set([...preferred.supports, ...duplicate.supports])),
    groupedUrls: Array.from(new Set([
      ...(preferred.groupedUrls ?? [preferred.sourceUrl]),
      ...(duplicate.groupedUrls ?? [duplicate.sourceUrl]),
    ])),
  };
}

export function deduplicateEvidence(documents: SourceDocument[]) {
  const groups = new Map<string, SourceDocument>();
  for (const document of documents) {
    let canonical: string;
    try { canonical = canonicalizeEvidenceUrl(document.canonicalUrl || document.sourceUrl); }
    catch { canonical = document.sourceUrl; }
    const contentKey = document.extractedText.length >= 300 ? document.contentHash : '';
    const key = contentKey || canonical;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { ...document, canonicalUrl: canonical, groupedUrls: [document.sourceUrl] });
      continue;
    }
    const preferred = scoreSource(document) > scoreSource(existing) ? document : existing;
    const duplicate = preferred === document ? existing : document;
    groups.set(key, mergeDocuments({ ...preferred, canonicalUrl: canonical }, duplicate));
  }
  return Array.from(groups.values()).sort((a, b) => scoreSource(b) - scoreSource(a));
}
