'use client';
import type { ReactNode } from 'react';
import { TrendingDown, Snowflake, Zap, Target } from 'lucide-react';
import type { Lang, DebtRow } from './_types';
import type { StrategyEntry, StrategyResult } from './_utils';
import { TEXT } from './_text';
import { toNumber, cleanNumericInput } from './_utils';

export function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="debt-summary-card">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong dir="ltr">{value}</strong>
      </div>
    </article>
  );
}

export function DebtMetric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`debt-metric${highlight ? ' debt-metric--highlight' : ''}`}>
      <span>{label}</span>
      <b dir="auto">{value}</b>
    </div>
  );
}

export function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="insight-row">
      <span>{label}</span>
      <b dir="auto">{value}</b>
    </div>
  );
}

export function FormSectionTitle({ title }: { title: string }) {
  return <div className="debt-form-section"><span>{title}</span></div>;
}

export function RequiredMark({ required }: { required?: boolean }) {
  return required ? <i>*</i> : null;
}

export function DebtInput({ label, value, onChange, type = 'text', placeholder, helper, required, invalid = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; helper?: string; required?: boolean; invalid?: boolean }) {
  return (
    <label className={`debt-field ${invalid ? 'invalid' : ''}`} data-invalid={invalid ? 'true' : undefined}>
      <span>{label} <RequiredMark required={required} />{helper ? <small>{helper}</small> : null}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} />
    </label>
  );
}

export function MoneyInput({ label, currency, value, onChange, required, invalid = false }: { label: string; currency: string; value: string; onChange: (value: string) => void; required?: boolean; invalid?: boolean }) {
  return (
    <label className={`debt-field ${invalid ? 'invalid' : ''}`} data-invalid={invalid ? 'true' : undefined}>
      <span>{label} <RequiredMark required={required} /></span>
      <div className="affix-input">
        <em dir="ltr">{currency}</em>
        <input inputMode="decimal" dir="ltr" value={value} onChange={event => onChange(cleanNumericInput(event.target.value))} />
      </div>
    </label>
  );
}

export function SuffixInput({ label, suffix, value, onChange, required, invalid = false }: { label: string; suffix: string; value: string; onChange: (value: string) => void; required?: boolean; invalid?: boolean }) {
  return (
    <label className={`debt-field ${invalid ? 'invalid' : ''}`} data-invalid={invalid ? 'true' : undefined}>
      <span>{label} <RequiredMark required={required} /></span>
      <div className="affix-input">
        <input inputMode="decimal" dir="ltr" value={value} onChange={event => onChange(cleanNumericInput(event.target.value))} />
        <em dir="ltr">{suffix}</em>
      </div>
    </label>
  );
}


export function PayoffStrategiesPanel({
  locale, dir, t, money, snowball, avalanche, extraPaymentAmount, setExtraPaymentAmount,
}: {
  locale: Lang;
  dir: string;
  t: (key: keyof typeof TEXT) => string;
  money: (value: unknown, currency?: string) => string;
  snowball: StrategyResult;
  avalanche: StrategyResult;
  extraPaymentAmount: string;
  setExtraPaymentAmount: (v: string) => void;
}) {
  if (!snowball && !avalanche) {
    return null;
  }

  const interestSaved =
    snowball && avalanche ? Math.max(0, snowball.totalInterest - avalanche.totalInterest) : 0;
  const monthDiff =
    snowball && avalanche ? snowball.totalMonths - avalanche.totalMonths : 0;
  const blockedDebts = Array.from(new Map(
    [...(snowball?.blockedDebts ?? []), ...(avalanche?.blockedDebts ?? [])].map(debt => [debt.id, debt]),
  ).values());

  function monthsLabel(n: number) {
    return `${n} ${t('months')}`;
  }

  return (
    <section className="strategy-panel" dir={dir}>
      <div className="strategy-panel-head">
        <div>
          <span className="debts-eyebrow"><TrendingDown size={16} /> THE SFM</span>
          <h2>{t('payoffStrategies')}</h2>
          <p>{t('payoffStrategiesBody')}</p>
        </div>
        <label className="strategy-extra-input">
          <span>{t('extraPaymentLabel')}</span>
          <div className="affix-input">
            <input
              type="number"
              min="0"
              step="any"
              dir="ltr"
              value={extraPaymentAmount}
              onChange={e => setExtraPaymentAmount(e.target.value)}
              placeholder={t('extraPaymentPlaceholder')}
            />
          </div>
        </label>
      </div>

      {blockedDebts.length > 0 && (
        <div className="strategy-warning" role="alert">
          <span>{t('strategyBlocked')}</span>
          <strong>{blockedDebts.map(debt => debt.name).join('، ')}</strong>
        </div>
      )}

      <div className="strategy-cols">
        {/* ── SNOWBALL ── */}
        <div className="strategy-card snowball">
          <div className="strategy-card-head">
            <span className="strategy-badge snowball-badge">
              <Snowflake size={14} /> {t('snowballTitle')}
            </span>
            <span className="strategy-tag">{t('bestMomentum')}</span>
          </div>
          <p className="strategy-desc">{t('snowballDesc')}</p>
          {snowball && (
            <>
              <div className="strategy-stats">
                <div className="strategy-stat">
                  <small>{t('payoffInMonths')}</small>
                  <strong>{monthsLabel(snowball.totalMonths)}</strong>
                </div>
                <div className="strategy-stat">
                  <small>{t('totalInterestLabel')}</small>
                  <strong dir="ltr">{money(snowball.totalInterest)}</strong>
                </div>
              </div>
              <div className="strategy-order-label">{t('debtOrderLabel')}</div>
              <ol className="strategy-order">
                {snowball.order.map((entry, i) => (
                  <li key={entry.debt.id}>
                    <span className="strategy-rank">{i + 1}</span>
                    <span className="strategy-debt-name">{entry.debt.name}</span>
                    <span className="strategy-debt-detail">
                      <b dir="ltr">{money(entry.debt.remaining_amount, entry.debt.currency)}</b>
                      <small>{t('payoffMonth')} {entry.payoffMonth}</small>
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>

        {/* ── AVALANCHE ── */}
        <div className="strategy-card avalanche">
          <div className="strategy-card-head">
            <span className="strategy-badge avalanche-badge">
              <Zap size={14} /> {t('avalancheTitle')}
            </span>
            <span className="strategy-tag recommended">{t('recommended')}</span>
          </div>
          <p className="strategy-desc">{t('avalancheDesc')}</p>
          {avalanche && (
            <>
              <div className="strategy-stats">
                <div className="strategy-stat">
                  <small>{t('payoffInMonths')}</small>
                  <strong>{monthsLabel(avalanche.totalMonths)}</strong>
                </div>
                <div className="strategy-stat">
                  <small>{t('totalInterestLabel')}</small>
                  <strong dir="ltr">{money(avalanche.totalInterest)}</strong>
                </div>
                {interestSaved > 0.01 && (
                  <div className="strategy-stat highlight">
                    <small>{t('interestSaved')}</small>
                    <strong dir="ltr" className="green">+{money(interestSaved)}</strong>
                  </div>
                )}
                {monthDiff !== 0 && (
                  <div className="strategy-stat highlight">
                    <small>{monthDiff > 0 ? t('fastestMethod') : t('fastestMethod')}</small>
                    <strong className="green">
                      {Math.abs(monthDiff)} {t('months')}
                    </strong>
                  </div>
                )}
              </div>
              <div className="strategy-order-label">{t('debtOrderLabel')}</div>
              <ol className="strategy-order">
                {avalanche.order.map((entry, i) => (
                  <li key={entry.debt.id}>
                    <span className="strategy-rank">{i + 1}</span>
                    <span className="strategy-debt-name">{entry.debt.name}</span>
                    <span className="strategy-debt-detail">
                      <b dir="ltr">{money(entry.debt.remaining_amount, entry.debt.currency)}</b>
                      <small>
                        {toNumber(entry.debt.interest_rate).toFixed(1)}%
                        {' · '}
                        {t('payoffMonth')} {entry.payoffMonth}
                      </small>
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>

      {/* Comparison banner */}
      {snowball && avalanche && interestSaved > 0.01 && (
        <div className="strategy-banner">
          <Target size={18} />
          <span>
            {locale === 'ar'
              ? `طريقة الانهيار الجليدي توفر لك ${money(interestSaved)} من الفائدة${monthDiff > 0 ? ` وتنهي ديونك أسرع بـ ${monthDiff} شهر` : ''}.`
              : locale === 'fr'
              ? `La méthode avalanche vous fait économiser ${money(interestSaved)} d'intérêts${monthDiff > 0 ? ` et rembourse vos dettes ${monthDiff} mois plus tôt` : ''}.`
              : `The avalanche method saves you ${money(interestSaved)} in interest${monthDiff > 0 ? ` and pays off your debts ${monthDiff} month${monthDiff !== 1 ? 's' : ''} faster` : ''}.`}
          </span>
        </div>
      )}
    </section>
  );
}

export function DebtStyles() {
  return (
    <style jsx global>{`
      .debts-shell {
        min-height: 100dvh;
        background:
          radial-gradient(circle at top left, rgba(47, 214, 192, .10), transparent 34%),
          var(--sfm-light-card);
        color: var(--sfm-foreground);
        font-family: Tajawal, Arial, sans-serif;
        overflow-x: hidden;
      }

      .debts-main {
        width: 100%;
        margin-inline: 0;
        padding: 24px;
        display: grid;
        gap: 22px;
        box-sizing: border-box;
      }

      .debts-main > * {
        width: 100%;
        max-width: 1500px;
        margin-inline: auto;
        min-width: 0;
      }

      .debts-hero {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 18px;
        border: 1px solid rgba(167, 243, 240, .24);
        border-radius: 30px;
        padding: clamp(22px, 3vw, 34px);
        color: #fff;
        background: linear-gradient(135deg, var(--sfm-foreground) 0%, var(--sfm-primary-dark) 58%, var(--sfm-soft-cyan) 145%);
        box-shadow: 0 22px 60px rgba(3, 18, 37, .14);
      }

      .debts-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid rgba(167, 243, 240, .28);
        background: rgba(167, 243, 240, .12);
        color: var(--sfm-soft-cyan);
        border-radius: 999px;
        padding: 7px 12px;
        font-size: 12px;
        font-weight: 950;
        margin-bottom: 14px;
      }

      .debts-hero h1 {
        margin: 0 0 10px;
        font-size: clamp(34px, 5vw, 58px);
        line-height: 1;
        font-weight: 950;
      }

      .debts-hero p {
        margin: 0;
        max-width: 760px;
        color: rgba(255, 255, 255, .74);
        font-size: 15px;
        font-weight: 800;
        line-height: 1.8;
      }

      .debts-hero-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        flex-wrap: wrap;
        flex-shrink: 0;
      }

      .debts-primary,
      .debts-section-head button,
      .debts-secondary-hero {
        border: 0;
        border-radius: 999px;
        min-height: 46px;
        padding: 0 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
        color: #fff;
        font: 950 13px Tajawal, Arial, sans-serif;
        cursor: pointer;
        box-shadow: 0 12px 28px rgba(29, 140, 255, .22);
        transition: transform .18s ease, box-shadow .18s ease, filter .18s ease, background .18s ease;
      }

      .debts-secondary-hero {
        border: 1px solid rgba(167, 243, 240, .26);
        background: rgba(255, 255, 255, .10);
        color: rgba(255, 255, 255, .92);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .08);
      }

      .debts-primary:hover,
      .debts-section-head button:hover,
      .debts-secondary-hero:hover {
        transform: translateY(-1px);
        filter: saturate(1.08);
        box-shadow: 0 16px 34px rgba(29, 140, 255, .30);
      }

      .debts-primary:active,
      .debts-section-head button:active,
      .debts-secondary-hero:active {
        transform: translateY(0) scale(.99);
      }

      .debts-secondary-hero:disabled {
        cursor: not-allowed;
        opacity: .7;
        filter: none;
        transform: none;
      }

      .spin {
        animation: debt-spin .9s linear infinite;
      }

      @keyframes debt-spin {
        to { transform: rotate(360deg); }
      }

      .debts-notice,
      .payments-panel,
      .debts-list-panel,
      .debts-insight,
      .debt-summary-card,
      .debt-card,
      .debt-modal,
      .debts-empty {
        border: 1px solid rgba(47, 214, 192, .16);
        background:
          linear-gradient(135deg, rgba(255, 255, 255, .82), rgba(234, 246, 255, .64)),
          var(--sfm-card);
        box-shadow: 0 16px 42px rgba(3, 18, 37, .07);
      }

      .debts-notice {
        border-radius: var(--r-2xl);
        padding: 14px 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        color: #047857;
        font-weight: 900;
      }

      .debts-notice.error {
        color: #b91c1c;
        border-color: rgba(239, 68, 68, .22);
        background: rgba(239, 68, 68, .08);
      }

      .debts-summary-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 14px;
      }

      .debt-summary-card {
        min-height: 118px;
        border-radius: var(--r-2xl);
        padding: 16px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .debt-summary-card > span,
      .debt-card-top + .debt-progress + .debt-metrics + .debt-warning svg {
        flex: 0 0 auto;
      }

      .debt-summary-card > span {
        width: 42px;
        height: 42px;
        border-radius: var(--r-lg);
        display: grid;
        place-items: center;
        color: var(--sfm-soft-cyan);
        background: rgba(47, 214, 192, .12);
        border: 1px solid rgba(47, 214, 192, .20);
      }

      .debt-summary-card small,
      .debt-metric span,
      .insight-row span,
      .payment-row small {
        display: block;
        color: var(--sfm-muted);
        font-size: 12px;
        font-weight: 900;
        line-height: 1.45;
      }

      .debt-summary-card strong {
        display: block;
        margin-top: 7px;
        color: var(--sfm-foreground);
        font-size: clamp(18px, 2vw, 24px);
        font-weight: 950;
        line-height: 1.2;
        overflow-wrap: anywhere;
      }

      .debts-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 370px;
        gap: 18px;
        align-items: start;
      }

      .debts-list-panel,
      .debts-insight,
      .payments-panel {
        border-radius: 30px;
        padding: 20px;
        min-width: 0;
      }

      .debts-section-head {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        align-items: center;
        margin-bottom: 16px;
      }

      .debts-section-head.compact {
        margin-bottom: 10px;
      }

      .debts-section-head span {
        display: block;
        color: var(--sfm-muted);
        font-size: 12px;
        font-weight: 950;
        margin-bottom: 5px;
      }

      .debts-section-head h2 {
        margin: 0;
        color: var(--sfm-foreground);
        font-size: 20px;
        font-weight: 950;
      }

      .debt-tabs {
        display: flex;
        gap: 8px;
        align-items: center;
        margin: 0 0 16px;
        padding: 6px;
        border: 1px solid rgba(47, 214, 192, .16);
        border-radius: 999px;
        background: rgba(236, 254, 255, .52);
        overflow-x: auto;
        scrollbar-width: none;
      }

      .debt-tabs::-webkit-scrollbar {
        display: none;
      }

      .debt-tabs button {
        min-height: 42px;
        border: 1px solid transparent;
        border-radius: 999px;
        background: transparent;
        color: var(--sfm-muted);
        padding: 0 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        white-space: nowrap;
        font: 950 13px Tajawal, Arial, sans-serif;
        cursor: pointer;
        transition: background .18s ease, color .18s ease, border-color .18s ease, box-shadow .18s ease;
      }

      .debt-tabs button:hover,
      .debt-tabs button:focus-visible {
        color: var(--sfm-foreground);
        background: rgba(255, 255, 255, .82);
        border-color: rgba(47, 214, 192, .18);
        outline: none;
      }

      .debt-tabs button.active {
        color: #fff;
        border-color: rgba(47, 214, 192, .42);
        background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
        box-shadow: 0 10px 24px rgba(29, 140, 255, .22);
      }

      .debt-tabs button span {
        min-width: 26px;
        min-height: 24px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(15, 23, 42, .08);
        color: inherit;
        font-size: 12px;
        font-weight: 950;
      }

      .debt-tabs button.active span {
        background: rgba(255, 255, 255, .18);
      }

      .debt-card-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
        align-items: start;
      }

      .debt-card {
        border-radius: var(--r-2xl);
        padding: 18px;
        display: grid;
        gap: 14px;
        min-width: 0;
        align-self: start;
        transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
      }

      .debt-card:hover {
        border-color: rgba(47, 214, 192, .22);
        box-shadow: 0 18px 44px rgba(3, 18, 37, .09);
      }

      .debt-card.expanded {
        border-color: rgba(47, 214, 192, .24);
      }

      .debt-card-top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
      }

      .debt-title-block {
        min-width: 0;
      }

      .debt-card h3 {
        margin: 0 0 4px;
        color: var(--sfm-foreground);
        font-size: 18px;
        font-weight: 950;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }

      .debt-card p {
        margin: 0;
        color: var(--sfm-muted);
        font-size: 13px;
        font-weight: 850;
        overflow-wrap: anywhere;
      }

      .debt-card-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 0 0 auto;
      }

      .debt-expand-toggle {
        width: 44px;
        height: 44px;
        border: 1px solid rgba(47, 214, 192, .20);
        border-radius: var(--r-md);
        background: rgba(47, 214, 192, .08);
        color: var(--sfm-primary-hover);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform .18s ease, border-color .18s ease, background .18s ease;
      }

      .debt-expand-toggle:hover,
      .debt-expand-toggle:focus-visible {
        background: rgba(47, 214, 192, .14);
        border-color: rgba(47, 214, 192, .34);
        outline: none;
      }

      .debt-expand-toggle:active {
        transform: scale(.96);
      }

      .debt-summary-strip,
      .debt-expanded-details {
        animation: debtReveal .18s ease;
      }

      .debt-summary-strip {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 9px;
      }

      .debt-expanded-details {
        display: grid;
        gap: 14px;
      }

      .debt-detail-groups {
        display: grid;
        gap: 12px;
      }

      .debt-detail-group {
        border: 1px solid rgba(47, 214, 192, .12);
        border-radius: var(--r-xl);
        background: rgba(248, 252, 255, .72);
        padding: 12px;
        display: grid;
        gap: 10px;
      }

      .debt-detail-group h4 {
        margin: 0;
        color: var(--sfm-foreground);
        font-size: 14px;
        font-weight: 950;
      }

      @keyframes debtReveal {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .debt-status,
      .debt-due {
        width: max-content;
        border-radius: 999px;
        border: 1px solid rgba(47, 214, 192, .24);
        background: rgba(47, 214, 192, .12);
        color: #0f766e;
        padding: 6px 10px;
        font-size: 12px;
        font-weight: 950;
        white-space: nowrap;
      }

      .debt-status.paused {
        color: #92400e;
        background: rgba(245, 158, 11, .12);
        border-color: rgba(245, 158, 11, .24);
      }

      .debt-status.paid {
        color: #047857;
        background: #ccfbf1;
      }

      .debt-progress {
        display: grid;
        gap: 8px;
      }

      .debt-progress-compact {
        margin-top: -2px;
      }

      .debt-progress span {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        color: var(--sfm-muted);
        font-size: 12px;
        font-weight: 900;
      }

      .debt-progress strong {
        color: var(--sfm-foreground);
      }

      .debt-progress i {
        height: 10px;
        border-radius: 999px;
        overflow: hidden;
        border: 1px solid rgba(47, 214, 192, .14);
        background: rgba(148, 163, 184, .14);
      }

      .debt-progress i b {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
      }

      .debt-metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 9px;
      }

      .debt-metric {
        min-width: 0;
        border: 1px solid rgba(47, 214, 192, .12);
        border-radius: var(--r-lg);
        background: var(--sfm-light-card);
        padding: 10px;
        display: grid;
        gap: 6px;
      }

      .debt-metric b,
      .insight-row b,
      .payment-row b {
        color: var(--sfm-foreground);
        font-size: 13px;
        font-weight: 950;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }

      .debt-warning,
      .debt-due {
        display: inline-flex;
        align-items: flex-start;
        gap: 8px;
        color: #92400e;
        background: rgba(245, 158, 11, .12);
        border: 1px solid rgba(245, 158, 11, .24);
        border-radius: var(--r-lg);
        padding: 10px 12px;
        font-size: 12px;
        font-weight: 900;
        line-height: 1.6;
      }

      .debt-warning div {
        display: grid;
        gap: 3px;
      }

      .debt-warning strong {
        color: #78350f;
        font-weight: 950;
      }

      .debt-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }

      .debt-actions button,
      .debt-modal-actions button {
        min-height: 38px;
        border: 1px solid rgba(47, 214, 192, .20);
        border-radius: 999px;
        background: rgba(47, 214, 192, .08);
        color: var(--sfm-primary-hover);
        padding: 0 12px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font: 900 12px Tajawal, Arial, sans-serif;
        cursor: pointer;
      }

      .debt-actions .debt-action-primary {
        min-height: 44px;
        border: 0;
        background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
        color: #fff;
        padding-inline: 18px;
        box-shadow: 0 12px 28px rgba(29, 140, 255, .20);
      }

      .debt-actions .danger {
        color: #dc2626;
        background: rgba(220, 38, 38, .08);
        border-color: rgba(220, 38, 38, .18);
      }

      .debt-action-menu {
        position: relative;
      }

      .debt-action-menu summary {
        min-height: 44px;
        border: 1px solid rgba(47, 214, 192, .20);
        border-radius: 999px;
        background: rgba(47, 214, 192, .08);
        color: var(--sfm-primary-hover);
        padding: 0 14px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font: 950 12px Tajawal, Arial, sans-serif;
        cursor: pointer;
        list-style: none;
        transition: background .18s ease, border-color .18s ease, box-shadow .18s ease;
      }

      .debt-action-menu summary::-webkit-details-marker {
        display: none;
      }

      .debt-action-menu summary::after {
        content: "⌄";
        font-size: 13px;
        line-height: 1;
      }

      .debt-action-menu[open] summary,
      .debt-action-menu summary:hover,
      .debt-action-menu summary:focus-visible {
        background: rgba(47, 214, 192, .14);
        border-color: rgba(47, 214, 192, .34);
        outline: none;
      }

      .debt-action-menu > div {
        position: absolute;
        z-index: 40;
        inset-inline-start: 0;
        bottom: calc(100% + 8px);
        min-width: 220px;
        border: 1px solid rgba(47, 214, 192, .18);
        border-radius: var(--r-xl);
        background: #fff;
        padding: 8px;
        display: grid;
        gap: 6px;
        box-shadow: 0 22px 52px rgba(3, 18, 37, .16);
      }

      .debt-action-menu > div button {
        width: 100%;
        justify-content: flex-start;
        min-height: 40px;
      }

      .debts-insight {
        position: sticky;
        top: 18px;
        display: grid;
        gap: 12px;
      }

      .insight-row,
      .payment-row {
        border: 1px solid rgba(47, 214, 192, .12);
        border-radius: var(--r-xl);
        background: var(--sfm-light-card);
        padding: 12px;
        display: grid;
        gap: 6px;
      }

      .insight-copy,
      .insight-alert {
        margin: 0;
        border-radius: var(--r-xl);
        padding: 12px;
        color: var(--sfm-muted);
        background: rgba(47, 214, 192, .08);
        border: 1px solid rgba(47, 214, 192, .15);
        font-size: 13px;
        font-weight: 850;
        line-height: 1.75;
      }

      .insight-alert {
        color: #92400e;
        background: rgba(245, 158, 11, .12);
        border-color: rgba(245, 158, 11, .24);
      }

      .payments-list {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .payment-row span {
        color: var(--sfm-foreground);
        font-size: 13px;
        font-weight: 950;
      }

      .payment-row em {
        width: max-content;
        border-radius: 999px;
        padding: 4px 9px;
        font-style: normal;
        font-size: 11px;
        font-weight: 950;
        color: #0f766e;
        background: rgba(47, 214, 192, .12);
        border: 1px solid rgba(47, 214, 192, .18);
      }

      .payment-row.overdue {
        border-color: rgba(220, 38, 38, .24);
        background: rgba(254, 242, 242, .82);
      }

      .payment-row.overdue em {
        color: #b91c1c;
        border-color: rgba(220, 38, 38, .18);
        background: rgba(220, 38, 38, .08);
      }

      .payment-row.dueToday {
        border-color: rgba(245, 158, 11, .26);
        background: rgba(255, 251, 235, .76);
      }

      .payment-row.dueToday em {
        color: #92400e;
        border-color: rgba(245, 158, 11, .22);
        background: rgba(245, 158, 11, .12);
      }

      .payments-empty {
        border: 1px dashed rgba(47, 214, 192, .24);
        border-radius: var(--r-xl);
        padding: 18px;
        color: var(--sfm-muted);
        background: rgba(236, 254, 255, .38);
        font-size: 13px;
        font-weight: 900;
        text-align: center;
      }

      .debts-empty,
      .debts-loading {
        border-radius: var(--r-2xl);
        padding: 32px;
        display: grid;
        justify-items: center;
        gap: 12px;
        text-align: center;
        color: var(--sfm-muted);
        font-weight: 850;
        line-height: 1.8;
      }

      .debts-empty svg {
        color: var(--sfm-soft-cyan);
      }

      .debts-empty h1,
      .debts-empty h2 {
        margin: 0;
        color: var(--sfm-foreground);
        font-weight: 950;
      }

      .debts-empty p {
        margin: 0;
        max-width: 640px;
      }

      .debt-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 240;
        display: flex;
        align-items: center;
        justify-content: center;
        background:
          radial-gradient(circle at 50% 20%, rgba(47, 214, 192, .16), transparent 32%),
          rgba(3, 18, 37, .58);
        backdrop-filter: blur(12px);
        padding: clamp(14px, 3vw, 28px);
        overflow-y: auto;
        overscroll-behavior: contain;
      }

      .debt-modal {
        width: min(860px, 100%);
        max-height: min(90dvh, 940px);
        overflow-y: auto;
        border-radius: 32px;
        padding: clamp(18px, 2.5vw, 28px);
        margin: auto;
        outline: none;
        box-shadow: 0 30px 90px rgba(3, 18, 37, .32);
        scrollbar-gutter: stable;
      }

      .debt-modal-head {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        align-items: flex-start;
        margin-bottom: 18px;
        padding-bottom: 16px;
        border-bottom: 1px solid rgba(47, 214, 192, .16);
      }

      .debt-modal-head span {
        display: inline-flex;
        width: max-content;
        border: 1px solid rgba(47, 214, 192, .18);
        border-radius: 999px;
        background: rgba(47, 214, 192, .10);
        color: var(--sfm-primary-hover);
        padding: 5px 10px;
        font-size: 12px;
        font-weight: 950;
      }

      .debt-modal-head h2 {
        margin: 10px 0 0;
        color: var(--sfm-foreground);
        font-size: clamp(24px, 3vw, 32px);
        font-weight: 950;
        line-height: 1.15;
      }

      .debt-modal-head p {
        margin: 8px 0 0;
        max-width: 560px;
        color: var(--sfm-muted-readable, #475569);
        font-size: 14px;
        font-weight: 850;
        line-height: 1.7;
      }

      .debt-modal-head > button {
        width: 44px;
        height: var(--control-h);
        border: 1px solid rgba(29, 140, 255, .18);
        border-radius: var(--r-lg);
        background: rgba(255, 255, 255, .76);
        color: var(--sfm-foreground);
        cursor: pointer;
        flex-shrink: 0;
        display: grid;
        place-items: center;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .35);
        transition: transform .18s ease, background .18s ease, border-color .18s ease, box-shadow .18s ease;
      }

      .debt-modal-head > button:hover {
        background: rgba(47, 214, 192, .12);
        border-color: rgba(47, 214, 192, .32);
        box-shadow: 0 12px 26px rgba(3, 18, 37, .10);
      }

      .debt-modal-head > button:active {
        transform: translateY(1px);
      }

      .debt-validation-panel {
        display: flex;
        align-items: flex-start;
        gap: 11px;
        border: 1px solid rgba(245, 158, 11, .28);
        border-radius: var(--r-xl);
        background: rgba(245, 158, 11, .10);
        color: #92400e;
        padding: 13px;
        margin-bottom: 16px;
      }

      .debt-save-alert {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        border: 1px solid rgba(220, 38, 38, .24);
        border-radius: var(--r-xl);
        background: rgba(220, 38, 38, .08);
        color: #b91c1c;
        padding: 14px;
        margin-bottom: 16px;
      }

      .debt-save-alert svg {
        flex-shrink: 0;
        margin-top: 2px;
      }

      .debt-save-alert strong {
        display: block;
        color: #991b1b;
        font-size: 13px;
        font-weight: 950;
      }

      .debt-save-alert p {
        margin: 6px 0 0;
        color: #7f1d1d;
        font-size: 13px;
        font-weight: 850;
        line-height: 1.7;
      }

      .debt-validation-panel svg {
        flex-shrink: 0;
        margin-top: 2px;
      }

      .debt-validation-panel strong {
        display: block;
        font-size: 13px;
        font-weight: 950;
      }

      .debt-validation-panel ul {
        margin: 8px 0 0;
        padding-inline-start: 18px;
        display: grid;
        gap: 4px;
        color: #78350f;
        font-size: 12px;
        font-weight: 800;
      }

      .debt-form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }

      .debt-form-section {
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 6px;
      }

      .debt-form-section:first-child {
        margin-top: 0;
      }

      .debt-form-section::after {
        content: "";
        height: 1px;
        flex: 1;
        background: linear-gradient(90deg, rgba(47, 214, 192, .32), rgba(148, 163, 184, .10));
      }

      .debt-form-section span {
        color: var(--sfm-foreground);
        font-size: 13px;
        font-weight: 950;
      }

      .debt-field {
        display: grid;
        gap: 9px;
        min-width: 0;
      }

      .debt-field.wide {
        grid-column: 1 / -1;
      }

      .debt-field > span {
        color: var(--sfm-foreground);
        font-size: 13px;
        font-weight: 950;
      }

      .debt-field > span i {
        color: #dc2626;
        font-style: normal;
        margin-inline-start: 2px;
      }

      .debt-field > span small {
        display: block;
        margin-top: 5px;
        color: var(--sfm-muted-readable, #475569);
        font-size: 11px;
        font-weight: 850;
        line-height: 1.6;
      }

      .debt-field input,
      .debt-field select,
      .debt-field textarea,
      .affix-input {
        width: 100%;
        min-width: 0;
        min-height: 52px;
        border: 1.5px solid rgba(15, 118, 110, .22);
        border-radius: var(--r-xl);
        background: rgba(255, 255, 255, .92);
        color: var(--sfm-foreground);
        padding: 0 14px;
        font: 900 14px Tajawal, Arial, sans-serif;
        outline: none;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, .55);
        transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
      }

      .debt-field input::placeholder,
      .debt-field textarea::placeholder {
        color: #64748b;
        opacity: 1;
      }

      .debt-field textarea {
        min-height: 104px;
        padding-block: 13px;
        resize: vertical;
      }

      .debt-field input:focus,
      .debt-field select:focus,
      .debt-field textarea:focus,
      .affix-input:focus-within {
        border-color: var(--sfm-soft-cyan);
        box-shadow: 0 0 0 4px rgba(47, 214, 192, .16), inset 0 1px 0 rgba(255, 255, 255, .55);
        background: #fff;
      }

      .debt-field.invalid input,
      .debt-field.invalid select,
      .debt-field.invalid textarea,
      .debt-field.invalid .affix-input {
        border-color: rgba(220, 38, 38, .58);
        box-shadow: 0 0 0 4px rgba(220, 38, 38, .10);
      }

      .affix-input {
        display: flex;
        align-items: center;
        gap: 10px;
        padding-inline: 9px;
        direction: ltr;
      }

      .affix-input em {
        min-width: 58px;
        min-height: 36px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, rgba(29, 140, 255, .12), rgba(47, 214, 192, .18));
        color: #0f766e;
        border: 1px solid rgba(15, 118, 110, .16);
        font-style: normal;
        font-size: 12px;
        font-weight: 950;
        letter-spacing: .02em;
      }

      .affix-input input {
        border: 0;
        box-shadow: none;
        background: transparent;
        padding-inline: 6px;
        min-height: 42px;
        text-align: start;
      }

      .affix-input input:focus {
        box-shadow: none;
      }

      .toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        border: 1.5px solid rgba(15, 118, 110, .18);
        border-radius: var(--r-xl);
        background: rgba(236, 254, 255, .44);
        padding: 14px;
      }

      .toggle-row button {
        border: 1px solid rgba(47, 214, 192, .22);
        border-radius: 999px;
        background: rgba(47, 214, 192, .12);
        color: var(--sfm-primary-hover);
        padding: 8px 14px;
        font: 950 12px Tajawal, Arial, sans-serif;
        cursor: pointer;
      }

      .toggle-row button[aria-pressed="true"] {
        background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
        color: #fff;
      }

      .debt-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 22px;
        padding-top: 16px;
        border-top: 1px solid rgba(47, 214, 192, .16);
        flex-wrap: wrap;
      }

      .debt-modal-actions .debts-primary {
        border: 0;
        color: #fff;
        width: auto;
        min-width: 190px;
        min-height: 50px;
        font-size: 14px;
        box-shadow: 0 16px 36px rgba(29, 140, 255, .30);
      }

      .debt-modal-actions .debts-primary:disabled,
      .debt-modal-actions .debts-primary[aria-disabled="true"] {
        background: rgba(15, 23, 42, .08);
        border: 1px solid rgba(15, 23, 42, .12);
        color: #475569;
        box-shadow: none;
        cursor: not-allowed;
        filter: none;
        transform: none;
        opacity: .78;
      }

      .debt-secondary-action {
        min-height: 50px;
        border: 1px solid rgba(47, 214, 192, .22);
        border-radius: 999px;
        background: rgba(255, 255, 255, .86);
        color: var(--sfm-foreground);
        padding: 0 20px;
        font: 950 13px Tajawal, Arial, sans-serif;
        cursor: pointer;
        transition: background .18s ease, border-color .18s ease, transform .18s ease;
      }

      .debt-secondary-action:hover {
        background: rgba(47, 214, 192, .10);
        border-color: rgba(47, 214, 192, .35);
      }

      .debt-secondary-action:active {
        transform: translateY(1px);
      }

      .debt-modal-head > button:focus-visible,
      .debt-modal-actions button:focus-visible,
      .debts-secondary-hero:focus-visible,
      .toggle-row button:focus-visible {
        outline: none;
        border-color: var(--sfm-soft-cyan);
        box-shadow: 0 0 0 4px rgba(47, 214, 192, .16);
      }

      .debt-form-helper {
        margin: 14px 0 0;
        color: var(--sfm-muted);
        font-size: 12px;
        font-weight: 850;
      }

      .dark .debts-shell {
        background:
          radial-gradient(circle at top left, rgba(47, 214, 192, .08), transparent 34%),
          #0a1422;
      }

      .dark .debt-modal-backdrop {
        background:
          radial-gradient(circle at 50% 20%, rgba(47, 214, 192, .10), transparent 34%),
          rgba(2, 8, 23, .74);
      }

      .dark .debts-notice,
      .dark .payments-panel,
      .dark .debts-list-panel,
      .dark .debts-insight,
      .dark .debt-summary-card,
      .dark .debt-card,
      .dark .debt-modal,
      .dark .debts-empty {
        background:
          linear-gradient(135deg, rgba(29, 140, 255, .08), rgba(47, 214, 192, .07)),
          #0f1d31;
        border-color: #1d3050;
        box-shadow: 0 16px 42px rgba(0, 0, 0, .25);
      }

      .dark .debt-modal {
        box-shadow: 0 32px 95px rgba(0, 0, 0, .52);
      }

      .dark .debt-modal-head {
        border-bottom-color: #1d3050;
      }

      .dark .debt-modal-head span {
        background: rgba(47, 214, 192, .12);
        border-color: rgba(47, 214, 192, .25);
        color: #2fd6c0;
      }

      .dark .debt-modal-head p,
      .dark .debt-field > span small,
      .dark .debt-form-helper {
        color: #b8c7d9;
      }

      .dark .debt-metric,
      .dark .insight-row,
      .dark .payment-row,
      .dark .debt-detail-group,
      .dark .debt-field input,
      .dark .debt-field select,
      .dark .debt-field textarea,
      .dark .affix-input,
      .dark .toggle-row,
      .dark .debt-modal-head > button {
        background: #0a1422;
        border-color: #1d3050;
      }

      .dark .debt-tabs {
        background: #0a1422;
        border-color: #1d3050;
      }

      .dark .debt-tabs button {
        color: #b8c7d9;
      }

      .dark .debt-tabs button:hover,
      .dark .debt-tabs button:focus-visible {
        background: #13243a;
        color: #e8eef6;
        border-color: #1d3050;
      }

      .dark .debt-tabs button span {
        background: rgba(255, 255, 255, .08);
      }

      .dark .debt-action-menu summary {
        background: rgba(47, 214, 192, .10);
        border-color: rgba(47, 214, 192, .22);
        color: #2fd6c0;
      }

      .dark .debt-action-menu > div {
        background: #0a1422;
        border-color: #1d3050;
        box-shadow: 0 22px 52px rgba(0, 0, 0, .35);
      }

      .dark .payment-row.overdue {
        background: rgba(127, 29, 29, .16);
        border-color: rgba(255, 91, 110, .25);
      }

      .dark .payment-row.dueToday {
        background: rgba(120, 53, 15, .16);
        border-color: rgba(245, 185, 66, .24);
      }

      .dark .payments-empty {
        background: #0a1422;
        border-color: #1d3050;
        color: #b8c7d9;
      }

      .dark .debt-field input,
      .dark .debt-field select,
      .dark .debt-field textarea,
      .dark .affix-input {
        color: #e8eef6;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, .04);
      }

      .dark .debt-field input::placeholder,
      .dark .debt-field textarea::placeholder {
        color: #8ea6c3;
      }

      .dark .debt-field > span,
      .dark .debt-form-section span,
      .dark .debt-modal-head h2 {
        color: #e8eef6;
      }

      .dark .debt-field input:focus,
      .dark .debt-field select:focus,
      .dark .debt-field textarea:focus,
      .dark .affix-input:focus-within {
        background: #0f1d31;
        border-color: #2fd6c0;
        box-shadow: 0 0 0 4px rgba(47, 214, 192, .14), inset 0 1px 0 rgba(255, 255, 255, .04);
      }

      .dark .debt-field.invalid input,
      .dark .debt-field.invalid select,
      .dark .debt-field.invalid textarea,
      .dark .debt-field.invalid .affix-input {
        border-color: rgba(255, 91, 110, .64);
        box-shadow: 0 0 0 4px rgba(255, 91, 110, .12);
      }

      .dark .affix-input em {
        background: rgba(47, 214, 192, .12);
        border-color: rgba(47, 214, 192, .25);
        color: #2fd6c0;
      }

      .dark .toggle-row {
        background: #13243a;
      }

      .dark .debt-status.active,
      .dark .debt-status.paid {
        color: #2fd6c0;
        background: rgba(47, 214, 192, .12);
        border-color: rgba(47, 214, 192, .25);
      }

      .dark .debt-warning,
      .dark .debt-due,
      .dark .insight-alert {
        color: #f5b942;
        background: rgba(245, 185, 66, .12);
        border-color: rgba(245, 185, 66, .25);
      }

      .dark .debt-validation-panel {
        background: rgba(245, 185, 66, .12);
        border-color: rgba(245, 185, 66, .25);
        color: #f8d47a;
      }

      .dark .debt-validation-panel ul {
        color: #f5b942;
      }

      .dark .debt-save-alert {
        background: rgba(255, 91, 110, .12);
        border-color: rgba(255, 91, 110, .28);
        color: #ffb4bd;
      }

      .dark .debt-save-alert strong {
        color: #ffb4bd;
      }

      .dark .debt-save-alert p {
        color: #ffd7dc;
      }

      .dark .debt-modal-actions {
        border-top-color: #1d3050;
      }

      .dark .debt-modal-actions .debts-primary:disabled,
      .dark .debt-modal-actions .debts-primary[aria-disabled="true"] {
        background: rgba(19, 36, 58, .88);
        border-color: #1d3050;
        color: #b8c7d9;
      }

      .dark .debt-secondary-action {
        background: #0a1422;
        border-color: #1d3050;
        color: #e8eef6;
      }

      .dark .debt-secondary-action:hover,
      .dark .debt-modal-head > button:hover {
        background: #13243a;
        border-color: rgba(47, 214, 192, .35);
      }

      @media (max-width: 1180px) {
        .debts-summary-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .debts-layout {
          grid-template-columns: 1fr;
        }
        .debts-insight {
          position: static;
        }
        .payments-list {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 1024px) {
        .debts-main {
          width: 100%;
          margin-inline: 0;
          padding: calc(88px + env(safe-area-inset-top)) 16px 18px;
        }
      }

      @media (max-width: 720px) {
        .debts-hero {
          display: grid;
          border-radius: var(--r-2xl);
        }
        .debts-primary,
        .debts-secondary-hero,
        .debts-section-head button {
          width: 100%;
        }
        .debts-summary-grid,
        .debt-card-grid,
        .payments-list,
        .debt-form-grid {
          grid-template-columns: 1fr;
        }
        .debts-summary-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .debt-card {
          border-radius: var(--r-2xl);
          padding: 14px;
          gap: 12px;
        }
        .debt-card-top {
          align-items: flex-start;
        }
        .debt-card-controls {
          align-items: flex-end;
          flex-direction: column;
        }
        .debt-summary-strip {
          grid-template-columns: 1fr;
        }
        .debt-metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .debts-section-head {
          display: grid;
        }
        .debt-modal-backdrop {
          align-items: end;
          padding: 10px;
        }
        .debt-modal {
          width: 100%;
          max-height: calc(100dvh - 20px);
          overflow-y: auto;
          border-radius: var(--r-2xl);
          padding: 18px;
        }
        .debt-modal-head {
          gap: 12px;
        }
        .debt-modal-head > button {
          width: 42px;
          height: var(--control-h);
        }
        .toggle-row {
          display: grid;
        }
        .toggle-row button {
          width: 100%;
          min-height: 42px;
        }
        .debt-modal-actions {
          display: grid;
        }
        .debt-modal-actions .debts-primary,
        .debt-secondary-action {
          width: 100%;
        }
      }

      @media (max-width: 430px) {
        .debts-summary-grid,
        .debt-summary-strip,
        .debt-metrics {
          grid-template-columns: 1fr;
        }
        .debt-actions button,
        .debt-action-menu,
        .debt-action-menu summary {
          flex: 1 1 100%;
          justify-content: center;
        }
        .debt-action-menu > div {
          position: static;
          margin-top: 8px;
          width: 100%;
          min-width: 0;
        }
      }

      /* ─── Debt Metric Highlight ─────────────────────────────────── */
      .debt-metric--highlight {
        border-color: rgba(47, 214, 192, .30);
        background: rgba(47, 214, 192, .08);
      }
      .debt-metric--highlight b {
        color: var(--sfm-primary-hover);
      }

      /* ─── Strategy Panel ─────────────────────────────────────────── */
      .strategy-panel {
        border-radius: 30px;
        padding: 24px;
        display: grid;
        gap: 20px;
      }

      .strategy-panel-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 20px;
        flex-wrap: wrap;
      }

      .strategy-panel-head h2 {
        margin: 8px 0 4px;
        color: var(--sfm-foreground);
        font-size: clamp(20px, 2.2vw, 26px);
        font-weight: 950;
        line-height: 1.2;
      }

      .strategy-panel-head p {
        margin: 0;
        max-width: 540px;
        color: var(--sfm-muted);
        font-size: 13px;
        font-weight: 850;
        line-height: 1.75;
      }

      .strategy-extra-input {
        display: grid;
        gap: 7px;
        min-width: 200px;
        flex-shrink: 0;
      }

      .strategy-extra-input > span {
        color: var(--sfm-muted);
        font-size: 12px;
        font-weight: 950;
      }

      .strategy-warning {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        border: 1px solid rgba(245, 158, 11, .24);
        border-radius: var(--r-xl);
        background: rgba(245, 158, 11, .10);
        color: #92400e;
        padding: 12px 14px;
        font-size: 13px;
        font-weight: 900;
        line-height: 1.7;
      }

      .strategy-warning::before {
        content: "!";
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: inline-grid;
        place-items: center;
        flex: 0 0 auto;
        color: #fff;
        background: #f59e0b;
        font-size: 13px;
        font-weight: 950;
      }

      .strategy-warning span,
      .strategy-warning strong {
        display: block;
      }

      .strategy-warning strong {
        color: #78350f;
        margin-top: 2px;
      }

      .strategy-cols {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }

      .strategy-card {
        border-radius: var(--r-2xl);
        padding: 20px;
        display: grid;
        gap: 16px;
        border: 1px solid rgba(47, 214, 192, .14);
        background: var(--sfm-light-card);
      }

      .strategy-card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
      }

      .strategy-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 999px;
        padding: 6px 12px;
        font-size: 13px;
        font-weight: 950;
      }

      .snowball-badge {
        background: rgba(56, 189, 248, .12);
        border: 1px solid rgba(56, 189, 248, .28);
        color: #0369a1;
      }

      .avalanche-badge {
        background: rgba(168, 85, 247, .12);
        border: 1px solid rgba(168, 85, 247, .28);
        color: #7c3aed;
      }

      .strategy-tag {
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 11px;
        font-weight: 950;
        background: rgba(148, 163, 184, .12);
        border: 1px solid rgba(148, 163, 184, .20);
        color: var(--sfm-muted);
      }

      .strategy-tag.recommended {
        background: rgba(34, 197, 94, .12);
        border-color: rgba(34, 197, 94, .28);
        color: #15803d;
      }

      .strategy-desc {
        margin: 0;
        color: var(--sfm-muted);
        font-size: 13px;
        font-weight: 850;
        line-height: 1.75;
      }

      .strategy-stats {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .strategy-stat {
        border-radius: var(--r-lg);
        padding: 12px;
        display: grid;
        gap: 6px;
        border: 1px solid rgba(47, 214, 192, .12);
        background: var(--sfm-canvas, #f8fafc);
      }

      .strategy-stat.highlight {
        border-color: rgba(34, 197, 94, .24);
        background: rgba(34, 197, 94, .06);
      }

      .strategy-stat small {
        display: block;
        color: var(--sfm-muted);
        font-size: 11px;
        font-weight: 950;
      }

      .strategy-stat strong {
        display: block;
        color: var(--sfm-foreground);
        font-size: 15px;
        font-weight: 950;
        line-height: 1.3;
        overflow-wrap: anywhere;
      }

      .strategy-stat strong.green {
        color: #15803d;
      }

      .strategy-order-label {
        color: var(--sfm-muted);
        font-size: 12px;
        font-weight: 950;
        padding-bottom: 4px;
        border-bottom: 1px solid rgba(47, 214, 192, .14);
      }

      .strategy-order {
        margin: 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 8px;
      }

      .strategy-order li {
        display: flex;
        align-items: center;
        gap: 10px;
        border-radius: var(--r-md);
        padding: 10px 12px;
        border: 1px solid rgba(47, 214, 192, .10);
        background: var(--sfm-canvas, #f8fafc);
      }

      .strategy-rank {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-size: 12px;
        font-weight: 950;
        background: rgba(47, 214, 192, .14);
        color: var(--sfm-primary-hover);
        flex-shrink: 0;
      }

      .strategy-debt-name {
        flex: 1;
        color: var(--sfm-foreground);
        font-size: 13px;
        font-weight: 950;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .strategy-debt-detail {
        display: grid;
        gap: 2px;
        text-align: end;
        flex-shrink: 0;
      }

      .strategy-debt-detail b {
        color: var(--sfm-foreground);
        font-size: 13px;
        font-weight: 950;
      }

      .strategy-debt-detail small {
        color: var(--sfm-muted);
        font-size: 11px;
        font-weight: 850;
      }

      .strategy-banner {
        display: flex;
        align-items: center;
        gap: 12px;
        border-radius: var(--r-xl);
        padding: 14px 16px;
        background: rgba(34, 197, 94, .09);
        border: 1px solid rgba(34, 197, 94, .24);
        color: #15803d;
        font-size: 13px;
        font-weight: 900;
        line-height: 1.65;
      }

      .strategy-banner svg {
        flex-shrink: 0;
        color: #16a34a;
      }

      /* ─── Dark mode — strategy ───────────────────────────────────── */
      .dark .strategy-panel,
      .dark .strategy-card {
        border-color: rgba(47, 214, 192, .12);
        background: #0d1f35;
      }

      .dark .strategy-stat,
      .dark .strategy-order li {
        background: #07172a;
        border-color: rgba(47, 214, 192, .10);
      }

      .dark .strategy-stat.highlight {
        background: rgba(34, 197, 94, .08);
        border-color: rgba(34, 197, 94, .22);
      }

      .dark .snowball-badge {
        color: #38bdf8;
      }

      .dark .avalanche-badge {
        color: #c084fc;
      }

      .dark .strategy-tag.recommended {
        color: #4ade80;
      }

      .dark .strategy-warning {
        color: #f5b942;
        background: rgba(245, 185, 66, .12);
        border-color: rgba(245, 185, 66, .24);
      }

      .dark .strategy-warning strong {
        color: #f8d47a;
      }

      .dark .strategy-stat strong.green,
      .dark .strategy-banner {
        color: #4ade80;
      }

      .dark .strategy-banner {
        background: rgba(34, 197, 94, .07);
        border-color: rgba(34, 197, 94, .18);
      }

      .dark .debt-metric--highlight {
        background: rgba(47, 214, 192, .10);
        border-color: rgba(47, 214, 192, .28);
      }

      /* ─── Strategy responsive ────────────────────────────────────── */
      @media (max-width: 900px) {
        .strategy-cols {
          grid-template-columns: 1fr;
        }
        .strategy-panel-head {
          flex-direction: column;
          align-items: flex-start;
        }
        .strategy-extra-input {
          width: 100%;
        }
      }
    `}</style>
  );
}
