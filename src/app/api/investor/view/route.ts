import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { hashInvestorToken, verifyInvestorPassword } from '@/lib/server/investorShare';
import {
  documentSharable,
  evaluateLinkState,
  normalizeSections,
  type InvestorSection,
} from '@/lib/investor/shareAccess';
import { computeReadiness } from '@/lib/investor/readiness';

export const runtime = 'nodejs';

type Row = Record<string, any>;

/**
 * Public investor access route. The ONLY path from outside a session to
 * project data: it resolves a share token to its link row with the service
 * role, enforces expiry/revocation/password, and returns strictly the
 * sections the owner selected. Private documents and internal notes are
 * filtered server-side and never serialized.
 */
function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DATABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function safeDocument(row: Row, allowDownloads: boolean) {
  return {
    id: row.id,
    name: String(row.title ?? row.name ?? row.file_name ?? '').trim() || 'document',
    category: String(row.category ?? row.document_type ?? '').trim() || null,
    updated_at: row.updated_at ?? row.uploaded_at ?? row.created_at ?? null,
    // URLs only when the owner explicitly allowed downloads for this link.
    url: allowDownloads ? String(row.source_url ?? row.sourceUrl ?? '').trim() || null : null,
  };
}

async function logEvent(
  supabase: SupabaseClient,
  link: Row,
  eventType: string,
  section: string | null,
  metadata: Record<string, unknown> = {},
) {
  try {
    await supabase.from('project_investor_events').insert({
      user_id: link.user_id,
      project_id: link.project_id,
      link_id: link.id,
      event_type: eventType,
      section,
      metadata,
    });
  } catch {
    // Activity logging must never break investor access.
  }
}

export async function POST(request: NextRequest) {
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const token = String(body.token ?? '').trim();
  if (!token) return NextResponse.json({ error: 'token_required' }, { status: 400 });

  const { data: link, error: linkError } = await supabase
    .from('project_investor_links')
    .select('*')
    .eq('token_hash', hashInvestorToken(token))
    .maybeSingle();
  if (linkError || !link) return NextResponse.json({ error: 'link_not_found' }, { status: 404 });

  const state = evaluateLinkState(link);
  if (state !== 'active') {
    await logEvent(supabase, link, 'access_denied', null, { reason: state });
    return NextResponse.json({ error: state }, { status: 410 });
  }

  if (link.password_hash) {
    const password = typeof body.password === 'string' ? body.password : '';
    if (!password) return NextResponse.json({ requiresPassword: true }, { status: 401 });
    if (!verifyInvestorPassword(password, link.password_hash)) {
      await logEvent(supabase, link, 'access_denied', null, { reason: 'wrong_password' });
      return NextResponse.json({ requiresPassword: true, error: 'wrong_password' }, { status: 401 });
    }
  }

  const action = String(body.action ?? 'view');
  const sections = normalizeSections(link.visible_sections);

  if (action === 'event') {
    const eventType = String(body.eventType ?? '').trim();
    const section = String(body.section ?? '').trim() || null;
    if (['pitch_deck_viewed', 'document_downloaded'].includes(eventType)) {
      await logEvent(supabase, link, eventType, section);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'invalid_event' }, { status: 400 });
  }

  if (action === 'question') {
    const question = String(body.question ?? '').trim().slice(0, 2000);
    if (!question) return NextResponse.json({ error: 'question_required' }, { status: 400 });
    const { error: questionError } = await supabase.from('project_investor_questions').insert({
      user_id: link.user_id,
      project_id: link.project_id,
      link_id: link.id,
      question,
      category: String(body.category ?? 'general').trim().slice(0, 60) || 'general',
      asked_by: String(body.askedBy ?? '').trim().slice(0, 120) || null,
      status: 'open',
    });
    if (questionError) return NextResponse.json({ error: 'question_failed' }, { status: 500 });
    await logEvent(supabase, link, 'question_submitted', null);
    return NextResponse.json({ ok: true });
  }

  // Default action: resolve the shared view payload.
  const userId = link.user_id as string;
  const projectId = link.project_id as string;
  const scoped = (table: string) =>
    supabase.from(table).select('*').eq('user_id', userId).eq('project_id', projectId);

  const [projectRes, feasibilityRes, financialRes, fundingRes, deckRes, documentsRes, risksRes] = await Promise.all([
    supabase.from('projects').select('id, name, notes, status, created_at, updated_at').eq('id', projectId).eq('user_id', userId).maybeSingle(),
    scoped('project_feasibility_studies').maybeSingle(),
    scoped('project_financial_models').maybeSingle(),
    scoped('project_funding_readiness').maybeSingle(),
    scoped('project_pitch_decks').limit(1),
    scoped('project_documents').limit(200),
    scoped('project_risks').limit(200),
  ]);

  const project = (projectRes.data ?? null) as Row | null;
  if (!project) return NextResponse.json({ error: 'link_not_found' }, { status: 404 });

  const documents = ((documentsRes.data ?? []) as Row[]).filter(documentSharable);
  const risks = (risksRes.data ?? []) as Row[];
  const pitchDeck = ((deckRes.data ?? []) as Row[])[0] ?? null;
  const funding = (fundingRes.data ?? null) as Row | null;
  const financialModel = (financialRes.data ?? null) as Row | null;

  const payload: Record<string, unknown> = {
    projectName: String(project.name ?? '').trim() || null,
    message: link.investor_message ?? null,
    sections,
    allowDownloads: link.allow_downloads === true,
    expiresAt: link.expires_at ?? null,
  };

  const has = (section: InvestorSection) => sections.includes(section);

  if (has('overview')) {
    payload.overview = {
      summary: String(project.notes ?? '').trim() || null,
      status: String(project.status ?? '').trim() || null,
      fundingNeeded: funding?.funding_needed ?? null,
      currency: funding?.currency ?? null,
      updatedAt: project.updated_at ?? null,
    };
  }
  if (has('readiness')) {
    payload.readiness = computeReadiness({
      project,
      feasibility: (feasibilityRes.data ?? null) as Row | null,
      financialModel,
      funding,
      pitchDeck,
      documents,
      risks,
      links: [link],
      contactEmail: null,
    });
  }
  if (has('financials')) {
    payload.financials = {
      revenueStreams: financialModel?.revenue_streams ?? [],
      costItems: financialModel?.cost_items ?? [],
      forecast: financialModel?.forecast ?? [],
      kpis: financialModel?.kpis ?? {},
      assumptions: financialModel?.assumptions ?? {},
      fundingNeeded: funding?.funding_needed ?? null,
      currency: funding?.currency ?? null,
      fundingType: funding?.funding_type ?? null,
      useOfFunds: funding?.use_of_funds ?? {},
      updatedAt: financialModel?.updated_at ?? funding?.updated_at ?? null,
    };
  }
  if (has('documents')) {
    payload.documents = documents.map(row => safeDocument(row, link.allow_downloads === true));
  }
  if (has('pitch_deck')) {
    payload.pitchDeck = pitchDeck
      ? { language: pitchDeck.language ?? 'ar', deck: pitchDeck.deck_data ?? {}, updatedAt: pitchDeck.updated_at ?? null }
      : null;
  }
  if (has('risks')) {
    payload.risks = risks.map(row => ({
      id: row.id,
      title: row.title,
      category: row.category,
      severity: row.severity,
      probability: row.probability,
      impact: row.impact,
      mitigation: row.mitigation,
      status: row.status,
    }));
  }

  await logEvent(supabase, link, 'offer_opened', null);
  try {
    await supabase
      .from('project_investor_links')
      .update({ last_accessed_at: new Date().toISOString(), access_count: Number(link.access_count ?? 0) + 1 })
      .eq('id', link.id);
  } catch {
    // Access metadata is best-effort.
  }

  return NextResponse.json(payload);
}
