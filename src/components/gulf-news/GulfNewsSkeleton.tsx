'use client';

export function GulfNewsSkeleton() {
  return (
    <section className="gulf-news-grid" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <article className="gulf-news-card gulf-news-skeleton" key={index}>
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

export default GulfNewsSkeleton;

