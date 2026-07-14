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
import { DashboardPageShell } from '@/components/DashboardPageShell';
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
      <DashboardPageShell ariaLabel={text.title} contentClassName="financial-theories-content">
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
    </div>
  );
}
