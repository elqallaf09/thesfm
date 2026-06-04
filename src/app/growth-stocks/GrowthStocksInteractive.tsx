'use client';

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';

export type GrowthNewsView = {
  sym: string;
  name: string;
  px: string;
  chg: string;
  up: boolean;
  title: string;
  desc: string;
  src: string;
  date: string;
  url: string;
  sectors: string[];
  searchText: string;
};

export type GrowthChipView = {
  key: string;
  label: string;
};

export type GrowthSummaryView = {
  k: string;
  v: string;
};

type RankedView = {
  sym: string;
  name: string;
  count: number;
};

type SourceView = {
  name: string;
  count: number;
};

type Props = {
  news: GrowthNewsView[];
  chips: GrowthChipView[];
  summary: GrowthSummaryView[];
};

const PAGE_SIZE = 12;

function matchesFilter(item: GrowthNewsView, filter: string) {
  return filter === 'all' || item.sectors.includes(filter);
}

function matchesQuery(item: GrowthNewsView, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return item.searchText.toLowerCase().includes(normalized);
}

function ranked(items: GrowthNewsView[]) {
  const map = new Map<string, RankedView>();
  items.forEach(item => {
    const sym = item.sym?.trim().toUpperCase();
    if (!sym || sym === 'GRO' || sym === 'GROWTH') return;
    const current = map.get(sym);
    map.set(sym, {
      sym,
      name: current?.name ?? item.name ?? sym,
      count: (current?.count ?? 0) + 1,
    });
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
}

function sources(items: GrowthNewsView[]) {
  const map = new Map<string, number>();
  items.forEach(item => {
    const src = item.src?.trim() || 'مصدر سوق';
    map.set(src, (map.get(src) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function arabicCount(count: number) {
  return new Intl.NumberFormat('ar-KW').format(count);
}

export default function GrowthStocksInteractive({ news, chips, summary }: Props) {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filteredNews = useMemo(
    () => news.filter(item => matchesFilter(item, selectedFilter) && matchesQuery(item, query)),
    [news, query, selectedFilter],
  );

  const visibleNews = filteredNews.slice(0, visibleCount);
  const featured = filteredNews[0] ?? null;
  const mini = filteredNews.slice(1, 4);
  const latest = filteredNews.slice(0, 5);
  const rankedItems = ranked(filteredNews.length > 0 ? filteredNews : news);
  const sourceItems = sources(filteredNews.length > 0 ? filteredNews : news);
  const hasMore = visibleCount < filteredNews.length;

  const chipsWithCounts = useMemo(
    () => chips.map(chip => ({
      ...chip,
      count: news.filter(item => matchesFilter(item, chip.key) && matchesQuery(item, query)).length,
    })),
    [chips, news, query],
  );

  function selectFilter(next: string) {
    setSelectedFilter(next);
    setVisibleCount(PAGE_SIZE);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <>
      <form className="search" onSubmit={handleSearch}>
        <input
          value={query}
          onChange={event => {
            setQuery(event.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          placeholder="ابحث عن سهم، أو شركة، أو قطاع مثل NVDA أو البرمجيات أو الذكاء الاصطناعي..."
          aria-label="البحث في أخبار أسهم النمو"
        />
        <button type="submit">بحث</button>
      </form>

      <div className="chips" aria-label="تصنيفات أسهم النمو">
        {chipsWithCounts.map(chip => (
          <button
            key={chip.key}
            type="button"
            className={chip.key === selectedFilter ? 'active' : ''}
            aria-pressed={chip.key === selectedFilter}
            onClick={() => selectFilter(chip.key)}
          >
            <span>{chip.label}</span>
            <b>{chip.count}</b>
          </button>
        ))}
      </div>

      <section className="feat-panel" aria-label="أحدث خبر نمو بارز">
        {featured ? (
          <>
            <div className="feat-head">
              <span className="badge" dir="ltr">{featured.sym}</span>
              <span>{featured.src}</span>
              <span>{featured.date}</span>
            </div>
            <div className="feat-grid">
              <article className="hero">
                <h2>{featured.title}</h2>
                <p>{featured.desc}</p>
                <div className="meta">
                  <span dir="ltr">{featured.px}</span>
                  <em className={featured.up ? 'up' : 'down'} dir="ltr">{featured.chg}</em>
                </div>
                <a href={featured.url} target="_blank" rel="noreferrer">قراءة الخبر</a>
              </article>
              <div className="mini-list">
                {mini.length > 0 ? mini.map(item => (
                  <a href={item.url} target="_blank" rel="noreferrer" key={`${item.sym}-${item.title}`}>
                    <b dir="ltr">{item.sym}</b>
                    <span>{item.title}</span>
                    <small>{item.date}</small>
                  </a>
                )) : (
                  <div className="empty">لا توجد أخبار إضافية من المصادر المتاحة حاليًا.</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="empty">
            <h2>لا توجد بيانات متاحة حاليًا. حاول لاحقًا.</h2>
            <p>جرّب تصنيفًا آخر أو ابحث عن شركة محددة.</p>
          </div>
        )}
      </section>

      <div className="content">
        <section className="news-area" aria-label="أخبار أسهم النمو">
          <div className="news-heading">
            <div>
              <span>الأحدث أولًا</span>
              <h2>أخبار أسهم النمو</h2>
            </div>
            <b>{arabicCount(filteredNews.length)} خبر مطابق</b>
          </div>
          <div className="news-grid">
            {visibleNews.length > 0 ? visibleNews.map(item => (
              <article className="ncard" key={`${item.sym}-${item.title}`}>
                <div className="nmeta">
                  <span className="badge" dir="ltr">{item.sym}</span>
                  <span>{item.src}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                <div className="market-row">
                  <span>{item.name}</span>
                  <b dir="ltr">{item.px}</b>
                  <em className={item.up ? 'up' : 'down'} dir="ltr">{item.chg}</em>
                </div>
                <a href={item.url} target="_blank" rel="noreferrer">قراءة الخبر</a>
              </article>
            )) : (
              <div className="empty">
                <h2>لا توجد بيانات متاحة حاليًا. حاول لاحقًا.</h2>
                <p>جرّب تصنيفًا آخر أو ابحث عن شركة محددة.</p>
              </div>
            )}
            <div className="load-more">
              {hasMore ? (
                <button type="button" onClick={() => setVisibleCount(count => count + PAGE_SIZE)}>
                  عرض المزيد
                </button>
              ) : (
                <span>تم عرض جميع الأخبار المتاحة</span>
              )}
            </div>
          </div>
        </section>

        <aside className="sidebar">
          <section className="side-card latest">
            <h3>أحدث الأخبار</h3>
            {latest.length > 0 ? latest.map(item => (
              <a href={item.url} target="_blank" rel="noreferrer" key={`latest-${item.sym}-${item.title}`}>
                <b dir="ltr">{item.sym}</b>
                <span>{item.title}</span>
              </a>
            )) : <p>لا توجد أخبار حديثة متاحة حاليًا.</p>}
          </section>

          <section className="side-card ranked">
            <h3>أسهم النمو الأكثر ذكرًا</h3>
            {rankedItems.length > 0 ? rankedItems.map((item, index) => (
              <div className="rank-row" key={item.sym}>
                <b>{index + 1}</b>
                <span dir="ltr">{item.sym}</span>
                <small>{item.name}</small>
                <em>{item.count} أخبار</em>
              </div>
            )) : <p>لا توجد إشارات كافية بعد.</p>}
          </section>

          <section className="side-card sources">
            <h3>مصادر الأخبار</h3>
            {sourceItems.length > 0 ? sourceItems.map(item => (
              <div key={item.name}>
                <span>{item.name}</span>
                <b>{item.count}</b>
              </div>
            )) : <p>لا توجد مصادر متاحة حاليًا.</p>}
          </section>

          <section className="side-card summary">
            <h3>ملخص سريع</h3>
            {summary.map(item => (
              <div key={item.k}>
                <span>{item.k}</span>
                <b>{item.v}</b>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </>
  );
}
