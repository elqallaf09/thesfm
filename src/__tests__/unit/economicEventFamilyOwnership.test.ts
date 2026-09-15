import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const proactive = readFileSync('src/domain/economic-intelligence/proactive.server.ts', 'utf8');
const freshness = readFileSync('src/domain/economic-intelligence/freshnessEvents.server.ts', 'utf8');
const crossWorkspace = readFileSync('src/domain/economic-intelligence/crossWorkspaceEvents.server.ts', 'utf8');

describe('Economic Intelligence event-family ownership', () => {
  it('proactive resolution owns only risk, decision and opportunity families', () => {
    expect(proactive).toContain("eventKey.startsWith('risk:')");
    expect(proactive).toContain("eventKey.startsWith('decision:')");
    expect(proactive).toContain("eventKey.startsWith('opportunity:')");
    expect(proactive).toContain('isProactiveEventKey(eventKey) && !activeKeys.includes(eventKey)');
  });

  it('freshness resolution remains scoped to freshness events', () => {
    expect(freshness).toContain(".like('event_key', 'freshness:%')");
  });

  it('cross-workspace resolution remains scoped to priority events', () => {
    expect(crossWorkspace).toContain(".like('event_key', 'priority:%')");
  });
});
