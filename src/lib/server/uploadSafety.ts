export const MAX_RECEIPT_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_RECEIPT_TOTAL_BYTES = 20 * 1024 * 1024;
export const MAX_MULTIPART_OVERHEAD_BYTES = 1024 * 1024;

type ReceiptMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export async function detectReceiptMime(file: File): Promise<ReceiptMime | null> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf';
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes.slice(8), [0x57, 0x45, 0x42, 0x50])) {
    return 'image/webp';
  }
  return null;
}

export async function isValidReceiptFile(file: File, expectedMime: string) {
  if (file.size <= 0 || file.size > MAX_RECEIPT_FILE_BYTES) return false;
  const normalizedExpected = expectedMime === 'image/jpg' ? 'image/jpeg' : expectedMime;
  const detected = await detectReceiptMime(file);
  return detected !== null && detected === normalizedExpected;
}

export function exceedsDeclaredBodyLimit(request: Request) {
  const raw = request.headers.get('content-length');
  if (!raw) return false;
  const length = Number(raw);
  return Number.isFinite(length) && length > MAX_RECEIPT_TOTAL_BYTES + MAX_MULTIPART_OVERHEAD_BYTES;
}

export function exceedsReceiptAggregateLimit(files: File[]) {
  return files.reduce((total, file) => total + file.size, 0) > MAX_RECEIPT_TOTAL_BYTES;
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const output = new Array<R>(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await worker(items[index]!, index);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length || 1)) }, run));
  return output;
}
