'use client';

export function MarketPageStyles() {
  return (
    <style jsx global>{`
        .market-shell,
        .market-main {
          max-width: 100%;
          overflow-x: hidden;
        }

        .market-main {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0;
          margin: 0 !important;
          padding: 24px 24px 36px !important;
          box-sizing: border-box;
          justify-items: stretch;
          gap: 18px;
        }

        @media (min-width: 1025px) {
          [dir="rtl"].market-shell .market-main {
            padding-inline-start: 32px !important;
            padding-inline-end: calc(var(--sidebar-w, 230px) + 32px) !important;
          }

          [dir="ltr"].market-shell .market-main {
            padding-inline-start: calc(var(--sidebar-w, 230px) + 32px) !important;
            padding-inline-end: 32px !important;
          }
        }

        .market-main > * {
          box-sizing: border-box;
          width: 100%;
          max-width: 1400px;
          min-width: 0;
          margin-inline: auto;
        }

        .market-hero {
          position: relative !important;
          z-index: 5 !important;
          isolation: isolate;
        }

        .market-hero:before {
          z-index: 0;
          pointer-events: none;
        }

        .market-hero-copy,
        .market-hero-card,
        .market-search-panel {
          position: relative;
          z-index: 2;
        }

        .market-search-field,
        .market-search-combobox,
        .market-search-results {
          isolation: isolate;
        }

        .market-status-grid,
        .market-status-banner,
        .market-active-dashboard,
        .market-layout {
          position: relative;
          z-index: 1;
          isolation: isolate;
        }

        .market-panel.market-chart,
        .market-chart,
        .price-history-chart,
        .market-chart .levels-strip,
        .levels-bar {
          position: relative !important;
          isolation: isolate;
          overflow: hidden !important;
          contain: paint;
        }

        .market-chart .market-section-head,
        .market-chart-controls,
        .price-history-chart > * {
          position: relative;
          z-index: 1;
        }

        .price-history-chart svg {
          display: block;
          width: 100%;
          max-width: 100%;
          overflow: hidden !important;
          contain: paint;
        }

        .price-chart-tooltip {
          z-index: 4;
          max-width: min(260px, calc(100% - 24px));
          max-height: calc(100% - 24px);
          overflow: hidden;
        }

        .levels-strip-labels,
        .levels-strip-labels > span {
          min-width: 0;
        }

        .market-chart .levels-strip .levels-strip-labels > span {
          min-height: 112px;
          align-content: center !important;
          gap: 7px;
          padding-block: 15px;
        }

        .market-chart .levels-strip .levels-strip-labels b,
        .market-chart .levels-strip .levels-strip-labels em {
          position: static !important;
          inset: auto !important;
          top: auto !important;
          width: auto !important;
          height: auto !important;
          min-height: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          transform: none !important;
          overflow: visible !important;
        }

        .market-chart .levels-strip .levels-strip-labels b {
          line-height: 1.35 !important;
        }

        .market-chart .levels-strip .levels-strip-labels em {
          line-height: 1.45 !important;
        }

        .levels-bar > span {
          max-width: calc(100% - 16px);
          z-index: 1;
        }

        .levels-bar em {
          max-width: 128px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .market-active-dashboard {
          width: 100%;
          max-width: 1400px;
          min-width: 0;
          margin-inline: auto;
          display: grid;
          gap: 20px;
          align-items: stretch;
          border: 1px solid rgba(47, 214, 192, .18);
          border-radius: 32px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .84), rgba(234, 246, 255, .68)),
            var(--sfm-card);
          box-shadow: 0 20px 56px rgba(3, 18, 37, .08);
          padding: clamp(16px, 2vw, 24px);
          overflow: hidden;
        }

        .market-active-dashboard > .market-card-grid,
        .market-active-dashboard > .market-panel,
        .market-active-dashboard > .market-bottom-grid,
        .market-active-dashboard > .market-stock-header,
        .market-active-dashboard > .market-decision-grid,
        .market-active-dashboard > .market-layout,
        .market-active-dashboard > .market-tools-grid {
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }

        .market-default-dashboard {
          grid-column: 1 / -1;
          display: grid;
          gap: 18px;
          width: 100%;
          min-width: 0;
        }

        .trader-premium-layout.performance-layout {
          grid-template-columns: minmax(0, 1fr);
          grid-template-areas: "main";
        }

        .performance-layout .trader-premium-main-card,
        .performance-table-section {
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }

        .market-active-dashboard > .market-card-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          align-items: stretch;
        }

        .market-active-dashboard .market-card {
          height: 100%;
          min-height: 148px;
          min-width: 0;
        }

        .performance-table-section {
          display: grid;
          gap: 14px;
        }

        .performance-table-wrap {
          border-radius: 28px;
          border: 1px solid rgba(47, 214, 192, .18);
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .88), rgba(234, 246, 255, .58)),
            var(--sfm-card);
          box-shadow: 0 18px 46px rgba(3, 18, 37, .08);
          padding: 8px;
        }

        .performance-table {
          border-spacing: 0 10px;
          padding: 6px;
        }

        .performance-table th {
          background: transparent;
          color: #475569;
          font-size: 12px;
          letter-spacing: 0;
        }

        .performance-table td {
          background: rgba(255, 255, 255, .92);
          border-block: 1px solid rgba(47, 214, 192, .12);
          box-shadow: 0 8px 22px rgba(3, 18, 37, .045);
        }

        .performance-table td:first-child {
          border-inline-start: 1px solid rgba(47, 214, 192, .12);
        }

        .performance-table td:last-child {
          border-inline-end: 1px solid rgba(47, 214, 192, .12);
        }

        .performance-table tbody tr {
          transition: transform .18s ease, filter .18s ease;
        }

        .performance-table tbody tr:hover {
          transform: translateY(-1px);
          filter: drop-shadow(0 10px 22px rgba(29, 140, 255, .08));
        }

        .dark .performance-table-wrap {
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .10), rgba(47, 214, 192, .07)),
            #0f1d31;
          border-color: #1d3050;
          box-shadow: 0 18px 46px rgba(0, 0, 0, .24);
        }

        .dark .performance-table th {
          color: #b8c7d9;
        }

        .dark .performance-table td {
          background: #10243a;
          border-color: #1d3050;
          box-shadow: none;
        }

        .market-default-modules {
          display: grid;
          gap: 14px;
        }

        .market-default-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-width: 0;
        }

        .market-default-section-head span {
          color: var(--sfm-foreground);
          font-size: 15px;
          font-weight: 950;
          line-height: 1.45;
        }

        .market-quick-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .market-quick-card {
          min-width: 0;
          display: grid;
          gap: 14px;
          align-content: start;
          border: 1px solid rgba(47, 214, 192, .16);
          border-radius: 26px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .78), rgba(234, 246, 255, .55)),
            var(--sfm-card);
          box-shadow: 0 14px 34px rgba(3, 18, 37, .06);
          padding: 18px;
          transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
        }

        .market-quick-card:hover {
          transform: translateY(-2px);
          border-color: rgba(47, 214, 192, .34);
          box-shadow: 0 18px 42px rgba(3, 18, 37, .09);
        }

        .market-quick-icon,
        .market-empty-state-icon,
        .market-hero-card-icon {
          width: 46px;
          height: 46px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          color: #fff;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          box-shadow: 0 14px 28px rgba(29, 140, 255, .18);
          flex: 0 0 auto;
        }

        .market-quick-card h3 {
          margin: 0;
          color: var(--sfm-foreground);
          font-size: 16px;
          font-weight: 950;
          line-height: 1.4;
        }

        .market-quick-card p {
          margin: 6px 0 0;
          color: var(--sfm-muted);
          font-size: 13px;
          font-weight: 850;
          line-height: 1.75;
        }

        .market-quick-card button,
        .market-empty-state button,
        .market-hero-card.empty button {
          width: max-content;
          max-width: 100%;
          border: 1px solid rgba(47, 214, 192, .28);
          border-radius: 999px;
          background: rgba(47, 214, 192, .12);
          color: var(--sfm-primary-hover);
          padding: 9px 14px;
          font: 950 12px Tajawal, Arial, sans-serif;
          cursor: pointer;
          transition: background .2s ease, border-color .2s ease, transform .2s ease;
        }

        .market-quick-card button:hover,
        .market-quick-card button:focus-visible,
        .market-empty-state button:hover,
        .market-empty-state button:focus-visible,
        .market-hero-card.empty button:hover,
        .market-hero-card.empty button:focus-visible {
          outline: none;
          transform: translateY(-1px);
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          border-color: transparent;
          color: #fff;
          box-shadow: 0 0 0 3px rgba(24, 212, 212, .16);
        }

        .market-empty-state {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 16px;
          align-items: center;
          min-width: 0;
          border: 1px solid rgba(47, 214, 192, .18);
          border-radius: 28px;
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .07), rgba(47, 214, 192, .08)),
            var(--sfm-card);
          padding: clamp(18px, 2.3vw, 26px);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .48);
        }

        .market-empty-state div {
          display: grid;
          gap: 8px;
          min-width: 0;
        }

        .market-empty-state strong {
          color: var(--sfm-foreground);
          font-size: clamp(18px, 2vw, 24px);
          font-weight: 950;
          line-height: 1.35;
        }

        .market-empty-state p {
          max-width: 820px;
          margin: 0;
          color: var(--sfm-muted);
          font-size: 14px;
          font-weight: 850;
          line-height: 1.8;
        }

        .market-hero-card.empty {
          align-content: start;
          border-color: rgba(167, 243, 240, .28);
          background: rgba(255, 255, 255, .12);
        }

        .market-hero-card.empty strong {
          font-size: clamp(22px, 3vw, 32px);
          line-height: 1.25;
        }

        .market-hero-card.empty p {
          color: rgba(255, 255, 255, .74);
          line-height: 1.75;
        }

        .market-hero-card.empty button {
          color: #fff;
          border-color: rgba(167, 243, 240, .34);
          background: rgba(167, 243, 240, .14);
        }

        .market-status-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          align-items: stretch;
          gap: 16px !important;
          margin-block: 2px 4px;
        }

        .market-status-card {
          min-height: 126px;
          align-items: flex-start !important;
          gap: 14px !important;
          border-radius: 28px !important;
          border: 1px solid rgba(15, 118, 110, .16) !important;
          background:
            radial-gradient(circle at top right, rgba(47, 214, 192, .16), transparent 42%),
            linear-gradient(135deg, rgba(255, 255, 255, .94), rgba(234, 246, 255, .76)),
            #ffffff !important;
          box-shadow: 0 16px 38px rgba(3, 18, 37, .08) !important;
          padding: 18px !important;
          overflow: hidden;
        }

        .market-status-icon {
          width: 44px !important;
          height: 44px !important;
          border-radius: 18px !important;
          color: #0891b2 !important;
          background: linear-gradient(135deg, rgba(207, 250, 254, .94), rgba(204, 251, 241, .82)) !important;
          border: 1px solid rgba(14, 165, 233, .18) !important;
          box-shadow: 0 10px 24px rgba(8, 145, 178, .10);
        }

        .market-status-body {
          min-width: 0;
          display: grid;
          gap: 7px;
          align-content: start;
        }

        .market-status-body small {
          color: #64748b !important;
          font-size: 12px !important;
          font-weight: 950 !important;
          line-height: 1.35 !important;
        }

        .market-status-value,
        .market-status-badge {
          min-width: 0;
          width: max-content;
          max-width: 100%;
          overflow-wrap: anywhere;
          line-height: 1.25;
        }

        .market-status-value {
          color: #0f172a !important;
          font-size: 19px !important;
          font-weight: 950 !important;
        }

        .market-status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(15, 118, 110, .20);
          background: rgba(204, 251, 241, .72);
          color: #0f766e;
          padding: 7px 11px;
          font-size: 13px;
          font-weight: 950;
        }

        .market-status-badge.success {
          color: #047857;
          background: #ccfbf1;
          border-color: rgba(15, 118, 110, .22);
        }

        .market-status-badge.info {
          color: #0369a1;
          background: #e0f2fe;
          border-color: rgba(14, 165, 233, .22);
        }

        .market-status-badge.warning {
          color: #92400e;
          background: #fef3c7;
          border-color: rgba(245, 158, 11, .24);
        }

        .market-status-badge.danger {
          color: #b91c1c;
          background: #fee2e2;
          border-color: rgba(239, 68, 68, .24);
        }

        .market-status-badge.muted {
          color: #475569;
          background: #f1f5f9;
          border-color: rgba(100, 116, 139, .18);
        }

        .market-status-body p {
          margin: 0;
          color: #475569;
          font-size: 12px;
          font-weight: 850;
          line-height: 1.6;
        }

        .dark .market-status-card {
          background:
            radial-gradient(circle at top right, rgba(47, 214, 192, .12), transparent 44%),
            linear-gradient(135deg, rgba(29, 140, 255, .08), rgba(47, 214, 192, .07)),
            #0f1d31 !important;
          border-color: #1d3050 !important;
          box-shadow: 0 20px 44px rgba(0, 0, 0, .24) !important;
        }

        .dark .market-status-icon {
          color: #2fd6c0 !important;
          background: rgba(47, 214, 192, .12) !important;
          border-color: rgba(47, 214, 192, .25) !important;
          box-shadow: 0 10px 24px rgba(0, 0, 0, .18);
        }

        .dark .market-status-body small {
          color: #8ea6c3 !important;
        }

        .dark .market-status-value {
          color: #e8eef6 !important;
        }

        .dark .market-status-body p {
          color: #b8c7d9;
        }

        .dark .market-status-badge.success {
          color: #2fd6c0;
          background: rgba(47, 214, 192, .12);
          border-color: rgba(47, 214, 192, .25);
        }

        .dark .market-status-badge.info {
          color: #7dd3fc;
          background: rgba(29, 140, 255, .14);
          border-color: rgba(125, 211, 252, .24);
        }

        .dark .market-status-badge.warning {
          color: #f5b942;
          background: rgba(245, 185, 66, .13);
          border-color: rgba(245, 185, 66, .26);
        }

        .dark .market-status-badge.danger {
          color: #ff5b6e;
          background: rgba(255, 91, 110, .12);
          border-color: rgba(255, 91, 110, .25);
        }

        .dark .market-status-badge.muted {
          color: #b8c7d9;
          background: rgba(142, 166, 195, .12);
          border-color: rgba(142, 166, 195, .20);
        }

        .dark .market-active-dashboard,
        .dark .market-quick-card,
        .dark .market-empty-state {
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .08), rgba(47, 214, 192, .07)),
            #0f1d31;
          border-color: #1d3050;
          box-shadow: 0 20px 56px rgba(0, 0, 0, .28);
        }

        .dark .market-quick-card p,
        .dark .market-empty-state p {
          color: #b8c7d9;
        }

        .market-shell {
          background:
            radial-gradient(circle at 92% 0%, rgba(47, 214, 192, .12), transparent 30%),
            radial-gradient(circle at 8% 12%, rgba(29, 140, 255, .10), transparent 28%),
            linear-gradient(180deg, #f8fbff 0%, #eef7ff 46%, #f8fbff 100%) !important;
          color: #0f172a !important;
        }

        .market-main {
          background: transparent !important;
          gap: 18px !important;
        }

        .market-main > *,
        .market-active-dashboard,
        .news-sentiment-section {
          max-width: 1400px !important;
        }

        .market-active-dashboard {
          gap: 16px !important;
          border-radius: 26px !important;
          padding: 16px !important;
        }

        .market-hero {
          background:
            radial-gradient(circle at 12% 10%, rgba(47, 214, 192, .18), transparent 32%),
            linear-gradient(135deg, rgba(255, 255, 255, .97), rgba(234, 246, 255, .92) 58%, rgba(224, 242, 254, .88) 130%) !important;
          color: #0f172a !important;
          border-color: rgba(14, 165, 233, .18) !important;
          box-shadow: 0 20px 56px rgba(3, 18, 37, .08) !important;
          grid-template-columns: minmax(0, 1fr) 220px !important;
          align-items: center !important;
          border-radius: 22px !important;
          padding: 20px !important;
          gap: 16px !important;
        }

        .market-hero:before {
          background: rgba(47, 214, 192, .14) !important;
        }

        .market-hero h1 {
          color: #0f172a !important;
          font-size: clamp(26px, 4vw, 40px) !important;
          line-height: 1.08 !important;
          margin-bottom: 8px !important;
        }

        .market-hero p {
          color: #475569 !important;
          font-size: 13px !important;
          line-height: 1.7 !important;
        }

        .market-eyebrow {
          background: rgba(47, 214, 192, .12) !important;
          border-color: rgba(15, 118, 110, .18) !important;
          color: #0f766e !important;
        }

        .market-search-panel label > span,
        .market-search-field > label {
          color: #0f766e !important;
        }

        .market-hero-card {
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .88), rgba(224, 242, 254, .72)) !important;
          border-color: rgba(14, 165, 233, .20) !important;
          color: #0f172a !important;
          box-shadow: 0 16px 36px rgba(3, 18, 37, .08) !important;
          border-radius: 18px !important;
          padding: 14px !important;
          gap: 7px !important;
        }

        .market-hero-card span {
          color: #64748b !important;
        }

        .market-hero-card strong {
          color: #0f172a !important;
          font-size: 34px !important;
        }

        .market-hero-card p,
        .market-hero-card em {
          color: #475569 !important;
        }

        .market-hero-card-icon {
          color: #0f766e !important;
          background: rgba(204, 251, 241, .72) !important;
          border: 1px solid rgba(15, 118, 110, .16) !important;
          box-shadow: 0 12px 24px rgba(15, 118, 110, .10) !important;
        }

        .market-hero-card.empty {
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .92), rgba(224, 242, 254, .80)) !important;
          border-color: rgba(14, 165, 233, .22) !important;
        }

        .market-hero-card.empty p {
          color: #475569 !important;
        }

        .market-hero-card.empty button {
          color: #0f766e !important;
          background: rgba(204, 251, 241, .72) !important;
          border-color: rgba(15, 118, 110, .22) !important;
        }

        .market-hero-card.empty button:hover,
        .market-hero-card.empty button:focus-visible {
          color: #fff !important;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent)) !important;
          border-color: transparent !important;
        }

        .market-search-panel {
          margin-top: 16px !important;
        }

        .market-status-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 10px !important;
        }

        .market-status-card {
          border-radius: 18px !important;
          padding: 12px !important;
          gap: 10px !important;
          box-shadow: 0 8px 22px rgba(3, 18, 37, .05) !important;
        }

        .market-status-card > span {
          width: 36px !important;
          height: 36px !important;
          border-radius: 14px !important;
        }

        .market-status-card strong {
          font-size: 15px !important;
        }

        .market-status-card small {
          font-size: 11px !important;
        }

        .dark .market-shell {
          background:
            radial-gradient(circle at 92% 0%, rgba(29, 140, 255, .16), transparent 28%),
            radial-gradient(circle at 12% 10%, rgba(47, 214, 192, .10), transparent 30%),
            #0a1422 !important;
          color: #e8eef6 !important;
        }

        .dark .market-hero {
          background:
            radial-gradient(circle at 12% 10%, rgba(24, 212, 212, .22), transparent 30%),
            linear-gradient(135deg, #071426 0%, #08203a 58%, #0f3650 150%) !important;
          color: #e8eef6 !important;
          border-color: rgba(47, 214, 192, .22) !important;
          box-shadow: 0 24px 64px rgba(0, 0, 0, .32) !important;
        }

        .dark .market-hero:before {
          background: rgba(47, 214, 192, .14) !important;
        }

        .dark .market-hero h1 {
          color: #f8fbff !important;
        }

        .dark .market-hero p {
          color: rgba(232, 238, 246, .72) !important;
        }

        .dark .market-eyebrow {
          background: rgba(47, 214, 192, .12) !important;
          border-color: rgba(47, 214, 192, .24) !important;
          color: #2fd6c0 !important;
        }

        .dark .market-search-panel label > span,
        .dark .market-search-field > label {
          color: #2fd6c0 !important;
        }

        .dark .market-hero-card {
          background:
            linear-gradient(135deg, rgba(15, 29, 49, .72), rgba(10, 20, 34, .82)) !important;
          border-color: rgba(47, 214, 192, .22) !important;
          color: #e8eef6 !important;
          box-shadow: 0 20px 52px rgba(0, 0, 0, .28) !important;
        }

        .dark .market-hero-card span {
          color: #8ea6c3 !important;
        }

        .dark .market-hero-card strong {
          color: #2fd6c0 !important;
        }

        .dark .market-hero-card p,
        .dark .market-hero-card em {
          color: #b8c7d9 !important;
        }

        .dark .market-hero-card-icon {
          color: #2fd6c0 !important;
          background: rgba(47, 214, 192, .12) !important;
          border-color: rgba(47, 214, 192, .24) !important;
          box-shadow: 0 14px 28px rgba(0, 0, 0, .20) !important;
        }

        .dark .market-hero-card.empty {
          background:
            linear-gradient(135deg, rgba(15, 29, 49, .78), rgba(10, 20, 34, .86)) !important;
          border-color: rgba(47, 214, 192, .24) !important;
        }

        .dark .market-hero-card.empty p {
          color: #b8c7d9 !important;
        }

        .dark .market-hero-card.empty button {
          color: #e8eef6 !important;
          background: rgba(47, 214, 192, .14) !important;
          border-color: rgba(47, 214, 192, .28) !important;
        }

        .dark .market-error-alert {
          background:
            linear-gradient(135deg, rgba(245, 185, 66, .12), rgba(47, 214, 192, .07)),
            #0f1d31;
          border-color: rgba(245, 185, 66, .24);
          color: #F5B942;
        }

        .dark .market-error-alert-icon {
          color: #F5B942;
          background: rgba(245, 185, 66, .13);
          border-color: rgba(245, 185, 66, .26);
        }

        .dark .market-error-alert-copy strong {
          color: #FDE68A;
        }

        .dark .market-error-alert-copy p {
          color: #F5B942;
        }

        .market-dashboard-tabs {
          width: 100% !important;
          max-width: 1400px !important;
          min-width: 0 !important;
          margin-inline: auto !important;
          border-radius: 28px !important;
          padding: 10px !important;
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .055), rgba(47, 214, 192, .075)),
            var(--sfm-card) !important;
          box-shadow: 0 16px 42px rgba(3, 18, 37, .07) !important;
        }

        .market-error-alert {
          width: 100%;
          max-width: 1400px;
          margin-inline: auto;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: start;
          gap: 14px;
          border: 1px solid rgba(245, 158, 11, .26);
          border-radius: 22px;
          background:
            linear-gradient(135deg, rgba(255, 251, 235, .92), rgba(240, 253, 250, .72)),
            var(--sfm-card);
          box-shadow: 0 14px 36px rgba(3, 18, 37, .07);
          padding: 15px;
          color: #92400E;
          min-width: 0;
        }

        .market-error-alert-icon {
          width: 42px;
          height: 42px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          color: #B45309;
          background: rgba(245, 158, 11, .14);
          border: 1px solid rgba(245, 158, 11, .22);
          flex: 0 0 auto;
        }

        .market-error-alert-copy {
          min-width: 0;
          display: grid;
          gap: 4px;
        }

        .market-error-alert-copy strong {
          color: #78350F;
          font-size: 15px;
          font-weight: 950;
          line-height: 1.35;
        }

        .market-error-alert-copy p {
          margin: 0;
          color: #92400E;
          font-size: 13px;
          font-weight: 850;
          line-height: 1.75;
          overflow-wrap: anywhere;
        }

        .market-error-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
          min-width: 0;
        }

        .market-error-action {
          min-height: 38px;
          border-radius: 999px;
          padding: 0 13px;
          font: 950 12px Tajawal, Arial, sans-serif;
          cursor: pointer;
          white-space: nowrap;
          border: 1px solid transparent;
        }

        .market-error-action.primary {
          background: var(--sfm-foreground);
          color: var(--sfm-card);
        }

        .market-error-action.secondary {
          background: rgba(47, 214, 192, .12);
          color: var(--sfm-primary-hover);
          border-color: rgba(47, 214, 192, .28);
        }

        .market-error-action:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .market-error-alert .market-suggestion-chips {
          grid-column: 2 / -1;
          flex-basis: auto;
        }

        .market-error-alert .market-suggestion-chips button {
          height: auto;
          min-height: 34px;
          max-width: 100%;
          white-space: normal;
          text-align: start;
          line-height: 1.35;
        }

        .market-focused-tab,
        .market-bottom-grid.news-sentiment-dashboard > .market-panel {
          min-height: 260px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .74), rgba(234, 246, 255, .60)),
            var(--sfm-card);
        }

        .news-sentiment-dashboard {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        .news-sentiment-section {
          width: 100%;
          max-width: 1400px;
          min-width: 0;
          margin-inline: auto;
          padding-inline: 0;
          overflow: hidden;
        }

        .news-sentiment-shell {
          display: grid;
          gap: 18px;
          overflow: hidden;
          width: 100%;
          min-width: 0;
          border-radius: 32px !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .82), rgba(234, 246, 255, .68)),
            var(--sfm-card) !important;
          border-color: rgba(47, 214, 192, .18) !important;
          box-shadow: 0 20px 56px rgba(3, 18, 37, .08) !important;
        }

        .news-sentiment-head {
          align-items: center;
          border: 1px solid rgba(47, 214, 192, .16);
          border-radius: 24px;
          background: rgba(47, 214, 192, .07);
          padding: 14px;
          margin-bottom: 0;
        }

        .news-sentiment-head-icon,
        .news-tool-card-head > span,
        .tool-empty-state > span {
          width: 44px;
          height: 44px;
          border-radius: 17px;
          display: grid;
          place-items: center;
          color: #fff;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          box-shadow: 0 14px 28px rgba(29, 140, 255, .18);
          flex: 0 0 auto;
        }

        .news-sentiment-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          align-items: start;
          min-width: 0;
        }

        .news-tool-card {
          min-width: 0;
          align-self: start;
          display: grid;
          gap: 14px;
          align-content: start;
          height: auto;
          border: 1px solid rgba(47, 214, 192, .16);
          border-radius: 26px;
          padding: clamp(15px, 1.8vw, 20px);
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .76), rgba(234, 246, 255, .54)),
            var(--sfm-card);
          box-shadow: 0 14px 34px rgba(3, 18, 37, .06);
        }

        .sentiment-tool-card {
          min-height: 0;
        }

        .sentiment-tool-card .tool-empty-state {
          min-height: 0;
        }

        .sentiment-tool-card .market-section-loading {
          min-height: 180px;
        }

        .sentiment-context-block {
          display: grid;
          gap: 9px;
          min-width: 0;
          border: 1px solid rgba(47, 214, 192, .16);
          border-radius: 20px;
          background:
            linear-gradient(135deg, rgba(47, 214, 192, .07), rgba(29, 140, 255, .05)),
            var(--sfm-light-card);
          padding: 10px;
        }

        .sentiment-selected-asset {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          min-width: 0;
          border: 0;
          border-radius: 14px;
          background: rgba(255, 255, 255, .58);
          padding: 8px 10px;
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 850;
          line-height: 1.45;
        }

        .sentiment-selected-asset b {
          color: var(--sfm-foreground);
          font-size: 14px;
          font-weight: 950;
          letter-spacing: .02em;
        }

        .sentiment-selected-asset small {
          min-width: 0;
          overflow-wrap: anywhere;
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 800;
        }

        .sentiment-context-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
          gap: 8px;
          min-width: 0;
        }

        .sentiment-context-badge {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          border: 1px solid rgba(47, 214, 192, .18);
          border-radius: 14px;
          background: rgba(47, 214, 192, .09);
          padding: 8px 10px;
        }

        .sentiment-context-badge.source {
          border-color: rgba(29, 140, 255, .18);
          background: rgba(29, 140, 255, .08);
        }

        .sentiment-context-badge.status.connected {
          border-color: rgba(34, 197, 94, .22);
          background: rgba(34, 197, 94, .08);
        }

        .sentiment-context-badge.status.limited {
          border-color: rgba(245, 158, 11, .24);
          background: rgba(245, 158, 11, .10);
        }

        .sentiment-context-badge.status.timeout {
          border-color: rgba(245, 158, 11, .28);
          background: rgba(245, 158, 11, .12);
        }

        .sentiment-context-badge.status.needs-setup,
        .sentiment-context-badge.status.disconnected {
          border-color: rgba(239, 68, 68, .20);
          background: rgba(239, 68, 68, .07);
        }

        .sentiment-context-badge small {
          min-width: 0;
          color: var(--sfm-muted);
          font-size: 11px;
          font-weight: 900;
          line-height: 1.3;
        }

        .sentiment-context-badge b {
          min-width: 0;
          color: var(--sfm-foreground);
          font-size: 12px;
          font-weight: 950;
          line-height: 1.3;
          text-align: end;
          overflow-wrap: anywhere;
        }

        .sentiment-context-note {
          margin: 0;
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 820;
          line-height: 1.7;
        }

        .sentiment-updated-note {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          width: max-content;
          max-width: 100%;
          border: 1px solid rgba(29, 140, 255, .16);
          border-radius: 999px;
          background: rgba(29, 140, 255, .07);
          color: var(--sfm-primary-hover);
          padding: 5px 9px;
          font-weight: 950;
        }

        .sentiment-updated-note svg {
          flex: 0 0 auto;
        }

        .sentiment-cache-note {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          width: fit-content;
          max-width: 100%;
          border: 1px solid rgba(245, 158, 11, .22);
          border-radius: 14px;
          background: rgba(245, 158, 11, .09);
          color: #9A5F04;
          padding: 7px 9px;
          font-weight: 900;
        }

        .sentiment-cache-note svg {
          flex: 0 0 auto;
        }

        .news-tool-card-head {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          min-width: 0;
        }

        .news-tool-card-head div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .news-tool-card-head small {
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 900;
          line-height: 1.45;
        }

        .news-tool-card-head h3 {
          margin: 0;
          color: var(--sfm-foreground);
          font-size: 18px;
          font-weight: 950;
          line-height: 1.35;
        }

        .tool-empty-state {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 14px;
          align-items: flex-start;
          min-width: 0;
          border: 1px solid rgba(47, 214, 192, .18);
          border-radius: 24px;
          padding: 16px;
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .07), rgba(47, 214, 192, .08)),
            var(--sfm-light-card);
        }

        .tool-empty-state.info {
          border-color: rgba(29, 140, 255, .20);
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .075), rgba(47, 214, 192, .08)),
            var(--sfm-light-card);
        }

        .tool-empty-state.warning {
          border-color: rgba(245, 158, 11, .26);
          background:
            linear-gradient(135deg, rgba(245, 158, 11, .12), rgba(47, 214, 192, .05)),
            var(--sfm-light-card);
        }

        .tool-empty-state div {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .tool-empty-state strong {
          color: var(--sfm-foreground);
          font-size: 16px;
          font-weight: 950;
          line-height: 1.45;
        }

        .tool-empty-state p {
          margin: 0;
          color: var(--sfm-muted);
          font-size: 13px;
          font-weight: 850;
          line-height: 1.8;
        }

        .tool-empty-state small {
          width: max-content;
          max-width: 100%;
          border: 1px solid rgba(29, 140, 255, .18);
          border-radius: 999px;
          background: rgba(29, 140, 255, .07);
          color: var(--sfm-primary-hover);
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 950;
          line-height: 1.35;
        }

        .tool-empty-state button {
          width: max-content;
          max-width: 100%;
          border: 0;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #fff;
          padding: 9px 13px;
          font: 950 12px Tajawal, Arial, sans-serif;
          cursor: pointer;
        }

        .central-news-list,
        .sentiment-card-list {
          display: grid;
          gap: 12px;
          min-width: 0;
        }

        .central-news-card,
        .sentiment-card {
          min-width: 0;
          display: grid;
          gap: 11px;
          border: 1px solid rgba(167, 243, 240, .14);
          border-radius: 22px;
          padding: 14px;
          background: var(--sfm-light-card);
        }

        .central-news-meta,
        .central-news-footer,
        .sentiment-metrics,
        .sentiment-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-width: 0;
          flex-wrap: wrap;
        }

        .central-news-meta span,
        .sentiment-badge {
          display: inline-flex;
          width: max-content;
          max-width: 100%;
          align-items: center;
          border: 1px solid rgba(47, 214, 192, .22);
          border-radius: 999px;
          background: rgba(47, 214, 192, .10);
          color: var(--sfm-primary-hover);
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 950;
          line-height: 1.3;
        }

        .central-news-meta small,
        .central-news-footer small,
        .sentiment-card-head span,
        .sentiment-card p,
        .sentiment-metrics span {
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 850;
          line-height: 1.55;
        }

        .central-news-card h4,
        .sentiment-card-head b {
          margin: 0;
          color: var(--sfm-foreground);
          font-size: 15px;
          font-weight: 950;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }

        .central-news-card p,
        .sentiment-card p {
          margin: 0;
          color: var(--sfm-muted);
          font-size: 13px;
          font-weight: 850;
          line-height: 1.75;
        }

        .central-news-footer a {
          color: var(--sfm-primary-hover);
          font-size: 12px;
          font-weight: 950;
          text-decoration: none;
        }

        .central-news-footer a:hover,
        .central-news-footer a:focus-visible {
          text-decoration: underline;
          outline: none;
        }

        .sentiment-card-head > div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .sentiment-badge.buy {
          color: #047857;
          background: #CCFBF1;
          border-color: rgba(15, 118, 110, .22);
        }

        .sentiment-badge.sell {
          color: #DC2626;
          background: #FEE2E2;
          border-color: rgba(220, 38, 38, .20);
        }

        .sentiment-badge.balanced {
          color: var(--sfm-primary-hover);
          background: rgba(29, 140, 255, .10);
          border-color: rgba(29, 140, 255, .18);
        }

        .sentiment-metrics b {
          color: var(--sfm-foreground);
          font-size: 13px;
          font-weight: 950;
        }

        .sentiment-extra-metrics {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          min-width: 0;
        }

        .sentiment-extra-metrics span {
          min-width: 0;
          display: grid;
          gap: 3px;
          border: 1px solid rgba(29, 140, 255, .14);
          border-radius: 14px;
          background: rgba(29, 140, 255, .055);
          padding: 7px 9px;
        }

        .sentiment-extra-metrics small {
          min-width: 0;
          color: var(--sfm-muted);
          font-size: 10.5px;
          font-weight: 900;
          line-height: 1.35;
        }

        .sentiment-extra-metrics b {
          min-width: 0;
          color: var(--sfm-foreground);
          font-size: 12px;
          font-weight: 950;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .sentiment-bar {
          display: flex;
          width: 100%;
          height: 10px;
          overflow: hidden;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, .15);
          background: rgba(148, 163, 184, .12);
        }

        .sentiment-bar i,
        .sentiment-bar b {
          display: block;
          min-width: 3px;
          height: 100%;
        }

        .sentiment-bar i {
          background: linear-gradient(135deg, #22C55E, var(--sfm-accent));
        }

        .sentiment-bar b {
          background: linear-gradient(135deg, #EF4444, #F97316);
        }

        .sentiment-info-card {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          min-width: 0;
          border: 1px solid rgba(29, 140, 255, .20);
          border-radius: 20px;
          padding: 13px;
          background: rgba(29, 140, 255, .08);
          color: var(--sfm-primary-hover);
        }

        .sentiment-info-card svg {
          flex: 0 0 auto;
          margin-top: 2px;
        }

        .sentiment-info-card p {
          margin: 0;
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 850;
          line-height: 1.7;
        }

        .sentiment-empty-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          min-width: 0;
        }

        .sentiment-card-actions {
          padding-top: 2px;
        }

        .sentiment-empty-actions button {
          min-height: 36px;
          max-width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 1px solid rgba(47, 214, 192, .22);
          border-radius: 999px;
          background: rgba(255, 255, 255, .72);
          color: var(--sfm-primary-hover);
          padding: 8px 12px;
          font: 950 12px Tajawal, Arial, sans-serif;
          cursor: pointer;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
        }

        .sentiment-empty-actions button:first-child {
          border-color: transparent;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #fff;
          box-shadow: 0 12px 24px rgba(29, 140, 255, .16);
        }

        .sentiment-empty-actions button:hover,
        .sentiment-empty-actions button:focus-visible {
          transform: translateY(-1px);
          border-color: rgba(29, 140, 255, .30);
          box-shadow: 0 12px 24px rgba(3, 18, 37, .08);
          outline: none;
        }

        .sentiment-empty-actions button:disabled {
          cursor: not-allowed;
          opacity: .62;
          transform: none;
          box-shadow: none;
        }

        .sentiment-empty-actions button:active {
          transform: translateY(0);
        }

        .trading-sessions-dashboard {
          display: grid;
          gap: 18px;
          overflow: hidden;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .78), rgba(234, 246, 255, .62)),
            var(--sfm-card);
          border-radius: 30px;
        }

        .session-card-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          min-width: 0;
        }

        .session-card {
          display: grid;
          gap: 14px;
          min-width: 0;
          border: 1px solid rgba(167, 243, 240, .16);
          border-radius: 24px;
          padding: 15px;
          background: var(--sfm-card);
          box-shadow: 0 14px 34px rgba(3, 18, 37, .06);
        }

        .session-card.open {
          border-color: rgba(47, 214, 192, .34);
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .07), rgba(47, 214, 192, .12)),
            var(--sfm-card);
        }

        .session-card-head {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .session-card-head div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .session-card-head strong {
          color: var(--sfm-foreground);
          font-size: 15px;
          font-weight: 950;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .session-card-head small {
          color: var(--sfm-muted);
          font-size: 11px;
          font-weight: 900;
          line-height: 1.35;
        }

        .session-icon {
          width: 38px;
          height: 38px;
          border-radius: 15px;
          display: grid;
          place-items: center;
          color: var(--sfm-soft-cyan);
          background: rgba(47, 214, 192, .12);
          border: 1px solid rgba(47, 214, 192, .20);
        }

        .session-progress {
          height: 9px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(148, 163, 184, .16);
          border: 1px solid rgba(148, 163, 184, .14);
        }

        .session-progress i {
          display: block;
          height: 100%;
          min-width: 8px;
          border-radius: inherit;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          transition: width .3s ease;
        }

        .session-card.closed .session-progress i {
          opacity: .28;
          width: 8px !important;
        }

        .session-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .session-metric {
          min-width: 0;
          border: 1px solid rgba(167, 243, 240, .13);
          border-radius: 16px;
          background: var(--sfm-light-card);
          padding: 10px;
          display: grid;
          gap: 5px;
        }

        .session-metric span {
          color: var(--sfm-muted);
          font-size: 10.5px;
          font-weight: 950;
          line-height: 1.35;
        }

        .session-metric strong {
          color: var(--sfm-foreground);
          font-size: 13px;
          font-weight: 950;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .session-overlap-panel {
          display: grid;
          gap: 12px;
          border: 1px solid rgba(47, 214, 192, .16);
          border-radius: 24px;
          padding: 14px;
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .045), rgba(47, 214, 192, .07)),
            var(--sfm-light-card);
          min-width: 0;
        }

        .session-overlap-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          min-width: 0;
        }

        .session-overlap-head strong {
          color: var(--sfm-foreground);
          font-size: 14px;
          font-weight: 950;
          line-height: 1.45;
        }

        .session-overlap-head span {
          max-width: 520px;
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 850;
          line-height: 1.65;
        }

        .session-overlap-timeline {
          position: relative;
          height: 46px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(148, 163, 184, .12);
          border: 1px solid rgba(167, 243, 240, .14);
        }

        .session-overlap-timeline span {
          position: absolute;
          top: 8px;
          bottom: 8px;
          border-radius: 999px;
          background: rgba(148, 163, 184, .22);
        }

        .session-overlap-timeline span.active {
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          box-shadow: 0 0 22px rgba(47, 214, 192, .32);
        }

        .dark .market-focused-tab,
        .dark .market-bottom-grid.news-sentiment-dashboard > .market-panel,
        .dark .news-sentiment-shell,
        .dark .news-tool-card,
        .dark .trading-sessions-dashboard,
        .dark .session-card,
        .dark .session-card.open {
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .08), rgba(47, 214, 192, .07)),
            #0f1d31;
          border-color: #1d3050;
        }

        .dark .session-metric,
        .dark .session-overlap-panel,
        .dark .central-news-card,
        .dark .sentiment-card,
        .dark .sentiment-selected-asset,
        .dark .tool-empty-state {
          background: #0a1422;
          border-color: #1d3050;
        }

        .dark .sentiment-selected-asset {
          background: rgba(47, 214, 192, .09);
          color: #b8c7d9;
        }

        .dark .sentiment-selected-asset b {
          color: #e8eef6;
        }

        .dark .sentiment-selected-asset small {
          color: #8ea6c3;
        }

        .dark .tool-empty-state.info {
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .11), rgba(47, 214, 192, .08)),
            #0a1422;
          border-color: rgba(47, 214, 192, .22);
        }

        .dark .tool-empty-state.warning {
          background:
            linear-gradient(135deg, rgba(245, 185, 66, .12), rgba(47, 214, 192, .05)),
            #0a1422;
          border-color: rgba(245, 185, 66, .24);
        }

        .dark .news-sentiment-head {
          background: rgba(47, 214, 192, .08);
          border-color: #1d3050;
        }

        .dark .tool-empty-state p,
        .dark .tool-empty-state small,
        .dark .central-news-meta small,
        .dark .central-news-footer small,
        .dark .central-news-card p,
        .dark .sentiment-card-head span,
        .dark .sentiment-card p,
        .dark .sentiment-metrics span,
        .dark .sentiment-extra-metrics small,
        .dark .sentiment-info-card p {
          color: #b8c7d9;
        }

        .dark .sentiment-badge.buy {
          background: rgba(47, 214, 192, .12);
          color: #2FD6C0;
          border-color: rgba(47, 214, 192, .25);
        }

        .dark .sentiment-badge.sell {
          background: rgba(255, 91, 110, .12);
          color: #FF5B6E;
          border-color: rgba(255, 91, 110, .25);
        }

        .dark .sentiment-info-card {
          background: rgba(29, 140, 255, .10);
          border-color: rgba(29, 140, 255, .24);
        }

        .dark .sentiment-context-block,
        .dark .sentiment-selected-asset,
        .dark .sentiment-empty-actions button {
          background: linear-gradient(135deg, rgba(29, 140, 255, .08), rgba(47, 214, 192, .07)), #0a1422;
          border-color: #1d3050;
        }

        .dark .sentiment-context-badge {
          background: rgba(47, 214, 192, .10);
          border-color: rgba(47, 214, 192, .24);
        }

        .dark .sentiment-context-badge.source {
          background: rgba(29, 140, 255, .10);
          border-color: rgba(29, 140, 255, .24);
        }

        .dark .sentiment-context-badge.status.connected {
          background: rgba(34, 197, 94, .12);
          border-color: rgba(34, 197, 94, .28);
        }

        .dark .sentiment-context-badge.status.limited,
        .dark .sentiment-context-badge.status.timeout,
        .dark .sentiment-cache-note {
          background: rgba(245, 158, 11, .13);
          border-color: rgba(245, 158, 11, .30);
          color: #FCD34D;
        }

        .dark .sentiment-context-badge.status.needs-setup,
        .dark .sentiment-context-badge.status.disconnected {
          background: rgba(239, 68, 68, .12);
          border-color: rgba(239, 68, 68, .26);
        }

        .dark .sentiment-extra-metrics span {
          background: rgba(29, 140, 255, .08);
          border-color: rgba(29, 140, 255, .22);
        }

        .dark .sentiment-empty-actions button:first-child {
          border-color: transparent;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #fff;
        }

        @media (max-width: 1180px) {
          .market-active-dashboard > .market-card-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .market-status-grid,
          .market-quick-grid,
          .session-card-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .news-sentiment-dashboard {
            grid-template-columns: 1fr !important;
          }

          .news-sentiment-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 1024px) {
          .market-shell .market-main {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: calc(88px + env(safe-area-inset-top)) 16px 22px !important;
          }

          .market-main > *,
          .market-active-dashboard,
          .news-sentiment-section {
            max-width: 100% !important;
          }
        }

        @media (max-width: 720px) {
          .market-main {
            gap: 16px !important;
            padding-inline: 14px !important;
          }

          .market-chart .levels-strip .levels-strip-labels > span {
            min-height: 118px;
            padding: 16px 18px;
          }

          .market-active-dashboard > .market-card-grid {
            grid-template-columns: 1fr;
          }

          .market-hero {
            grid-template-columns: 1fr !important;
            padding: 16px !important;
            border-radius: 20px !important;
          }

          .market-hero-card strong {
            font-size: 30px !important;
          }

          .market-error-alert {
            grid-template-columns: 1fr;
            gap: 11px;
            border-radius: 20px;
            padding: 13px;
          }

          .market-error-alert-icon {
            width: 38px;
            height: 38px;
            border-radius: 14px;
          }

          .market-error-actions,
          .market-error-action {
            width: 100%;
          }

          .market-error-alert .market-suggestion-chips {
            grid-column: 1;
          }

          .market-status-grid,
          .market-quick-grid,
          .session-card-grid,
          .session-metrics {
            grid-template-columns: 1fr !important;
          }

          .market-active-dashboard {
            border-radius: 24px;
            padding: 14px;
          }

          .performance-table-wrap {
            overflow: visible;
            padding: 10px;
            border-radius: 22px;
          }

          .performance-table,
          .performance-table thead,
          .performance-table tbody,
          .performance-table tr,
          .performance-table td {
            display: block;
            width: 100%;
            min-width: 0;
          }

          .performance-table {
            padding: 0;
            border-spacing: 0;
          }

          .performance-table thead {
            position: absolute;
            width: 1px;
            height: 1px;
            overflow: hidden;
            clip: rect(0 0 0 0);
            white-space: nowrap;
          }

          .performance-table tbody {
            display: grid;
            gap: 12px;
          }

          .performance-table tbody tr {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            border: 1px solid rgba(47, 214, 192, .16);
            border-radius: 20px;
            background: rgba(255, 255, 255, .9);
            padding: 12px;
            box-shadow: 0 10px 28px rgba(3, 18, 37, .06);
          }

          .performance-table tbody tr:hover {
            transform: none;
            filter: none;
          }

          .performance-table td,
          .performance-table td:first-child,
          .performance-table td:last-child {
            display: grid;
            gap: 5px;
            border: 1px solid rgba(47, 214, 192, .12);
            border-radius: 15px;
            background: var(--sfm-light-card);
            padding: 11px;
            box-shadow: none;
            white-space: normal;
            overflow-wrap: anywhere;
          }

          .performance-table td::before {
            content: attr(data-label);
            color: var(--sfm-muted);
            font-size: 11px;
            font-weight: 950;
            line-height: 1.35;
          }

          .performance-table td:nth-child(2) {
            color: var(--sfm-foreground);
            font-weight: 950;
          }

          .dark .performance-table tbody tr {
            background: #0f1d31;
            border-color: #1d3050;
            box-shadow: none;
          }

          .dark .performance-table td,
          .dark .performance-table td:first-child,
          .dark .performance-table td:last-child {
            background: #0a1422;
            border-color: #1d3050;
          }

          .market-empty-state {
            grid-template-columns: 1fr;
            justify-items: start;
            border-radius: 22px;
          }

          .news-sentiment-shell {
            border-radius: 24px !important;
            padding: 16px;
          }

          .news-sentiment-section {
            padding-inline: 0;
          }

          .news-sentiment-head,
          .news-tool-card-head,
          .tool-empty-state {
            grid-template-columns: 1fr;
          }

          .news-tool-card {
            border-radius: 22px;
            padding: 15px;
          }

          .sentiment-tool-card .market-section-loading {
            min-height: 160px;
          }

          .sentiment-context-row {
            grid-template-columns: 1fr;
          }

          .sentiment-extra-metrics {
            grid-template-columns: 1fr;
          }

          .sentiment-empty-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .sentiment-empty-actions button {
            width: 100%;
            min-height: 40px;
          }

          .tool-empty-state {
            display: grid;
            grid-template-columns: 1fr;
            border-radius: 20px;
          }

          .market-empty-state-icon,
          .market-quick-icon,
          .market-hero-card-icon {
            width: 42px;
            height: 42px;
            border-radius: 16px;
          }

          .market-quick-card {
            border-radius: 22px;
            padding: 16px;
          }

          .market-dashboard-tabs {
            border-radius: 22px !important;
            padding: 8px !important;
          }

          .session-card {
            border-radius: 20px;
            padding: 14px;
          }

          .session-card-head {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .session-card-head .session-badge {
            grid-column: 1 / -1;
            justify-self: start;
          }

          .session-overlap-head {
            display: grid;
          }

          .session-overlap-head span {
            max-width: 100%;
          }

          .session-overlap-timeline {
            height: 40px;
          }
        }
      `}</style>
  );
}
