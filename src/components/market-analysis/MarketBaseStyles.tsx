'use client';

export function MarketBaseStyles() {
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
    `}</style>
  );
}
