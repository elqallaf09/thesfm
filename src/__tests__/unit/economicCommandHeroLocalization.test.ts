import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const hero = readFileSync('src/components/finance/EconomicCommandHero.tsx', 'utf8');
const page = readFileSync('src/app/economic-intelligence/page.tsx', 'utf8');

describe('economic command center localization', () => {
  it('ships Arabic, English and French command-center copy', () => {
    expect(hero).toContain("title: 'مركز القيادة الاقتصادية'");
    expect(hero).toContain("title: 'Economic Command Center'");
    expect(hero).toContain("title: 'Centre de commandement économique'");
    expect(hero).toContain("decisionLab: 'مختبر القرارات'");
    expect(hero).toContain("marketIntelligence: 'ذكاء الأسواق'");
    expect(hero).toContain("briefArchive: 'أرشيف الموجز'");
  });

  it('uses the shared language direction instead of a fixed language', () => {
    expect(hero).toContain('const { lang, dir } = useLanguage()');
    expect(hero).toContain('dir={dir}');
    expect(hero).toContain("lang === 'fr' ? 'fr' : lang === 'en' ? 'en' : 'ar'");
  });

  it('keeps the server page focused on composition and removes fixed English hero copy', () => {
    expect(page).toContain('<EconomicCommandHero />');
    expect(page).not.toContain('<h1>Economic Command Center</h1>');
    expect(page).not.toContain('One workspace for your financial twin');
  });
});
