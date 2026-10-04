/** Safe on both server and client: diagnostics expose outcomes, never credentials or destinations. */
export function sanitizeOpsDiagnosticReason(reason: string | null | undefined): string | null {
  if (!reason) return null;
  return reason.slice(0, 4_000)
    .replace(/https?:\/\/[^\s<>"')\]]+/gi, '[redacted-url]')
    .replace(/\b(Bearer|Basic)\s+[^\s,;]+/gi, '$1 [redacted]')
    .replace(/(["']?(?:api[-_]?key|access[-_]?token|refresh[-_]?token|authorization|token|password|secret|service[-_]?role[-_]?key)["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;}]+)/gi, '$1[redacted]')
    .replace(/\bsk-(?:proj-)?[A-Za-z0-9_-]{8,}\b/g, '[redacted-key]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted-token]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]')
    .slice(0, 500);
}
