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
        background: var(--surface-muted);
        color: var(--foreground);
        font-family: var(--font-ui);
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
        border: 1px solid color-mix(in srgb, var(--accent) 24%, transparent);
        border-radius: var(--radius-panel);
        padding: clamp(22px, 3vw, 34px);
        color: var(--hero-foreground);
        background: var(--hero-gradient);
        box-shadow: var(--shadow-md);
      }

      .debts-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
        background: color-mix(in srgb, var(--accent) 12%, transparent);
        color: var(--accent);
        border-radius: var(--radius-pill);
        padding: 7px 12px;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 14px;
      }

      .debts-hero h1 {
        margin: 0 0 10px;
        font-size: clamp(34px, 5vw, 58px);
        line-height: 1;
        font-weight: 600;
      }

      .debts-hero p {
        margin: 0;
        max-width: 760px;
        color: color-mix(in srgb, var(--hero-foreground) 74%, transparent);
        font-size: 15px;
        font-weight: 500;
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
        border-radius: var(--radius-pill);
        min-height: 46px;
        padding: 0 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: var(--primary);
        color: var(--primary-foreground);
        font: 600 13px var(--font-ui);
        cursor: pointer;
        box-shadow: var(--shadow-md);
        transition: transform .18s ease, box-shadow .18s ease, filter .18s ease, background .18s ease;
      }

      .debts-secondary-hero {
        border: 1px solid color-mix(in srgb, var(--accent) 26%, transparent);
        background: color-mix(in srgb, var(--hero-foreground) 10%, transparent);
        color: color-mix(in srgb, var(--hero-foreground) 92%, transparent);
        box-shadow: var(--shadow-md);
      }

      .debts-primary:hover,
      .debts-section-head button:hover,
      .debts-secondary-hero:hover {
        transform: translateY(-1px);
        filter: saturate(1.08);
        box-shadow: var(--shadow-md);
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
        border: 1px solid color-mix(in srgb, var(--accent) 16%, transparent);
        background: var(--surface);
        box-shadow: var(--shadow-md);
      }

      .debts-notice {
        border-radius: var(--radius-panel);
        padding: 14px 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--success);
        font-weight: 600;
      }

      .debts-notice.error {
        color: var(--danger);
        border-color: color-mix(in srgb, var(--danger) 22%, transparent);
        background: color-mix(in srgb, var(--danger) 8%, transparent);
      }

      .debts-summary-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 14px;
      }

      .debt-summary-card {
        min-height: 118px;
        border-radius: var(--radius-panel);
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
        border-radius: var(--radius-card);
        display: grid;
        place-items: center;
        color: var(--accent);
        background: color-mix(in srgb, var(--accent) 12%, transparent);
        border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
      }

      .debt-summary-card small,
      .debt-metric span,
      .insight-row span,
      .payment-row small {
        display: block;
        color: var(--foreground-muted);
        font-size: 12px;
        font-weight: 600;
        line-height: 1.45;
      }

      .debt-summary-card strong {
        display: block;
        margin-top: 7px;
        color: var(--foreground);
        font-size: clamp(18px, 2vw, 24px);
        font-weight: 600;
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
        border-radius: var(--radius-panel);
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
        color: var(--foreground-muted);
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 5px;
      }

      .debts-section-head h2 {
        margin: 0;
        color: var(--foreground);
        font-size: 20px;
        font-weight: 600;
      }

      .debt-tabs {
        display: flex;
        gap: 8px;
        align-items: center;
        margin: 0 0 16px;
        padding: 6px;
        border: 1px solid color-mix(in srgb, var(--accent) 16%, transparent);
        border-radius: var(--radius-pill);
        background: color-mix(in srgb, var(--primary) 52%, transparent);
        overflow-x: auto;
        scrollbar-width: none;
      }

      .debt-tabs::-webkit-scrollbar {
        display: none;
      }

      .debt-tabs button {
        min-height: 42px;
        border: 1px solid transparent;
        border-radius: var(--radius-pill);
        background: transparent;
        color: var(--foreground-muted);
        padding: 0 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        white-space: nowrap;
        font: 600 13px var(--font-ui);
        cursor: pointer;
        transition: background .18s ease, color .18s ease, border-color .18s ease, box-shadow .18s ease;
      }

      .debt-tabs button:hover,
      .debt-tabs button:focus-visible {
        color: var(--foreground);
        background: color-mix(in srgb, var(--hero-foreground) 82%, transparent);
        border-color: color-mix(in srgb, var(--accent) 18%, transparent);
        outline: none;
      }

      .debt-tabs button.active {
        color: var(--primary-foreground);
        border-color: color-mix(in srgb, var(--accent) 42%, transparent);
        background: var(--primary);
        box-shadow: var(--shadow-md);
      }

      .debt-tabs button span {
        min-width: 26px;
        min-height: 24px;
        border-radius: var(--radius-pill);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: color-mix(in srgb, var(--shadow-color) 8%, transparent);
        color: inherit;
        font-size: 12px;
        font-weight: 600;
      }

      .debt-tabs button.active span {
        background: color-mix(in srgb, var(--hero-foreground) 18%, transparent);
      }

      .debt-card-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
        align-items: start;
      }

      .debt-card {
        border-radius: var(--radius-panel);
        padding: 18px;
        display: grid;
        gap: 14px;
        min-width: 0;
        align-self: start;
        transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
      }

      .debt-card:hover {
        border-color: color-mix(in srgb, var(--accent) 22%, transparent);
        box-shadow: var(--shadow-md);
      }

      .debt-card.expanded {
        border-color: color-mix(in srgb, var(--accent) 24%, transparent);
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
        color: var(--foreground);
        font-size: 18px;
        font-weight: 600;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }

      .debt-card p {
        margin: 0;
        color: var(--foreground-muted);
        font-size: 13px;
        font-weight: 600;
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
        border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
        border-radius: var(--radius-control);
        background: color-mix(in srgb, var(--accent) 8%, transparent);
        color: var(--primary-hover);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform .18s ease, border-color .18s ease, background .18s ease;
      }

      .debt-expand-toggle:hover,
      .debt-expand-toggle:focus-visible {
        background: color-mix(in srgb, var(--accent) 14%, transparent);
        border-color: color-mix(in srgb, var(--accent) 34%, transparent);
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
        border: 1px solid color-mix(in srgb, var(--accent) 12%, transparent);
        border-radius: var(--radius-card);
        background: color-mix(in srgb, var(--hero-foreground) 72%, transparent);
        padding: 12px;
        display: grid;
        gap: 10px;
      }

      .debt-detail-group h4 {
        margin: 0;
        color: var(--foreground);
        font-size: 14px;
        font-weight: 600;
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
        border-radius: var(--radius-pill);
        border: 1px solid color-mix(in srgb, var(--accent) 24%, transparent);
        background: color-mix(in srgb, var(--accent) 12%, transparent);
        color: var(--accent);
        padding: 6px 10px;
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
      }

      .debt-status.paused {
        color: var(--warning);
        background: color-mix(in srgb, var(--warning) 12%, transparent);
        border-color: color-mix(in srgb, var(--warning) 24%, transparent);
      }

      .debt-status.paid {
        color: var(--success);
        background: var(--accent-soft);
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
        color: var(--foreground-muted);
        font-size: 12px;
        font-weight: 600;
      }

      .debt-progress strong {
        color: var(--foreground);
      }

      .debt-progress i {
        height: 10px;
        border-radius: var(--radius-pill);
        overflow: hidden;
        border: 1px solid color-mix(in srgb, var(--accent) 14%, transparent);
        background: color-mix(in srgb, var(--foreground-muted) 14%, transparent);
      }

      .debt-progress i b {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: var(--primary);
      }

      .debt-metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 9px;
      }

      .debt-metric {
        min-width: 0;
        border: 1px solid color-mix(in srgb, var(--accent) 12%, transparent);
        border-radius: var(--radius-card);
        background: var(--surface-muted);
        padding: 10px;
        display: grid;
        gap: 6px;
      }

      .debt-metric b,
      .insight-row b,
      .payment-row b {
        color: var(--foreground);
        font-size: 13px;
        font-weight: 600;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }

      .debt-warning,
      .debt-due {
        display: inline-flex;
        align-items: flex-start;
        gap: 8px;
        color: var(--warning);
        background: color-mix(in srgb, var(--warning) 12%, transparent);
        border: 1px solid color-mix(in srgb, var(--warning) 24%, transparent);
        border-radius: var(--radius-card);
        padding: 10px 12px;
        font-size: 12px;
        font-weight: 600;
        line-height: 1.6;
      }

      .debt-warning div {
        display: grid;
        gap: 3px;
      }

      .debt-warning strong {
        color: var(--warning);
        font-weight: 600;
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
        border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
        border-radius: var(--radius-pill);
        background: color-mix(in srgb, var(--accent) 8%, transparent);
        color: var(--primary-hover);
        padding: 0 12px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font: 600  12px var(--font-ui);
        cursor: pointer;
      }

      .debt-actions .debt-action-primary {
        min-height: 44px;
        border: 0;
        background: var(--primary);
        color: var(--primary-foreground);
        padding-inline: 18px;
        box-shadow: var(--shadow-md);
      }

      .debt-actions .danger {
        color: var(--danger);
        background: color-mix(in srgb, var(--danger) 8%, transparent);
        border-color: color-mix(in srgb, var(--danger) 18%, transparent);
      }

      .debt-action-menu {
        position: relative;
      }

      .debt-action-menu summary {
        min-height: 44px;
        border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
        border-radius: var(--radius-pill);
        background: color-mix(in srgb, var(--accent) 8%, transparent);
        color: var(--primary-hover);
        padding: 0 14px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font: 600  12px var(--font-ui);
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
        background: color-mix(in srgb, var(--accent) 14%, transparent);
        border-color: color-mix(in srgb, var(--accent) 34%, transparent);
        outline: none;
      }

      .debt-action-menu > div {
        position: absolute;
        z-index: 40;
        inset-inline-start: 0;
        bottom: calc(100% + 8px);
        min-width: 220px;
        border: 1px solid color-mix(in srgb, var(--accent) 18%, transparent);
        border-radius: var(--radius-card);
        background: var(--surface);
        padding: 8px;
        display: grid;
        gap: 6px;
        box-shadow: var(--shadow-md);
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
        border: 1px solid color-mix(in srgb, var(--accent) 12%, transparent);
        border-radius: var(--radius-card);
        background: var(--surface-muted);
        padding: 12px;
        display: grid;
        gap: 6px;
      }

      .insight-copy,
      .insight-alert {
        margin: 0;
        border-radius: var(--radius-card);
        padding: 12px;
        color: var(--foreground-muted);
        background: color-mix(in srgb, var(--accent) 8%, transparent);
        border: 1px solid color-mix(in srgb, var(--accent) 15%, transparent);
        font-size: 13px;
        font-weight: 600;
        line-height: 1.75;
      }

      .insight-alert {
        color: var(--warning);
        background: color-mix(in srgb, var(--warning) 12%, transparent);
        border-color: color-mix(in srgb, var(--warning) 24%, transparent);
      }

      .payments-list {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .payment-row span {
        color: var(--foreground);
        font-size: 13px;
        font-weight: 600;
      }

      .payment-row em {
        width: max-content;
        border-radius: var(--radius-pill);
        padding: 4px 9px;
        font-style: normal;
        font-size: 11px;
        font-weight: 600;
        color: var(--accent);
        background: color-mix(in srgb, var(--accent) 12%, transparent);
        border: 1px solid color-mix(in srgb, var(--accent) 18%, transparent);
      }

      .payment-row.overdue {
        border-color: color-mix(in srgb, var(--danger) 24%, transparent);
        background: color-mix(in srgb, var(--danger) 82%, transparent);
      }

      .payment-row.overdue em {
        color: var(--danger);
        border-color: color-mix(in srgb, var(--danger) 18%, transparent);
        background: color-mix(in srgb, var(--danger) 8%, transparent);
      }

      .payment-row.dueToday {
        border-color: color-mix(in srgb, var(--warning) 26%, transparent);
        background: color-mix(in srgb, var(--warning) 76%, transparent);
      }

      .payment-row.dueToday em {
        color: var(--warning);
        border-color: color-mix(in srgb, var(--warning) 22%, transparent);
        background: color-mix(in srgb, var(--warning) 12%, transparent);
      }

      .payments-empty {
        border: 1px dashed color-mix(in srgb, var(--accent) 24%, transparent);
        border-radius: var(--radius-card);
        padding: 18px;
        color: var(--foreground-muted);
        background: color-mix(in srgb, var(--primary) 38%, transparent);
        font-size: 13px;
        font-weight: 600;
        text-align: center;
      }

      .debts-empty,
      .debts-loading {
        border-radius: var(--radius-panel);
        padding: 32px;
        display: grid;
        justify-items: center;
        gap: 12px;
        text-align: center;
        color: var(--foreground-muted);
        font-weight: 600;
        line-height: 1.8;
      }

      .debts-empty svg {
        color: var(--accent);
      }

      .debts-empty h1,
      .debts-empty h2 {
        margin: 0;
        color: var(--foreground);
        font-weight: 600;
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
        background: var(--background-overlay);
        backdrop-filter: blur(12px);
        padding: clamp(14px, 3vw, 28px);
        overflow-y: auto;
        overscroll-behavior: contain;
      }

      .debt-modal {
        width: min(860px, 100%);
        max-height: min(90dvh, 940px);
        overflow-y: auto;
        border-radius: var(--radius-panel);
        padding: clamp(18px, 2.5vw, 28px);
        margin: auto;
        outline: none;
        box-shadow: var(--shadow-md);
        scrollbar-gutter: stable;
      }

      .debt-modal-head {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        align-items: flex-start;
        margin-bottom: 18px;
        padding-bottom: 16px;
        border-bottom: 1px solid color-mix(in srgb, var(--accent) 16%, transparent);
      }

      .debt-modal-head span {
        display: inline-flex;
        width: max-content;
        border: 1px solid color-mix(in srgb, var(--accent) 18%, transparent);
        border-radius: var(--radius-pill);
        background: color-mix(in srgb, var(--accent) 10%, transparent);
        color: var(--primary-hover);
        padding: 5px 10px;
        font-size: 12px;
        font-weight: 600;
      }

      .debt-modal-head h2 {
        margin: 10px 0 0;
        color: var(--foreground);
        font-size: clamp(24px, 3vw, 32px);
        font-weight: 600;
        line-height: 1.15;
      }

      .debt-modal-head p {
        margin: 8px 0 0;
        max-width: 560px;
        color: var(--foreground-secondary);
        font-size: 14px;
        font-weight: 600;
        line-height: 1.7;
      }

      .debt-modal-head > button {
        width: 44px;
        height: var(--control-h);
        border: 1px solid color-mix(in srgb, var(--primary) 18%, transparent);
        border-radius: var(--radius-card);
        background: color-mix(in srgb, var(--hero-foreground) 76%, transparent);
        color: var(--foreground);
        cursor: pointer;
        flex-shrink: 0;
        display: grid;
        place-items: center;
        box-shadow: var(--shadow-md);
        transition: transform .18s ease, background .18s ease, border-color .18s ease, box-shadow .18s ease;
      }

      .debt-modal-head > button:hover {
        background: color-mix(in srgb, var(--accent) 12%, transparent);
        border-color: color-mix(in srgb, var(--accent) 32%, transparent);
        box-shadow: var(--shadow-md);
      }

      .debt-modal-head > button:active {
        transform: translateY(1px);
      }

      .debt-validation-panel {
        display: flex;
        align-items: flex-start;
        gap: 11px;
        border: 1px solid color-mix(in srgb, var(--warning) 28%, transparent);
        border-radius: var(--radius-card);
        background: color-mix(in srgb, var(--warning) 10%, transparent);
        color: var(--warning);
        padding: 13px;
        margin-bottom: 16px;
      }

      .debt-save-alert {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        border: 1px solid color-mix(in srgb, var(--danger) 24%, transparent);
        border-radius: var(--radius-card);
        background: color-mix(in srgb, var(--danger) 8%, transparent);
        color: var(--danger);
        padding: 14px;
        margin-bottom: 16px;
      }

      .debt-save-alert svg {
        flex-shrink: 0;
        margin-top: 2px;
      }

      .debt-save-alert strong {
        display: block;
        color: var(--danger);
        font-size: 13px;
        font-weight: 600;
      }

      .debt-save-alert p {
        margin: 6px 0 0;
        color: var(--danger);
        font-size: 13px;
        font-weight: 600;
        line-height: 1.7;
      }

      .debt-validation-panel svg {
        flex-shrink: 0;
        margin-top: 2px;
      }

      .debt-validation-panel strong {
        display: block;
        font-size: 13px;
        font-weight: 600;
      }

      .debt-validation-panel ul {
        margin: 8px 0 0;
        padding-inline-start: 18px;
        display: grid;
        gap: 4px;
        color: var(--warning);
        font-size: 12px;
        font-weight: 600;
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
        background: var(--accent);
      }

      .debt-form-section span {
        color: var(--foreground);
        font-size: 13px;
        font-weight: 600;
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
        color: var(--foreground);
        font-size: 13px;
        font-weight: 600;
      }

      .debt-field > span i {
        color: var(--danger);
        font-style: normal;
        margin-inline-start: 2px;
      }

      .debt-field > span small {
        display: block;
        margin-top: 5px;
        color: var(--foreground-secondary);
        font-size: 11px;
        font-weight: 600;
        line-height: 1.6;
      }

      .debt-field input,
      .debt-field select,
      .debt-field textarea,
      .affix-input {
        width: 100%;
        min-width: 0;
        min-height: 52px;
        border: 1.5px solid color-mix(in srgb, var(--accent) 22%, transparent);
        border-radius: var(--radius-card);
        background: color-mix(in srgb, var(--hero-foreground) 92%, transparent);
        color: var(--foreground);
        padding: 0 14px;
        font: 600  14px var(--font-ui);
        outline: none;
        box-shadow: var(--shadow-md);
        transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
      }

      .debt-field input::placeholder,
      .debt-field textarea::placeholder {
        color: var(--foreground-muted);
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
        border-color: var(--accent);
        box-shadow: var(--focus-shadow);
        background: var(--surface);
      }

      .debt-field.invalid input,
      .debt-field.invalid select,
      .debt-field.invalid textarea,
      .debt-field.invalid .affix-input {
        border-color: color-mix(in srgb, var(--danger) 58%, transparent);
        box-shadow: var(--shadow-md);
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
        border-radius: var(--radius-pill);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--primary-soft);
        color: var(--accent);
        border: 1px solid color-mix(in srgb, var(--accent) 16%, transparent);
        font-style: normal;
        font-size: 12px;
        font-weight: 600;
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
        border: 1.5px solid color-mix(in srgb, var(--accent) 18%, transparent);
        border-radius: var(--radius-card);
        background: color-mix(in srgb, var(--primary) 44%, transparent);
        padding: 14px;
      }

      .toggle-row button {
        border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
        border-radius: var(--radius-pill);
        background: color-mix(in srgb, var(--accent) 12%, transparent);
        color: var(--primary-hover);
        padding: 8px 14px;
        font: 600  12px var(--font-ui);
        cursor: pointer;
      }

      .toggle-row button[aria-pressed="true"] {
        background: var(--primary);
        color: var(--primary-foreground);
      }

      .debt-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 22px;
        padding-top: 16px;
        border-top: 1px solid color-mix(in srgb, var(--accent) 16%, transparent);
        flex-wrap: wrap;
      }

      .debt-modal-actions .debts-primary {
        border: 0;
        color: var(--primary-foreground);
        width: auto;
        min-width: 190px;
        min-height: 50px;
        font-size: 14px;
        box-shadow: var(--shadow-md);
      }

      .debt-modal-actions .debts-primary:disabled,
      .debt-modal-actions .debts-primary[aria-disabled="true"] {
        background: color-mix(in srgb, var(--shadow-color) 8%, transparent);
        border: 1px solid color-mix(in srgb, var(--shadow-color) 12%, transparent);
        color: var(--foreground-muted);
        box-shadow: none;
        cursor: not-allowed;
        filter: none;
        transform: none;
        opacity: .78;
      }

      .debt-secondary-action {
        min-height: 50px;
        border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
        border-radius: var(--radius-pill);
        background: color-mix(in srgb, var(--hero-foreground) 86%, transparent);
        color: var(--foreground);
        padding: 0 20px;
        font: 600 13px var(--font-ui);
        cursor: pointer;
        transition: background .18s ease, border-color .18s ease, transform .18s ease;
      }

      .debt-secondary-action:hover {
        background: color-mix(in srgb, var(--accent) 10%, transparent);
        border-color: color-mix(in srgb, var(--accent) 35%, transparent);
      }

      .debt-secondary-action:active {
        transform: translateY(1px);
      }

      .debt-modal-head > button:focus-visible,
      .debt-modal-actions button:focus-visible,
      .debts-secondary-hero:focus-visible,
      .toggle-row button:focus-visible {
        outline: none;
        border-color: var(--accent);
        box-shadow: var(--focus-shadow);
      }

      .debt-form-helper {
        margin: 14px 0 0;
        color: var(--foreground-muted);
        font-size: 12px;
        font-weight: 500;
      }

      .debt-summary-card strong,
      .debt-metric strong,
      .payment-row strong,
      .strategy-stat strong,
      .strategy-debt-detail b,
      .affix-input input,
      .debt-field input[inputmode="decimal"] {
        font-family: var(--font-data);
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
          border-radius: var(--radius-panel);
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
          border-radius: var(--radius-panel);
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
          border-radius: var(--radius-panel);
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
        border-color: color-mix(in srgb, var(--accent) 30%, transparent);
        background: color-mix(in srgb, var(--accent) 8%, transparent);
      }
      .debt-metric--highlight b {
        color: var(--primary-hover);
      }

      /* ─── Strategy Panel ─────────────────────────────────────────── */
      .strategy-panel {
        border-radius: var(--radius-panel);
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
        color: var(--foreground);
        font-size: clamp(20px, 2.2vw, 26px);
        font-weight: 600;
        line-height: 1.2;
      }

      .strategy-panel-head p {
        margin: 0;
        max-width: 540px;
        color: var(--foreground-muted);
        font-size: 13px;
        font-weight: 500;
        line-height: 1.75;
      }

      .strategy-extra-input {
        display: grid;
        gap: 7px;
        min-width: 200px;
        flex-shrink: 0;
      }

      .strategy-extra-input > span {
        color: var(--foreground-muted);
        font-size: 12px;
        font-weight: 600;
      }

      .strategy-warning {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        border: 1px solid color-mix(in srgb, var(--warning) 24%, transparent);
        border-radius: var(--radius-card);
        background: color-mix(in srgb, var(--warning) 10%, transparent);
        color: var(--warning);
        padding: 12px 14px;
        font-size: 13px;
        font-weight: 600;
        line-height: 1.7;
      }

      .strategy-warning::before {
        content: "!";
        width: 24px;
        height: 24px;
        border-radius: var(--radius-pill);
        display: inline-grid;
        place-items: center;
        flex: 0 0 auto;
        color: var(--primary-foreground);
        background: var(--warning);
        font-size: 13px;
        font-weight: 600;
      }

      .strategy-warning span,
      .strategy-warning strong {
        display: block;
      }

      .strategy-warning strong {
        color: var(--warning);
        margin-top: 2px;
      }

      .strategy-cols {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }

      .strategy-card {
        border-radius: var(--radius-panel);
        padding: 20px;
        display: grid;
        gap: 16px;
        border: 1px solid color-mix(in srgb, var(--accent) 14%, transparent);
        background: var(--surface-muted);
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
        border-radius: var(--radius-pill);
        padding: 6px 12px;
        font-size: 13px;
        font-weight: 600;
      }

      .snowball-badge {
        background: color-mix(in srgb, var(--info) 12%, transparent);
        border: 1px solid color-mix(in srgb, var(--info) 28%, transparent);
        color: var(--info);
      }

      .avalanche-badge {
        background: color-mix(in srgb, var(--info) 12%, transparent);
        border: 1px solid color-mix(in srgb, var(--info) 28%, transparent);
        color: var(--info);
      }

      .strategy-tag {
        border-radius: var(--radius-pill);
        padding: 4px 10px;
        font-size: 11px;
        font-weight: 600;
        background: color-mix(in srgb, var(--foreground-muted) 12%, transparent);
        border: 1px solid color-mix(in srgb, var(--foreground-muted) 20%, transparent);
        color: var(--foreground-muted);
      }

      .strategy-tag.recommended {
        background: color-mix(in srgb, var(--success) 12%, transparent);
        border-color: color-mix(in srgb, var(--success) 28%, transparent);
        color: var(--success);
      }

      .strategy-desc {
        margin: 0;
        color: var(--foreground-muted);
        font-size: 13px;
        font-weight: 500;
        line-height: 1.75;
      }

      .strategy-stats {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .strategy-stat {
        border-radius: var(--radius-card);
        padding: 12px;
        display: grid;
        gap: 6px;
        border: 1px solid color-mix(in srgb, var(--accent) 12%, transparent);
        background: var(--background);
      }

      .strategy-stat.highlight {
        border-color: color-mix(in srgb, var(--success) 24%, transparent);
        background: color-mix(in srgb, var(--success) 6%, transparent);
      }

      .strategy-stat small {
        display: block;
        color: var(--foreground-muted);
        font-size: 11px;
        font-weight: 600;
      }

      .strategy-stat strong {
        display: block;
        color: var(--foreground);
        font-size: 15px;
        font-weight: 600;
        line-height: 1.3;
        overflow-wrap: anywhere;
      }

      .strategy-stat strong.green {
        color: var(--success);
      }

      .strategy-order-label {
        color: var(--foreground-muted);
        font-size: 12px;
        font-weight: 600;
        padding-bottom: 4px;
        border-bottom: 1px solid color-mix(in srgb, var(--accent) 14%, transparent);
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
        border-radius: var(--radius-control);
        padding: 10px 12px;
        border: 1px solid color-mix(in srgb, var(--accent) 10%, transparent);
        background: var(--background);
      }

      .strategy-rank {
        width: 26px;
        height: 26px;
        border-radius: var(--radius-pill);
        display: grid;
        place-items: center;
        font-size: 12px;
        font-weight: 600;
        background: color-mix(in srgb, var(--accent) 14%, transparent);
        color: var(--primary-hover);
        flex-shrink: 0;
      }

      .strategy-debt-name {
        flex: 1;
        color: var(--foreground);
        font-size: 13px;
        font-weight: 600;
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
        color: var(--foreground);
        font-size: 13px;
        font-weight: 600;
      }

      .strategy-debt-detail small {
        color: var(--foreground-muted);
        font-size: 11px;
        font-weight: 500;
      }

      .strategy-banner {
        display: flex;
        align-items: center;
        gap: 12px;
        border-radius: var(--radius-card);
        padding: 14px 16px;
        background: color-mix(in srgb, var(--success) 9%, transparent);
        border: 1px solid color-mix(in srgb, var(--success) 24%, transparent);
        color: var(--success);
        font-size: 13px;
        font-weight: 600;
        line-height: 1.65;
      }

      .strategy-banner svg {
        flex-shrink: 0;
        color: var(--success);
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
