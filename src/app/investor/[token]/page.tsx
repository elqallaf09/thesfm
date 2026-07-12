'use client';

/**
 * Public investor viewer (phase 2.9). Recipients open a share link with no
 * account: the token is resolved server-side (/api/investor/view), which
 * enforces expiry, revocation, password, and the owner's section selection.
 * This page renders exactly what that route returns — nothing more.
 */

import { use, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Lock,
  MinusCircle,
  Presentation,
  ShieldAlert,
  TimerOff,
} from 'lucide-react';
import { INVESTOR_TEXT, type InvestorCopy } from '@/app/investment-offers/_text';
import type { InvestorSection } from '@/lib/investor/shareAccess';
import styles from './viewer.module.css';

type Lang = 'ar' | 'en' | 'fr';
type Row = Record<string, any>;

type ViewerState =
  | { kind: 'loading' }
  | { kind: 'password'; wrong: boolean }
  | { kind: 'denied'; reason: 'expired' | 'revoked' | 'link_not_found' | 'unavailable' }
  | { kind: 'ready'; payload: Row };

const LANGS: Array<{ id: Lang; label: string }> = [
  { id: 'ar', label: 'العربية' },
  { id: 'en', label: 'English' },
  { id: 'fr', label: 'Français' },
];

function formatMoney(value: unknown, currency: unknown, lang: Lang) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const code = String(currency ?? '').trim().toUpperCase();
  try {
    if (/^[A-Z]{3}$/.test(code)) {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: code, maximumFractionDigits: 3 }).format(amount);
    }
  } catch { /* fall through */ }
  const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(amount);
  return code ? `${formatted} ${code}` : formatted;
}

export default function InvestorViewerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [lang, setLang] = useState<Lang>('ar');
  const text: InvestorCopy = INVESTOR_TEXT[lang];
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const [state, setState] = useState<ViewerState>({ kind: 'loading' });
  const [password, setPassword] = useState('');
  const [activePassword, setActivePassword] = useState('');

  const load = useCallback(async (withPassword: string) => {
    setState({ kind: 'loading' });
    try {
      const response = await fetch('/api/investor/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: withPassword || undefined }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        setActivePassword(withPassword);
        setState({ kind: 'ready', payload });
        return;
      }
      if (response.status === 401 && payload.requiresPassword) {
        setState({ kind: 'password', wrong: Boolean(payload.error) });
        return;
      }
      if (response.status === 410 && (payload.error === 'expired' || payload.error === 'revoked')) {
        setState({ kind: 'denied', reason: payload.error });
        return;
      }
      if (response.status === 404) {
        setState({ kind: 'denied', reason: 'link_not_found' });
        return;
      }
      setState({ kind: 'denied', reason: 'unavailable' });
    } catch {
      setState({ kind: 'denied', reason: 'unavailable' });
    }
  }, [token]);

  useEffect(() => {
    load('');
  }, [load]);

  const submitPassword = (event: FormEvent) => {
    event.preventDefault();
    if (password) load(password);
  };

  const logEvent = useCallback((eventType: string, section: string) => {
    fetch('/api/investor/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: activePassword || undefined, action: 'event', eventType, section }),
    }).catch(() => undefined);
  }, [activePassword, token]);

  return (
    <main className={styles.page} dir={dir} lang={lang}>
      <header className={styles.topBar}>
        <span className={styles.brand}>THE SFM</span>
        <nav className={styles.langSwitch} aria-label="Language">
          {LANGS.map(option => (
            <button
              key={option.id}
              type="button"
              className={option.id === lang ? styles.langActive : undefined}
              aria-pressed={option.id === lang}
              onClick={() => setLang(option.id)}
            >
              {option.label}
            </button>
          ))}
        </nav>
      </header>

      {state.kind === 'loading' ? (
        <section className={styles.centerBox} aria-live="polite">
          <p>{text.viewerLoading}</p>
        </section>
      ) : state.kind === 'password' ? (
        <section className={styles.centerBox}>
          <Lock size={28} aria-hidden="true" />
          <h1>{text.viewerPasswordTitle}</h1>
          <p>{text.viewerPasswordBody}</p>
          {state.wrong ? <p className={styles.errorText} role="alert">{text.viewerPasswordWrong}</p> : null}
          <form onSubmit={submitPassword} className={styles.passwordForm}>
            <label>
              {text.viewerPasswordField}
              <input
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <button type="submit">{text.viewerPasswordSubmit}</button>
          </form>
        </section>
      ) : state.kind === 'denied' ? (
        <section className={styles.centerBox}>
          {state.reason === 'expired' ? <TimerOff size={28} aria-hidden="true" /> : <ShieldAlert size={28} aria-hidden="true" />}
          <h1>
            {state.reason === 'expired'
              ? text.viewerExpired
              : state.reason === 'revoked'
                ? text.viewerRevoked
                : state.reason === 'link_not_found'
                  ? text.viewerNotFound
                  : text.viewerUnavailable}
          </h1>
        </section>
      ) : (
        <SharedOffer payload={state.payload} text={text} lang={lang} token={token} password={activePassword} onEvent={logEvent} />
      )}

      <footer className={styles.disclaimer}>{text.viewerDisclaimer}</footer>
    </main>
  );
}

function SharedOffer({
  payload,
  text,
  lang,
  token,
  password,
  onEvent,
}: {
  payload: Row;
  text: InvestorCopy;
  lang: Lang;
  token: string;
  password: string;
  onEvent: (eventType: string, section: string) => void;
}) {
  const sections = useMemo(
    () => (Array.isArray(payload.sections) ? payload.sections as InvestorSection[] : []),
    [payload.sections],
  );
  const [question, setQuestion] = useState('');
  const [askedBy, setAskedBy] = useState('');
  const [questionState, setQuestionState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [deckLogged, setDeckLogged] = useState(false);

  const readiness = payload.readiness as Row | undefined;
  const financials = payload.financials as Row | undefined;
  const documents = (Array.isArray(payload.documents) ? payload.documents : []) as Row[];
  const risks = (Array.isArray(payload.risks) ? payload.risks : []) as Row[];
  const overview = payload.overview as Row | undefined;
  const pitchDeck = payload.pitchDeck as Row | undefined | null;
  const slides = pitchDeck ? (Array.isArray((pitchDeck.deck as Row)?.slides) ? (pitchDeck.deck as Row).slides as Row[] : []) : [];

  const submitQuestion = async (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    setQuestionState('sending');
    try {
      const response = await fetch('/api/investor/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: password || undefined,
          action: 'question',
          question,
          askedBy,
        }),
      });
      if (!response.ok) throw new Error('failed');
      setQuestionState('sent');
      setQuestion('');
    } catch {
      setQuestionState('failed');
    }
  };

  return (
    <div className={styles.content}>
      <section className={styles.hero}>
        <h1 dir="auto">{String(payload.projectName ?? '')}</h1>
        {payload.message ? (
          <div className={styles.ownerMessage}>
            <h2>{text.viewerMessageTitle}</h2>
            <p dir="auto">{String(payload.message)}</p>
          </div>
        ) : null}
      </section>

      {sections.includes('overview') && overview ? (
        <section className={styles.card}>
          <h2>{text.sectionOverview}</h2>
          {overview.summary ? <p dir="auto" className={styles.bodyText}>{String(overview.summary)}</p> : null}
          <dl className={styles.metaGrid}>
            {overview.status ? (
              <div><dt>{text.overviewProjectStage}</dt><dd dir="auto">{String(overview.status)}</dd></div>
            ) : null}
            {formatMoney(overview.fundingNeeded, overview.currency, lang) ? (
              <div><dt>{text.overviewFundingTarget}</dt><dd dir="ltr">{formatMoney(overview.fundingNeeded, overview.currency, lang)}</dd></div>
            ) : null}
          </dl>
        </section>
      ) : null}

      {sections.includes('readiness') && readiness ? (
        <section className={styles.card}>
          <h2>{text.sectionReadiness}</h2>
          <p className={styles.scoreLine}>
            <strong>{Number(readiness.score ?? 0)}</strong> <span>{text.overviewScoreOf}</span>
          </p>
          <p className={styles.mutedText}>{text.readinessFormulaBody}</p>
        </section>
      ) : null}

      {sections.includes('financials') && financials ? (
        <section className={styles.card}>
          <h2>{text.sectionFinancials}</h2>
          <dl className={styles.metaGrid}>
            {formatMoney(financials.fundingNeeded, financials.currency, lang) ? (
              <div><dt>{text.financialsFundingTarget}</dt><dd dir="ltr">{formatMoney(financials.fundingNeeded, financials.currency, lang)}</dd></div>
            ) : null}
            {financials.fundingType ? (
              <div><dt>{text.overviewFundingType}</dt><dd dir="auto">{String(financials.fundingType)}</dd></div>
            ) : null}
            <div>
              <dt>{text.financialsRevenueStreams}</dt>
              <dd dir="ltr">{Array.isArray(financials.revenueStreams) ? financials.revenueStreams.length : 0}</dd>
            </div>
            <div>
              <dt>{text.financialsForecastPeriods}</dt>
              <dd dir="ltr">{Array.isArray(financials.forecast) ? financials.forecast.length : 0}</dd>
            </div>
          </dl>
          <p className={styles.mutedText}>{text.financialsSubtitle}</p>
        </section>
      ) : null}

      {sections.includes('documents') ? (
        <section className={styles.card}>
          <h2><FileText size={17} aria-hidden="true" /> {text.sectionDocuments}</h2>
          {documents.length === 0 ? (
            <p className={styles.mutedText}>{text.documentsEmpty}</p>
          ) : (
            <ul className={styles.docList}>
              {documents.map(doc => (
                <li key={String(doc.id)}>
                  <span dir="auto">{String(doc.name ?? '')}</span>
                  {doc.url ? (
                    <a
                      href={String(doc.url)}
                      target="_blank"
                      rel="noreferrer noopener"
                      onClick={() => onEvent('document_downloaded', String(doc.name ?? ''))}
                    >
                      {text.viewerDownload}
                    </a>
                  ) : (
                    <span className={styles.mutedText}>{payload.allowDownloads ? '' : text.viewerNoDownloads}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {sections.includes('pitch_deck') ? (
        <section className={styles.card}>
          <h2><Presentation size={17} aria-hidden="true" /> {text.sectionPitchDeck}</h2>
          {pitchDeck && slides.length > 0 ? (
            <details
              onToggle={event => {
                if (event.currentTarget.open && !deckLogged) {
                  setDeckLogged(true);
                  onEvent('pitch_deck_viewed', 'pitch_deck');
                }
              }}
            >
              <summary>{text.pitchSlides}: {slides.length}</summary>
              <ol className={styles.slideOutline}>
                {slides.map((slide, index) => (
                  <li key={index} dir="auto">
                    {String(slide.status ?? '') === 'complete'
                      ? <CheckCircle2 size={13} aria-hidden="true" />
                      : <MinusCircle size={13} aria-hidden="true" />}{' '}
                    {String(slide.title ?? `#${index + 1}`)}
                    {slide.content && (slide.content as Row).headline ? (
                      <p className={styles.mutedText} dir="auto">{String((slide.content as Row).headline)}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </details>
          ) : (
            <p className={styles.mutedText}>{text.pitchEmpty}</p>
          )}
        </section>
      ) : null}

      {sections.includes('risks') ? (
        <section className={styles.card}>
          <h2><AlertTriangle size={17} aria-hidden="true" /> {text.sectionRisks}</h2>
          {risks.length === 0 ? (
            <p className={styles.mutedText}>{text.risksEmpty}</p>
          ) : (
            <ul className={styles.riskList}>
              {risks.map(risk => (
                <li key={String(risk.id)}>
                  <strong dir="auto">{String(risk.title ?? '')}</strong>
                  <span className={styles.riskMeta}>
                    {text.risksSeverity}: {String(risk.severity ?? '—')} · {text.risksProbability}: {String(risk.probability ?? '—')}
                  </span>
                  {risk.mitigation ? <p dir="auto" className={styles.mutedText}>{text.risksMitigation}: {String(risk.mitigation)}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className={styles.card}>
        <h2>{text.viewerAskTitle}</h2>
        {questionState === 'sent' ? (
          <p className={styles.successText} role="status">{text.viewerAskSent}</p>
        ) : (
          <form onSubmit={submitQuestion} className={styles.questionForm}>
            <label>
              {text.viewerAskField}
              <textarea
                rows={3}
                value={question}
                onChange={event => setQuestion(event.target.value)}
                required
              />
            </label>
            <label>
              {text.viewerAskName}
              <input type="text" value={askedBy} onChange={event => setAskedBy(event.target.value)} />
            </label>
            {questionState === 'failed' ? <p className={styles.errorText} role="alert">{text.viewerAskFailed}</p> : null}
            <button type="submit" disabled={questionState === 'sending'}>{text.viewerAskSubmit}</button>
          </form>
        )}
      </section>
    </div>
  );
}
