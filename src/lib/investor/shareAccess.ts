/**
 * Pure investor-share-link state helpers (phase 2.9).
 *
 * Shared by the owner workspace, the public viewer, and the API route so
 * every surface agrees on when a link is usable. No crypto here — token and
 * password hashing live server-side in src/lib/server/investorShare.ts.
 */

export type InvestorLinkState = 'active' | 'expired' | 'revoked';

export const INVESTOR_SECTIONS = [
  'overview',
  'readiness',
  'financials',
  'documents',
  'pitch_deck',
  'risks',
] as const;

export type InvestorSection = typeof INVESTOR_SECTIONS[number];

export const INVESTOR_EVENT_TYPES = [
  'offer_opened',
  'pitch_deck_viewed',
  'document_downloaded',
  'question_submitted',
  'access_denied',
  'link_revoked',
] as const;

export type InvestorEventType = typeof INVESTOR_EVENT_TYPES[number];

type LinkRow = {
  expires_at?: string | null;
  revoked_at?: string | null;
};

export function evaluateLinkState(link: LinkRow, now: number = Date.now()): InvestorLinkState {
  if (link.revoked_at) return 'revoked';
  const raw = String(link.expires_at ?? '').trim();
  if (raw) {
    const expiry = new Date(raw).getTime();
    if (Number.isFinite(expiry) && expiry <= now) return 'expired';
  }
  return 'active';
}

/** Keep only known sections; an empty result means nothing is shared. */
export function normalizeSections(value: unknown): InvestorSection[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<InvestorSection>();
  for (const item of value) {
    const section = String(item ?? '').trim() as InvestorSection;
    if ((INVESTOR_SECTIONS as readonly string[]).includes(section)) seen.add(section);
  }
  return INVESTOR_SECTIONS.filter(section => seen.has(section));
}

export function sectionAllowed(link: { visible_sections?: unknown }, section: InvestorSection): boolean {
  return normalizeSections(link.visible_sections).includes(section);
}

/**
 * Documents marked private are never shared through a link, regardless of
 * the link configuration. Anything without an explicit visibility marker is
 * treated as private — sharing is opt-in, never opt-out.
 */
export function documentSharable(row: Record<string, unknown>): boolean {
  const visibility = String(row.visibility ?? '').trim().toLowerCase();
  return visibility === 'investor' || visibility === 'public' || visibility === 'shared';
}
