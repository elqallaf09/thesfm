import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  'src/lib/investments/canonicalPositions.server.ts',
  'utf8',
);

describe('canonical investment position server scope', () => {
  it('keeps the privileged canonical read explicitly owner-scoped and verified-only', () => {
    expect(source).toContain(".eq('user_id', userId)");
    expect(source).toContain(".eq('migration_state', 'VERIFIED')");
  });

  it('does not select private migration or ownership identifiers into the public DTO path', () => {
    const selectBlock = source.match(/const CANONICAL_POSITION_SELECT = \[[\s\S]*?\]\.join\(','\);/)?.[0] ?? '';

    expect(selectBlock).not.toContain("'user_id'");
    expect(selectBlock).not.toContain("'legacy_snapshot'");
    expect(selectBlock).not.toContain("'legacy_investment_item_id'");
  });
});
