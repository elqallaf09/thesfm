'use client';

export function TechNewsSkeleton() {
  return (
    <section className="tech-news-grid" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <article className="tech-news-card tech-news-skeleton" key={index}>
          <span />
          <i />
          <i />
          <i />
          <b />
          <small />
        </article>
      ))}
    </section>
  );
}

export default TechNewsSkeleton;
