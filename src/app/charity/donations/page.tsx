'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  HandCoins,
  Info,
  ReceiptText,
  Trash2,
} from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { financialCurrencyLabel, formatFinancialCurrency, formatFinancialNumber } from '@/lib/financialDisplay';
import { normalizeDigits } from '@/lib/locale';
import {
  buildMonthOptions,
  currentYM,
  labelFromYM,
  LEGACY_CHARITY_PREFIX,
  parseLegacyCharityRow,
  type CharityRecord,
  type LegacyCharityRow,
} from '../_data';
import { CHARITY_TEXT } from '../_text';
import styles from '../charity.module.css';

type Message = { type: 'success' | 'error'; text: string };

export default function DonationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { dir, lang } = useLanguage();
  const tr = CHARITY_TEXT[lang];
  const [records, setRecords] = useState<CharityRecord[]>([]);
  const [month, setMonth] = useState(currentYM());
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const monthOptions = useMemo(() => {
    const available = new Set(buildMonthOptions(lang).map(option => option.value));
    records.forEach(record => {
      if (/^\d{4}-(0[1-9]|1[0-2])$/.test(record.month)) available.add(record.month);
    });
    return [...available]
      .sort((a, b) => b.localeCompare(a))
      .map(value => ({ value, label: labelFromYM(value, lang) }));
  }, [lang, records]);
  const selectedMonthLabel = labelFromYM(month, lang);
  const currencyLabel = financialCurrencyLabel('KWD', lang);
  const money = useCallback((value: unknown) => formatFinancialCurrency(value, 'KWD', lang), [lang]);
  const number = useCallback((value: unknown) => formatFinancialNumber(value, lang, { maximumFractionDigits: 0 }), [lang]);

  const load = useCallback(async () => {
    if (!user) {
      setRecords([]);
      setReady(true);
      return;
    }

    setReady(false);
    const { data, error } = await supabase
      .from('expense_items')
      .select('id,user_id,name,amount,created_at')
      .eq('user_id', user.id)
      .like('name', `${LEGACY_CHARITY_PREFIX}:%`)
      .order('created_at', { ascending: false });

    if (error) {
      setMessage({ type: 'error', text: `${tr.loadError}: ${error.message}` });
      setReady(true);
      return;
    }

    setRecords(((data ?? []) as LegacyCharityRow[]).map(row => parseLegacyCharityRow(row, tr.defaultDonationName)));
    setReady(true);
  }, [tr.defaultDonationName, tr.loadError, user]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || saving) return;

    const parsedAmount = Number.parseFloat(normalizeDigits(amount).replace(/[^\d.]/g, ''));
    if (!parsedAmount || parsedAmount <= 0) {
      setMessage({ type: 'error', text: tr.invalidAmount });
      return;
    }
    if (!name.trim()) {
      setMessage({ type: 'error', text: tr.invalidName });
      return;
    }

    setSaving(true);
    setMessage(null);
    const rowName = `${LEGACY_CHARITY_PREFIX}:${month}:${name.trim()}`;

    try {
      const { error } = await supabase.from('expense_items').insert({
        user_id: user.id,
        name: rowName,
        amount: parsedAmount,
      });

      if (error) {
        setMessage({ type: 'error', text: `${tr.saveError}: ${error.message}` });
        return;
      }

      setAmount('');
      setName('');
      setMessage({ type: 'success', text: tr.saveSuccess });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (deleting || !user) return;
    setDeleting(id);
    const { error } = await supabase.from('expense_items').delete().eq('id', id).eq('user_id', user.id);
    if (error) {
      setMessage({ type: 'error', text: `${tr.deleteError}: ${error.message}` });
    } else {
      setRecords(current => current.filter(record => record.id !== id));
      setMessage({ type: 'success', text: tr.deleteSuccess });
    }
    setDeleting(null);
  }

  const currentYear = String(new Date().getFullYear());
  const currentMonth = currentYM();
  const monthRecords = records.filter(record => record.month === month);
  const monthTotal = monthRecords.reduce((total, record) => total + record.amount, 0);
  const currentMonthTotal = records.filter(record => record.month === currentMonth).reduce((total, record) => total + record.amount, 0);
  const yearTotal = records.filter(record => record.month.startsWith(currentYear)).reduce((total, record) => total + record.amount, 0);
  const allTotal = records.reduce((total, record) => total + record.amount, 0);
  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const recordedDate = (value?: string | null) => {
    if (!value) return tr.unavailable;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return tr.unavailable;
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  };

  if (authLoading || !ready) {
    return (
      <div dir={dir} lang={lang}>
        <DashboardPageShell ariaLabel={tr.donationsAria} className={styles.shell} contentClassName={styles.shellContent}>
          <div className={styles.page} dir={dir} lang={lang} data-charity-experience="donations">
            <div className={styles.loadingState} role="status" aria-live="polite">
              <span className={styles.loadingMark} aria-hidden="true"><HandCoins size={28} /></span>
              <span>{tr.loading}</span>
            </div>
          </div>
        </DashboardPageShell>
      </div>
    );
  }

  return (
    <div dir={dir} lang={lang}>
      <DashboardPageShell ariaLabel={tr.donationsAria} className={styles.shell} contentClassName={styles.shellContent}>
        <div className={styles.page} dir={dir} lang={lang} data-charity-experience="donations">
          <header className={styles.donationHero}>
            <div className={styles.donationHeroTop}>
              <Link href="/charity" className={styles.backLink}><ArrowLeft aria-hidden="true" size={17} />{tr.backToCenter}</Link>
            </div>
            <div className={styles.donationHeaderCopy}>
              <span className={styles.eyebrow}>{tr.donationEyebrow}</span>
              <h1>{tr.donationsTitle}</h1>
              <p>{tr.donationsSubtitle}</p>
            </div>
            <div className={styles.workflowNote}>
              <ShieldNote />
              <span>{tr.newDonationSubtitle}</span>
            </div>
          </header>

          <section className={styles.donationSummaryGrid} aria-label={tr.donationsTitle}>
            <SummaryCard icon={CalendarDays} label={tr.thisMonth} value={money(currentMonthTotal)} />
            <SummaryCard icon={HandCoins} label={tr.thisYear} value={money(yearTotal)} />
            <SummaryCard icon={ReceiptText} label={tr.allTime} value={money(allTotal)} />
            <SummaryCard icon={CheckCircle2} label={tr.paymentCount} value={number(records.length)} />
          </section>

          {message && (
            <div className={message.type === 'error' ? styles.errorMessage : styles.successMessage} role={message.type === 'error' ? 'alert' : 'status'} aria-live="polite">
              {message.type === 'error' ? <Info aria-hidden="true" size={19} /> : <CheckCircle2 aria-hidden="true" size={19} />}
              <span>{message.text}</span>
            </div>
          )}

          <div className={styles.donationWorkspace}>
            <section className={`${styles.panel} ${styles.formPanel}`} aria-labelledby="new-donation-title">
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.sectionKicker}>{tr.donationEyebrow}</span>
                  <h2 id="new-donation-title">{tr.newDonation}</h2>
                  <p>{tr.newDonationSubtitle}</p>
                </div>
              </div>

              <form className={styles.donationForm} onSubmit={save} noValidate>
                <div className={styles.field}>
                  <label htmlFor="donation-month">{tr.month}</label>
                  <select id="donation-month" value={month} onChange={event => setMonth(event.target.value)} disabled={saving}>
                    {monthOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="donation-amount">{tr.amount}</label>
                  <div className={styles.inputWithSuffix}>
                    <input
                      id="donation-amount"
                      value={amount}
                      onChange={event => setAmount(event.target.value)}
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder={tr.amountPlaceholder}
                      aria-describedby="donation-currency"
                      disabled={saving}
                    />
                    <span id="donation-currency">{currencyLabel}</span>
                  </div>
                </div>
                <div className={styles.field}>
                  <label htmlFor="donation-purpose">{tr.purpose}</label>
                  <input
                    id="donation-purpose"
                    value={name}
                    onChange={event => setName(event.target.value)}
                    autoComplete="off"
                    placeholder={tr.purposePlaceholder}
                    disabled={saving}
                  />
                </div>
                <button className={styles.saveButton} type="submit" disabled={saving || !user}>
                  <HandCoins aria-hidden="true" size={19} />
                  {saving ? tr.saving : tr.saveDonation}
                </button>
              </form>

              <aside className={styles.storageNote}>
                <Info aria-hidden="true" size={19} />
                <div><strong>{tr.storageNoteTitle}</strong><p>{tr.storageNote}</p></div>
              </aside>
            </section>

            <section className={`${styles.panel} ${styles.historyPanel}`} aria-labelledby="donation-history-title">
              <div className={styles.historyHeader}>
                <div>
                  <span className={styles.sectionKicker}>{selectedMonthLabel}</span>
                  <h2 id="donation-history-title">{tr.historyTitle}</h2>
                  <p>{tr.historySubtitle}</p>
                </div>
                <div className={styles.monthTotal}>
                  <span>{tr.selectedMonthTotal}</span>
                  <strong>{money(monthTotal)}</strong>
                </div>
              </div>

              {monthRecords.length > 0 ? (
                <ul className={styles.donationHistoryList}>
                  {monthRecords.map(record => (
                    <li key={record.id}>
                      <span className={styles.historyIcon}><HandCoins aria-hidden="true" size={19} /></span>
                      <div className={styles.historyCopy}>
                        <strong>{record.name}</strong>
                        <span>{tr.recordedOn}: {recordedDate(record.created_at)}</span>
                      </div>
                      <strong className={styles.historyAmount}>{money(record.amount)}</strong>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => void remove(record.id)}
                        disabled={Boolean(deleting)}
                        aria-label={`${tr.deleteDonation}: ${record.name}`}
                      >
                        <Trash2 aria-hidden="true" size={17} />
                        <span>{deleting === record.id ? tr.deleting : tr.deleteDonation}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={styles.historyEmpty}>
                  <span><ReceiptText aria-hidden="true" size={23} /></span>
                  <strong>{tr.noMonthPaymentsTitle}</strong>
                  <p>{tr.noMonthPaymentsBody}</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </DashboardPageShell>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <article className={styles.donationSummaryCard}>
      <span><Icon aria-hidden="true" size={20} /></span>
      <div><small>{label}</small><strong>{value}</strong></div>
    </article>
  );
}

function ShieldNote() {
  return <Info aria-hidden="true" size={20} />;
}
