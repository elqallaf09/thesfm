'use client';

function SkeletonLines({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => <i key={index} />)}
    </>
  );
}

// Mirrors the real populated layout (featured grid -> quick filters ->
// feed + side panel) at the same grid class names/column counts used by
// TechNewsPage, so swapping the skeleton out for real content does not
// shift the page height/columns (a measured CLS source in the previous
// design, whose skeleton did not reflect the real layout at all).
export function TechNewsSkeleton() {
  return (
    <div aria-hidden="true" className="tech-news-skeleton-root">
      <section className="tech-news-featured">
        <div className="tech-news-featured-grid">
          <div className="tech-news-card tech-news-card-lead tech-news-skeleton">
            <span className="tech-news-skeleton-media" />
            <span />
            <SkeletonLines count={4} />
            <b />
          </div>
          <div className="tech-news-featured-side">
            {[0, 1].map(index => (
              <div className="tech-news-card tech-news-card-secondary tech-news-skeleton" key={index}>
                <span className="tech-news-skeleton-media" />
                <span />
                <SkeletonLines count={2} />
                <b />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="tech-news-quick-filters-skeleton">
        <span />
        <span />
      </div>

      <section className="tech-news-layout">
        <div className="tech-news-content-column">
          <section className="tech-news-feed grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="tech-news-card tech-news-card-standard tech-news-skeleton" key={index}>
                <span />
                <SkeletonLines count={3} />
                <b />
                <small />
              </div>
            ))}
          </section>
        </div>
        <aside className="tech-news-side-panel">
          <div className="tech-side-card tech-news-skeleton">
            <span />
            <SkeletonLines count={4} />
          </div>
        </aside>
      </section>
    </div>
  );
}

export default TechNewsSkeleton;
