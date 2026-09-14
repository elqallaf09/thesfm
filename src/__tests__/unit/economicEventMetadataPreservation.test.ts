import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const proactive = readFileSync('src/domain/economic-intelligence/proactive.server.ts', 'utf8');
const freshness = readFileSync('src/domain/economic-intelligence/freshnessEvents.server.ts', 'utf8');
const crossWorkspace = readFileSync('src/domain/economic-intelligence/crossWorkspaceEvents.server.ts', 'utf8');

describe('economic intelligence event-history preservation', () => {
  it.each([
    ['proactive', proactive],
    ['freshness', freshness],
    ['cross-workspace', crossWorkspace],
  ])('%s stale-event resolution preserves prior metadata', (_name, source) => {
    expect(source).toContain('metadata');
    expect(source).toMatch(/previousMetadata\s*=\s*asObject\(row\.metadata\)/);
    expect(source).toMatch(/metadata:\s*\{\s*\.\.\.previousMetadata,/s);
  });

  it.each([
    ['proactive', proactive],
    ['freshness', freshness],
    ['cross-workspace', crossWorkspace],
  ])('%s stale-event update remains scoped to economic-intelligence ownership', (_name, source) => {
    expect(source).toMatch(/\.eq\('id', row\.id\)\.eq\('user_id', userId\)\.eq\('source_module', 'economic_intelligence'\)/);
  });
});
