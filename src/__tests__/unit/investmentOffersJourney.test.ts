import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => readFileSync(join(root, file), 'utf8');

const page = read('src/app/investment-offers/page.tsx');
const text = read('src/app/investment-offers/_text.ts');
const tabsCore = read('src/app/investment-offers/_tabs.tsx');
const tabsMaterials = read('src/app/investment-offers/_tabsMaterials.tsx');
const tabsInvestor = read('src/app/investment-offers/_tabsInvestor.tsx');
const moduleCss = read('src/app/investment-offers/investor.module.css');
const viewerPage = read('src/app/investor/[token]/page.tsx');
const viewerCss = read('src/app/investor/[token]/viewer.module.css');
const viewRoute = read('src/app/api/investor/view/route.ts');
const linksRoute = read('src/app/api/investor/links/route.ts');
const migration = read('supabase/migrations/20260712130000_create_investor_relations.sql');
const appLayout = read('src/components/AppLayout.tsx');

describe('Investor Experience journey (phase 2.9)', () => {
  it('exposes the full eight-tab investor journey behind URL-backed tabs', () => {
    expect(page).toContain("'overview',");
    for (const tab of ['readiness', 'financials', 'documents', 'pitch-deck', 'risks', 'sharing', 'activity']) {
      expect(page).toContain(`'${tab}',`);
    }
    expect(page).toContain('useUrlTabState<InvestorJourneyTab>');
    expect(page.match(/<PageTabPanel/g)).toHaveLength(8);
  });

  it('backs every tab with real tables — including the new investor-relations tables', () => {
    for (const table of [
      'projects',
      'project_feasibility_studies',
      'project_financial_models',
      'project_funding_readiness',
      'project_pitch_decks',
      'project_strategic_documents',
      'project_documents',
      'project_risks',
      'project_investor_links',
      'project_investor_events',
      'project_investor_questions',
      'project_due_diligence_items',
    ]) {
      expect(page).toContain(`loadRows('${table}', user.id)`);
    }
    // Every new table ships with RLS in the migration.
    for (const table of ['project_investor_links', 'project_investor_events', 'project_risks', 'project_investor_questions', 'project_due_diligence_items']) {
      expect(migration).toContain(`create table if not exists public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it('computes readiness deterministically through the engine, not inline math', () => {
    expect(page).toContain("import { computeReadiness } from '@/lib/investor/readiness'");
    expect(page).toContain('computeReadiness({');
    // No hardcoded readiness percentages in the workspace.
    expect(page).not.toMatch(/readiness_score\s*[:=]\s*\d/);
  });

  it('keeps the required Arabic journey labels and honest empty states', () => {
    for (const label of [
      'نظرة عامة',
      'جاهزية الاستثمار',
      'البيانات المالية',
      'المستندات',
      'العرض الاستثماري',
      'المخاطر',
      'المشاركة',
      'نشاط المستثمرين',
    ]) {
      expect(text).toContain(label);
    }
    // The exact no-activity sentence required by the spec.
    expect(text).toContain('لا توجد بيانات نشاط مستثمرين متاحة حالياً');
    // Investor-friendly copy replaces the flagged generic wording.
    expect(text).toContain('جاهزية المشروع للاستثمار');
    expect(text).toContain('ملفات المستثمر الأساسية');
    expect(text).toContain('أكمل المتطلبات الناقصة');
    expect(text).toContain('شارك العرض مع المستثمر');
    expect(text).toContain('حدّث مخاطر المشروع');
  });

  it('uses English digits and covers all three languages', () => {
    // No Arabic-Indic digits anywhere in investor copy.
    expect(text).not.toMatch(/[٠-٩]/);
    expect(text).toContain("export const INVESTOR_TEXT: Record<Lang, InvestorCopy> = { ar, en, fr }");
  });

  it('never fabricates activity and renders events from the log only', () => {
    expect(tabsInvestor).toContain('events.length === 0');
    expect(tabsInvestor).toContain('text.activityEmpty');
    expect(tabsInvestor).not.toMatch(/fake|dummy|lorem|sample data|mockEvents/i);
  });

  it('gates due-diligence completion behind evidence or a written review note', () => {
    expect(tabsMaterials).toContain('text.diligenceNoteRequired');
    expect(tabsMaterials).toContain("status: 'needs_review'");
    // Derived evidence only ever comes from real rows.
    const data = read('src/app/investment-offers/_data.ts');
    expect(data).toContain('Evidence is never assumed');
    expect(data).toContain('risks.length > 0');
  });

  it('labels financial figures with their source and shows severity as text, not color alone', () => {
    expect(tabsCore).toContain('sourceLabel');
    expect(text).toContain('sourceUserEntered');
    expect(text).toContain('sourceUnavailable');
    expect(tabsMaterials).toContain('levelLabels[severity] ?? severity');
  });

  it('keeps the workspace styles RTL-safe and theme-token aware', () => {
    expect(moduleCss).not.toMatch(/(?:^|[;{\s])(?:padding|margin)-(?:left|right)\s*:/);
    expect(moduleCss).not.toMatch(/text-align\s*:\s*(left|right)\b/);
    expect(moduleCss).not.toContain(':global(.dark)');
    expect(moduleCss).toContain('var(--surface)');
    expect(moduleCss).toContain('var(--foreground)');
    expect(moduleCss).toContain('min-block-size: 44px');
    expect(viewerCss).not.toContain(':global(.dark)');
    expect(viewerCss).toContain('var(--surface)');
    expect(viewerCss).toContain('var(--foreground)');
    expect(viewerCss).toContain('min-block-size: 44px');
  });
});

describe('Investor secure sharing (phase 2.9)', () => {
  it('stores only token hashes and scrypt password hashes', () => {
    expect(linksRoute).toContain('hashInvestorToken(rawToken)');
    expect(linksRoute).toContain('hashInvestorPassword(password)');
    expect(migration).toContain('token_hash text not null unique');
    // The raw token is returned exactly once and never persisted.
    expect(linksRoute).toContain('token: rawToken');
    expect(linksRoute).not.toContain('token: insert');
  });

  it('enforces expiry, revocation, and password on the public route', () => {
    expect(viewRoute).toContain('evaluateLinkState(link)');
    expect(viewRoute).toContain("if (state !== 'active')");
    expect(viewRoute).toContain('await verifyInvestorPasswordAsync(password, link.password_hash)');
    expect(viewRoute).toContain('requiresPassword: true');
  });

  it('never serializes private documents or internal notes to investors', () => {
    expect(viewRoute).toContain('.filter(documentSharable)');
    // internal_note exists in the schema but is never selected into the payload.
    expect(viewRoute).not.toContain('internal_note');
    expect(migration).toContain('internal_note text');
    // Download URLs require the owner's explicit allow_downloads choice.
    expect(viewRoute).toContain("allowDownloads ? String(row.source_url ?? row.sourceUrl ?? '').trim() || null : null");
  });

  it('logs real access events and only known event types', () => {
    expect(viewRoute).toContain("logEvent(supabase, link, 'offer_opened', null)");
    expect(viewRoute).toContain("['pitch_deck_viewed', 'document_downloaded'].includes(eventType)");
    expect(viewRoute).toContain("logEvent(supabase, link, 'access_denied', null, { reason: state })");
  });

  it('renders the public viewer without app chrome, with password and denial states', () => {
    // Public-shell detection moved to the workspace resolver in phase 3;
    // AppLayout consumes the shared helper and /investor stays chrome-free.
    expect(appLayout).toContain('isPublicShellRoute(pathname)');
    const resolver = read('src/config/workspaces/workspace-resolver.ts');
    expect(resolver).toContain("'/investor'");
    expect(viewerPage).toContain("kind: 'password'");
    expect(viewerPage).toContain('text.viewerExpired');
    expect(viewerPage).toContain('text.viewerRevoked');
    expect(viewerPage).toContain('text.viewerDisclaimer');
    // The viewer only renders sections returned by the server.
    expect(viewerPage).toContain("sections.includes('overview')");
    expect(viewerPage).toContain("sections.includes('risks')");
  });
});
