'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
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
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  WalletCards,
  X,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { CurrencySelect } from '@/components/CurrencySelect';
import { PageHero } from '@/components/layout/PageHero';
import { AppCard } from '@/components/layout/AppCard';
import { CardsGrid } from '@/components/layout/LayoutPrimitives';
import { PageTabs, type PageTabItem } from '@/components/layout/PageTabs';
import { EmptyState } from '@/components/layout/EmptyState';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/lib/useCurrency';
import { formatMoney } from '@/lib/formatMoney';
import { supabase } from '@/integrations/supabase/client';
import { loadUserDataTables, personalExpenseRows, personalIncomeRows, sumAmounts } from '@/lib/data/financeData';
import {
  FINANCIAL_THEORIES,
  FINANCIAL_THEORY_CATEGORIES,
  THEORY_CALCULATORS,
  THEORY_CALCULATOR_TEXT,
  getFinancialTheoryText,
  type FinancialTheory,
  type FinancialTheoryLang,
  type TheoryCalculatorId,
} from '@/lib/financial-theories';


// --- Extracted to local lib files ---
import {
  type CalculatorId, type FinancialHealthSnapshot, type GuidedToolCategoryId,
  type LearningLevelId, type LearningSection, type DebtRow, type LearningGoalId, type LearningSectionId,
  UI_COPY, THEORY_PROGRESS_STORAGE_KEY, TOOL_PROGRESS_STORAGE_KEY,
  LEARNING_GOALS, LEARNING_LEVELS, LEVEL_ORDER, THEORY_LEVELS,
  LEARNING_SECTIONS, GUIDED_TOOL_TABS, ACTIVE_CALCULATORS, HEALTH_DATA_TABLES,
  EMPTY_HEALTH_SNAPSHOT, THEORY_CALCULATOR_MAP, ACTIVE_CALCULATORS as ACTIVE_CALCS,
  localeFrom, normalize, buildProgressText, readProgressFromStorage,
  saveProgressToStorage, readToolProgressFromStorage, saveToolProgressToStorage,
  relatedTheory, theoryLevel, levelAllows, theoryMatchesQuery,
  isCalculatorId, calculatorForTheory,
  asNumber, formatCalculatorDate, monthsUntil, formatPercent, ratioPercent,
  clampScore, financialHealthScore,
} from './_lib';
import { TheoryCard } from './TheoryCard';

const SmartCalculatorPanel = dynamic(
  () => import('./_components').then(mod => mod.SmartCalculatorPanel),
  {
    ssr: false,
    loading: () => <div className="calculator-panel calculator-panel-skeleton" aria-hidden="true" />,
  },
);

export default function FinancialTheoriesPage() {
  const { lang, dir } = useLanguage();
  const { user } = useAuth();
  const { currency: userCurrency } = useCurrency();
  const locale = localeFrom(lang);
  const text = UI_COPY[locale];
  const [activeGoal, setActiveGoal] = useState<LearningGoalId>('spending');
  const [activeLevel, setActiveLevel] = useState<LearningLevelId>('beginner');
  const [openSections, setOpenSections] = useState<Set<LearningSectionId>>(() => new Set(['budget-basics']));
  const [expandedSections, setExpandedSections] = useState<Set<LearningSectionId>>(() => new Set());
  const [activeToolCategory, setActiveToolCategory] = useState<GuidedToolCategoryId>('all');
  const [showAllTools, setShowAllTools] = useState(false);
  const [query, setQuery] = useState('');
  const [toolQuery, setToolQuery] = useState('');
  const [openTheory, setOpenTheory] = useState<string | null>(null);
  const [readTheoryIds, setReadTheoryIds] = useState<Set<string>>(() => new Set());
  const [usedToolIds, setUsedToolIds] = useState<Set<string>>(() => new Set());
  const [activeCalculator, setActiveCalculator] = useState<CalculatorId | null>(null);
  const [healthSnapshot, setHealthSnapshot] = useState<FinancialHealthSnapshot>(EMPTY_HEALTH_SNAPSHOT);
  const defaultCurrency = userCurrency || 'KWD';

  useEffect(() => {
    setReadTheoryIds(readProgressFromStorage());
    setUsedToolIds(readToolProgressFromStorage());
  }, []);

  const markTheoryRead = useCallback((theoryId: string) => {
    setReadTheoryIds(previous => {
      if (previous.has(theoryId)) return previous;
      const next = new Set(previous);
      next.add(theoryId);
      saveProgressToStorage(next);
      return next;
    });
  }, []);

  const markToolUsed = useCallback((toolId: string) => {
    setUsedToolIds(previous => {
      if (previous.has(toolId)) return previous;
      const next = new Set(previous);
      next.add(toolId);
      saveToolProgressToStorage(next);
      return next;
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadHealthSnapshot() {
      if (!user?.id) {
        setHealthSnapshot(EMPTY_HEALTH_SNAPSHOT);
        return;
      }
      setHealthSnapshot(prev => ({ ...prev, isLoading: true, error: null }));
      const result = await loadUserDataTables(supabase, user.id, HEALTH_DATA_TABLES);
      if (!isMounted) return;
      const incomeRows = personalIncomeRows(result.records.income ?? []);
      const expenseRows = personalExpenseRows(result.records.expenses ?? []);
      const savingsRows = result.records.savings ?? [];
      setHealthSnapshot({
        income: sumAmounts(incomeRows, ['amount']),
        expenses: sumAmounts(expenseRows, ['amount']),
        savings: sumAmounts(savingsRows, ['current_amount', 'balance', 'current_value', 'amount']),
        debts: 0,
        hasIncome: incomeRows.length > 0,
        hasExpenses: expenseRows.length > 0,
        hasSavings: savingsRows.length > 0,
        isLoading: false,
        error: Object.values(result.errors).find(Boolean) ?? null,
      });
    }
    void loadHealthSnapshot();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    const goal = LEARNING_GOALS.find(item => item.id === activeGoal) ?? LEARNING_GOALS[0];
    const goalIds = new Set(goal.theoryIds);
    const firstSection = LEARNING_SECTIONS.find(section => (
      section.theoryIds
        .map(relatedTheory)
        .some(theory => theory && goalIds.has(theory.id) && levelAllows(theory, activeLevel))
    ));
    setOpenSections(firstSection ? new Set([firstSection.id]) : new Set());
    setExpandedSections(new Set());
  }, [activeGoal, activeLevel]);

  function openCalculator(calculatorId: CalculatorId) {
    markToolUsed(calculatorId);
    setActiveCalculator(calculatorId);
    window.setTimeout(() => document.getElementById('active-smart-calculator')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  function openRelatedTheoryTool(theory: FinancialTheory) {
    markTheoryRead(theory.id);
    const calculatorId = calculatorForTheory(theory);
    if (calculatorId) {
      openCalculator(calculatorId);
      return;
    }
    setOpenTheory(theory.id);
    window.setTimeout(() => document.getElementById(`theory-details-${theory.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0);
  }

  const totalTheories = FINANCIAL_THEORIES.length;
  const completedCount = useMemo(
    () => FINANCIAL_THEORIES.filter(theory => readTheoryIds.has(theory.id)).length,
    [readTheoryIds],
  );
  const usedToolsCount = usedToolIds.size;
  const progressPercent = totalTheories + THEORY_CALCULATORS.length > 0
    ? Math.round(((completedCount + Math.min(usedToolsCount, THEORY_CALCULATORS.length)) / (totalTheories + THEORY_CALCULATORS.length)) * 100)
    : 0;

  const selectedGoal = useMemo(
    () => LEARNING_GOALS.find(goal => goal.id === activeGoal) ?? LEARNING_GOALS[0],
    [activeGoal],
  );
  const selectedLevel = useMemo(
    () => LEARNING_LEVELS.find(level => level.id === activeLevel) ?? LEARNING_LEVELS[0],
    [activeLevel],
  );
  const goalTheoryIds = useMemo(() => new Set(selectedGoal.theoryIds), [selectedGoal]);

  const sectionGroups = useMemo(() => {
    const normalizedQuery = normalize(query);
    return LEARNING_SECTIONS.map(section => {
      const theories = section.theoryIds
        .map(relatedTheory)
        .filter((theory): theory is FinancialTheory => Boolean(theory))
        .filter(theory => goalTheoryIds.has(theory.id))
        .filter(theory => levelAllows(theory, activeLevel))
        .filter(theory => theoryMatchesQuery(theory, locale, normalizedQuery));
      return { section, theories };
    });
  }, [activeLevel, goalTheoryIds, locale, query]);

  const totalVisibleTheories = useMemo(
    () => sectionGroups.reduce((total, group) => total + group.theories.length, 0),
    [sectionGroups],
  );

  const featuredTheory = relatedTheory('personal-budgeting') ?? FINANCIAL_THEORIES[0];
  const featuredExample = featuredTheory.examples?.[locale]?.[0] ?? getFinancialTheoryText(featuredTheory.keyTakeaway, locale);

  const recommendedTheories = useMemo(() => {
    if (!healthSnapshot.hasIncome && !healthSnapshot.hasExpenses && !healthSnapshot.hasSavings) return [];
    const recommendations: string[] = [];
    if (healthSnapshot.hasExpenses || healthSnapshot.expenses > healthSnapshot.income * 0.75) recommendations.push('personal-budgeting', 'lifestyle-inflation');
    if (!healthSnapshot.hasSavings || healthSnapshot.savings <= 0) recommendations.push('emergency-fund', 'pay-yourself-first');
    if (healthSnapshot.hasIncome && healthSnapshot.hasSavings) recommendations.push('smart-goals', 'compound-interest');
    if (healthSnapshot.expenses > healthSnapshot.income && healthSnapshot.hasIncome) recommendations.push('reduce-bad-debt');
    recommendations.push(...selectedGoal.theoryIds);
    return [...new Set(recommendations)]
      .map(relatedTheory)
      .filter((theory): theory is FinancialTheory => Boolean(theory))
      .slice(0, 3);
  }, [healthSnapshot, selectedGoal]);

  const toolCategoryTabs: PageTabItem[] = useMemo(() => (
    GUIDED_TOOL_TABS.map(category => ({
      id: category.id,
      label: getFinancialTheoryText(category.label, locale),
      count: category.id === 'all'
        ? THEORY_CALCULATORS.length
        : THEORY_CALCULATORS.filter(tool => category.toolIds.includes(tool.id)).length,
    }))
  ), [locale]);

  const filteredCalculators = useMemo(() => {
    const normalizedQuery = normalize(toolQuery);
    const activeTab = GUIDED_TOOL_TABS.find(tab => tab.id === activeToolCategory) ?? GUIDED_TOOL_TABS[0];
    const tabToolIds = new Set(activeTab.toolIds);
    return THEORY_CALCULATORS
      .filter(tool => activeToolCategory === 'all' ? true : tabToolIds.has(tool.id))
      .filter(tool => {
        if (!normalizedQuery) return true;
        const haystack = [
          getFinancialTheoryText(tool.title, locale),
          getFinancialTheoryText(tool.description, locale),
          ...tool.relatedTheories.map(item => getFinancialTheoryText(item, locale)),
        ].join(' ');
        return normalize(haystack).includes(normalizedQuery);
      });
  }, [activeToolCategory, locale, toolQuery]);

  const visibleCalculators = activeToolCategory === 'all' || showAllTools
    ? filteredCalculators
    : filteredCalculators.slice(0, 6);
  const canShowMoreTools = activeToolCategory !== 'all' && filteredCalculators.length > visibleCalculators.length;
  const isToolSearchActive = toolQuery.trim().length > 0;
  const toolsDisplaySummary = isToolSearchActive
    ? text.toolSearchResults.replace('{count}', filteredCalculators.length.toString())
    : visibleCalculators.length < filteredCalculators.length
      ? text.toolsVisibleCount
        .replace('{visible}', visibleCalculators.length.toString())
        .replace('{total}', filteredCalculators.length.toString())
      : text.allToolsDisplayed.replace('{count}', filteredCalculators.length.toString());

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
          status={<span className="hero-note">{text.educationNote}</span>}
          actions={(
            <>
              <a className="theory-primary-link" href="#theory-library">{text.startNow}</a>
              <a className="theory-secondary-link" href="#smart-tools">{text.exploreTools}</a>
              <a className="theory-secondary-link" href="#featured-theory">{text.featuredTheoryTitle}</a>
            </>
          )}
        />

        <AppCard className="learning-progress-card" aria-label={buildProgressText(text.progressText, completedCount, totalTheories)}>
          <div className="learning-progress-copy">
            <span>{buildProgressText(text.progressText, completedCount, totalTheories)}</span>
            <strong>{progressPercent}%</strong>
          </div>
          <div className="learning-progress-track" aria-hidden="true">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="learning-progress-metrics">
            <span><b dir="ltr">{completedCount}</b>{text.theoriesReadCount}</span>
            <span><b dir="ltr">{usedToolsCount}</b>{text.toolsUsedCount}</span>
            <span><b dir="ltr">{progressPercent}%</b>{text.progressRatio}</span>
          </div>
        </AppCard>

        <section className="guided-goal-section section-panel" aria-labelledby="guided-goal-title">
          <div className="theory-section-head">
            <span>{text.educationNote}</span>
            <h2 id="guided-goal-title">{text.startByGoalTitle}</h2>
            <p>{text.startByGoalSubtitle}</p>
          </div>

          <div className="goal-path-grid">
            {LEARNING_GOALS.map(goal => {
              const isActive = activeGoal === goal.id;
              return (
                <button
                  key={goal.id}
                  type="button"
                  className={`goal-path-card ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveGoal(goal.id);
                    setOpenTheory(null);
                    setActiveCalculator(null);
                    setExpandedSections(new Set());
                    setOpenSections(new Set(['budget-basics']));
                  }}
                >
                  <strong>{getFinancialTheoryText(goal.label, locale)}</strong>
                  <span>{getFinancialTheoryText(goal.description, locale)}</span>
                </button>
              );
            })}
          </div>

          <div className="learning-level-panel">
            <div>
              <span>{text.learningLevel}</span>
              <strong>{getFinancialTheoryText(selectedLevel.label, locale)}</strong>
              <p>{getFinancialTheoryText(selectedLevel.description, locale)}</p>
            </div>
            <div className="learning-level-tabs" role="tablist" aria-label={text.learningLevel}>
              {LEARNING_LEVELS.map(level => (
                <button
                  key={level.id}
                  type="button"
                  className={activeLevel === level.id ? 'active' : ''}
                  onClick={() => {
                    setActiveLevel(level.id);
                    setOpenTheory(null);
                    setExpandedSections(new Set());
                  }}
                >
                  {getFinancialTheoryText(level.label, locale)}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="featured-theory" className="theory-section theory-of-day-section section-panel" aria-labelledby="featured-theory-title">
          <div className="theory-of-day-card">
            <div className="theory-of-day-icon" aria-hidden="true"><Sparkles size={24} /></div>
            <div>
              <span>{text.featuredTheoryTitle}</span>
              <h2 id="featured-theory-title">{getFinancialTheoryText(featuredTheory.title, locale)}</h2>
              <p>{getFinancialTheoryText(featuredTheory.short, locale)}</p>
              <div className="featured-example-box">
                <small>{text.featuredTheoryExample}</small>
                <strong>{featuredExample}</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveGoal('spending');
                setActiveLevel('beginner');
                setOpenSections(new Set(['budget-basics']));
                setOpenTheory(featuredTheory.id);
                markTheoryRead(featuredTheory.id);
                openRelatedTheoryTool(featuredTheory);
              }}
            >
              {text.featuredTheoryButton}
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          </div>
        </section>

        <section id="theory-library" className="theory-section library-section section-panel" aria-labelledby="theory-library-title">
          <div className="theory-section-head">
            <span>{getFinancialTheoryText(selectedGoal.label, locale)} · {getFinancialTheoryText(selectedLevel.label, locale)}</span>
            <h2 id="theory-library-title">{text.theoryLibrary}</h2>
            <p>{text.accordionSubtitle}</p>
          </div>

          <div className="theory-controls">
            <label className="theory-search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">{text.searchLabel}</span>
              <input
                type="search"
                value={query}
                placeholder={text.searchPlaceholder}
                onChange={event => {
                  setQuery(event.target.value);
                  setOpenTheory(null);
                }}
              />
            </label>
            <div className="guided-filter-summary">
              <span>{text.categories}</span>
              <strong dir="ltr">{totalVisibleTheories}</strong>
            </div>
          </div>

          {totalVisibleTheories > 0 ? (
            <div className="theory-accordion-list">
              {sectionGroups.map(({ section, theories }) => {
                if (theories.length === 0) return null;
                const isOpen = openSections.has(section.id);
                const isExpanded = expandedSections.has(section.id);
                const visibleTheories = isExpanded ? theories : theories.slice(0, 3);
                return (
                  <article className="theory-accordion" key={section.id}>
                    <button
                      type="button"
                      className="theory-accordion-head"
                      aria-expanded={isOpen}
                      onClick={() => {
                        setOpenSections(previous => {
                          const next = new Set(previous);
                          if (next.has(section.id)) next.delete(section.id);
                          else next.add(section.id);
                          return next;
                        });
                      }}
                    >
                      <div>
                        <span>{theories.length} {text.theoriesInside}</span>
                        <h3>{getFinancialTheoryText(section.title, locale)}</h3>
                        <p>{getFinancialTheoryText(section.description, locale)}</p>
                      </div>
                      <ChevronDown size={18} aria-hidden="true" />
                    </button>

                    {isOpen ? (
                      <div className="theory-accordion-body">
                        <div className="theory-grid">
                          {visibleTheories.map(theory => (
                            <TheoryCard
                              key={theory.id}
                              theory={theory}
                              lang={locale}
                              text={text}
                              isOpen={openTheory === theory.id}
                              isRead={readTheoryIds.has(theory.id)}
                              onToggle={() => {
                                setOpenTheory(current => current === theory.id ? null : theory.id);
                                markTheoryRead(theory.id);
                              }}
                              onMarkRead={() => markTheoryRead(theory.id)}
                              onOpenRelatedTool={() => openRelatedTheoryTool(theory)}
                            />
                          ))}
                        </div>
                        {theories.length > 3 ? (
                          <button
                            type="button"
                            className="show-more-button"
                            onClick={() => {
                              setExpandedSections(previous => {
                                const next = new Set(previous);
                                if (next.has(section.id)) next.delete(section.id);
                                else next.add(section.id);
                                return next;
                              });
                            }}
                          >
                            {isExpanded ? text.showLess : text.showMore}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<BookOpen size={28} />}
              title={text.noResults}
              description={text.noResultsDescription}
            />
          )}
        </section>

        <section className="theory-section recommendations-section section-panel" aria-labelledby="personalized-recommendations-title">
          <div className="theory-section-head">
            <span>{text.progressRatio}</span>
            <h2 id="personalized-recommendations-title">{text.recommendedTitle}</h2>
            <p>{text.recommendedSubtitle}</p>
          </div>

          {recommendedTheories.length > 0 ? (
            <CardsGrid className="starter-theory-grid">
              {recommendedTheories.map(theory => {
                const title = getFinancialTheoryText(theory.title, locale);
                const targetGoal = LEARNING_GOALS.find(goal => goal.theoryIds.includes(theory.id))?.id ?? activeGoal;
                return (
                  <AppCard key={theory.id} className="starter-theory-card">
                    <span className="featured-index">{String(theory.number).padStart(2, '0')}</span>
                    <h3>{title}</h3>
                    <p>{getFinancialTheoryText(theory.short, locale)}</p>
                    {readTheoryIds.has(theory.id) ? <span className="theory-read-badge">{text.done}</span> : null}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveGoal(targetGoal);
                        setActiveLevel(theoryLevel(theory));
                        setQuery('');
                        setOpenTheory(theory.id);
                        markTheoryRead(theory.id);
                        window.setTimeout(() => {
                          document.getElementById('theory-library')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 0);
                      }}
                      aria-label={`${text.readTheory}: ${title}`}
                    >
                      {text.readTheory}
                    </button>
                  </AppCard>
                );
              })}
            </CardsGrid>
          ) : (
            <EmptyState
              icon={<Target size={28} />}
              title={text.recommendationsEmptyTitle}
              description={text.recommendationsEmptyBody}
            />
          )}
        </section>

        <section id="smart-tools" className="theory-section tools-section section-panel" aria-labelledby="smart-tools-title">
          <div className="theory-section-head">
            <span>{text.smartToolsTitle}</span>
            <h2 id="smart-tools-title">{text.smartToolsTitle}</h2>
            <p>{text.smartToolsSubtitle}</p>
          </div>

          <div className="tool-controls">
            <label className="theory-search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">{text.toolSearchLabel}</span>
              <input
                type="search"
                value={toolQuery}
                placeholder={text.toolSearchPlaceholder}
                onChange={event => {
                  setToolQuery(event.target.value);
                  setShowAllTools(false);
                  setActiveCalculator(null);
                }}
              />
            </label>

            <PageTabs
              tabs={toolCategoryTabs}
              active={activeToolCategory}
              onChange={id => {
                setActiveToolCategory(id as GuidedToolCategoryId);
                setShowAllTools(false);
                setActiveCalculator(null);
              }}
              ariaLabel={text.smartToolsTitle}
              className="financial-theory-tabs tool-category-tabs"
            />

            <p className="tool-results-summary" aria-live="polite">
              {toolsDisplaySummary}
            </p>
          </div>

          {filteredCalculators.length > 0 ? (
            <>
            <CardsGrid className="tools-grid">
              {visibleCalculators.map((tool, index) => {
              const Icon = [Calculator, Landmark, PiggyBank, WalletCards, Gauge, Sparkles, ShieldAlert, Brain, Target][index] ?? Calculator;
              const title = getFinancialTheoryText(tool.title, locale);
              const calculatorId = isCalculatorId(tool.id) ? tool.id : null;
              return (
                <AppCard key={tool.id} className="smart-tool-card">
                  <div className="smart-tool-top">
                    <div className="smart-tool-icon" aria-hidden="true"><Icon size={22} /></div>
                    <span className="status available">{text.available}</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{getFinancialTheoryText(tool.description, locale)}</p>
                  <div className="tool-theory-badges" aria-label={THEORY_CALCULATOR_TEXT[locale].theoryConnection}>
                    {tool.relatedTheories.map(item => (
                      <span key={getFinancialTheoryText(item, locale)}>{getFinancialTheoryText(item, locale)}</span>
                    ))}
                  </div>
                  {tool.href ? (
                    <Link
                      href={tool.href}
                      className="smart-tool-action"
                      aria-label={`${getFinancialTheoryText(tool.cta, locale)}: ${title}`}
                      onClick={() => markToolUsed(tool.id)}
                    >
                      {getFinancialTheoryText(tool.cta, locale)}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </Link>
                  ) : calculatorId ? (
                    <button
                      type="button"
                      className="smart-tool-action"
                      aria-label={`${getFinancialTheoryText(tool.cta, locale)}: ${title}`}
                      onClick={() => openCalculator(calculatorId)}
                    >
                      {getFinancialTheoryText(tool.cta, locale)}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </button>
                  ) : null}
                </AppCard>
              );
              })}
            </CardsGrid>
            {canShowMoreTools ? (
              <button type="button" className="show-more-button" onClick={() => setShowAllTools(value => !value)}>
                {showAllTools ? text.showLess : text.showMore}
              </button>
            ) : null}
            </>
          ) : (
            <EmptyState
              icon={<Calculator size={28} />}
              title={text.noTools}
              description={text.noToolsDescription}
            />
          )}

          {activeCalculator ? (
            <div id="active-smart-calculator">
              <SmartCalculatorPanel
                activeId={activeCalculator}
                tool={THEORY_CALCULATORS.find(tool => tool.id === activeCalculator) ?? THEORY_CALCULATORS[0]}
                lang={locale}
                defaultCurrency={defaultCurrency}
                healthSnapshot={healthSnapshot}
                onClose={() => setActiveCalculator(null)}
              />
            </div>
          ) : null}
        </section>

      </DashboardPageShell>

      <style jsx global>{`
        .financial-theories-shell {
          min-height: 100vh;
          background: var(--sfm-page-gradient);
          color: var(--sfm-foreground);
          overflow-x: clip;
          scroll-behavior: smooth;
        }

        .financial-theories-content {
          display: grid;
          gap: 20px;
          min-width: 0;
        }

        .financial-theories-hero {
          position: relative;
          overflow: hidden;
          min-height: 220px;
          padding: 26px !important;
          align-items: center !important;
        }

        .financial-theories-hero h1,
        .financial-theories-hero p,
        .hero-note {
          max-width: 100%;
          white-space: normal;
          overflow-wrap: anywhere;
        }

        .financial-theories-hero::before {
          content: '';
          position: absolute;
          inset: 18px 22px auto auto;
          width: min(360px, 42%);
          height: 138px;
          opacity: .42;
          border-radius: 999px;
          background:
            repeating-linear-gradient(
              150deg,
              rgba(167, 243, 240, .2) 0 2px,
              transparent 2px 22px
            );
          transform: rotate(-7deg);
          pointer-events: none;
        }

        .hero-note {
          display: inline-flex;
          max-width: 330px;
          border-radius: 14px;
          border: 1px solid rgba(167, 243, 240, .18);
          background: rgba(255, 255, 255, .08);
          color: #D9ECFF;
          padding: 9px 11px;
          line-height: 1.55;
          font-size: 12px;
          font-weight: 900;
        }

        .theory-primary-link,
        .theory-secondary-link,
        .starter-theory-card button,
        .smart-tool-card a,
        .smart-tool-card button,
        .cta-actions a {
          min-height: 40px;
          border-radius: 13px;
          padding: 0 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font: 950 13px Tajawal, Arial, sans-serif;
          text-decoration: none;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease, color .18s ease;
          white-space: nowrap;
        }

        .theory-primary-link,
        .starter-theory-card button,
        .cta-actions a:first-child {
          border: 0;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
          box-shadow: 0 16px 38px rgba(24, 212, 212, .24);
        }

        .theory-secondary-link,
        .cta-actions a {
          border: 1px solid rgba(167, 243, 240, .25);
          background: rgba(255, 255, 255, .09);
          color: #EAF6FF;
        }

        .theory-primary-link:hover,
        .theory-secondary-link:hover,
        .starter-theory-card button:hover,
        .smart-tool-card a:hover,
        .smart-tool-card button.smart-tool-action:hover,
        .cta-actions a:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 44px rgba(24, 212, 212, .24);
        }

        .learning-overview {
          display: grid;
          grid-template-columns: minmax(250px, .42fr) minmax(0, 1fr);
          gap: 16px;
          align-items: stretch;
          min-width: 0;
        }

        .learning-progress-card {
          display: grid;
          gap: 10px;
          padding: 14px 16px !important;
          border: 1px solid rgba(15, 118, 110, .20) !important;
          background: rgba(45, 212, 191, .14) !important;
        }

        .learning-progress-copy {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: var(--sfm-heading);
          font-weight: 950;
        }

        .learning-progress-copy span {
          color: #0F766E;
        }

        .learning-progress-copy strong {
          color: var(--sfm-heading);
        }

        .learning-progress-track {
          height: 8px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(15, 118, 110, .15);
        }

        .learning-progress-track span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          transition: width .2s ease;
        }

        .learning-progress-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .learning-progress-metrics span {
          min-height: 44px;
          display: grid;
          align-content: center;
          gap: 2px;
          border-radius: 14px;
          border: 1px solid rgba(15, 118, 110, .16);
          background: rgba(255, 255, 255, .48);
          color: var(--sfm-muted-readable);
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 900;
        }

        .learning-progress-metrics b {
          color: var(--sfm-heading);
          font-size: 15px;
        }

        .guided-goal-section,
        .theory-of-day-section,
        .recommendations-section {
          scroll-margin-top: 22px;
        }

        .goal-path-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          min-width: 0;
        }

        .goal-path-card {
          min-width: 0;
          min-height: 108px;
          display: grid;
          align-content: start;
          gap: 7px;
          border: 1px solid var(--sfm-border);
          border-radius: 20px;
          background: var(--sfm-light-card);
          color: var(--sfm-heading);
          padding: 15px;
          text-align: start;
          cursor: pointer;
          box-shadow: 0 12px 26px rgba(3, 18, 37, .045);
          transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease, background .18s ease, color .18s ease;
        }

        .goal-path-card strong {
          color: var(--sfm-heading);
          font-size: 15px;
          line-height: 1.35;
        }

        .goal-path-card span {
          color: var(--sfm-muted-readable);
          font-size: 12px;
          font-weight: 820;
          line-height: 1.55;
        }

        .goal-path-card:hover,
        .goal-path-card.active {
          transform: translateY(-2px);
          border-color: rgba(24, 212, 212, .40);
          box-shadow: var(--sfm-interactive-glow);
        }

        .goal-path-card.active {
          background: linear-gradient(135deg, rgba(29, 140, 255, .14), rgba(24, 212, 212, .16));
        }

        .learning-level-panel {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 14px;
          align-items: center;
          border: 1px solid rgba(24, 212, 212, .18);
          border-radius: 20px;
          background: rgba(24, 212, 212, .07);
          padding: 14px;
        }

        .learning-level-panel span {
          display: block;
          color: var(--sfm-primary-hover);
          font-size: 12px;
          font-weight: 950;
        }

        .learning-level-panel strong {
          display: block;
          color: var(--sfm-heading);
          margin-top: 3px;
          font-size: 17px;
        }

        .learning-level-panel p {
          margin: 3px 0 0;
          color: var(--sfm-muted-readable);
          font-weight: 820;
          line-height: 1.55;
        }

        .learning-level-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-end;
        }

        .learning-level-tabs button,
        .show-more-button {
          min-height: 38px;
          border-radius: 999px;
          border: 1px solid var(--sfm-border);
          background: var(--sfm-card);
          color: var(--sfm-heading);
          padding: 0 14px;
          font: 950 12px Tajawal, Arial, sans-serif;
          cursor: pointer;
          transition: transform .18s ease, border-color .18s ease, background .18s ease, color .18s ease;
        }

        .learning-level-tabs button.active,
        .show-more-button:hover {
          border-color: transparent;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
        }

        .theory-of-day-card {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 18px;
          align-items: center;
          min-width: 0;
          border-radius: 24px;
          border: 1px solid rgba(24, 212, 212, .22);
          background:
            radial-gradient(circle at 0% 0%, rgba(24, 212, 212, .18), transparent 34%),
            linear-gradient(135deg, rgba(29, 140, 255, .08), rgba(24, 212, 212, .07)),
            var(--sfm-card);
          padding: 18px;
        }

        .theory-of-day-icon {
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          color: #FFFFFF;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          box-shadow: 0 16px 34px rgba(29, 140, 255, .22);
        }

        .theory-of-day-card span {
          color: var(--sfm-primary-hover);
          font-size: 12px;
          font-weight: 950;
        }

        .theory-of-day-card h2 {
          margin: 5px 0;
          color: var(--sfm-heading);
          font-size: clamp(24px, 3vw, 34px);
          line-height: 1.16;
        }

        .theory-of-day-card p {
          margin: 0;
          color: var(--sfm-body);
          line-height: 1.65;
          font-weight: 820;
        }

        .featured-example-box {
          display: grid;
          gap: 4px;
          margin-top: 12px;
          border-radius: 16px;
          border: 1px solid rgba(15, 118, 110, .20);
          background: rgba(45, 212, 191, .13);
          padding: 11px 12px;
        }

        .featured-example-box small {
          color: var(--sfm-primary-hover);
          font-weight: 950;
        }

        .featured-example-box strong {
          color: var(--sfm-heading);
          line-height: 1.6;
        }

        .theory-of-day-card button {
          min-height: 46px;
          border: 0;
          border-radius: 15px;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
          padding: 0 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font: 950 13px Tajawal, Arial, sans-serif;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 16px 34px rgba(29, 140, 255, .22);
        }

        .guided-filter-summary {
          min-height: 42px;
          border-radius: 14px;
          border: 1px solid rgba(24, 212, 212, .18);
          background: rgba(24, 212, 212, .08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 13px;
        }

        .guided-filter-summary span {
          color: var(--sfm-muted-readable);
          font-weight: 950;
          font-size: 12px;
        }

        .guided-filter-summary strong {
          color: var(--sfm-heading);
          font-size: 18px;
        }

        .theory-accordion-list {
          display: grid;
          gap: 12px;
          min-width: 0;
        }

        .theory-accordion {
          min-width: 0;
          border: 1px solid var(--sfm-border);
          border-radius: 22px;
          background: var(--sfm-light-card);
          overflow: hidden;
        }

        .theory-accordion-head {
          width: 100%;
          min-height: 78px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 14px;
          align-items: center;
          border: 0;
          background: transparent;
          color: var(--sfm-heading);
          padding: 16px;
          text-align: start;
          cursor: pointer;
        }

        .theory-accordion-head span {
          color: var(--sfm-primary-hover);
          font-size: 12px;
          font-weight: 950;
        }

        .theory-accordion-head h3 {
          margin: 4px 0;
          color: var(--sfm-heading);
          font-size: 20px;
          line-height: 1.25;
        }

        .theory-accordion-head p {
          margin: 0;
          color: var(--sfm-muted-readable);
          line-height: 1.55;
          font-weight: 820;
        }

        .theory-accordion-head svg {
          transition: transform .18s ease;
        }

        .theory-accordion-head[aria-expanded="true"] svg {
          transform: rotate(180deg);
        }

        .theory-accordion-body {
          display: grid;
          gap: 12px;
          padding: 0 16px 16px;
        }

        .show-more-button {
          width: fit-content;
          justify-self: center;
          margin-top: 2px;
        }

        .tool-controls {
          display: grid;
          grid-template-columns: minmax(230px, .34fr) minmax(0, 1fr);
          gap: 12px;
          align-items: center;
          min-width: 0;
        }

        .tool-results-summary {
          grid-column: 1 / -1;
          width: fit-content;
          max-width: 100%;
          margin: 0;
          border: 1px solid rgba(15, 118, 110, .18);
          border-radius: 999px;
          background: rgba(45, 212, 191, .12);
          color: #0F766E;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 950;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .learning-stats-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 10px !important;
          align-content: stretch;
        }

        .theory-stat-card {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: center;
          gap: 12px;
          min-height: 86px;
          padding: 14px !important;
          border: 1px solid var(--sfm-border) !important;
          background: var(--sfm-card) !important;
        }

        .theory-stat-card > span,
        .why-icon,
        .theory-icon,
        .smart-tool-icon {
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary);
          border: 1px solid rgba(29, 140, 255, .13);
        }

        .theory-stat-card > span {
          width: 38px;
          height: 38px;
          border-radius: 13px;
        }

        .theory-stat-card strong {
          display: block;
          color: var(--sfm-heading);
          font-size: 25px;
          line-height: 1;
        }

        .theory-stat-card p {
          margin: 3px 0 0;
          color: var(--sfm-muted-readable);
          font-weight: 900;
          line-height: 1.25;
          font-size: 12px;
        }

        .why-card {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) minmax(260px, .72fr);
          gap: 16px;
          align-items: center;
          padding: 18px !important;
          background:
            radial-gradient(circle at 0% 0%, rgba(24, 212, 212, .16), transparent 30%),
            var(--sfm-card) !important;
          border: 1px solid var(--sfm-border) !important;
        }

        .why-icon {
          width: 48px;
          height: 48px;
          border-radius: 16px;
        }

        .why-copy span,
        .theory-section-head span {
          color: var(--sfm-primary-hover);
          font-size: 12px;
          font-weight: 950;
        }

        .why-copy h2,
        .theory-section-head h2,
        .theories-cta h2 {
          margin: 6px 0;
          color: var(--sfm-heading);
          font-size: clamp(22px, 2.6vw, 30px);
          line-height: 1.15;
        }

        .why-copy p,
        .theory-section-head p,
        .theories-cta p {
          margin: 0;
          color: var(--sfm-muted-readable);
          line-height: 1.7;
          font-weight: 780;
        }

        .why-list {
          margin: 0;
          padding: 0;
          display: grid;
          gap: 8px;
          list-style: none;
        }

        .why-list li {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 9px;
          align-items: center;
          border: 1px solid rgba(24, 212, 212, .16);
          border-radius: 13px;
          background: rgba(24, 212, 212, .07);
          padding: 10px 12px;
          color: var(--sfm-heading);
          font-weight: 900;
        }

        .why-list svg {
          color: var(--sfm-success);
        }

        .theory-section {
          display: grid;
          gap: 16px;
          min-width: 0;
          scroll-margin-top: 22px;
        }

        .section-panel {
          border: 1px solid var(--sfm-border);
          border-radius: 26px;
          background: var(--sfm-card);
          box-shadow: 0 14px 34px rgba(3, 18, 37, .045);
          padding: 20px;
        }

        .theory-section-head {
          max-width: 860px;
          min-width: 0;
        }

        .theory-controls {
          display: grid;
          grid-template-columns: minmax(240px, .36fr) minmax(0, 1fr);
          gap: 12px;
          align-items: center;
          min-width: 0;
          border: 1px solid var(--sfm-border);
          border-radius: 18px;
          background: var(--sfm-card);
          padding: 12px;
          box-shadow: 0 12px 30px rgba(3, 18, 37, .05);
        }

        .theory-search {
          min-width: 0;
          min-height: 42px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 10px;
          align-items: center;
          border: 1px solid var(--sfm-border);
          border-radius: 14px;
          background: var(--sfm-input-bg);
          color: var(--sfm-primary-hover);
          padding: 0 14px;
        }

        .theory-search input {
          min-width: 0;
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--sfm-foreground);
          font: 900 14px Tajawal, Arial, sans-serif;
        }

        .theory-search input::placeholder {
          color: var(--sfm-muted);
          opacity: .9;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .financial-theory-tabs {
          padding-bottom: 0 !important;
          overflow-x: auto;
          scrollbar-width: thin;
        }

        .theory-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
          gap: 18px;
          align-items: stretch;
          min-width: 0;
        }

        .theory-card {
          position: relative;
          display: grid;
          grid-template-rows: auto auto auto auto 1fr auto;
          gap: 12px;
          min-width: 0;
          min-height: 100%;
          padding: 18px;
          border-radius: 20px;
          border: 1px solid var(--sfm-border);
          background: var(--sfm-card);
          box-shadow: 0 14px 32px rgba(3, 18, 37, .065);
          overflow: hidden;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease;
        }

        .theory-card:hover,
        .theory-card.expanded {
          border-color: rgba(24, 212, 212, .35);
          box-shadow: var(--sfm-interactive-glow);
          transform: translateY(-2px);
        }

        .theory-card-head {
          display: grid;
          grid-template-columns: auto auto minmax(0, 1fr);
          gap: 9px;
          align-items: start;
          min-width: 0;
        }

        .theory-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: var(--sfm-midnight);
          color: var(--sfm-soft-cyan);
          font-size: 13px;
          font-weight: 950;
          box-shadow: inset 0 -2px 0 rgba(24, 212, 212, .28);
        }

        .theory-icon {
          width: 36px;
          height: 36px;
          border-radius: 12px;
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

        .theory-level-badge {
          border-color: rgba(24, 212, 212, .18);
          background: rgba(24, 212, 212, .09);
          color: #0F766E;
        }

        .theory-card-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
          min-width: 0;
        }

        .theory-read-badge {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          min-height: 22px;
          border-radius: 999px;
          border: 1px solid rgba(16, 185, 129, .22);
          background: rgba(16, 185, 129, .12);
          color: #047857;
          padding: 0 9px;
          font-size: 11px;
          font-weight: 950;
          line-height: 1;
        }

        .theory-card h3 {
          margin: 8px 0 0;
          color: var(--sfm-heading);
          font-size: 19px;
          line-height: 1.3;
        }

        .theory-short {
          margin: 0;
          color: var(--sfm-body);
          line-height: 1.62;
          font-weight: 800;
        }

        .theory-meta-row {
          min-width: 0;
          border: 1px solid rgba(15, 118, 110, .20);
          border-radius: 13px;
          background: rgba(45, 212, 191, .14);
          padding: 9px 10px;
        }

        .theory-meta-row span,
        .theory-tool-pill span,
        .featured-tool small,
        .practical-example-card small {
          display: block;
          color: var(--sfm-muted);
          font-size: 11px;
          font-weight: 950;
          margin-bottom: 3px;
        }

        .theory-meta-row strong,
        .theory-tool-pill strong {
          display: block;
          color: var(--sfm-heading);
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .theory-tool-pill {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-width: 0;
          border-radius: 999px;
          border: 1px solid rgba(29, 140, 255, .12);
          background: rgba(29, 140, 255, .055);
          padding: 8px 10px;
        }

        .theory-tool-pill span {
          margin: 0;
          flex: 0 0 auto;
        }

        .theory-tool-pill strong {
          min-width: 0;
          text-align: end;
          font-size: 12px;
        }

        .theory-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          min-width: 0;
          align-self: end;
        }

        .theory-actions button,
        .theory-actions a {
          min-height: 36px;
          border-radius: 12px;
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
          cursor: pointer;
        }

        .theory-actions .theory-primary-action {
          border: 0;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
        }

        .theory-actions button svg {
          transition: transform .18s ease;
        }

        .theory-card.expanded .theory-actions button[aria-expanded="true"] svg {
          transform: rotate(180deg);
        }

        .theory-actions a,
        .theory-actions .theory-secondary-action {
          border: 1px solid var(--sfm-border);
          background: var(--sfm-light-card);
          color: var(--sfm-heading);
        }

        .theory-actions button:hover,
        .theory-actions a:hover {
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
          color: var(--sfm-heading);
          font-size: 15px;
        }

        .detail-block p,
        .detail-block li {
          margin: 0;
          color: var(--sfm-body);
          line-height: 1.72;
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
          color: var(--sfm-heading);
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
          background: rgba(45, 212, 191, .14);
          border: 1px solid rgba(15, 118, 110, .20);
          padding: 12px;
        }

        .mistake-block {
          border-radius: 16px;
          border: 1px solid rgba(245, 158, 11, .22);
          background: rgba(245, 158, 11, .08);
          padding: 12px;
        }

        .tool-block small {
          display: block;
          margin-top: 8px;
          color: var(--sfm-muted-readable);
          font-weight: 850;
          line-height: 1.55;
        }

        .theory-mark-read {
          width: fit-content;
          min-height: 34px;
          border-radius: 12px;
          border: 1px solid rgba(15, 118, 110, .22);
          background: rgba(45, 212, 191, .14);
          color: #0F766E;
          padding: 0 12px;
          font: 950 12px Tajawal, Arial, sans-serif;
          cursor: pointer;
        }

        .theory-mark-read:disabled {
          cursor: default;
          opacity: .72;
        }

        .starter-theory-grid,
        .examples-grid,
        .tools-grid {
          align-items: stretch;
          grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)) !important;
          gap: 16px !important;
        }

        .starter-theory-card,
        .smart-tool-card,
        .practical-example-card {
          display: grid;
          align-content: start;
          gap: 11px;
          min-width: 0;
          min-height: 100%;
          padding: 16px !important;
          border: 1px solid var(--sfm-border) !important;
          background: var(--sfm-card) !important;
        }

        .featured-index {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: var(--sfm-midnight);
          color: var(--sfm-soft-cyan);
          font-weight: 950;
          font-size: 12px;
        }

        .starter-theory-card h3,
        .smart-tool-card h3,
        .practical-example-card h3 {
          margin: 0;
          color: var(--sfm-heading);
          font-size: 18px;
          line-height: 1.35;
        }

        .starter-theory-card p,
        .smart-tool-card p,
        .practical-example-card p {
          margin: 0;
          color: var(--sfm-body);
          line-height: 1.6;
          font-weight: 800;
        }

        .tool-category-tabs {
          border-radius: 18px;
          border: 1px solid var(--sfm-border);
          background: var(--sfm-card);
          padding: 10px !important;
        }

        .tool-theory-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          min-width: 0;
        }

        .tool-theory-badges span {
          min-height: 26px;
          display: inline-flex;
          align-items: center;
          max-width: 100%;
          border-radius: 999px;
          border: 1px solid rgba(24, 212, 212, .18);
          background: rgba(24, 212, 212, .08);
          color: var(--sfm-primary-hover);
          padding: 0 9px;
          font-size: 11px;
          font-weight: 950;
          overflow-wrap: anywhere;
        }

        .featured-tool {
          display: grid;
          gap: 4px;
          margin-top: auto;
          border-radius: 13px;
          border: 1px solid rgba(29, 140, 255, .12);
          background: rgba(29, 140, 255, .06);
          padding: 8px 9px;
        }

        .featured-tool strong {
          color: var(--sfm-heading);
          line-height: 1.45;
        }

        .starter-theory-card button {
          width: fit-content;
          cursor: pointer;
        }

        .example-label {
          width: fit-content;
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius: 999px;
          border: 1px solid rgba(24, 212, 212, .18);
          background: rgba(24, 212, 212, .09);
          color: var(--sfm-primary-hover);
          padding: 0 10px;
          font-size: 11px;
          font-weight: 950;
        }

        .practical-example-card strong {
          margin-top: auto;
          color: var(--sfm-heading);
          line-height: 1.55;
          font-size: 13px;
        }

        .smart-tool-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .smart-tool-icon {
          width: 40px;
          height: 40px;
          border-radius: 14px;
        }

        .financial-theories-shell .status {
          min-height: 26px;
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 0 10px;
          font-size: 11px;
          font-weight: 950;
        }

        .financial-theories-shell .status.available {
          background: rgba(22, 163, 74, .1);
          color: #15803D;
          border: 1px solid rgba(22, 163, 74, .18);
        }

        .smart-tool-card a,
        .smart-tool-card button {
          width: fit-content;
          margin-top: auto;
        }

        .smart-tool-card a {
          border: 1px solid var(--sfm-border);
          background: var(--sfm-light-card);
          color: var(--sfm-heading);
        }

        .smart-tool-card button {
          border: 1px dashed rgba(29, 140, 255, .22);
          background: rgba(29, 140, 255, .07);
          color: var(--sfm-primary-hover);
          cursor: not-allowed;
        }

        .smart-tool-card button.smart-tool-action {
          border: 0;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
          cursor: pointer;
          box-shadow: 0 12px 26px rgba(29, 140, 255, .18);
        }

        .calculator-panel {
          display: grid;
          gap: 18px;
          min-width: 0;
          border: 1px solid rgba(24, 212, 212, .22);
          border-radius: 22px;
          background:
            radial-gradient(circle at 10% 0%, rgba(24, 212, 212, .12), transparent 32%),
            var(--sfm-light-card);
          padding: 18px;
          box-shadow: 0 18px 44px rgba(3, 18, 37, .08);
          scroll-margin-top: 20px;
        }

        .calculator-panel-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          min-width: 0;
        }

        .calculator-panel-head span {
          color: var(--sfm-primary-hover);
          font-size: 12px;
          font-weight: 950;
        }

        .calculator-panel-head h3 {
          margin: 5px 0;
          color: var(--sfm-heading);
          font-size: 22px;
          line-height: 1.25;
        }

        .calculator-panel-head p,
        .calculator-note {
          margin: 0;
          color: var(--sfm-muted-readable);
          line-height: 1.65;
          font-weight: 820;
        }

        .calculator-close {
          width: 40px;
          height: 40px;
          border: 1px solid var(--sfm-border);
          border-radius: 13px;
          background: var(--sfm-card);
          color: var(--sfm-heading);
          cursor: pointer;
          display: grid;
          place-items: center;
        }

        .calculator-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(280px, .72fr);
          gap: 16px;
          align-items: start;
          min-width: 0;
        }

        .calculator-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          min-width: 0;
        }

        .debt-payoff-fields,
        .risk-question-list {
          grid-column: 1 / -1;
          display: grid;
          gap: 12px;
          min-width: 0;
        }

        .debt-row-card {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
          gap: 10px;
          align-items: end;
          min-width: 0;
          border: 1px solid rgba(29, 140, 255, .14);
          border-radius: 16px;
          background: var(--sfm-card);
          padding: 12px;
        }

        .calculator-prefill,
        .calculator-remove {
          min-height: 44px;
          width: fit-content;
          border-radius: 13px;
          border: 1px solid rgba(24, 212, 212, .26);
          background: rgba(24, 212, 212, .10);
          color: var(--sfm-primary-hover);
          padding: 0 13px;
          font: 950 13px Tajawal, Arial, sans-serif;
          cursor: pointer;
        }

        .calculator-prefill:disabled {
          cursor: not-allowed;
          opacity: .6;
        }

        .calculator-remove {
          border-color: rgba(239, 68, 68, .22);
          background: rgba(239, 68, 68, .08);
          color: #B91C1C;
        }

        .risk-question {
          min-width: 0;
          border: 1px solid rgba(29, 140, 255, .14);
          border-radius: 16px;
          background: var(--sfm-card);
          padding: 12px;
        }

        .risk-question legend {
          color: var(--sfm-heading);
          font-weight: 950;
          padding: 0 4px;
        }

        .risk-question div {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }

        .risk-question button {
          min-height: 38px;
          border-radius: 999px;
          border: 1px solid rgba(29, 140, 255, .18);
          background: var(--sfm-light-card);
          color: var(--sfm-heading);
          padding: 0 12px;
          font: 900 12px Tajawal, Arial, sans-serif;
          cursor: pointer;
        }

        .risk-question button.selected {
          border-color: rgba(24, 212, 212, .42);
          background: linear-gradient(135deg, rgba(29, 140, 255, .18), rgba(24, 212, 212, .18));
          color: var(--sfm-primary-hover);
        }

        .calculator-mode-actions {
          grid-column: 1 / -1;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }

        .calculator-mode-actions button {
          min-height: 40px;
          border: 0;
          border-radius: 13px;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
          padding: 0 13px;
          font: 950 13px Tajawal, Arial, sans-serif;
          cursor: pointer;
        }

        .calculator-mode-actions button:disabled {
          cursor: not-allowed;
          opacity: .58;
          filter: grayscale(.15);
        }

        .calculator-mode-actions span {
          color: var(--sfm-muted-readable);
          font-size: 12px;
          font-weight: 950;
        }

        .calculator-field {
          display: grid;
          gap: 7px;
          min-width: 0;
        }

        .calculator-field > span,
        .calculator-total span {
          color: var(--sfm-muted-readable);
          font-size: 12px;
          font-weight: 950;
        }

        .calculator-input-wrap {
          position: relative;
          display: block;
          min-width: 0;
        }

        .calculator-field input,
        .calculator-field select {
          width: 100%;
          min-height: 50px;
          border: 1px solid rgba(29, 140, 255, .20);
          border-radius: 14px;
          background: var(--sfm-input-bg);
          color: var(--sfm-foreground);
          padding: 0 12px;
          font: 900 14px Tajawal, Arial, sans-serif;
          outline: none;
        }

        .calculator-input-wrap input {
          padding-inline-end: 46px;
        }

        .calculator-input-wrap em {
          position: absolute;
          inset-inline-end: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--sfm-primary-hover);
          font-style: normal;
          font-weight: 950;
          pointer-events: none;
        }

        .calculator-total {
          min-height: 50px;
          display: grid;
          align-content: center;
          gap: 4px;
          border-radius: 14px;
          border: 1px solid rgba(29, 140, 255, .16);
          background: var(--sfm-card);
          padding: 9px 12px;
        }

        .calculator-total strong {
          color: var(--sfm-heading);
          font-size: 18px;
        }

        .calculator-total.ok {
          border-color: rgba(16, 185, 129, .28);
          background: rgba(16, 185, 129, .08);
        }

        .calculator-total.error {
          border-color: rgba(239, 68, 68, .24);
          background: rgba(239, 68, 68, .08);
        }

        .calculator-results {
          display: grid;
          gap: 10px;
          min-width: 0;
        }

        .calculator-result-group {
          display: grid;
          gap: 10px;
          min-width: 0;
        }

        .calculator-result-group > strong {
          color: var(--sfm-heading);
          font-size: 14px;
        }

        .calculator-result-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          min-width: 0;
        }

        .calculator-result-card {
          border: 1px solid var(--sfm-border);
          border-radius: 16px;
          background: var(--sfm-card);
          padding: 12px;
          display: grid;
          gap: 5px;
          min-width: 0;
        }

        .calculator-result-card span {
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 950;
        }

        .calculator-result-card strong {
          color: var(--sfm-heading);
          font-size: clamp(18px, 2vw, 24px);
          line-height: 1.2;
          overflow-wrap: anywhere;
        }

        .calculator-result-card.strong {
          border-color: rgba(24, 212, 212, .28);
          background: linear-gradient(135deg, rgba(29, 140, 255, .10), rgba(24, 212, 212, .10));
        }

        .calculator-result-card.warning {
          border-color: rgba(245, 158, 11, .24);
          background: rgba(245, 158, 11, .08);
        }

        .calculator-error,
        .calculator-success {
          margin: 0;
          border-radius: 14px;
          padding: 11px 12px;
          line-height: 1.65;
          font-weight: 920;
        }

        .calculator-error {
          border: 1px solid rgba(239, 68, 68, .18);
          background: rgba(239, 68, 68, .08);
          color: #B91C1C;
        }

        .calculator-wide {
          grid-column: 1 / -1;
        }

        .calculator-success {
          border: 1px solid rgba(16, 185, 129, .20);
          background: rgba(16, 185, 129, .10);
          color: #047857;
        }

        .calculator-list-card {
          border: 1px solid var(--sfm-border);
          border-radius: 16px;
          background: var(--sfm-card);
          padding: 12px;
          display: grid;
          gap: 8px;
        }

        .calculator-list-card strong {
          color: var(--sfm-heading);
          font-size: 14px;
        }

        .calculator-list-card ul {
          margin: 0;
          padding-inline-start: 18px;
          display: grid;
          gap: 6px;
        }

        .calculator-list-card li {
          color: var(--sfm-body);
          line-height: 1.55;
          font-weight: 820;
        }

        .calculator-list-card p {
          margin: 0;
          color: var(--sfm-body);
          line-height: 1.65;
          font-weight: 820;
        }

        .calculator-actions {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
        }

        .calculator-actions button {
          min-height: 40px;
          border-radius: 13px;
          border: 1px solid var(--sfm-border);
          background: var(--sfm-card);
          color: var(--sfm-heading);
          padding: 0 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font: 950 13px Tajawal, Arial, sans-serif;
          cursor: pointer;
        }

        .theories-cta {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 20px;
          align-items: center;
          border-radius: 26px;
          padding: 28px;
          color: #EAF6FF;
          background:
            radial-gradient(circle at 14% 14%, rgba(24, 212, 212, .22), transparent 30%),
            linear-gradient(135deg, #031225, #061B33 56%, #0B2748);
          border: 1px solid rgba(167, 243, 240, .18);
          box-shadow: 0 24px 70px rgba(3, 18, 37, .22);
        }

        .theories-cta span {
          color: #A7F3F0;
          font-size: 12px;
          font-weight: 950;
        }

        .theories-cta h2 {
          color: #FFFFFF;
          margin: 8px 0;
        }

        .theories-cta p {
          color: #D9ECFF;
          font-size: 15px;
          font-weight: 850;
          max-width: 760px;
        }

        .cta-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 9px;
        }

        .cta-actions a {
          min-height: 46px;
          border-color: rgba(167, 243, 240, .36);
          background: rgba(255, 255, 255, .10);
          color: #EAF6FF;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .04);
        }

        .cta-actions a:first-child {
          border-color: transparent;
          color: #FFFFFF;
        }

        .financial-theories-shell a:focus-visible,
        .financial-theories-shell button:focus-visible,
        .financial-theories-shell input:focus-visible,
        .financial-theories-shell select:focus-visible {
          outline: 3px solid rgba(24, 212, 212, .56);
          outline-offset: 3px;
        }

        .dark .financial-theories-shell .section-panel,
        .dark .financial-theories-shell .theory-controls,
        .dark .financial-theories-shell .theory-card,
        .dark .financial-theories-shell .theory-stat-card,
        .dark .financial-theories-shell .why-card,
        .dark .financial-theories-shell .goal-path-card,
        .dark .financial-theories-shell .learning-level-panel,
        .dark .financial-theories-shell .theory-accordion,
        .dark .financial-theories-shell .theory-of-day-card,
        .dark .financial-theories-shell .learning-progress-metrics span,
        .dark .financial-theories-shell .starter-theory-card,
        .dark .financial-theories-shell .smart-tool-card,
        .dark .financial-theories-shell .practical-example-card {
          border-color: var(--sfm-border);
          background: var(--sfm-card) !important;
          box-shadow: 0 18px 44px rgba(0, 0, 0, .22);
        }

        .dark .financial-theories-shell .theory-search,
        .dark .financial-theories-shell .guided-filter-summary,
        .dark .financial-theories-shell .detail-block th,
        .dark .financial-theories-shell .detail-block td,
        .dark .financial-theories-shell .calculator-field input,
        .dark .financial-theories-shell .calculator-field select {
          background: var(--sfm-input-bg);
        }

        .dark .financial-theories-shell .calculator-panel,
        .dark .financial-theories-shell .calculator-result-card,
        .dark .financial-theories-shell .calculator-list-card,
        .dark .financial-theories-shell .calculator-total,
        .dark .financial-theories-shell .debt-row-card,
        .dark .financial-theories-shell .risk-question,
        .dark .financial-theories-shell .calculator-actions button,
        .dark .financial-theories-shell .calculator-close {
          border-color: var(--sfm-border);
          background: var(--sfm-card);
        }

        .dark .financial-theories-shell .calculator-error {
          color: #FCA5A5;
        }

        .dark .financial-theories-shell .calculator-success {
          color: #86EFAC;
        }

        .dark .financial-theories-shell .status.available {
          background: rgba(16, 185, 129, .16);
          color: #86EFAC;
          border-color: rgba(16, 185, 129, .28);
        }

        .dark .financial-theories-shell .tool-results-summary {
          border-color: rgba(47, 214, 192, .30);
          background: rgba(47, 214, 192, .12);
          color: #B8FFF4;
        }

        .dark .financial-theories-shell .learning-progress-card,
        .dark .financial-theories-shell .theory-meta-row,
        .dark .financial-theories-shell .featured-example-box,
        .dark .financial-theories-shell .tool-block,
        .dark .financial-theories-shell .theory-mark-read {
          border-color: rgba(47, 214, 192, .25) !important;
          background: rgba(47, 214, 192, .10) !important;
        }

        .dark .financial-theories-shell .learning-progress-copy span,
        .dark .financial-theories-shell .theory-level-badge,
        .dark .financial-theories-shell .theory-mark-read {
          color: #E8EEF6;
        }

        .dark .financial-theories-shell .mistake-block {
          border-color: rgba(245, 185, 66, .25);
          background: rgba(245, 185, 66, .10);
        }

        .dark .financial-theories-shell .theory-read-badge {
          background: rgba(16, 185, 129, .16);
          color: #86EFAC;
          border-color: rgba(16, 185, 129, .28);
        }

        @media (min-width: 1320px) {
          .theory-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 1024px) {
          .financial-theories-shell .sfm-dashboard-page-shell {
            width: 100%;
            max-width: 100vw;
            margin-inline: 0 !important;
            padding-inline: 16px !important;
            overflow-x: hidden;
          }

          .financial-theories-shell .sfm-dashboard-page-content {
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
          }

          .financial-theories-shell .sfm-page-topbar {
            display: none;
          }

          .learning-overview,
          .why-card,
          .theory-of-day-card,
          .learning-level-panel,
          .tool-controls,
          .theories-cta {
            grid-template-columns: 1fr;
          }

          .goal-path-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .learning-level-tabs {
            justify-content: flex-start;
          }

          .cta-actions {
            justify-content: flex-start;
          }
        }

        @media (max-width: 720px) {
          .financial-theories-shell .sfm-dashboard-page-shell {
            padding-inline: 14px !important;
          }

          .financial-theories-content {
            gap: 16px;
          }

          .financial-theories-hero {
            min-height: auto;
            padding: 22px !important;
          }

          .financial-theories-hero::before {
            width: 80%;
            opacity: .24;
          }

          .theory-primary-link,
          .theory-secondary-link,
          .theory-actions button,
          .theory-actions a,
          .theory-of-day-card button,
          .smart-tool-card a,
          .smart-tool-card button,
          .calculator-actions button,
          .calculator-mode-actions button,
          .starter-theory-card button,
          .cta-actions a {
            width: 100%;
          }

          .theory-card-head {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .theory-controls {
            grid-template-columns: 1fr;
          }

          .goal-path-grid,
          .learning-progress-metrics {
            grid-template-columns: 1fr;
          }

          .goal-path-card {
            min-height: auto;
          }

          .theory-of-day-card {
            padding: 14px;
          }

          .theory-of-day-icon {
            width: 46px;
            height: 46px;
          }

          .theory-accordion-head,
          .theory-accordion-body {
            padding-inline: 12px;
          }

          .theory-accordion-body {
            padding-bottom: 12px;
          }

          .calculator-panel {
            padding: 14px;
            border-radius: 20px;
          }

          .calculator-panel-head,
          .calculator-actions {
            align-items: stretch;
            flex-direction: column;
          }

          .calculator-close {
            align-self: flex-end;
          }

          .calculator-layout,
          .calculator-form-grid,
          .calculator-result-grid,
          .debt-row-card {
            grid-template-columns: 1fr;
          }

          .debt-row-card {
            align-items: stretch;
          }

          .section-panel {
            padding: 12px;
            border-radius: 22px;
          }

          .learning-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .theory-icon {
            display: none;
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

          .smart-tool-top {
            align-items: flex-start;
          }

          .theory-tool-pill {
            align-items: flex-start;
            border-radius: 14px;
            flex-direction: column;
          }

          .theory-tool-pill strong {
            text-align: start;
          }
        }

        @media (max-width: 460px) {
          .learning-stats-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
