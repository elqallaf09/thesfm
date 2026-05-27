'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  BookOpen,
  Brain,
  Calculator,
  CheckCircle2,
  ChevronDown,
  Gauge,
  GraduationCap,
  Landmark,
  Layers3,
  Lightbulb,
  PiggyBank,
  ShieldAlert,
  Sparkles,
  Target,
  WalletCards,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { PageHero } from '@/components/layout/PageHero';
import { AppCard } from '@/components/layout/AppCard';
import { CardsGrid, StatGrid } from '@/components/layout/LayoutPrimitives';
import { PageTabs, type PageTabItem } from '@/components/layout/PageTabs';
import { EmptyState } from '@/components/layout/EmptyState';
import { useLanguage } from '@/hooks/useLanguage';
import {
  FEATURED_FINANCIAL_THEORIES,
  FINANCIAL_THEORIES,
  FINANCIAL_THEORY_CATEGORIES,
  FINANCIAL_THEORY_EXAMPLES,
  FINANCIAL_THEORY_PAGE_TEXT,
  FINANCIAL_THEORY_STATS,
  FINANCIAL_THEORY_TOOLS,
  getFinancialTheoryText,
  type FinancialTheory,
  type FinancialTheoryCategoryId,
  type FinancialTheoryLang,
} from '@/lib/financial-theories';

const THEORY_ICONS = [
  WalletCards,
  PiggyBank,
  Sparkles,
  Layers3,
  ShieldAlert,
  Landmark,
  Brain,
  Gauge,
  Target,
  Calculator,
];

function localeFrom(value: string): FinancialTheoryLang {
  return value === 'en' || value === 'fr' ? value : 'ar';
}

function applyCopy(lang: FinancialTheoryLang, tool: string) {
  if (lang === 'en') {
    return `Use ${tool} to turn the idea into a practical step in your account when your real data is available.`;
  }
  if (lang === 'fr') {
    return `Utilisez ${tool} pour transformer l’idée en étape pratique dans votre compte lorsque vos données réelles sont disponibles.`;
  }
  return `استخدم ${tool} لتحويل الفكرة إلى خطوة عملية داخل حسابك، عند توفر بياناتك الفعلية.`;
}

function relatedTheory(id: string) {
  return FINANCIAL_THEORIES.find(theory => theory.id === id);
}

function TheoryCard({
  theory,
  lang,
  isOpen,
  onToggle,
}: {
  theory: FinancialTheory;
  lang: FinancialTheoryLang;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const text = FINANCIAL_THEORY_PAGE_TEXT[lang];
  const Icon = THEORY_ICONS[(theory.number - 1) % THEORY_ICONS.length];
  const title = getFinancialTheoryText(theory.title, lang);
  const short = getFinancialTheoryText(theory.short, lang);
  const category = FINANCIAL_THEORY_CATEGORIES.find(item => item.id === theory.category);
  const categoryLabel = category ? getFinancialTheoryText(category.label, lang) : '';
  const takeaway = getFinancialTheoryText(theory.keyTakeaway, lang);
  const tool = getFinancialTheoryText(theory.sfmTool, lang);
  const detailId = `theory-details-${theory.id}`;
  const examples = theory.examples?.[lang] ?? [];
  const rows = theory.tableRows?.[lang] ?? [];

  return (
    <article className={`theory-card ${isOpen ? 'expanded' : ''}`}>
      <div className="theory-card-head">
        <span className="theory-number">{String(theory.number).padStart(2, '0')}</span>
        <span className="theory-icon" aria-hidden="true"><Icon size={22} /></span>
        <div>
          <span className="theory-category">{categoryLabel}</span>
          <h3>{title}</h3>
        </div>
      </div>

      <p className="theory-short">{short}</p>

      <div className="theory-takeaway">
        <CheckCircle2 size={17} aria-hidden="true" />
        <div>
          <span>{text.keyTakeaway}</span>
          <strong>{takeaway}</strong>
        </div>
      </div>

      <div className="theory-actions">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={detailId}
          onClick={onToggle}
        >
          {isOpen ? text.hideDetails : text.readMore}
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        {theory.sfmToolHref ? (
          <Link href={theory.sfmToolHref} aria-label={`${text.openTool}: ${tool}`}>
            {tool}
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        ) : (
          <span className="coming-soon-pill">{tool} · {text.comingSoon}</span>
        )}
      </div>

      <div id={detailId} className="theory-details" hidden={!isOpen}>
        <div className="detail-block">
          <h4>{title}</h4>
          {theory.details[lang].map(line => <p key={line}>{line}</p>)}
        </div>

        {examples.length > 0 ? (
          <div className="detail-block">
            <h4>{text.example}</h4>
            <ul>
              {examples.map(example => <li key={example}>{example}</li>)}
            </ul>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <div className="detail-block">
            <table>
              <tbody>
                {rows.map(row => (
                  <tr key={`${row.label}-${row.value}`}>
                    <th scope="row">{row.label}</th>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="detail-block tool-block">
          <h4>{text.applyInSfm}</h4>
          <p>{applyCopy(lang, tool)}</p>
        </div>
      </div>
    </article>
  );
}

export default function FinancialTheoriesPage() {
  const { lang, dir } = useLanguage();
  const locale = localeFrom(lang);
  const text = FINANCIAL_THEORY_PAGE_TEXT[locale];
  const [activeCategory, setActiveCategory] = useState<FinancialTheoryCategoryId>('all');
  const [openTheory, setOpenTheory] = useState<string | null>('personal-budgeting');

  const categoryTabs: PageTabItem[] = useMemo(() => (
    FINANCIAL_THEORY_CATEGORIES.map(category => ({
      id: category.id,
      label: getFinancialTheoryText(category.label, locale),
      count: category.id === 'all'
        ? FINANCIAL_THEORIES.length
        : FINANCIAL_THEORIES.filter(theory => theory.category === category.id).length,
    }))
  ), [locale]);

  const filteredTheories = useMemo(() => (
    activeCategory === 'all'
      ? FINANCIAL_THEORIES
      : FINANCIAL_THEORIES.filter(theory => theory.category === activeCategory)
  ), [activeCategory]);

  const featuredTheories = useMemo(() => (
    FEATURED_FINANCIAL_THEORIES
      .map(item => {
        const theory = relatedTheory(item.theoryId);
        return theory ? { theory, why: item.why } : null;
      })
      .filter(Boolean) as Array<{ theory: FinancialTheory; why: typeof FEATURED_FINANCIAL_THEORIES[number]['why'] }>
  ), []);

  return (
    <div className="financial-theories-shell" dir={dir}>
      <Sidebar />
      <DashboardPageShell ariaLabel={text.title} contentClassName="financial-theories-content">
        <div className="sfm-page-topbar">
          <LanguageSwitcher />
          <UserChip />
        </div>

        <PageHero
          className="financial-theories-hero"
          eyebrow={text.badge}
          title={text.title}
          subtitle={text.subtitle}
          icon={<GraduationCap size={30} />}
          status={(
            <div className="hero-stat-chips">
              {FINANCIAL_THEORY_STATS.map(stat => (
                <span key={getFinancialTheoryText(stat.label, locale)}>
                  {getFinancialTheoryText(stat.label, locale)}
                </span>
              ))}
            </div>
          )}
          actions={(
            <>
              <a className="theory-primary-link" href="#theory-library">{text.startLearning}</a>
              <a className="theory-secondary-link" href="#smart-tools">{text.exploreTools}</a>
            </>
          )}
        />

        <StatGrid>
          {FINANCIAL_THEORY_STATS.map((stat, index) => {
            const Icon = [BookOpen, Sparkles, Calculator, Lightbulb][index] ?? BookOpen;
            return (
              <AppCard key={getFinancialTheoryText(stat.label, locale)} className="theory-stat-card">
                <span aria-hidden="true"><Icon size={20} /></span>
                <strong>{getFinancialTheoryText(stat.label, locale)}</strong>
              </AppCard>
            );
          })}
        </StatGrid>

        <AppCard className="theory-intro-card">
          <div className="intro-icon" aria-hidden="true"><Brain size={26} /></div>
          <div>
            <span>{text.educationNote}</span>
            <h2>{text.introTitle}</h2>
            <p>{text.introBody}</p>
          </div>
        </AppCard>

        <section id="theory-library" className="theory-section" aria-labelledby="theory-library-title">
          <div className="theory-section-head">
            <span>{text.categories}</span>
            <h2 id="theory-library-title">{text.theoryLibrary}</h2>
            <p>{text.theoryLibrarySubtitle}</p>
          </div>

          <PageTabs
            tabs={categoryTabs}
            active={activeCategory}
            onChange={id => {
              const next = id as FinancialTheoryCategoryId;
              setActiveCategory(next);
              const first = next === 'all'
                ? FINANCIAL_THEORIES[0]
                : FINANCIAL_THEORIES.find(theory => theory.category === next);
              setOpenTheory(first?.id ?? null);
            }}
            ariaLabel={text.categories}
            className="financial-theory-tabs"
          />

          {filteredTheories.length > 0 ? (
            <div className="theory-grid">
              {filteredTheories.map(theory => (
                <TheoryCard
                  key={theory.id}
                  theory={theory}
                  lang={locale}
                  isOpen={openTheory === theory.id}
                  onToggle={() => setOpenTheory(current => current === theory.id ? null : theory.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<BookOpen size={28} />}
              title={text.noTheories}
              description={text.theoryLibrarySubtitle}
            />
          )}
        </section>

        <section className="theory-section featured-section" aria-labelledby="featured-theories-title">
          <div className="theory-section-head">
            <span>{text.relatedSfmTool}</span>
            <h2 id="featured-theories-title">{text.featuredTitle}</h2>
            <p>{text.featuredSubtitle}</p>
          </div>

          <CardsGrid className="featured-theory-grid">
            {featuredTheories.map(({ theory, why }) => {
              const tool = getFinancialTheoryText(theory.sfmTool, locale);
              return (
                <AppCard key={theory.id} className="featured-theory-card">
                  <span className="featured-index">{String(theory.number).padStart(2, '0')}</span>
                  <h3>{getFinancialTheoryText(theory.title, locale)}</h3>
                  <p>{getFinancialTheoryText(why, locale)}</p>
                  <div>
                    <small>{text.relatedSfmTool}</small>
                    {theory.sfmToolHref ? (
                      <Link href={theory.sfmToolHref}>{tool}</Link>
                    ) : (
                      <strong>{tool} · {text.comingSoon}</strong>
                    )}
                  </div>
                </AppCard>
              );
            })}
          </CardsGrid>
        </section>

        <section className="theory-section examples-section" aria-labelledby="practical-examples-title">
          <div className="theory-section-head">
            <span>{text.educationalExample}</span>
            <h2 id="practical-examples-title">{text.practicalTitle}</h2>
            <p>{text.practicalSubtitle}</p>
          </div>

          <CardsGrid>
            {FINANCIAL_THEORY_EXAMPLES.map(example => (
              <AppCard key={getFinancialTheoryText(example.title, locale)} className="practical-example-card">
                <span aria-hidden="true"><Lightbulb size={20} /></span>
                <h3>{getFinancialTheoryText(example.title, locale)}</h3>
                <p>{getFinancialTheoryText(example.body, locale)}</p>
              </AppCard>
            ))}
          </CardsGrid>
        </section>

        <section id="smart-tools" className="theory-section tools-section" aria-labelledby="smart-tools-title">
          <div className="theory-section-head">
            <span>{text.smartToolsTitle}</span>
            <h2 id="smart-tools-title">{text.smartToolsTitle}</h2>
            <p>{text.smartToolsSubtitle}</p>
          </div>

          <CardsGrid className="tools-grid">
            {FINANCIAL_THEORY_TOOLS.map((tool, index) => {
              const Icon = [Calculator, Landmark, ShieldAlert, Target, Gauge][index] ?? Calculator;
              const title = getFinancialTheoryText(tool.title, locale);
              return (
                <AppCard key={tool.id} className="smart-tool-card">
                  <div className="smart-tool-icon" aria-hidden="true"><Icon size={22} /></div>
                  <h3>{title}</h3>
                  <p>{getFinancialTheoryText(tool.description, locale)}</p>
                  {tool.href ? (
                    <Link href={tool.href} aria-label={`${text.openTool}: ${title}`}>
                      {getFinancialTheoryText(tool.cta, locale)}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </Link>
                  ) : (
                    <span>{getFinancialTheoryText(tool.cta, locale)} · {text.comingSoon}</span>
                  )}
                </AppCard>
              );
            })}
          </CardsGrid>
        </section>
      </DashboardPageShell>

      <style jsx>{`
        .financial-theories-shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at 12% 8%, rgba(29, 140, 255, .10), transparent 32%),
            linear-gradient(160deg, var(--sfm-background) 0%, #F8FBFF 58%, #E7F1FF 100%);
          color: var(--sfm-foreground);
          overflow-x: clip;
          scroll-behavior: smooth;
        }

        .financial-theories-content {
          display: grid;
          gap: 20px;
          min-width: 0;
        }

        :global(.financial-theories-hero) {
          position: relative;
        }

        :global(.financial-theories-hero)::after {
          content: '';
          position: absolute;
          inset: auto -10% -42% 16%;
          width: min(620px, 80%);
          height: 260px;
          border-radius: 50%;
          background:
            repeating-linear-gradient(
              155deg,
              rgba(167, 243, 240, .18) 0 2px,
              transparent 2px 22px
            );
          opacity: .72;
          transform: rotate(-6deg);
          pointer-events: none;
        }

        .hero-stat-chips,
        .theory-actions,
        .theory-section-head,
        .featured-theory-card,
        .smart-tool-card,
        .practical-example-card {
          min-width: 0;
        }

        .hero-stat-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          max-width: 420px;
        }

        .hero-stat-chips span {
          display: inline-flex;
          align-items: center;
          min-height: 30px;
          border-radius: 999px;
          border: 1px solid rgba(167, 243, 240, .22);
          background: rgba(234, 246, 255, .10);
          color: #A7F3F0;
          padding: 0 10px;
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
        }

        .theory-primary-link,
        .theory-secondary-link {
          min-height: 44px;
          border-radius: 14px;
          padding: 0 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font: 950 13px Tajawal, Arial, sans-serif;
          text-decoration: none;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease, color .18s ease;
          white-space: nowrap;
        }

        .theory-primary-link {
          border: 0;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
          box-shadow: 0 16px 38px rgba(24, 212, 212, .24);
        }

        .theory-secondary-link {
          border: 1px solid rgba(167, 243, 240, .25);
          background: rgba(255, 255, 255, .09);
          color: #EAF6FF;
        }

        .theory-primary-link:hover,
        .theory-secondary-link:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 44px rgba(24, 212, 212, .24);
        }

        .theory-primary-link:active,
        .theory-secondary-link:active {
          transform: translateY(0) scale(.985);
        }

        .theory-stat-card {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: center;
          gap: 12px;
          min-height: 88px;
        }

        .theory-stat-card span,
        .intro-icon,
        .theory-icon,
        .smart-tool-icon,
        .practical-example-card span {
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary);
          border: 1px solid rgba(29, 140, 255, .13);
        }

        .theory-stat-card span {
          width: 44px;
          height: 44px;
        }

        .theory-stat-card strong {
          color: var(--sfm-midnight);
          font-size: 15px;
          line-height: 1.45;
        }

        .theory-intro-card {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 16px;
          align-items: start;
          background:
            radial-gradient(circle at 0% 0%, rgba(24, 212, 212, .16), transparent 30%),
            var(--sfm-card) !important;
        }

        .intro-icon {
          width: 58px;
          height: 58px;
        }

        .theory-intro-card span,
        .theory-section-head span {
          color: var(--sfm-primary-hover);
          font-size: 12px;
          font-weight: 950;
        }

        .theory-intro-card h2,
        .theory-section-head h2 {
          margin: 6px 0;
          color: var(--sfm-midnight);
          font-size: clamp(24px, 3vw, 34px);
          line-height: 1.15;
        }

        .theory-intro-card p,
        .theory-section-head p {
          margin: 0;
          color: var(--sfm-muted-readable);
          line-height: 1.8;
          font-weight: 780;
        }

        .theory-section {
          display: grid;
          gap: 14px;
          min-width: 0;
          scroll-margin-top: 22px;
        }

        .theory-section-head {
          max-width: 860px;
        }

        :global(.financial-theory-tabs) {
          margin-bottom: 2px;
        }

        .theory-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(360px, 100%), 1fr));
          gap: 16px;
          align-items: start;
          min-width: 0;
        }

        .theory-card {
          position: relative;
          display: grid;
          gap: 14px;
          min-width: 0;
          padding: 18px;
          border-radius: 22px;
          border: 1px solid rgba(29, 140, 255, .14);
          background: var(--sfm-card);
          box-shadow: 0 14px 34px rgba(3, 18, 37, .07);
          overflow: hidden;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
        }

        .theory-card:hover,
        .theory-card.expanded {
          border-color: rgba(24, 212, 212, .32);
          box-shadow: 0 18px 42px rgba(3, 18, 37, .10);
          transform: translateY(-2px);
        }

        .theory-card-head {
          display: grid;
          grid-template-columns: auto auto minmax(0, 1fr);
          gap: 11px;
          align-items: start;
          min-width: 0;
        }

        .theory-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 14px;
          background: var(--sfm-midnight);
          color: var(--sfm-soft-cyan);
          font-size: 13px;
          font-weight: 950;
          box-shadow: inset 0 -2px 0 rgba(24, 212, 212, .28);
        }

        .theory-icon {
          width: 40px;
          height: 40px;
        }

        .theory-category {
          display: inline-flex;
          width: fit-content;
          max-width: 100%;
          border-radius: 999px;
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary-hover);
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 950;
          line-height: 1;
          overflow-wrap: anywhere;
        }

        .theory-card h3 {
          margin: 8px 0 0;
          color: var(--sfm-midnight);
          font-size: 20px;
          line-height: 1.3;
        }

        .theory-short {
          margin: 0;
          color: var(--sfm-muted-readable);
          line-height: 1.75;
          font-weight: 800;
        }

        .theory-takeaway {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 9px;
          align-items: start;
          border: 1px solid rgba(24, 212, 212, .16);
          border-radius: 16px;
          background: rgba(24, 212, 212, .07);
          padding: 12px;
          min-width: 0;
        }

        .theory-takeaway svg {
          color: var(--sfm-success);
          margin-top: 2px;
        }

        .theory-takeaway span {
          display: block;
          color: var(--sfm-muted);
          font-size: 11px;
          font-weight: 950;
          margin-bottom: 3px;
        }

        .theory-takeaway strong {
          display: block;
          color: var(--sfm-primary-dark);
          line-height: 1.55;
          overflow-wrap: anywhere;
        }

        .theory-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        .theory-actions button,
        .theory-actions a,
        .coming-soon-pill,
        .smart-tool-card a,
        .smart-tool-card span,
        .featured-theory-card a,
        .featured-theory-card strong {
          min-height: 38px;
          border-radius: 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 12px;
          font: 950 12px Tajawal, Arial, sans-serif;
          text-decoration: none;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease, color .18s ease;
        }

        .theory-actions button {
          border: 0;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
          cursor: pointer;
        }

        .theory-actions button svg {
          transition: transform .18s ease;
        }

        .theory-card.expanded .theory-actions button svg {
          transform: rotate(180deg);
        }

        .theory-actions a,
        .featured-theory-card a,
        .smart-tool-card a {
          border: 1px solid rgba(29, 140, 255, .18);
          background: var(--sfm-light-card);
          color: var(--sfm-midnight);
        }

        .coming-soon-pill,
        .smart-tool-card span,
        .featured-theory-card strong {
          border: 1px dashed rgba(29, 140, 255, .22);
          background: rgba(29, 140, 255, .07);
          color: var(--sfm-primary-hover);
        }

        .theory-actions button:hover,
        .theory-actions a:hover,
        .featured-theory-card a:hover,
        .smart-tool-card a:hover {
          transform: translateY(-1px);
          border-color: rgba(24, 212, 212, .34);
          box-shadow: 0 10px 28px rgba(3, 18, 37, .08);
        }

        .theory-details {
          display: grid;
          gap: 12px;
          border-top: 1px solid rgba(29, 140, 255, .12);
          padding-top: 14px;
        }

        .theory-details[hidden] {
          display: none;
        }

        .detail-block {
          display: grid;
          gap: 8px;
          min-width: 0;
        }

        .detail-block h4 {
          margin: 0;
          color: var(--sfm-midnight);
          font-size: 15px;
        }

        .detail-block p,
        .detail-block li {
          margin: 0;
          color: var(--sfm-muted-readable);
          line-height: 1.75;
          font-weight: 760;
        }

        .detail-block ul {
          margin: 0;
          padding-inline-start: 20px;
          display: grid;
          gap: 7px;
        }

        .detail-block table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 8px;
        }

        .detail-block th,
        .detail-block td {
          border: 1px solid rgba(29, 140, 255, .12);
          background: var(--sfm-light-card);
          color: var(--sfm-primary-dark);
          padding: 10px 12px;
          text-align: start;
          line-height: 1.55;
        }

        .detail-block th {
          width: 104px;
          border-radius: 13px;
          color: var(--sfm-primary-hover);
          white-space: nowrap;
        }

        .detail-block td {
          border-radius: 13px;
          font-weight: 850;
        }

        .tool-block {
          border-radius: 16px;
          background: rgba(29, 140, 255, .07);
          border: 1px solid rgba(29, 140, 255, .12);
          padding: 12px;
        }

        .featured-theory-grid,
        .tools-grid {
          align-items: stretch;
        }

        .featured-theory-card,
        .smart-tool-card,
        .practical-example-card {
          display: grid;
          align-content: start;
          gap: 10px;
        }

        .featured-index {
          width: 38px;
          height: 38px;
          border-radius: 13px;
          display: grid;
          place-items: center;
          background: var(--sfm-midnight);
          color: var(--sfm-soft-cyan);
          font-weight: 950;
          font-size: 12px;
        }

        .featured-theory-card h3,
        .smart-tool-card h3,
        .practical-example-card h3 {
          margin: 0;
          color: var(--sfm-midnight);
          font-size: 18px;
          line-height: 1.35;
        }

        .featured-theory-card p,
        .smart-tool-card p,
        .practical-example-card p {
          margin: 0;
          color: var(--sfm-muted-readable);
          line-height: 1.7;
          font-weight: 780;
        }

        .featured-theory-card div {
          display: grid;
          gap: 7px;
          margin-top: auto;
        }

        .featured-theory-card small {
          color: var(--sfm-muted);
          font-weight: 950;
        }

        .practical-example-card span,
        .smart-tool-icon {
          width: 46px;
          height: 46px;
        }

        .tools-section {
          padding-bottom: 12px;
        }

        .smart-tool-card a,
        .smart-tool-card span {
          width: fit-content;
          margin-top: auto;
        }

        @media (max-width: 1024px) {
          .hero-stat-chips {
            max-width: 100%;
          }
        }

        @media (max-width: 720px) {
          .financial-theories-content {
            gap: 16px;
          }

          .theory-primary-link,
          .theory-secondary-link,
          .theory-actions button,
          .theory-actions a,
          .coming-soon-pill,
          .smart-tool-card a,
          .smart-tool-card span {
            width: 100%;
          }

          .hero-stat-chips span {
            white-space: normal;
          }

          .theory-intro-card,
          .theory-card-head {
            grid-template-columns: 1fr;
          }

          .theory-number,
          .theory-icon,
          .intro-icon {
            width: 48px;
            height: 48px;
          }

          .theory-grid {
            grid-template-columns: 1fr;
          }

          .detail-block table,
          .detail-block tbody,
          .detail-block tr,
          .detail-block th,
          .detail-block td {
            display: block;
            width: 100%;
          }

          .detail-block tr {
            display: grid;
            gap: 4px;
            margin-bottom: 8px;
          }
        }
      `}</style>
    </div>
  );
}
