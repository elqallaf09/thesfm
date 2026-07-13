'use client';

export function MarketTraderStyles() {
  return (
    <style jsx global>{`

        .portfolio-comparison-grid {
          grid-template-columns: 1fr}

        .portfolio-comparison-metric,
        .portfolio-comparison-metric:nth-child(odd) {
          border-inline-end: 0}

        .portfolio-comparison-metric:nth-last-child(-n + 2) {
          border-bottom: 1px solid var(--border)}

        .portfolio-comparison-metric:last-child {
          border-bottom: 0}
      }

      .market-active-dashboard > .technical-dashboard {
        width: 100%;
        max-width: 1400px;
        min-width: 0;
        margin-inline: auto}

      .technical-dashboard {
        display: grid;
        gap: clamp(16px, 2vw, 22px);
        align-content: start;
        align-self: start;
        height: auto;
        border: 1px solid var(--border);
        border-radius: var(--radius-panel);
        background: var(--surface);
        box-shadow: var(--shadow-card);
        padding: clamp(16px, 2.4vw, 28px);
        overflow: hidden;
        box-sizing: border-box}

      .technical-dashboard *,
      .technical-dashboard *::before,
      .technical-dashboard *::after {
        box-sizing: border-box}

      .technical-dashboard-body,
      .technical-content-stage {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        display: grid;
        gap: clamp(14px, 1.8vw, 20px);
        align-content: start}

      .technical-dashboard .technical-dashboard-head {
        width: 100%;
        max-width: 100%;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        margin: 0}

      .technical-dashboard-title {
        min-width: 0}

      .technical-dashboard .technical-selector-shell {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        display: grid;
        gap: 15px;
        border: 1px solid var(--border);
        border-radius: var(--radius-panel);
        background: var(--surface) !important;
        box-shadow: var(--shadow-card);
        padding: clamp(14px, 1.8vw, 18px);
        overflow: hidden}

      .technical-search-row {
        display: grid;
        grid-template-columns: minmax(180px, 260px) minmax(0, 1fr);
        gap: 12px;
        align-items: stretch;
        width: 100%;
        min-width: 0}

      .technical-selected-chip {
        min-width: 0;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        column-gap: 11px;
        align-content: center;
        gap: 5px;
        border: 1px solid var(--border);
        border-radius: var(--radius-card);
        background: var(--primary-soft);
        padding: 12px 14px}

      .technical-selected-chip-icon {
        width: 38px;
        height: 38px;
        border-radius: var(--radius-card);
        display: grid;
        place-items: center;
        color: var(--info);
        background: var(--primary-soft);
        border: 1px solid var(--border);
        box-shadow: var(--shadow-card)}

      .technical-selected-chip > div {
        min-width: 0;
        display: grid;
        gap: 5px}

      .technical-selected-chip small {
        color: var(--foreground-muted);
        font-size: 11px;
        font-weight: 700;
        line-height: 1.35}

      .technical-selected-chip strong {
        color: var(--foreground);
        font-size: 18px;
        font-weight: 700;
        line-height: 1.25;
        letter-spacing: .02em;
        overflow-wrap: anywhere}

      .technical-dashboard .technical-search {
        width: 100%;
        min-width: 0;
        min-height: 50px;
        border-radius: var(--radius-card);
        background: var(--surface)}

      .technical-dashboard .technical-search button span {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1}

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
        padding: 2px}

      .technical-dashboard .technical-category-row button {
        flex: 0 0 auto;
        min-height: 42px;
        border-radius: var(--radius-pill);
        padding: 0 17px;
        font-size: 13px;
        line-height: 1.2}

      .technical-dashboard .technical-symbol-pill {
        flex: 0 0 auto;
        min-height: 44px;
        max-width: 100%;
        border-radius: var(--radius-pill)}

      .technical-dashboard .technical-symbol-main {
        min-height: 36px;
        padding: 0 13px;
        font-size: 13px;
        line-height: 1.2;
        white-space: nowrap}

      .technical-dashboard .technical-symbol-main span {
        direction: ltr;
        unicode-bidi: isolate}

      .technical-dashboard .technical-favorites {
        width: 100%;
        min-width: 0;
        border: 1px solid var(--border);
        border-radius: var(--radius-card);
        background: var(--primary-soft);
        padding: 10px}

      .technical-dashboard .technical-selected-summary {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
        gap: 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius-panel);
        background: var(--surface);
        padding: 12px}

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
        align-self: start}

      .technical-dashboard .technical-summary-item {
        min-height: 96px;
        align-items: center}

      .technical-dashboard .technical-summary-item strong,
      .technical-dashboard .technical-data-card > strong,
      .technical-dashboard .technical-data-rows b {
        overflow-wrap: anywhere;
        word-break: normal}

      .technical-dashboard .technical-data-grid {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 14px !important}

      .technical-dashboard .technical-data-card {
        min-height: 160px;
        align-content: start}

      .technical-dashboard .technical-range-card {
        overflow: hidden}

      .technical-dashboard .technical-range-track {
        width: 100%;
        min-width: 0}

      .technical-dashboard .technical-empty-state {
        min-height: auto}

      .technical-dashboard .market-empty-state {
        width: 100%;
        max-width: 100%;
        min-width: 0}

      .technical-dashboard .technical-summary-item,
      .technical-dashboard .technical-data-card {
        border-color: var(--border);
        background: var(--surface);
        border-radius: var(--radius-panel);
        box-shadow: var(--shadow-card)}

      .technical-dashboard .technical-summary-item {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 13px;
        min-height: 98px;
        padding: 16px}

      .technical-dashboard .technical-summary-item > span,
      .technical-dashboard .technical-data-card-head span,
      .technical-dashboard .technical-range-head > span,
      .technical-dashboard .technical-education-head > span,
      .technical-dashboard .technical-tab-disclaimer > svg {
        width: 42px;
        height: 42px;
        border-radius: var(--radius-card);
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        background: var(--surface);
        color: var(--info);
        border: 1px solid var(--border);
        box-shadow: var(--shadow-card)}

      .technical-dashboard .technical-summary-item > span svg,
      .technical-dashboard .technical-data-card-head span svg,
      .technical-dashboard .technical-range-head > span svg,
      .technical-dashboard .technical-education-head > span svg,
      .technical-dashboard .technical-tab-disclaimer > svg {
        width: 20px;
        height: 20px}

      .technical-dashboard .technical-summary-item small {
        display: block;
        color: var(--foreground-muted);
        font-size: 12px;
        font-weight: 700;
        line-height: 1.45;
        margin-bottom: 6px}

      .technical-dashboard .technical-summary-item strong {
        display: block;
        min-width: 0;
        color: var(--foreground);
        font-size: clamp(16px, 1.35vw, 19px);
        font-weight: 700;
        line-height: 1.45;
        font-variant-numeric: tabular-nums;
        overflow-wrap: anywhere}

      .technical-dashboard .technical-data-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 16px !important}

      .technical-dashboard .technical-data-card {
        min-height: 0;
        height: auto;
        gap: 14px;
        padding: 18px;
        align-content: start}

      .technical-dashboard .technical-data-card-head {
        align-items: center;
        gap: 11px}

      .technical-dashboard .technical-data-card h3 {
        color: var(--foreground);
        font-size: 15px;
        font-weight: 700;
        line-height: 1.45}

      .technical-dashboard .technical-data-card > strong {
        color: var(--foreground);
        font-size: clamp(24px, 2.2vw, 34px);
        font-weight: 700;
        line-height: 1.15;
        font-variant-numeric: tabular-nums}

      .technical-dashboard .technical-data-rows {
        gap: 9px}

      .technical-dashboard .technical-data-rows div {
        min-width: 0;
        border-color: var(--border);
        background: var(--surface);
        border-radius: var(--radius-card);
        padding: 10px 12px}

      .technical-dashboard .technical-data-rows small {
        color: var(--foreground-muted);
        font-size: 12px;
        font-weight: 700}

      .technical-dashboard .technical-data-rows b {
        color: var(--foreground);
        font-size: 14px;
        font-weight: 700;
        font-variant-numeric: tabular-nums}

      .technical-dashboard .technical-data-card.support .technical-data-card-head span {
        color: var(--success);
        background: var(--success-soft);
        border-color: var(--success)}

      .technical-dashboard .technical-data-card.resistance .technical-data-card-head span {
        color: var(--danger);
        background: var(--danger-soft);
        border-color: var(--danger)}

      .technical-dashboard .technical-data-card.signal {
        background: var(--surface)}

      .technical-dashboard .technical-data-card-foot {
        border-color: var(--border);
        background: var(--surface);
        color: var(--success);
        padding: 8px 11px;
        font-size: 12px;
        line-height: 1.5}

      .technical-dashboard .technical-category-row button {
        border-color: var(--border-strong);
        background: var(--surface);
        color: var(--foreground-muted);
        box-shadow: var(--shadow-card)}

      .technical-dashboard .technical-category-row button[aria-pressed="true"],
      .technical-dashboard .technical-category-row button:hover,
      .technical-dashboard .technical-category-row button:focus-visible {
        border-color: transparent;
        background: var(--success-soft);
        color: var(--primary-foreground);
        box-shadow: var(--focus-shadow)}

      .technical-dashboard .technical-symbol-pill {
        border-color: var(--border-strong);
        background: var(--surface);
        color: var(--foreground-muted);
        box-shadow: var(--shadow-card)}

      .technical-dashboard .technical-symbol-pill[data-active="true"] {
        background: var(--success-soft);
        color: var(--primary-foreground);
        border-color: transparent;
        box-shadow: var(--shadow-card)}

      .technical-dashboard .technical-symbol-favorite {
        color: inherit;
        opacity: .86}

      .technical-dashboard .technical-symbol-pill:not([data-active="true"]) .technical-symbol-favorite[aria-pressed="true"] {
        color: var(--success);
        background: var(--primary)}

      .technical-dashboard .technical-range-card,
      .technical-dashboard .technical-education-card,
      .technical-dashboard .technical-tab-disclaimer {
        border-radius: var(--radius-panel);
        border-color: var(--border);
        background: var(--surface)}

      .technical-dashboard .technical-range-card {
        gap: 18px}

      .technical-dashboard .technical-range-track {
        height: 112px;
        border-radius: var(--radius-panel);
        background: var(--chart-grid)}

      .technical-dashboard .technical-range-fill {
        top: 58px;
        height: 5px}

      .technical-dashboard .technical-range-marker {
        top: 20px;
        gap: 8px;
        min-width: 82px}

      .technical-dashboard .technical-range-marker b,
      .technical-dashboard .technical-range-marker small {
        padding: 6px 9px;
        font-size: 12px}

      .technical-dashboard .technical-range-marker::after {
        width: 15px;
        height: 15px;
        box-shadow: var(--shadow-card)}

      .technical-dashboard .technical-education-list li {
        grid-template-columns: auto minmax(0, 1fr);
        gap: 10px;
        border-color: var(--border);
        background: var(--surface);
        border-radius: var(--radius-card);
        padding: 13px}

      .technical-dashboard .technical-education-list b {
        min-width: 52px;
        text-align: center;
        border: 1px solid var(--border);
        border-radius: var(--radius-pill);
        background: var(--surface);
        color: var(--success);
        padding: 6px 9px;
        font-size: 12px;
        line-height: 1.2}

      .technical-dashboard .technical-education-list span {
        color: var(--foreground-muted);
        font-size: 13.5px;
        font-weight: 400;
        line-height: 1.75}

      @media (max-width: 1180px) {
        .technical-dashboard .technical-selected-summary {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important}

        .technical-dashboard .technical-data-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important}
      }

      @media (max-width: 780px) {
        .technical-dashboard {
          border-radius: var(--radius-panel);
          padding: 15px}

        .technical-dashboard .technical-dashboard-head,
        .technical-search-row {
          grid-template-columns: 1fr}

        .technical-dashboard .technical-refresh-button,
        .technical-dashboard .technical-search-apply {
          width: 100%}

        .technical-dashboard .technical-category-row,
        .technical-dashboard .technical-symbol-row {
          flex-wrap: nowrap !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          padding: 2px 2px 9px !important;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch}

        .technical-dashboard .technical-category-row::-webkit-scrollbar,
        .technical-dashboard .technical-symbol-row::-webkit-scrollbar {
          display: none}

        .technical-dashboard .technical-selected-summary,
        .technical-dashboard .technical-data-grid,
        .technical-dashboard .technical-education-list {
          grid-template-columns: 1fr !important}

        .technical-dashboard .technical-range-card {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch}

        .technical-dashboard .technical-range-track {
          min-width: 560px}
      }

      @media (max-width: 460px) {
        .technical-dashboard .technical-summary-item,
        .technical-dashboard .technical-data-card {
          min-height: auto}

        .technical-dashboard .technical-symbol-main {
          padding-inline: 10px;
          font-size: 12px}
      }

      .technical-dashboard .technical-selector-shell {
        align-content: start !important;
        gap: 14px !important;
        height: auto !important;
        min-height: 0 !important;
        padding: clamp(12px, 1.6vw, 18px) !important;
        border-color: var(--border) !important;
        background: var(--surface) !important}

      .technical-dashboard .technical-search-row {
        grid-template-columns: minmax(220px, 300px) minmax(0, 1fr) auto !important;
        gap: 14px !important;
        align-items: stretch !important}

      .technical-dashboard .technical-selected-chip {
        min-height: 74px !important;
        border-color: var(--border) !important;
        background: var(--primary-soft) !important;
        box-shadow: var(--shadow-card)}

      .technical-dashboard .technical-selected-chip small {
        color: var(--foreground-muted) !important}

      .technical-dashboard .technical-selected-chip strong {
        color: var(--foreground) !important;
        font-size: clamp(17px, 1.5vw, 20px) !important}

      .technical-dashboard .technical-selected-chip span:not(.technical-selected-chip-icon) {
        min-width: 0;
        color: var(--foreground-muted);
        font-size: 12px;
        font-weight: 400;
        line-height: 1.45;
        overflow-wrap: anywhere}

      .technical-dashboard .technical-search {
        min-height: 58px !important;
        border: 1px solid var(--border-strong) !important;
        background: var(--surface) !important;
        box-shadow: var(--shadow-card)}

      .technical-dashboard .technical-search:focus-within {
        border-color: var(--focus-ring) !important;
        box-shadow: var(--focus-shadow) !important}

      .technical-dashboard .technical-search input {
        color: var(--foreground) !important;
        font-weight: 400 !important}

      .technical-dashboard .technical-search input::placeholder {
        color: var(--foreground-muted) !important}

      .technical-dashboard .technical-search-apply {
        min-height: 58px;
        min-width: 112px;
        border: 0;
        border-radius: var(--radius-card);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 0 20px;
        cursor: pointer;
        color: var(--primary-foreground);
        background: var(--primary);
        box-shadow: var(--shadow-card);
        font: 700 14px var(--font-ui);
        transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
        white-space: nowrap}

      .technical-dashboard .technical-search-apply:hover {
        transform: translateY(-1px);
        filter: saturate(1.06) brightness(1.03);
        box-shadow: var(--shadow-card)}

      .technical-dashboard .technical-search-apply:active {
        transform: translateY(0) scale(.985)}

      .technical-dashboard .technical-search-apply:focus-visible {
        outline: 3px solid var(--focus-ring);
        outline-offset: 3px}

      .technical-dashboard .technical-search-apply:disabled {
        cursor: not-allowed;
        opacity: .72;
        transform: none;
        filter: none}

      .technical-dashboard .technical-category-row,
      .technical-dashboard .technical-symbol-row {
        align-items: center !important;
        gap: 10px !important}

      .technical-dashboard .technical-category-row button {
        border: 1px solid var(--border-strong) !important;
        background: var(--surface) !important;
        color: var(--foreground-muted) !important;
        box-shadow: var(--shadow-card) !important;
        transition: transform .18s ease, border-color .18s ease, background .18s ease, color .18s ease, box-shadow .18s ease}

      .technical-dashboard .technical-category-row button[aria-pressed="true"],
      .technical-dashboard .technical-category-row button:hover,
      .technical-dashboard .technical-category-row button:focus-visible {
        border-color: transparent !important;
        background: var(--success-soft) !important;
        color: var(--primary-foreground) !important;
        box-shadow: var(--focus-shadow) !important}

      .technical-dashboard .technical-category-row button:active,
      .technical-dashboard .technical-symbol-pill:active {
        transform: scale(.98)}

      .technical-dashboard .technical-symbol-pill {
        border: 1px solid var(--border-strong) !important;
        background: var(--surface) !important;
        color: var(--foreground-muted) !important;
        box-shadow: var(--shadow-card) !important;
        transition: transform .18s ease, border-color .18s ease, background .18s ease, color .18s ease, box-shadow .18s ease}

      .technical-dashboard .technical-symbol-pill:hover,
      .technical-dashboard .technical-symbol-pill:focus-within {
        border-color: var(--focus-ring) !important;
        background: var(--surface-hover) !important;
        color: var(--success) !important;
        box-shadow: var(--focus-shadow) !important}

      .technical-dashboard .technical-symbol-pill[data-active="true"] {
        border-color: transparent !important;
        background: var(--success-soft) !important;
        color: var(--primary-foreground) !important;
        box-shadow: var(--shadow-card) !important}

      .technical-dashboard .technical-symbol-main {
        font-weight: 700 !important;
        letter-spacing: .01em}

      .technical-dashboard .technical-no-results {
        width: 100%;
        border: 1px dashed var(--border) !important;
        border-radius: var(--radius-card) !important;
        background: var(--surface) !important;
        color: var(--foreground-muted) !important;
        padding: 12px 14px !important;
        text-align: center}

      @media (max-width: 780px) {
        .technical-dashboard .technical-selector-shell {
          gap: 12px !important;
          padding: 12px !important}

        .technical-dashboard .technical-search-row {
          grid-template-columns: 1fr !important}

        .technical-dashboard .technical-selected-chip {
          min-height: 70px !important}

        .technical-dashboard .technical-category-row,
        .technical-dashboard .technical-symbol-row {
          flex-wrap: nowrap !important;
          justify-content: flex-start !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          padding: 2px 2px 10px !important;
          scroll-padding-inline: 12px}

        .technical-dashboard .technical-category-row button,
        .technical-dashboard .technical-symbol-pill {
          flex: 0 0 auto !important;
          white-space: nowrap !important}
      }

      .market-active-dashboard > .trader-premium-dashboard {
        width: 100%;
        max-width: 1400px;
        min-width: 0;
        margin-inline: auto;
        justify-self: stretch;
        align-self: start}

      .trader-premium-dashboard {
        width: 100%;
        max-width: 1400px;
        min-width: 0;
        display: grid;
        gap: clamp(16px, 2vw, 22px);
        align-content: start;
        align-self: start;
        overflow: hidden;
        box-sizing: border-box}

      .trader-premium-dashboard *,
      .trader-premium-dashboard *::before,
      .trader-premium-dashboard *::after {
        box-sizing: border-box}

      .trader-premium-dashboard {
        overflow: visible}

      .trader-premium-dashboard .trader-premium-header {
        position: relative;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        overflow: hidden}

      .trader-premium-dashboard .trader-premium-header > div,
      .trader-premium-dashboard .trader-premium-main-head > div {
        min-width: 0}

      .trader-premium-dashboard .trader-premium-header-badge {
        align-self: start;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        width: max-content;
        max-width: 100%;
        min-height: 38px;
        border: 1px solid var(--border);
        border-radius: var(--radius-pill);
        background: var(--primary-soft);
        color: var(--primary-hover);
        padding: 0 13px;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.25;
        white-space: nowrap}

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
        min-width: 0}

      .trader-premium-dashboard .trader-premium-layout {
        direction: ltr;
        display: grid;
        grid-template-columns: minmax(300px, .68fr) minmax(0, 1.32fr);
        grid-template-areas: "support main";
        gap: clamp(16px, 2vw, 22px);
        align-items: start}

      .trader-premium-dashboard .trader-premium-main-card,
      .trader-premium-dashboard .trader-support-card,
      .trader-premium-dashboard .trader-premium-disclaimer {
        transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease}

      .trader-premium-dashboard .trader-premium-main-card {
        align-content: start;
        gap: clamp(14px, 1.7vw, 20px)}

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
        -webkit-overflow-scrolling: touch}

      .trader-premium-dashboard .trader-tool-switcher::-webkit-scrollbar {
        display: none}

      .trader-premium-dashboard .trader-tool-switcher > button {
        flex: 0 0 min(230px, 72vw);
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 10px;
        align-items: center;
        min-height: 76px;
        border: 1px solid var(--border-strong);
        border-radius: var(--radius-panel);
        background: var(--surface);
        color: var(--foreground);
        padding: 12px;
        text-align: start;
        cursor: pointer;
        box-shadow: var(--shadow-card);
        transition: transform .18s ease, border-color .18s ease, background .18s ease, box-shadow .18s ease}

      .trader-premium-dashboard .trader-tool-switcher > button:hover,
      .trader-premium-dashboard .trader-tool-switcher > button:focus-visible {
        outline: none;
        transform: translateY(-1px);
        border-color: var(--focus-ring);
        box-shadow: var(--focus-shadow)}

      .trader-premium-dashboard .trader-tool-switcher > button[aria-selected="true"] {
        border-color: transparent;
        background: var(--primary);
        color: var(--foreground);
        box-shadow: var(--shadow-card)}

      .trader-premium-dashboard .trader-tool-switcher strong,
      .trader-premium-dashboard .trader-tool-switcher small {
        display: block;
        min-width: 0;
        overflow-wrap: anywhere}

      .trader-premium-dashboard .trader-tool-switcher strong {
        font-size: 13px;
        font-weight: 700;
        line-height: 1.35}

      .trader-premium-dashboard .trader-tool-switcher small {
        margin-top: 3px;
        color: var(--foreground-muted);
        font-size: 11px;
        font-weight: 400;
        line-height: 1.45}

      .trader-premium-dashboard .trader-tool-switcher > button[aria-selected="true"] small {
        color: var(--foreground)}

      .trader-premium-dashboard .trader-switcher-icon {
        width: 40px;
        height: 40px;
        border-radius: var(--radius-card);
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border: 1px solid var(--border);
        background: var(--primary-soft);
        color: var(--primary-hover)}

      .trader-premium-dashboard .trader-tool-switcher > button[aria-selected="true"] .trader-switcher-icon {
        background: var(--primary);
        border-color: var(--border-strong);
        color: var(--foreground)}

      .trader-premium-dashboard .trader-active-workspace {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        border: 1px solid var(--border);
        border-radius: var(--radius-panel);
        background: var(--surface);
        padding: clamp(12px, 1.7vw, 18px);
        overflow: hidden}

      [dir="rtl"] .trader-premium-dashboard .trader-support-column,
      [dir="rtl"] .trader-premium-dashboard .trader-premium-main-card,
      [dir="rtl"] .trader-premium-dashboard .trader-premium-disclaimer {
        direction: rtl}

      [dir="ltr"] .trader-premium-dashboard .trader-support-column,
      [dir="ltr"] .trader-premium-dashboard .trader-premium-main-card,
      [dir="ltr"] .trader-premium-dashboard .trader-premium-disclaimer {
        direction: ltr}

      .trader-premium-dashboard .trader-support-column {
        grid-area: support}

      .trader-premium-dashboard .trader-premium-main-card {
        grid-area: main}

      .trader-premium-dashboard .trader-tool-card,
      .trader-premium-dashboard .trader-result-stack {
        grid-column: auto;
        width: 100%;
        max-width: 100%;
        min-width: 0}

      .trader-premium-dashboard .trader-premium-panel-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.08fr) minmax(300px, .92fr);
        gap: clamp(14px, 1.6vw, 18px);
        align-items: start}

      .trader-premium-dashboard .trader-accordion-panel {
        overflow: hidden}

      .trader-premium-dashboard .trader-form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px}

      .trader-premium-dashboard .tool-input,
      .trader-premium-dashboard .tool-input-shell,
      .trader-premium-dashboard .tool-input input,
      .trader-premium-dashboard .tool-input select {
        max-width: 100%;
        min-width: 0}

      .trader-premium-dashboard .tool-result-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px}

      .trader-premium-dashboard .tool-segmented {
        display: grid;
        gap: 8px}

      .trader-premium-dashboard .tool-segmented-row {
        display: flex;
        gap: 8px;
        min-width: 0;
        border: 1px solid var(--border);
        border-radius: var(--radius-card);
        background: var(--surface);
        padding: 5px;
        box-shadow: var(--shadow-card)}

      .trader-premium-dashboard .tool-segmented-row button {
        flex: 1 1 0;
        min-width: 0;
        min-height: 46px;
        border: 1px solid transparent;
        border-radius: var(--radius-control);
        background: transparent;
        color: var(--foreground-muted);
        font: 700 13px var(--font-ui);
        cursor: pointer;
        transition: transform .16s ease, box-shadow .16s ease, background .16s ease, color .16s ease}

      .trader-premium-dashboard .tool-segmented-row button:hover,
      .trader-premium-dashboard .tool-segmented-row button:focus-visible {
        outline: none;
        color: var(--primary-hover);
        background: var(--surface-hover);
        box-shadow: var(--focus-shadow)}

      .trader-premium-dashboard .tool-segmented-row button[aria-pressed="true"] {
        border-color: transparent;
        background: var(--primary);
        color: var(--primary-foreground);
        box-shadow: var(--shadow-card)}

      .trader-premium-dashboard .tool-segmented-row button:active {
        transform: scale(.98)}

      .trader-premium-dashboard .tool-result-card,
      .trader-premium-dashboard .trader-highlight-result,
      .trader-premium-dashboard .tool-formula-card {
        min-width: 0;
        overflow: hidden}

      .trader-premium-dashboard .trader-tool-card {
        border-radius: var(--radius-panel);
        box-shadow: var(--shadow-card)}

      .trader-premium-dashboard .trader-tool-card-head {
        align-items: center}

      .trader-premium-dashboard .trader-tool-card-head h3,
      .trader-premium-dashboard .trader-tool-card-head p {
        overflow-wrap: anywhere}

      .trader-premium-dashboard .tool-input-shell,
      .trader-premium-dashboard .tool-result-card,
      .trader-premium-dashboard .tool-formula-card,
      .trader-premium-dashboard .trader-highlight-result {
        box-shadow: var(--shadow-card)}

      .trader-premium-dashboard .tool-result-card {
        position: relative;
        padding-inline-end: 58px}

      .trader-premium-dashboard .tool-result-card::after {
        content: "";
        position: absolute;
        inset-inline-end: 14px;
        top: 14px;
        width: 34px;
        height: 34px;
        border-radius: var(--radius-control);
        background: var(--surface);
        border: 1px solid var(--border)}

      .trader-premium-dashboard .tool-result-card b,
      .trader-premium-dashboard .trader-highlight-result strong,
      .trader-premium-dashboard .trader-highlight-result b,
      .trader-premium-dashboard .tool-formula-card b {
        direction: ltr;
        unicode-bidi: isolate;
        overflow-wrap: anywhere}

      @media (max-width: 1180px) {
        .trader-premium-dashboard .trader-premium-layout {
          direction: inherit;
          grid-template-columns: 1fr;
          grid-template-areas: "main"
            "support"}

        .trader-premium-dashboard .trader-premium-panel-grid {
          grid-template-columns: 1fr}

        .trader-premium-dashboard .trader-premium-main-head {
          grid-template-columns: auto minmax(0, 1fr)}

        .trader-premium-dashboard .trader-premium-save {
          grid-column: 1 / -1;
          justify-items: stretch;
          min-width: 0}
      }

      @media (max-width: 720px) {
        .trader-premium-dashboard .trader-premium-header {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: start}

        .trader-premium-dashboard .trader-premium-header-badge {
          grid-column: 1 / -1;
          justify-self: start;
          width: fit-content;
          white-space: normal}

        .trader-premium-dashboard .trader-tool-switcher {
          gap: 8px;
          padding-bottom: 8px}

        .trader-premium-dashboard .trader-tool-switcher > button {
          flex-basis: min(210px, 82vw);
          min-height: 68px;
          border-radius: var(--radius-card);
          padding: 10px}

        .trader-premium-dashboard .trader-switcher-icon {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-control)}

        .trader-premium-dashboard .trader-active-workspace {
          border-radius: var(--radius-panel);
          padding: 12px}

        .trader-premium-dashboard .trader-premium-form-grid,
        .trader-premium-dashboard .trader-form-grid,
        .trader-premium-dashboard .tool-result-grid {
          grid-template-columns: 1fr}

        .trader-premium-dashboard .tool-result-card {
          padding-inline-end: 50px}

        .trader-premium-dashboard .trader-accordion-copy small {
          display: block}
      }

      .trader-premium-dashboard .trader-premium-layout {
        grid-template-columns: minmax(280px, .58fr) minmax(0, 1.42fr);
        gap: clamp(14px, 1.6vw, 20px)}

      .trader-premium-dashboard .trader-premium-main-card,
      .trader-premium-dashboard .trader-support-column,
      .trader-premium-dashboard .trader-tool-card,
      .trader-premium-dashboard .trader-result-stack {
        height: auto;
        align-self: start;
        align-content: start}

      .trader-premium-dashboard .trader-premium-main-card {
        padding: clamp(14px, 1.6vw, 20px);
        gap: 14px;
        overflow: visible}

      .trader-premium-dashboard .trader-premium-header {
        padding: clamp(16px, 1.8vw, 22px)}

      .trader-premium-dashboard .trader-premium-header p,
      .trader-premium-dashboard .trader-premium-main-head p,
      .trader-premium-dashboard .trader-support-card p {
        line-height: 1.65}

      .trader-premium-dashboard .trader-tool-switcher {
        gap: 9px;
        padding-bottom: 8px}

      .trader-premium-dashboard .trader-tool-switcher > button {
        flex-basis: min(206px, 70vw);
        min-height: 68px;
        border-radius: var(--radius-card);
        padding: 10px}

      .trader-premium-dashboard .trader-tool-switcher small {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden}

      .trader-premium-dashboard .trader-active-workspace {
        padding: clamp(12px, 1.4vw, 16px);
        overflow: visible}

      .trader-premium-dashboard .trader-premium-panel-grid {
        grid-template-columns: minmax(0, 1.02fr) minmax(300px, .98fr);
        gap: clamp(14px, 1.5vw, 18px)}

      .trader-premium-dashboard .trader-field-groups {
        display: grid;
        gap: 12px;
        min-width: 0}

      .trader-premium-dashboard .trader-field-group {
        display: grid;
        gap: 12px;
        min-width: 0;
        border: 1px solid var(--border);
        border-radius: var(--radius-panel);
        background: var(--surface);
        padding: 13px;
        box-shadow: var(--shadow-card)}

      .trader-premium-dashboard .trader-field-group-title {
        display: flex;
        align-items: center;
        gap: 9px;
        min-width: 0}

      .trader-premium-dashboard .trader-field-group-title span,
      .trader-premium-dashboard .tool-result-icon {
        width: 34px;
        height: 34px;
        border-radius: var(--radius-control);
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border: 1px solid var(--border);
        background: var(--primary-soft);
        color: var(--primary-hover)}

      .trader-premium-dashboard .trader-field-group-title h4 {
        margin: 0;
        min-width: 0;
        color: var(--foreground);
        font-size: 13px;
        font-weight: 700;
        line-height: 1.35}

      .trader-premium-dashboard .trader-field-group .trader-form-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 11px}

      .trader-premium-dashboard .tool-input-shell {
        min-height: 52px;
        border-radius: var(--radius-card)}

      .trader-premium-dashboard .tool-input .tool-input-shell input,
      .trader-premium-dashboard .tool-input .tool-input-shell select {
        height: var(--control-h-lg) !important;
        font-size: 15px}

      .trader-premium-dashboard .tool-advanced {
        margin-top: 0;
        border-radius: var(--radius-panel);
        padding: 10px 12px}

      .trader-premium-dashboard .trader-result-stack {
        display: grid;
        gap: 12px}

      .trader-premium-dashboard .trader-highlight-result {
        border-radius: var(--radius-panel);
        padding: 18px;
        gap: 8px;
        background: var(--primary-soft)}

      .trader-premium-dashboard .trader-highlight-result strong {
        font-size: clamp(34px, 4vw, 46px);
        color: var(--success)}

      .trader-premium-dashboard .tool-results {
        padding: 13px;
        border-radius: var(--radius-panel)}

      .trader-premium-dashboard .tool-result-grid {
        gap: 10px}

      .trader-premium-dashboard .tool-result-card {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        grid-template-areas: "icon label"
          "icon value";
        column-gap: 10px;
        row-gap: 3px;
        min-height: 86px;
        padding: 13px;
        padding-inline-end: 13px;
        align-items: center}

      .trader-premium-dashboard .tool-result-card::after {
        display: none}

      .trader-premium-dashboard .tool-result-icon {
        grid-area: icon}

      .trader-premium-dashboard .tool-result-card > span:not(.tool-result-icon) {
        grid-area: label;
        color: var(--foreground-muted);
        font-size: 11px;
        font-weight: 700;
        line-height: 1.35}

      .trader-premium-dashboard .tool-result-card b {
        grid-area: value;
        font-size: clamp(18px, 1.65vw, 24px);
        font-variant-numeric: tabular-nums}

      .trader-premium-dashboard .tool-formula-card {
        border-radius: var(--radius-panel);
        padding: 14px}

      .trader-premium-dashboard .trader-support-card {
        padding: 14px;
        border-radius: var(--radius-panel)}

      .trader-premium-dashboard .trader-support-icon {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-control)}

      .trader-premium-dashboard .trader-steps {
        list-style: none;
        padding: 0;
        margin: 10px 0 0;
        counter-reset: trader-step}

      .trader-premium-dashboard .trader-steps li {
        counter-increment: trader-step;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 9px;
        align-items: start;
        color: var(--foreground-muted);
        font-size: 12px;
        font-weight: 400;
        line-height: 1.65}

      .trader-premium-dashboard .trader-steps li::before {
        content: counter(trader-step);
        width: 24px;
        height: 24px;
        border-radius: var(--radius-pill);
        display: grid;
        place-items: center;
        background: var(--surface);
        color: var(--foreground);
        font-size: 11px;
        font-weight: 700}

      .trader-premium-dashboard .trader-tool-switcher-shell {
        display: grid;
        grid-template-columns: 46px minmax(0, 1fr) 46px;
        gap: 10px;
        align-items: center;
        width: 100%;
        max-width: 100%;
        min-width: 0}

      .trader-premium-dashboard .trader-switcher-arrow {
        width: 46px;
        height: 46px;
        border-radius: var(--radius-card);
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--primary-hover);
        display: inline-grid;
        place-items: center;
        cursor: pointer;
        box-shadow: var(--shadow-card);
        transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease, background .16s ease}

      .trader-premium-dashboard .trader-switcher-arrow:hover,
      .trader-premium-dashboard .trader-switcher-arrow:focus-visible {
        outline: none;
        transform: translateY(-1px);
        border-color: var(--focus-ring);
        box-shadow: var(--focus-shadow)}

      .trader-premium-dashboard .trader-switcher-arrow:active {
        transform: scale(.97)}

      .trader-premium-dashboard .trader-premium-save {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        justify-items: stretch;
        gap: 10px;
        min-width: min(320px, 100%);
        max-width: 100%;
        border: 1px solid var(--border);
        border-radius: var(--radius-card);
        background: var(--surface);
        padding: 10px;
        box-shadow: var(--shadow-card)}

      .trader-premium-dashboard .trader-premium-save-icon {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-control);
        display: grid;
        place-items: center;
        background: var(--primary-soft);
        border: 1px solid var(--border);
        color: var(--primary-hover)}

      .trader-premium-dashboard .trader-premium-save div {
        display: grid;
        gap: 3px;
        min-width: 0}

      .trader-premium-dashboard .trader-premium-save strong {
        color: var(--foreground);
        font-size: 12px;
        font-weight: 700;
        line-height: 1.35;
        overflow-wrap: anywhere}

      .trader-premium-dashboard .trader-premium-save div small {
        color: var(--foreground-muted);
        font-size: 11px;
        font-weight: 400;
        line-height: 1.45}

      .trader-premium-dashboard .trader-premium-save button {
        width: max-content;
        min-width: 116px;
        min-height: 40px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        border: 0;
        border-radius: var(--radius-control);
        background: var(--primary);
        color: var(--primary-foreground);
        padding: 0 13px;
        font: 700 12px var(--font-ui);
        white-space: nowrap}

      .trader-premium-dashboard .trader-premium-save > small {
        grid-column: 1 / -1;
        justify-self: start}

      .technical-dashboard .technical-category-row button[aria-pressed="true"],
      .technical-dashboard .technical-symbol-pill[data-active="true"],
      .trader-premium-dashboard .trader-tool-switcher > button[aria-selected="true"] {
        border-color: var(--primary) !important;
        background: var(--primary) !important;
        color: var(--primary-foreground) !important;
      }

      .technical-dashboard .technical-category-row button:hover:not([aria-pressed="true"]),
      .technical-dashboard .technical-category-row button:focus-visible:not([aria-pressed="true"]),
      .technical-dashboard .technical-symbol-pill:hover:not([data-active="true"]),
      .technical-dashboard .technical-symbol-pill:focus-within:not([data-active="true"]) {
        border-color: var(--primary) !important;
        background: var(--surface-hover) !important;
        color: var(--foreground) !important;
        box-shadow: var(--focus-shadow) !important;
      }

      .technical-dashboard .technical-symbol-pill:not([data-active="true"]) .technical-symbol-favorite[aria-pressed="true"] {
        border-color: var(--success) !important;
        background: var(--success-soft) !important;
        color: var(--success) !important;
      }

      .trader-premium-dashboard .trader-tool-switcher > button[aria-selected="true"] small,
      .trader-premium-dashboard .trader-tool-switcher > button[aria-selected="true"] .trader-switcher-icon {
        color: var(--primary-foreground) !important;
      }

      .trader-premium-dashboard .trader-tool-switcher > button[aria-selected="true"] .trader-switcher-icon {
        border-color: color-mix(in srgb, var(--primary-foreground) 30%, transparent) !important;
        background: color-mix(in srgb, var(--primary-foreground) 14%, transparent) !important;
      }

      .portfolio-comparison-metric strong,
      .technical-data-card > strong,
      .technical-data-rows b,
      .technical-range-marker small,
      .tool-result-card b,
      .trader-highlight-result strong,
      .trader-premium-dashboard input[type="number"] {
        font-family: var(--font-data);
        font-variant-numeric: tabular-nums;
      }
`}</style>
  );
}
