'use client';
import { memo, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { tvPrice, tvText, tvTime } from '@/lib/markets-tv/i18n';
import { quoteStatus } from '@/lib/markets-tv/quotes';
import type { TvGroup, TvLanguage, TvQuote } from '@/lib/markets-tv/types';
import { TvAssetIcon } from './TvAssetIcon';
export const TvStripQuote = memo(function TvStripQuote({ quote: q, group, language, now, duplicate, onQuote }: { quote: TvQuote; group: TvGroup; language: TvLanguage; now: number; duplicate: boolean; onQuote: (quote: TvQuote) => void }) {
  const previous = useRef(q), [tick, setTick] = useState('');
  useEffect(() => {
    const old = previous.current; previous.current = q;
    if (q.price === null || old.price === null || q.price === old.price || !q.observedAt || !old.observedAt || Date.parse(q.observedAt) <= Date.parse(old.observedAt)) return;
    setTick(q.price > old.price ? 'up' : 'down');
    const timer = setTimeout(() => setTick(''), 1200); return () => clearTimeout(timer);
  }, [q.price, q.observedAt, q]);
  const trend = q.changePercent === null || q.changePercent === 0 ? 'flat' : q.changePercent > 0 ? 'up' : 'down';
  const status = quoteStatus(q, now), evidence = `${q.source || tvText(language,'unavailable')} · ${tvTime(q.observedAt,language,true)} · ${tvText(language,status)}`;
  return <button className="tv-market-strip-item" tabIndex={duplicate ? -1 : 0} onClick={() => onQuote(q)} data-tick={tick} title={`${language === 'ar' ? q.nameAr : q.name}\n${evidence}`}>
    <TvAssetIcon quote={q} group={group}/>
    <span className="tv-strip-symbol"><b dir="ltr">{q.symbol}</b><span>{language === 'ar' ? q.nameAr : q.name}</span></span>
    <strong className="tv-strip-price" dir="ltr">{tvPrice(q.price,q.currency)} <span>{q.currency}</span></strong>
    <span className="tv-strip-change" dir="ltr" data-trend={trend} aria-label={`${tvText(language,trend === 'up' ? 'rising' : trend === 'down' ? 'falling' : 'unchanged')}: ${q.changePercent ?? '—'}%`}>
      {trend === 'up' ? <ArrowUpRight aria-hidden="true"/> : trend === 'down' ? <ArrowDownRight aria-hidden="true"/> : <Minus aria-hidden="true"/>}
      {q.changePercent === null ? '—' : `${q.changePercent > 0 ? '+' : ''}${q.changePercent.toFixed(2)}%`}
    </span>
    <small className="tv-strip-evidence" data-status={status}>{evidence}</small>
  </button>;
});
