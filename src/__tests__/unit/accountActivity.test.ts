import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';
import {
  ACCOUNT_ACTIVITY_TABLE,
  accountActivityCacheKey,
  accountActivityLabel,
  fetchAccountActivities,
  formatAccountActivityTimestamp,
  normalizeAccountActivityRows,
} from '@/lib/accountActivity';

function readProjectFile(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('account activity isolation', () => {
  it('uses user-scoped cache keys', () => {
    expect(accountActivityCacheKey('user-a')).toEqual(['account-activity', 'user-a']);
    expect(accountActivityCacheKey('user-b')).toEqual(['account-activity', 'user-b']);
  });

  it('normalizes only real user-owned activity rows and never creates fallback rows', () => {
    expect(normalizeAccountActivityRows([])).toEqual([]);
    expect(normalizeAccountActivityRows(null)).toEqual([]);
    expect(normalizeAccountActivityRows([
      { id: 'orphan', event_type: 'goal_added', created_at: '2026-06-24T07:00:00.000Z' },
      { id: 'real', user_id: 'user-a', event_type: 'goal_added', title: 'goal_added', created_at: '2026-06-24T07:00:00.000Z' },
    ])).toEqual([
      {
        id: 'real',
        user_id: 'user-a',
        event_type: 'goal_added',
        title: 'goal_added',
        description: null,
        entity_type: null,
        entity_id: null,
        metadata: null,
        created_at: '2026-06-24T07:00:00.000Z',
      },
    ]);
  });

  it('queries activity by the authenticated user id only', async () => {
    const calls: unknown[] = [];
    const builder = {
      select(value: string) {
        calls.push(['select', value]);
        return this;
      },
      eq(column: string, value: string) {
        calls.push(['eq', column, value]);
        return this;
      },
      order(column: string, options: unknown) {
        calls.push(['order', column, options]);
        return this;
      },
      limit(value: number) {
        calls.push(['limit', value]);
        return Promise.resolve({ data: [], error: null });
      },
    };
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null }),
      },
      from(table: string) {
        calls.push(['from', table]);
        return builder;
      },
    };

    await fetchAccountActivities(client as unknown as Parameters<typeof fetchAccountActivities>[0], 12);

    expect(calls).toContainEqual(['from', ACCOUNT_ACTIVITY_TABLE]);
    expect(calls).toContainEqual(['eq', 'user_id', 'user-a']);
    expect(calls).toContainEqual(['limit', 12]);
  });

  it('does not query activity when no authenticated user exists', async () => {
    const from = vi.fn();
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from,
    };

    await expect(fetchAccountActivities(client as unknown as Parameters<typeof fetchAccountActivities>[0])).resolves.toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it('keeps event identity stable and localizes labels at render time', () => {
    expect(accountActivityLabel('goal_added', 'ar')).toBe('تم إضافة هدف مالي');
    expect(accountActivityLabel('unknown_event', 'ar', 'Custom title')).toBe('Custom title');
  });

  it('formats real timestamps instead of placeholder sequential times', () => {
    const rendered = formatAccountActivityTimestamp(
      '2026-06-24T07:42:00.000Z',
      'ar',
      new Date('2026-06-24T12:00:00.000Z'),
    );

    expect(rendered).toContain('اليوم');
    expect(rendered).not.toBe('10:00');
    expect(rendered).not.toBe('11:00');
  });

  it('ships an RLS migration that isolates rows by auth.uid()', () => {
    const migration = readProjectFile('supabase/migrations/110_create_account_activity.sql');

    expect(migration).toContain('alter table public.account_activity enable row level security');
    expect(migration).toContain('using ((select auth.uid()) = user_id)');
    expect(migration).toContain('with check ((select auth.uid()) = user_id)');
    expect(migration).toContain('activity_user_created_idx');
    expect(migration).not.toMatch(/using\s*\(\s*true\s*\)/i);
  });
});
