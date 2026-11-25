'use client';
import { useEffect, useMemo } from 'react';
import { NEWS_MOVER_KEYS, moverValue, newsMoverText, newsMoversPath, parseNewsMovers } from '@/lib/markets-tv/newsMovers';
import type { TvReceiverNewsChannel } from '@/lib/markets-tv/newsReceiver';
import type { TvLanguage } from '@/lib/markets-tv/types';
import { useTvResource } from './useTvResource';
import { TvAssetIcon } from './TvAssetIcon';
import './news-movers.css';

export function TvNewsMovers({ channel, language, revision, tickerPath = null, separate = false, expanded = false, onAvailable }: {
  channel: TvReceiverNewsChannel; language: TvLanguage; revision: number; tickerPath?: string | null;
  separate?: boolean; expanded?: boolean; onAvailable?: (available: boolean) => void;
}) {
  const path = newsMoversPath(channel, tickerPath);
  const resource = useTvResource<unknown>(path, 180000, '', revision);
  const data = useMemo(() => parseNewsMovers(resource.data, channel), [resource.data, channel]);
  const hasMovers = Boolean(data && NEWS_MOVER_KEYS.some(key => data.lists[key].length));
  useEffect(() => { onAvailable?.(hasMovers); }, [hasMovers, onAvailable]);
  return <section className="tv-news-movers" data-movers-channel={channel} data-expanded={expanded}
    hidden={separate && !expanded} aria-label={newsMoverText(language,'movers')} aria-busy={resource.loading}>
    <div className="tv-news-movers-grid">
      {NEWS_MOVER_KEYS.map(key => <section key={key} className="tv-news-mover-card" data-mover-kind={key}>
        <h2>{newsMoverText(language,key)}</h2>
        {data?.lists[key].length ? <ol>{data.lists[key].map(item => <li key={item.symbol+':'+item.exchange+':'+item.currency}>
          <TvAssetIcon quote={{symbol:item.symbol,name:item.name,exchange:item.exchange || null}}
            group={channel==='cryptoNews'?'crypto':undefined}/>
          <span className="tv-news-mover-identity"><strong>{item.name}</strong><bdi>{item.symbol}</bdi></span>
          <span className="tv-news-mover-metric" data-direction={item.changePercent === null ? 'flat' : item.changePercent>0?'up':item.changePercent<0?'down':'flat'}>
            <bdi>{moverValue(item,key)}</bdi>
            <small><bdi>{new Intl.NumberFormat('en-US',{maximumFractionDigits:4}).format(item.price)} {item.currency}</bdi></small>
          </span>
        </li>)}</ol> : <p className="tv-news-movers-empty">{newsMoverText(language,resource.loading?'loading':'unavailable')}</p>}
      </section>)}
    </div>
    <p className="tv-news-movers-note">{newsMoverText(language,'partial')} · {newsMoverText(language,channel==='cryptoNews'?'cryptoVolume':'stocksVolume')}
      {data?.source && <span> · {data.source}</span>}
      {data?.updatedAt && <span> · <time dateTime={data.updatedAt}>{new Intl.DateTimeFormat('en-GB', {dateStyle:'short',timeStyle:'short',timeZone:'Asia/Kuwait'}).format(new Date(data.updatedAt))}</time></span>}
      {resource.error && <span> · {newsMoverText(language,'unavailable')}</span>}
    </p>
  </section>;
}
