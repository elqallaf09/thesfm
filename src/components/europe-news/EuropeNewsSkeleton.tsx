'use client';

export function EuropeNewsSkeleton() {
  return (
    <section className="europe-news-grid" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <article className="europe-news-card europe-news-skeleton" key={index}>
          <span />
          <i />
          <i />
          <b />
          <small />
        </article>
      ))}
    </section>
  );
}

export default EuropeNewsSkeleton;
