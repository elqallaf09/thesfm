'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { BrainCircuit } from 'lucide-react';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { useLanguage } from '@/hooks/useLanguage';
import { AI_ANALYST_COPY, aiAnalystLocale } from './copy';
import styles from './AiAnalystWorkspace.module.css';

export type AiAnalystTab = 'overview' | 'analysis' | 'timeline' | 'history' | 'compare' | 'agent' | 'future';

const TAB_ROUTES: Record<AiAnalystTab, string> = {
  overview: '/ai-analyst/overview',
  analysis: '/ai-analyst/analyze',
  timeline: '/ai-analyst/history?view=timeline',
  history: '/ai-analyst/history?view=accuracy',
  compare: '/ai-analyst/compare',
  agent: '/ai-analyst/agent',
  future: '/ai-analyst/opportunities',
};

export function AiAnalystShell({ activeTab, children }: { activeTab: AiAnalystTab; children: ReactNode }) {
  const { dir, lang } = useLanguage();
  const locale = aiAnalystLocale(lang);
  const copy = AI_ANALYST_COPY[locale];

  return (
    <WorkspacePageContainer as="main" variant="full" className={styles.shell} dir={dir} data-testid="ai-analyst-workspace">
      <header className={styles.header} aria-labelledby="ai-analyst-title">
        <span className={styles.brandIcon} aria-hidden="true"><BrainCircuit size={22} /></span>
        <div>
          <p className={styles.eyebrow}>{copy.eyebrow}</p>
          <h1 id="ai-analyst-title">{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
      </header>
      <nav className={styles.tabs} aria-label={copy.title} data-testid="ai-analyst-tabs">
        {(Object.keys(TAB_ROUTES) as AiAnalystTab[]).map(tab => (
          <Link
            key={tab}
            href={TAB_ROUTES[tab]}
            className={styles.tab}
            aria-current={activeTab === tab ? 'page' : undefined}
          >
            {copy.tabs[tab]}
          </Link>
        ))}
      </nav>
      <section className={styles.content}>{children}</section>
    </WorkspacePageContainer>
  );
}
