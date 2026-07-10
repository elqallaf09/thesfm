import { describe, expect, it, vi } from 'vitest';
import { parseResearchApiResponse } from '@/lib/sharia-research/clientApi';

describe('Sharia research safe client response parsing', () => {
  it('parses a valid JSON success response', async () => {
    const payload = await parseResearchApiResponse<{ success: boolean; jobId: string }>(new Response(
      JSON.stringify({ success: true, jobId: 'job-1' }),
      { status: 202, headers: { 'content-type': 'application/json; charset=utf-8' } },
    ), '/api/sharia-research/search');
    expect(payload).toEqual({ success: true, jobId: 'job-1' });
  });

  it('returns the structured JSON error without exposing an HTML body', async () => {
    await expect(parseResearchApiResponse(new Response(
      JSON.stringify({ success: false, error: { code: 'AUTH_REQUIRED', message: 'private' } }),
      { status: 401, headers: { 'content-type': 'application/json' } },
    ), '/api/sharia-research/search')).rejects.toMatchObject({
      code: 'AUTH_REQUIRED', status: 401, category: 'authentication',
    });
  });

  it.each([
    [500, 'NON_JSON_RESPONSE', 'routing'],
    [404, 'API_ROUTE_NOT_FOUND', 'routing'],
    [401, 'AUTH_REQUIRED', 'authentication'],
  ] as const)('safely rejects an HTML response with status %i', async (status, code, category) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const html = '<!DOCTYPE html><title>Internal details must not reach the UI</title>';
    try {
      await parseResearchApiResponse(new Response(html, {
        status,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }), '/api/sharia-research/search');
      throw new Error('Expected parser to reject');
    } catch (error) {
      expect(error).toMatchObject({ code, status, category });
      expect(String((error as Error).message)).not.toContain('<!DOCTYPE');
      expect(String((error as Error).message)).not.toContain('Internal details');
    }
  });
});
