/**
 * Business Hub layout styles.
 *
 * Colour, typography, radius, shadow, and interaction decisions come from the
 * centralized visual-system tokens. The main business hero is the only
 * intentional branded gradient on this route.
 */
export const BUSINESS_HUB_STYLES = `
  .business-hub-shell {
    min-height: 100vh;
    overflow-x: hidden;
    background: var(--background);
    color: var(--foreground);
    font-family: var(--font-ui);
  }

  .business-hub-main {
    width: 100%;
    min-width: 0;
    display: grid;
    gap: var(--workspace-page-section-gap);
    overflow-x: hidden;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .topbar span {
    display: block;
    color: var(--foreground-muted);
    font-size: var(--type-caption-size);
    font-weight: var(--type-label-weight);
  }

  .topbar strong {
    display: block;
    color: var(--foreground);
    font-size: var(--type-section-title-size);
    font-weight: var(--type-section-title-weight);
  }

  .loading-state {
    min-height: 100vh;
    place-items: center;
    color: var(--primary);
    font-weight: var(--type-button-weight);
  }

  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .business-hero {
    min-width: 0;
    overflow: hidden;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: var(--space-5);
    padding: clamp(24px, 5vw, 48px);
    border: 1px solid color-mix(in srgb, var(--primary) 42%, var(--border));
    border-radius: var(--radius-panel);
    background: var(--hero-gradient);
    color: var(--hero-foreground);
    box-shadow: var(--shadow-md);
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    width: max-content;
    max-width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 1px solid color-mix(in srgb, var(--primary) 28%, var(--border));
    border-radius: var(--radius-pill);
    background: var(--primary-soft);
    color: var(--primary-hover);
    font-size: var(--type-label-size);
    font-weight: var(--type-label-weight);
  }

  .business-hero .eyebrow {
    border-color: color-mix(in srgb, var(--hero-foreground) 32%, transparent);
    background: color-mix(in srgb, var(--hero-foreground) 12%, transparent);
    color: var(--hero-foreground);
  }

  .business-hero h1 {
    margin: var(--space-5) 0 var(--space-3);
    color: var(--hero-foreground);
    font-size: var(--type-display-size);
    line-height: var(--type-display-leading);
    font-weight: var(--type-display-weight);
    letter-spacing: var(--type-display-tracking);
  }

  .business-hero p {
    max-width: 820px;
    margin: 0;
    color: var(--hero-foreground-muted);
    font-size: clamp(15px, 2vw, 19px);
    line-height: 1.8;
    font-weight: var(--type-body-weight);
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--space-2);
  }

  .hero-actions a,
  .hero-actions button,
  .empty-state a,
  .module-links a,
  .copilot-panel a {
    min-height: var(--control-h);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: 0 var(--space-4);
    border: 1px solid transparent;
    border-radius: var(--radius-control);
    font-family: var(--font-ui);
    font-size: var(--type-button-size);
    font-weight: var(--type-button-weight);
    line-height: var(--type-button-leading);
    text-decoration: none;
    cursor: pointer;
    transition:
      background var(--duration-fast) var(--ease),
      border-color var(--duration-fast) var(--ease),
      color var(--duration-fast) var(--ease),
      box-shadow var(--duration-fast) var(--ease),
      transform var(--duration-fast) var(--ease);
  }

  .hero-actions button,
  .empty-state a,
  .copilot-panel a {
    border-color: var(--primary);
    background: var(--primary);
    color: var(--primary-foreground);
    box-shadow: var(--shadow-xs);
  }

  .hero-actions button:hover,
  .empty-state a:hover,
  .copilot-panel a:hover {
    border-color: var(--primary-hover);
    background: var(--primary-hover);
    box-shadow: var(--shadow-sm);
    transform: translateY(-1px);
  }

  .hero-actions a {
    border-color: color-mix(in srgb, var(--hero-foreground) 36%, transparent);
    background: color-mix(in srgb, var(--hero-foreground) 12%, transparent);
    color: var(--hero-foreground);
  }

  .hero-actions a:hover {
    border-color: color-mix(in srgb, var(--hero-foreground) 58%, transparent);
    background: color-mix(in srgb, var(--hero-foreground) 20%, transparent);
    transform: translateY(-1px);
  }

  .load-warning,
  .planner-warning,
  .directory-warning,
  .funding-fit-box,
  .directory-missing-list {
    border: 1px solid color-mix(in srgb, var(--warning) 32%, var(--border));
    background: var(--warning-soft);
    color: var(--warning);
  }

  .load-warning {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-card);
    font-weight: var(--type-label-weight);
  }

  .selector-panel,
  .readiness-head,
  .warm-card,
  .empty-state,
  .state-panel {
    min-width: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius-panel);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-card);
  }

  .selector-panel {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(260px, .42fr);
    align-items: end;
    gap: var(--space-4);
    padding: var(--space-4);
  }

  .selector-panel h2,
  .readiness-head h2,
  .card-title h2,
  .empty-state h2,
  .state-panel h1 {
    margin: 0;
    color: var(--foreground);
    font-size: var(--type-section-title-size);
    line-height: var(--type-section-title-leading);
    font-weight: var(--type-section-title-weight);
  }

  .selector-panel p,
  .readiness-head p,
  .card-title p,
  .empty-state p,
  .state-panel p {
    margin: var(--space-2) 0 0;
    color: var(--foreground-muted);
    font-size: var(--type-body-small-size);
    line-height: var(--type-body-small-leading);
    font-weight: var(--type-body-weight);
  }

  .selector-panel label,
  .field {
    min-width: 0;
    display: grid;
    gap: var(--space-2);
  }

  .selector-panel label span,
  .field span {
    color: var(--foreground-secondary);
    font-size: var(--type-label-size);
    font-weight: var(--type-label-weight);
  }

  .selector-panel select,
  .field select,
  .field input,
  .field textarea {
    width: 100%;
    min-width: 0;
    min-height: var(--control-h);
    padding: 0 var(--space-3);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-control);
    outline: none;
    background: var(--control-background);
    color: var(--foreground);
    font-family: var(--font-ui);
    font-size: var(--type-body-small-size);
    font-weight: var(--type-body-weight);
  }

  .field textarea {
    min-height: 86px;
    padding: var(--space-3);
    line-height: var(--type-body-leading);
    resize: vertical;
  }

  .selector-panel select:focus,
  .field select:focus,
  .field input:focus,
  .field textarea:focus {
    border-color: var(--focus-ring);
    box-shadow: var(--focus-shadow);
  }

  .empty-state,
  .state-panel {
    min-height: 300px;
    display: grid;
    place-items: center;
    padding: var(--space-6);
    text-align: center;
  }

  .empty-state svg,
  .state-panel svg { color: var(--primary); }
  .empty-state p,
  .state-panel p { max-width: 560px; }
  .empty-state a { margin-top: var(--space-2); }

  .readiness-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-5);
  }

  .score-pill {
    min-width: 140px;
    display: grid;
    place-items: center;
    padding: var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    background: var(--surface-muted);
    text-align: center;
  }

  .score-pill strong {
    color: var(--foreground);
    font-family: var(--font-data);
    font-size: var(--type-numeric-value-size);
    font-weight: var(--type-numeric-value-weight);
  }

  .score-pill span {
    color: var(--primary-hover);
    font-size: var(--type-label-size);
    font-weight: var(--type-label-weight);
  }

  .readiness-grid {
    min-width: 0;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: var(--space-3);
  }

  .readiness-card,
  .jurisdiction-card {
    min-width: 0;
    padding: var(--space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    background: var(--surface);
    box-shadow: var(--shadow-card);
  }

  .readiness-card {
    display: grid;
    gap: var(--space-3);
  }

  .readiness-icon {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-control);
    background: var(--primary-soft);
    color: var(--primary);
  }

  .readiness-card h3 {
    margin: 0;
    color: var(--foreground);
    font-size: var(--type-card-title-size);
    line-height: var(--type-card-title-leading);
    font-weight: var(--type-card-title-weight);
  }

  .readiness-card > div > strong {
    display: block;
    margin: var(--space-1) 0;
    overflow-wrap: anywhere;
    color: var(--foreground);
    font-family: var(--font-data);
    font-size: var(--type-financial-value-size);
    font-weight: var(--type-financial-value-weight);
  }

  .status-badge {
    display: inline-flex;
    width: max-content;
    max-width: 100%;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-pill);
    font-size: var(--type-caption-size);
    font-weight: var(--type-label-weight);
  }

  .status-badge.ready-for-review,
  .status-badge.good,
  .package-status.complete,
  .done {
    background: var(--success-soft);
    color: var(--success);
  }

  .status-badge.needs-improvement,
  .package-status.needs_review,
  .section-title-row span {
    background: var(--warning-soft);
    color: var(--warning);
  }

  .status-badge.not-ready,
  .package-status.missing,
  .todo {
    background: var(--danger-soft);
    color: var(--danger);
  }

  .progress-bar {
    height: 9px;
    overflow: hidden;
    border-radius: var(--radius-pill);
    background: var(--surface-muted);
  }

  .progress-bar span {
    display: block;
    height: 100%;
    border-radius: var(--radius-pill);
    background: var(--primary);
  }

  .funding-module,
  .funding-directory-module,
  .jurisdiction-module,
  .strategic-documents-module {
    min-width: 0;
    display: grid;
    gap: var(--space-4);
  }

  .funding-header,
  .directory-header,
  .jurisdiction-header,
  .documents-header {
    min-width: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-5);
    border: 1px solid var(--border);
    border-inline-start: 4px solid var(--primary);
    border-radius: var(--radius-panel);
    background: var(--surface-elevated);
    color: var(--foreground);
    box-shadow: var(--shadow-card);
  }

  .funding-header h2,
  .directory-header h2,
  .jurisdiction-header h2,
  .documents-header h2 {
    margin: var(--space-3) 0 var(--space-2);
    color: var(--foreground);
    font-size: var(--type-page-title-size);
    line-height: var(--type-page-title-leading);
    font-weight: var(--type-page-title-weight);
  }

  .funding-header p,
  .directory-header p,
  .jurisdiction-header p,
  .documents-header p {
    margin: 0;
    color: var(--foreground-muted);
    line-height: var(--type-body-leading);
    font-weight: var(--type-body-weight);
  }

  .funding-header .score-pill,
  .documents-header .score-pill {
    border-color: var(--border);
    background: var(--surface-muted);
  }

  .funding-header .score-pill strong,
  .documents-header .score-pill strong { color: var(--foreground); }

  .funding-header .score-pill span,
  .documents-header .score-pill span { color: var(--primary-hover); }

  .funding-layout {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1.32fr) minmax(320px, .78fr);
    align-items: start;
    gap: var(--space-4);
    direction: ltr;
  }

  .funding-layout > * { direction: inherit; }
  [dir="rtl"] .funding-layout > * { direction: rtl; }

  .funding-support-column {
    min-width: 0;
    display: grid;
    align-content: start;
    gap: var(--space-4);
  }

  .use-funds-card,
  .investor-package,
  .funding-side { align-self: start; }

  .package-grid,
  .funds-table,
  .package-actions,
  .top-match-list,
  .jurisdiction-results,
  .dd-list,
  .check-list,
  .document-grid,
  .module-links {
    display: grid;
    gap: var(--space-3);
  }

  .funds-table { margin-top: var(--space-4); }
  .package-actions { margin-top: var(--space-4); }
  .top-match-list { margin-top: var(--space-3); }

  .package-item,
  .check-row,
  .document-link,
  .dd-row {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    background: var(--surface-muted);
    color: var(--foreground);
    text-decoration: none;
  }

  .package-item strong,
  .check-row strong,
  .document-link span,
  .dd-row strong {
    min-width: 0;
    overflow-wrap: anywhere;
    color: var(--foreground);
    font-weight: var(--type-label-weight);
  }

  .package-item small,
  .check-row small,
  .document-link small,
  .dd-row small {
    color: var(--foreground-muted);
    font-size: var(--type-caption-size);
    font-weight: var(--type-body-weight);
  }

  .package-status,
  .done,
  .todo {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-control);
  }

  .planner-grid,
  .planner-totals,
  .program-meta,
  .funding-admin-form,
  .choice-grid,
  .jurisdiction-cards,
  .jurisdiction-columns,
  .document-card-grid,
  .draft-sections,
  .wizard-form,
  .module-links,
  .mini-metrics {
    min-width: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);
  }

  .planner-grid .field:last-child,
  .choice-grid.wide,
  .funding-admin-form .wide,
  .wizard-project-selector { grid-column: 1 / -1; }

  .fund-row {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(120px, .75fr) repeat(2, minmax(0, 1fr));
    align-items: end;
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    background: var(--surface-muted);
  }

  .fund-row strong {
    color: var(--foreground);
    line-height: var(--type-card-title-leading);
    font-weight: var(--type-card-title-weight);
  }

  .fund-row label {
    min-width: 0;
    display: grid;
    gap: var(--space-1);
  }

  .fund-row label span {
    color: var(--foreground-muted);
    font-size: var(--type-caption-size);
    font-weight: var(--type-label-weight);
  }

  .fund-row input {
    width: 100%;
    min-width: 0;
    min-height: var(--control-h-sm);
    padding: 0 var(--space-3);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-control);
    outline: none;
    background: var(--control-background);
    color: var(--foreground);
    font-family: var(--font-data);
    font-size: var(--type-table-cell-size);
    font-weight: var(--type-table-cell-weight);
  }

  .fund-row input:focus {
    border-color: var(--focus-ring);
    box-shadow: var(--focus-shadow);
  }

  .planner-totals,
  .mini-metrics { margin-top: var(--space-3); }

  .planner-totals p,
  .mini-metrics p,
  .document-vault-summary p {
    min-width: 0;
    margin: 0;
    padding: var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    background: var(--surface-muted);
  }

  .planner-totals span,
  .mini-metrics span,
  .document-vault-summary span {
    display: block;
    color: var(--foreground-muted);
    font-size: var(--type-caption-size);
    font-weight: var(--type-body-weight);
  }

  .planner-totals strong,
  .mini-metrics strong,
  .document-vault-summary strong {
    display: block;
    margin-top: var(--space-1);
    overflow-wrap: anywhere;
    color: var(--foreground);
    font-family: var(--font-data);
    font-size: var(--type-financial-value-size);
    font-weight: var(--type-financial-value-weight);
  }

  .planner-warning {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-3);
    padding: var(--space-3);
    border-radius: var(--radius-control);
    font-size: var(--type-body-small-size);
    font-weight: var(--type-label-weight);
  }

  .field.wide { margin-top: var(--space-3); }

  .save-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    margin-top: var(--space-3);
  }

  .save-row button,
  .package-actions button,
  .wizard-controls button,
  .primary-action,
  .secondary-action,
  .program-actions button,
  .program-actions a,
  .compact-select select,
  .funding-admin-form button[type=submit],
  .doc-actions a,
  .doc-actions button,
  .draft-actions button,
  .directory-empty-actions a {
    min-height: var(--control-h);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: 0 var(--space-3);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-control);
    background: var(--surface);
    color: var(--foreground);
    font-family: var(--font-ui);
    font-size: var(--type-button-size);
    font-weight: var(--type-button-weight);
    text-decoration: none;
    cursor: pointer;
  }

  .save-row button,
  .package-actions button,
  .wizard-controls button,
  .primary-action,
  .program-actions button:not(:disabled),
  .funding-admin-form button[type=submit],
  .doc-actions button:not(:disabled),
  .draft-actions button:not(:disabled),
  .directory-empty-actions a:first-child {
    border-color: var(--primary);
    background: var(--primary);
    color: var(--primary-foreground);
  }

  .save-row button:hover:not(:disabled),
  .package-actions button:hover:not(:disabled),
  .wizard-controls button:hover:not(:disabled),
  .primary-action:hover:not(:disabled),
  .program-actions button:hover:not(:disabled),
  .funding-admin-form button[type=submit]:hover:not(:disabled),
  .doc-actions button:hover:not(:disabled),
  .draft-actions button:hover:not(:disabled),
  .directory-empty-actions a:first-child:hover {
    border-color: var(--primary-hover);
    background: var(--primary-hover);
  }

  .save-row button:disabled,
  .package-actions button:disabled,
  .wizard-controls button:disabled,
  .primary-action:disabled,
  .secondary-action:disabled,
  .program-actions button:disabled,
  .funding-admin-form button[type=submit]:disabled,
  .doc-actions button:disabled,
  .draft-actions button:disabled {
    cursor: not-allowed;
    opacity: .58;
  }

  .form-message {
    margin: var(--space-3) 0 0;
    color: var(--foreground-muted);
    font-weight: var(--type-body-weight);
  }

  .funding-side { position: static; top: auto; }

  .warning-list {
    margin: 0;
    padding-inline-start: var(--space-5);
    color: var(--danger);
    line-height: 1.8;
    font-weight: var(--type-body-weight);
  }

  .missing-box a {
    color: var(--primary-hover);
    font-weight: var(--type-label-weight);
    text-decoration: none;
  }

  .package-actions a {
    min-height: var(--control-h);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border);
    border-radius: var(--radius-control);
    background: var(--surface-muted);
    color: var(--foreground);
    font-weight: var(--type-button-weight);
    text-decoration: none;
  }

  .funding-empty,
  .directory-empty {
    display: grid;
    place-items: center;
    gap: var(--space-2);
    border: 1px dashed var(--border-strong);
    border-radius: var(--radius-panel);
    background: var(--surface-muted);
    color: var(--foreground-muted);
    text-align: center;
  }

  .funding-empty { padding: var(--space-6); }
  .funding-empty svg { color: var(--primary); }

  .directory-filters {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(220px, 1.3fr) repeat(4, minmax(150px, 1fr));
    gap: var(--space-3);
    padding: var(--space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    background: var(--surface);
  }

  .search-field {
    position: relative;
    min-width: 0;
  }

  .search-field svg {
    position: absolute;
    inset-inline-start: var(--space-3);
    top: 50%;
    color: var(--primary);
    transform: translateY(-50%);
  }

  .search-field input { padding-inline-start: 38px !important; }

  .directory-layout {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(300px, .34fr);
    align-items: start;
    gap: var(--space-4);
  }

  .directory-main,
  .directory-side { min-width: 0; }
  .directory-side { position: sticky; top: var(--space-5); }

  .directory-empty {
    min-height: 240px;
    padding: var(--space-5);
  }

  .directory-empty strong {
    color: var(--foreground);
    font-size: var(--type-card-title-size);
    font-weight: var(--type-card-title-weight);
  }

  .directory-empty p {
    max-width: 560px;
    margin: 0;
    color: var(--foreground-muted);
    line-height: var(--type-body-leading);
    font-weight: var(--type-body-weight);
  }

  .directory-empty-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  .directory-empty-actions a:last-child {
    border-color: var(--border-strong);
    background: var(--surface);
    color: var(--primary-hover);
  }

  .directory-category-chips {
    max-width: 720px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--space-2);
  }

  .directory-category-chips span {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--foreground-secondary);
    font-size: var(--type-caption-size);
    font-weight: var(--type-label-weight);
  }

  .directory-missing-list {
    width: min(100%, 560px);
    padding: var(--space-3);
    border-radius: var(--radius-card);
    text-align: initial;
  }

  .directory-missing-list b { display: block; margin-bottom: var(--space-2); }
  .directory-missing-list ul { display: grid; gap: var(--space-1); margin: 0; padding-inline-start: var(--space-5); }
  .directory-missing-list p { margin: 0; }

  .program-grid {
    min-width: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);
  }

  .program-card,
  .strategic-doc-card {
    min-width: 0;
    display: grid;
    gap: var(--space-3);
    padding: var(--space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    background: var(--surface-muted);
  }

  .program-card-head,
  .jurisdiction-card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .program-card-head h3,
  .jurisdiction-card-head h4,
  .doc-card-head h3,
  .draft-sections h3,
  .funding-admin-import h3 {
    margin: 0;
    overflow-wrap: anywhere;
    color: var(--foreground);
    font-size: var(--type-card-title-size);
    line-height: var(--type-card-title-leading);
    font-weight: var(--type-card-title-weight);
  }

  .program-card-head p,
  .jurisdiction-card-head small {
    display: block;
    margin: var(--space-1) 0 0;
    color: var(--foreground-muted);
    font-size: var(--type-caption-size);
    font-weight: var(--type-body-weight);
  }

  .program-meta p,
  .jurisdiction-columns div {
    min-width: 0;
    margin: 0;
    padding: var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-control);
    background: var(--surface);
  }

  .program-meta span {
    display: block;
    color: var(--foreground-muted);
    font-size: var(--type-caption-size);
    font-weight: var(--type-body-weight);
  }

  .program-meta strong {
    display: block;
    margin-top: var(--space-1);
    overflow-wrap: anywhere;
    color: var(--foreground);
    font-weight: var(--type-label-weight);
  }

  .directory-warning,
  .funding-fit-box,
  .project-not-ready-box {
    padding: var(--space-3);
    border-radius: var(--radius-control);
    font-size: var(--type-body-small-size);
    line-height: var(--type-body-small-leading);
    font-weight: var(--type-label-weight);
  }

  .directory-warning {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
  }

  .funding-fit-box {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: var(--space-2);
  }

  .funding-fit-box p {
    grid-column: 1 / -1;
    margin: 0;
    color: var(--foreground-secondary);
  }

  .funding-fit-box span { color: var(--primary); }

  .project-not-ready-box {
    border: 1px solid color-mix(in srgb, var(--danger) 30%, var(--border));
    background: var(--danger-soft);
    color: var(--danger);
  }

  .project-not-ready-box strong { display: block; margin-bottom: var(--space-1); }
  .project-not-ready-box ul { display: grid; gap: var(--space-1); margin: 0; padding-inline-start: var(--space-5); }

  .program-actions,
  .wizard-controls,
  .doc-actions,
  .draft-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .compact-select {
    display: grid;
    gap: var(--space-1);
  }

  .compact-select span {
    color: var(--foreground-muted);
    font-size: var(--type-caption-size);
    font-weight: var(--type-label-weight);
  }

  .program-detail {
    display: grid;
    gap: var(--space-2);
    padding-top: var(--space-3);
    border-top: 1px solid var(--border);
  }

  .program-detail p {
    display: grid;
    grid-template-columns: minmax(110px, .32fr) minmax(0, 1fr);
    gap: var(--space-2);
    margin: 0;
    color: var(--foreground-secondary);
    line-height: var(--type-body-small-leading);
    font-weight: var(--type-body-weight);
  }

  .program-detail b,
  .program-detail a { color: var(--primary-hover); }
  .program-detail span { min-width: 0; overflow-wrap: anywhere; }

  .funding-admin-import {
    display: grid;
    gap: var(--space-3);
    margin-top: var(--space-4);
    padding-top: var(--space-4);
    border-top: 1px solid var(--border);
  }

  .funding-admin-import p {
    margin: 0;
    color: var(--foreground-muted);
    line-height: var(--type-body-leading);
    font-weight: var(--type-body-weight);
  }

  .funding-admin-form textarea { min-height: 78px; resize: vertical; }

  .checkbox-field {
    display: flex !important;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-control);
    background: var(--surface-muted);
  }

  .checkbox-field input { width: auto !important; min-height: auto !important; }
  .funding-admin-form button[type=submit] { grid-column: 1 / -1; }

  .jurisdiction-stepper {
    display: flex;
    gap: var(--space-2);
    overflow-x: auto;
    padding: var(--space-1) 1px var(--space-2);
    scrollbar-width: thin;
  }

  .jurisdiction-stepper button {
    min-height: var(--control-h);
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0 var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--foreground-muted);
    font-family: var(--font-ui);
    font-size: var(--type-button-size);
    font-weight: var(--type-button-weight);
    cursor: pointer;
  }

  .jurisdiction-stepper button span {
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-pill);
    background: var(--primary-soft);
    color: var(--primary-hover);
  }

  .jurisdiction-stepper button.active {
    border-color: color-mix(in srgb, var(--primary) 34%, var(--border));
    border-block-end: 2px solid var(--primary);
    background: var(--primary-soft);
    color: var(--primary-hover);
  }

  .jurisdiction-stepper button.active span {
    background: var(--primary);
    color: var(--primary-foreground);
  }

  .jurisdiction-layout {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(310px, .5fr);
    align-items: start;
    gap: var(--space-4);
  }

  .choice-pill {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    background: var(--surface-muted);
    color: var(--foreground);
    font-weight: var(--type-label-weight);
  }

  .choice-pill input { accent-color: var(--primary); }
  .choice-pill span { min-width: 0; overflow-wrap: anywhere; }
  .wizard-controls { margin-top: var(--space-4); }

  .secondary-action {
    width: 100%;
    margin-top: var(--space-3);
    background: var(--surface-muted);
    color: var(--foreground-muted);
  }

  .top-match-list div {
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-control);
    background: var(--surface-muted);
  }

  .top-match-list strong,
  .top-match-list span { min-width: 0; overflow-wrap: anywhere; }
  .primary-action { width: 100%; margin-top: var(--space-3); }

  .section-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .section-title-row h3 {
    margin: 0;
    color: var(--foreground);
    font-size: var(--type-section-title-size);
    font-weight: var(--type-section-title-weight);
  }

  .section-title-row span {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-pill);
    font-size: var(--type-caption-size);
    font-weight: var(--type-label-weight);
  }

  .jurisdiction-card-head strong {
    color: var(--primary);
    font-family: var(--font-data);
    font-size: var(--type-numeric-value-size);
    font-weight: var(--type-numeric-value-weight);
  }

  .jurisdiction-columns { margin-top: var(--space-3); }

  .jurisdiction-columns b {
    display: block;
    margin-bottom: var(--space-2);
    color: var(--primary-hover);
  }

  .jurisdiction-columns ul {
    margin: 0;
    padding-inline-start: var(--space-5);
    overflow-wrap: anywhere;
    color: var(--foreground-secondary);
    line-height: var(--type-body-leading);
    font-weight: var(--type-body-weight);
  }

  .comparison-card { min-width: 0; }

  .matrix-scroll {
    max-width: 100%;
    overflow-x: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
  }

  .matrix-scroll table {
    width: 100%;
    min-width: 760px;
    border-collapse: collapse;
    background: var(--surface);
  }

  .matrix-scroll th,
  .matrix-scroll td {
    padding: var(--space-3);
    border-bottom: 1px solid var(--border);
    color: var(--foreground-secondary);
    font-size: var(--type-table-cell-size);
    line-height: var(--type-table-cell-leading);
    text-align: start;
  }

  .matrix-scroll th {
    background: var(--table-header);
    color: var(--foreground);
    font-size: var(--type-table-header-size);
    font-weight: var(--type-table-header-weight);
  }

  .documents-layout {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(300px, .35fr);
    align-items: start;
    gap: var(--space-4);
  }

  .documents-main { min-width: 0; }

  .doc-card-head {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
    gap: var(--space-3);
  }

  .doc-card-head svg,
  .card-title svg,
  .module-link-button svg { flex: 0 0 auto; color: var(--primary); }

  .strategic-doc-card p {
    margin: 0;
    color: var(--foreground-muted);
    font-size: var(--type-body-small-size);
    line-height: var(--type-body-small-leading);
    font-weight: var(--type-body-weight);
  }

  .doc-missing,
  .missing-box {
    min-width: 0;
    display: grid;
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px dashed var(--border-strong);
    border-radius: var(--radius-control);
    background: var(--surface);
  }

  .missing-box { margin-top: var(--space-3); }

  .doc-missing strong,
  .missing-box strong {
    color: var(--primary-hover);
    font-size: var(--type-label-size);
  }

  .doc-missing div { display: flex; flex-wrap: wrap; gap: var(--space-2); }

  .doc-missing a,
  .inline-link {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-pill);
    background: var(--primary-soft);
    color: var(--primary-hover);
    font-size: var(--type-caption-size);
    font-weight: var(--type-label-weight);
    text-decoration: none;
  }

  .documents-side,
  .wizard-output { position: sticky; top: var(--space-5); }

  .document-vault-summary {
    display: grid;
    gap: var(--space-3);
    margin-top: var(--space-4);
  }

  .category-list {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    background: var(--surface-muted);
  }

  .category-list strong { color: var(--foreground); font-size: var(--type-label-size); }
  .category-list span { padding-bottom: var(--space-2); border-bottom: 1px solid var(--border); }
  .draft-preview { scroll-margin-top: var(--space-5); }
  .draft-actions { margin-bottom: var(--space-4); }

  .draft-sections section {
    min-width: 0;
    padding: var(--space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    background: var(--surface-muted);
  }

  .draft-sections ul {
    margin: 0;
    padding-inline-start: var(--space-5);
    overflow-wrap: anywhere;
    color: var(--foreground-secondary);
    line-height: var(--type-body-leading);
    font-weight: var(--type-body-weight);
  }

  .hub-grid {
    min-width: 0;
    display: grid;
    gap: var(--space-4);
  }

  .hub-grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .wizard-layout { grid-template-columns: minmax(0, 1.25fr) minmax(320px, .75fr); align-items: start; }
  .warm-card { padding: var(--space-5); }

  .card-title {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }

  .document-link.disabled { cursor: not-allowed; opacity: .68; }

  .copilot-panel {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    background: var(--surface-muted);
  }

  .copilot-panel span {
    display: block;
    color: var(--foreground-muted);
    font-size: var(--type-caption-size);
    font-weight: var(--type-body-weight);
  }

  .copilot-panel strong {
    display: block;
    margin-top: var(--space-1);
    overflow-wrap: anywhere;
    color: var(--foreground);
    font-weight: var(--type-card-title-weight);
  }

  .jurisdiction-summary {
    display: grid;
    gap: var(--space-2);
    margin: var(--space-3) 0;
  }

  .jurisdiction-summary p {
    display: grid;
    grid-template-columns: minmax(120px, .42fr) minmax(0, 1fr);
    gap: var(--space-3);
    margin: 0;
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--border);
  }

  .jurisdiction-summary b { color: var(--foreground-muted); }
  .jurisdiction-summary span { color: var(--foreground); font-weight: var(--type-label-weight); }

  .plain-list,
  .missing-box ul {
    margin: var(--space-3) 0 0;
    padding-inline-start: var(--space-5);
    color: var(--foreground-muted);
    line-height: 1.8;
    font-weight: var(--type-body-weight);
  }

  .trusted-note {
    margin: var(--space-3) 0 0;
    color: var(--foreground-muted);
    line-height: var(--type-body-leading);
    font-weight: var(--type-body-weight);
  }

  .module-links a,
  .module-link-button {
    min-height: var(--control-h-lg);
    border: 1px solid var(--border);
    background: var(--surface-muted);
    color: var(--foreground);
    box-shadow: var(--shadow-xs);
  }

  .module-link-button span {
    color: inherit;
    font-weight: var(--type-button-weight);
  }

  .module-links a:hover,
  .module-link-button:hover {
    border-color: color-mix(in srgb, var(--primary) 34%, var(--border));
    background: var(--surface-hover);
    box-shadow: var(--shadow-sm);
    transform: translateY(-1px);
  }

  a:focus-visible,
  button:focus-visible,
  input:focus-visible,
  textarea:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
    box-shadow: var(--focus-shadow);
  }

  @media (max-width: 1260px) {
    .readiness-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .hub-grid.two,
    .wizard-layout,
    .funding-layout,
    .documents-layout,
    .jurisdiction-layout,
    .directory-layout { grid-template-columns: 1fr; }
    .wizard-output,
    .funding-side,
    .documents-side,
    .directory-side { position: static; }
    .directory-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (max-width: 1024px) {
    .business-hero { grid-template-columns: 1fr; }
    .hero-actions { justify-content: stretch; }
    .hero-actions a,
    .hero-actions button { flex: 1 1 180px; }
    .selector-panel { grid-template-columns: 1fr; }
    .funding-header,
    .documents-header,
    .jurisdiction-header,
    .directory-header { display: grid; }
    .funding-header .score-pill,
    .documents-header .score-pill { width: 100%; }
    .jurisdiction-header .status-badge,
    .directory-header .status-badge { width: max-content; }
    .program-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 720px) {
    .topbar { align-items: flex-start; }
    .hero-actions { display: grid; }
    .hero-actions a,
    .hero-actions button { width: 100%; }
    .readiness-head { display: grid; }
    .score-pill { width: 100%; }
    .readiness-grid,
    .wizard-form,
    .module-links,
    .mini-metrics,
    .planner-grid,
    .planner-totals,
    .document-card-grid,
    .draft-sections,
    .jurisdiction-cards,
    .jurisdiction-columns,
    .choice-grid,
    .directory-filters,
    .program-meta,
    .funding-admin-form { grid-template-columns: 1fr; }
    .copilot-panel { grid-template-columns: 1fr; }
    .check-row,
    .document-link,
    .package-item,
    .dd-row { grid-template-columns: auto minmax(0, 1fr); }
    .check-row small,
    .document-link small,
    .package-item small,
    .dd-row small { grid-column: 2; }
    .fund-row { grid-template-columns: 1fr; }
    .jurisdiction-summary p,
    .program-detail p { grid-template-columns: 1fr; }
    .section-title-row,
    .jurisdiction-card-head,
    .program-card-head { display: grid; }
    .wizard-controls button,
    .program-actions button,
    .program-actions a { flex: 1 1 140px; }
  }
`;
