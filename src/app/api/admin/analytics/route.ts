import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  createServerSupabaseAdmin,
  getUserFromBearerToken,
  isAdminAccessCodeConfigured,
  isAdminEmail,
  verifyAdminSessionToken,
} from '@/lib/server/adminAccess';

type AnalyticsRow = {
  id: string;
  session_id: string | null;
  event_type: string;
  page_path: string | null;
  page_title: string | null;
  section_name: string | null;
  module: string | null;
  language: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  operating_system: string | null;
  created_at: string;
};

const EVENT_LABELS = [
  'page_view',
  'section_view',
  'account_created',
  'login',
  'logout',
  'add_income',
  'add_expense',
  'add_saving',
  'add_goal',
  'create_project',
  'export_report',
  'use_calculator',
  'open_market_analysis',
  'open_financial_theories',
];

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

function filterStart(range: string, customFrom?: string | null) {
  const now = new Date();
  if (range === 'today') return startOfDay(now);
  if (range === '7d') return new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  if (range === '30d') return new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  if (range === 'month') return startOfMonth(now);
  if (range === 'year') return startOfYear(now);
  if (range === 'custom' && customFrom) return new Date(`${customFrom}T00:00:00`);
  return new Date(0);
}

function filterEnd(range: string, customTo?: string | null) {
  if (range === 'custom' && customTo) return new Date(`${customTo}T23:59:59.999`);
  return new Date();
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 10;
}

function pageName(path: string | null) {
  if (!path || path === '/') return 'Home';
  if (path.startsWith('/income')) return 'Income';
  if (path.startsWith('/expenses')) return 'Expenses';
  if (path.startsWith('/debts')) return 'Debts';
  if (path.startsWith('/savings')) return 'Savings';
  if (path.startsWith('/goals')) return 'Goals';
  if (path.startsWith('/projects')) return 'Projects';
  if (path.startsWith('/reports')) return 'Reports';
  if (path.startsWith('/financial-theories')) return 'Financial Theories';
  if (path.startsWith('/ebooks')) return 'E-Books';
  if (path.startsWith('/market')) return 'Market Analysis';
  if (path.startsWith('/ai')) return 'Financial AI';
  if (path.startsWith('/charity') || path.startsWith('/zakat')) return 'Charity / Zakat';
  if (path.startsWith('/business')) return 'Business Management';
  if (path.startsWith('/investment-offers')) return 'Investment Offers';
  if (path.startsWith('/profile')) return 'Profile';
  return 'Other pages';
}

function sectionName(row: AnalyticsRow) {
  return row.section_name || row.module || pageName(row.page_path);
}

function groupCount(rows: AnalyticsRow[], read: (row: AnalyticsRow) => string | null | undefined) {
  const map = new Map<string, number>();
  rows.forEach(row => {
    const key = read(row);
    if (!key) return;
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

function countSince(rows: AnalyticsRow[], start: Date, eventType?: string) {
  return rows.filter(row => (!eventType || row.event_type === eventType) && new Date(row.created_at) >= start).length;
}

function uniqueSessions(rows: AnalyticsRow[]) {
  return new Set(rows.map(row => row.session_id).filter(Boolean)).size;
}

function missingRelation(error: { code?: string } | null | undefined) {
  return error?.code === '42P01';
}

function mapLegacyRow(row: Record<string, unknown>): AnalyticsRow {
  return {
    id: String(row.id ?? ''),
    session_id: typeof row.session_id === 'string' ? row.session_id : null,
    event_type: String(row.event_type ?? ''),
    page_path: typeof row.page_path === 'string' ? row.page_path : null,
    page_title: typeof row.page_title === 'string' ? row.page_title : null,
    section_name: typeof row.section_name === 'string' ? row.section_name : null,
    module: typeof row.module === 'string' ? row.module : null,
    language: typeof row.language === 'string' ? row.language : null,
    device_type: typeof row.device_type === 'string' ? row.device_type : null,
    browser: typeof row.browser === 'string' ? row.browser : null,
    os: typeof row.os === 'string' ? row.os : null,
    operating_system: typeof row.operating_system === 'string' ? row.operating_system : null,
    created_at: String(row.created_at ?? new Date(0).toISOString()),
  };
}

async function loadAnalyticsRows(
  admin: ReturnType<typeof createServerSupabaseAdmin>,
  from: Date,
  to: Date,
  moduleFilter: string,
  eventFilter: string,
) {
  if (!admin) return { rows: [] as AnalyticsRow[], source: 'none', error: 'server_not_configured' };

  let siteQuery = admin
    .from('site_events')
    .select('id, session_id, event_type, page_path, page_title, section_name, language, device_type, browser, os, created_at')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())
    .order('created_at', { ascending: false })
    .limit(20000);

  if (moduleFilter !== 'all') siteQuery = siteQuery.eq('section_name', moduleFilter);
  if (eventFilter !== 'all') siteQuery = siteQuery.eq('event_type', eventFilter);

  const siteResult = await siteQuery;
  if (!siteResult.error) {
    return { rows: (siteResult.data ?? []).map(row => mapLegacyRow(row as Record<string, unknown>)), source: 'site_events' };
  }
  if (!missingRelation(siteResult.error)) return { rows: [] as AnalyticsRow[], source: 'site_events', error: siteResult.error.message };

  let legacyQuery = admin
    .from('analytics_events')
    .select('id, session_id, event_type, page_path, page_title, module, language, device_type, browser, operating_system, created_at')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())
    .order('created_at', { ascending: false })
    .limit(20000);

  if (moduleFilter !== 'all') legacyQuery = legacyQuery.eq('module', moduleFilter);
  if (eventFilter !== 'all') legacyQuery = legacyQuery.eq('event_type', eventFilter);

  const legacyResult = await legacyQuery;
  if (legacyResult.error) return { rows: [] as AnalyticsRow[], source: 'analytics_events', error: legacyResult.error.message };
  return { rows: (legacyResult.data ?? []).map(row => mapLegacyRow(row as Record<string, unknown>)), source: 'analytics_events' };
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('sfm_access_token')?.value;
  const user = await getUserFromBearerToken(token);

  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (isAdminAccessCodeConfigured() && !verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value, user)) {
    return NextResponse.json({ error: 'admin_code_required' }, { status: 428 });
  }

  const admin = createServerSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'server_not_configured' }, { status: 500 });

  const url = new URL(request.url);
  const range = url.searchParams.get('range') || '30d';
  const moduleFilter = url.searchParams.get('module') || 'all';
  const eventFilter = url.searchParams.get('event') || 'all';
  const from = filterStart(range, url.searchParams.get('from'));
  const to = filterEnd(range, url.searchParams.get('to'));

  const { rows, source, error } = await loadAnalyticsRows(admin, from, to, moduleFilter, eventFilter);
  if (error) return NextResponse.json({ error: 'analytics_load_failed', details: error }, { status: 500 });

  const pageViews = rows.filter(row => row.event_type === 'page_view');
  const accountEvents = rows.filter(row => row.event_type === 'account_created' || row.event_type === 'signup');
  const now = new Date();
  const today = startOfDay(now);
  const week = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const month = startOfMonth(now);
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const pageGroups = new Map<string, { pageName: string; route: string; views: number; visitors: Set<string> }>();
  pageViews.forEach(row => {
    const route = row.page_path || '/';
    const key = pageName(route);
    const group = pageGroups.get(key) ?? { pageName: key, route, views: 0, visitors: new Set<string>() };
    group.views += 1;
    if (row.session_id) group.visitors.add(row.session_id);
    pageGroups.set(key, group);
  });

  const totalViews = pageViews.length;
  const pages = Array.from(pageGroups.values()).map(group => ({
    pageName: group.pageName,
    route: group.route,
    views: group.views,
    visitors: group.visitors.size,
    percentage: percent(group.views, totalViews),
  })).sort((a, b) => b.views - a.views);

  const sections = groupCount(rows.filter(row => row.event_type === 'section_view'), sectionName)
    .map(item => ({ ...item, percentage: percent(item.count, rows.filter(row => row.event_type === 'section_view').length) }));
  const devices = groupCount(rows, row => row.device_type || 'unknown').map(item => ({ ...item, percentage: percent(item.count, rows.length) }));
  const languages = groupCount(rows, row => row.language || 'unknown').map(item => ({ ...item, percentage: percent(item.count, rows.length) }));
  const importantEvents = EVENT_LABELS.map(event => ({
    event,
    count: rows.filter(row => row.event_type === event).length,
    uniqueUsers: uniqueSessions(rows.filter(row => row.event_type === event)),
  }));

  const userCountQuery = async (start?: Date) => {
    let profileQuery = admin.from('profiles').select('id', { count: 'exact', head: true });
    if (start) profileQuery = profileQuery.gte('created_at', start.toISOString());
    const result = await profileQuery;
    if (result.error) {
      if (!start) return accountEvents.length;
      return accountEvents.filter(row => new Date(row.created_at) >= start).length;
    }
    return result.count ?? 0;
  };

  const [totalAccounts, accountsToday, accountsWeek, accountsMonth] = await Promise.all([
    userCountQuery(),
    userCountQuery(today),
    userCountQuery(week),
    userCountQuery(month),
  ]);

  const trackingRecent = rows.some(row => new Date(row.created_at) >= last24Hours);

  return NextResponse.json({
    success: true,
    source,
    range: { from: from.toISOString(), to: to.toISOString() },
    stats: {
      totalVisitors: uniqueSessions(rows),
      visitorsToday: uniqueSessions(rows.filter(row => new Date(row.created_at) >= today)),
      visitorsThisWeek: uniqueSessions(rows.filter(row => new Date(row.created_at) >= week)),
      visitorsWeek: uniqueSessions(rows.filter(row => new Date(row.created_at) >= week)),
      visitorsThisMonth: uniqueSessions(rows.filter(row => new Date(row.created_at) >= month)),
      visitorsMonth: uniqueSessions(rows.filter(row => new Date(row.created_at) >= month)),
      totalPageViews: totalViews,
      pageViewsToday: countSince(rows, today, 'page_view'),
      pageViewsThisWeek: countSince(rows, week, 'page_view'),
      pageViewsWeek: countSince(rows, week, 'page_view'),
      pageViewsThisMonth: countSince(rows, month, 'page_view'),
      pageViewsMonth: countSince(rows, month, 'page_view'),
      uniquePageViewVisitors: uniqueSessions(pageViews),
      totalAccounts,
      totalUsers: totalAccounts,
      accountsToday,
      newUsersToday: accountsToday,
      accountsThisWeek: accountsWeek,
      newUsersWeek: accountsWeek,
      accountsThisMonth: accountsMonth,
      newUsersMonth: accountsMonth,
    },
    topPages: pages,
    pages,
    topSections: sections,
    sections,
    importantEvents,
    devices,
    languages,
    recentActivity: rows.slice(0, 50).map(row => ({
      id: row.id,
      eventType: row.event_type,
      pagePath: row.page_path,
      sectionName: sectionName(row),
      module: sectionName(row),
      device: row.device_type,
      language: row.language,
      createdAt: row.created_at,
    })),
    recent: rows.slice(0, 50).map(row => ({
      id: row.id,
      eventType: row.event_type,
      pagePath: row.page_path,
      sectionName: sectionName(row),
      module: sectionName(row),
      device: row.device_type,
      language: row.language,
      createdAt: row.created_at,
    })),
    tracking: {
      enabled: true,
      recent: trackingRecent,
      label: trackingRecent ? 'active' : 'no_recent_events',
    },
    hasData: rows.length > 0,
  });
}
