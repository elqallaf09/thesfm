import 'server-only';

import { createHash } from 'node:crypto';

import {
  type FinancialAssetType,
  type NewsSourceType,
  type NormalizedNewsItem,
} from './types';
import {
  normalizeCanonicalUrl,
  safePublicHttpUrl,
  sanitizeExternalText,
  sanitizeXmlDocument,
  sourceDomainFromUrl,
} from './security';
import { publisherEvidenceProfile, publisherNetworkKey, publisherSourceId } from './providers/shared';

export type RssFeedMetadata = {
  providerId: string;
  providerName: string;
  sourceId: string;
  sourceName: string;
  sourceType: NewsSourceType;
  sourceDomain: string | null;
  sourceNetworkId: string | null;
  sourceReliability: number;
  sourcePriority: number;
  isOfficial: boolean;
  originalLanguage?: string;
  marketCodes?: string[];
  exchangeCodes?: string[];
  countries?: string[];
  sectors?: string[];
  industries?: string[];
  symbols?: string[];
  companyNames?: string[];
  assetTypes?: FinancialAssetType[];
  currencies?: string[];
};

export type RssFeedRejectionReason = 'missing_title' | 'missing_or_unsafe_url' | 'missing_or_invalid_date';

export type ParsedFinancialNewsFeed = {
  items: NormalizedNewsItem[];
  rejectedCount: number;
  rejectedByReason: Record<RssFeedRejectionReason, number>;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rawTagValue(block: string, tagName: string) {
  const escaped = escapeRegExp(tagName);
  return block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'i'))?.[1] ?? '';
}

function tagText(block: string, tagNames: string[], maxLength: number) {
  for (const tagName of tagNames) {
    const value = sanitizeExternalText(rawTagValue(block, tagName), maxLength);
    if (value) return value;
  }
  return '';
}

function openingTags(block: string, tagName: string) {
  const escaped = escapeRegExp(tagName);
  return block.match(new RegExp(`<${escaped}\\b[^>]*>`, 'gi')) ?? [];
}

function attributeValue(tag: string, attribute: string) {
  const escaped = escapeRegExp(attribute);
  const match = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*(?:["']([^"']*)["']|([^\\s>]+))`, 'i'));
  return sanitizeExternalText(match?.[1] ?? match?.[2] ?? '', 2_048);
}

function itemLink(block: string, providerId: string) {
  const direct = tagText(block, ['link'], 2_048);
  const safeDirect = safePublicHttpUrl(direct, providerId);
  if (safeDirect) return safeDirect;

  const atomLinks = openingTags(block, 'link');
  const preferred = atomLinks.find(tag => {
    const rel = attributeValue(tag, 'rel').toLowerCase();
    return !rel || rel === 'alternate';
  });
  const safeAtom = safePublicHttpUrl(attributeValue(preferred ?? '', 'href'), providerId);
  if (safeAtom) return safeAtom;

  const guidTag = openingTags(block, 'guid')[0] ?? '';
  const guidIsLink = attributeValue(guidTag, 'ispermalink').toLowerCase() !== 'false';
  return guidIsLink ? safePublicHttpUrl(tagText(block, ['guid'], 2_048), providerId) : null;
}

function imageLink(block: string, providerId: string) {
  for (const tagName of ['media:content', 'media:thumbnail', 'enclosure']) {
    for (const tag of openingTags(block, tagName)) {
      const medium = attributeValue(tag, 'medium').toLowerCase();
      const type = attributeValue(tag, 'type').toLowerCase();
      if (medium && medium !== 'image') continue;
      if (type && !type.startsWith('image/')) continue;
      const url = safePublicHttpUrl(attributeValue(tag, 'url'), providerId);
      if (url) return url;
    }
  }
  return null;
}

function sourceAttribution(block: string, metadata: RssFeedMetadata) {
  const sourceTag = openingTags(block, 'source')[0] ?? '';
  const sourceName = tagText(block, ['source'], 160) || metadata.sourceName;
  const sourceUrl = safePublicHttpUrl(attributeValue(sourceTag, 'url'), metadata.providerId);
  const sourceDomain = sourceDomainFromUrl(sourceUrl) ?? metadata.sourceDomain;
  const sourceNetworkId = publisherNetworkKey(sourceDomain ?? metadata.sourceNetworkId) || null;
  const metadataNetwork = publisherNetworkKey(metadata.sourceNetworkId ?? metadata.sourceDomain);
  const distinctPublisher = Boolean(sourceNetworkId && sourceNetworkId !== metadataNetwork);
  const evidence = distinctPublisher ? publisherEvidenceProfile(sourceDomain) : null;
  return {
    sourceId: distinctPublisher && sourceNetworkId ? publisherSourceId(sourceNetworkId) : metadata.sourceId,
    sourceName,
    sourceDomain,
    sourceNetworkId,
    sourceType: evidence?.sourceType ?? metadata.sourceType,
    sourceReliability: evidence?.reliability ?? metadata.sourceReliability,
  };
}

function strictDate(value: string) {
  if (!value || /^\d+$/.test(value.trim())) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  if (year < 1970 || year > 2100) return null;
  return date.toISOString();
}

function normalizedTitle(value: string) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('und')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[^\p{L}\p{N}%$€£¥]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stableHash(...values: string[]) {
  return createHash('sha256').update(values.join('\u001f')).digest('hex');
}

function unique(values: string[] | undefined) {
  return [...new Set((values ?? []).map(value => value.trim()).filter(Boolean))];
}

function itemBlocks(xml: string) {
  const blocks: Array<{ index: number; block: string }> = [];
  for (const pattern of [/<item\b[\s\S]*?<\/item>/gi, /<entry\b[\s\S]*?<\/entry>/gi]) {
    for (const match of xml.matchAll(pattern)) {
      blocks.push({ index: match.index, block: match[0] });
    }
  }
  return blocks.sort((left, right) => left.index - right.index).map(entry => entry.block);
}

function emptyRejections(): Record<RssFeedRejectionReason, number> {
  return {
    missing_title: 0,
    missing_or_unsafe_url: 0,
    missing_or_invalid_date: 0,
  };
}

export function parseFinancialNewsFeed(
  xml: string,
  metadata: RssFeedMetadata,
  fetchedAt = new Date().toISOString(),
): ParsedFinancialNewsFeed {
  const document = sanitizeXmlDocument(xml);
  const rejections = emptyRejections();
  const items: NormalizedNewsItem[] = [];

  for (const block of itemBlocks(document)) {
    const title = tagText(block, ['title'], 320);
    if (!title) {
      rejections.missing_title += 1;
      continue;
    }

    const originalUrl = itemLink(block, metadata.providerId);
    if (!originalUrl) {
      rejections.missing_or_unsafe_url += 1;
      continue;
    }

    const publishedText = tagText(block, ['pubDate', 'published', 'dc:date', 'date', 'updated'], 160);
    const publishedAt = strictDate(publishedText);
    if (!publishedAt) {
      rejections.missing_or_invalid_date += 1;
      continue;
    }

    const updatedText = tagText(block, ['updated', 'atom:updated', 'dc:modified'], 160);
    const updatedAt = strictDate(updatedText);
    const summary = tagText(block, ['description', 'summary', 'content:encoded', 'content'], 800) || null;
    const language = tagText(block, ['dc:language', 'language'], 32) || metadata.originalLanguage || 'unknown';
    const attribution = sourceAttribution(block, metadata);
    const canonicalUrl = normalizeCanonicalUrl(originalUrl, metadata.providerId);
    const titleKey = normalizedTitle(title);
    const contentHash = stableHash(titleKey, normalizedTitle(summary ?? ''), publishedAt.slice(0, 10));
    const id = `${metadata.providerId}-${stableHash(canonicalUrl ?? originalUrl, titleKey).slice(0, 24)}`;

    items.push({
      id,
      providerId: metadata.providerId,
      providerName: metadata.providerName,
      canonicalUrl,
      originalUrl,
      imageUrl: imageLink(block, metadata.providerId),
      title,
      normalizedTitle: titleKey,
      summary,
      originalLanguage: language,
      translatedLanguage: null,
      translatedTitle: null,
      translatedSummary: null,
      sourceId: attribution.sourceId,
      sourceName: attribution.sourceName,
      sourceType: attribution.sourceType,
      sourceDomain: attribution.sourceDomain,
      sourceNetworkId: attribution.sourceNetworkId,
      sourceNetwork: attribution.sourceNetworkId,
      sourceReliability: attribution.sourceReliability,
      sourcePriority: metadata.sourcePriority,
      isOfficial: metadata.isOfficial,
      publishedAt,
      updatedAt: updatedAt && updatedAt !== publishedAt ? updatedAt : null,
      fetchedAt,
      marketCodes: unique(metadata.marketCodes),
      exchangeCodes: unique(metadata.exchangeCodes),
      countries: unique(metadata.countries),
      sectors: unique(metadata.sectors),
      industries: unique(metadata.industries),
      symbols: unique(metadata.symbols).map(symbol => symbol.toUpperCase()),
      companyNames: unique(metadata.companyNames),
      assetTypes: unique(metadata.assetTypes),
      currencies: unique(metadata.currencies).map(currency => currency.toUpperCase()),
      eventType: 'unknown',
      relevanceScore: 0,
      importanceScore: 0,
      entityConfidenceScore: metadata.symbols?.length ? 0.65 : 0,
      entityConfidence: metadata.symbols?.length ? 0.65 : 0,
      confidenceScore: attribution.sourceReliability,
      sentiment: 'unknown',
      expectedImpact: 'unknown',
      impactDirection: 'unknown',
      impactHorizon: 'unknown',
      impactReason: null,
      verificationStatus: metadata.isOfficial ? 'official' : 'single_source',
      corroboratingSourceCount: 0,
      duplicateGroupId: null,
      contentHash,
      eventFingerprint: null,
      processingStatus: 'normalized',
      processingVersion: null,
    });
  }

  return {
    items,
    rejectedCount: Object.values(rejections).reduce((sum, count) => sum + count, 0),
    rejectedByReason: rejections,
  };
}
