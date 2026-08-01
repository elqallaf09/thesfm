export function EbooksStyles() {
  return (
      <style jsx global>{`
        .ebooks-shell {
          min-height: 100vh;
          display: flex;
          background: var(--background);
          color: var(--foreground);
          font-family: var(--font-ui);
          overflow-x: hidden;
        }

        .ebooks-shell .sfm-dashboard-page-shell {
          flex: 1;
          width: 100%;
          min-width: 0;
        }

        .ebooks-content {
          width: 100%;
          margin: 0 auto;
          padding: 28px clamp(16px, 3vw, 36px) 64px;
          display: grid;
          gap: 24px;
        }

        .ebooks-hero {
          position: relative;
          overflow: hidden;
          border-radius: var(--radius-panel);
          border: 1px solid color-mix(in srgb, var(--hero-foreground) 22%, transparent);
          background: var(--hero-gradient);
          box-shadow: var(--shadow-lg);
          color: var(--hero-foreground);
        }

        .ebooks-hero .sfm-page-hero-icon {
          background: color-mix(in srgb, var(--hero-foreground) 11%, transparent);
          border: 1px solid color-mix(in srgb, var(--hero-foreground) 18%, transparent);
          color: var(--hero-foreground-muted);
        }

        .ebooks-hero h1,
        .ebooks-hero p,
        .ebooks-hero span {
          color: inherit;
        }

        .ebooks-hero-note {
          display: inline-flex;
          max-width: 520px;
          padding: 10px 14px;
          border-radius: var(--radius-card);
          background: color-mix(in srgb, var(--hero-foreground) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--hero-foreground) 18%, transparent);
          color: var(--hero-foreground-muted);
          font-weight: 500;
          line-height: 1.7;
        }

        .ebooks-search-panel,
        .ebooks-featured-section,
        .ebooks-grid-section,
        .ebooks-category-section,
        .ebooks-reading-path,
        .ebooks-disclaimer {
          border-radius: var(--radius-card);
          border: 1px solid var(--border);
          background: var(--surface);
          box-shadow: var(--shadow-card);
        }

        .ebooks-search-panel {
          display: grid;
          gap: 16px;
          padding: 18px;
        }

        .ebooks-search-field {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 52px;
          padding: 0 16px;
          border-radius: var(--radius-control);
          border: 1px solid var(--border-strong);
          background: var(--control-background);
          color: var(--accent);
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .ebooks-search-field:focus-within {
          border-color: var(--focus-ring);
          box-shadow: var(--focus-shadow);
        }

        .ebooks-search-field input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--foreground);
          font: 400 15px/1.5 var(--font-ui);
        }

        .ebooks-search-field input::placeholder {
          color: var(--control-placeholder);
        }

        .ebooks-filter-row {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 2px;
          scrollbar-width: none;
        }

        .ebooks-filter-row::-webkit-scrollbar {
          display: none;
        }

        .ebooks-filter-row button,
        .ebooks-category-grid button {
          flex: 0 0 auto;
          min-height: 42px;
          border: 1px solid var(--border);
          border-radius: var(--radius-pill);
          background: var(--surface);
          color: var(--foreground-secondary);
          padding: 0 16px;
          font: 500 13px/1.5 var(--font-ui);
          cursor: pointer;
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
          white-space: nowrap;
        }

        .ebooks-filter-row button:hover,
        .ebooks-filter-row button:focus-visible,
        .ebooks-category-grid button:hover,
        .ebooks-category-grid button:focus-visible,
        .ebooks-filter-row button.active,
        .ebooks-category-grid button.active {
          border-color: var(--primary);
          background: var(--primary);
          color: var(--primary-foreground);
          transform: translateY(-1px);
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
        }

        .ebooks-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .ebooks-stat-card {
          min-width: 0;
          display: grid;
          gap: 8px;
          padding: 18px;
          border-color: var(--border);
          background: var(--surface);
        }

        .ebooks-stat-card svg {
          color: var(--accent);
        }

        .ebooks-stat-card span {
          color: var(--foreground-muted);
          font-size: 12px;
          font-weight: 600;
        }

        .ebooks-stat-card strong {
          min-width: 0;
          color: var(--foreground);
          font-size: clamp(18px, 2vw, 24px);
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .ebooks-featured-section,
        .ebooks-grid-section,
        .ebooks-category-section,
        .ebooks-reading-path {
          padding: clamp(18px, 3vw, 28px);
        }

        .ebooks-section-head {
          max-width: 760px;
          display: grid;
          gap: 8px;
          margin-bottom: 18px;
        }

        .ebooks-section-head.compact {
          max-width: none;
          grid-template-columns: 1fr auto;
          align-items: end;
        }

        .ebooks-section-head span {
          color: var(--accent);
          font-size: 13px;
          font-weight: 600;
        }

        .ebooks-section-head h2 {
          margin: 0;
          color: var(--foreground);
          font-size: clamp(24px, 3vw, 36px);
          line-height: 1.2;
        }

        .ebooks-section-head p {
          margin: 0;
          color: var(--foreground-secondary);
          font-weight: 400;
          line-height: 1.8;
        }

        .ebooks-featured-card {
          display: grid;
          grid-template-columns: minmax(220px, 300px) 1fr;
          gap: 22px;
          align-items: stretch;
          border-radius: var(--radius-card);
          border: 1px solid var(--border);
          background: var(--accent-soft);
          padding: 18px;
        }

        .ebooks-featured-copy {
          display: grid;
          align-content: center;
          gap: 14px;
          min-width: 0;
        }

        .ebooks-featured-copy h3,
        .ebook-card h3,
        .ebooks-modal h2 {
          margin: 0;
          color: var(--foreground);
          font-size: clamp(21px, 2vw, 30px);
          line-height: 1.3;
        }

        .ebooks-featured-copy p,
        .ebook-card p,
        .ebooks-modal p {
          margin: 0;
          color: var(--foreground-secondary);
          font-weight: 400;
          line-height: 1.8;
        }

        .ebooks-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .ebook-card {
          display: grid;
          grid-template-rows: auto 1fr;
          min-width: 0;
          border-radius: var(--radius-card);
          border: 1px solid var(--border);
          background: var(--surface);
          box-shadow: var(--shadow-card);
          overflow: hidden;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }

        .ebook-card:hover {
          transform: translateY(-3px);
          border-color: var(--border-strong);
          box-shadow: var(--shadow-md);
        }

        .ebook-card-body {
          display: grid;
          gap: 12px;
          padding: 18px;
          min-width: 0;
        }

        .ebook-cover {
          min-height: 220px;
          padding: 18px;
          background: var(--primary);
          color: var(--primary-foreground);
        }

        .ebook-cover-finance {
          background: var(--accent);
          color: var(--accent-foreground);
        }

        .ebook-cover-trading {
          background: var(--info);
        }

        .ebook-cover-feasibility {
          background: var(--primary-hover);
        }

        .ebook-cover-inner {
          height: 100%;
          min-height: 184px;
          border-radius: var(--radius-card);
          border: 1px solid color-mix(in srgb, var(--hero-foreground) 22%, transparent);
          background: color-mix(in srgb, var(--hero-foreground) 8%, transparent);
          display: grid;
          align-content: space-between;
          gap: 16px;
          padding: 18px;
        }

        .ebook-cover-inner svg {
          color: var(--hero-foreground-muted);
        }

        .ebook-cover-inner span,
        .ebook-cover-inner small {
          color: var(--hero-foreground-muted);
          font-weight: 600;
        }

        .ebook-cover-inner strong {
          color: var(--hero-foreground);
          font-size: clamp(22px, 3vw, 34px);
          line-height: 1.2;
          overflow-wrap: anywhere;
        }

        .ebook-badges,
        .ebook-topic-row,
        .ebook-meta-row,
        .ebook-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          min-width: 0;
        }

        .ebook-badges span,
        .ebook-topic-row span,
        .ebook-meta-row span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: var(--radius-pill);
          border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--border));
          background: var(--accent-soft);
          color: var(--accent-hover);
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.3;
        }

        .ebook-topic-row span {
          background: var(--surface-muted);
          color: var(--foreground-secondary);
          border-color: var(--border);
        }

        .ebook-meta-row span {
          background: var(--primary-soft);
          color: var(--primary);
          border-color: color-mix(in srgb, var(--primary) 22%, var(--border));
        }

        .ebook-actions a,
        .ebook-detail-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          border-radius: var(--radius-control);
          padding: 0 14px;
          font: 600 13px/1.5 var(--font-ui);
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }

        .ebook-primary-action {
          border: 1px solid transparent;
          background: var(--primary);
          color: var(--primary-foreground);
          box-shadow: var(--shadow-sm);
        }

        .ebook-secondary-action,
        .ebook-detail-button {
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--accent);
        }

        .ebook-detail-button {
          width: fit-content;
        }

        .ebook-actions a:hover,
        .ebook-actions a:focus-visible,
        .ebook-detail-button:hover,
        .ebook-detail-button:focus-visible {
          transform: translateY(-1px);
          border-color: var(--primary);
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
        }

      `}</style>
  );
}
