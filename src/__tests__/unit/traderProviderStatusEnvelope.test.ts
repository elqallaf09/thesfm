import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

function readProjectFile(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('/api/trader/provider-status additive envelope (trader-app JS regression guard)', () => {
  const route = readProjectFile('src/app/api/trader/provider-status/route.ts');

  it('adds the new unified `state` key without removing any pre-existing top-level response key', () => {
    // Every one of these keys already existed before the market-state unification and is read by
    // the vanilla-JS trader terminal (src/trader-app/public/app.js calls this exact route) — none
    // may be removed or renamed. `state` is the only newly added key.
    const preExistingKeys = [
      'providers:', 'normalizedStatus:', 'diagnosticGroups:', 'advancedDiagnostics:',
      // availableProviders and dataProvider are written as ES6 shorthand properties (the local
      // variable shares the field name), so they appear as `availableProviders,` / `dataProvider,`
      // rather than `key: value,`.
      'availableProviders,', 'userMessages:', 'features:', 'dataProvider,', 'providerMatrix:',
      'capabilityMatrix:', 'diagnostics:', 'summary:', 'loaded:', 'failed:', 'skipped:',
      'provider:', 'reason:', 'resultCount:', 'generatedAt:',
    ];
    for (const key of preExistingKeys) {
      expect(route).toContain(key);
    }
    expect(route).toContain('state,');
    expect(route).toContain("getMarketSystemState");
  });

  it('computes `state` additively before the response object, not by replacing any existing computation', () => {
    const stateIndex = route.indexOf('const state = await getMarketSystemState');
    const responseIndex = route.indexOf('const response = {');
    expect(stateIndex).toBeGreaterThan(-1);
    expect(responseIndex).toBeGreaterThan(-1);
    expect(stateIndex).toBeLessThan(responseIndex);
  });

  it('trader-app JS still calls this exact route path (confirms this route cannot be renamed)', () => {
    const app = readProjectFile('src/trader-app/public/app.js');
    expect(app).toContain('/trader/provider-status');
  });
});
