const OPEC_HOME_URL = 'https://www.opec.org/';

export type OpecPolicyDecision = 'maintain' | 'increase' | 'decrease' | 'adjust' | 'unknown';

export type OpecPolicySnapshot = {
  source: 'OPEC';
  sourceUrl: string;
  title: string;
  publishedDate: string;
  decision: OpecPolicyDecision;
  explicitAdjustmentThousandBarrelsPerDay: number | null;
  summary: string | null;
  fetchedAt: string;
};

type PressReleaseCandidate = {
  title: string;
  publishedDate: string;
  url: string;
};

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;|&#8211;/gi, '–')
    .replace(/&mdash;|&#8212;/gi, '—');
}

function stripHtml(value: string) {
  return decodeHtml(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dateToIso(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : null;
}

function safeOpecUrl(href: string) {
  try {
    const url = new URL(href, OPEC_HOME_URL);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || (hostname !== 'www.opec.org' && hostname !== 'opec.org')) return null;
    if (!/^\/pr-detail\/[a-z0-9._-]+\.html$/i.test(url.pathname)) return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function relevantTitle(title: string) {
  return /\b(?:production|output|supply|market stability|opec\+|joint ministerial monitoring committee|jmmc)\b/i.test(title);
}

export function parseOpecPressReleaseIndex(html: string): PressReleaseCandidate[] {
  const candidates: PressReleaseCandidate[] = [];
  const seen = new Set<string>();
  const links = [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']*\/pr-detail\/[^"']+\.html)["'][^>]*>[\s\S]*?<\/a>/gi)];

  for (const link of links) {
    const url = safeOpecUrl(link[1]);
    if (!url || seen.has(url)) continue;
    const index = link.index ?? 0;
    const before = html.slice(Math.max(0, index - 2500), index);
    const headings = [...before.matchAll(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi)];
    const title = headings.length ? stripHtml(headings.at(-1)![1]) : '';
    if (!title || !relevantTitle(title)) continue;

    const plain = stripHtml(before);
    const dates = [...plain.matchAll(/\b(\d{1,2}\s+[A-Za-z]+\s+\d{4})\b/g)];
    const publishedDate = dates.length ? dateToIso(dates.at(-1)![1]) : null;
    if (!publishedDate) continue;

    seen.add(url);
    candidates.push({ title, publishedDate, url });
  }

  return candidates.sort((left, right) => right.publishedDate.localeCompare(left.publishedDate));
}

function decisionFromText(text: string): OpecPolicyDecision {
  if (/\b(?:decided|agreed)\s+to\s+maintain\b[\s\S]{0,120}\bproduction\b/i.test(text)
    || /\bmaintain\b[\s\S]{0,80}\brequired production\b/i.test(text)) return 'maintain';
  if (/\b(?:increase|raise)\b[\s\S]{0,100}\bproduction\b|\bproduction\b[\s\S]{0,100}\b(?:increase|raise)\b/i.test(text)) return 'increase';
  if (/\b(?:cut|reduce|decrease)\b[\s\S]{0,100}\bproduction\b|\bproduction\b[\s\S]{0,100}\b(?:cut|reduction|decrease)\b/i.test(text)) return 'decrease';
  if (/\badjust(?:ed|ment)?\b[\s\S]{0,100}\bproduction\b|\bproduction adjustment\b/i.test(text)) return 'adjust';
  return 'unknown';
}

function explicitAdjustment(text: string) {
  const match = text.match(/\b(\d[\d,]*(?:\.\d+)?)\s*(thousand|million)\s+(?:barrels per day|bpd)\b/i);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(value) || value < 0) return null;
  return match[2].toLowerCase() === 'million' ? value * 1000 : value;
}

export function parseOpecPolicyDetail(
  html: string,
  candidate: PressReleaseCandidate,
  fetchedAt = new Date().toISOString(),
): OpecPolicySnapshot {
  const plain = stripHtml(html);
  const titleIndex = plain.toLowerCase().indexOf(candidate.title.toLowerCase());
  const afterTitle = titleIndex >= 0 ? plain.slice(titleIndex + candidate.title.length) : plain;
  const addressIndex = afterTitle.search(/\bAddress\b/i);
  const body = (addressIndex >= 0 ? afterTitle.slice(0, addressIndex) : afterTitle).trim();
  const summary = body ? body.slice(0, 2400) : null;
  const combined = candidate.title + ' ' + (summary ?? '');

  return {
    source: 'OPEC',
    sourceUrl: candidate.url,
    title: candidate.title,
    publishedDate: candidate.publishedDate,
    decision: decisionFromText(combined),
    explicitAdjustmentThousandBarrelsPerDay: explicitAdjustment(combined),
    summary,
    fetchedAt,
  };
}

async function safeHtml(url: string, revalidate: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  timer.unref?.();
  try {
    const response = await fetch(url, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
      },
      signal: controller.signal,
      next: { revalidate },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) return null;
    const html = await response.text();
    return html.length <= 3_000_000 ? html : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchLatestOpecPolicy(): Promise<OpecPolicySnapshot | null> {
  const home = await safeHtml(OPEC_HOME_URL, 900);
  if (!home) return null;
  const candidate = parseOpecPressReleaseIndex(home)[0];
  if (!candidate) return null;
  const detail = await safeHtml(candidate.url, 1800);
  if (!detail) {
    return {
      source: 'OPEC',
      sourceUrl: candidate.url,
      title: candidate.title,
      publishedDate: candidate.publishedDate,
      decision: decisionFromText(candidate.title),
      explicitAdjustmentThousandBarrelsPerDay: null,
      summary: null,
      fetchedAt: new Date().toISOString(),
    };
  }
  return parseOpecPolicyDetail(detail, candidate);
}

export { OPEC_HOME_URL };
