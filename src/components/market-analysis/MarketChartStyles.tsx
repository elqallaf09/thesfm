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
          border-radius: var(--r-lg);
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
        border-color: rgba(47, 214, 192, .18);
        background:
          radial-gradient(circle at 12% 0%, rgba(47, 214, 192, .10), transparent 36%),
          linear-gradient(180deg, rgba(255, 255, 255, .94), rgba(239, 248, 255, .76));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, .58), 0 12px 30px rgba(3, 18, 37, .055);
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
        color: var(--sfm-muted);
        font-size: 11px;
        font-weight: 950;
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
        border: 1px solid rgba(29, 140, 255, .18);
        background: var(--sfm-light-card);
        color: var(--sfm-foreground);
        border-radius: 999px;
        padding: 7px 11px;
        font: 900 12px Tajawal, Arial, sans-serif;
        cursor: pointer;
        transition: transform .16s ease, border-color .16s ease, background .16s ease, color .16s ease, box-shadow .16s ease, opacity .16s ease;
        white-space: nowrap;
      }

      .chart-type-row button[aria-pressed="true"],
      .chart-type-row button:hover,
      .chart-type-row button:focus-visible {
        background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
        border-color: transparent;
        color: #FFFFFF;
        outline: none;
        box-shadow: 0 0 0 3px rgba(24, 212, 212, .16);
      }

      .chart-type-row button:active {
        transform: scale(.98);
      }

      .chart-type-row button:disabled {
        cursor: not-allowed;
        opacity: .62;
        background: rgba(226, 232, 240, .72);
        color: #64748B;
        border-color: rgba(148, 163, 184, .22);
        box-shadow: none;
      }

      .chart-type-helper {
        display: inline-flex;
        width: max-content;
        max-width: 100%;
        border: 1px solid rgba(245, 158, 11, .24);
        background: rgba(245, 158, 11, .10);
        color: #92400E;
        border-radius: 999px;
        padding: 5px 9px;
        font-size: 11px;
        font-weight: 950;
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
      }

      .price-chart-grid-line {
        stroke: rgba(15, 118, 110, .13);
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
      }

      .price-chart-grid-line.vertical {
        stroke: rgba(29, 140, 255, .07);
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
        filter: drop-shadow(0 7px 14px rgba(29, 140, 255, .18));
        pointer-events: none;
      }

      .price-chart-last-dot {
        fill: #FFFFFF;
        stroke: #2FD6C0;
        stroke-width: 3;
        vector-effect: non-scaling-stroke;
        filter: drop-shadow(0 5px 12px rgba(29, 140, 255, .20));
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
        fill: var(--sfm-muted);
        font: 850 10px Tajawal, Arial, sans-serif;
        opacity: .78;
        direction: ltr;
        unicode-bidi: isolate;
        pointer-events: none;
      }

      .price-chart-x-label {
        font-size: 9.5px;
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
        stroke: #10B981;
        fill: #047857;
      }

      .price-chart-level.resistance line,
      .price-chart-level-label.resistance {
        stroke: #EF4444;
        fill: #B91C1C;
      }

      .price-chart-level.current line,
      .price-chart-level-label.current {
        stroke: var(--sfm-primary);
        fill: var(--sfm-primary-hover);
        stroke-dasharray: none;
        font-weight: 950;
      }

      .price-chart-level-label {
        paint-order: stroke;
        stroke: rgba(255, 255, 255, .88);
        stroke-width: 4px;
        font-size: 9.5px;
      }

      .price-chart-crosshair line {
        stroke: rgba(15, 23, 42, .26);
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
        pointer-events: none;
      }

      .price-chart-crosshair circle {
        fill: #FFFFFF;
        stroke: var(--sfm-primary);
        stroke-width: 2;
        vector-effect: non-scaling-stroke;
        pointer-events: none;
      }

      .price-chart-tooltip {
        position: absolute;
        z-index: 4;
        width: min(230px, calc(100% - 28px));
        transform: translate(-50%, -104%);
        border: 1px solid rgba(47, 214, 192, .26);
        border-radius: var(--r-md);
        background: rgba(255, 255, 255, .94);
        box-shadow: 0 18px 44px rgba(3, 18, 37, .16);
        backdrop-filter: blur(12px);
        padding: 10px;
        pointer-events: none;
      }

      [dir="rtl"] .price-chart-tooltip {
        transform: translate(50%, -104%);
      }

      .price-chart-tooltip strong {
        display: block;
        color: var(--sfm-foreground);
        font-size: 12px;
        font-weight: 950;
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
        font-size: 11px;
        line-height: 1.25;
      }

      .price-chart-tooltip dt {
        color: var(--sfm-muted);
        font-weight: 900;
      }

      .price-chart-tooltip dd {
        color: var(--sfm-foreground);
        font-weight: 950;
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
        stroke: #0F766E;
      }

      .price-candle.up .price-candle-body {
        fill: rgba(20, 184, 166, .72);
      }

      .price-candle.down .price-candle-wick,
      .price-candle.down .price-candle-body,
      .price-ohlc.down .price-ohlc-line,
      .price-ohlc.down .price-ohlc-tick {
        stroke: #DC2626;
      }

      .price-candle.down .price-candle-body {
        fill: rgba(239, 68, 68, .70);
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
        border: 1px solid rgba(47, 214, 192, .22);
        background:
          radial-gradient(circle at 10% 0%, rgba(47, 214, 192, .12), transparent 34%),
          linear-gradient(135deg, rgba(255, 255, 255, .96), rgba(239, 248, 255, .88));
        box-shadow: 0 18px 44px rgba(3, 18, 37, .09);
        border-radius: var(--r-xl);
        color: var(--sfm-muted);
        padding: 18px;
        line-height: 1.8;
      }

      .price-chart-state.error {
        border-color: rgba(245, 158, 11, .28);
        background:
          radial-gradient(circle at 10% 0%, rgba(245, 158, 11, .12), transparent 34%),
          linear-gradient(135deg, rgba(255, 255, 255, .96), rgba(255, 251, 235, .88));
      }

      .price-chart-state-icon {
        width: 48px;
        height: 48px;
        border-radius: var(--r-xl);
        display: grid;
        place-items: center;
        background: rgba(47, 214, 192, .12);
        border: 1px solid rgba(47, 214, 192, .24);
        color: var(--sfm-primary-hover);
      }

      .price-chart-state.error .price-chart-state-icon {
        background: rgba(245, 158, 11, .12);
        border-color: rgba(245, 158, 11, .24);
        color: #B45309;
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
        color: var(--sfm-foreground);
        font-size: clamp(16px, 2vw, 21px);
        font-weight: 950;
        line-height: 1.35;
      }

      .price-chart-state-copy p {
        margin: 0;
        color: var(--sfm-muted);
        font-size: 13px;
        font-weight: 850;
        line-height: 1.8;
      }

      .price-chart-state-copy small {
        width: max-content;
        max-width: 100%;
        border: 1px solid rgba(29, 140, 255, .16);
        background: rgba(29, 140, 255, .08);
        color: var(--sfm-primary-hover);
        border-radius: 999px;
        padding: 5px 9px;
        font-size: 11px;
        font-weight: 950;
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
        border: 1px solid rgba(167, 243, 240, .16);
        background: rgba(255, 255, 255, .74);
        border-radius: var(--r-lg);
        padding: 10px 11px;
        display: grid;
        gap: 5px;
      }

      .price-chart-summary-item span {
        color: var(--sfm-muted);
        font-size: 11px;
        font-weight: 950;
        line-height: 1.35;
      }

      .price-chart-summary-item b {
        color: var(--sfm-foreground);
        font-size: 13px;
        font-weight: 950;
        line-height: 1.35;
        overflow-wrap: normal;
      }

      .price-chart-summary-item.up b {
        color: #047857;
      }

      .price-chart-summary-item.down b {
        color: #DC2626;
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
        border-radius: 999px;
        background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
        color: #FFFFFF;
        padding: 0 15px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        font: 950 12px Tajawal, Arial, sans-serif;
        cursor: pointer;
        box-shadow: 0 12px 24px rgba(29, 140, 255, .18);
      }

      .price-chart-state-actions button:hover,
      .price-chart-state-actions button:focus-visible {
        outline: none;
        transform: translateY(-1px);
        box-shadow: 0 0 0 3px rgba(24, 212, 212, .16), 0 14px 28px rgba(29, 140, 255, .20);
      }

      .price-chart-state-actions > span {
        color: var(--sfm-muted);
        font-size: 12px;
        font-weight: 900;
        line-height: 1.6;
      }

      .market-chart .levels-strip {
        margin-top: 16px;
        display: grid;
        gap: 12px;
        border: 1px solid rgba(47, 214, 192, .16);
        border-radius: var(--r-xl);
        background:
          radial-gradient(circle at 12% 0%, rgba(47, 214, 192, .10), transparent 34%),
          linear-gradient(135deg, rgba(255, 255, 255, .84), rgba(239, 248, 255, .68));
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
        border: 1px solid rgba(167, 243, 240, .16);
        background: rgba(255, 255, 255, .74);
        border-radius: var(--r-lg);
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
        color: var(--sfm-muted);
        font-size: 11px;
        font-weight: 950;
        line-height: 1.35;
      }

      .levels-strip-labels b {
        color: var(--sfm-foreground);
        font-size: 15px;
        font-weight: 950;
        line-height: 1.25;
        overflow-wrap: normal;
      }

      .levels-strip-labels em {
        color: var(--sfm-muted);
        font-size: 11px;
        font-style: normal;
        font-weight: 950;
        line-height: 1.3;
      }

      .levels-strip-labels .support b {
        color: #047857;
      }

      .levels-strip-labels .current b {
        color: var(--sfm-primary-hover);
      }

      .levels-strip-labels .resistance b {
        color: #B91C1C;
      }

      .levels-bar {
        position: relative;
        height: 46px;
        border-radius: 999px;
        background:
          linear-gradient(90deg, rgba(16, 185, 129, .22), rgba(47, 214, 192, .32), rgba(239, 68, 68, .22)),
          rgba(255, 255, 255, .72);
        border: 1px solid rgba(167, 243, 240, .16);
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
        border-radius: 999px;
        border: 3px solid #FFFFFF;
        box-shadow: 0 8px 16px rgba(3, 18, 37, .16);
      }

      .levels-bar .support i {
        background: #10B981;
      }

      .levels-bar .current i {
        width: 18px;
        height: 18px;
        background: var(--sfm-primary);
      }

      .levels-bar .resistance i {
        background: #EF4444;
      }

      .levels-bar em {
        border: 1px solid rgba(167, 243, 240, .16);
        border-radius: 999px;
        background: rgba(255, 255, 255, .92);
        color: var(--sfm-foreground);
        padding: 3px 7px;
        font-size: 10px;
        font-style: normal;
        font-weight: 950;
        line-height: 1.2;
        white-space: nowrap;
      }

      .price-chart-loading {
        display: grid;
        place-items: center;
        gap: 12px;
      }

      .price-chart-loading strong {
        color: var(--sfm-foreground);
        font-size: 13px;
        font-weight: 950;
      }

      .price-chart-skeleton {
        width: min(520px, 86%);
        display: grid;
        gap: 10px;
      }

      .price-chart-skeleton span {
        display: block;
        height: 14px;
        border-radius: 999px;
        background: linear-gradient(90deg, rgba(29, 140, 255, .10), rgba(47, 214, 192, .24), rgba(29, 140, 255, .10));
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

      .dark .price-history-chart {
        border-color: #1D3050;
        background:
          radial-gradient(circle at 12% 0%, rgba(47, 214, 192, .13), transparent 36%),
          linear-gradient(180deg, rgba(15, 29, 49, .94), rgba(10, 20, 34, .82));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, .05), 0 16px 34px rgba(0, 0, 0, .25);
      }

      .dark .chart-type-row button {
        background: #13243A;
        border-color: #1D3050;
        color: #B8C7D9;
      }

      .dark .chart-type-row button[aria-pressed="true"],
      .dark .chart-type-row button:hover,
      .dark .chart-type-row button:focus-visible {
        background: linear-gradient(135deg, #1D8CFF, #2FD6C0);
        border-color: transparent;
        color: #FFFFFF;
      }

      .dark .chart-type-row button:disabled {
        background: rgba(15, 29, 49, .74);
        border-color: #1D3050;
        color: #8EA6C3;
        opacity: .66;
      }

      .dark .chart-type-helper {
        background: rgba(245, 185, 66, .12);
        border-color: rgba(245, 185, 66, .26);
        color: #F5B942;
      }

      .dark .price-chart-state {
        border-color: #1D3050;
        background:
          radial-gradient(circle at 10% 0%, rgba(47, 214, 192, .12), transparent 34%),
          linear-gradient(135deg, rgba(15, 29, 49, .96), rgba(10, 20, 34, .92));
        box-shadow: 0 20px 52px rgba(0, 0, 0, .26);
      }

      .dark .price-chart-state.error {
        border-color: rgba(245, 185, 66, .26);
        background:
          radial-gradient(circle at 10% 0%, rgba(245, 185, 66, .12), transparent 34%),
          linear-gradient(135deg, rgba(15, 29, 49, .96), rgba(10, 20, 34, .92));
      }

      .dark .price-chart-summary-item {
        background: rgba(10, 20, 34, .74);
        border-color: #1D3050;
      }

      .dark .market-chart .levels-strip {
        background:
          radial-gradient(circle at 12% 0%, rgba(47, 214, 192, .12), transparent 34%),
          linear-gradient(135deg, rgba(15, 29, 49, .92), rgba(10, 20, 34, .82));
        border-color: #1D3050;
      }

      .dark .levels-strip-labels > span,
      .dark .levels-bar {
        background: rgba(10, 20, 34, .74);
        border-color: #1D3050;
      }

      .dark .levels-bar em {
        background: rgba(15, 29, 49, .94);
        border-color: #1D3050;
        color: #E8EEF6;
      }

      .dark .price-chart-grid-line {
        stroke: rgba(184, 199, 217, .14);
      }

      .dark .price-chart-grid-line.vertical {
        stroke: rgba(47, 214, 192, .08);
      }

      .dark .price-chart-y-label {
        fill: #8EA6C3;
        opacity: .88;
      }

      .dark .price-chart-x-label {
        fill: #8EA6C3;
        opacity: .72;
      }

      .dark .price-chart-level-label {
        stroke: rgba(15, 29, 49, .92);
      }

      .dark .price-chart-crosshair line {
        stroke: rgba(184, 199, 217, .28);
      }

      .dark .price-chart-tooltip {
        background: rgba(15, 29, 49, .94);
        border-color: #1D3050;
        box-shadow: 0 18px 44px rgba(0, 0, 0, .34);
      }

      .dark .price-candle.up .price-candle-wick,
      .dark .price-candle.up .price-candle-body,
      .dark .price-ohlc.up .price-ohlc-line,
      .dark .price-ohlc.up .price-ohlc-tick {
        stroke: #2FD6C0;
      }

      .dark .price-candle.up .price-candle-body {
        fill: rgba(47, 214, 192, .58);
      }

      .dark .price-candle.down .price-candle-wick,
      .dark .price-candle.down .price-candle-body,
      .dark .price-ohlc.down .price-ohlc-line,
      .dark .price-ohlc.down .price-ohlc-tick {
        stroke: #FF5B6E;
      }

      .dark .price-candle.down .price-candle-body {
        fill: rgba(255, 91, 110, .56);
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
          border-radius: var(--r-lg);
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
      }

      .metric strong.market-numeric-value,
      .price-chart-summary-item b[dir="ltr"],
      .levels-strip-labels b[dir="ltr"],
      .levels-strip-labels em[dir="ltr"] {
        display: inline-flex !important;
        align-items: center;
        width: auto;
        max-width: 100%;
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
