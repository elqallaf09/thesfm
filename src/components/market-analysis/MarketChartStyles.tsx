'use client';

export function MarketChartStyles() {
  return (
    <style jsx global>{`
      @media (max-width: 1180px) {
        .trader-premium-dashboard .trader-premium-layout,
        .trader-premium-dashboard .trader-premium-panel-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 1024px) {
        .price-history-chart {
          height: 320px;
        }

        .price-history-chart svg {
          height: 250px;
        }
      }

      @media (max-width: 720px) {
        .trader-premium-dashboard .trader-tool-switcher-shell {
          grid-template-columns: 40px minmax(0, 1fr) 40px;
          gap: 7px;
        }

        .trader-premium-dashboard .trader-switcher-arrow {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-card);
        }

        .trader-premium-dashboard .trader-premium-save {
          grid-template-columns: auto minmax(0, 1fr);
        }

        .trader-premium-dashboard .trader-premium-save button {
          grid-column: 1 / -1;
          width: 100%;
        }

        .trader-premium-dashboard .trader-field-group .trader-form-grid,
        .trader-premium-dashboard .tool-result-grid {
          grid-template-columns: 1fr;
        }

        .trader-premium-dashboard .trader-highlight-result strong {
          font-size: 32px;
        }
      }

      .price-history-chart {
        height: clamp(360px, 32vw, 420px);
        min-height: 0;
        border-color: var(--border);
        background:
          var(--surface-elevated);
        box-shadow: var(--shadow-xs);
        padding: 14px;
        gap: 8px;
        align-content: stretch;
        place-items: stretch;
      }

      .market-chart-controls {
        display: flex;
        align-items: flex-start;
        justify-content: flex-end;
        gap: 12px;
        flex-wrap: wrap;
        margin: -4px 0 12px;
        min-width: 0;
      }

      .market-chart-controls .timeframe-row {
        margin: 0;
      }

      .chart-type-control {
        display: grid;
        gap: 7px;
        min-width: 0;
      }

      .chart-type-control > span {
        color: var(--foreground-muted);
        font-size: 12px;
        font-weight: 700;
        line-height: 1.35;
      }

      .chart-type-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        min-width: 0;
      }

      .chart-type-row button {
        flex: 0 0 auto;
        min-height: 34px;
        border: 1px solid var(--border);
        background: var(--surface-muted);
        color: var(--foreground);
        border-radius: var(--radius-pill);
        padding: 7px 11px;
        font: 600 12px var(--font-ui);
        cursor: pointer;
        transition: transform .16s ease, border-color .16s ease, background .16s ease, color .16s ease, box-shadow .16s ease, opacity .16s ease;
        white-space: nowrap;
      }

      .chart-type-row button[aria-pressed="true"],
      .chart-type-row button:hover,
      .chart-type-row button:focus-visible {
        background: var(--primary);
        border-color: transparent;
        color: var(--primary-foreground);
        outline: none;
        box-shadow: var(--focus-shadow);
      }

      .chart-type-row button:active {
        transform: scale(.98);
      }

      .chart-type-row button:disabled {
        cursor: not-allowed;
        opacity: .62;
        background: var(--surface-muted);
        color: var(--foreground-muted);
        border-color: var(--border);
        box-shadow: none;
      }

      .chart-type-helper {
        display: inline-flex;
        width: max-content;
        max-width: 100%;
        border: 1px solid color-mix(in srgb, var(--warning) 28%, var(--border));
        background: var(--warning-soft);
        color: var(--warning);
        border-radius: var(--radius-pill);
        padding: 5px 9px;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.35;
      }

      .price-history-chart svg {
        height: clamp(280px, 25vw, 330px);
        min-height: 0;
        overflow: hidden;
      }

      .price-chart-values {
        margin-bottom: 2px;
      }

      .price-chart-values strong {
        font-size: 18px;
        font-family: var(--font-data) !important;
      }

      .price-chart-grid-line {
        stroke: var(--chart-grid);
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
      }

      .price-chart-grid-line.vertical {
        stroke: var(--chart-grid);
      }

      .price-chart-area-path {
        opacity: 1;
        pointer-events: none;
      }

      .price-chart-line-path {
        fill: none;
        stroke-width: 2.6;
        stroke-linecap: round;
        stroke-linejoin: round;
        vector-effect: non-scaling-stroke;
        filter: none;
        pointer-events: none;
      }

      .price-chart-last-dot {
        fill: var(--surface-elevated);
        stroke: var(--accent);
        stroke-width: 3;
        vector-effect: non-scaling-stroke;
        filter: none;
        pointer-events: none;
      }

      .price-chart-hit-point {
        fill: transparent;
        stroke: transparent;
        cursor: crosshair;
      }

      .price-chart-hit-zone {
        fill: transparent;
        cursor: crosshair;
        pointer-events: all;
      }

      .price-chart-y-label,
      .price-chart-x-label,
      .price-chart-level-label {
        fill: var(--chart-label);
        font: 500 12px var(--font-data);
        opacity: .78;
        direction: ltr;
        unicode-bidi: isolate;
        pointer-events: none;
      }

      .price-chart-x-label {
        font-size: 12px;
        opacity: .68;
      }

      .price-chart-level line {
        stroke-width: 1.4;
        stroke-dasharray: 6 6;
        vector-effect: non-scaling-stroke;
        opacity: .9;
      }

      .price-chart-level.support line,
      .price-chart-level-label.support {
        stroke: var(--success);
        fill: var(--success);
      }

      .price-chart-level.resistance line,
      .price-chart-level-label.resistance {
        stroke: var(--danger);
        fill: var(--danger);
      }

      .price-chart-level.current line,
      .price-chart-level-label.current {
        stroke: var(--primary);
        fill: var(--primary-hover);
        stroke-dasharray: none;
        font-weight: 700;
      }

      .price-chart-level-label {
        paint-order: stroke;
        stroke: var(--surface-elevated);
        stroke-width: 4px;
        font-size: 12px;
      }

      .price-chart-crosshair line {
        stroke: var(--chart-label);
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
        pointer-events: none;
      }

      .price-chart-crosshair circle {
        fill: var(--surface-elevated);
        stroke: var(--primary);
        stroke-width: 2;
        vector-effect: non-scaling-stroke;
        pointer-events: none;
      }

      .price-chart-tooltip {
        position: absolute;
        z-index: 4;
        width: min(230px, calc(100% - 28px));
        transform: translate(-50%, -104%);
        border: 1px solid var(--border);
        border-radius: var(--radius-control);
        background: var(--surface-elevated);
        box-shadow: var(--shadow-popover);
        backdrop-filter: blur(12px);
        padding: 10px;
        pointer-events: none;
      }

      [dir="rtl"] .price-chart-tooltip {
        transform: translate(50%, -104%);
      }

      .price-chart-tooltip strong {
        display: block;
        color: var(--foreground);
        font-size: 12px;
        font-weight: 700;
        line-height: 1.35;
        margin-bottom: 7px;
      }

      .price-chart-tooltip dl {
        margin: 0;
        display: grid;
        gap: 5px;
      }

      .price-chart-tooltip div {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        min-width: 0;
      }

      .price-chart-tooltip dt,
      .price-chart-tooltip dd {
        margin: 0;
        font-size: 12px;
        line-height: 1.25;
      }

      .price-chart-tooltip dt {
        color: var(--foreground-muted);
        font-weight: 600;
      }

      .price-chart-tooltip dd {
        color: var(--foreground);
        font-weight: 700;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .price-candle-wick,
      .price-ohlc-line,
      .price-ohlc-tick {
        stroke-width: 1.8;
        vector-effect: non-scaling-stroke;
        stroke-linecap: round;
        pointer-events: all;
      }

      .price-candle-body {
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
        pointer-events: all;
      }

      .price-candle.up .price-candle-wick,
      .price-candle.up .price-candle-body,
      .price-ohlc.up .price-ohlc-line,
      .price-ohlc.up .price-ohlc-tick {
        stroke: var(--success);
      }

      .price-candle.up .price-candle-body {
        fill: color-mix(in srgb, var(--success) 72%, transparent);
      }

      .price-candle.down .price-candle-wick,
      .price-candle.down .price-candle-body,
      .price-ohlc.down .price-ohlc-line,
      .price-ohlc.down .price-ohlc-tick {
        stroke: var(--danger);
      }

      .price-candle.down .price-candle-body {
        fill: color-mix(in srgb, var(--danger) 70%, transparent);
      }

      .price-chart-state {
        position: relative;
        inset: auto;
        width: min(780px, 100%);
        max-height: 100%;
        overflow: auto;
        align-self: center;
        justify-self: center;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 14px;
        place-items: stretch;
        text-align: start;
        border: 1px solid var(--border);
        background:
          var(--surface-muted);
        box-shadow: var(--shadow-xs);
        border-radius: var(--radius-card);
        color: var(--foreground-muted);
        padding: 18px;
        line-height: 1.8;
      }

      .price-chart-state.error {
        border-color: color-mix(in srgb, var(--warning) 28%, var(--border));
        background:
          var(--warning-soft);
      }

      .price-chart-state-icon {
        width: 48px;
        height: 48px;
        border-radius: var(--radius-card);
        display: grid;
        place-items: center;
        background: var(--primary-soft);
        border: 1px solid var(--border);
        color: var(--primary-hover);
      }

      .price-chart-state.error .price-chart-state-icon {
        background: var(--warning-soft);
        border-color: color-mix(in srgb, var(--warning) 28%, var(--border));
        color: var(--warning);
      }

      .price-chart-state-icon svg {
        width: 22px;
        height: 22px;
        color: currentColor;
      }

      .price-chart-state-copy {
        min-width: 0;
        display: grid;
        gap: 6px;
      }

      .price-chart-state-copy strong {
        color: var(--foreground);
        font-size: clamp(16px, 2vw, 21px);
        font-weight: 700;
        line-height: 1.35;
      }

      .price-chart-state-copy p {
        margin: 0;
        color: var(--foreground-muted);
        font-size: 13px;
        font-weight: 500;
        line-height: 1.8;
      }

      .price-chart-state-copy small {
        width: max-content;
        max-width: 100%;
        border: 1px solid var(--border);
        background: var(--surface-muted);
        color: var(--primary-hover);
        border-radius: var(--radius-pill);
        padding: 5px 9px;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.35;
      }

      .price-chart-summary-grid {
        grid-column: 1 / -1;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(168px, 1fr));
        gap: 9px;
      }

      .price-chart-summary-item {
        min-width: 0;
        overflow: hidden;
        border: 1px solid var(--border);
        background: var(--surface-elevated);
        border-radius: var(--radius-card);
        padding: 10px 11px;
        display: grid;
        gap: 5px;
      }

      .price-chart-summary-item span {
        color: var(--foreground-muted);
        font-size: 12px;
        font-weight: 700;
        line-height: 1.35;
      }

      .price-chart-summary-item b {
        color: var(--foreground);
        font-size: 13px;
        font-weight: 700;
        line-height: 1.35;
        overflow-wrap: normal;
        font-family: var(--font-data) !important;
      }

      .price-chart-summary-item.up b {
        color: var(--success);
      }

      .price-chart-summary-item.down b {
        color: var(--danger);
      }

      .price-chart-state-actions {
        grid-column: 1 / -1;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
      }

      .price-chart-state-actions button {
        min-height: 40px;
        border: 0;
        border-radius: var(--radius-pill);
        background: var(--primary);
        color: var(--primary-foreground);
        padding: 0 15px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        font: 700 12px var(--font-ui);
        cursor: pointer;
        box-shadow: var(--shadow-xs);
      }

      .price-chart-state-actions button:hover,
      .price-chart-state-actions button:focus-visible {
        outline: none;
        transform: translateY(-1px);
        box-shadow: var(--focus-shadow);
      }

      .price-chart-state-actions > span {
        color: var(--foreground-muted);
        font-size: 12px;
        font-weight: 600;
        line-height: 1.6;
      }

      .market-chart .levels-strip {
        margin-top: 16px;
        display: grid;
        gap: 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius-card);
        background:
          var(--surface-muted);
        padding: 13px;
      }

      .levels-strip-labels {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 9px;
      }

      .levels-strip-labels > span {
        min-width: 0;
        overflow: hidden;
        border: 1px solid var(--border);
        background: var(--surface-elevated);
        border-radius: var(--radius-card);
        padding: 12px;
        display: grid;
        gap: 6px;
        align-content: start;
        justify-items: start;
        min-height: 96px;
      }

      [dir="rtl"] .levels-strip-labels > span {
        justify-items: end;
        text-align: end;
      }

      .levels-strip-labels small {
        color: var(--foreground-muted);
        font-size: 12px;
        font-weight: 700;
        line-height: 1.35;
      }

      .levels-strip-labels b {
        color: var(--foreground);
        font-size: 15px;
        font-weight: 700;
        line-height: 1.25;
        overflow-wrap: normal;
        font-family: var(--font-data) !important;
      }

      .levels-strip-labels em {
        color: var(--foreground-muted);
        font-size: 12px;
        font-style: normal;
        font-weight: 700;
        line-height: 1.3;
        font-family: var(--font-data) !important;
      }

      .levels-strip-labels .support b {
        color: var(--success);
      }

      .levels-strip-labels .current b {
        color: var(--primary-hover);
      }

      .levels-strip-labels .resistance b {
        color: var(--danger);
      }

      .levels-bar {
        position: relative;
        height: 46px;
        border-radius: var(--radius-pill);
        background:
          var(--surface-muted);
        border: 1px solid var(--border);
      }

      .levels-bar > span {
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
        display: grid;
        justify-items: center;
        gap: 4px;
        min-width: 72px;
      }

      [dir="rtl"] .levels-bar > span {
        transform: translate(50%, -50%);
      }

      .levels-bar i {
        width: 13px;
        height: 13px;
        border-radius: var(--radius-pill);
        border: 1px solid var(--border);
        box-shadow: var(--shadow-xs);
      }

      .levels-bar .support i {
        background: var(--success);
      }

      .levels-bar .current i {
        width: 18px;
        height: 18px;
        background: var(--primary);
      }

      .levels-bar .resistance i {
        background: var(--danger);
      }

      .levels-bar em {
        border: 1px solid var(--border);
        border-radius: var(--radius-pill);
        background: var(--surface-elevated);
        color: var(--foreground);
        padding: 3px 7px;
        font-size: 12px;
        font-style: normal;
        font-weight: 700;
        line-height: 1.2;
        white-space: nowrap;
      }

      .price-chart-loading {
        display: grid;
        place-items: center;
        gap: 12px;
      }

      .price-chart-loading strong {
        color: var(--foreground);
        font-size: 13px;
        font-weight: 700;
      }

      .price-chart-skeleton {
        width: min(520px, 86%);
        display: grid;
        gap: 10px;
      }

      .price-chart-skeleton span {
        display: block;
        height: 14px;
        border-radius: var(--radius-pill);
        background: var(--surface-hover);
        background-size: 200% 100%;
        animation: marketSkeleton 1.2s ease-in-out infinite;
      }

      .price-chart-skeleton span:nth-child(1) {
        width: 72%;
      }

      .price-chart-skeleton span:nth-child(2) {
        width: 100%;
      }

      .price-chart-skeleton span:nth-child(3) {
        width: 54%;
      }

      @media (max-width: 1024px) {
        .price-history-chart {
          height: 320px;
        }

        .price-history-chart svg {
          height: 250px;
        }
      }

      @media (max-width: 720px) {
        .market-chart-controls {
          display: grid;
          gap: 12px;
        }

        .market-chart-controls .timeframe-row,
        .chart-type-row {
          flex-wrap: nowrap;
          overflow-x: auto;
          overflow-y: hidden;
          padding-bottom: 6px;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }

        .market-chart-controls .timeframe-row::-webkit-scrollbar,
        .chart-type-row::-webkit-scrollbar {
          display: none;
        }

        .price-history-chart {
          height: 260px;
          padding: 10px;
        }

        .price-history-chart svg {
          height: 210px;
          min-height: 0;
        }

        .price-chart-tooltip {
          display: none;
        }

        .price-chart-state {
          grid-template-columns: 1fr;
          padding: 14px;
          gap: 11px;
        }

        .price-chart-state-icon {
          width: 42px;
          height: 42px;
          border-radius: var(--radius-card);
        }

        .price-chart-summary-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .price-chart-state-actions {
          display: grid;
          grid-template-columns: 1fr;
        }

        .price-chart-state-actions button {
          width: 100%;
        }

        .levels-strip-labels {
          grid-template-columns: 1fr;
        }

        .levels-bar {
          height: 40px;
        }

        .levels-bar em {
          display: none;
        }
      }

      .market-numeric-value,
      .metric strong[dir="ltr"],
      .price-chart-values strong,
      .price-chart-axis span,
      .price-chart-summary-item b[dir="ltr"],
      .levels-strip-labels b[dir="ltr"],
      .levels-strip-labels em[dir="ltr"],
      .levels-bar b[dir="ltr"],
      .market-chart-meta b[dir="ltr"] {
        direction: ltr !important;
        unicode-bidi: isolate !important;
        writing-mode: horizontal-tb !important;
        text-orientation: mixed !important;
        white-space: nowrap !important;
        word-break: keep-all !important;
        overflow-wrap: normal !important;
        hyphens: none !important;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0 !important;
        font-family: var(--font-data) !important;
      }

      .metric strong.market-numeric-value,
      .price-chart-summary-item b[dir="ltr"],
      .levels-strip-labels b[dir="ltr"],
      .levels-strip-labels em[dir="ltr"] {
        display: inline-flex !important;
        align-items: center;
        width: auto;
        max-width: 100%;
        font-family: var(--font-data) !important;
      }

      .market-stat-row,
      .indicator-list {
        grid-template-columns: repeat(auto-fit, minmax(156px, 1fr));
      }

      .metric {
        overflow: hidden;
      }

      .metric strong.market-numeric-value {
        min-width: 0;
        font-family: var(--font-data) !important;
      }

      .levels-strip-labels {
        grid-template-columns: repeat(3, minmax(180px, 1fr));
        align-items: stretch;
      }

      .levels-strip-labels > span {
        position: relative;
        z-index: 1;
        overflow: hidden;
      }

      .levels-strip-labels b[dir="ltr"],
      .levels-strip-labels em[dir="ltr"] {
        min-width: 0;
        justify-self: inherit;
        font-family: var(--font-data) !important;
      }

      .levels-bar {
        min-height: 56px;
        height: 56px;
        overflow: hidden !important;
        contain: paint;
        margin-block: 2px 0;
      }

      .levels-bar > span {
        width: max-content;
        min-width: max-content;
        max-width: min(150px, 46%);
        gap: 5px;
      }

      .levels-bar em {
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        width: max-content;
        min-width: max-content;
        max-width: min(150px, 100%);
        white-space: nowrap !important;
        word-break: keep-all !important;
        overflow-wrap: normal !important;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      @media (max-width: 720px) {
        .market-stat-row,
        .indicator-list,
        .levels-strip-labels {
          grid-template-columns: 1fr;
        }

        .levels-bar {
          min-height: 44px;
          height: 44px;
        }

        .levels-bar em {
          display: none !important;
        }
      }

      @keyframes marketSpin {
        to { transform: rotate(360deg); }
      }

      @keyframes marketSkeleton {
        50% { background-position: 100% 0; opacity: .68; }
      }
    `}</style>
  );
}
