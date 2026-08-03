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

      .gm-selection {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 13px 15px;
        border: 1px solid var(--border);
        border-radius: var(--radius-card);
        background: var(--surface);
      }

      .gm-selection > div { display: grid; gap: 4px; min-width: 0; }
      .gm-selection strong { font-size: 13px; color: var(--foreground); }
      .gm-selection span { overflow: hidden; color: var(--foreground-muted); font-size: 11.5px; text-overflow: ellipsis; white-space: nowrap; }
      .gm-selection button, .gm-picker-save, .gm-picker-restore {
        min-height: 44px;
        border: 1px solid var(--border);
        border-radius: var(--radius-control);
        padding: 0 14px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        background: var(--surface-muted);
        color: var(--foreground);
        font-weight: 650;
        cursor: pointer;
      }

      .gm-picker-body { display: grid; gap: 14px; }
      .gm-picker-search { min-height: 44px; display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-control); background: var(--surface-muted); }
      .gm-picker-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--foreground); }
      .gm-picker-count { margin: 0; font-weight: 700; }
      .gm-picker-order { display: grid; gap: 7px; margin: 0; padding: 0; list-style: none; }
      .gm-picker-order li { min-height: 48px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 7px 10px; border: 1px solid var(--border); border-radius: var(--radius-control); }
      .gm-picker-order-actions { display: flex; gap: 6px; }
      .gm-picker-order-actions button { inline-size: 44px; block-size: 44px; display: grid; place-items: center; border: 0; border-radius: var(--radius-control); background: var(--surface-muted); color: var(--foreground); }
      .gm-picker-order-actions button:disabled { opacity: .35; }
      .gm-picker-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      .gm-picker-option { min-height: 48px; display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 8px; padding: 9px 10px; border: 1px solid var(--border); border-radius: var(--radius-control); cursor: pointer; }
      .gm-picker-option input { inline-size: 20px; block-size: 20px; }
      .gm-picker-option small { grid-column: 2; color: var(--foreground-muted); }
      .gm-picker-option.is-disabled { opacity: .62; cursor: not-allowed; }
      .gm-picker-footer { width: 100%; display: flex; justify-content: space-between; gap: 10px; }
      .gm-picker-save { border-color: var(--accent); background: var(--accent); color: var(--accent-contrast); }
      .gm-picker-save:disabled { opacity: .5; cursor: not-allowed; }

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

      @media (max-width: 640px) {
        .gm-selection { align-items: stretch; flex-direction: column; }
        .gm-selection button { width: 100%; }
        .gm-picker-options { grid-template-columns: 1fr; }
        .gm-picker-footer { flex-direction: column-reverse; }
        .gm-picker-footer > button { width: 100%; }
        .sfm-modal-overlay:has(.gm-picker) { align-items: flex-end !important; padding: 0 !important; }
        .gm-picker { width: 100% !important; max-height: 88dvh !important; border-end-start-radius: 0 !important; border-end-end-radius: 0 !important; }
      }
    `}</style>
  );
}

export default GlobalMarketsLayoutStyles;
