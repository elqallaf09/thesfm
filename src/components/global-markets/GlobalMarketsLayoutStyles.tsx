'use client';

export function GlobalMarketsLayoutStyles() {
  return (
    <style jsx global>{`
      .gm-shell {
        min-height: 100dvh;
        background: var(--background);
        color: var(--foreground);
        font-family: var(--font-ui);
        overflow-x: hidden;
      }

      [dir] .gm-shell .gm-main {
        width: 100%;
        margin-inline: auto;
        display: grid;
        gap: var(--workspace-page-section-gap, 20px);
        min-width: 0;
      }

      .gm-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 18px;
        border: 1px solid var(--border);
        border-radius: var(--radius-card);
        background: var(--surface);
        box-shadow: var(--shadow-card);
      }

      .gm-header-icon {
        display: grid;
        place-items: center;
        inline-size: 44px;
        block-size: 44px;
        flex: 0 0 auto;
        border-radius: var(--radius-pill);
        background: var(--accent-soft);
        color: var(--accent);
      }

      .gm-header-copy {
        display: grid;
        gap: 2px;
        min-width: 0;
        flex: 1 1 auto;
      }

      .gm-header-copy h1 {
        margin: 0;
        color: var(--foreground);
        font-size: 19px;
        font-weight: 700;
        line-height: 1.25;
      }

      .gm-header-copy p {
        margin: 0;
        color: var(--foreground-muted);
        font-size: 12.5px;
        line-height: 1.4;
      }

      .gm-header-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 0 0 auto;
      }

      .gm-header-updated {
        color: var(--foreground-muted);
        font-size: 11.5px;
        font-weight: 500;
        white-space: nowrap;
      }

      .gm-header-refresh {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        inline-size: 40px;
        block-size: 40px;
        border: 1px solid var(--border);
        border-radius: var(--radius-pill);
        background: var(--surface);
        color: var(--foreground-secondary);
        cursor: pointer;
      }

      .gm-header-refresh:hover {
        background: var(--surface-muted);
        color: var(--foreground);
      }

      .gm-header-refresh .is-spinning {
        animation: gm-spin 0.9s linear infinite;
      }

      @keyframes gm-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .gm-error {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 14px;
        border: 1px solid var(--danger);
        border-radius: var(--radius-card);
        background: var(--danger-soft);
        color: var(--danger);
        font-size: 13px;
        font-weight: 600;
      }

      .gm-strips {
        display: grid;
        gap: 14px;
      }

      .gm-strips-skeleton {
        display: grid;
        gap: 14px;
      }

      .gm-strips-skeleton-row {
        min-height: 110px;
        border-radius: var(--radius-card);
        background: var(--surface-muted);
        animation: gm-pulse 1.4s ease-in-out infinite;
      }

      @keyframes gm-pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }

      .gm-disclaimer {
        margin: 0;
        padding-top: 6px;
        color: var(--foreground-muted);
        font-size: 11.5px;
        line-height: 1.5;
        border-top: 1px solid var(--border);
      }

      @media (prefers-reduced-motion: reduce) {
        .gm-header-refresh .is-spinning {
          animation: none;
        }
        .gm-strips-skeleton-row {
          animation: none;
        }
      }
    `}</style>
  );
}

export default GlobalMarketsLayoutStyles;
