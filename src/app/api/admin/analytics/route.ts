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

type SessionRow = {
  session_id: string;
  user_id: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  language: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  created_at: string | null;
};

type AnalyticsLoadResult = {
  rows: AnalyticsRow[];
  source: string;
  error?: string;
  code?: string;
};

type SessionLoadResult = {
  sessions: SessionRow[];
  error?: string;
  code?: string;
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

function groupCount<T>(rows: T[], read: (row: T) => string | null | undefined) {
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

function countSessionsSince(sessions: SessionRow[], start: Date) {
  return sessions.filter(session => {
    const activityDate = new Date(session.last_seen_at ?? session.created_at ?? 0);
    return !Number.isNaN(activityDate.getTime()) && activityDate >= start;
  }).length;
}

function zeroStats() {
  return {
    totalVisitors: 0,
    visitorsToday: 0,
    visitorsThisWeek: 0,
    visitorsWeek: 0,
    visitorsThisMonth: 0,
    visitorsMonth: 0,
    totalPageViews: 0,
    pageViewsToday: 0,
    pageViewsThisWeek: 0,
    pageViewsWeek: 0,
    pageViewsThisMonth: 0,
    pageViewsMonth: 0,
    uniquePageViewVisitors: 0,
    totalAccounts: 0,
    totalUsers: 0,
    accountsToday: 0,
    newUsersToday: 0,
    accountsThisWeek: 0,
    newUsersWeek: 0,
    accountsThisMonth: 0,
    newUsersMonth: 0,
  };
}

function emptyAnalyticsPayload(
  source: string,
  from: Date,
  to: Date,
  options: { code?: string; trackingEnabled?: boolean } = {},
) {
  return {
    ok: true,
    success: true,
    code: options.code,
    source,
    range: { from: from.toISOString(), to: to.toISOString() },
    stats: zeroStats(),
    topPages: [],
    pages: [],
    topSections: [],
    sections: [],
    importantEvents: [],
    devices: [],
    languages: [],
    recentActivity: [],
    recent: [],
    tracking: {
      enabled: options.trackingEnabled ?? true,
      recent: false,
      label: options.trackingEnabled === false ? 'disabled' : 'no_recent_events',
      lastEventAt: null,
    },
    hasData: false,
  };
}

function missingRelation(error: { code?: string } | null | undefined) {
  return error?.code === '42P01';
}

function schemaRelatedError(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? '';
  return (
    error?.code === '42P01' ||
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    error?.code === 'PGRST205' ||
    message.includes('schema cache') ||
    message.includes('does not exist')
  );
}

function moduleFromPath(path: string | null) {
  if (!path || path === '/') return 'home';
  if (path.startsWith('/income')) return 'income';
  if (path.startsWith('/expenses')) return 'expenses';
  if (path.startsWith('/debts')) return 'debts';
  if (path.startsWith('/savings')) return 'savings';
  if (path.startsWith('/goals')) return 'goals';
  if (path.startsWith('/projects')) return 'projects';
  if (path.startsWith('/reports')) return 'reports';
  if (path.startsWith('/financial-theories')) return 'financial_theories';
  if (path.startsWith('/ebooks')) return 'ebooks';
  if (path.startsWith('/market')) return 'market';
  if (path.startsWith('/ai')) return 'financial_ai';
  if (path.startsWith('/charity') || path.startsWith('/zakat')) return 'charity';
  if (path.startsWith('/business')) return 'business';
  if (path.startsWith('/investment-offers')) return 'investment_offers';
  if (path.startsWith('/profile')) return 'profile';
  return 'other';
}

function rowModule(row: AnalyticsRow) {
  return row.section_name || row.module || moduleFromPath(row.page_path);
}

function applyFilters(rows: AnalyticsRow[], moduleFilter: string, eventFilter: string) {
  return rows.filter(row => {
    if (moduleFilter !== 'all' && rowModule(row) !== moduleFilter) return false;
    if (eventFilter !== 'all' && row.event_type !== eventFilter) return false;
    return true;
  });
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

function mapSessionRow(row: Record<string, unknown>): SessionRow {
  return {
    session_id: String(row.session_id ?? ''),
    user_id: typeof row.user_id === 'string' ? row.user_id : null,
    first_seen_at: typeof row.first_seen_at === 'string' ? row.first_seen_at : null,
    last_seen_at: typeof row.last_seen_at === 'string' ? row.last_seen_at : null,
    language: typeof row.language === 'string' ? row.language : null,
    device_type: typeof row.device_type === 'string' ? row.device_type : null,
    browser: typeof row.browser === 'string' ? row.browser : null,
    os: typeof row.os === 'string' ? row.os : null,
    referrer: typeof row.referrer === 'string' ? row.referrer : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : null,
  };
}

async function loadAnalyticsRows(
  admin: ReturnType<typeof createServerSupabaseAdmin>,
  from: Date,
  to: Date,
  moduleFilter: string,
  eventFilter: string,
): Promise<AnalyticsLoadResult> {
  if (!admin) return { rows: [], source: 'none', code: 'ANALYTICS_SERVICE_NOT_CONFIGURED' };

  let siteQuery = admin
    .from('site_events')
    .select('*')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())
    .order('created_at', { ascending: false })
    .limit(20000);

  const siteResult = await siteQuery;
  if (!siteResult.error) {
    return {
      rows: applyFilters((siteResult.data ?? []).map(row => mapLegacyRow(row as Record<string, unknown>)), moduleFilter, eventFilter),
      source: 'site_events',
    };
  }
  if (!schemaRelatedError(siteResult.error)) return { rows: [] as AnalyticsRow[], source: 'site_events', error: siteResult.error.message };

  let legacyQuery = admin
    .from('analytics_events')
    .select('*')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())
    .order('created_at', { ascending: false })
    .limit(20000);

  const legacyResult = await legacyQuery;
  if (legacyResult.error) {
    if (schemaRelatedError(legacyResult.error) || missingRelation(legacyResult.error)) {
      return { rows: [], source: 'none', code: 'ANALYTICS_TABLES_MISSING' };
    }
    return { rows: [], source: 'analytics_events', error: legacyResult.error.message };
  }
  return {
    rows: applyFilters((legacyResult.data ?? []).map(row => mapLegacyRow(row as Record<string, unknown>)), moduleFilter, eventFilter),
    source: 'analytics_events',
  };
}

async function loadSessionRows(
  admin: ReturnType<typeof createServerSupabaseAdmin>,
  from: Date,
  to: Date,
): Promise<SessionLoadResult> {
  if (!admin) return { sessions: [], code: 'ANALYTICS_SERVICE_NOT_CONFIGURED' };

  const sessionResult = await admin
    .from('site_sessions')
    .select('session_id,user_id,first_seen_at,last_seen_at,language,device_type,browser,os,referrer,created_at')
    .gte('last_seen_at', from.toISOString())
    .lte('first_seen_at', to.toISOString())
    .order('last_seen_at', { ascending: false })
    .limit(20000);

  if (sessionResult.error) {
    if (schemaRelatedError(sessionResult.error) || missingRelation(sessionResult.error)) {
      return { sessions: [], code: 'ANALYTICS_SESSIONS_TABLE_MISSING' };
    }
    return { sessions: [], error: sessionResult.error.message };
  }

  return {
    sessions: (sessionResult.data ?? [])
      .map(row => mapSessionRow(row as Record<string, unknown>))
      .filter(session => session.session_id),
  };
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

  const url = new URL(request.url);
  const range = url.searchParams.get('range') || '30d';
  const moduleFilter = url.searchParams.get('module') || 'all';
  const eventFilter = url.searchParams.get('event') || 'all';
  const from = filterStart(range, url.searchParams.get('from'));
  const to = filterEnd(range, url.searchParams.get('to'));

  const admin = createServerSupabaseAdmin();
  if (!admin) {
    console.warn('[admin-analytics] service role is not configured; returning empty analytics payload');
    return NextResponse.json(
      emptyAnalyticsPayload('none', from, to, { code: 'ANALYTICS_SERVICE_NOT_CONFIGURED', trackingEnabled: false }),
      { status: 200 },
    );
  }

  const [{ rows, source, error, code }, sessionLoad] = await Promise.all([
    loadAnalyticsRows(admin, from, to, moduleFilter, eventFilter),
    loadSessionRows(admin, from, to),
  ]);
  const effectiveSource = source === 'none' && sessionLoad.sessions.length ? 'site_sessions' : source;
  if (code === 'ANALYTICS_TABLES_MISSING' && sessionLoad.sessions.length === 0) {
    console.warn('[admin-analytics] analytics tables are missing; returning empty analytics payload');
    return NextResponse.json(emptyAnalyticsPayload(source, from, to, { code }), { status: 200 });
  }
  if (code === 'ANALYTICS_TABLES_MISSING' && sessionLoad.sessions.length > 0) {
    console.warn('[admin-analytics] event analytics table is missing; continuing with session data only');
  }
  if (sessionLoad.error) {
    console.warn('[admin-analytics] session analytics load failed; continuing with event data only', {
      error: sessionLoad.error,
    });
  }
  if (error) {
    console.error('[admin-analytics] analytics load failed', { source, error });
    return NextResponse.json({
      ok: false,
      success: false,
      code: 'ANALYTICS_LOAD_FAILED',
      source,
      stats: zeroStats(),
      topPages: [],
      pages: [],
      topSections: [],
      sections: [],
      devices: [],
      languages: [],
      recentActivity: [],
      recent: [],
    }, { status: 500 });
  }

  const pageViews = rows.filter(row => row.event_type === 'page_view');
  const accountEvents = rows.filter(row => row.event_type === 'account_created' || row.event_type === 'signup');
  const now = new Date();
  const today = startOfDay(now);
  const week = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const month = startOfMonth(now);
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sessions = sessionLoad.sessions;
  const canUseSessionStats = moduleFilter === 'all' && eventFilter === 'all';
  const visitorTotal = canUseSessionStats && sessions.length ? sessions.length : uniqueSessions(rows);
  const visitorsToday = canUseSessionStats && sessions.length ? countSessionsSince(sessions, today) : uniqueSessions(rows.filter(row => new Date(row.created_at) >= today));
  const visitorsWeek = canUseSessionStats && sessions.length ? countSessionsSince(sessions, week) : uniqueSessions(rows.filter(row => new Date(row.created_at) >= week));
  const visitorsMonth = canUseSessionStats && sessions.length ? countSessionsSince(sessions, month) : uniqueSessions(rows.filter(row => new Date(row.created_at) >= month));

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

  const sections = groupCount(rows, rowModule)
    .map(item => ({ ...item, percentage: percent(item.count, rows.length) }))
    .slice(0, 12);
  const useSessionBreakdowns = canUseSessionStats && rows.length === 0 && sessions.length > 0;
  const devices = !useSessionBreakdowns
    ? groupCount(rows, row => row.device_type || 'unknown').map(item => ({ ...item, percentage: percent(item.count, rows.length) }))
    : groupCount(sessions, row => row.device_type || 'unknown').map(item => ({ ...item, percentage: percent(item.count, sessions.length) }));
  const languages = !useSessionBreakdowns
    ? groupCount(rows, row => row.language || 'unknown').map(item => ({ ...item, percentage: percent(item.count, rows.length) }))
    : groupCount(sessions, row => row.language || 'unknown').map(item => ({ ...item, percentage: percent(item.count, sessions.length) }));
  const importantEvents = EVENT_LABELS.map(event => {
    const eventRows = rows.filter(row => row.event_type === event);
    return {
      event,
      count: eventRows.length,
      uniqueUsers: uniqueSessions(eventRows),
    };
  }).filter(item => item.count > 0);

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

  const trackingRecent = rows.some(row => new Date(row.created_at) >= last24Hours)
    || sessions.some(session => new Date(session.last_seen_at ?? session.created_at ?? 0) >= last24Hours);
  const lastEventAt = rows[0]?.created_at ?? sessions[0]?.last_seen_at ?? sessions[0]?.created_at ?? null;

  return NextResponse.json({
    ok: true,
    success: true,
    source: effectiveSource,
    range: { from: from.toISOString(), to: to.toISOString() },
    stats: {
      totalVisitors: visitorTotal,
      visitorsToday,
      visitorsThisWeek: visitorsWeek,
      visitorsWeek,
      visitorsThisMonth: visitorsMonth,
      visitorsMonth,
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
      lastEventAt,
    },
    hasData: rows.length > 0 || (canUseSessionStats && sessions.length > 0),
  });
}

export async function POST(request: Request) {
  return GET(request);
}
