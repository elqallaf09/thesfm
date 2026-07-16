const PUBLIC_SHELL_EXACT = new Set([
  '/',
  '/login',
  '/reset-password',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
]);

const PUBLIC_SHELL_PREFIXES = ['/investor'] as const;

function normalizePathname(pathname: string | null | undefined): string {
  const raw = String(pathname ?? '').split(/[?#]/)[0] || '/';
  return raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

export function isPublicShellRoute(pathname: string | null | undefined): boolean {
  const normalized = normalizePathname(pathname);
  if (PUBLIC_SHELL_EXACT.has(normalized)) return true;
  return PUBLIC_SHELL_PREFIXES.some(prefix => normalized.startsWith(`${prefix}/`));
}
