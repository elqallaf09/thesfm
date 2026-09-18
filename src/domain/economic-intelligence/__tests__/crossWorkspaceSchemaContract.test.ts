import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/domain/economic-intelligence/crossWorkspaceBrain.server.ts', 'utf8');

describe('cross-workspace deployed schema contract', () => {
  it('does not query project lifecycle columns that are not deployed yet', () => {
    expect(source).toContain("loadCompleteEconomicRows(admin, 'projects', userId, 'id,created_at')");
    expect(source).not.toContain("'id,status,created_at,updated_at'");
  });
});
