/**
 * Client-safe admin email check.
 * Uses NEXT_PUBLIC_ADMIN_EMAILS env var (comma-separated list).
 * Falls back to empty — meaning no admin links shown on client until env var is set.
 * The actual server-side guard in each admin page is the authoritative check.
 */
export function isAdminEmailClient(email?: string | null): boolean {
  if (!email) return false;
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '';
  if (!raw.trim()) return false;
  const allowed = raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
