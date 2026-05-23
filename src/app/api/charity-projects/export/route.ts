import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type Lang = 'ar' | 'en' | 'fr';

const LEGACY_CHARITY_PREFIX = '\u062e\u064a\u0631\u064a\u0629';

const TEXT = {
  ar: {
    executive: 'الملخص التنفيذي',
    projects: 'المشاريع الخيرية',
    donations: 'التبرعات',
    zakatAssets: 'أصول الزكاة',
    commitments: 'الالتزامات الخيرية',
    noData: 'لا توجد بيانات',
    totalDonations: 'إجمالي التبرعات',
    activeProjects: 'عدد المشاريع النشطة',
    completedProjects: 'عدد المشاريع المكتملة',
    expectedCommitments: 'الالتزامات المتوقعة',
    estimatedZakat: 'زكاة المال المتوقعة',
  },
  en: {
    executive: 'Executive Summary',
    projects: 'Charity Projects',
    donations: 'Donations',
    zakatAssets: 'Zakat Assets',
    commitments: 'Charity Commitments',
    noData: 'No data',
    totalDonations: 'Total donations',
    activeProjects: 'Active projects count',
    completedProjects: 'Completed projects count',
    expectedCommitments: 'Expected commitments',
    estimatedZakat: 'Estimated zakat',
  },
  fr: {
    executive: 'Résumé exécutif',
    projects: 'Projets caritatifs',
    donations: 'Dons',
    zakatAssets: 'Actifs de zakat',
    commitments: 'Engagements caritatifs',
    noData: 'Aucune donnée',
    totalDonations: 'Total des dons',
    activeProjects: 'Nombre de projets actifs',
    completedProjects: 'Nombre de projets terminés',
    expectedCommitments: 'Engagements prévus',
    estimatedZakat: 'Zakat estimée',
  },
} as const;

function getSupabase(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function yearOf(value?: string | null) {
  if (!value) return null;
  const year = new Date(`${String(value).slice(0, 10)}T00:00:00`).getFullYear();
  return Number.isFinite(year) ? year : null;
}

function csvCell(value: unknown) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function row(values: unknown[]) {
  return values.map(csvCell).join(',');
}

function addSection(rows: string[], title: string, headers: string[], dataRows: unknown[][], noData: string) {
  rows.push('');
  rows.push(row([title]));
  rows.push(row(headers));
  if (dataRows.length === 0) rows.push(row([title, noData]));
  else dataRows.forEach(dataRow => rows.push(row(dataRow)));
}

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const year = Number(searchParams.get('year')) || new Date().getFullYear();
  const lang = ((searchParams.get('lang') || 'en') as Lang);
  const tr = TEXT[lang] ?? TEXT.en;
  const supabase = getSupabase(token);
  if (!supabase) return NextResponse.json({ success: false, error: 'Supabase is not configured' }, { status: 500 });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const [projectRes, donationRes, assetRes, commitmentRes, legacyRes] = await Promise.all([
    supabase.from('charity_projects').select('*').eq('user_id', user.id),
    supabase.from('charity_project_donations').select('*').eq('user_id', user.id),
    supabase.from('zakat_assets').select('*').eq('user_id', user.id),
    supabase.from('charity_commitments').select('*').eq('user_id', user.id),
    supabase.from('expense_items').select('id,name,amount,created_at').eq('user_id', user.id).like('name', `${LEGACY_CHARITY_PREFIX}:%`),
  ]);

  const projects = (projectRes.error ? [] : projectRes.data ?? []).filter((project: any) =>
    [yearOf(project.start_date), yearOf(project.end_date), yearOf(project.created_at)].includes(year)
  );
  const projectNames = new Map(projects.map((project: any) => [project.id, project.name]));
  const linkedDonations = (donationRes.error ? [] : donationRes.data ?? [])
    .filter((donation: any) => yearOf(donation.donation_date || donation.created_at) === year)
    .map((donation: any) => ({ ...donation, project_name: projectNames.get(donation.project_id) || '' }));
  const legacyDonations = (legacyRes.error ? [] : legacyRes.data ?? [])
    .filter((donation: any) => yearOf(donation.created_at) === year)
    .map((donation: any) => {
      const parts = String(donation.name || '').split(':');
      return {
        donation_date: donation.created_at,
        amount: donation.amount,
        currency: 'KWD',
        donation_type: parts[2] || 'charity',
        project_name: '',
        notes: parts[2] || '',
      };
    });
  const donations = [...linkedDonations, ...legacyDonations];
  const assets = (assetRes.error ? [] : assetRes.data ?? []).filter((asset: any) =>
    yearOf(asset.zakat_due_date || asset.ownership_date) === year || asset.is_zakatable
  );
  const commitments = (commitmentRes.error ? [] : commitmentRes.data ?? []).filter((commitment: any) =>
    !commitment.next_due_date || yearOf(commitment.next_due_date) === year
  );

  const totalDonations = donations.reduce((sum: number, donation: any) => sum + safeNumber(donation.amount), 0);
  const zakatableAmount = assets.filter((asset: any) => asset.is_zakatable !== false).reduce((sum: number, asset: any) => sum + safeNumber(asset.amount), 0);
  const estimatedZakat = zakatableAmount * 0.025;
  const expectedCommitments = commitments.reduce((sum: number, item: any) => {
    const amount = safeNumber(item.amount);
    return sum + (item.frequency === 'monthly' ? amount * 12 : amount);
  }, 0) + estimatedZakat;

  const rows: string[] = [];
  rows.push(row(['THE SFM Charity Projects Export', year]));

  addSection(rows, tr.executive, ['section', 'label', 'value', 'currency', 'year'], [
    [tr.executive, tr.totalDonations, totalDonations, 'KWD', year],
    [tr.executive, tr.activeProjects, projects.filter((project: any) => !['completed', 'paused'].includes(project.status)).length, '', year],
    [tr.executive, tr.completedProjects, projects.filter((project: any) => project.status === 'completed').length, '', year],
    [tr.executive, tr.expectedCommitments, expectedCommitments, 'KWD', year],
    [tr.executive, tr.estimatedZakat, estimatedZakat, 'KWD', year],
  ], tr.noData);

  addSection(rows, tr.projects, ['project_name', 'category', 'status', 'target_amount', 'collected_amount', 'currency', 'progress_percent', 'organization_name', 'start_date', 'end_date', 'notes'], projects.map((project: any) => {
    const target = safeNumber(project.target_amount);
    const collected = safeNumber(project.collected_amount);
    return [project.name, project.category, project.status, target, collected, project.currency || 'KWD', target > 0 ? Math.min(100, collected / target * 100).toFixed(1) : 0, project.organization_name, project.start_date, project.end_date, project.notes];
  }), tr.noData);

  addSection(rows, tr.donations, ['donation_date', 'amount', 'currency', 'donation_type', 'project_name', 'notes'], donations.map((donation: any) => [
    donation.donation_date || donation.created_at,
    safeNumber(donation.amount),
    donation.currency || 'KWD',
    donation.donation_type,
    donation.project_name,
    donation.notes,
  ]), tr.noData);

  addSection(rows, tr.zakatAssets, ['asset_name', 'asset_type', 'amount', 'currency', 'ownership_date', 'zakat_due_date', 'is_zakatable', 'estimated_zakat', 'notes'], assets.map((asset: any) => [
    asset.asset_name,
    asset.asset_type,
    safeNumber(asset.amount),
    asset.currency || 'KWD',
    asset.ownership_date,
    asset.zakat_due_date,
    asset.is_zakatable !== false,
    asset.is_zakatable === false ? 0 : safeNumber(asset.amount) * 0.025,
    asset.notes,
  ]), tr.noData);

  addSection(rows, tr.commitments, ['name', 'amount', 'currency', 'frequency', 'next_due_date', 'category', 'status'], commitments.map((commitment: any) => [
    commitment.name,
    safeNumber(commitment.amount),
    commitment.currency || 'KWD',
    commitment.frequency,
    commitment.next_due_date,
    commitment.category,
    commitment.status,
  ]), tr.noData);

  const csv = `\uFEFF${rows.join('\r\n')}\r\n`;
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="charity-report-${year}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
