const protectedApiPrefixes = [
  '/api/account',
  '/api/admin',
  '/api/ai/receipt-scan',
  '/api/business',
  '/api/charity-projects/export',
  '/api/company-listings/admin',
  '/api/company-listings/eligibility',
  '/api/company-listings/owner',
  '/api/daily-tip',
  '/api/debts',
  '/api/debug',
  '/api/followed-trades',
  '/api/funding-programs/admin',
  '/api/instagram-automation',
  '/api/investor/links',
  '/api/invoices/analyze',
  '/api/intelligence/outcomes/evaluate',
  '/api/market-agent',
  '/api/market/refresh-investment-price',
  '/api/market/ai-insight',
  '/api/market/signal-alerts',
  '/api/market/signal-preferences',
  '/api/market/signals',
  '/api/markets/portfolio-comparison',
  '/api/notifications',
  '/api/portfolio',
  '/api/projects',
  '/api/projects-chat',
  '/api/receipts',
  '/api/stripe/create-checkout-session',
  '/api/stripe/create-portal-session',
  '/api/thesfm-trader',
  '/api/trader/analysis',
  '/api/trader/provider-status',
  '/api/trader/scanner',
  '/api/trader/status',
  '/api/tts',
  '/api/watchlist',
  '/api/wakeel',
] as const;

export function isProtectedApiPath(pathname: string) {
  return protectedApiPrefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

const cronApiPaths = new Set([
  '/api/business/subscriptions/reminders',
  '/api/debts/generate-monthly-expenses',
  '/api/intelligence/outcomes/evaluate',
  '/api/market/refresh-investment-price',
  '/api/market/signals/refresh',
  '/api/market-news/ingest',
  '/api/thesfm-trader/scanner/run',
  '/api/trader/scanner/run',
]);

export function isCronApiPath(pathname: string) {
  return cronApiPaths.has(pathname);
}

export function isCronAuthorized(request: Request) {
  const configured = process.env.CRON_SECRET?.trim();
  if (!configured) return false;
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const explicit = request.headers.get('x-cron-secret')?.trim() || '';
  return bearer === configured || explicit === configured;
}
