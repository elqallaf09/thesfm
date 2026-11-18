'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Check, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { TvMarketFlag } from './TvMarketFlag';
import type { TvLanguage } from '@/lib/markets-tv/types';
import type { TvSession, TvSessionRegion } from '@/lib/markets-tv/sessionTypes';
import { sessionNameIndex, sessionText } from '@/lib/markets-tv/sessionCopy';
import { tvText } from '@/lib/markets-tv/i18n';
import './session-picker.css';

const regions: TvSessionRegion[] = ['gulf', 'arab', 'europe', 'americas', 'asia', 'africa', 'oceania'];
const clean = (text: string) => text.normalize('NFKD').replace(/[\u0300-\u036f\u064b-\u065f]/g, '').replace(/[أإآ]/g, 'ا').toLocaleLowerCase();
type Props = { sessions: readonly TvSession[]; selected: string[]; language: TvLanguage; onChange: (ids: string[]) => void; onDone: () => void };

export function TvSessionPicker({ sessions, selected, language, onChange, onDone }: Props) {
  const root = useRef<HTMLDivElement>(null), done = useRef<HTMLButtonElement>(null);
  const [search, setSearch] = useState(''), [area, setArea] = useState<TvSessionRegion | 'all'>('all');
  const [page, setPage] = useState(0), [focusedName, setFocusedName] = useState('');
  const [layout, setLayout] = useState({ columns: 6, full: true });
  const t = (key: Parameters<typeof sessionText>[1]) => sessionText(language, key);
  const countries = useMemo(() => new Intl.DisplayNames([language], { type: 'region' }), [language]);
  const query = clean(search.trim());
  const matches = sessions.filter(s => (area === 'all' || s.area === area) && clean([...s.names, s.region, s.id, countries.of(s.region) || ''].join(' ')).includes(query));
  const size = layout.full ? Math.max(1, matches.length) : layout.columns * 5;
  const pages = Math.max(1, Math.ceil(matches.length / size)), current = Math.min(page, pages - 1);
  const visible = matches.slice(current * size, (current + 1) * size), chosen = new Set(selected);
  const rows = Math.max(1, Math.ceil(visible.length / layout.columns));
  const pagerTarget = pages > 1 ? current < pages - 1 ? 'session-picker-next' : 'session-picker-previous' : 'sessions-done';
  const lastRowTarget = visible[(rows - 1) * layout.columns];
  useEffect(() => {
    done.current?.focus({ preventScroll: true });
    const element = root.current;
    if (!element) return;
    const measure = () => {
      const full = window.innerWidth >= 1200;
      const columns = full ? 6 : element.clientWidth >= 800 ? 4 : element.clientWidth >= 520 ? 3 : 2;
      setLayout(previous => previous.columns === columns && previous.full === full ? previous : { columns, full });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={root} className="tv-session-picker" data-tv-focus-scope data-tv-page-fit role="group" aria-label={t('choose')}
    onFocusCapture={event => setFocusedName((event.target as HTMLElement).dataset.tvLabel || '')}
    style={{ '--tv-picker-columns': layout.columns, '--tv-picker-rows': rows } as CSSProperties}>
    <div className="tv-session-picker-heading">
      <h2>{t('choose')}</h2>
      <label className="tv-session-search"><Search aria-hidden="true"/><input type="search" value={search}
        onChange={event => { setSearch(event.target.value); setPage(0); }} placeholder={t('search')} aria-label={t('search')}
        data-tv-focus-key="sessions-search" data-tv-nav-up="sessions-done" data-tv-nav-down={`sessions-region:${area}`}/></label>
      <button ref={done} className="tv-session-done" onClick={onDone} data-tv-back data-tv-initial-focus
        data-tv-focus-key="sessions-done" data-tv-nav-down={`sessions-region:${area}`}>
        <Check aria-hidden="true"/>{t('done')} <bdi>{selected.length}/{sessions.length}</bdi>
      </button>
    </div>
    <div className="tv-session-picker-toolbar" data-tv-focus-row>
      <div className="tv-session-regions" role="group" aria-label={t('allRegions')}>
        {(['all', ...regions] as const).map(id => <button key={id} aria-pressed={area === id}
          data-tv-focus-key={`sessions-region:${id}`} data-tv-nav-up="sessions-done"
          onClick={() => { setArea(id); setPage(0); }}>{t(id === 'all' ? 'allRegions' : id)}</button>)}
      </div>
      <div className="tv-session-picker-actions" role="group" aria-label={t('selected')}>
        <button onClick={() => onChange(sessions.map(s => s.id))} data-tv-focus-key="sessions-select-all" data-tv-nav-up="sessions-done">{t('all')}</button>
        <button onClick={() => onChange([])} data-tv-focus-key="sessions-clear" data-tv-nav-up="sessions-done">{t('clear')}</button>
        <button onClick={() => onChange([...new Set([...selected, ...matches.map(s => s.id)])])} data-tv-focus-key="sessions-select-results" data-tv-nav-up="sessions-done">{t('selectRegion')}</button>
      </div>
    </div>
    <div className="tv-session-options" data-tv-focus-grid>
      {visible.map((session, index) => {
        const name = session.names[sessionNameIndex(language)], label = `${name} · ${countries.of(session.region)} · ${session.id}`;
        return <button role="checkbox" aria-checked={chosen.has(session.id)} aria-label={label} title={label} key={session.id}
          onClick={() => onChange(chosen.has(session.id) ? selected.filter(id => id !== session.id) : [...selected, session.id])}
          data-tv-label={label} data-tv-focus-key={`choose-session:${session.id}`}
          data-tv-nav-up={index < layout.columns ? `sessions-region:${area}` : undefined}
          data-tv-nav-down={index >= (rows - 1) * layout.columns ? pagerTarget : undefined}>
          <TvMarketFlag region={session.region}/><span className="tv-session-check" aria-hidden="true">{chosen.has(session.id) && <Check/>}</span><strong>{name}</strong>
        </button>;
      })}
      {!matches.length && <p>{t('noResults')}</p>}
    </div>
    <div className="tv-session-picker-caption">
      <small className="tv-session-saved">{focusedName || t('saved')}</small>
      {pages > 1 && <nav className="tv-session-picker-pages" aria-label={t('choose')} data-tv-focus-row>
        <button disabled={current === 0} onClick={() => setPage(current - 1)} aria-label={tvText(language, 'previous')} data-tv-focus-key="session-picker-previous"
          data-tv-nav-up={lastRowTarget ? `choose-session:${lastRowTarget.id}` : 'sessions-done'} data-tv-nav-down="sessions-done">
          {language === 'ar' ? <ChevronRight aria-hidden="true"/> : <ChevronLeft aria-hidden="true"/>}{tvText(language, 'previous')}
        </button><bdi>{current + 1} / {pages}</bdi>
        <button disabled={current === pages - 1} onClick={() => setPage(current + 1)} aria-label={tvText(language, 'next')} data-tv-focus-key="session-picker-next"
          data-tv-nav-up={lastRowTarget ? `choose-session:${lastRowTarget.id}` : 'sessions-done'} data-tv-nav-down="sessions-done">
          {tvText(language, 'next')}{language === 'ar' ? <ChevronLeft aria-hidden="true"/> : <ChevronRight aria-hidden="true"/>}
        </button>
      </nav>}
    </div>
  </div>;
}
