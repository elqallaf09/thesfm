'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  MinusCircle,
  Pencil,
  Plus,
  Presentation,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { AppCard } from '@/components/layout/AppCard';
import { EmptyState } from '@/components/layout/EmptyState';
import { supabase } from '@/integrations/supabase/client';
import { documentSharable } from '@/lib/investor/shareAccess';
import {
  buildDiligenceChecklist,
  categorizeDocument,
  diligenceGroupLabel,
  diligenceItemLabel,
  documentCategoryLabel,
  formatDate,
  rowArray,
  recordValue,
  textOf,
  type DocumentCategoryId,
  type Row,
} from './_data';
import { StatusBadge, type InvestorTabContext } from './_tabs';
import styles from './investor.module.css';

/* ── Documents tab (document center + due-diligence checklist) ───────── */

export function DocumentsTab({ ctx }: { ctx: InvestorTabContext }) {
  const { text, lang, documents, project } = ctx;
  const addHref = project ? `/business-hub?tab=documents&project=${project.id}` : '/business-hub?tab=documents';

  const grouped = useMemo(() => {
    const map = new Map<DocumentCategoryId, Row[]>();
    for (const row of documents) {
      const category = categorizeDocument(row);
      map.set(category, [...(map.get(category) ?? []), row]);
    }
    return map;
  }, [documents]);

  return (
    <div className={styles.stack}>
      {documents.length === 0 ? (
        <EmptyState
          title={text.documentsEmpty}
          description={text.documentsEmptyBody}
          icon={<FileText size={22} />}
          actions={<Link className={styles.primaryAction} href={addHref}>{text.documentsAdd}</Link>}
        />
      ) : (
        <AppCard>
          <header className={styles.sectionHead}>
            <div>
              <h3>{text.documentsTitle}</h3>
              <p className={styles.mutedText}>{text.documentsSubtitle}</p>
            </div>
            <Link className={styles.secondaryAction} href={addHref}>{text.documentsAdd}</Link>
          </header>
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>{text.documentsName}</th>
                  <th>{text.documentsCategory}</th>
                  <th>{text.documentsUpdated}</th>
                  <th>{text.documentsVisibility}</th>
                  <th className={styles.actionCell}>{text.documentsOpen}</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(row => {
                  const url = String(row.source_url ?? row.sourceUrl ?? '').trim();
                  const shared = documentSharable(row);
                  return (
                    <tr key={String(row.id)}>
                      <td dir="auto">{textOf(row, ['title', 'name', 'file_name'], '—')}</td>
                      <td>{documentCategoryLabel(categorizeDocument(row), text)}</td>
                      <td>{formatDate(row.updated_at ?? row.uploaded_at ?? row.created_at, lang) || text.notRecorded}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${shared ? styles.status_complete : styles.status_missing}`}>
                          {shared ? <CheckCircle2 size={13} aria-hidden="true" /> : <ShieldAlert size={13} aria-hidden="true" />}
                          {shared ? text.statusShared : text.statusPrivate}
                        </span>
                      </td>
                      <td className={styles.actionCell}>
                        {url ? (
                          <a className={styles.linkAction} href={url} target="_blank" rel="noreferrer noopener">
                            <ExternalLink size={14} aria-hidden="true" />
                            <span className="sr-only">{text.documentsOpen}</span>
                          </a>
                        ) : <span className={styles.mutedText}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {(grouped.get('legal') ?? []).length === 0 ? (
            <p className={styles.warnNote}><AlertTriangle size={14} aria-hidden="true" /> {text.documentsNoLegal}</p>
          ) : null}
        </AppCard>
      )}

      <DiligenceChecklist ctx={ctx} />
    </div>
  );
}

function DiligenceChecklist({ ctx }: { ctx: InvestorTabContext }) {
  const { text, lang, project, funding, documents, risks, diligenceStored, userId } = ctx;
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState('');
  const [error, setError] = useState('');

  const items = useMemo(
    () => buildDiligenceChecklist({ project, funding, documents, risks, stored: diligenceStored }),
    [project, funding, documents, risks, diligenceStored],
  );

  const markReviewed = async (group: string, key: string) => {
    if (!project) return;
    const noteKey = `${group}:${key}`;
    const note = (notes[noteKey] ?? '').trim();
    if (!note) {
      setError(text.diligenceNoteRequired);
      return;
    }
    setSavingKey(noteKey);
    setError('');
    const { error: saveError } = await supabase.from('project_due_diligence_items').upsert({
      user_id: userId,
      project_id: project.id,
      group_key: group,
      item_key: key,
      status: 'needs_review',
      note,
      last_review_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,project_id,group_key,item_key' });
    setSavingKey('');
    if (saveError) {
      setError(text.diligenceSaveFailed);
      return;
    }
    ctx.reload();
  };

  return (
    <AppCard>
      <h3>{text.diligenceTitle}</h3>
      <p className={styles.mutedText}>{text.diligenceSubtitle}</p>
      {error ? <p className={styles.warnNote} role="alert"><AlertTriangle size={14} aria-hidden="true" /> {error}</p> : null}
      <ul className={styles.diligenceList}>
        {items.map(item => {
          const key = `${item.group}:${item.key}`;
          const reviewed = Boolean(item.stored?.note);
          const status = item.evidence ? 'complete' : reviewed ? 'needs_review' : 'missing';
          return (
            <li key={key} className={styles.diligenceItem}>
              <div className={styles.diligenceHead}>
                <span className={styles.diligenceGroup}>{diligenceGroupLabel(item.group, text)}</span>
                <StatusBadge status={status} text={text} />
              </div>
              <p className={styles.diligenceLabel} dir="auto">
                {diligenceItemLabel(item, lang)}
                <em className={styles.optionalTag}>{item.required ? text.diligenceRequired : text.diligenceOptional}</em>
              </p>
              <p className={styles.mutedText}>
                {text.diligenceEvidence}: {item.evidence
                  ? <CheckCircle2 size={13} aria-hidden="true" />
                  : <MinusCircle size={13} aria-hidden="true" />}{' '}
                {item.evidence ? statusEvidenceLabel(text) : text.diligenceNoEvidence}
                {item.stored?.note ? <> · {String(item.stored.note)}</> : null}
                {item.stored?.last_review_at ? <> · {text.diligenceLastReview}: {formatDate(item.stored.last_review_at, lang)}</> : null}
              </p>
              {!item.evidence ? (
                <div className={styles.diligenceReview}>
                  <input
                    type="text"
                    value={notes[key] ?? ''}
                    onChange={event => setNotes(current => ({ ...current, [key]: event.target.value }))}
                    placeholder={text.diligenceNotePlaceholder}
                    aria-label={text.diligenceNotePlaceholder}
                  />
                  <button
                    type="button"
                    className={styles.secondaryAction}
                    disabled={savingKey === key}
                    onClick={() => markReviewed(item.group, item.key)}
                  >
                    {text.diligenceMarkReviewed}
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </AppCard>
  );
}

function statusEvidenceLabel(text: InvestorTabContext['text']) {
  return text.statusComplete;
}

/* ── Pitch deck tab ──────────────────────────────────────────────────── */

export function PitchDeckTab({ ctx }: { ctx: InvestorTabContext }) {
  const { text, lang, pitchDeck, project } = ctx;
  const builderHref = project ? `/projects/${project.id}?tab=pitchDeck` : '/projects';

  if (!pitchDeck) {
    return (
      <EmptyState
        title={text.pitchEmpty}
        description={text.pitchEmptyBody}
        icon={<Presentation size={22} />}
        actions={<Link className={styles.primaryAction} href={builderHref}>{text.pitchCreate}</Link>}
      />
    );
  }

  const deck = recordValue(pitchDeck.deck_data);
  const slides = rowArray(deck.slides);
  const completed = slides.filter(slide => String(slide.status ?? '') === 'complete').length;
  const percent = slides.length > 0 ? Math.floor((completed / slides.length) * 100) : 0;
  const missing = slides.filter(slide => String(slide.status ?? '') !== 'complete');

  return (
    <div className={styles.stack}>
      <AppCard>
        <header className={styles.sectionHead}>
          <div>
            <h3>{text.pitchTitle}</h3>
            <p className={styles.mutedText}>{text.pitchSubtitle}</p>
          </div>
          <Link className={styles.primaryAction} href={builderHref}>
            {text.pitchOpenBuilder} <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </header>
        <div className={styles.metricGrid}>
          <div className={styles.metricTile}>
            <small>{text.pitchCompletion}</small>
            <strong>{percent}%</strong>
            <span className={styles.mutedText}>{completed} / {slides.length} {text.pitchSlides}</span>
          </div>
          <div className={styles.metricTile}>
            <small>{text.pitchLanguage}</small>
            <strong dir="ltr">{String(pitchDeck.language ?? 'ar').toUpperCase()}</strong>
          </div>
          <div className={styles.metricTile}>
            <small>{text.pitchUpdated}</small>
            <strong>{formatDate(pitchDeck.updated_at ?? pitchDeck.created_at, lang) || text.notRecorded}</strong>
          </div>
        </div>
      </AppCard>

      {slides.length > 0 ? (
        <AppCard>
          <h4>{text.pitchSlides}</h4>
          <ul className={styles.slideList}>
            {slides.map((slide, index) => {
              const complete = String(slide.status ?? '') === 'complete';
              return (
                <li key={index} className={complete ? styles.checkDone : styles.checkMissing}>
                  {complete ? <CheckCircle2 size={14} aria-hidden="true" /> : <MinusCircle size={14} aria-hidden="true" />}
                  <span dir="auto">{textOf(slide, ['title'], `#${index + 1}`)}</span>
                </li>
              );
            })}
          </ul>
          {missing.length > 0 ? (
            <p className={styles.warnNote}>
              <AlertTriangle size={14} aria-hidden="true" /> {text.pitchMissingSections}: {missing.length}
            </p>
          ) : null}
        </AppCard>
      ) : null}

      <p className={styles.footNote}>{text.pitchAiNote}</p>
    </div>
  );
}

/* ── Risks tab ───────────────────────────────────────────────────────── */

const RISK_CATEGORIES = ['market', 'financial', 'operational', 'legal', 'regulatory', 'competition', 'liquidity', 'technology', 'execution', 'concentration'] as const;
const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

type RiskForm = {
  id: string;
  title: string;
  category: string;
  severity: string;
  probability: string;
  impact: string;
  mitigation: string;
  status: string;
};

const EMPTY_RISK: RiskForm = {
  id: '',
  title: '',
  category: 'market',
  severity: 'medium',
  probability: 'medium',
  impact: '',
  mitigation: '',
  status: 'open',
};

export function RisksTab({ ctx }: { ctx: InvestorTabContext }) {
  const { text, lang, risks, project, userId } = ctx;
  const [form, setForm] = useState<RiskForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const riskCategoryLabels: Record<string, string> = {
    market: text.riskCategoryMarket,
    financial: text.riskCategoryFinancial,
    operational: text.riskCategoryOperational,
    legal: text.riskCategoryLegal,
    regulatory: text.riskCategoryRegulatory,
    competition: text.riskCategoryCompetition,
    liquidity: text.riskCategoryLiquidity,
    technology: text.riskCategoryTechnology,
    execution: text.riskCategoryExecution,
    concentration: text.riskCategoryConcentration,
  };
  const levelLabels: Record<string, string> = {
    low: text.severityLow,
    medium: text.severityMedium,
    high: text.severityHigh,
    critical: text.severityCritical,
  };
  const statusLabels: Record<string, string> = {
    open: text.statusOpen,
    mitigated: text.statusMitigated,
    accepted: text.statusAccepted,
    needs_review: text.statusNeedsReview,
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!project || !form) return;
    if (!form.title.trim()) {
      setError(text.risksMissingTitle);
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      user_id: userId,
      project_id: project.id,
      title: form.title.trim().slice(0, 200),
      category: form.category,
      severity: form.severity,
      probability: form.probability,
      impact: form.impact.trim().slice(0, 1000) || null,
      mitigation: form.mitigation.trim().slice(0, 2000) || null,
      status: form.status,
      last_review_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const result = form.id
      ? await supabase.from('project_risks').update(payload).eq('id', form.id).eq('user_id', userId)
      : await supabase.from('project_risks').insert(payload);
    setSaving(false);
    if (result.error) {
      setError(text.risksSaveFailed);
      return;
    }
    setForm(null);
    ctx.reload();
  };

  const remove = async (id: string) => {
    const { error: deleteError } = await supabase.from('project_risks').delete().eq('id', id).eq('user_id', userId);
    if (deleteError) {
      setError(text.risksDeleteFailed);
      return;
    }
    ctx.reload();
  };

  return (
    <div className={styles.stack}>
      <AppCard>
        <header className={styles.sectionHead}>
          <div>
            <h3>{text.risksTitle}</h3>
            <p className={styles.mutedText}>{text.risksSubtitle}</p>
          </div>
          <button type="button" className={styles.primaryAction} onClick={() => { setForm(EMPTY_RISK); setError(''); }}>
            <Plus size={14} aria-hidden="true" /> {text.risksAdd}
          </button>
        </header>
        {error && !form ? <p className={styles.warnNote} role="alert"><AlertTriangle size={14} aria-hidden="true" /> {error}</p> : null}

        {risks.length === 0 ? (
          <EmptyState title={text.risksEmpty} description={text.risksEmptyBody} icon={<ShieldAlert size={22} />} />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>{text.risksTitleField}</th>
                  <th>{text.risksCategory}</th>
                  <th>{text.risksSeverity}</th>
                  <th>{text.risksProbability}</th>
                  <th>{text.risksMitigation}</th>
                  <th>{text.risksStatus}</th>
                  <th className={styles.actionCell}>{text.risksEdit}</th>
                </tr>
              </thead>
              <tbody>
                {risks.map(risk => {
                  const severity = String(risk.severity ?? 'medium');
                  return (
                    <tr key={String(risk.id)}>
                      <td dir="auto">{textOf(risk, ['title'], '—')}</td>
                      <td>{riskCategoryLabels[String(risk.category ?? '')] ?? String(risk.category ?? '—')}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[`severity_${severity}`] ?? ''}`}>
                          {levelLabels[severity] ?? severity}
                        </span>
                      </td>
                      <td>{levelLabels[String(risk.probability ?? '')] ?? text.notRecorded}</td>
                      <td dir="auto" className={styles.wrapCell}>
                        {String(risk.mitigation ?? '').trim() || <span className={styles.warnText}>{text.risksMissingMitigation}</span>}
                      </td>
                      <td>{statusLabels[String(risk.status ?? '')] ?? String(risk.status ?? '—')}</td>
                      <td className={styles.actionCell}>
                        <button
                          type="button"
                          className={styles.iconAction}
                          aria-label={text.risksEdit}
                          onClick={() => {
                            setForm({
                              id: String(risk.id),
                              title: String(risk.title ?? ''),
                              category: String(risk.category ?? 'market'),
                              severity,
                              probability: String(risk.probability ?? 'medium'),
                              impact: String(risk.impact ?? ''),
                              mitigation: String(risk.mitigation ?? ''),
                              status: String(risk.status ?? 'open'),
                            });
                            setError('');
                          }}
                        >
                          <Pencil size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className={styles.iconAction}
                          aria-label={text.risksDelete}
                          onClick={() => remove(String(risk.id))}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AppCard>

      {form ? (
        <div className="sfm-modal-overlay" role="presentation" onClick={() => setForm(null)}>
          <div
            className={`sfm-modal-panel ${styles.riskModal}`}
            role="dialog"
            aria-modal="true"
            aria-label={form.id ? text.risksEdit : text.risksAdd}
            onClick={event => event.stopPropagation()}
          >
            <form onSubmit={submit}>
              <header className="sfm-modal-header">
                <h3>{form.id ? text.risksEdit : text.risksAdd}</h3>
              </header>
              <div className={`sfm-modal-body ${styles.riskFormGrid}`}>
                <label>
                  {text.risksTitleField}
                  <input
                    type="text"
                    value={form.title}
                    onChange={event => setForm(current => current && { ...current, title: event.target.value })}
                    required
                  />
                </label>
                <label>
                  {text.risksCategory}
                  <select value={form.category} onChange={event => setForm(current => current && { ...current, category: event.target.value })}>
                    {RISK_CATEGORIES.map(id => <option key={id} value={id}>{riskCategoryLabels[id]}</option>)}
                  </select>
                </label>
                <label>
                  {text.risksSeverity}
                  <select value={form.severity} onChange={event => setForm(current => current && { ...current, severity: event.target.value })}>
                    {RISK_LEVELS.map(id => <option key={id} value={id}>{levelLabels[id]}</option>)}
                  </select>
                </label>
                <label>
                  {text.risksProbability}
                  <select value={form.probability} onChange={event => setForm(current => current && { ...current, probability: event.target.value })}>
                    {RISK_LEVELS.filter(id => id !== 'critical').map(id => <option key={id} value={id}>{levelLabels[id]}</option>)}
                  </select>
                </label>
                <label className={styles.fullField}>
                  {text.risksImpact}
                  <textarea
                    rows={2}
                    value={form.impact}
                    onChange={event => setForm(current => current && { ...current, impact: event.target.value })}
                  />
                </label>
                <label className={styles.fullField}>
                  {text.risksMitigation}
                  <textarea
                    rows={3}
                    value={form.mitigation}
                    onChange={event => setForm(current => current && { ...current, mitigation: event.target.value })}
                  />
                </label>
                <label>
                  {text.risksStatus}
                  <select value={form.status} onChange={event => setForm(current => current && { ...current, status: event.target.value })}>
                    {Object.entries(statusLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                </label>
                {error ? <p className={styles.warnNote} role="alert"><AlertTriangle size={14} aria-hidden="true" /> {error}</p> : null}
              </div>
              <footer className="sfm-modal-footer">
                <button type="button" className={styles.secondaryAction} onClick={() => setForm(null)}>{text.cancel}</button>
                <button type="submit" className={styles.primaryAction} disabled={saving}>
                  {saving ? text.risksSaving : text.risksSave}
                </button>
              </footer>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
