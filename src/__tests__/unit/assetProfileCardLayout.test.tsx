import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const assetProfileCard = readFileSync(join(projectRoot, 'src/components/market/AssetProfileCard.tsx'), 'utf8');

describe('AssetProfileCard Arabic detail layout', () => {
  it('uses semantic detail rows instead of compact metric tiles for basics', () => {
    expect(assetProfileCard).toContain('<dl className="asset-profile-details">');
    expect(assetProfileCard).toContain('<div className="asset-profile-detail-row" dir={language === \'ar\' ? \'rtl\' : \'ltr\'}>');
    expect(assetProfileCard).toContain('<dt dir={labelDirection(label, language)}>{label}</dt>');
    expect(assetProfileCard).toContain('<dd dir={directionFor(safeValue, language)}>{safeValue}</dd>');
    expect(assetProfileCard).toContain('value: formatProfileCurrency(profile.currency, unavailable, language)');
    expect(assetProfileCard).toContain('const dataProviderLabel = language === \'ar\' ? \'مزود البيانات\'');
    expect(assetProfileCard).toContain('<span dir="ltr">{profile.ticker ?? response.symbol}</span>');
    expect(assetProfileCard).not.toContain('profileMetrics(profile');
  });
});
