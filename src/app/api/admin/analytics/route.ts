import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, createServerSupabaseAdmin, getUserFromBearerToken, isAdminEmail, verifyAdminSessionToken } from '@/lib/server/adminAccess';

type AnalyticsRow = {
  id: string;
  session_id: string | null;
  event_type: string;
  page_path: string | null;
  page_title: string | null;
  module: string | null;
  language: string | null;
  device_type: string | null;
  browser: string | null;
  operating_system: string | null;
  created_at: string;
};

const EVENT_LABELS = ['add_income', 'add_expense', 'create_project', 'export_report', 'use_calculator', 'open_market_analysis', 'open_financial_theories'];

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
  if (path.startsWith('/savings')) return 'Savings';
  if (path.startsWith('/goals')) return 'Goals';
  if (path.startsWith('/projects')) return 'Projects';
  if (path.startsWith('/reports')) return 'Reports';
  if (path.startsWith('/financial-theories')) return 'Financial Theories';
  if (path.startsWith('/market')) return 'Market Analysis';
  if (path.startsWith('/charity') || path.startsWith('/zakat')) return 'Charity / Zakat';
  if (path.startsWith('/business')) return 'Business Management';
  if (path.startsWith('/investment-offers')) return 'Investment Offers';
  if (path.startsWith('/profile')) return 'Profile';
  return 'Other pages';
}

function groupCount<T extends string>(rows: AnalyticsRow[], read: (row: AnalyticsRow) => T | null | undefined) {
  const map = new Map<T, number>();
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

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('sfm_access_token')?.value;
  const user = await getUserFromBearerToken(token);

  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value, user)) {
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

  let query = admin
    .from('analytics_events')
    .select('id, session_id, event_type, page_path, page_title, module, language, device_type, browser, operating_system, created_at')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())
    .order('created_at', { ascending: false })
    .limit(10000);

  if (moduleFilter !== 'all') query = query.eq('module', moduleFilter);
  if (eventFilter !== 'all') query = query.eq('event_type', eventFilter);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'analytics_load_failed' }, { status: 500 });

  const rows = (data ?? []) as AnalyticsRow[];
  const pageViews = rows.filter(row => row.event_type === 'page_view');
  const sessions = new Set(rows.map(row => row.session_id).filter(Boolean));
  const pageViewSessions = new Set(pageViews.map(row => row.session_id).filter(Boolean));
  const now = new Date();
  const today = startOfDay(now);
  const week = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const month = startOfMonth(now);

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

  const devices = groupCount(rows, row => row.device_type || 'Other').map(item => ({ ...item, percentage: percent(item.count, rows.length) }));
  const languages = groupCount(rows, row => row.language || 'unknown').map(item => ({ ...item, percentage: percent(item.count, rows.length) }));
  const importantEvents = EVENT_LABELS.map(event => ({
    event,
    count: rows.filter(row => row.event_type === event).length,
    uniqueUsers: new Set(rows.filter(row => row.event_type === event).map(row => row.session_id).filter(Boolean)).size,
  }));

  const userCountQuery = async (start?: Date) => {
    let profileQuery = admin.from('profiles').select('id', { count: 'exact', head: true });
    if (start) profileQuery = profileQuery.gte('created_at', start.toISOString());
    const result = await profileQuery;
    return result.count ?? 0;
  };

  const [totalUsers, newUsersToday, newUsersWeek, newUsersMonth] = await Promise.all([
    userCountQuery(),
    userCountQuery(today),
    userCountQuery(week),
    userCountQuery(month),
  ]);

  return NextResponse.json({
    range: { from: from.toISOString(), to: to.toISOString() },
    stats: {
      totalVisitors: sessions.size,
      visitorsToday: new Set(rows.filter(row => new Date(row.created_at) >= today).map(row => row.session_id).filter(Boolean)).size,
      visitorsWeek: new Set(rows.filter(row => new Date(row.created_at) >= week).map(row => row.session_id).filter(Boolean)).size,
      visitorsMonth: new Set(rows.filter(row => new Date(row.created_at) >= month).map(row => row.session_id).filter(Boolean)).size,
      totalPageViews: totalViews,
      pageViewsToday: countSince(rows, today, 'page_view'),
      pageViewsWeek: countSince(rows, week, 'page_view'),
      pageViewsMonth: countSince(rows, month, 'page_view'),
      uniquePageViewVisitors: pageViewSessions.size,
      totalUsers,
      newUsersToday,
      newUsersWeek,
      newUsersMonth,
    },
    pages,
    importantEvents,
    devices,
    languages,
    recent: rows.slice(0, 50).map(row => ({
      id: row.id,
      eventType: row.event_type,
      pagePath: row.page_path,
      module: row.module,
      device: row.device_type,
      language: row.language,
      createdAt: row.created_at,
    })),
    hasData: rows.length > 0,
  });
}
