'use client';

import { FormEvent, useState } from 'react';
import { CalendarSearch, ExternalLink, Filter, Search, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import type { GoldResearchSearchResult } from '@/lib/gold-intelligence/search';
import styles from './GoldResearchSearch.module.css';

type Locale = 'ar' | 'en' | 'fr';
type ApiResponse = { success?: boolean; result?: GoldResearchSearchResult; code?: string };

const COPY = {
  title:{ar:'محرك بحث الذهب العالمي',en:'Gold Global Research Search',fr:'Recherche mondiale sur l’or'},
  body:{ar:'ابحث في الأخبار الاقتصادية والأحداث العالمية ومصادر الفيدرالي والمواد المفهرسة للبيت الأبيض والتقويم الاقتصادي من مكان واحد.',en:'Search market news, global events, Federal Reserve sources, indexed White House material and the economic calendar from one place.',fr:'Recherchez actualités, événements mondiaux, Fed, Maison-Blanche indexée et calendrier économique.'},
  placeholder:{ar:'مثال: رسوم جمركية، إيران، الفيدرالي، النفط، التضخم...',en:'Example: tariffs, Iran, Fed, oil, inflation...',fr:'Exemple : tarifs, Fed, pétrole, inflation...'},
  search:{ar:'بحث',en:'Search',fr:'Rechercher'},
  all:{ar:'الكل',en:'All',fr:'Tout'},
  news:{ar:'الأخبار والأحداث',en:'News & events',fr:'Actualités'},
  calendar:{ar:'التقويم',en:'Calendar',fr:'Calendrier'},
  official:{ar:'مصادر رسمية فقط',en:'Official sources only',fr:'Sources officielles'},
  days:{ar:'الفترة',en:'Window',fr:'Période'},
  results:{ar:'النتائج',en:'Results',fr:'Résultats'},
  noResults:{ar:'لا توجد نتائج مطابقة في المصادر المتاحة.',en:'No matching results in the available sources.',fr:'Aucun résultat correspondant.'},
  error:{ar:'تعذر تشغيل محرك البحث حالياً.',en:'Research search is temporarily unavailable.',fr:'Recherche temporairement indisponible.'},
  partial:{ar:'تغطية جزئية',en:'Partial coverage',fr:'Couverture partielle'},
  officialBadge:{ar:'رسمي',en:'official',fr:'officiel'},
  newsCount:{ar:'أخبار',en:'news',fr:'actualités'},
  calendarCount:{ar:'تقويم',en:'calendar',fr:'calendrier'},
  sourcesCount:{ar:'مصادر',en:'sources',fr:'sources'},
  confidenceWord:{ar:'ثقة',en:'confidence',fr:'confiance'},
} as const;

function localeCode(locale:Locale){return locale==='ar'?'ar-KW':locale==='fr'?'fr-FR':'en-US';}
function date(value:string,locale:Locale){return Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat(localeCode(locale),{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value)):'—';}

export function GoldResearchSearch() {
  const { lang, dir } = useLanguage();
  const locale:Locale = lang==='en'||lang==='fr'?lang:'ar';
  const t=(key:keyof typeof COPY)=>COPY[key][locale];
  const [query,setQuery]=useState('');
  const [kind,setKind]=useState<'all'|'news'|'calendar'>('all');
  const [days,setDays]=useState(7);
  const [official,setOfficial]=useState(false);
  const [result,setResult]=useState<GoldResearchSearchResult|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');

  async function run(event:FormEvent){
    event.preventDefault();
    if(query.trim().length<2)return;
    setLoading(true);setError('');
    try{
      const params=new URLSearchParams({q:query.trim(),kind,days:String(days),limit:'24'});
      if(official)params.set('official','1');
      const response=await fetch(`/api/gold-intelligence/search?${params.toString()}`,{cache:'no-store'});
      const body=await response.json().catch(()=>null) as ApiResponse|null;
      if(!response.ok||!body?.success||!body.result)throw new Error(body?.code||'unavailable');
      setResult(body.result);
    }catch{setError(t('error'));}finally{setLoading(false);}
  }

  return (
    <section className={styles.shell} dir={dir}>
      <header><div><p><Search size={15}/>SFM Research Search</p><h2>{t('title')}</h2><span>{t('body')}</span></div></header>
      <form onSubmit={run}>
        <div className={styles.searchBox}><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('placeholder')} maxLength={140}/><button type="submit" disabled={loading||query.trim().length<2}>{loading?'…':t('search')}</button></div>
        <div className={styles.filters}>
          <div role="group" aria-label={t('results')}>
            {(['all','news','calendar'] as const).map(item=><button key={item} type="button" aria-pressed={kind===item} onClick={()=>setKind(item)}>{t(item)}</button>)}
          </div>
          <label><Filter size={14}/><span>{t('days')}</span><select value={days} onChange={e=>setDays(Number(e.target.value))}><option value={3}>3D</option><option value={7}>7D</option><option value={14}>14D</option><option value={30}>30D</option></select></label>
          <label className={styles.check}><input type="checkbox" checked={official} onChange={e=>setOfficial(e.target.checked)}/><ShieldCheck size={14}/><span>{t('official')}</span></label>
        </div>
      </form>

      {error?<div className={styles.error}>{error}</div>:null}
      {result?.partial?<div className={styles.partial}>{t('partial')}</div>:null}

      {result ? (
        <div className={styles.results}>
          <div className={styles.summary}><strong>{t('results')}</strong><span>{result.news.length} {t('newsCount')} · {result.calendar.length} {t('calendarCount')} · {result.providerCoverage.filter(p=>p.status==='success').length} {t('sourcesCount')}</span></div>
          {result.news.map(item=>(
            <article key={`n-${item.id}`} className={styles.news}>
              <div className={styles.meta}><span>{item.verificationStatus}</span><span>{item.expectedImpact}</span><span>{item.eventType}</span>{item.isOfficial?<b><ShieldCheck size={12}/>{t('officialBadge')}</b>:null}</div>
              <h3>{item.url?<a href={item.url} target="_blank" rel="noreferrer">{item.title}<ExternalLink size={13}/></a>:item.title}</h3>
              {item.summary?<p>{item.summary}</p>:null}
              <small>{item.source} · {date(item.publishedAt,locale)} · {t('confidenceWord')} {Math.round(item.confidenceScore*100)}%</small>
            </article>
          ))}
          {result.calendar.map(item=>(
            <article key={`c-${item.id}`} className={styles.calendar}>
              <CalendarSearch size={17}/>
              <div><strong>{item.title}</strong><small>{item.country||'—'} · {item.currency||'—'} · {item.source||item.provider}</small></div>
              <span>{item.impact}</span><time dateTime={item.dateTimeUtc}>{date(item.dateTimeUtc,locale)}</time>
            </article>
          ))}
          {!result.news.length&&!result.calendar.length?<p className={styles.empty}>{t('noResults')}</p>:null}
        </div>
      ):null}
    </section>
  );
}
