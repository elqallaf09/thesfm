'use client';
import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { usePrivateResource } from '@/components/platform/usePrivateResource';
import { platformCopy, platformLanguage } from '@/components/platform/copy';
import styles from '@/components/platform/platform.module.css';

type Total = { kind: 'income' | 'expense'; currency: string | null; amount: string; count: number };
type Close = { month: string; closed_at: string; totals: Total[] };
type Event = { id: string; month: string; action: string; reason: string | null; created_at: string };
async function load(userId: string) {
 const [closes, events] = await Promise.all([
  supabase.from('finance_month_closes').select('month,closed_at,totals:snapshot->totals').eq('user_id', userId).order('month', { ascending: false }).limit(120),
  supabase.from('finance_month_events').select('id,month,action,reason,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
 ]);
 if (closes.error || events.error) throw new Error('LOAD_FAILED');
 return { closes: closes.data as unknown as Close[], events: events.data as Event[] };
}
const copy = {
 ar: { title: 'إقفال الشهر', note: 'يقفل سجلات الدخل والمصروفات المؤرخة في الشهر المحدد، ويحفظ نسخة منها دون حذف أو تصفير. تُستثنى قوالب الدخل المتكرر؛ تشمل المجاميع الدخل المستلم فقط، وتبقى كل عملة مستقلة. سجلات الأعمال المنفصلة والديون والمدخرات خارج هذا الإقفال.', month: 'شهر مكتمل', close: 'إقفال وحفظ نسخة', reopen: 'إعادة فتح', reason: 'سبب إعادة الفتح (5–500 حرف)', confirm: 'أؤكد مراجعة سجلات الشهر وأفهم أن تعديلها سيتطلب إعادة فتحه.', history: 'آخر 50 عملية', income: 'دخل مستلم', expense: 'مصروف', currency: 'العملة', amount: 'المبلغ', unknown: 'عملة غير محددة', locked: 'الأشهر المقفلة — آخر 120 شهر', count: 'عدد السجلات' },
 en: { title: 'Month close', note: 'Locks dated income and expense records in the selected month and preserves a snapshot without deleting or resetting data. Recurring templates are excluded; totals include received income only and keep currencies separate. Separate business records, debts and savings are outside this close.', month: 'Completed month', close: 'Close and save snapshot', reopen: 'Reopen', reason: 'Reason for reopening (5–500 characters)', confirm: 'I reviewed this month and understand that editing its records requires reopening it.', history: 'Last 50 actions', income: 'Received income', expense: 'Expense', currency: 'Currency', amount: 'Amount', unknown: 'Unspecified currency', locked: 'Closed months — latest 120', count: 'Record count' },
 fr: { title: 'Clôture mensuelle', note: 'Verrouille les revenus et dépenses datés du mois et conserve un instantané sans suppression ni remise à zéro. Les modèles récurrents sont exclus ; seuls les revenus reçus sont totalisés, par devise. Les registres professionnels séparés, dettes et épargne sont exclus.', month: 'Mois terminé', close: 'Clôturer et conserver', reopen: 'Rouvrir', reason: 'Motif de réouverture (5–500 caractères)', confirm: 'J’ai vérifié ce mois et comprends que toute modification nécessite sa réouverture.', history: '50 dernières opérations', income: 'Revenu reçu', expense: 'Dépense', currency: 'Devise', amount: 'Montant', unknown: 'Devise non précisée', locked: 'Mois clôturés — 120 derniers', count: 'Nombre de lignes' },
};
export default function MonthClosePage() {
 const { lang } = useLanguage(); const language = platformLanguage(lang); const text = copy[language]; const common = platformCopy[language];
 const { userId, data, loading, error, refresh } = usePrivateResource(load);
 const [month, setMonth] = useState(''); const [confirmed, setConfirmed] = useState(false);
 const [target, setTarget] = useState<string | null>(null); const [reason, setReason] = useState('');
 const [busy, setBusy] = useState(false); const [failed, setFailed] = useState(false); const [saved, setSaved] = useState(false);
 async function submit(reopen: boolean) {
  if (!userId || busy || (reopen ? reason.trim().length < 5 || !target : !confirmed || !/^\d{4}-\d{2}$/.test(month))) return;
  setBusy(true); setFailed(false); setSaved(false);
  try {
   const result = reopen ? await supabase.rpc('finance_reopen_month', { p_month: target, p_reason: reason.trim() })
    : await supabase.rpc('finance_close_month', { p_month: `${month}-01` });
   if (result.error) throw result.error;
   setTarget(null); setReason(''); setConfirmed(false); setSaved(true); await refresh();
  } catch { setFailed(true); } finally { setBusy(false); }
 }
 return <WorkspacePageContainer className={styles.page}>
  <h1>{text.title}</h1><p>{text.note}</p>
  {!userId && !loading ? <p>{common.login}</p> : null}
  {loading ? <p role="status">{common.loading}</p> : null}
  {error || failed ? <div role="alert" className={styles.error}>{common.error} <Button variant="outline" disabled={busy} onClick={() => void refresh()}>{common.retry}</Button></div> : null}
  {saved ? <p role="status">{common.done}</p> : null}
  {userId ? <form className={styles.card} onSubmit={event => { event.preventDefault(); void submit(false); }}>
   <label className={styles.field}>{text.month}<input type="month" required value={month} onChange={event => { setMonth(event.target.value); setConfirmed(false); }} className={styles.input} disabled={busy} /></label>
   <label className={styles.row}><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={busy} />{text.confirm}</label>
   <Button type="submit" disabled={busy || !confirmed || !month}>{busy ? common.busy : text.close}</Button>
  </form> : null}
  {data ? <section className={styles.card}><h2>{text.locked}</h2>{!data.closes.length ? <p>{common.empty}</p> : data.closes.map(close => <article className={styles.card} key={close.month}>
   <div className={styles.row}><h3 dir="ltr">{close.month.slice(0,7)}</h3><Button variant="outline" disabled={busy} onClick={() => { setTarget(close.month); setReason(''); }}>{text.reopen}</Button></div>
   <div className={styles.scroll}><table className={styles.table}><thead><tr><th>{text.currency}</th><th>{text.income} / {text.expense}</th><th>{text.amount}</th><th>{text.count}</th></tr></thead><tbody>{close.totals.map((total,index) => <tr key={index}><td>{total.currency || text.unknown}</td><td>{text[total.kind]}</td><td dir="ltr">{total.amount}</td><td dir="ltr">{total.count}</td></tr>)}</tbody></table></div>
   {target === close.month ? <form onSubmit={event => { event.preventDefault(); void submit(true); }} className={styles.field}><label className={styles.field}>{text.reason}<textarea required minLength={5} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} className={styles.input} /></label><div className={styles.row}><Button disabled={busy || reason.trim().length < 5}>{text.reopen}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setTarget(null)}>{common.cancel}</Button></div></form> : null}
  </article>)}</section> : null}
  {data ? <section className={styles.card}><h2>{text.history}</h2>{data.events.map(event => <p key={event.id}><span dir="ltr">{event.month.slice(0,7)} · {event.created_at.slice(0,19).replace('T',' ')} UTC</span> — {event.action === 'close' ? text.close : text.reopen}{event.reason ? ` — ${event.reason}` : ''}</p>)}</section> : null}
 </WorkspacePageContainer>;
}
