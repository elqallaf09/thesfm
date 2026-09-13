import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { createAdminApiRoute } from '@/lib/server/adminApiRoute';
import { isNonProductionAnalyticsReferrer } from '@/lib/server/analyticsTraffic';

type AnalyticsRow = {
  id: string;
  session_id: string | null;
  event_type: string;
  page_path: string | null;
  page_title: string | null;
  section_name: string | null;
  module: string | null;
  referrer: string | null;
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
  scannedRows?: number;
  excludedRows?: number;
  truncated?: boolean;
};

type SessionLoadResult = {
  sessions: SessionRow[];
  error?: string;
  code?: string;
  scannedRows?: number;
  excludedRows?: number;
  truncated?: boolean;
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

// Supabase/PostgREST commonly caps one response at 1,000 rows even when a larger
// .limit() is requested. Read in pages so dashboard totals are not silently clipped.
const ANALYTICS_PAGE_SIZE = 1000;
const ANALYTICS_MAX_SCAN_ROWS = 100000;
const KUWAIT_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfKuwaitDay(date: Date) {
  const shifted = new Date(date.getTime() + KUWAIT_OFFSET_MS);
  return new Date(Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  ) - KUWAIT_OFFSET_MS);
}

function startOfKuwaitMonth(date: Date) {
  const shifted = new Date(date.getTime() + KUWAIT_OFFSET_MS);
  return new Date(Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    1,
  ) - KUWAIT_OFFSET_MS);
}

function startOfKuwaitYear(date: Date) {
  const shifted = new Date(date.getTime() + KUWAIT_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), 0, 1) - KUWAIT_OFFSET_MS);
}

function parseKuwaitDate(value: string | null | undefined, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const suffix = endOfDay ? 'T23:59:59.999+03:00' : 'T00:00:00.000+03:00';
  const parsed = new Date(`${value}${suffix}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function filterStart(range: string, customFrom?: string | null) {
  const now = new Date();
  const today = startOfKuwaitDay(now);
  if (range === 'today') return today;
  if (range === '7d') return new Date(today.getTime() - 6 * DAY_MS);
  if (range === '30d') return new Date(today.getTime() - 29 * DAY_MS);
  if (range === 'month') return startOfKuwaitMonth(now);
  if (range === 'year') return startOfKuwaitYear(now);
  if (range === 'custom') return parseKuwaitDate(customFrom) ?? today;
  return new Date(0);
}

function filterEnd(range: string, customTo?: string | null) {
  if (range === 'custom') return parseKuwaitDate(customTo, true) ?? new Date();
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
  if (path.startsWith('/charity') || path.startsWith('/zakat') || path.startsWith('/khums')) return 'Charity / Zakat';
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
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function countSince(rows: AnalyticsRow[], start: Date, eventType?: string) {
  return rows.filter(row => (
    (!eventType || row.event_type === eventType)
    && new Date(row.created_at) >= start
  )).length;
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
    quality: {
      productionOnly: true,
      paginated: true,
      truncated: false,
      scannedEventRows: 0,
      excludedEventRows: 0,
      scannedSessionRows: 0,
      excludedSessionRows: 0,
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
    error?.code === '42P01'
    || error?.code === '42703'
    || error?.code === 'PGRST204'
    || error?.code === 'PGRST205'
    || message.includes('schema cache')
    || message.includes('does not exist')
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
  if (path.startsWith('/charity') || path.startsWith('/zakat') || path.startsWith('/khums')) return 'charity';
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
    referrer: typeof row.referrer === 'string' ? row.referrer : null,
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

async function loadEventTable(
  admin: NonNullable<ReturnType<typeof createServerSupabaseAdmin>>,
  table: 'site_events' | 'analytics_events',
  from: Date,
  to: Date,
) {
  const mapped: AnalyticsRow[] = [];
  let scannedRows = 0;
  let truncated = true;

  for (let offset = 0; offset < ANALYTICS_MAX_SCAN_ROWS; offset += ANALYTICS_PAGE_SIZE) {
    const result = await admin
      .from(table)
      .select('*')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + ANALYTICS_PAGE_SIZE - 1);

    if (result.error) {
      return {
        rows: [] as AnalyticsRow[],
        scannedRows,
        truncated: false,
        error: result.error,
      };
    }

    const page = result.data ?? [];
    scannedRows += page.length;
    mapped.push(...page.map(row => mapLegacyRow(row as Record<string, unknown>)));

    if (page.length < ANALYTICS_PAGE_SIZE) {
      truncated = false;
      break;
    }
  }

  return { rows: mapped, scannedRows, truncated, error: null };
}

async function loadAnalyticsRows(
  admin: ReturnType<typeof createServerSupabaseAdmin>,
  from: Date,
  to: Date,
  moduleFilter: string,
  eventFilter: string,
): Promise<AnalyticsLoadResult> {
  if (!admin) return { rows: [], source: 'none', code: 'ANALYTICS_SERVICE_NOT_CONFIGURED' };

  let result = await loadEventTable(admin, 'site_events', from, to);
  let source = 'site_events';

  if (result.error) {
    if (!schemaRelatedError(result.error)) {
      return { rows: [], source, error: result.error.message };
    }

    result = await loadEventTable(admin, 'analytics_events', from, to);
    source = 'analytics_events';
    if (result.error) {
      if (schemaRelatedError(result.error) || missingRelation(result.error)) {
        return { rows: [], source: 'none', code: 'ANALYTICS_TABLES_MISSING' };
      }
      return { rows: [], source, error: result.error.message };
    }
  }

  const productionRows = result.rows.filter(row => !isNonProductionAnalyticsReferrer(row.referrer));
  const filteredRows = applyFilters(productionRows, moduleFilter, eventFilter);

  return {
    rows: filteredRows,
    source,
    scannedRows: result.scannedRows,
    excludedRows: result.rows.length - productionRows.length,
    truncated: result.truncated,
  };
}

async function loadSessionRows(
  admin: ReturnType<typeof createServerSupabaseAdmin>,
  from: Date,
  to: Date,
): Promise<SessionLoadResult> {
  if (!admin) return { sessions: [], code: 'ANALYTICS_SERVICE_NOT_CONFIGURED' };

  const mapped: SessionRow[] = [];
  let scannedRows = 0;
  let truncated = true;

  for (let offset = 0; offset < ANALYTICS_MAX_SCAN_ROWS; offset += ANALYTICS_PAGE_SIZE) {
    const result = await admin
      .from('site_sessions')
      .select('session_id,user_id,first_seen_at,last_seen_at,language,device_type,browser,os,referrer,created_at')
      .gte('last_seen_at', from.toISOString())
      .lte('first_seen_at', to.toISOString())
      .order('session_id', { ascending: true })
      .range(offset, offset + ANALYTICS_PAGE_SIZE - 1);

    if (result.error) {
      if (schemaRelatedError(result.error) || missingRelation(result.error)) {
        return { sessions: [], code: 'ANALYTICS_SESSIONS_TABLE_MISSING' };
      }
      return { sessions: [], error: result.error.message };
    }

    const page = result.data ?? [];
    scannedRows += page.length;
    mapped.push(...page.map(row => mapSessionRow(row as Record<string, unknown>)));

    if (page.length < ANALYTICS_PAGE_SIZE) {
      truncated = false;
      break;
    }
  }

  const productionSessions = mapped
    .filter(session => session.session_id && !isNonProductionAnalyticsReferrer(session.referrer))
    .sort((a, b) => {
      const aTime = new Date(a.last_seen_at ?? a.created_at ?? 0).getTime();
      const bTime = new Date(b.last_seen_at ?? b.created_at ?? 0).getTime();
      return bTime - aTime;
    });

  return {
    sessions: productionSessions,
    scannedRows,
    excludedRows: mapped.length - productionSessions.length,
    truncated,
  };
}

const analyticsRoute = createAdminApiRoute({ permission: 'admin_dashboard' }, async ({ request, auth, json }) => {
  const url = new URL(request.url);
  const range = url.searchParams.get('range') || '30d';
  const moduleFilter = url.searchParams.get('module') || 'all';
  const eventFilter = url.searchParams.get('event') || 'all';
  const from = filterStart(range, url.searchParams.get('from'));
  const to = filterEnd(range, url.searchParams.get('to'));

  const admin = auth.admin;
  if (!admin) {
    console.warn('[admin-analytics] service role is not configured; returning empty analytics payload');
    return json(
      emptyAnalyticsPayload('none', from, to, { code: 'ANALYTICS_SERVICE_NOT_CONFIGURED', trackingEnabled: false }),
      { status: 200 },
    );
  }

  const [analyticsLoad, sessionLoad] = await Promise.all([
    loadAnalyticsRows(admin, from, to, moduleFilter, eventFilter),
    loadSessionRows(admin, from, to),
  ]);

  const { rows, source, error, code } = analyticsLoad;
  const effectiveSource = source === 'none' && sessionLoad.sessions.length ? 'site_sessions' : source;

  if (code === 'ANALYTICS_TABLES_MISSING' && sessionLoad.sessions.length === 0) {
    console.warn('[admin-analytics] analytics tables are missing; returning empty analytics payload');
    return json(emptyAnalyticsPayload(source, from, to, { code }), { status: 200 });
  }

  if (code === 'ANALYTICS_TABLES_MISSING' && sessionLoad.sessions.length > 0) {
    console.warn('[admin-analytics] event analytics table is missing; continuing with session data only');
  }

  if (sessionLoad.error) {
    console.warn('[admin-analytics] session analytics load failed; continuing with event data only', {
      error: sessionLoad.error,
    });
  }

  if (analyticsLoad.truncated || sessionLoad.truncated) {
    console.warn('[admin-analytics] analytics safety scan limit reached', {
      scannedEventRows: analyticsLoad.scannedRows ?? 0,
      scannedSessionRows: sessionLoad.scannedRows ?? 0,
    });
  }

  if (error) {
    console.error('[admin-analytics] analytics load failed', { source, error });
    return json({
      ok: false,
      success: false,
      code: 'ANALYTICS_LOAD_FAILED',
      source,
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
    }, { status: 500 });
  }

  const pageViews = rows.filter(row => row.event_type === 'page_view');
  const accountEvents = rows.filter(row => row.event_type === 'account_created' || row.event_type === 'signup');
  const now = new Date();
  const today = startOfKuwaitDay(now);
  const week = new Date(today.getTime() - 6 * DAY_MS);
  const month = startOfKuwaitMonth(now);
  const last24Hours = new Date(now.getTime() - DAY_MS);
  const sessions = sessionLoad.sessions;
  const canUseSessionStats = moduleFilter === 'all' && eventFilter === 'all';

  const visitorTotal = canUseSessionStats && sessions.length ? sessions.length : uniqueSessions(rows);
  const visitorsToday = canUseSessionStats && sessions.length
    ? countSessionsSince(sessions, today)
    : uniqueSessions(rows.filter(row => new Date(row.created_at) >= today));
  const visitorsWeek = canUseSessionStats && sessions.length
    ? countSessionsSince(sessions, week)
    : uniqueSessions(rows.filter(row => new Date(row.created_at) >= week));
  const visitorsMonth = canUseSessionStats && sessions.length
    ? countSessionsSince(sessions, month)
    : uniqueSessions(rows.filter(row => new Date(row.created_at) >= month));

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
  const pages = Array.from(pageGroups.values())
    .map(group => ({
      pageName: group.pageName,
      route: group.route,
      views: group.views,
      visitors: group.visitors.size,
      percentage: percent(group.views, totalViews),
    }))
    .sort((a, b) => b.views - a.views);

  const sections = groupCount(rows, rowModule)
    .map(item => ({ ...item, percentage: percent(item.count, rows.length) }))
    .slice(0, 12);

  // Device/language distributions should represent visitors, not raw event volume.
  const useSessionBreakdowns = canUseSessionStats && sessions.length > 0;
  const devices = useSessionBreakdowns
    ? groupCount(sessions, row => row.device_type || 'unknown')
      .map(item => ({ ...item, percentage: percent(item.count, sessions.length) }))
    : groupCount(rows, row => row.device_type || 'unknown')
      .map(item => ({ ...item, percentage: percent(item.count, rows.length) }));
  const languages = useSessionBreakdowns
    ? groupCount(sessions, row => row.language || 'unknown')
      .map(item => ({ ...item, percentage: percent(item.count, sessions.length) }))
    : groupCount(rows, row => row.language || 'unknown')
      .map(item => ({ ...item, percentage: percent(item.count, rows.length) }));

  const importantEvents = EVENT_LABELS
    .map(event => {
      const eventRows = rows.filter(row => row.event_type === event);
      return {
        event,
        count: eventRows.length,
        uniqueUsers: uniqueSessions(eventRows),
      };
    })
    .filter(item => item.count > 0);

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

  const recentRows = rows.slice(0, 50).map(row => ({
    id: row.id,
    eventType: row.event_type,
    pagePath: row.page_path,
    sectionName: sectionName(row),
    module: sectionName(row),
    device: row.device_type,
    language: row.language,
    createdAt: row.created_at,
  }));

  return json({
    ok: true,
    success: true,
    code: analyticsLoad.truncated || sessionLoad.truncated ? 'ANALYTICS_SCAN_LIMIT_REACHED' : undefined,
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
    recentActivity: recentRows,
    recent: recentRows,
    tracking: {
      enabled: true,
      recent: trackingRecent,
      label: trackingRecent ? 'active' : 'no_recent_events',
      lastEventAt,
    },
    quality: {
      productionOnly: true,
      paginated: true,
      truncated: Boolean(analyticsLoad.truncated || sessionLoad.truncated),
      scannedEventRows: analyticsLoad.scannedRows ?? 0,
      excludedEventRows: analyticsLoad.excludedRows ?? 0,
      scannedSessionRows: sessionLoad.scannedRows ?? 0,
      excludedSessionRows: sessionLoad.excludedRows ?? 0,
    },
    hasData: rows.length > 0 || (canUseSessionStats && sessions.length > 0),
  });
});

export const GET = analyticsRoute;
export const POST = analyticsRoute;
