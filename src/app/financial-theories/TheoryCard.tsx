'use client';

import Link from 'next/link';
import { ArrowUpRight, ChevronDown, Lightbulb } from 'lucide-react';
import {
  FINANCIAL_THEORY_CATEGORIES,
  getFinancialTheoryText,
  type FinancialTheory,
  type FinancialTheoryLang,
} from '@/lib/financial-theories';
import {
  applyCopy,
  calculatorForTheory,
  commonMistakeCopy,
  LEARNING_LEVELS,
  THEORY_ICONS,
  theoryLevel,
} from './_lib';

export function TheoryCard({
  theory,
  lang,
  text,
  isOpen,
  isRead,
  onToggle,
  onMarkRead,
  onOpenRelatedTool,
}: {
  theory: FinancialTheory;
  lang: FinancialTheoryLang;
  text: Record<string, string>;
  isOpen: boolean;
  isRead: boolean;
  onToggle: () => void;
  onMarkRead: () => void;
  onOpenRelatedTool: () => void;
}) {
  const Icon = THEORY_ICONS[(theory.number - 1) % THEORY_ICONS.length];
  const title = getFinancialTheoryText(theory.title, lang);
  const short = getFinancialTheoryText(theory.short, lang);
  const category = FINANCIAL_THEORY_CATEGORIES.find(item => item.id === theory.category);
  const categoryLabel = category ? getFinancialTheoryText(category.label, lang) : '';
  const level = LEARNING_LEVELS.find(item => item.id === theoryLevel(theory));
  const levelLabel = level ? getFinancialTheoryText(level.label, lang) : '';
  const takeaway = getFinancialTheoryText(theory.keyTakeaway, lang);
  const tool = getFinancialTheoryText(theory.sfmTool, lang);
  const detailId = `theory-details-${theory.id}`;
  const examples = theory.examples?.[lang] ?? [];
  const rows = theory.tableRows?.[lang] ?? [];
  const hasRelatedTool = Boolean(theory.sfmToolHref || calculatorForTheory(theory));

  return (
    <article className={`theory-card ${isOpen ? 'expanded' : ''}`}>
      <div className="theory-card-head">
        <span className="theory-number">{String(theory.number).padStart(2, '0')}</span>
        <span className="theory-icon" aria-hidden="true"><Icon size={22} /></span>
        <div>
          <div className="theory-card-badges">
            <span className="theory-category">{categoryLabel}</span>
            {levelLabel ? <span className="theory-category theory-level-badge">{levelLabel}</span> : null}
            {isRead ? <span className="theory-read-badge">{text.done}</span> : null}
          </div>
          <h3>{title}</h3>
        </div>
      </div>

      <p className="theory-short">{short}</p>

      <div className="theory-meta-row">
        <span>{text.keyTakeaway}</span>
        <strong>{takeaway}</strong>
      </div>

      <div className="theory-tool-pill">
        <span>{text.relatedSfmTool}</span>
        <strong>{tool}</strong>
      </div>

      <div className="theory-actions">
        <button
          type="button"
          className="theory-primary-action"
          aria-expanded={isOpen}
          aria-controls={detailId}
          onClick={onToggle}
        >
          {isOpen ? text.hideTheory : text.quickExplanation}
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="theory-secondary-action"
          onClick={onToggle}
        >
          {text.practicalExampleAction}
          <Lightbulb size={15} aria-hidden="true" />
        </button>
        {hasRelatedTool && theory.sfmToolHref ? (
          <Link href={theory.sfmToolHref} className="theory-secondary-action" aria-label={`${text.openTool}: ${tool}`}>
            {text.applyTheory}
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        ) : null}
        {hasRelatedTool && !theory.sfmToolHref ? (
          <button
            type="button"
            className="theory-secondary-action"
            onClick={onOpenRelatedTool}
            aria-label={`${text.openTool}: ${tool}`}
          >
            {text.applyTheory}
            <ArrowUpRight size={15} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div id={detailId} className="theory-details" hidden={!isOpen}>
        <div className="detail-block">
          <h4>{text.details}</h4>
          {theory.details[lang].map(line => <p key={line}>{line}</p>)}
        </div>

        {examples.length > 0 ? (
          <div className="detail-block">
            <h4>{text.educationalExample}</h4>
            <ul>
              {examples.map(example => <li key={example}>{example}</li>)}
            </ul>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <div className="detail-block table-block">
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

        <div className="detail-block mistake-block">
          <h4>{text.commonMistake}</h4>
          <p>{commonMistakeCopy(theory, lang)}</p>
        </div>

        <div className="detail-block tool-block">
          <h4>{text.applyInSfm}</h4>
          <p>{applyCopy(lang, tool)}</p>
          {hasRelatedTool ? <small>{text.educationalDisclaimer}</small> : null}
        </div>

        <button type="button" className="theory-mark-read" onClick={onMarkRead} disabled={isRead}>
          {isRead ? text.done : text.markAsRead}
        </button>
      </div>
    </article>
  );
}
