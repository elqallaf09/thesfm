'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { BrainCircuit, ChevronDown, Menu, X } from 'lucide-react';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { useLanguage } from '@/hooks/useLanguage';
import {
  AI_ANALYST_COPY,
  aiAnalystLocale,
  type AiAnalystNavigationGroup,
  type AiAnalystNavigationKey,
} from './copy';
import styles from './AiAnalystWorkspace.module.css';

export type AiAnalystTab = AiAnalystNavigationKey | 'timeline';

type NavigationItem = {
  key: AiAnalystNavigationKey;
  href: string;
  activeTabs?: readonly AiAnalystTab[];
};

type NavigationGroup = {
  key: AiAnalystNavigationGroup;
  items: readonly NavigationItem[];
};

export const AI_ANALYST_NAVIGATION_GROUPS = [
  {
    key: 'analysis',
    items: [
      { key: 'overview', href: '/ai-analyst/overview' },
      { key: 'analysis', href: '/ai-analyst/analyze' },
      { key: 'compare', href: '/ai-analyst/compare' },
      { key: 'agent', href: '/ai-analyst/agent' },
      { key: 'path', href: '/ai-analyst/path', activeTabs: ['path', 'timeline'] },
      { key: 'history', href: '/ai-analyst/history?view=history' },
      { key: 'future', href: '/ai-analyst/opportunities' },
    ],
  },
  {
    key: 'markets',
    items: [
      { key: 'marketLeadership', href: '/ai-analyst/market-leadership' },
      { key: 'markets', href: '/ai-analyst/markets' },
      { key: 'assetDetails', href: '/ai-analyst/analyze' },
      { key: 'marketSessions', href: '/ai-analyst/markets/sessions' },
      { key: 'marketMap', href: '/ai-analyst/markets?view=map' },
    ],
  },
  {
    key: 'monitoring',
    items: [
      { key: 'watchlist', href: '/ai-analyst/watchlist' },
      { key: 'portfolio', href: '/ai-analyst/portfolio' },
      { key: 'alerts', href: '/ai-analyst/alerts' },
      { key: 'recommendations', href: '/ai-analyst/recommendations' },
      { key: 'tradePerformance', href: '/ai-analyst/trade-performance' },
    ],
  },
  {
    key: 'knowledge',
    items: [
      { key: 'news', href: '/ai-analyst/news' },
      { key: 'calendar', href: '/ai-analyst/calendar' },
      { key: 'education', href: '/ai-analyst/education' },
    ],
  },
  {
    key: 'configuration',
    items: [
      { key: 'settings', href: '/ai-analyst/settings' },
    ],
  },
] as const satisfies readonly NavigationGroup[];

function isActive(item: NavigationItem, activeTab: AiAnalystTab) {
  return (item.activeTabs ?? [item.key]).includes(activeTab);
}

function NavigationLinks({
  group,
  activeTab,
  onNavigate,
}: {
  group: NavigationGroup;
  activeTab: AiAnalystTab;
  onNavigate?: () => void;
}) {
  const { lang } = useLanguage();
  const copy = AI_ANALYST_COPY[aiAnalystLocale(lang)];

  return (
    <ul className={styles.navigationLinks}>
      {group.items.map(item => {
        const active = isActive(item, activeTab);
        return (
          <li key={item.key}>
            <Link
              href={item.href}
              prefetch={false}
              className={styles.navigationLink}
              aria-current={active ? 'page' : undefined}
              onClick={onNavigate}
            >
              {copy.navigation.items[item.key]}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AiAnalystShell({ activeTab, children }: { activeTab: AiAnalystTab; children: ReactNode }) {
  const { dir, lang } = useLanguage();
  const locale = aiAnalystLocale(lang);
  const copy = AI_ANALYST_COPY[locale];
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  useEffect(() => {
    if (!mobileNavigationOpen) return;
    const closeMobileNavigationOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavigationOpen(false);
    };
    document.addEventListener('keydown', closeMobileNavigationOnEscape);
    return () => document.removeEventListener('keydown', closeMobileNavigationOnEscape);
  }, [mobileNavigationOpen]);

  return (
    <WorkspacePageContainer
      as="main"
      variant="full"
      className={styles.shell}
      dir={dir}
      data-testid="ai-analyst-workspace"
    >
      <header className={styles.header} aria-labelledby="ai-analyst-title">
        <span className={styles.brandIcon} aria-hidden="true"><BrainCircuit size={22} /></span>
        <div>
          <p className={styles.eyebrow}>{copy.eyebrow}</p>
          <h1 id="ai-analyst-title">{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
      </header>
      <nav className={styles.workspaceNavigation} aria-label={copy.navigation.label} data-testid="ai-analyst-tabs">
        {AI_ANALYST_NAVIGATION_GROUPS.map(group => (
          <section className={styles.navigationGroup} key={group.key} aria-labelledby={`ai-analyst-nav-${group.key}`}>
            <h2 id={`ai-analyst-nav-${group.key}`} className={styles.navigationGroupTitle}>{copy.navigation.groups[group.key]}</h2>
            <NavigationLinks group={group} activeTab={activeTab} />
          </section>
        ))}
      </nav>
      <button
        className={styles.mobileNavigationToggle}
        type="button"
        aria-expanded={mobileNavigationOpen}
        aria-controls="ai-analyst-mobile-navigation"
        onClick={() => setMobileNavigationOpen(open => !open)}
      >
        <Menu size={18} aria-hidden="true" />
        {copy.navigation.open}
      </button>
      {mobileNavigationOpen ? (
        <>
          <button
            type="button"
            className={styles.mobileNavigationBackdrop}
            aria-label={copy.navigation.close}
            onClick={() => setMobileNavigationOpen(false)}
          />
          <nav
            id="ai-analyst-mobile-navigation"
            className={styles.mobileNavigationDrawer}
            aria-label={copy.navigation.label}
            data-testid="ai-analyst-mobile-navigation"
          >
            <div className={styles.mobileNavigationHeader}>
              <strong>{copy.title}</strong>
              <button
                className={styles.mobileNavigationClose}
                type="button"
                aria-label={copy.navigation.close}
                onClick={() => setMobileNavigationOpen(false)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.mobileNavigationGroups}>
              {AI_ANALYST_NAVIGATION_GROUPS.map(group => (
                <details key={group.key} className={styles.mobileNavigationGroup} open={group.items.some(item => isActive(item, activeTab))}>
                  <summary>
                    <span>{copy.navigation.groups[group.key]}</span>
                    <ChevronDown size={16} aria-hidden="true" />
                  </summary>
                  <NavigationLinks group={group} activeTab={activeTab} onNavigate={() => setMobileNavigationOpen(false)} />
                </details>
              ))}
            </div>
          </nav>
        </>
      ) : null}
      <section className={styles.content}>{children}</section>
    </WorkspacePageContainer>
  );
}
