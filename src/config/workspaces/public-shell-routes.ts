const PUBLIC_SHELL_EXACT = new Set([
  '/',
  '/login',
  '/reset-password',
  '/about',
  '/contact',
  '/investment-check',
  '/ar',
  '/en',
  '/fr',
  '/compound-interest-calculator',
  '/loan-calculator',
  '/zakat-calculator',
  '/guides/budget-800-kwd',
  '/guides/zakat-kuwait-stocks',
  '/terms',
  '/privacy',
]);

const PUBLIC_SHELL_PREFIXES = ['/investor'] as const;

// These product surfaces are intentionally readable without authentication,
// but signed-in users and active guest sessions retain workspace navigation.
// Visitors without a session receive the public shell. UserChip independently
// limits account controls to authenticated users.
const ANONYMOUS_PUBLIC_WORKSPACE_EXACT = new Set([
  '/global-markets',
  '/ai-analyst/overview',
]);

function normalizePathname(pathname: string | null | undefined): string {
  const raw = String(pathname ?? '').split(/[?#]/)[0] || '/';
  return raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

export function isPublicShellRoute(pathname: string | null | undefined): boolean {
  const normalized = normalizePathname(pathname);
  if (PUBLIC_SHELL_EXACT.has(normalized)) return true;
  return PUBLIC_SHELL_PREFIXES.some(prefix => normalized.startsWith(`${prefix}/`));
}

export function isAnonymousPublicWorkspaceRoute(pathname: string | null | undefined): boolean {
  return ANONYMOUS_PUBLIC_WORKSPACE_EXACT.has(normalizePathname(pathname));
}
