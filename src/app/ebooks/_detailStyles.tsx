export function EbooksDetailStyles() {
  return (
    <style jsx global>{`
        .ebooks-category-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .ebooks-category-grid button {
          border-radius: var(--radius-panel);
          min-height: 92px;
          justify-content: space-between;
          display: flex;
          align-items: center;
          padding: 18px;
          text-align: start;
        }

        .ebooks-category-grid button strong {
          font-size: 24px;
        }

        .ebooks-path-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .ebooks-path-card {
          padding: 18px;
          display: grid;
          gap: 10px;
          background: var(--surface-muted);
          border-color: var(--border);
        }

        .ebooks-path-card span {
          color: var(--accent);
          font-weight: 600;
        }

        .ebooks-path-card p {
          margin: 0;
          color: var(--foreground-secondary);
          line-height: 1.8;
          font-weight: 500;
        }

        .ebooks-disclaimer {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          padding: 18px;
          background: var(--info-soft);
        }

        .ebooks-disclaimer svg {
          flex: 0 0 auto;
          color: var(--info);
        }

        .ebooks-disclaimer h2,
        .ebooks-disclaimer p {
          margin: 0;
        }

        .ebooks-disclaimer h2 {
          color: var(--foreground);
          font-size: 18px;
        }

        .ebooks-disclaimer p {
          margin-top: 6px;
          color: var(--foreground-secondary);
          font-weight: 500;
          line-height: 1.8;
        }

        .ebooks-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 10050;
          background: var(--background-overlay);
          backdrop-filter: blur(10px);
          display: grid;
          place-items: center;
          padding: 20px;
        }

        .ebooks-modal {
          position: relative;
          width: min(980px, 100%);
          max-height: min(760px, calc(100vh - 40px));
          overflow: auto;
          display: grid;
          grid-template-columns: minmax(220px, 310px) 1fr;
          gap: 18px;
          border-radius: var(--radius-panel);
          border: 1px solid var(--border);
          background: var(--surface-elevated);
          padding: 18px;
          box-shadow: var(--shadow-popover);
        }

        .ebooks-modal-close {
          position: absolute;
          inset-block-start: 14px;
          inset-inline-end: 14px;
          z-index: 2;
          width: 40px;
          height: 40px;
          border-radius: var(--radius-control);
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--accent);
          cursor: pointer;
        }

        .ebooks-modal-copy {
          display: grid;
          gap: 14px;
          align-content: start;
          padding: 8px;
          min-width: 0;
        }

        .ebooks-modal-copy > span {
          color: var(--accent);
          font-weight: 600;
        }

        .ebooks-modal dl {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin: 0;
        }

        .ebooks-modal dl div {
          border-radius: var(--radius-card);
          border: 1px solid var(--border);
          background: var(--surface-muted);
          padding: 12px;
        }

        .ebooks-modal dt {
          color: var(--foreground-muted);
          font-size: 12px;
          font-weight: 600;
        }

        .ebooks-modal dd {
          margin: 5px 0 0;
          color: var(--foreground);
          font-weight: 600;
        }

        .ebooks-modal h3 {
          margin: 0 0 8px;
          color: var(--foreground);
          font-size: 18px;
        }

        .ebooks-modal ul {
          margin: 0;
          padding-inline-start: 20px;
          color: var(--foreground-secondary);
          font-weight: 500;
          line-height: 1.8;
        }


        @media (min-width: 1500px) {
          .ebooks-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }

        @media (max-width: 1100px) {
          .ebooks-stats-grid,
          .ebooks-grid,
          .ebooks-path-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 820px) {
          .ebooks-content {
            padding: 18px 14px 44px;
          }

          .ebooks-featured-card,
          .ebooks-modal {
            grid-template-columns: 1fr;
          }

          .ebooks-category-grid {
            grid-template-columns: 1fr;
          }

          .ebooks-modal dl {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .ebooks-stats-grid,
          .ebooks-grid,
          .ebooks-path-grid {
            grid-template-columns: 1fr;
          }

          .ebooks-section-head.compact {
            grid-template-columns: 1fr;
            align-items: start;
          }

          .ebook-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .ebook-actions a,
          .ebook-detail-button {
            width: 100%;
          }

          .ebook-cover {
            min-height: 190px;
          }

          .ebook-cover-inner {
            min-height: 154px;
          }
        }
    `}</style>
  );
}
