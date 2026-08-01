'use client';

import { BookOpenCheck, ChartNoAxesCombined, GraduationCap, ShieldCheck } from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { AppCard } from '@/components/layout/AppCard';
import { PageHero } from '@/components/layout/PageHero';
import { useLanguage } from '@/hooks/useLanguage';
import {
  TRADER_EDUCATION_COPY,
  TRADER_LESSON_CATEGORIES,
  type TraderEducationLanguage,
} from './_content';

const CATEGORY_ICONS = [BookOpenCheck, ShieldCheck, ChartNoAxesCombined, GraduationCap] as const;

export default function TraderEducationPage() {
  const { lang, dir } = useLanguage();
  const language = (lang === 'ar' || lang === 'fr' ? lang : 'en') as TraderEducationLanguage;
  const copy = TRADER_EDUCATION_COPY;
  const lessonCount = TRADER_LESSON_CATEGORIES.reduce((total, category) => total + category.lessons.length, 0);

  return (
    <DashboardPageShell ariaLabel={copy.title[language]} className="trader-education-shell">
      <div className="trader-education-content" dir={dir}>
        <PageHero
          eyebrow={copy.eyebrow[language]}
          title={copy.title[language]}
          subtitle={copy.subtitle[language]}
          icon={<GraduationCap size={24} />}
          status={<span className="trader-education-count">{lessonCount} {copy.lessonCount[language]}</span>}
        />

        <div className="trader-education-grid">
          {TRADER_LESSON_CATEGORIES.map((category, categoryIndex) => {
            const Icon = CATEGORY_ICONS[categoryIndex] ?? BookOpenCheck;
            return (
              <AppCard className="trader-education-category" key={category.id}>
                <header>
                  <span className="trader-education-icon" aria-hidden="true"><Icon size={20} /></span>
                  <div>
                    <h2>{category.title[language]}</h2>
                    <small>{category.lessons.length} {copy.lessonCount[language]}</small>
                  </div>
                </header>
                <div className="trader-education-lessons">
                  {category.lessons.map((lesson, lessonIndex) => (
                    <details key={lesson.title.en} open={categoryIndex === 0 && lessonIndex === 0}>
                      <summary>
                        <span>{copy.lesson[language]} {lessonIndex + 1}</span>
                        <strong>{lesson.title[language]}</strong>
                      </summary>
                      <p>{lesson.body[language]}</p>
                    </details>
                  ))}
                </div>
              </AppCard>
            );
          })}
        </div>

        <AppCard className="trader-education-disclaimer" role="note">
          <ShieldCheck size={21} aria-hidden="true" />
          <div><strong>{copy.disclaimerTitle[language]}</strong><p>{copy.disclaimer[language]}</p></div>
        </AppCard>
      </div>

      <style jsx global>{`
        .trader-education-shell{min-height:100%;background:var(--background);color:var(--foreground)}
        .trader-education-content{display:grid;gap:20px}
        .trader-education-count{display:inline-flex;align-items:center;min-height:32px;padding:0 12px;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--foreground-secondary);font:600 12px/1.4 var(--font-ui)}
        .trader-education-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
        .trader-education-category{display:grid;align-content:start;gap:16px}
        .trader-education-category>header{display:flex;align-items:center;gap:11px}
        .trader-education-category h2{margin:0;color:var(--foreground);font-size:18px;font-weight:650}
        .trader-education-category small{display:block;margin-top:3px;color:var(--foreground-muted);font-weight:500}
        .trader-education-icon{width:42px;height:42px;display:grid;place-items:center;flex:0 0 auto;border-radius:var(--radius-control);background:var(--primary-soft);color:var(--primary)}
        .trader-education-lessons{display:grid;gap:9px}
        .trader-education-lessons details{border:1px solid var(--border);border-radius:var(--radius-control);background:var(--surface-muted);overflow:hidden}
        .trader-education-lessons details[open]{border-color:color-mix(in srgb,var(--primary) 34%,var(--border));background:var(--primary-soft)}
        .trader-education-lessons summary{display:grid;gap:3px;padding:12px 13px;cursor:pointer;list-style-position:inside;color:var(--foreground)}
        .trader-education-lessons summary:focus-visible{outline:2px solid var(--focus-ring);outline-offset:-3px}
        .trader-education-lessons summary span{color:var(--primary);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em}
        .trader-education-lessons summary strong{font-size:14px;font-weight:620;line-height:1.5}
        .trader-education-lessons p{margin:0;padding:0 13px 13px;color:var(--foreground-secondary);font-size:13px;font-weight:400;line-height:1.75}
        .trader-education-disclaimer{display:flex;align-items:flex-start;gap:11px;border-color:color-mix(in srgb,var(--warning) 32%,var(--border));background:var(--warning-soft);color:var(--warning)}
        .trader-education-disclaimer svg{flex:0 0 auto;margin-top:2px}
        .trader-education-disclaimer strong{display:block;color:var(--foreground);font-weight:650}
        .trader-education-disclaimer p{margin:4px 0 0;color:var(--foreground-secondary);font-size:13px;line-height:1.7}
        @media(max-width:820px){.trader-education-grid{grid-template-columns:1fr}}
        @media(max-width:640px){.trader-education-content{gap:15px}.trader-education-category{gap:13px}}
      `}</style>
    </DashboardPageShell>
  );
}
