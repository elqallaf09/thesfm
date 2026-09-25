'use client';
import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { usePrivateResource } from '@/components/platform/usePrivateResource';
import { platformCopy, platformLanguage } from '@/components/platform/copy';
import styles from '@/components/platform/platform.module.css';
type Report = { id: string; reason: string; body: string; display_name: string };
async function load() {
 const result = await supabase.rpc('sfmer_moderate', { p_action: 'list' });
 if (result.error) throw result.error;
 return result.data as Report[];
}
const copy = {
 ar: { title: 'مراجعة بلاغات SFMer', note: 'للمشرف الرئيسي. تُعرض أقدم 50 حالة معلّقة، دون كشف هوية المبلّغ.', hide: 'إخفاء المنشور للجميع', dismiss: 'إغلاق البلاغ دون إخفاء', reason: 'سبب البلاغ' },
 en: { title: 'SFMer report review', note: 'Super administrator access. Shows the oldest 50 pending reports without identifying reporters.', hide: 'Hide post for everyone', dismiss: 'Dismiss report', reason: 'Report reason' },
 fr: { title: 'Signalements SFMer', note: 'Accès super administrateur. Les 50 plus anciens signalements en attente, sans identité des auteurs du signalement.', hide: 'Masquer pour tous', dismiss: 'Classer le signalement', reason: 'Motif' },
};
export default function CommunityReview() {
 const { lang } = useLanguage(); const language = platformLanguage(lang); const text = copy[language]; const common = platformCopy[language];
 const { data, loading, error, refresh } = usePrivateResource(load);
 const [busy, setBusy] = useState(false); const [failed, setFailed] = useState(false);
 async function review(id: string, action: 'hide' | 'dismiss') {
  if (busy) return; setBusy(true); setFailed(false);
  try {
   const result = await supabase.rpc('sfmer_moderate', { p_action: action, p_report: id });
   if (result.error) throw result.error;
   await refresh();
  } catch { setFailed(true); } finally { setBusy(false); }
 }
 return <WorkspacePageContainer className={styles.page} variant="reading"><h1>{text.title}</h1><p>{text.note}</p>
  {loading ? <p role="status">{common.loading}</p> : null}
  {failed || error ? <p role="alert">{common.error}</p> : null}
  <Button variant="outline" disabled={busy} onClick={() => void refresh()}>{common.refresh}</Button>
  {data?.length === 0 ? <p>{common.empty}</p> : null}
  {data?.map(report => <article key={report.id} className={styles.card}><h2 dir="auto">{report.display_name}</h2><p className={styles.text} dir="auto">{report.body}</p><p className={styles.text}>{text.reason}: {report.reason}</p><div className={styles.row}><Button disabled={busy} onClick={() => void review(report.id,'hide')}>{text.hide}</Button><Button disabled={busy} variant="outline" onClick={() => void review(report.id,'dismiss')}>{text.dismiss}</Button></div></article>)}
 </WorkspacePageContainer>;
}
