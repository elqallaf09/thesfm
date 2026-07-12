import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('legacy route security aliases', () => {
  it('redirects /notif through the canonical protected notifications route', () => {
    const source = readFileSync('src/app/notif/page.tsx', 'utf8');
    expect(source).toContain("redirect('/notifications')");
    expect(source).not.toContain("@/app/notifications/page");
  });
});
