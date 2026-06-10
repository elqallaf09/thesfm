'use client';

export function MarketAsyncToolStyles() {
  return (
    <style jsx global>{`
      .market-section-refresh {
        margin-inline-start: auto;
        min-height: 38px;
        border: 1px solid rgba(47, 214, 192, .24);
        border-radius: 999px;
        background: rgba(47, 214, 192, .10);
        color: var(--sfm-primary-hover);
        padding: 0 12px;
        font: 950 12px Tajawal, Arial, sans-serif;
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
        background: rgba(47, 214, 192, .16);
        border-color: var(--sfm-accent);
        box-shadow: 0 0 0 3px rgba(24, 212, 212, .12);
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
        border: 1px solid rgba(47, 214, 192, .18);
        border-radius: 22px;
        background: linear-gradient(135deg, rgba(29, 140, 255, .06), rgba(47, 214, 192, .07)), var(--sfm-light-card);
        padding: 16px;
        min-width: 0;
      }

      .market-section-loading-head {
        display: flex;
        align-items: center;
        gap: 9px;
        color: var(--sfm-foreground);
        font-size: 13px;
        font-weight: 950;
      }

      .market-loading-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--sfm-soft-cyan);
        box-shadow: 0 0 0 5px rgba(47, 214, 192, .12);
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
        border: 1px solid rgba(167, 243, 240, .14);
        border-radius: 16px;
        background: var(--sfm-card);
        padding: 12px;
      }

      .market-loading-card i,
      .market-loading-card b,
      .market-loading-card em {
        display: block;
        border-radius: 999px;
        background: linear-gradient(90deg, rgba(148, 163, 184, .16), rgba(47, 214, 192, .18), rgba(148, 163, 184, .16));
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
        border: 1px solid rgba(245, 158, 11, .26);
        border-radius: 24px;
        background:
          linear-gradient(135deg, rgba(245, 158, 11, .10), rgba(47, 214, 192, .06)),
          var(--sfm-light-card);
        padding: 18px;
        color: var(--sfm-foreground);
        box-shadow: 0 18px 46px rgba(15, 23, 42, .08);
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
        border-radius: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        color: #b45309;
        background: rgba(245, 158, 11, .14);
        border: 1px solid rgba(245, 158, 11, .22);
      }

      .technical-partial-state-head strong {
        display: block;
        color: var(--sfm-foreground);
        font-size: 15px;
        font-weight: 950;
        line-height: 1.5;
      }

      .technical-partial-state-head p,
      .technical-partial-note p,
      .technical-partial-note small {
        margin: 0;
        color: var(--sfm-muted);
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
        border: 1px solid rgba(47, 214, 192, .16);
        border-radius: 18px;
        background: rgba(255, 255, 255, .74);
        padding: 12px;
        min-width: 0;
      }

      .technical-partial-metric small {
        color: var(--sfm-muted);
        font-size: 11px;
        font-weight: 900;
      }

      .technical-partial-metric b {
        color: var(--sfm-foreground);
        font-size: 14px;
        font-weight: 950;
        overflow-wrap: anywhere;
      }

      .technical-partial-note {
        display: grid;
        gap: 4px;
        border: 1px solid rgba(148, 163, 184, .18);
        border-radius: 18px;
        background: rgba(15, 23, 42, .035);
        padding: 12px;
      }

      .technical-partial-note p {
        color: var(--sfm-foreground);
        font-weight: 850;
      }

      .technical-partial-action {
        width: fit-content;
        min-height: 40px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: 1px solid rgba(47, 214, 192, .28);
        border-radius: 999px;
        background: rgba(47, 214, 192, .12);
        color: var(--sfm-primary-hover);
        padding: 0 15px;
        font: 950 12px Tajawal, Arial, sans-serif;
        cursor: pointer;
        transition: background .18s ease, border-color .18s ease, box-shadow .18s ease, transform .18s ease;
      }

      .technical-partial-action:hover,
      .technical-partial-action:focus-visible {
        outline: none;
        background: rgba(47, 214, 192, .18);
        border-color: var(--sfm-accent);
        box-shadow: 0 0 0 3px rgba(24, 212, 212, .12);
      }

      .technical-partial-action:active {
        transform: translateY(1px);
      }

      .dark .technical-partial-state {
        background:
          linear-gradient(135deg, rgba(245, 158, 11, .12), rgba(47, 214, 192, .08)),
          rgba(15, 29, 49, .86);
        border-color: rgba(245, 158, 11, .32);
        box-shadow: 0 18px 46px rgba(0, 0, 0, .22);
      }

      .dark .technical-partial-metric,
      .dark .technical-partial-note {
        background: rgba(19, 36, 58, .78);
        border-color: rgba(148, 163, 184, .18);
      }

      .technical-analysis-panel {
        width: 100%;
        max-width: 1400px !important;
        margin-inline: auto;
        gap: 18px !important;
        overflow: hidden;
      }

      .technical-dashboard-head {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        gap: 14px;
        align-items: center;
        border: 1px solid rgba(47, 214, 192, .16);
        border-radius: 26px;
        background: linear-gradient(135deg, rgba(29, 140, 255, .06), rgba(47, 214, 192, .08)), var(--sfm-card);
        padding: clamp(15px, 2vw, 20px);
        box-shadow: 0 14px 34px rgba(3, 18, 37, .06);
        min-width: 0;
      }

      .technical-dashboard-icon {
        width: 54px;
        height: 54px;
        border-radius: 22px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
        color: #fff;
        box-shadow: 0 16px 30px rgba(29, 140, 255, .18);
      }

      .technical-dashboard-head h2 {
        margin: 0;
        color: var(--sfm-foreground);
        font-size: clamp(22px, 2.3vw, 34px);
        font-weight: 950;
        line-height: 1.2;
      }

      .technical-dashboard-head p {
        margin: 6px 0 0;
        color: var(--sfm-muted);
        font-size: 13px;
        font-weight: 850;
        line-height: 1.7;
      }

      .technical-refresh-button,
      .technical-empty-state button {
        min-height: 42px;
        border: 1px solid rgba(47, 214, 192, .28);
        border-radius: 999px;
        background: rgba(47, 214, 192, .12);
        color: var(--sfm-primary-hover);
        padding: 0 15px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font: 950 12px Tajawal, Arial, sans-serif;
        cursor: pointer;
        white-space: nowrap;
        transition: transform .18s ease, background .18s ease, border-color .18s ease, box-shadow .18s ease;
      }

      .technical-refresh-button:hover,
      .technical-refresh-button:focus-visible,
      .technical-empty-state button:hover,
      .technical-empty-state button:focus-visible {
        outline: none;
        background: rgba(47, 214, 192, .18);
        border-color: var(--sfm-accent);
        box-shadow: 0 0 0 3px rgba(24, 212, 212, .12);
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
        border: 1px solid rgba(47, 214, 192, .16);
        border-radius: 18px;
        background: var(--sfm-light-card);
        padding: 12px 14px;
        min-width: 0;
      }

      .technical-selector-head span {
        color: var(--sfm-muted);
        font-size: 11px;
        font-weight: 950;
        line-height: 1.3;
      }

      .technical-selector-head strong {
        color: var(--sfm-foreground);
        font-size: 18px;
        font-weight: 950;
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
        color: #16A34A;
        background: rgba(34, 197, 94, .12);
        border-color: rgba(34, 197, 94, .20);
      }

      .technical-data-card.resistance .technical-data-card-head span {
        color: #DC2626;
        background: rgba(239, 68, 68, .12);
        border-color: rgba(239, 68, 68, .20);
      }

      .technical-data-card.signal {
        background: linear-gradient(135deg, rgba(29, 140, 255, .08), rgba(47, 214, 192, .08)), var(--sfm-card);
      }

      .technical-data-card-foot {
        margin: 0;
        width: fit-content;
        max-width: 100%;
        border: 1px solid rgba(47, 214, 192, .18);
        border-radius: 999px;
        background: rgba(47, 214, 192, .10);
        color: var(--sfm-primary-hover);
        padding: 7px 10px;
        font-size: 11px;
        font-weight: 950;
        line-height: 1.35;
      }

      .technical-range-card,
      .technical-education-card,
      .technical-tab-disclaimer {
        border: 1px solid rgba(47, 214, 192, .16);
        border-radius: 26px;
        background: var(--sfm-card);
        box-shadow: 0 14px 34px rgba(3, 18, 37, .06);
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
        color: var(--sfm-foreground);
        font-size: 15px;
        font-weight: 950;
        line-height: 1.45;
      }

      .technical-range-head p,
      .technical-tab-disclaimer p {
        margin: 5px 0 0;
        color: var(--sfm-muted);
        font-size: 13px;
        font-weight: 850;
        line-height: 1.75;
      }

      .technical-range-head > span {
        width: 40px;
        height: 40px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        background: rgba(47, 214, 192, .12);
        color: var(--sfm-soft-cyan);
        border: 1px solid rgba(47, 214, 192, .20);
        flex: 0 0 auto;
      }

      .technical-range-track {
        position: relative;
        height: 92px;
        border-radius: 22px;
        background: linear-gradient(90deg, rgba(34, 197, 94, .08), rgba(29, 140, 255, .08), rgba(239, 68, 68, .08));
        border: 1px solid rgba(148, 163, 184, .16);
        overflow: visible;
      }

      .technical-range-fill {
        position: absolute;
        top: 46px;
        height: 4px;
        border-radius: 999px;
      }

      .technical-range-fill.support {
        inset-inline-start: 0;
        width: 45%;
        background: #16A34A;
      }

      .technical-range-fill.pivot {
        inset-inline-start: 44%;
        width: 12%;
        background: #1D8CFF;
      }

      .technical-range-fill.resistance {
        inset-inline-end: 0;
        width: 45%;
        background: #DC2626;
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
        border-radius: 50%;
        background: currentColor;
        box-shadow: 0 0 0 5px rgba(255, 255, 255, .82);
        order: 2;
      }

      .technical-range-marker b,
      .technical-range-marker small {
        border-radius: 999px;
        background: var(--sfm-card);
        border: 1px solid rgba(167, 243, 240, .16);
        padding: 5px 8px;
        line-height: 1.2;
        box-shadow: 0 8px 18px rgba(3, 18, 37, .06);
      }

      .technical-range-marker b {
        color: currentColor;
        font-size: 11px;
        font-weight: 950;
      }

      .technical-range-marker small {
        color: var(--sfm-foreground);
        font-size: 11px;
        font-weight: 900;
      }

      .technical-range-marker.support {
        color: #16A34A;
      }

      .technical-range-marker.pivot {
        color: #1D8CFF;
      }

      .technical-range-marker.resistance {
        color: #DC2626;
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
        border-radius: 15px;
        display: grid;
        place-items: center;
        background: rgba(29, 140, 255, .10);
        color: var(--sfm-primary-hover);
        border: 1px solid rgba(29, 140, 255, .18);
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
        border: 1px solid rgba(167, 243, 240, .14);
        border-radius: 18px;
        background: var(--sfm-light-card);
        padding: 11px;
        min-width: 0;
      }

      .technical-education-list b {
        color: var(--sfm-primary-hover);
        font-size: 12px;
        font-weight: 950;
      }

      .technical-education-list span {
        color: var(--sfm-muted);
        font-size: 13px;
        font-weight: 850;
        line-height: 1.7;
      }

      .technical-tab-disclaimer {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        background: linear-gradient(135deg, rgba(29, 140, 255, .08), rgba(47, 214, 192, .06)), var(--sfm-card);
      }

      .technical-empty-state button {
        margin-top: 12px;
      }

      .dark .technical-dashboard-head,
      .dark .technical-selector-head > div:first-child,
      .dark .technical-range-card,
      .dark .technical-education-card,
      .dark .technical-tab-disclaimer,
      .dark .technical-data-card.signal {
        background: linear-gradient(135deg, rgba(29, 140, 255, .08), rgba(47, 214, 192, .07)), #0f1d31;
        border-color: #1d3050;
      }

      .dark .technical-range-track,
      .dark .technical-education-list li {
        background: #0a1422;
        border-color: #1d3050;
      }

      .dark .technical-range-marker b,
      .dark .technical-range-marker small {
        background: #0f1d31;
        border-color: #1d3050;
      }

      .dark .technical-range-marker::after {
        box-shadow: 0 0 0 5px rgba(15, 29, 49, .88);
      }

      .portfolio-card {
        gap: 18px !important;
        padding: clamp(18px, 2.2vw, 26px) !important;
        border-radius: 30px !important;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, .86), rgba(234, 246, 255, .62)),
          var(--sfm-card) !important;
        border-color: rgba(47, 214, 192, .18) !important;
        box-shadow: 0 18px 48px rgba(3, 18, 37, .08) !important;
      }

      .portfolio-card-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        min-width: 0;
        border-bottom: 1px solid rgba(47, 214, 192, .14);
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
        border-radius: 22px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        color: var(--sfm-soft-cyan);
        background: linear-gradient(135deg, rgba(47, 214, 192, .20), rgba(29, 140, 255, .10));
        border: 1px solid rgba(47, 214, 192, .24);
        box-shadow: 0 14px 28px rgba(47, 214, 192, .12);
      }

      .portfolio-card-title div {
        min-width: 0;
        display: grid;
        gap: 8px;
      }

      .portfolio-card-title h2 {
        margin: 0;
        color: var(--sfm-foreground);
        font-size: clamp(24px, 2.4vw, 36px);
        font-weight: 950;
        line-height: 1.2;
      }

      .portfolio-card-title p {
        margin: 0;
        color: var(--sfm-muted);
        font-size: 14px;
        font-weight: 850;
        line-height: 1.7;
      }

      .portfolio-card-title i {
        width: 84px;
        height: 5px;
        border-radius: 999px;
        background: linear-gradient(90deg, var(--sfm-primary), var(--sfm-accent));
      }

      .portfolio-card-status {
        flex: 0 1 auto;
        max-width: 280px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        border: 1px solid rgba(148, 163, 184, .24);
        background: rgba(148, 163, 184, .10);
        color: var(--sfm-muted);
        border-radius: 999px;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 950;
        line-height: 1.35;
        text-align: center;
      }

      .portfolio-card-status.available {
        color: #047857;
        background: rgba(16, 185, 129, .12);
        border-color: rgba(16, 185, 129, .24);
      }

      .portfolio-empty-note {
        display: flex;
        align-items: flex-start;
        gap: 11px;
        border: 1px solid rgba(47, 214, 192, .18);
        background: rgba(47, 214, 192, .08);
        border-radius: 20px;
        padding: 13px 14px;
        color: var(--sfm-primary-hover);
      }

      .portfolio-empty-note svg {
        flex: 0 0 auto;
        margin-top: 3px;
      }

      .portfolio-empty-note strong {
        display: block;
        color: var(--sfm-foreground);
        font-size: 13px;
        font-weight: 950;
        line-height: 1.5;
      }

      .portfolio-empty-note p {
        margin: 4px 0 0;
        color: var(--sfm-muted);
        font-size: 12px;
        font-weight: 850;
        line-height: 1.75;
      }

      .portfolio-comparison-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        border: 1px solid rgba(47, 214, 192, .16);
        border-radius: 24px;
        overflow: hidden;
        background: rgba(255, 255, 255, .45);
      }

      .portfolio-comparison-metric {
        min-width: 0;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        gap: 14px;
        padding: 18px;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, .66), rgba(234, 246, 255, .42)),
          var(--sfm-card);
        border-bottom: 1px solid rgba(47, 214, 192, .12);
      }

      .portfolio-comparison-metric:nth-child(odd) {
        border-inline-end: 1px solid rgba(47, 214, 192, .12);
      }

      .portfolio-comparison-metric:nth-last-child(-n + 2) {
        border-bottom: 0;
      }

      .portfolio-metric-icon {
        width: 44px;
        height: 44px;
        border-radius: 18px;
        display: grid;
        place-items: center;
        color: var(--sfm-primary-hover);
        background: rgba(47, 214, 192, .12);
        border: 1px solid rgba(47, 214, 192, .20);
      }

      .portfolio-comparison-metric div {
        min-width: 0;
        display: grid;
        gap: 7px;
      }

      .portfolio-comparison-metric small {
        color: var(--sfm-muted);
        font-size: 13px;
        font-weight: 900;
        line-height: 1.45;
      }

      .portfolio-comparison-metric strong {
        width: max-content;
        max-width: 100%;
        color: var(--sfm-foreground);
        font-size: clamp(18px, 1.7vw, 25px);
        font-weight: 950;
        line-height: 1.25;
        overflow-wrap: anywhere;
        font-variant-numeric: tabular-nums;
      }

      .portfolio-comparison-metric.success strong,
      .portfolio-comparison-metric.warning strong,
      .portfolio-comparison-metric.danger strong,
      .portfolio-comparison-metric.unavailable strong {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        padding: 7px 11px;
        border: 1px solid transparent;
        font-size: 14px;
      }

      .portfolio-comparison-metric.success strong {
        color: #047857;
        background: rgba(16, 185, 129, .12);
        border-color: rgba(16, 185, 129, .24);
      }

      .portfolio-comparison-metric.warning strong {
        color: #B45309;
        background: rgba(245, 158, 11, .13);
        border-color: rgba(245, 158, 11, .25);
      }

      .portfolio-comparison-metric.danger strong {
        color: #DC2626;
        background: rgba(239, 68, 68, .12);
        border-color: rgba(239, 68, 68, .24);
      }

      .portfolio-comparison-metric.unavailable strong {
        color: var(--sfm-muted);
        background: rgba(148, 163, 184, .11);
        border-color: rgba(148, 163, 184, .22);
      }

      .dark .portfolio-card {
        background: linear-gradient(135deg, rgba(29, 140, 255, .08), rgba(47, 214, 192, .07)), #0f1d31 !important;
        border-color: #1d3050 !important;
        box-shadow: 0 18px 48px rgba(0, 0, 0, .24) !important;
      }

      .dark .portfolio-card-title > span,
      .dark .portfolio-metric-icon {
        color: #2FD6C0;
        background: rgba(47, 214, 192, .12);
        border-color: rgba(47, 214, 192, .25);
      }

      .dark .portfolio-card-status.available,
      .dark .portfolio-comparison-metric.success strong {
        color: #2FD6C0;
        background: rgba(47, 214, 192, .12);
        border-color: rgba(47, 214, 192, .25);
      }

      .dark .portfolio-empty-note,
      .dark .portfolio-comparison-grid {
        background: #0a1422;
        border-color: #1d3050;
      }

      .dark .portfolio-comparison-metric {
        background: linear-gradient(135deg, rgba(29, 140, 255, .06), rgba(47, 214, 192, .05)), #0f1d31;
        border-color: #1d3050;
      }

      .dark .portfolio-comparison-metric.warning strong {
        color: #F5B942;
        background: rgba(245, 185, 66, .12);
        border-color: rgba(245, 185, 66, .25);
      }

      .dark .portfolio-comparison-metric.danger strong {
        color: #FF5B6E;
        background: rgba(255, 91, 110, .12);
        border-color: rgba(255, 91, 110, .25);
      }

      .dark .portfolio-comparison-metric.unavailable strong,
      .dark .portfolio-card-status.unavailable {
        color: #8ea6c3;
        background: rgba(142, 166, 195, .12);
        border-color: rgba(142, 166, 195, .22);
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
          border-radius: 19px;
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
          border-radius: 24px !important;
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

        .portfolio-comparison-grid {
          grid-template-columns: 1fr;
        }

        .portfolio-comparison-metric,
        .portfolio-comparison-metric:nth-child(odd) {
          border-inline-end: 0;
        }

        .portfolio-comparison-metric:nth-last-child(-n + 2) {
          border-bottom: 1px solid rgba(47, 214, 192, .12);
        }

        .portfolio-comparison-metric:last-child {
          border-bottom: 0;
        }
      }

      .market-active-dashboard > .technical-dashboard {
        width: 100%;
        max-width: 1400px;
        min-width: 0;
        margin-inline: auto;
      }

      .technical-dashboard {
        display: grid;
        gap: clamp(16px, 2vw, 22px);
        align-content: start;
        align-self: start;
        height: auto;
        border: 1px solid rgba(47, 214, 192, .18);
        border-radius: 32px;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, .9), rgba(234, 246, 255, .68)),
          var(--sfm-card);
        box-shadow: 0 22px 58px rgba(3, 18, 37, .08);
        padding: clamp(16px, 2.4vw, 28px);
        overflow: hidden;
        box-sizing: border-box;
      }

      .technical-dashboard *,
      .technical-dashboard *::before,
      .technical-dashboard *::after {
        box-sizing: border-box;
      }

      .technical-dashboard-body,
      .technical-content-stage {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        display: grid;
        gap: clamp(14px, 1.8vw, 20px);
        align-content: start;
      }

      .technical-dashboard .technical-dashboard-head {
        width: 100%;
        max-width: 100%;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        margin: 0;
      }

      .technical-dashboard-title {
        min-width: 0;
      }

      .technical-dashboard .technical-selector-shell {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        display: grid;
        gap: 15px;
        border: 1px solid rgba(47, 214, 192, .16);
        border-radius: 26px;
        background:
          linear-gradient(135deg, rgba(29, 140, 255, .055), rgba(47, 214, 192, .075)),
          var(--sfm-card) !important;
        box-shadow: 0 14px 34px rgba(3, 18, 37, .055);
        padding: clamp(14px, 1.8vw, 18px);
        overflow: hidden;
      }

      .technical-search-row {
        display: grid;
        grid-template-columns: minmax(180px, 260px) minmax(0, 1fr);
        gap: 12px;
        align-items: stretch;
        width: 100%;
        min-width: 0;
      }

      .technical-selected-chip {
        min-width: 0;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        column-gap: 11px;
        align-content: center;
        gap: 5px;
        border: 1px solid rgba(47, 214, 192, .16);
        border-radius: 20px;
        background: rgba(255, 255, 255, .78);
        padding: 12px 14px;
      }

      .technical-selected-chip-icon {
        width: 38px;
        height: 38px;
        border-radius: 15px;
        display: grid;
        place-items: center;
        color: #1D8CFF;
        background: rgba(29, 140, 255, .10);
        border: 1px solid rgba(29, 140, 255, .16);
        box-shadow: 0 10px 22px rgba(29, 140, 255, .08);
      }

      .technical-selected-chip > div {
        min-width: 0;
        display: grid;
        gap: 5px;
      }

      .technical-selected-chip small {
        color: var(--sfm-muted);
        font-size: 11px;
        font-weight: 950;
        line-height: 1.35;
      }

      .technical-selected-chip strong {
        color: var(--sfm-foreground);
        font-size: 18px;
        font-weight: 950;
        line-height: 1.25;
        letter-spacing: .02em;
        overflow-wrap: anywhere;
      }

      .technical-dashboard .technical-search {
        width: 100%;
        min-width: 0;
        min-height: 50px;
        border-radius: 20px;
        background: rgba(255, 255, 255, .86);
      }

      .technical-dashboard .technical-search button span {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
      }

      .technical-dashboard .technical-category-row,
      .technical-dashboard .technical-symbol-row {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-start;
        align-items: center;
        gap: 10px;
        overflow: visible;
        padding: 2px;
      }

      .technical-dashboard .technical-category-row button {
        flex: 0 0 auto;
        min-height: 42px;
        border-radius: 999px;
        padding: 0 17px;
        font-size: 13px;
        line-height: 1.2;
      }

      .technical-dashboard .technical-symbol-pill {
        flex: 0 0 auto;
        min-height: 44px;
        max-width: 100%;
        border-radius: 999px;
      }

      .technical-dashboard .technical-symbol-main {
        min-height: 36px;
        padding: 0 13px;
        font-size: 13px;
        line-height: 1.2;
        white-space: nowrap;
      }

      .technical-dashboard .technical-symbol-main span {
        direction: ltr;
        unicode-bidi: isolate;
      }

      .technical-dashboard .technical-favorites {
        width: 100%;
        min-width: 0;
        border: 1px solid rgba(47, 214, 192, .12);
        border-radius: 20px;
        background: rgba(47, 214, 192, .055);
        padding: 10px;
      }

      .technical-dashboard .technical-selected-summary {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
        gap: 12px;
        border: 1px solid rgba(47, 214, 192, .16);
        border-radius: 26px;
        background:
          linear-gradient(135deg, rgba(29, 140, 255, .05), rgba(47, 214, 192, .07)),
          rgba(255, 255, 255, .72);
        padding: 12px;
      }

      .technical-dashboard .technical-summary-item,
      .technical-dashboard .technical-data-card,
      .technical-dashboard .technical-range-card,
      .technical-dashboard .technical-education-card,
      .technical-dashboard .technical-tab-disclaimer,
      .technical-dashboard .technical-empty-state,
      .technical-dashboard .technical-partial-state {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        align-self: start;
      }

      .technical-dashboard .technical-summary-item {
        min-height: 96px;
        align-items: center;
      }

      .technical-dashboard .technical-summary-item strong,
      .technical-dashboard .technical-data-card > strong,
      .technical-dashboard .technical-data-rows b {
        overflow-wrap: anywhere;
        word-break: normal;
      }

      .technical-dashboard .technical-data-grid {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 14px !important;
      }

      .technical-dashboard .technical-data-card {
        min-height: 160px;
        align-content: start;
      }

      .technical-dashboard .technical-range-card {
        overflow: hidden;
      }

      .technical-dashboard .technical-range-track {
        width: 100%;
        min-width: 0;
      }

      .technical-dashboard .technical-empty-state {
        min-height: auto;
      }

      .technical-dashboard .market-empty-state {
        width: 100%;
        max-width: 100%;
        min-width: 0;
      }

      .dark .technical-dashboard {
        background:
          radial-gradient(circle at top right, rgba(29, 140, 255, .18), transparent 36%),
          linear-gradient(135deg, rgba(47, 214, 192, .08), rgba(29, 140, 255, .08)),
          #0a1422;
        border-color: #1d3050;
        box-shadow: 0 24px 64px rgba(0, 0, 0, .28);
      }

      .dark .technical-dashboard .technical-selector-shell,
      .dark .technical-dashboard .technical-selected-summary,
      .dark .technical-dashboard .technical-selected-chip,
      .dark .technical-dashboard .technical-search,
      .dark .technical-dashboard .technical-favorites {
        background:
          linear-gradient(135deg, rgba(29, 140, 255, .07), rgba(47, 214, 192, .06)),
          #0f1d31 !important;
        border-color: #1d3050;
      }

      .dark .technical-selected-chip-icon {
        color: #67E8F9;
        background: rgba(47, 214, 192, .12);
        border-color: rgba(47, 214, 192, .28);
        box-shadow: none;
      }

      .technical-dashboard .technical-summary-item,
      .technical-dashboard .technical-data-card {
        border-color: rgba(29, 140, 255, .14);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, .95), rgba(244, 248, 252, .86)),
          var(--sfm-card);
        border-radius: 24px;
        box-shadow: 0 14px 34px rgba(3, 18, 37, .06);
      }

      .technical-dashboard .technical-summary-item {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 13px;
        min-height: 98px;
        padding: 16px;
      }

      .technical-dashboard .technical-summary-item > span,
      .technical-dashboard .technical-data-card-head span,
      .technical-dashboard .technical-range-head > span,
      .technical-dashboard .technical-education-head > span,
      .technical-dashboard .technical-tab-disclaimer > svg {
        width: 42px;
        height: 42px;
        border-radius: 17px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        background: #ECFEFF;
        color: #0891B2;
        border: 1px solid #A5F3FC;
        box-shadow: 0 10px 22px rgba(8, 145, 178, .10);
      }

      .technical-dashboard .technical-summary-item > span svg,
      .technical-dashboard .technical-data-card-head span svg,
      .technical-dashboard .technical-range-head > span svg,
      .technical-dashboard .technical-education-head > span svg,
      .technical-dashboard .technical-tab-disclaimer > svg {
        width: 20px;
        height: 20px;
      }

      .technical-dashboard .technical-summary-item small {
        display: block;
        color: #475569;
        font-size: 12px;
        font-weight: 950;
        line-height: 1.45;
        margin-bottom: 6px;
      }

      .technical-dashboard .technical-summary-item strong {
        display: block;
        min-width: 0;
        color: #0F172A;
        font-size: clamp(16px, 1.35vw, 19px);
        font-weight: 950;
        line-height: 1.45;
        font-variant-numeric: tabular-nums;
        overflow-wrap: anywhere;
      }

      .technical-dashboard .technical-data-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 16px !important;
      }

      .technical-dashboard .technical-data-card {
        min-height: 0;
        height: auto;
        gap: 14px;
        padding: 18px;
        align-content: start;
      }

      .technical-dashboard .technical-data-card-head {
        align-items: center;
        gap: 11px;
      }

      .technical-dashboard .technical-data-card h3 {
        color: #0F172A;
        font-size: 15px;
        font-weight: 950;
        line-height: 1.45;
      }

      .technical-dashboard .technical-data-card > strong {
        color: #0F172A;
        font-size: clamp(24px, 2.2vw, 34px);
        font-weight: 950;
        line-height: 1.15;
        font-variant-numeric: tabular-nums;
      }

      .technical-dashboard .technical-data-rows {
        gap: 9px;
      }

      .technical-dashboard .technical-data-rows div {
        min-width: 0;
        border-color: rgba(29, 140, 255, .12);
        background: rgba(248, 250, 252, .92);
        border-radius: 16px;
        padding: 10px 12px;
      }

      .technical-dashboard .technical-data-rows small {
        color: #475569;
        font-size: 12px;
        font-weight: 950;
      }

      .technical-dashboard .technical-data-rows b {
        color: #0F172A;
        font-size: 14px;
        font-weight: 950;
        font-variant-numeric: tabular-nums;
      }

      .technical-dashboard .technical-data-card.support .technical-data-card-head span {
        color: #047857;
        background: #ECFDF5;
        border-color: #A7F3D0;
      }

      .technical-dashboard .technical-data-card.resistance .technical-data-card-head span {
        color: #B91C1C;
        background: #FEF2F2;
        border-color: #FECACA;
      }

      .technical-dashboard .technical-data-card.signal {
        background:
          linear-gradient(135deg, rgba(29, 140, 255, .08), rgba(47, 214, 192, .10)),
          var(--sfm-card);
      }

      .technical-dashboard .technical-data-card-foot {
        border-color: rgba(15, 118, 110, .20);
        background: rgba(204, 251, 241, .72);
        color: #0F766E;
        padding: 8px 11px;
        font-size: 12px;
        line-height: 1.5;
      }

      .technical-dashboard .technical-category-row button {
        border-color: #D7E8F5;
        background: rgba(255, 255, 255, .92);
        color: #334155;
        box-shadow: 0 8px 18px rgba(3, 18, 37, .035);
      }

      .technical-dashboard .technical-category-row button[aria-pressed="true"],
      .technical-dashboard .technical-category-row button:hover,
      .technical-dashboard .technical-category-row button:focus-visible {
        border-color: transparent;
        background: linear-gradient(135deg, #1D8CFF, #2FD6C0);
        color: #FFFFFF;
        box-shadow: 0 14px 30px rgba(29, 140, 255, .20);
      }

      .technical-dashboard .technical-symbol-pill {
        border-color: #D7E8F5;
        background: rgba(255, 255, 255, .94);
        color: #334155;
        box-shadow: 0 8px 18px rgba(3, 18, 37, .045);
      }

      .technical-dashboard .technical-symbol-pill[data-active="true"] {
        background: linear-gradient(135deg, #1D8CFF, #2FD6C0);
        color: #FFFFFF;
        border-color: transparent;
        box-shadow: 0 14px 30px rgba(29, 140, 255, .22);
      }

      .technical-dashboard .technical-symbol-favorite {
        color: inherit;
        opacity: .86;
      }

      .technical-dashboard .technical-symbol-pill:not([data-active="true"]) .technical-symbol-favorite[aria-pressed="true"] {
        color: #0F766E;
        background: rgba(204, 251, 241, .80);
      }

      .technical-dashboard .technical-range-card,
      .technical-dashboard .technical-education-card,
      .technical-dashboard .technical-tab-disclaimer {
        border-radius: 28px;
        border-color: rgba(29, 140, 255, .14);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, .96), rgba(244, 248, 252, .86)),
          var(--sfm-card);
      }

      .technical-dashboard .technical-range-card {
        gap: 18px;
      }

      .technical-dashboard .technical-range-track {
        height: 112px;
        border-radius: 24px;
        background:
          linear-gradient(90deg, rgba(16, 185, 129, .10), rgba(29, 140, 255, .10), rgba(239, 68, 68, .10)),
          rgba(248, 250, 252, .92);
      }

      .technical-dashboard .technical-range-fill {
        top: 58px;
        height: 5px;
      }

      .technical-dashboard .technical-range-marker {
        top: 20px;
        gap: 8px;
        min-width: 82px;
      }

      .technical-dashboard .technical-range-marker b,
      .technical-dashboard .technical-range-marker small {
        padding: 6px 9px;
        font-size: 12px;
      }

      .technical-dashboard .technical-range-marker::after {
        width: 15px;
        height: 15px;
        box-shadow: 0 0 0 5px rgba(255, 255, 255, .92);
      }

      .technical-dashboard .technical-education-list li {
        grid-template-columns: auto minmax(0, 1fr);
        gap: 10px;
        border-color: rgba(29, 140, 255, .12);
        background: rgba(248, 250, 252, .92);
        border-radius: 20px;
        padding: 13px;
      }

      .technical-dashboard .technical-education-list b {
        min-width: 52px;
        text-align: center;
        border: 1px solid rgba(15, 118, 110, .20);
        border-radius: 999px;
        background: rgba(204, 251, 241, .76);
        color: #0F766E;
        padding: 6px 9px;
        font-size: 12px;
        line-height: 1.2;
      }

      .technical-dashboard .technical-education-list span {
        color: #334155;
        font-size: 13.5px;
        font-weight: 850;
        line-height: 1.75;
      }

      .dark .technical-dashboard .technical-summary-item,
      .dark .technical-dashboard .technical-data-card,
      .dark .technical-dashboard .technical-range-card,
      .dark .technical-dashboard .technical-education-card,
      .dark .technical-dashboard .technical-tab-disclaimer {
        background:
          linear-gradient(135deg, rgba(29, 140, 255, .07), rgba(47, 214, 192, .06)),
          #0f1d31;
        border-color: #1d3050;
        box-shadow: 0 18px 42px rgba(0, 0, 0, .22);
      }

      .dark .technical-dashboard .technical-summary-item > span,
      .dark .technical-dashboard .technical-data-card-head span,
      .dark .technical-dashboard .technical-range-head > span,
      .dark .technical-dashboard .technical-education-head > span,
      .dark .technical-dashboard .technical-tab-disclaimer > svg {
        background: rgba(47, 214, 192, .12);
        color: #67E8F9;
        border-color: rgba(47, 214, 192, .28);
        box-shadow: none;
      }

      .dark .technical-dashboard .technical-summary-item small,
      .dark .technical-dashboard .technical-data-rows small {
        color: #B8C7D9;
      }

      .dark .technical-dashboard .technical-summary-item strong,
      .dark .technical-dashboard .technical-data-card h3,
      .dark .technical-dashboard .technical-data-card > strong,
      .dark .technical-dashboard .technical-data-rows b,
      .dark .technical-dashboard .technical-range-marker small {
        color: #E8EEF6;
      }

      .dark .technical-dashboard .technical-data-rows div,
      .dark .technical-dashboard .technical-range-track,
      .dark .technical-dashboard .technical-education-list li {
        background: #13243A;
        border-color: #1D3050;
      }

      .dark .technical-dashboard .technical-data-card.support .technical-data-card-head span {
        color: #86EFAC;
        background: rgba(34, 197, 94, .14);
        border-color: rgba(34, 197, 94, .28);
      }

      .dark .technical-dashboard .technical-data-card.resistance .technical-data-card-head span {
        color: #FDA4AF;
        background: rgba(255, 91, 110, .13);
        border-color: rgba(255, 91, 110, .28);
      }

      .dark .technical-dashboard .technical-data-card-foot,
      .dark .technical-dashboard .technical-education-list b {
        background: rgba(47, 214, 192, .12);
        border-color: rgba(47, 214, 192, .28);
        color: #B8FFF4;
      }

      .dark .technical-dashboard .technical-education-list span {
        color: #B8C7D9;
      }

      .dark .technical-dashboard .technical-category-row button,
      .dark .technical-dashboard .technical-symbol-pill {
        background: #0F1D31;
        border-color: #1D3050;
        color: #B8C7D9;
        box-shadow: none;
      }

      .dark .technical-dashboard .technical-category-row button[aria-pressed="true"],
      .dark .technical-dashboard .technical-category-row button:hover,
      .dark .technical-dashboard .technical-category-row button:focus-visible {
        border-color: transparent;
        background: linear-gradient(135deg, #1D8CFF, #2FD6C0);
        color: #FFFFFF;
        box-shadow: 0 14px 30px rgba(29, 140, 255, .20);
      }

      .dark .technical-dashboard .technical-symbol-pill[data-active="true"] {
        background: linear-gradient(135deg, #1D8CFF, #2FD6C0);
        color: #FFFFFF;
        border-color: transparent;
      }

      @media (max-width: 1180px) {
        .technical-dashboard .technical-selected-summary {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        .technical-dashboard .technical-data-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
      }

      @media (max-width: 780px) {
        .technical-dashboard {
          border-radius: 26px;
          padding: 15px;
        }

        .technical-dashboard .technical-dashboard-head,
        .technical-search-row {
          grid-template-columns: 1fr;
        }

        .technical-dashboard .technical-refresh-button,
        .technical-dashboard .technical-search-apply {
          width: 100%;
        }

        .technical-dashboard .technical-category-row,
        .technical-dashboard .technical-symbol-row {
          flex-wrap: nowrap !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          padding: 2px 2px 9px !important;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }

        .technical-dashboard .technical-category-row::-webkit-scrollbar,
        .technical-dashboard .technical-symbol-row::-webkit-scrollbar {
          display: none;
        }

        .technical-dashboard .technical-selected-summary,
        .technical-dashboard .technical-data-grid,
        .technical-dashboard .technical-education-list {
          grid-template-columns: 1fr !important;
        }

        .technical-dashboard .technical-range-card {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .technical-dashboard .technical-range-track {
          min-width: 560px;
        }
      }

      @media (max-width: 460px) {
        .technical-dashboard .technical-summary-item,
        .technical-dashboard .technical-data-card {
          min-height: auto;
        }

        .technical-dashboard .technical-symbol-main {
          padding-inline: 10px;
          font-size: 12px;
        }
      }

      .technical-dashboard .technical-selector-shell {
        align-content: start !important;
        gap: 14px !important;
        height: auto !important;
        min-height: 0 !important;
        padding: clamp(12px, 1.6vw, 18px) !important;
        border-color: rgba(14, 165, 233, .18) !important;
        background:
          linear-gradient(135deg, rgba(239, 246, 255, .86), rgba(240, 253, 250, .72)),
          rgba(255, 255, 255, .92) !important;
      }

      .technical-dashboard .technical-search-row {
        grid-template-columns: minmax(220px, 300px) minmax(0, 1fr) auto !important;
        gap: 14px !important;
        align-items: stretch !important;
      }

      .technical-dashboard .technical-selected-chip {
        min-height: 74px !important;
        border-color: rgba(14, 165, 233, .18) !important;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, .96), rgba(240, 249, 255, .90)) !important;
        box-shadow: 0 12px 26px rgba(15, 23, 42, .055);
      }

      .technical-dashboard .technical-selected-chip small {
        color: #64748B !important;
      }

      .technical-dashboard .technical-selected-chip strong {
        color: #0F172A !important;
        font-size: clamp(17px, 1.5vw, 20px) !important;
      }

      .technical-dashboard .technical-selected-chip span:not(.technical-selected-chip-icon) {
        min-width: 0;
        color: #475569;
        font-size: 12px;
        font-weight: 800;
        line-height: 1.45;
        overflow-wrap: anywhere;
      }

      .technical-dashboard .technical-search {
        min-height: 58px !important;
        border: 1px solid rgba(14, 165, 233, .18) !important;
        background: rgba(255, 255, 255, .94) !important;
        box-shadow: 0 12px 26px rgba(15, 23, 42, .045);
      }

      .technical-dashboard .technical-search:focus-within {
        border-color: rgba(6, 182, 212, .56) !important;
        box-shadow: 0 0 0 4px rgba(45, 212, 191, .18), 0 14px 28px rgba(15, 23, 42, .06) !important;
      }

      .technical-dashboard .technical-search input {
        color: #0F172A !important;
        font-weight: 850 !important;
      }

      .technical-dashboard .technical-search input::placeholder {
        color: #64748B !important;
      }

      .technical-dashboard .technical-search-apply {
        min-height: 58px;
        min-width: 112px;
        border: 0;
        border-radius: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 0 20px;
        cursor: pointer;
        color: #FFFFFF;
        background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
        box-shadow: 0 14px 30px rgba(29, 140, 255, .18);
        font: 950 14px Tajawal, Arial, sans-serif;
        transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
        white-space: nowrap;
      }

      .technical-dashboard .technical-search-apply:hover {
        transform: translateY(-1px);
        filter: saturate(1.06) brightness(1.03);
        box-shadow: 0 18px 38px rgba(24, 212, 212, .24);
      }

      .technical-dashboard .technical-search-apply:active {
        transform: translateY(0) scale(.985);
      }

      .technical-dashboard .technical-search-apply:focus-visible {
        outline: 3px solid rgba(24, 212, 212, .30);
        outline-offset: 3px;
      }

      .technical-dashboard .technical-search-apply:disabled {
        cursor: not-allowed;
        opacity: .72;
        transform: none;
        filter: none;
      }

      .technical-dashboard .technical-category-row,
      .technical-dashboard .technical-symbol-row {
        align-items: center !important;
        gap: 10px !important;
      }

      .technical-dashboard .technical-category-row button {
        border: 1px solid rgba(148, 163, 184, .28) !important;
        background: rgba(255, 255, 255, .86) !important;
        color: #334155 !important;
        box-shadow: 0 8px 18px rgba(15, 23, 42, .035) !important;
        transition: transform .18s ease, border-color .18s ease, background .18s ease, color .18s ease, box-shadow .18s ease;
      }

      .technical-dashboard .technical-category-row button[aria-pressed="true"],
      .technical-dashboard .technical-category-row button:hover,
      .technical-dashboard .technical-category-row button:focus-visible {
        border-color: transparent !important;
        background: linear-gradient(135deg, #1D8CFF, #2FD6C0) !important;
        color: #FFFFFF !important;
        box-shadow: 0 14px 30px rgba(29, 140, 255, .22) !important;
      }

      .technical-dashboard .technical-category-row button:active,
      .technical-dashboard .technical-symbol-pill:active {
        transform: scale(.98);
      }

      .technical-dashboard .technical-symbol-pill {
        border: 1px solid rgba(148, 163, 184, .28) !important;
        background: rgba(255, 255, 255, .92) !important;
        color: #334155 !important;
        box-shadow: 0 8px 18px rgba(15, 23, 42, .04) !important;
        transition: transform .18s ease, border-color .18s ease, background .18s ease, color .18s ease, box-shadow .18s ease;
      }

      .technical-dashboard .technical-symbol-pill:hover,
      .technical-dashboard .technical-symbol-pill:focus-within {
        border-color: rgba(6, 182, 212, .46) !important;
        background: #ECFEFF !important;
        color: #0F766E !important;
        box-shadow: 0 12px 26px rgba(8, 145, 178, .11) !important;
      }

      .technical-dashboard .technical-symbol-pill[data-active="true"] {
        border-color: transparent !important;
        background: linear-gradient(135deg, #1D8CFF, #2FD6C0) !important;
        color: #FFFFFF !important;
        box-shadow: 0 14px 30px rgba(29, 140, 255, .24) !important;
      }

      .technical-dashboard .technical-symbol-main {
        font-weight: 950 !important;
        letter-spacing: .01em;
      }

      .technical-dashboard .technical-no-results {
        width: 100%;
        border: 1px dashed rgba(14, 165, 233, .24) !important;
        border-radius: 18px !important;
        background: rgba(240, 249, 255, .78) !important;
        color: #475569 !important;
        padding: 12px 14px !important;
        text-align: center;
      }

      .dark .technical-dashboard .technical-selector-shell {
        background:
          linear-gradient(135deg, rgba(29, 140, 255, .08), rgba(47, 214, 192, .07)),
          #0F1D31 !important;
        border-color: #1D3050 !important;
      }

      .dark .technical-dashboard .technical-selected-chip,
      .dark .technical-dashboard .technical-search {
        background:
          linear-gradient(135deg, rgba(19, 36, 58, .94), rgba(15, 29, 49, .96)) !important;
        border-color: #1D3050 !important;
        box-shadow: none !important;
      }

      .dark .technical-dashboard .technical-selected-chip small,
      .dark .technical-dashboard .technical-selected-chip span:not(.technical-selected-chip-icon),
      .dark .technical-dashboard .technical-search input::placeholder {
        color: #B8C7D9 !important;
      }

      .dark .technical-dashboard .technical-selected-chip strong,
      .dark .technical-dashboard .technical-search input {
        color: #E8EEF6 !important;
      }

      .dark .technical-dashboard .technical-search:focus-within {
        border-color: rgba(47, 214, 192, .58) !important;
        box-shadow: 0 0 0 4px rgba(47, 214, 192, .12) !important;
      }

      .dark .technical-dashboard .technical-search-apply {
        color: #061A2E;
        box-shadow: 0 16px 34px rgba(47, 214, 192, .16);
      }

      .dark .technical-dashboard .technical-category-row button,
      .dark .technical-dashboard .technical-symbol-pill {
        border-color: #1D3050 !important;
        background: #13243A !important;
        color: #B8C7D9 !important;
        box-shadow: none !important;
      }

      .dark .technical-dashboard .technical-symbol-pill:hover,
      .dark .technical-dashboard .technical-symbol-pill:focus-within {
        border-color: rgba(47, 214, 192, .46) !important;
        background: #0F1D31 !important;
        color: #B8FFF4 !important;
      }

      .dark .technical-dashboard .technical-category-row button[aria-pressed="true"],
      .dark .technical-dashboard .technical-category-row button:hover,
      .dark .technical-dashboard .technical-category-row button:focus-visible,
      .dark .technical-dashboard .technical-symbol-pill[data-active="true"] {
        border-color: transparent !important;
        background: linear-gradient(135deg, #1D8CFF, #2FD6C0) !important;
        color: #FFFFFF !important;
        box-shadow: 0 14px 30px rgba(29, 140, 255, .18) !important;
      }

      .dark .technical-dashboard .technical-no-results {
        border-color: #1D3050 !important;
        background: #13243A !important;
        color: #B8C7D9 !important;
      }

      @media (max-width: 780px) {
        .technical-dashboard .technical-selector-shell {
          gap: 12px !important;
          padding: 12px !important;
        }

        .technical-dashboard .technical-search-row {
          grid-template-columns: 1fr !important;
        }

        .technical-dashboard .technical-selected-chip {
          min-height: 70px !important;
        }

        .technical-dashboard .technical-category-row,
        .technical-dashboard .technical-symbol-row {
          flex-wrap: nowrap !important;
          justify-content: flex-start !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          padding: 2px 2px 10px !important;
          scroll-padding-inline: 12px;
        }

        .technical-dashboard .technical-category-row button,
        .technical-dashboard .technical-symbol-pill {
          flex: 0 0 auto !important;
          white-space: nowrap !important;
        }
      }

      .market-active-dashboard > .trader-premium-dashboard {
        width: 100%;
        max-width: 1400px;
        min-width: 0;
        margin-inline: auto;
        justify-self: stretch;
        align-self: start;
      }

      .trader-premium-dashboard {
        width: 100%;
        max-width: 1400px;
        min-width: 0;
        display: grid;
        gap: clamp(16px, 2vw, 22px);
        align-content: start;
        align-self: start;
        overflow: hidden;
        box-sizing: border-box;
      }

      .trader-premium-dashboard *,
      .trader-premium-dashboard *::before,
      .trader-premium-dashboard *::after {
        box-sizing: border-box;
      }

      .trader-premium-dashboard {
        overflow: visible;
      }

      .trader-premium-dashboard .trader-premium-header {
        position: relative;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        overflow: hidden;
      }

      .trader-premium-dashboard .trader-premium-header > div,
      .trader-premium-dashboard .trader-premium-main-head > div {
        min-width: 0;
      }

      .trader-premium-dashboard .trader-premium-header-badge {
        align-self: start;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        width: max-content;
        max-width: 100%;
        min-height: 38px;
        border: 1px solid rgba(47, 214, 192, .28);
        border-radius: 999px;
        background: linear-gradient(135deg, rgba(29, 140, 255, .10), rgba(47, 214, 192, .14));
        color: var(--sfm-primary-hover);
        padding: 0 13px;
        font-size: 12px;
        font-weight: 950;
        line-height: 1.25;
        white-space: nowrap;
      }

      .trader-premium-dashboard .trader-premium-header,
      .trader-premium-dashboard .trader-premium-layout,
      .trader-premium-dashboard .trader-premium-main-card,
      .trader-premium-dashboard .trader-support-column,
      .trader-premium-dashboard .trader-premium-disclaimer,
      .trader-premium-dashboard .trader-accordion-list,
      .trader-premium-dashboard .trader-accordion-panel,
      .trader-premium-dashboard .trader-premium-panel-grid,
      .trader-premium-dashboard .trader-result-stack,
      .trader-premium-dashboard .tool-results,
      .trader-premium-dashboard .tool-result-grid,
      .trader-premium-dashboard .trader-form-grid {
        width: 100%;
        max-width: 100%;
        min-width: 0;
      }

      .trader-premium-dashboard .trader-premium-layout {
        direction: ltr;
        display: grid;
        grid-template-columns: minmax(300px, .68fr) minmax(0, 1.32fr);
        grid-template-areas: "support main";
        gap: clamp(16px, 2vw, 22px);
        align-items: start;
      }

      .trader-premium-dashboard .trader-premium-main-card,
      .trader-premium-dashboard .trader-support-card,
      .trader-premium-dashboard .trader-premium-disclaimer {
        transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
      }

      .trader-premium-dashboard .trader-premium-main-card {
        align-content: start;
        gap: clamp(14px, 1.7vw, 20px);
      }

      .trader-premium-dashboard .trader-tool-switcher {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        display: flex;
        align-items: stretch;
        gap: 10px;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 3px 2px 10px;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
      }

      .trader-premium-dashboard .trader-tool-switcher::-webkit-scrollbar {
        display: none;
      }

      .trader-premium-dashboard .trader-tool-switcher > button {
        flex: 0 0 min(230px, 72vw);
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 10px;
        align-items: center;
        min-height: 76px;
        border: 1px solid rgba(47, 214, 192, .18);
        border-radius: 22px;
        background: linear-gradient(135deg, rgba(255, 255, 255, .84), rgba(234, 246, 255, .56)), var(--sfm-card);
        color: var(--sfm-foreground);
        padding: 12px;
        text-align: start;
        cursor: pointer;
        box-shadow: 0 10px 26px rgba(3, 18, 37, .055);
        transition: transform .18s ease, border-color .18s ease, background .18s ease, box-shadow .18s ease;
      }

      .trader-premium-dashboard .trader-tool-switcher > button:hover,
      .trader-premium-dashboard .trader-tool-switcher > button:focus-visible {
        outline: none;
        transform: translateY(-1px);
        border-color: rgba(47, 214, 192, .38);
        box-shadow: 0 0 0 3px rgba(47, 214, 192, .12), 0 14px 30px rgba(3, 18, 37, .08);
      }

      .trader-premium-dashboard .trader-tool-switcher > button[aria-selected="true"] {
        border-color: transparent;
        background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
        color: #061A2E;
        box-shadow: 0 16px 34px rgba(29, 140, 255, .20);
      }

      .trader-premium-dashboard .trader-tool-switcher strong,
      .trader-premium-dashboard .trader-tool-switcher small {
        display: block;
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .trader-premium-dashboard .trader-tool-switcher strong {
        font-size: 13px;
        font-weight: 950;
        line-height: 1.35;
      }

      .trader-premium-dashboard .trader-tool-switcher small {
        margin-top: 3px;
        color: var(--sfm-muted);
        font-size: 11px;
        font-weight: 850;
        line-height: 1.45;
      }

      .trader-premium-dashboard .trader-tool-switcher > button[aria-selected="true"] small {
        color: rgba(6, 26, 46, .78);
      }

      .trader-premium-dashboard .trader-switcher-icon {
        width: 40px;
        height: 40px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border: 1px solid rgba(47, 214, 192, .24);
        background: rgba(47, 214, 192, .12);
        color: var(--sfm-primary-hover);
      }

      .trader-premium-dashboard .trader-tool-switcher > button[aria-selected="true"] .trader-switcher-icon {
        background: rgba(255, 255, 255, .24);
        border-color: rgba(255, 255, 255, .36);
        color: #061A2E;
      }

      .trader-premium-dashboard .trader-active-workspace {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        border: 1px solid rgba(47, 214, 192, .16);
        border-radius: 28px;
        background: linear-gradient(135deg, rgba(29, 140, 255, .045), rgba(47, 214, 192, .07)), var(--sfm-light-card);
        padding: clamp(12px, 1.7vw, 18px);
        overflow: hidden;
      }

      [dir="rtl"] .trader-premium-dashboard .trader-support-column,
      [dir="rtl"] .trader-premium-dashboard .trader-premium-main-card,
      [dir="rtl"] .trader-premium-dashboard .trader-premium-disclaimer {
        direction: rtl;
      }

      [dir="ltr"] .trader-premium-dashboard .trader-support-column,
      [dir="ltr"] .trader-premium-dashboard .trader-premium-main-card,
      [dir="ltr"] .trader-premium-dashboard .trader-premium-disclaimer {
        direction: ltr;
      }

      .trader-premium-dashboard .trader-support-column {
        grid-area: support;
      }

      .trader-premium-dashboard .trader-premium-main-card {
        grid-area: main;
      }

      .trader-premium-dashboard .trader-tool-card,
      .trader-premium-dashboard .trader-result-stack {
        grid-column: auto;
        width: 100%;
        max-width: 100%;
        min-width: 0;
      }

      .trader-premium-dashboard .trader-premium-panel-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.08fr) minmax(300px, .92fr);
        gap: clamp(14px, 1.6vw, 18px);
        align-items: start;
      }

      .trader-premium-dashboard .trader-accordion-panel {
        overflow: hidden;
      }

      .trader-premium-dashboard .trader-form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .trader-premium-dashboard .tool-input,
      .trader-premium-dashboard .tool-input-shell,
      .trader-premium-dashboard .tool-input input,
      .trader-premium-dashboard .tool-input select {
        max-width: 100%;
        min-width: 0;
      }

      .trader-premium-dashboard .tool-result-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .trader-premium-dashboard .tool-segmented {
        display: grid;
        gap: 8px;
      }

      .trader-premium-dashboard .tool-segmented-row {
        display: flex;
        gap: 8px;
        min-width: 0;
        border: 1px solid rgba(47, 214, 192, .22);
        border-radius: 18px;
        background: linear-gradient(135deg, rgba(255, 255, 255, .84), rgba(234, 246, 255, .58)), var(--sfm-card);
        padding: 5px;
        box-shadow: 0 12px 26px rgba(3, 18, 37, .06);
      }

      .trader-premium-dashboard .tool-segmented-row button {
        flex: 1 1 0;
        min-width: 0;
        min-height: 46px;
        border: 1px solid transparent;
        border-radius: 14px;
        background: transparent;
        color: var(--sfm-muted);
        font: 950 13px Tajawal, Arial, sans-serif;
        cursor: pointer;
        transition: transform .16s ease, box-shadow .16s ease, background .16s ease, color .16s ease;
      }

      .trader-premium-dashboard .tool-segmented-row button:hover,
      .trader-premium-dashboard .tool-segmented-row button:focus-visible {
        outline: none;
        color: var(--sfm-primary-hover);
        background: rgba(47, 214, 192, .10);
        box-shadow: 0 0 0 3px rgba(24, 212, 212, .12);
      }

      .trader-premium-dashboard .tool-segmented-row button[aria-pressed="true"] {
        border-color: transparent;
        background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
        color: #FFFFFF;
        box-shadow: 0 12px 26px rgba(29, 140, 255, .18);
      }

      .trader-premium-dashboard .tool-segmented-row button:active {
        transform: scale(.98);
      }

      .trader-premium-dashboard .tool-result-card,
      .trader-premium-dashboard .trader-highlight-result,
      .trader-premium-dashboard .tool-formula-card {
        min-width: 0;
        overflow: hidden;
      }

      .trader-premium-dashboard .trader-tool-card {
        border-radius: 26px;
        box-shadow: 0 14px 34px rgba(3, 18, 37, .07);
      }

      .trader-premium-dashboard .trader-tool-card-head {
        align-items: center;
      }

      .trader-premium-dashboard .trader-tool-card-head h3,
      .trader-premium-dashboard .trader-tool-card-head p {
        overflow-wrap: anywhere;
      }

      .trader-premium-dashboard .tool-input-shell,
      .trader-premium-dashboard .tool-result-card,
      .trader-premium-dashboard .tool-formula-card,
      .trader-premium-dashboard .trader-highlight-result {
        box-shadow: 0 12px 28px rgba(3, 18, 37, .055);
      }

      .trader-premium-dashboard .tool-result-card {
        position: relative;
        padding-inline-end: 58px;
      }

      .trader-premium-dashboard .tool-result-card::after {
        content: "";
        position: absolute;
        inset-inline-end: 14px;
        top: 14px;
        width: 34px;
        height: 34px;
        border-radius: 14px;
        background: linear-gradient(135deg, rgba(29, 140, 255, .12), rgba(47, 214, 192, .18));
        border: 1px solid rgba(47, 214, 192, .20);
      }

      .trader-premium-dashboard .tool-result-card b,
      .trader-premium-dashboard .trader-highlight-result strong,
      .trader-premium-dashboard .trader-highlight-result b,
      .trader-premium-dashboard .tool-formula-card b {
        direction: ltr;
        unicode-bidi: isolate;
        overflow-wrap: anywhere;
      }

      .dark .trader-premium-dashboard .tool-segmented-row {
        background: linear-gradient(135deg, rgba(29, 140, 255, .07), rgba(47, 214, 192, .06)), #0A1422;
        border-color: #1D3050;
        box-shadow: 0 12px 28px rgba(0, 0, 0, .22);
      }

      .dark .trader-premium-dashboard .tool-segmented-row button {
        color: #B8C7D9;
      }

      .dark .trader-premium-dashboard .tool-segmented-row button:hover,
      .dark .trader-premium-dashboard .tool-segmented-row button:focus-visible {
        color: #E8EEF6;
        background: rgba(47, 214, 192, .12);
      }

      .dark .trader-premium-dashboard .trader-premium-header-badge,
      .dark .trader-premium-dashboard .trader-switcher-icon {
        background: rgba(47, 214, 192, .12);
        border-color: rgba(47, 214, 192, .28);
        color: #2FD6C0;
      }

      .dark .trader-premium-dashboard .trader-tool-switcher > button {
        background: linear-gradient(135deg, rgba(29, 140, 255, .07), rgba(47, 214, 192, .06)), #0A1422;
        border-color: #1D3050;
        color: #E8EEF6;
        box-shadow: 0 12px 28px rgba(0, 0, 0, .22);
      }

      .dark .trader-premium-dashboard .trader-tool-switcher > button:hover,
      .dark .trader-premium-dashboard .trader-tool-switcher > button:focus-visible {
        border-color: rgba(47, 214, 192, .42);
        box-shadow: 0 0 0 3px rgba(47, 214, 192, .14), 0 16px 34px rgba(0, 0, 0, .28);
      }

      .dark .trader-premium-dashboard .trader-tool-switcher > button[aria-selected="true"] {
        background: linear-gradient(135deg, #1D8CFF, #2FD6C0);
        color: #061A2E;
        border-color: transparent;
        box-shadow: 0 18px 36px rgba(29, 140, 255, .22);
      }

      .dark .trader-premium-dashboard .trader-tool-switcher small {
        color: #B8C7D9;
      }

      .dark .trader-premium-dashboard .trader-tool-switcher > button[aria-selected="true"] small,
      .dark .trader-premium-dashboard .trader-tool-switcher > button[aria-selected="true"] .trader-switcher-icon {
        color: #061A2E;
      }

      .dark .trader-premium-dashboard .trader-active-workspace {
        background: linear-gradient(135deg, rgba(29, 140, 255, .08), rgba(47, 214, 192, .07)), #0A1422;
        border-color: #1D3050;
      }

      @media (max-width: 1180px) {
        .trader-premium-dashboard .trader-premium-layout {
          direction: inherit;
          grid-template-columns: 1fr;
          grid-template-areas:
            "main"
            "support";
        }

        .trader-premium-dashboard .trader-premium-panel-grid {
          grid-template-columns: 1fr;
        }

        .trader-premium-dashboard .trader-premium-main-head {
          grid-template-columns: auto minmax(0, 1fr);
        }

        .trader-premium-dashboard .trader-premium-save {
          grid-column: 1 / -1;
          justify-items: stretch;
          min-width: 0;
        }
      }

      @media (max-width: 720px) {
        .trader-premium-dashboard .trader-premium-header {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: start;
        }

        .trader-premium-dashboard .trader-premium-header-badge {
          grid-column: 1 / -1;
          justify-self: start;
          width: fit-content;
          white-space: normal;
        }

        .trader-premium-dashboard .trader-tool-switcher {
          gap: 8px;
          padding-bottom: 8px;
        }

        .trader-premium-dashboard .trader-tool-switcher > button {
          flex-basis: min(210px, 82vw);
          min-height: 68px;
          border-radius: 20px;
          padding: 10px;
        }

        .trader-premium-dashboard .trader-switcher-icon {
          width: 36px;
          height: 36px;
          border-radius: 14px;
        }

        .trader-premium-dashboard .trader-active-workspace {
          border-radius: 22px;
          padding: 12px;
        }

        .trader-premium-dashboard .trader-premium-form-grid,
        .trader-premium-dashboard .trader-form-grid,
        .trader-premium-dashboard .tool-result-grid {
          grid-template-columns: 1fr;
        }

        .trader-premium-dashboard .tool-result-card {
          padding-inline-end: 50px;
        }

        .trader-premium-dashboard .trader-accordion-copy small {
          display: block;
        }
      }

      .trader-premium-dashboard .trader-premium-layout {
        grid-template-columns: minmax(280px, .58fr) minmax(0, 1.42fr);
        gap: clamp(14px, 1.6vw, 20px);
      }

      .trader-premium-dashboard .trader-premium-main-card,
      .trader-premium-dashboard .trader-support-column,
      .trader-premium-dashboard .trader-tool-card,
      .trader-premium-dashboard .trader-result-stack {
        height: auto;
        align-self: start;
        align-content: start;
      }

      .trader-premium-dashboard .trader-premium-main-card {
        padding: clamp(14px, 1.6vw, 20px);
        gap: 14px;
        overflow: visible;
      }

      .trader-premium-dashboard .trader-premium-header {
        padding: clamp(16px, 1.8vw, 22px);
      }

      .trader-premium-dashboard .trader-premium-header p,
      .trader-premium-dashboard .trader-premium-main-head p,
      .trader-premium-dashboard .trader-support-card p {
        line-height: 1.65;
      }

      .trader-premium-dashboard .trader-tool-switcher {
        gap: 9px;
        padding-bottom: 8px;
      }

      .trader-premium-dashboard .trader-tool-switcher > button {
        flex-basis: min(206px, 70vw);
        min-height: 68px;
        border-radius: 20px;
        padding: 10px;
      }

      .trader-premium-dashboard .trader-tool-switcher small {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .trader-premium-dashboard .trader-active-workspace {
        padding: clamp(12px, 1.4vw, 16px);
        overflow: visible;
      }

      .trader-premium-dashboard .trader-premium-panel-grid {
        grid-template-columns: minmax(0, 1.02fr) minmax(300px, .98fr);
        gap: clamp(14px, 1.5vw, 18px);
      }

      .trader-premium-dashboard .trader-field-groups {
        display: grid;
        gap: 12px;
        min-width: 0;
      }

      .trader-premium-dashboard .trader-field-group {
        display: grid;
        gap: 12px;
        min-width: 0;
        border: 1px solid rgba(47, 214, 192, .16);
        border-radius: 22px;
        background: linear-gradient(135deg, rgba(255, 255, 255, .76), rgba(234, 246, 255, .56)), var(--sfm-light-card);
        padding: 13px;
        box-shadow: 0 10px 24px rgba(3, 18, 37, .045);
      }

      .trader-premium-dashboard .trader-field-group-title {
        display: flex;
        align-items: center;
        gap: 9px;
        min-width: 0;
      }

      .trader-premium-dashboard .trader-field-group-title span,
      .trader-premium-dashboard .tool-result-icon {
        width: 34px;
        height: 34px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border: 1px solid rgba(47, 214, 192, .22);
        background: rgba(47, 214, 192, .12);
        color: var(--sfm-primary-hover);
      }

      .trader-premium-dashboard .trader-field-group-title h4 {
        margin: 0;
        min-width: 0;
        color: var(--sfm-foreground);
        font-size: 13px;
        font-weight: 950;
        line-height: 1.35;
      }

      .trader-premium-dashboard .trader-field-group .trader-form-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 11px;
      }

      .trader-premium-dashboard .tool-input-shell {
        min-height: 52px;
        border-radius: 17px;
      }

      .trader-premium-dashboard .tool-input .tool-input-shell input,
      .trader-premium-dashboard .tool-input .tool-input-shell select {
        height: 50px !important;
        font-size: 15px;
      }

      .trader-premium-dashboard .tool-advanced {
        margin-top: 0;
        border-radius: 22px;
        padding: 10px 12px;
      }

      .trader-premium-dashboard .trader-result-stack {
        display: grid;
        gap: 12px;
      }

      .trader-premium-dashboard .trader-highlight-result {
        border-radius: 24px;
        padding: 18px;
        gap: 8px;
        background:
          radial-gradient(circle at 12% 0%, rgba(47, 214, 192, .24), transparent 42%),
          linear-gradient(135deg, rgba(29, 140, 255, .14), rgba(47, 214, 192, .18)),
          var(--sfm-card);
      }

      .trader-premium-dashboard .trader-highlight-result strong {
        font-size: clamp(34px, 4vw, 46px);
        color: #0F766E;
      }

      .trader-premium-dashboard .tool-results {
        padding: 13px;
        border-radius: 24px;
      }

      .trader-premium-dashboard .tool-result-grid {
        gap: 10px;
      }

      .trader-premium-dashboard .tool-result-card {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        grid-template-areas:
          "icon label"
          "icon value";
        column-gap: 10px;
        row-gap: 3px;
        min-height: 86px;
        padding: 13px;
        padding-inline-end: 13px;
        align-items: center;
      }

      .trader-premium-dashboard .tool-result-card::after {
        display: none;
      }

      .trader-premium-dashboard .tool-result-icon {
        grid-area: icon;
      }

      .trader-premium-dashboard .tool-result-card > span:not(.tool-result-icon) {
        grid-area: label;
        color: var(--sfm-muted);
        font-size: 11px;
        font-weight: 950;
        line-height: 1.35;
      }

      .trader-premium-dashboard .tool-result-card b {
        grid-area: value;
        font-size: clamp(18px, 1.65vw, 24px);
        font-variant-numeric: tabular-nums;
      }

      .trader-premium-dashboard .tool-formula-card {
        border-radius: 22px;
        padding: 14px;
      }

      .trader-premium-dashboard .trader-support-card {
        padding: 14px;
        border-radius: 22px;
      }

      .trader-premium-dashboard .trader-support-icon {
        width: 36px;
        height: 36px;
        border-radius: 14px;
      }

      .trader-premium-dashboard .trader-steps {
        list-style: none;
        padding: 0;
        margin: 10px 0 0;
        counter-reset: trader-step;
      }

      .trader-premium-dashboard .trader-steps li {
        counter-increment: trader-step;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 9px;
        align-items: start;
        color: var(--sfm-muted);
        font-size: 12px;
        font-weight: 850;
        line-height: 1.65;
      }

      .trader-premium-dashboard .trader-steps li::before {
        content: counter(trader-step);
        width: 24px;
        height: 24px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
        color: #FFFFFF;
        font-size: 11px;
        font-weight: 950;
      }

      .dark .trader-premium-dashboard .trader-field-group {
        background: linear-gradient(135deg, rgba(29, 140, 255, .08), rgba(47, 214, 192, .07)), #0A1422;
        border-color: #1D3050;
        box-shadow: 0 12px 28px rgba(0, 0, 0, .22);
      }

      .dark .trader-premium-dashboard .trader-field-group-title span,
      .dark .trader-premium-dashboard .tool-result-icon {
        background: rgba(47, 214, 192, .12);
        border-color: rgba(47, 214, 192, .25);
        color: #2FD6C0;
      }

      .dark .trader-premium-dashboard .trader-highlight-result strong {
        color: #2FD6C0;
      }

      .trader-premium-dashboard .trader-tool-switcher-shell {
        display: grid;
        grid-template-columns: 46px minmax(0, 1fr) 46px;
        gap: 10px;
        align-items: center;
        width: 100%;
        max-width: 100%;
        min-width: 0;
      }

      .trader-premium-dashboard .trader-switcher-arrow {
        width: 46px;
        height: 46px;
        border-radius: 18px;
        border: 1px solid rgba(47, 214, 192, .22);
        background: linear-gradient(135deg, rgba(255, 255, 255, .88), rgba(234, 246, 255, .62)), var(--sfm-card);
        color: var(--sfm-primary-hover);
        display: inline-grid;
        place-items: center;
        cursor: pointer;
        box-shadow: 0 10px 24px rgba(3, 18, 37, .055);
        transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease, background .16s ease;
      }

      .trader-premium-dashboard .trader-switcher-arrow:hover,
      .trader-premium-dashboard .trader-switcher-arrow:focus-visible {
        outline: none;
        transform: translateY(-1px);
        border-color: rgba(47, 214, 192, .42);
        box-shadow: 0 0 0 3px rgba(47, 214, 192, .12), 0 14px 28px rgba(3, 18, 37, .08);
      }

      .trader-premium-dashboard .trader-switcher-arrow:active {
        transform: scale(.97);
      }

      .trader-premium-dashboard .trader-premium-save {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        justify-items: stretch;
        gap: 10px;
        min-width: min(320px, 100%);
        max-width: 100%;
        border: 1px solid rgba(47, 214, 192, .18);
        border-radius: 20px;
        background: linear-gradient(135deg, rgba(255, 255, 255, .78), rgba(234, 246, 255, .56)), var(--sfm-card);
        padding: 10px;
        box-shadow: 0 10px 24px rgba(3, 18, 37, .05);
      }

      .trader-premium-dashboard .trader-premium-save-icon {
        width: 36px;
        height: 36px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        background: rgba(47, 214, 192, .12);
        border: 1px solid rgba(47, 214, 192, .22);
        color: var(--sfm-primary-hover);
      }

      .trader-premium-dashboard .trader-premium-save div {
        display: grid;
        gap: 3px;
        min-width: 0;
      }

      .trader-premium-dashboard .trader-premium-save strong {
        color: var(--sfm-foreground);
        font-size: 12px;
        font-weight: 950;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }

      .trader-premium-dashboard .trader-premium-save div small {
        color: var(--sfm-muted);
        font-size: 11px;
        font-weight: 850;
        line-height: 1.45;
      }

      .trader-premium-dashboard .trader-premium-save button {
        width: max-content;
        min-width: 116px;
        min-height: 40px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        border: 0;
        border-radius: 14px;
        background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
        color: #FFFFFF;
        padding: 0 13px;
        font: 950 12px Tajawal, Arial, sans-serif;
        white-space: nowrap;
      }

      .trader-premium-dashboard .trader-premium-save > small {
        grid-column: 1 / -1;
        justify-self: start;
      }

      .dark .trader-premium-dashboard .trader-switcher-arrow,
      .dark .trader-premium-dashboard .trader-premium-save {
        background: linear-gradient(135deg, rgba(29, 140, 255, .08), rgba(47, 214, 192, .07)), #0A1422;
        border-color: #1D3050;
        box-shadow: 0 12px 28px rgba(0, 0, 0, .22);
      }

      .dark .trader-premium-dashboard .trader-switcher-arrow,
      .dark .trader-premium-dashboard .trader-premium-save-icon {
        color: #2FD6C0;
      }

      .dark .trader-premium-dashboard .trader-premium-save-icon {
        background: rgba(47, 214, 192, .12);
        border-color: rgba(47, 214, 192, .25);
      }

      .dark .trader-premium-dashboard .trader-premium-save strong {
        color: #E8EEF6;
      }

      .dark .trader-premium-dashboard .trader-premium-save div small {
        color: #B8C7D9;
      }

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
          border-radius: 15px;
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
        border-radius: 14px;
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
        border-radius: 20px;
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
        border-radius: 18px;
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
        border-radius: 15px;
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
        border-radius: 20px;
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
        border-radius: 15px;
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
          border-radius: 16px;
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

