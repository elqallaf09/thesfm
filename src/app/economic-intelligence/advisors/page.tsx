'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/lib/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { usePrivateResource } from '@/components/platform/usePrivateResource';
import { ADVISOR_CAPABILITIES, advisorRequestSchema, type AdvisorReport, type AdvisorRequest } from '@/domain/economic-intelligence/advisorCapabilities';
import { advisorCopy, advisorLabels, advisorTerm } from '@/components/platform/advisorCopy';
import styles from '@/components/platform/platform.module.css';
type Saved = { id: string; created_at: string; report: AdvisorReport };
async function loadPlans(): Promise<Saved[]> { const response = await fetch('/api/economic-intelligence/advisor-plans', { cache:'no-store' }); if (!response.ok) throw new Error('LOAD_FAILED'); return (await response.json()).plans; }
export default function AdvisorPage() {
 const { user } = useAuth();
 return <AdvisorWorkspace key={user?.id ?? 'signed-out'} />;
}
function AdvisorWorkspace() {
 const { lang } = useLanguage(); const language = lang === 'en' || lang === 'fr' ? lang : 'ar'; const text = advisorCopy[language];
 const { currency } = useCurrency();
 const { userId, data, error, refresh } = usePrivateResource(loadPlans);
 const [input, setInput] = useState<AdvisorRequest>(() => advisorRequestSchema.parse({ capability:'coach',currency:currency || 'KWD',month:new Date().toISOString().slice(0,7) }));
 const [report, setReport] = useState<AdvisorReport | null>(null); const [previous, setPrevious] = useState('');
 const [busy, setBusy] = useState(false); const [failed, setFailed] = useState(false); const [explanation, setExplanation] = useState('');
 const alive = useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const term = (key: string) => advisorTerm(key,language);
 const format = (value: number | null) => value === null ? text.unknown : new Intl.NumberFormat(`${language}-u-nu-latn`,{ maximumFractionDigits:3 }).format(value);
 const baseline = data?.find(plan => plan.id === previous)?.report;
 const comparable = report && baseline && report.currency === baseline.currency && report.capability === baseline.capability && report.methodology === baseline.methodology;
 async function run() {
  if (busy || !userId) return; setBusy(true); setFailed(false); setExplanation('');
  try { const response = await fetch('/api/economic-intelligence/advisor-plans',{ method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,save:true}) });
   if (!response.ok) throw new Error('FAILED'); const result = await response.json(); if (alive.current) { setReport(result.report); setPrevious(''); await refresh(); }
  } catch { setFailed(true); } finally { setBusy(false); }
 }
 async function explain() {
  if (!report || busy) return; setBusy(true); setExplanation('');
  try { const response = await fetch('/api/economic-intelligence/advisor-chat',{ method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ advisor:['portfolio','investment'].includes(report.capability)?'investment':'finance',currency:report.currency,locale:language,messages:[{role:'user',content:text.ask}],plan:report.assumptions }) });
   const payload = await response.json(); setExplanation(response.ok ? payload.text : text.aiError);
  } catch { setExplanation(text.aiError); } finally { setBusy(false); }
 }
 const fields = input.capability === 'retirement' ? ['horizonMonths','monthlyContribution','annualReturn','inflation','annualFees','retirementYears','retirementSpending'] as const
  : input.capability === 'planner' ? ['horizonMonths','monthlyContribution','annualReturn','annualFees'] as const : input.capability === 'debt' ? ['extraDebtPayment'] as const : ['reserveMonths'] as const;
 return <WorkspacePageContainer className={styles.page}><h1>{text.title}</h1><p>{text.note}</p>
  {!userId ? <Link href="/login">{text.login}</Link> : null}
  <form className={styles.card} onSubmit={event=>{event.preventDefault();void run();}}>
   <label className={styles.field}>{text.title}<select className={styles.input} value={input.capability} onChange={e=>setInput({...input,capability:e.target.value as AdvisorRequest['capability']})}>{ADVISOR_CAPABILITIES.map((id,i)=><option key={id} value={id}>{advisorLabels[language][i]}</option>)}</select></label>
   <div className={styles.row}><label className={styles.field}>{text.month}<input type="month" required className={styles.input} value={input.month} onChange={e=>setInput({...input,month:e.target.value})}/></label><label className={styles.field}>{text.currency}<input required pattern="[A-Z]{3}" maxLength={3} dir="ltr" className={styles.input} value={input.currency} onChange={e=>setInput({...input,currency:e.target.value.toUpperCase()})}/></label></div>
   <fieldset className={styles.field}><legend>{text.assumptions}</legend><div className={styles.grid}>{fields.map(key=><label key={key} className={styles.field}>{text[key]}<input type="number" required step={key==='horizonMonths'||key==='retirementYears'?'1':'any'} min={key==='annualReturn'?-50:key==='inflation'?-10:key==='horizonMonths'||key==='retirementYears'?1:0} max={key==='horizonMonths'?600:key==='retirementYears'?60:key==='reserveMonths'?24:key==='annualReturn'?50:key==='annualFees'?10:key==='inflation'?30:1e9} className={styles.input} value={input[key]} onChange={e=>setInput({...input,[key]:Number(e.target.value)})}/></label>)}</div></fieldset>
   <Button disabled={busy || !userId}>{busy?text.working:text.run}</Button>
  </form>
  {failed || error ? <p role="alert">{text.error}</p> : null}
  {report ? <section className={styles.card} aria-live="polite"><h2>{advisorLabels[language][ADVISOR_CAPABILITIES.indexOf(report.capability)]} · <span dir="ltr">{report.month} / {report.currency}</span></h2>
   <label className={styles.field}>{text.compare}<select className={styles.input} value={previous} onChange={e=>setPrevious(e.target.value)}><option value="">—</option>{data?.filter(p=>p.report.capability===report.capability&&p.report.currency===report.currency).map(p=><option key={p.id} value={p.id}>{p.created_at.slice(0,19).replace('T',' ')} UTC · {p.report.month}</option>)}</select></label>
   <div className={styles.scroll}><table className={styles.table}><caption>{text.result}</caption><thead><tr><th>{text.item}</th><th>{text.current}</th>{comparable?<><th>{text.previous}</th><th>{text.change}</th></>:null}</tr></thead><tbody>{report.metrics.map(m=>{const old=baseline?.metrics.find(x=>x.key===m.key);return <tr key={m.key}><th scope="row">{term(m.key)}</th><td dir="ltr">{format(m.value)} {m.unit==='money'?report.currency:m.unit==='percent'?'%':''}</td>{comparable?<><td dir="ltr">{format(old?.value??null)}</td><td dir="ltr">{format(old?.value!=null&&m.value!=null?m.value-old.value:null)}</td></>:null}</tr>;})}</tbody></table></div>
   {report.allocation.length?<div className={styles.scroll}><table className={styles.table}><caption>{text.allocation}</caption><thead><tr><th>{text.item}</th><th>{text.amount}</th><th>{text.percent}</th></tr></thead><tbody>{report.allocation.map((r,i)=><tr key={i}><th scope="row">{term(r.name)}</th><td dir="ltr">{format(r.amount)} {report.currency}</td><td dir="ltr">{format(r.percent)}</td></tr>)}</tbody></table></div>:null}
   {report.schedule.length?<details><summary>{text.plan}</summary><div className={styles.scroll}><table className={styles.table}><thead><tr><th>{text.month}</th><th>{text.amount}</th></tr></thead><tbody>{report.schedule.map(p=><tr key={p.month}><td>{p.month}</td><td dir="ltr">{format(p.value)} {report.currency}</td></tr>)}</tbody></table></div></details>:null}
   {report.missing.length?<div><h3>{text.missing}</h3><ul>{report.missing.map(k=><li key={k}>{term(k)}</li>)}</ul></div>:null}
   <div><h3>{text.limits}</h3><ul>{report.warnings.map(k=><li key={k}>{term(k)}</li>)}</ul></div>
   <div className={styles.row}>{report.actions.map(a=><Link href={a.href} key={a.code}>{term(a.code)}</Link>)}</div>
   <Button disabled={busy} onClick={()=>void explain()}>{text.explain}</Button>{explanation?<p className={styles.text}>{explanation}</p>:null}
  </section>:null}
  <section className={styles.card}><h2>{text.history}</h2>{data?.length===0?<p>{text.empty}</p>:null}{data?.map(p=><div className={styles.row} key={p.id}><Button variant="outline" onClick={()=>{setReport(p.report);setInput({...p.report.assumptions,save:false});setExplanation('');setPrevious('');}}>{advisorLabels[language][ADVISOR_CAPABILITIES.indexOf(p.report.capability)]} · {p.report.month} · {p.created_at.slice(0,19).replace('T',' ')} UTC</Button><Button variant="outline" onClick={async()=>{const result=await supabase.from('sfm_advisor_plans').delete().eq('id',p.id).eq('user_id',userId!);if(result.error)setFailed(true);else await refresh();}}>{text.delete}</Button></div>)}</section>
 </WorkspacePageContainer>;
}
