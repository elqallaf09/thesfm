import { describe, expect, it, vi } from 'vitest';
import { normalizePublicImageInput, resolvePublicImageUrl, type ImageResolverDependencies } from '@/lib/server/imageUrlResolver';

const PUBLIC_V4 = { address: '93.184.216.34', family: 4 as const };

function dependencies(
  lookup: ImageResolverDependencies['lookup'],
  request: NonNullable<ImageResolverDependencies['request']>,
): ImageResolverDependencies {
  return { lookup, request };
}

describe('imageUrlResolver network safety', () => {
  it.each([
    'http://127.0.0.1/page',
    'http://169.254.169.254/latest/meta-data',
    'http://10.0.0.1/page',
    'http://[::1]/page',
    'http://[fc00::1]/page',
    'http://[fe80::1]/page',
    'http://[2001:db8::1]/page',
  ])('rejects private, metadata, local, and reserved literals: %s', input => {
    expect(normalizePublicImageInput(input)).toBeNull();
  });

  it('blocks a public hostname when any DNS answer is private', async () => {
    const request = vi.fn<NonNullable<ImageResolverDependencies['request']>>();
    const lookup = vi.fn(async () => [PUBLIC_V4, { address: '169.254.169.254', family: 4 as const }]);

    const result = await resolvePublicImageUrl('https://company.example/page', dependencies(lookup, request));

    expect(result).toEqual({ ok: false, code: 'BLOCKED_URL' });
    expect(request).not.toHaveBeenCalled();
  });

  it('revalidates every redirect target and never requests a private redirect', async () => {
    const lookup = vi.fn(async (hostname: string) => hostname === 'safe.example'
      ? [PUBLIC_V4]
      : [{ address: '127.0.0.1', family: 4 as const }]);
    const request = vi.fn<NonNullable<ImageResolverDependencies['request']>>(async () => ({
      status: 302,
      contentType: 'text/html',
      location: 'http://private.example/admin',
      body: '',
    }));

    const result = await resolvePublicImageUrl('https://safe.example/company', dependencies(lookup, request));

    expect(result).toEqual({ ok: false, code: 'BLOCKED_URL' });
    expect(request).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('blocks literal private redirect targets before a second DNS lookup or request', async () => {
    const lookup = vi.fn(async () => [PUBLIC_V4]);
    const request = vi.fn<NonNullable<ImageResolverDependencies['request']>>(async () => ({
      status: 301,
      contentType: null,
      location: 'http://[::1]/internal.png',
      body: '',
    }));

    const result = await resolvePublicImageUrl('https://safe.example/company', dependencies(lookup, request));

    expect(result).toEqual({ ok: false, code: 'BLOCKED_URL' });
    expect(request).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it('returns a syntactically safe direct image URL without a server request', async () => {
    const lookup = vi.fn(async () => [{ address: '10.0.0.1', family: 4 as const }]);
    const request = vi.fn<NonNullable<ImageResolverDependencies['request']>>();

    const result = await resolvePublicImageUrl('https://cdn.example/logo.webp?version=2', dependencies(lookup, request));

    expect(result).toEqual({ ok: true, imageUrl: 'https://cdn.example/logo.webp?version=2' });
    expect(lookup).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it('extracts a safe image from a bounded HTML response', async () => {
    const lookup = vi.fn(async () => [PUBLIC_V4]);
    const request = vi.fn<NonNullable<ImageResolverDependencies['request']>>(async () => ({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      location: null,
      body: '<html><head><meta property="og:image" content="/assets/logo.png"></head></html>',
    }));

    await expect(resolvePublicImageUrl('https://safe.example/company', dependencies(lookup, request)))
      .resolves.toEqual({ ok: true, imageUrl: 'https://safe.example/assets/logo.png' });
  });
});
