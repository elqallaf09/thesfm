import path from 'node:path';

export const previewBypassStatePath = path.join(process.cwd(), 'playwright', '.auth', 'preview-bypass.json');

const previewUrl = process.env.E2E_BASE_URL?.trim();
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();

export const usesPreviewProtection = Boolean(previewUrl && bypassSecret);

export function previewProtectionHeaders(): Record<string, string> | undefined {
  if (!bypassSecret) return undefined;
  return {
    'x-vercel-protection-bypass': bypassSecret,
    'x-vercel-set-bypass-cookie': 'true',
  };
}
