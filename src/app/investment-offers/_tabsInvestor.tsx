'use client';

import { useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Copy,
  Link2,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { AppCard } from '@/components/layout/AppCard';
import { EmptyState } from '@/components/layout/EmptyState';
import { supabase } from '@/integrations/supabase/client';
import { evaluateLinkState, INVESTOR_SECTIONS, type InvestorSection } from '@/lib/investor/shareAccess';
import { formatDate, formatDateTime, type Row } from './_data';
import { eventLabel, type InvestorTabContext } from './_tabs';
import styles from './investor.module.css';

/* ── Sharing tab ─────────────────────────────────────────────────────── */

type ShareForm = {
  label: string;
  expiresAt: string;
  password: string;
  sections: InvestorSection[];
  allowDownloads: boolean;
  message: string;
};

const DEFAULT_SHARE_FORM: ShareForm = {
  label: '',
  expiresAt: '',
  password: '',
  sections: ['overview', 'readiness', 'financials', 'pitch_deck'],
  allowDownloads: false,
  message: '',
};

export function SharingTab({ ctx }: { ctx: InvestorTabContext }) {
  const { text, lang, links, project } = ctx;
  const [form, setForm] = useState<ShareForm>(DEFAULT_SHARE_FORM);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [createdUrl, setCreatedUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const sectionLabels: Record<InvestorSection, string> = {
    overview: text.sectionOverview,
    readiness: text.sectionReadiness,
    financials: text.sectionFinancials,
    documents: text.sectionDocuments,
    pitch_deck: text.sectionPitchDeck,
    risks: text.sectionRisks,
  };

  const toggleSection = (section: InvestorSection) => {
    setForm(current => ({
      ...current,
      sections: current.sections.includes(section)
        ? current.sections.filter(item => item !== section)
        : [...current.sections, section],
    }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!project) return;
    if (form.sections.length === 0) {
      setError(text.sharingSectionsRequired);
      return;
    }
    setCreating(true);
    setError('');
    setCreatedUrl('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('no_session');
      const response = await fetch('/api/investor/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          projectId: project.id,
          label: form.label,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : '',
          password: form.password,
          sections: form.sections,
          allowDownloads: form.allowDownloads,
          message: form.message,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.token) throw new Error(String(payload.error ?? 'create_failed'));
      setCreatedUrl(`${window.location.origin}/investor/${payload.token}`);
      setForm(DEFAULT_SHARE_FORM);
      ctx.reload();
    } catch {
      setError(text.sharingCreateFailed);
    } finally {
      setCreating(false);
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(createdUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard unavailable — the URL stays selectable in the input.
    }
  };

  const revoke = async (link: Row) => {
    const { error: revokeError } = await supabase
      .from('project_investor_links')
      .update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', link.id)
      .eq('user_id', ctx.userId);
    if (revokeError) {
      setError(text.sharingRevokeFailed);
      return;
    }
    if (project) {
      // Owner-side audit entry; failure here must not block revocation.
      await supabase.from('project_investor_events').insert({
        user_id: ctx.userId,
        project_id: project.id,
        link_id: link.id,
        event_type: 'link_revoked',
      }).then(() => undefined, () => undefined);
    }
    ctx.reload();
  };

  const linkStateLabel = (link: Row) => {
    const state = evaluateLinkState(link);
    if (state === 'revoked') return text.statusRevoked;
    if (state === 'expired') return text.statusExpired;
    return text.statusActive;
  };

  return (
    <div className={styles.stack}>
      <AppCard>
        <h3>{text.sharingTitle}</h3>
        <p className={styles.mutedText}>{text.sharingSubtitle}</p>
        <p className={styles.footNote}><ShieldCheck size={14} aria-hidden="true" /> {text.sharingPrivateNote}</p>

        <form onSubmit={submit} className={styles.shareForm}>
          <label>
            {text.sharingLabel}
            <input
              type="text"
              value={form.label}
              onChange={event => setForm(current => ({ ...current, label: event.target.value }))}
              placeholder={text.sharingLabelPlaceholder}
            />
          </label>
          <label>
            {text.sharingExpiry}
            <input
              type="date"
              value={form.expiresAt}
              onChange={event => setForm(current => ({ ...current, expiresAt: event.target.value }))}
            />
          </label>
          <label>
            {text.sharingPassword}
            <input
              type="password"
              value={form.password}
              autoComplete="new-password"
              minLength={6}
              onChange={event => setForm(current => ({ ...current, password: event.target.value }))}
            />
            <small className={styles.mutedText}>{text.sharingPasswordHint}</small>
          </label>
          <fieldset className={styles.sectionsField}>
            <legend>{text.sharingSections}</legend>
            <div className={styles.sectionChips}>
              {INVESTOR_SECTIONS.map(section => (
                <label key={section} className={styles.sectionChip}>
                  <input
                    type="checkbox"
                    checked={form.sections.includes(section)}
                    onChange={() => toggleSection(section)}
                  />
                  {sectionLabels[section]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={form.allowDownloads}
              onChange={event => setForm(current => ({ ...current, allowDownloads: event.target.checked }))}
            />
            {text.sharingAllowDownloads}
          </label>
          <label className={styles.fullField}>
            {text.sharingMessage}
            <textarea
              rows={2}
              value={form.message}
              onChange={event => setForm(current => ({ ...current, message: event.target.value }))}
              placeholder={text.sharingMessagePlaceholder}
            />
          </label>
          {error ? <p className={styles.warnNote} role="alert"><AlertTriangle size={14} aria-hidden="true" /> {error}</p> : null}
          <button type="submit" className={styles.primaryAction} disabled={creating}>
            <Link2 size={14} aria-hidden="true" /> {creating ? text.sharingGenerating : text.sharingGenerate}
          </button>
        </form>

        {createdUrl ? (
          <div className={styles.createdLink} role="status">
            <p className={styles.warnNote}><Timer size={14} aria-hidden="true" /> {text.sharingCreated}</p>
            <div className={styles.createdLinkRow}>
              <input type="text" readOnly value={createdUrl} dir="ltr" onFocus={event => event.target.select()} />
              <button type="button" className={styles.secondaryAction} onClick={copyUrl}>
                <Copy size={14} aria-hidden="true" /> {copied ? text.sharingCopied : text.sharingCopy}
              </button>
            </div>
          </div>
        ) : null}
      </AppCard>

      <AppCard>
        <h4>{text.sharingActiveLinks}</h4>
        {links.length === 0 ? (
          <p className={styles.mutedText}>{text.sharingNoLinks}</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>{text.sharingLabel}</th>
                  <th>{text.questionsStatusLabel}</th>
                  <th>{text.sharingExpiresAt}</th>
                  <th>{text.sharingSections}</th>
                  <th className={styles.numCell}>{text.sharingAccessCount}</th>
                  <th>{text.sharingLastAccess}</th>
                  <th className={styles.actionCell}>{text.sharingRevoke}</th>
                </tr>
              </thead>
              <tbody>
                {links.map(link => {
                  const state = evaluateLinkState(link);
                  return (
                    <tr key={String(link.id)}>
                      <td dir="auto">{String(link.label ?? '').trim() || '—'}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${state === 'active' ? styles.status_complete : styles.status_missing}`}>
                          {linkStateLabel(link)}
                        </span>
                      </td>
                      <td>{link.expires_at ? formatDate(link.expires_at, ctx.lang) : text.sharingNoExpiry}</td>
                      <td dir="ltr" className={styles.numCell}>{Array.isArray(link.visible_sections) ? link.visible_sections.length : 0}</td>
                      <td className={styles.numCell} dir="ltr">{Number(link.access_count ?? 0)}</td>
                      <td>{link.last_accessed_at ? formatDateTime(link.last_accessed_at, ctx.lang) : '—'}</td>
                      <td className={styles.actionCell}>
                        {state === 'active' ? (
                          <button type="button" className={styles.dangerAction} onClick={() => revoke(link)}>
                            {text.sharingRevoke}
                          </button>
                        ) : <span className={styles.mutedText}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AppCard>
    </div>
  );
}

/* ── Activity tab (timeline + investor questions) ────────────────────── */

export function ActivityTab({ ctx }: { ctx: InvestorTabContext }) {
  const { text, lang, events, questions } = ctx;
  const [responses, setResponses] = useState<Record<string, { response: string; note: string }>>({});
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');

  const saveResponse = async (question: Row) => {
    const id = String(question.id);
    const draft = responses[id] ?? { response: String(question.response ?? ''), note: String(question.internal_note ?? '') };
    setSavingId(id);
    setError('');
    const { error: saveError } = await supabase
      .from('project_investor_questions')
      .update({
        response: draft.response.trim().slice(0, 4000) || null,
        internal_note: draft.note.trim().slice(0, 4000) || null,
        status: draft.response.trim() ? 'answered' : 'open',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', ctx.userId);
    setSavingId('');
    if (saveError) {
      setError(text.questionsSaveFailed);
      return;
    }
    ctx.reload();
  };

  return (
    <div className={styles.stack}>
      <AppCard>
        <h3>{text.activityTitle}</h3>
        <p className={styles.mutedText}>{text.activitySubtitle}</p>
        {events.length === 0 ? (
          <EmptyState title={text.activityEmpty} description={text.activityEmptyBody} />
        ) : (
          <ol className={styles.timeline}>
            {events.map(event => (
              <li key={String(event.id)}>
                <span className={styles.timelineDot} aria-hidden="true" />
                <div>
                  <p dir="auto">
                    <strong>{eventLabel(String(event.event_type ?? ''), text)}</strong>
                    {event.section ? <span className={styles.mutedText}> · {String(event.section)}</span> : null}
                  </p>
                  <p className={styles.mutedText}>{formatDateTime(event.created_at, lang)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </AppCard>

      <AppCard>
        <h4>{text.questionsTitle}</h4>
        {questions.length === 0 ? (
          <p className={styles.mutedText}>{text.questionsEmpty}</p>
        ) : (
          <ul className={styles.questionList}>
            {questions.map(question => {
              const id = String(question.id);
              const draft = responses[id] ?? {
                response: String(question.response ?? ''),
                note: String(question.internal_note ?? ''),
              };
              return (
                <li key={id} className={styles.questionItem}>
                  <p dir="auto"><strong>{String(question.question ?? '')}</strong></p>
                  <p className={styles.mutedText}>
                    {question.asked_by ? <>{text.questionsAskedBy}: {String(question.asked_by)} · </> : null}
                    {formatDateTime(question.created_at, lang)}
                    {' · '}
                    {String(question.status ?? '') === 'answered' ? text.statusAnswered : text.statusOpen}
                  </p>
                  <label>
                    {text.questionsRespond}
                    <textarea
                      rows={2}
                      value={draft.response}
                      onChange={event => setResponses(current => ({ ...current, [id]: { ...draft, response: event.target.value } }))}
                    />
                  </label>
                  <label>
                    {text.questionsInternalNote}
                    <textarea
                      rows={1}
                      value={draft.note}
                      onChange={event => setResponses(current => ({ ...current, [id]: { ...draft, note: event.target.value } }))}
                    />
                  </label>
                  <button
                    type="button"
                    className={styles.secondaryAction}
                    disabled={savingId === id}
                    onClick={() => saveResponse(question)}
                  >
                    {text.questionsSave}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {error ? <p className={styles.warnNote} role="alert"><AlertTriangle size={14} aria-hidden="true" /> {error}</p> : null}
      </AppCard>
    </div>
  );
}
