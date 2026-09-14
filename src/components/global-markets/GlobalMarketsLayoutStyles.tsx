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
        inline-size: 220px;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--foreground-muted);
        font-size: 11.5px;
        font-weight: 500;
        white-space: nowrap;
      }

      .gm-header-refresh {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-inline-size: 44px;
        min-block-size: 44px;
        gap: 7px;
        padding-inline: 12px;
        font-size: 12px;
        font-weight: 650;
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

      .gm-header-feedback {
        min-block-size: 2.8em;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .gm-header-feedback.is-error { color: var(--danger); }

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

      .gm-selection > div { flex: 1; display: grid; gap: 4px; min-width: 0; }
      .gm-selection strong { font-size: 13px; color: var(--foreground); }
      .gm-selection-chips { list-style: none; padding: 0; margin: 6px 0 0; display: flex; flex-wrap: wrap; gap: 6px; }
      .gm-selection-chips li { padding: 5px 9px; border-radius: var(--radius-control); background: var(--accent-soft); color: var(--foreground); font-size: 12px; line-height: 1.5; }
      .gm-selection > button { background: var(--accent); border-color: var(--accent); color: var(--accent-foreground); flex: none; }
      .gm-header-refresh:disabled { opacity: .55; cursor: wait; }
      .gm-header button:focus-visible, .gm-selection button:focus-visible, .gm-picker button:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

      .gm-selection button, .gm-picker-save, .gm-picker-restore, .gm-picker-cancel {
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

      .gm-selection > button, .gm-picker-save { border-color: var(--accent); background: var(--accent); color: var(--accent-foreground); }
      .gm-picker { --sfm-modal-responsive-width: 780px; }
      .gm-picker-body { display: grid; gap: 20px; }
      .gm-picker-selected { padding: 14px; border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--surface-muted); }
      .gm-picker-count { display: flex; justify-content: space-between; margin: 0 0 10px; font-size: 14px; font-weight: 700; }
      .gm-picker-count bdi { color: var(--accent); font-family: var(--font-data); }
      .gm-picker-order { display: grid; gap: 7px; margin: 0; padding: 0; list-style: none; }
      .gm-picker-order li { min-height: 56px; display: flex; align-items: center; gap: 8px; padding: 6px 8px; border: 1px solid var(--border); border-radius: var(--radius-control); background: var(--surface); }
      .gm-picker-rank { display: grid; place-items: center; inline-size: 26px; block-size: 26px; flex: none; background: var(--accent-soft); color: var(--accent); border-radius: var(--radius-pill); font-family: var(--font-data); font-size: 12px; }
      .gm-picker-order-name { flex: 1; min-width: 0; font-size: 13px; line-height: 1.5; }
      .gm-picker-order-actions { display: flex; flex: none; gap: 4px; }
      .gm-picker-order-actions button { inline-size: 44px; block-size: 44px; display: grid; place-items: center; border: 1px solid var(--border); border-radius: var(--radius-control); background: var(--surface-muted); color: var(--foreground); cursor: pointer; }
      .gm-picker-order-actions .gm-picker-remove { color: var(--danger); background: var(--danger-soft); }
      .gm-picker-order-actions button:disabled { opacity: .35; cursor: not-allowed; }
      .gm-picker-hint { margin: 10px 0 0; font-size: 12px; line-height: 1.6; color: var(--foreground-secondary); }
      .gm-picker-browse { display: grid; gap: 12px; }
      .gm-picker-browse h3 { margin: 0; font-size: 14px; }
      .gm-picker-search { min-height: 48px; display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid var(--border-strong); border-radius: var(--radius-control); background: var(--surface); }
      .gm-picker-search:focus-within { outline: 2px solid var(--accent); outline-offset: 2px; }
      .gm-picker-search input { flex: 1; width: 100%; min-width: 0; min-height: 44px; border: 0; outline: 0; padding: 0; background: transparent; color: var(--foreground); font-size: 14px; }
      .gm-picker-groups { display: flex; flex-wrap: wrap; gap: 6px; }
      .gm-picker-groups button { min-height: 44px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-control); color: var(--foreground-secondary); background: var(--surface); cursor: pointer; font-size: 12px; }
      .gm-picker-groups button[aria-pressed='true'] { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); font-weight: 700; }
      .gm-picker-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      .gm-picker-option { min-height: 62px; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--border-strong); border-radius: var(--radius-control); text-align: start; font-size: 13px; line-height: 1.5; color: var(--foreground); background: var(--surface); cursor: pointer; }
      .gm-picker-option.is-selected { border-color: var(--accent); background: var(--accent-soft); font-weight: 650; }
      .gm-picker-option small { display: block; margin-top: 3px; color: var(--foreground-muted); font-size: 11px; }
      .gm-picker-option:disabled { opacity: .55; cursor: not-allowed; }
      .gm-picker-check { display: grid; place-items: center; inline-size: 28px; block-size: 28px; flex: none; border: 1px solid var(--border); border-radius: var(--radius-control); }
      .gm-picker-option.is-selected .gm-picker-check { background: var(--accent); color: var(--accent-foreground); border-color: var(--accent); }
      .gm-picker-footer { width: 100%; display: flex; justify-content: space-between; gap: 10px; align-items: center; }
      .gm-picker-footer-actions { display: flex; gap: 8px; }
      .gm-picker-save:disabled { opacity: .45; cursor: not-allowed; }

      .gm-strips {
        display: grid;
        gap: 14px;
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
      }

      @media (max-width: 1024px) {
        .gm-header-updated { display: none; }
      }

      @media (max-width: 640px) {
        [dir] .gm-shell .gm-main { gap: 12px; }
        .gm-header { padding: 14px 12px; flex-wrap: wrap; }
        .gm-header-copy { flex-basis: calc(100% - 52px); }
        .gm-header-actions { width: 100%; justify-content: space-between; }
        .gm-header-updated { inline-size: auto; flex: 1; font-size: 10.5px; }
        .gm-header-refresh { flex: none; }

        .gm-header-icon { inline-size: 36px; block-size: 36px; }
        .gm-header-updated { display: block; }
        .gm-strips { gap: 9px; }
        .gm-selection { align-items: stretch; flex-direction: column; }
        .gm-selection button { width: 100%; }
        .gm-picker-options { grid-template-columns: 1fr; }
        .gm-picker-footer { flex-wrap: wrap; }
        .gm-picker-footer-actions { width: 100%; }
        .gm-picker-footer-actions > button { flex: 1; }
        .gm-picker-restore { width: 100%; }
        .gm-picker-selected { padding: 10px; }
        .gm-picker-order li { flex-wrap: wrap; }
        .gm-picker-order-name { flex-basis: calc(100% - 40px); }
        .gm-picker-order-actions { margin-inline-start: auto; }

        .sfm-modal-overlay:has(.gm-picker) { --sfm-modal-align: flex-end; --sfm-modal-padding: 0; }
        .gm-picker { --sfm-modal-responsive-width: 100%; width: 100%; max-height: 88dvh; border-end-start-radius: 0; border-end-end-radius: 0; }
      }
    `}</style>
  );
}

export default GlobalMarketsLayoutStyles;
