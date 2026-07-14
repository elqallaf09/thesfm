'use client';

export function MarketBaseStyles() {
  return (
    <style jsx global>{`
      .market-section-refresh {
        margin-inline-start: auto;
        min-height: 38px;
        border: 1px solid var(--border);
        border-radius: var(--radius-pill);
        background: var(--primary-soft);
        color: var(--primary-hover);
        padding: 0 12px;
        font: 700 12px var(--font-ui);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        cursor: pointer;
        white-space: nowrap;
        transition: border-color .18s ease, background .18s ease, box-shadow .18s ease;
      }

      .market-section-refresh:hover,
      .market-section-refresh:focus-visible {
        outline: none;
        background: var(--primary);
        border-color: var(--accent);
        color: var(--primary-foreground);
        box-shadow: var(--focus-shadow);
      }

      .market-section-refresh:disabled {
        opacity: .68;
        cursor: default;
        box-shadow: none;
      }

      .market-section-refresh:disabled svg {
        animation: marketSpin 1s linear infinite;
      }

      .market-section-loading {
        grid-column: 1 / -1;
        display: grid;
        gap: 14px;
        border: 1px solid var(--border);
        border-radius: var(--radius-panel);
        background: var(--surface-muted);
        padding: 16px;
        min-width: 0;
      }

      .market-section-loading-head {
        display: flex;
        align-items: center;
        gap: 9px;
        color: var(--foreground);
        font-size: 13px;
        font-weight: 700;
      }

      .market-loading-dot {
        width: 10px;
        height: 10px;
        border-radius: var(--radius-pill);
        background: var(--accent);
        box-shadow: none;
        animation: marketPulse 1.1s ease-in-out infinite;
      }

      .market-loading-card-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .market-loading-card {
        display: grid;
        gap: 9px;
        border: 1px solid var(--border);
        border-radius: var(--radius-card);
        background: var(--surface);
        padding: 12px;
      }

      .market-loading-card i,
      .market-loading-card b,
      .market-loading-card em {
        display: block;
        border-radius: var(--radius-pill);
        background: var(--surface-hover);
        background-size: 220% 100%;
        animation: marketSkeleton 1.25s ease-in-out infinite;
      }

      .market-loading-card i {
        width: 42px;
        height: 10px;
      }

      .market-loading-card b {
        width: 80%;
        height: 12px;
      }

      .market-loading-card em {
        width: 56%;
        height: 10px;
      }

      .technical-partial-state {
        grid-column: 1 / -1;
        display: grid;
        gap: 14px;
        border: 1px solid color-mix(in srgb, var(--warning) 28%, var(--border));
        border-radius: var(--radius-panel);
        background:
          var(--warning-soft);
        padding: 18px;
        color: var(--foreground);
        box-shadow: var(--shadow-xs);
        min-width: 0;
      }

      .technical-partial-state-head {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        min-width: 0;
      }

      .technical-partial-state-head > span {
        width: 38px;
        height: 38px;
        border-radius: var(--radius-card);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        color: var(--warning);
        background: var(--warning-soft);
        border: 1px solid color-mix(in srgb, var(--warning) 28%, var(--border));
      }

      .technical-partial-state-head strong {
        display: block;
        color: var(--foreground);
        font-size: 15px;
        font-weight: 700;
        line-height: 1.5;
      }

      .technical-partial-state-head p,
      .technical-partial-note p,
      .technical-partial-note small {
        margin: 0;
        color: var(--foreground-muted);
        font-size: 13px;
        line-height: 1.75;
      }

      .technical-partial-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }

      .technical-partial-metric {
        display: grid;
        gap: 6px;
        border: 1px solid var(--border);
        border-radius: var(--radius-card);
        background: var(--surface-elevated);
        padding: 12px;
        min-width: 0;
      }

      .technical-partial-metric small {
        color: var(--foreground-muted);
        font-size: 12px;
        font-weight: 600;
      }

      .technical-partial-metric b {
        color: var(--foreground);
        font-size: 14px;
        font-weight: 700;
        overflow-wrap: anywhere;
        font-family: var(--font-data);
      }

      .technical-partial-note {
        display: grid;
        gap: 4px;
        border: 1px solid var(--border);
        border-radius: var(--radius-card);
        background: var(--surface-muted);
        padding: 12px;
      }

      .technical-partial-note p {
        color: var(--foreground);
        font-weight: 500;
      }

      .technical-partial-action {
        width: fit-content;
        min-height: 40px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: 1px solid color-mix(in srgb, var(--warning) 28%, var(--border));
        border-radius: var(--radius-pill);
        background: var(--warning-soft);
        color: var(--primary-hover);
        padding: 0 15px;
        font: 700 12px var(--font-ui);
        cursor: pointer;
        transition: background .18s ease, border-color .18s ease, box-shadow .18s ease, transform .18s ease;
      }

      .technical-partial-action:hover,
      .technical-partial-action:focus-visible {
        outline: none;
        background: var(--primary);
        border-color: var(--accent);
        color: var(--primary-foreground);
        box-shadow: var(--focus-shadow);
      }

      .technical-partial-action:active {
        transform: translateY(1px);
      }

      .technical-analysis-panel {
        width: 100%;
        max-width: none !important;
        margin-inline: 0;
        gap: 18px !important;
        overflow: hidden;
      }

      .technical-dashboard-head {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        gap: 14px;
        align-items: center;
        border: 1px solid var(--border);
        border-radius: var(--radius-panel);
        background: var(--surface);
        padding: clamp(15px, 2vw, 20px);
        box-shadow: var(--shadow-xs);
        min-width: 0;
      }

      .technical-dashboard-icon {
        width: 54px;
        height: 54px;
        border-radius: var(--radius-panel);
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        background: var(--primary);
        color: var(--primary-foreground);
        box-shadow: var(--shadow-xs);
      }

      .technical-dashboard-head h2 {
        margin: 0;
        color: var(--foreground);
        font-size: clamp(22px, 2.3vw, 34px);
        font-weight: 700;
        line-height: 1.2;
      }

      .technical-dashboard-head p {
        margin: 6px 0 0;
        color: var(--foreground-muted);
        font-size: 13px;
        font-weight: 500;
        line-height: 1.7;
      }

      .technical-refresh-button,
      .technical-empty-state button {
        min-height: 42px;
        border: 1px solid var(--border);
        border-radius: var(--radius-pill);
        background: var(--primary-soft);
        color: var(--primary-hover);
        padding: 0 15px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font: 700 12px var(--font-ui);
        cursor: pointer;
        white-space: nowrap;
        transition: transform .18s ease, background .18s ease, border-color .18s ease, box-shadow .18s ease;
      }

      .technical-refresh-button:hover,
      .technical-refresh-button:focus-visible,
      .technical-empty-state button:hover,
      .technical-empty-state button:focus-visible {
        outline: none;
        background: var(--primary);
        border-color: var(--accent);
        color: var(--primary-foreground);
        box-shadow: var(--focus-shadow);
      }

      .technical-refresh-button:active,
      .technical-empty-state button:active {
        transform: translateY(1px);
      }

      .technical-refresh-button:disabled {
        opacity: .72;
        cursor: wait;
        box-shadow: none;
      }

      .market-spin {
        animation: marketSpin 1s linear infinite;
      }

      .technical-selector-head {
        display: grid;
        grid-template-columns: minmax(170px, .4fr) minmax(260px, 1fr);
        gap: 12px;
        align-items: stretch;
        min-width: 0;
      }

      .technical-selector-head > div:first-child {
        display: grid;
        align-content: center;
        gap: 5px;
        border: 1px solid var(--border);
        border-radius: var(--radius-card);
        background: var(--surface-muted);
        padding: 12px 14px;
        min-width: 0;
      }

      .technical-selector-head span {
        color: var(--foreground-muted);
        font-size: 12px;
        font-weight: 700;
        line-height: 1.3;
      }

      .technical-selector-head strong {
        color: var(--foreground);
        font-size: 18px;
        font-weight: 700;
        letter-spacing: .02em;
        line-height: 1.25;
        overflow-wrap: anywhere;
      }

      .technical-selected-summary {
        grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
      }

      .technical-data-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 14px !important;
      }

      .technical-data-card.support .technical-data-card-head span {
        color: var(--success);
        background: var(--success-soft);
        border-color: color-mix(in srgb, var(--success) 28%, var(--border));
      }

      .technical-data-card.resistance .technical-data-card-head span {
        color: var(--danger);
        background: var(--danger-soft);
        border-color: color-mix(in srgb, var(--danger) 28%, var(--border));
      }

      .technical-data-card.signal {
        background: var(--surface);
      }

      .technical-data-card-foot {
        margin: 0;
        width: fit-content;
        max-width: 100%;
        border: 1px solid var(--border);
        border-radius: var(--radius-pill);
        background: var(--primary-soft);
        color: var(--primary-hover);
        padding: 7px 10px;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.35;
      }

      .technical-range-card,
      .technical-education-card,
      .technical-tab-disclaimer {
        border: 1px solid var(--border);
        border-radius: var(--radius-panel);
        background: var(--surface);
        box-shadow: var(--shadow-xs);
        padding: clamp(15px, 2vw, 20px);
        min-width: 0;
      }

      .technical-range-card {
        display: grid;
        gap: 20px;
      }

      .technical-range-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
      }

      .technical-range-head strong,
      .technical-education-head strong,
      .technical-tab-disclaimer strong {
        display: block;
        color: var(--foreground);
        font-size: 15px;
        font-weight: 700;
        line-height: 1.45;
      }

      .technical-range-head p,
      .technical-tab-disclaimer p {
        margin: 5px 0 0;
        color: var(--foreground-muted);
        font-size: 13px;
        font-weight: 500;
        line-height: 1.75;
      }

      .technical-range-head > span {
        width: 40px;
        height: 40px;
        border-radius: var(--radius-card);
        display: grid;
        place-items: center;
        background: var(--primary-soft);
        color: var(--accent);
        border: 1px solid var(--border);
        flex: 0 0 auto;
      }

      .technical-range-track {
        position: relative;
        height: 92px;
        border-radius: var(--radius-panel);
        background: var(--surface-muted);
        border: 1px solid var(--border);
        overflow: visible;
      }

      .technical-range-fill {
        position: absolute;
        top: 46px;
        height: 4px;
        border-radius: var(--radius-pill);
      }

      .technical-range-fill.support {
        inset-inline-start: 0;
        width: 45%;
        background: var(--success);
      }

      .technical-range-fill.pivot {
        inset-inline-start: 44%;
        width: 12%;
        background: var(--primary);
      }

      .technical-range-fill.resistance {
        inset-inline-end: 0;
        width: 45%;
        background: var(--danger);
      }

      .technical-range-marker {
        position: absolute;
        top: 18px;
        transform: translateX(-50%);
        display: grid;
        justify-items: center;
        gap: 6px;
        min-width: 74px;
      }

      [dir="rtl"] .technical-dashboard .technical-range-marker {
        transform: translateX(50%);
      }

      .technical-range-marker::after {
        content: "";
        width: 14px;
        height: 14px;
        border-radius: var(--radius-pill);
        background: currentColor;
        box-shadow: var(--focus-shadow);
        order: 2;
      }

      .technical-range-marker b,
      .technical-range-marker small {
        border-radius: var(--radius-pill);
        background: var(--surface);
        border: 1px solid var(--border);
        padding: 5px 8px;
        line-height: 1.2;
        box-shadow: var(--shadow-xs);
        font-family: var(--font-data);
      }

      .technical-range-marker b {
        color: currentColor;
        font-size: 12px;
        font-weight: 700;
        font-family: var(--font-data);
      }

      .technical-range-marker small {
        color: var(--foreground);
        font-size: 12px;
        font-weight: 600;
        font-family: var(--font-data);
      }

      .technical-range-marker.support {
        color: var(--success);
      }

      .technical-range-marker.pivot {
        color: var(--primary);
      }

      .technical-range-marker.resistance {
        color: var(--danger);
      }

      .technical-education-card {
        display: grid;
        gap: 14px;
      }

      .technical-education-head {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .technical-education-head > span,
      .technical-tab-disclaimer > svg {
        width: 38px;
        height: 38px;
        border-radius: var(--radius-card);
        display: grid;
        place-items: center;
        background: var(--info-soft);
        color: var(--info);
        border: 1px solid color-mix(in srgb, var(--info) 28%, var(--border));
        flex: 0 0 auto;
      }

      .technical-education-list {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .technical-education-list li {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: start;
        gap: 9px;
        border: 1px solid color-mix(in srgb, var(--info) 28%, var(--border));
        border-radius: var(--radius-card);
        background: var(--surface-muted);
        padding: 11px;
        min-width: 0;
      }

      .technical-education-list b {
        color: var(--primary-hover);
        font-size: 12px;
        font-weight: 700;
      }

      .technical-education-list span {
        color: var(--foreground-muted);
        font-size: 13px;
        font-weight: 500;
        line-height: 1.7;
      }

      .technical-tab-disclaimer {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        background: var(--info-soft);
      }

      .technical-empty-state button {
        margin-top: 12px;
      }

      .portfolio-card {
        gap: 18px !important;
        padding: clamp(18px, 2.2vw, 26px) !important;
        border-radius: var(--radius-panel) !important;
        background:
          var(--surface) !important;
        border-color: var(--border) !important;
        box-shadow: var(--shadow-xs) !important;
      }

      .portfolio-card-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        min-width: 0;
        border-bottom: 1px solid var(--border);
        padding-bottom: 16px;
      }

      .portfolio-card-title {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        min-width: 0;
      }

      .portfolio-card-title > span {
        width: 58px;
        height: 58px;
        border-radius: var(--radius-panel);
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        color: var(--accent);
        background: var(--primary-soft);
        border: 1px solid var(--border);
        box-shadow: var(--shadow-xs);
      }

      .portfolio-card-title div {
        min-width: 0;
        display: grid;
        gap: 8px;
      }

      .portfolio-card-title h2 {
        margin: 0;
        color: var(--foreground);
        font-size: clamp(24px, 2.4vw, 36px);
        font-weight: 700;
        line-height: 1.2;
      }

      .portfolio-card-title p {
        margin: 0;
        color: var(--foreground-muted);
        font-size: 14px;
        font-weight: 500;
        line-height: 1.7;
      }

      .portfolio-card-title i {
        width: 84px;
        height: 5px;
        border-radius: var(--radius-pill);
        background: var(--primary);
      }

      .portfolio-card-status {
        flex: 0 1 auto;
        max-width: 280px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        border: 1px solid var(--border);
        background: var(--surface-muted);
        color: var(--foreground-muted);
        border-radius: var(--radius-pill);
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.35;
        text-align: center;
      }

      .portfolio-card-status.available {
        color: var(--success);
        background: var(--success-soft);
        border-color: color-mix(in srgb, var(--success) 28%, var(--border));
      }

      .portfolio-empty-note {
        display: flex;
        align-items: flex-start;
        gap: 11px;
        border: 1px solid var(--border);
        background: var(--surface-muted);
        border-radius: var(--radius-card);
        padding: 13px 14px;
        color: var(--primary-hover);
      }

      .portfolio-empty-note svg {
        flex: 0 0 auto;
        margin-top: 3px;
      }

      .portfolio-empty-note strong {
        display: block;
        color: var(--foreground);
        font-size: 13px;
        font-weight: 700;
        line-height: 1.5;
      }

      .portfolio-empty-note p {
        margin: 4px 0 0;
        color: var(--foreground-muted);
        font-size: 12px;
        font-weight: 500;
        line-height: 1.75;
      }

      .portfolio-comparison-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        border: 1px solid var(--border);
        border-radius: var(--radius-panel);
        overflow: hidden;
        background: var(--surface-muted);
      }

      .portfolio-comparison-metric {
        min-width: 0;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        gap: 14px;
        padding: 18px;
        background:
          var(--surface);
        border-bottom: 1px solid var(--border);
      }

      .portfolio-comparison-metric:nth-child(odd) {
        border-inline-end: 1px solid var(--border);
      }

      .portfolio-comparison-metric:nth-last-child(-n + 2) {
        border-bottom: 0;
      }

      .portfolio-metric-icon {
        width: 44px;
        height: 44px;
        border-radius: var(--radius-card);
        display: grid;
        place-items: center;
        color: var(--primary-hover);
        background: var(--primary-soft);
        border: 1px solid var(--border);
      }

      .portfolio-comparison-metric div {
        min-width: 0;
        display: grid;
        gap: 7px;
      }

      .portfolio-comparison-metric small {
        color: var(--foreground-muted);
        font-size: 13px;
        font-weight: 600;
        line-height: 1.45;
      }

      .portfolio-comparison-metric strong {
        width: max-content;
        max-width: 100%;
        color: var(--foreground);
        font-size: clamp(18px, 1.7vw, 25px);
        font-weight: 700;
        line-height: 1.25;
        overflow-wrap: anywhere;
        font-variant-numeric: tabular-nums;
        font-family: var(--font-data);
      }

      .portfolio-comparison-metric.success strong,
      .portfolio-comparison-metric.warning strong,
      .portfolio-comparison-metric.danger strong,
      .portfolio-comparison-metric.unavailable strong {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-pill);
        padding: 7px 11px;
        border: 1px solid transparent;
        font-size: 14px;
      }

      .portfolio-comparison-metric.success strong {
        color: var(--success);
        background: var(--success-soft);
        border-color: color-mix(in srgb, var(--success) 28%, var(--border));
      }

      .portfolio-comparison-metric.warning strong {
        color: var(--warning);
        background: var(--warning-soft);
        border-color: color-mix(in srgb, var(--warning) 28%, var(--border));
      }

      .portfolio-comparison-metric.danger strong {
        color: var(--danger);
        background: var(--danger-soft);
        border-color: color-mix(in srgb, var(--danger) 28%, var(--border));
      }

      .portfolio-comparison-metric.unavailable strong {
        color: var(--foreground-muted);
        background: var(--surface-muted);
        border-color: var(--border);
      }

      .news-tool-card-head .market-section-refresh {
        margin-inline-start: auto;
      }

      .technical-analysis-panel .market-section-head,
      .news-tool-card-head {
        flex-wrap: wrap;
      }

      .economic-calendar-dashboard-head {
        grid-template-columns: auto minmax(0, 1fr) auto;
      }

      @media (max-width: 1180px) {
        .technical-selected-summary {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        .technical-data-grid,
        .technical-education-list {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
      }

      @media (max-width: 780px) {
        .technical-dashboard-head,
        .technical-selector-head {
          grid-template-columns: 1fr;
        }

        .technical-dashboard-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-card);
        }

        .technical-refresh-button {
          width: 100%;
        }

        .technical-data-grid,
        .technical-education-list {
          grid-template-columns: 1fr !important;
        }

        .technical-range-card {
          overflow-x: auto;
        }

        .technical-range-track {
          min-width: 560px;
        }
      }

      @media (max-width: 640px) {
        .market-section-refresh {
          width: 100%;
          min-height: 40px;
          margin-inline-start: 0;
        }

        .economic-calendar-dashboard-head {
          grid-template-columns: 1fr;
        }

        .market-loading-card-grid {
          grid-template-columns: 1fr;
        }

        .technical-partial-grid {
          grid-template-columns: 1fr;
        }

        .technical-partial-state {
          padding: 15px;
        }

        .technical-partial-action {
          width: 100%;
        }

        .technical-analysis-panel {
          padding: 14px !important;
          border-radius: var(--radius-panel) !important;
        }

        .technical-selected-summary {
          grid-template-columns: 1fr !important;
        }

        .technical-category-row,
        .technical-symbol-row {
          flex-wrap: nowrap !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          padding-bottom: 8px !important;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }

        .technical-category-row::-webkit-scrollbar,
        .technical-symbol-row::-webkit-scrollbar {
          display: none;
        }

        .technical-tab-disclaimer,
        .technical-range-head {
          display: grid;
        }

        .portfolio-card-head,
        .portfolio-card-title {
          display: grid;
        }

        .portfolio-card-status {
          max-width: 100%;
          width: 100%;
        }
      }
    `}</style>
  );
}
