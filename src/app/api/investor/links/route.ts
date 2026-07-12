import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateInvestorToken, hashInvestorPassword, hashInvestorToken } from '@/lib/server/investorShare';
import { normalizeSections } from '@/lib/investor/shareAccess';

export const runtime = 'nodejs';

function getUserClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/**
 * Creates a secure investor share link for a project the caller owns.
 * The raw token is returned exactly once; only its SHA-256 hash is stored.
 * All writes run through the caller's own session, so RLS ownership rules
 * stay fully in force.
 */
export async function POST(request: NextRequest) {
  const authToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!authToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = getUserClient(authToken);
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const { data: userData, error: userError } = await supabase.auth.getUser(authToken);
  const user = userData?.user;
  if (userError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const projectId = String(body.projectId ?? '').trim();
  if (!projectId) return NextResponse.json({ error: 'project_required' }, { status: 400 });

  // Confirm ownership through the caller's own RLS-scoped session.
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (projectError || !project) return NextResponse.json({ error: 'project_not_found' }, { status: 404 });

  const sections = normalizeSections(body.sections);
  if (sections.length === 0) return NextResponse.json({ error: 'sections_required' }, { status: 400 });

  const expiresAtRaw = String(body.expiresAt ?? '').trim();
  let expiresAt: string | null = null;
  if (expiresAtRaw) {
    const parsed = new Date(expiresAtRaw).getTime();
    if (!Number.isFinite(parsed)) return NextResponse.json({ error: 'invalid_expiry' }, { status: 400 });
    if (parsed <= Date.now()) return NextResponse.json({ error: 'expiry_in_past' }, { status: 400 });
    expiresAt = new Date(parsed).toISOString();
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (password && password.length < 6) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 });
  }

  const rawToken = generateInvestorToken();
  const insert = {
    user_id: user.id,
    project_id: projectId,
    label: String(body.label ?? '').trim().slice(0, 120) || null,
    token_hash: hashInvestorToken(rawToken),
    password_hash: password ? hashInvestorPassword(password) : null,
    investor_message: String(body.message ?? '').trim().slice(0, 2000) || null,
    visible_sections: sections,
    allow_downloads: body.allowDownloads === true,
    expires_at: expiresAt,
  };

  const { data: created, error: insertError } = await supabase
    .from('project_investor_links')
    .insert(insert)
    .select('id, label, visible_sections, allow_downloads, expires_at, created_at')
    .single();
  if (insertError || !created) {
    return NextResponse.json({ error: 'link_create_failed' }, { status: 500 });
  }

  // The only time the raw token ever leaves the server.
  return NextResponse.json({ link: created, token: rawToken });
}
