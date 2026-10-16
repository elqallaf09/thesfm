export type FinancialAttachmentBucket = 'receipts' | 'income-attachments';

export function isFinancialAttachmentBucket(value: string | null): value is FinancialAttachmentBucket {
  return value === 'receipts' || value === 'income-attachments';
}

export function isFinancialAttachmentPath(path: string) {
  const segments = path.split('/');
  return path.length <= 2048 && /^[a-zA-Z0-9._/-]+$/.test(path)
    && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(segments[0])
    && segments.length >= 2 && segments.every(segment => segment !== '' && segment !== '.' && segment !== '..');
}

// Persist an authenticated application URL, never a public or expiring signed URL.
export function financialAttachmentUrl(bucket: FinancialAttachmentBucket, path: string) {
  if (!isFinancialAttachmentBucket(bucket) || !isFinancialAttachmentPath(path)) throw new Error('INVALID_ATTACHMENT_PATH');
  return `/api/receipts/file?${new URLSearchParams({ bucket, path })}`;
}

export function financialAttachmentDisplayUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('blob:')) return value; // Unsaved guest/local previews only.
  try {
    if (value.startsWith('/api/receipts/file?')) {
      const url = new URL(value, 'https://attachment.invalid');
      const bucket = url.searchParams.get('bucket');
      const path = url.searchParams.get('path') || '';
      return isFinancialAttachmentBucket(bucket) && isFinancialAttachmentPath(path)
        ? financialAttachmentUrl(bucket, path) : undefined;
    }
    // Existing records retain their URLs. Upgrade only this project's known
    // public storage URLs at display time; never follow arbitrary external URLs.
    const origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').origin;
    const url = new URL(value);
    if (url.origin !== origin || url.username || url.password || url.search || url.hash) return undefined;
    const match = url.pathname.match(/^\/storage\/v1\/object\/public\/(receipts|income-attachments)\/(.+)$/);
    if (!match) return undefined;
    return financialAttachmentUrl(match[1] as FinancialAttachmentBucket, decodeURIComponent(match[2]));
  } catch { return undefined; }
}
