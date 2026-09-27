import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const app = readFileSync(join(process.cwd(), 'src/trader-app/public/app.js'), 'utf8');

describe('trader provider-status UI truthfulness', () => {
  it('does not present configuration alone as a connected market-data provider', () => {
    expect(app).toContain("const online = normalized.status === 'available' || normalized.status === 'healthy';");
    expect(app).toContain('configured ? "unknown" : "not_configured"');
    expect(app).toContain('const ok = ["success", "available", "connected", "healthy"].includes(String(raw));');
  });

  it('makes an unobserved provider actionable in the settings issues view', () => {
    expect(app).toContain('if (normalized.status === "unknown") {');
    expect(app).toContain('return getProviderStatusMessage("provider_status_unknown", lang);');
  });
});
