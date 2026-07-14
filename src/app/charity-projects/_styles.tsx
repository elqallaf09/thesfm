'use client';

/**
 * Charity Projects consumes the platform visual system directly.
 *
 * Keep colour, typography, radii, and elevation in tokens.css/themes.css.
 * This file owns only feature layout and the mapping of meaningful charity
 * states to the shared success/warning/danger/info semantics.
 */
export function CharityStyles() {
  return (
    <style jsx global>{`
      .charity-projects-page,
      .charity-projects-page *,
      .charity-projects-page *::before,
      .charity-projects-page *::after {
        box-sizing: border-box;
      }

      .charity-projects-page {
        min-height: 100%;
        width: 100%;
        min-width: 0;
        overflow-x: clip;
        background: var(--background);
        color: var(--foreground);
        font-family: var(--font-ui);
      }

      .charity-projects-page :is(button, input, select, textarea, a) {
        font-family: var(--font-ui);
      }

      .charity-projects-page .sfm-dashboard-page-shell,
      .charity-projects-page .sfm-dashboard-page-content.charity-projects-content {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        margin-inline: 0;
        overflow-x: clip;
      }

      .charity-projects-page .sfm-dashboard-page-content.charity-projects-content {
        display: grid;
        gap: clamp(16px, 1.65vw, 24px);
      }

      .charity-projects-page .sfm-dashboard-page-content.charity-projects-content > *,
      .charity-projects-page :is(
        .summary-grid,
        .main-grid,
        .split-grid,
        .project-grid,
        .calendar-grid,
        .reminder-grid,
        .impact-layout,
        .impact-summary-grid,
        .organization-grid,
        .beneficiary-grid,
        .contributor-grid,
        .document-grid,
        .report-grid
      ) > * {
        min-width: 0;
        max-width: 100%;
      }

      /* The single intentional branded gradient in this feature. */
      .charity-projects-page .cp-hero {
        position: relative;
        min-height: 178px;
        width: 100%;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: clamp(18px, 2vw, 28px);
        overflow: hidden;
        padding: clamp(22px, 2.4vw, 34px);
        border: 1px solid color-mix(in srgb, var(--primary) 34%, var(--border));
        border-radius: var(--radius-panel);
        background: var(--hero-gradient);
        color: var(--hero-foreground);
        box-shadow: var(--shadow-md);
      }

      .charity-projects-page .cp-hero > div {
        position: relative;
        z-index: 1;
        min-width: 0;
      }

      .charity-projects-page .cp-hero span {
        display: inline-flex;
        width: max-content;
        max-width: 100%;
        align-items: center;
        gap: 8px;
        padding: 7px 11px;
        border: 1px solid color-mix(in srgb, var(--hero-foreground) 28%, transparent);
        border-radius: var(--radius-pill);
        background: color-mix(in srgb, var(--hero-foreground) 11%, transparent);
        color: var(--hero-foreground);
        font-size: var(--type-caption-size);
        font-weight: 600;
        line-height: 1.4;
      }

      .charity-projects-page .cp-hero h1 {
        margin: 12px 0 10px;
        color: var(--hero-foreground);
        font-size: clamp(2rem, 3.1vw, 3.25rem);
        font-weight: 700;
        line-height: 1.18;
        letter-spacing: var(--type-page-title-tracking);
        overflow-wrap: anywhere;
      }

      .charity-projects-page .cp-hero p {
        max-width: 760px;
        margin: 0;
        color: var(--hero-foreground-muted);
        font-size: clamp(0.9375rem, 1.1vw, 1.0625rem);
        font-weight: 400;
        line-height: 1.8;
      }

      .charity-projects-page .hero-actions,
      .charity-projects-page .section-actions,
      .charity-projects-page .card-actions,
      .charity-projects-page .document-actions,
      .charity-projects-page .project-linked-actions,
      .charity-projects-page .modal-actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }

      .charity-projects-page .hero-actions {
        max-width: min(100%, 640px);
        justify-content: flex-end;
      }

      .charity-projects-page :is(
        .charity-action-button,
        .gold-btn,
        .mini-gold,
        .primary-wide,
        .ghost-btn,
        .dark-btn,
        .card-actions button,
        .document-actions button,
        .doc-count-btn,
        .report-card button,
        .report-option-card button,
        .phase28-report-row button
      ) {
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 0 14px;
        border: 1px solid var(--border-strong);
        border-radius: var(--radius-control);
        background: var(--surface);
        color: var(--foreground-secondary);
        box-shadow: none;
        font-size: var(--type-button-size);
        font-weight: var(--type-button-weight);
        line-height: var(--type-button-leading);
        text-align: center;
        text-decoration: none;
        white-space: normal;
        cursor: pointer;
        transition:
          background-color var(--duration-fast) var(--ease),
          border-color var(--duration-fast) var(--ease),
          color var(--duration-fast) var(--ease),
          transform var(--duration-fast) var(--ease);
      }

      .charity-projects-page :is(
        .charity-action-button.primary,
        .gold-btn,
        .mini-gold,
        .primary-wide,
        .report-card button,
        .report-option-card button
      ) {
        border-color: var(--primary);
        background: var(--primary);
        color: var(--primary-foreground);
      }

      .charity-projects-page :is(.charity-action-button.secondary, .dark-btn) {
        border-color: color-mix(in srgb, var(--hero-foreground) 30%, transparent);
        background: color-mix(in srgb, var(--hero-foreground) 12%, transparent);
        color: var(--hero-foreground);
      }

      .charity-projects-page :is(.charity-action-button.ghost, .ghost-btn) {
        background: var(--surface);
        color: var(--foreground-secondary);
      }

      .charity-projects-page .primary-wide {
        width: 100%;
      }

      .charity-projects-page :is(
        .charity-action-button,
        .gold-btn,
        .mini-gold,
        .primary-wide,
        .ghost-btn,
        .dark-btn,
        .card-actions button,
        .document-actions button,
        .doc-count-btn,
        .report-card button,
        .report-option-card button,
        .phase28-report-row button
      ):hover:not(:disabled) {
        border-color: color-mix(in srgb, var(--primary) 46%, var(--border));
        background: var(--surface-hover);
        color: var(--primary-hover);
        transform: translateY(-1px);
      }

      .charity-projects-page :is(
        .charity-action-button.primary,
        .gold-btn,
        .mini-gold,
        .primary-wide,
        .report-card button,
        .report-option-card button
      ):hover:not(:disabled) {
        border-color: var(--primary-hover);
        background: var(--primary-hover);
        color: var(--primary-foreground);
      }

      .charity-projects-page :is(button, a, input, select, textarea):focus-visible,
      .charity-projects-page .page-tab-panel:focus-visible {
        outline: 2px solid var(--focus-ring);
        outline-offset: 2px;
      }

      .charity-projects-page :is(button, input, select, textarea):disabled {
        opacity: 0.55;
        cursor: not-allowed;
        transform: none;
      }

      .charity-projects-page .notice {
        padding: 12px 14px;
        border: 1px solid color-mix(in srgb, var(--info) 30%, var(--border));
        border-radius: var(--radius-control);
        background: var(--info-soft);
        color: var(--info);
        font-size: var(--type-body-small-size);
        font-weight: 500;
        line-height: var(--type-body-small-leading);
      }

      .charity-projects-page .scope-notice a {
        color: currentColor;
        font-weight: 600;
      }

      .charity-projects-page :is(
        .warm-card,
        .summary-card,
        .project-card,
        .beneficiary-card,
        .contributor-card,
        .document-card,
        .organization-card,
        .report-card,
        .report-option-card,
        .reminder-card,
        .season-panel,
        .season-card,
        .alert-panel,
        .impact-panel,
        .template-card,
        .charity-form-section,
        .donation-record
      ) {
        border: 1px solid var(--border);
        border-radius: var(--radius-card);
        background: var(--surface);
        color: var(--foreground);
        box-shadow: var(--shadow-card);
      }

      .charity-projects-page .warm-card {
        padding: clamp(16px, 1.8vw, 24px);
      }

      .charity-projects-page :is(
        .project-dashboard,
        .family-collaboration,
        .beneficiary-tracking,
        .document-vault,
        .report-dashboard,
        .hijri-calendar,
        .overview-impact-card,
        #impact-dashboard,
        #charity-organization-directory
      ) {
        display: grid;
        gap: 16px;
      }

      .charity-projects-page :is(.project-card, .beneficiary-card, .contributor-card, .organization-card) {
        display: grid;
        align-content: start;
        gap: 12px;
        padding: 15px;
      }

      .charity-projects-page .summary-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 12px;
      }

      .charity-projects-page .summary-card.charity-stat-card {
        min-height: 112px;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-content: center;
        align-items: center;
        gap: 5px 12px;
        padding: 16px;
      }

      .charity-projects-page .summary-card.charity-stat-card > span {
        grid-row: 1 / span 3;
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border: 1px solid color-mix(in srgb, var(--primary) 20%, var(--border));
        border-radius: var(--radius-control);
        background: var(--primary-soft);
        color: var(--primary);
      }

      .charity-projects-page .summary-card small,
      .charity-projects-page .summary-card em {
        color: var(--foreground-muted);
        font-size: var(--type-caption-size);
        font-style: normal;
        font-weight: 400;
        line-height: var(--type-caption-leading);
      }

      .charity-projects-page .summary-card strong {
        color: var(--foreground);
        font-family: var(--font-data);
        font-size: clamp(1.2rem, 1.6vw, 1.55rem);
        font-weight: 600;
        line-height: 1.25;
        overflow-wrap: anywhere;
      }

      .charity-projects-page .page-section-tabs-shell.sticky {
        background: color-mix(in srgb, var(--background) 94%, transparent);
      }

      .charity-projects-page .page-section-tabs.charity-tabs {
        display: grid;
        grid-template-columns: repeat(8, minmax(0, 1fr));
        gap: 5px;
        padding: 6px;
        border: 1px solid var(--border) !important;
        border-radius: var(--radius-card) !important;
        background: var(--surface) !important;
        box-shadow: var(--shadow-xs) !important;
      }

      .charity-projects-page .page-section-tabs.charity-tabs button {
        min-width: 0;
        min-height: 44px;
        padding: 8px 10px;
        border: 1px solid transparent !important;
        border-radius: var(--radius-control) !important;
        background: transparent !important;
        color: var(--foreground-secondary) !important;
        font-size: var(--type-label-size);
        font-weight: var(--type-label-weight);
        line-height: var(--type-label-leading);
      }

      .charity-projects-page .page-section-tabs.charity-tabs button:hover {
        background: var(--surface-hover) !important;
        color: var(--foreground) !important;
      }

      .charity-projects-page .page-section-tabs.charity-tabs button.active {
        border-color: color-mix(in srgb, var(--primary) 24%, var(--border)) !important;
        border-block-end-color: var(--primary) !important;
        border-block-end-width: 3px !important;
        background: var(--primary-soft) !important;
        color: var(--primary-hover) !important;
        box-shadow: none !important;
        font-weight: 600;
      }

      .charity-projects-page .page-section-tabs-select select {
        min-height: 44px;
        border-color: var(--border-strong);
        border-radius: var(--radius-control);
        background: var(--control-background);
        color: var(--foreground);
      }

      .charity-projects-page .section-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        min-width: 0;
        margin-bottom: 16px;
      }

      .charity-projects-page .section-head > div {
        min-width: 0;
      }

      .charity-projects-page .section-head h2,
      .charity-projects-page .impact-panel h3,
      .charity-projects-page .form-section h3 {
        margin: 0;
        color: var(--foreground);
        font-weight: 600;
        overflow-wrap: anywhere;
      }

      .charity-projects-page .section-head h2 {
        font-size: clamp(1.25rem, 1.7vw, 1.55rem);
        line-height: 1.35;
      }

      .charity-projects-page .section-head small,
      .charity-projects-page .modal-kicker {
        display: block;
        margin-bottom: 4px;
        color: var(--foreground-muted);
        font-size: var(--type-caption-size);
        font-weight: 500;
        line-height: var(--type-caption-leading);
      }

      .charity-projects-page .section-head p,
      .charity-projects-page :is(.muted, .disclaimer) {
        max-width: 820px;
        margin: 6px 0 0;
        color: var(--foreground-muted);
        font-size: var(--type-body-size);
        font-weight: 400;
        line-height: var(--type-body-leading);
      }

      .charity-projects-page .section-head > svg,
      .charity-projects-page .charity-section-icon {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        display: grid;
        place-items: center;
        padding: 10px;
        border: 1px solid color-mix(in srgb, var(--primary) 20%, var(--border));
        border-radius: var(--radius-control);
        background: var(--primary-soft);
        color: var(--primary);
      }

      .charity-projects-page .charity-overview-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.65fr) minmax(300px, 0.85fr);
        gap: 16px;
        align-items: start;
      }

      .charity-projects-page :is(.overview-main-stack, .overview-side-stack) {
        display: grid;
        gap: 16px;
        min-width: 0;
      }

      .charity-projects-page .main-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .charity-projects-page .quick-action-grid .zakat-shortcut-card {
        grid-column: span 3;
      }

      .charity-projects-page .split-grid,
      .charity-projects-page .impact-layout {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .charity-projects-page .project-support-grid {
        grid-template-columns: minmax(0, 1.35fr) minmax(250px, 0.65fr);
      }

      .charity-projects-page .calendar-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
        gap: 14px;
        align-items: start;
      }

      .charity-projects-page :is(.season-panel, .alert-panel) {
        display: grid;
        align-content: start;
        gap: 12px;
        padding: 16px;
      }

      .charity-projects-page :is(.season-panel, .alert-panel) > strong,
      .charity-projects-page .season-card strong,
      .charity-projects-page .alert-line b {
        color: var(--foreground);
        font-size: var(--type-card-title-size);
        font-weight: 600;
        line-height: var(--type-card-title-leading);
      }

      .charity-projects-page .season-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 10px;
      }

      .charity-projects-page .season-card {
        min-height: 116px;
        display: grid;
        align-content: start;
        gap: 7px;
        padding: 13px;
        box-shadow: none;
      }

      .charity-projects-page .season-card-icon,
      .charity-projects-page .report-card-icon,
      .charity-projects-page .document-icon {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border: 1px solid color-mix(in srgb, var(--primary) 20%, var(--border));
        border-radius: var(--radius-control);
        background: var(--primary-soft);
        color: var(--primary);
      }

      .charity-projects-page .season-card small,
      .charity-projects-page .alert-line span,
      .charity-projects-page .season-panel p,
      .charity-projects-page .alert-panel p {
        color: var(--foreground-muted);
        font-size: var(--type-body-small-size);
        font-weight: 400;
        line-height: var(--type-body-small-leading);
      }

      .charity-projects-page .alert-line {
        display: grid;
        gap: 5px;
        padding: 11px;
        border: 1px solid var(--border);
        border-radius: var(--radius-control);
        background: var(--surface-muted);
      }

      .charity-projects-page .nisab,
      .charity-projects-page .privacy-note,
      .charity-projects-page .aggregate-scope-note {
        margin: 10px 0 0;
        padding: 10px 12px;
        border: 1px solid color-mix(in srgb, var(--info) 26%, var(--border));
        border-inline-start: 3px solid var(--info);
        border-radius: var(--radius-control);
        background: var(--info-soft);
        color: var(--foreground-secondary);
        font-size: var(--type-body-small-size);
        font-weight: 400;
        line-height: var(--type-body-small-leading);
      }

      .charity-projects-page .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .charity-projects-page :is(.form-grid.one, .wide) {
        grid-column: 1 / -1;
      }

      .charity-projects-page .form-grid.one {
        grid-template-columns: minmax(0, 1fr);
      }

      .charity-projects-page :is(.form-grid label, .impact-input, .currency-field) {
        min-width: 0;
        display: grid;
        gap: 7px;
        color: var(--foreground-secondary);
        font-size: var(--type-label-size);
        font-weight: var(--type-label-weight);
        line-height: var(--type-label-leading);
      }

      .charity-projects-page :is(
        .form-grid input,
        .form-grid select,
        .form-grid textarea,
        .impact-input input,
        .document-tools input,
        .document-tools select,
        .report-card select,
        .report-toolbar select
      ) {
        width: 100%;
        min-width: 0;
        min-height: 44px;
        padding: 0 12px;
        border: 1px solid var(--border-strong);
        border-radius: var(--radius-control);
        outline: none;
        background: var(--control-background);
        color: var(--foreground);
        font-size: var(--type-body-size);
        font-weight: 400;
        line-height: var(--type-body-leading);
      }

      .charity-projects-page :is(.form-grid textarea, .impact-input textarea) {
        min-height: 92px;
        padding-block: 10px;
        resize: vertical;
      }

      .charity-projects-page :is(
        .form-grid input,
        .form-grid select,
        .form-grid textarea,
        .impact-input input,
        .document-tools input,
        .document-tools select,
        .report-card select,
        .report-toolbar select
      ):focus {
        border-color: var(--focus-ring);
        box-shadow: var(--focus-shadow);
      }

      .charity-projects-page :is(input, textarea)::placeholder {
        color: var(--control-placeholder);
      }

      .charity-projects-page .check-row {
        display: flex !important;
        align-items: center;
        gap: 9px;
      }

      .charity-projects-page .check-row input {
        width: 18px;
        min-height: 18px;
        accent-color: var(--primary);
      }

      .charity-projects-page .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: grid;
        place-items: center;
        padding: 18px;
        background: var(--background-overlay);
      }

      .charity-projects-page .modal {
        width: min(760px, 100%);
        max-height: min(92dvh, 900px);
        overflow: auto;
        padding: clamp(18px, 2vw, 24px);
        border: 1px solid var(--border);
        border-radius: var(--radius-panel);
        background: var(--surface-elevated);
        color: var(--foreground);
        box-shadow: var(--shadow-lg);
      }

      .charity-projects-page .modal.small {
        width: min(440px, 100%);
      }

      .charity-projects-page .charity-project-modal {
        width: min(880px, 100%);
      }

      .charity-projects-page .modal-head {
        position: sticky;
        inset-block-start: 0;
        z-index: 2;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
        margin: calc(clamp(18px, 2vw, 24px) * -1) calc(clamp(18px, 2vw, 24px) * -1) 16px;
        padding: clamp(18px, 2vw, 24px);
        border-bottom: 1px solid var(--border);
        background: var(--surface-elevated);
      }

      .charity-projects-page .modal-head h2 {
        margin: 0;
        color: var(--foreground);
        font-size: var(--type-section-title-size);
        font-weight: var(--type-section-title-weight);
        line-height: var(--type-section-title-leading);
      }

      .charity-projects-page .modal-head button,
      .charity-projects-page .file-chip button {
        width: 44px;
        height: 44px;
        min-width: 44px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 1px solid var(--border-strong);
        border-radius: var(--radius-control);
        background: var(--surface);
        color: var(--foreground-secondary);
        cursor: pointer;
      }

      .charity-projects-page .modal-form-stack {
        display: grid;
        gap: 14px;
      }

      .charity-projects-page .form-section,
      .charity-projects-page .charity-form-section {
        display: grid;
        gap: 12px;
        padding: 14px;
        border: 1px solid var(--border);
        border-radius: var(--radius-card);
        background: var(--surface-muted);
        box-shadow: none;
      }

      .charity-projects-page .modal-actions {
        grid-column: 1 / -1;
        justify-content: flex-end;
        margin-top: 4px;
      }

      .charity-projects-page .file-chip {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px;
        border: 1px solid var(--border);
        border-radius: var(--radius-control);
        background: var(--surface-muted);
        color: var(--foreground-secondary);
      }

      .charity-projects-page .file-chip span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 500;
      }

      .charity-projects-page .file-chip small {
        margin-inline-start: auto;
        color: var(--foreground-muted);
      }

      .charity-projects-page .status-metric-grid,
      .charity-projects-page .beneficiary-stats,
      .charity-projects-page .impact-summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 10px;
        margin-bottom: 14px;
      }

      .charity-projects-page :is(
        .status-metric-grid > div,
        .beneficiary-stats > div,
        .impact-summary-grid > div,
        .big-metric
      ) {
        min-width: 0;
        display: grid;
        align-content: start;
        gap: 5px;
        padding: 13px;
        border: 1px solid var(--border);
        border-radius: var(--radius-card);
        background: var(--surface-muted);
      }

      .charity-projects-page :is(
        .status-metric-grid,
        .beneficiary-stats,
        .impact-summary-grid,
        .big-metric,
        .money-row,
        .phase28-project-meta,
        .beneficiary-meta,
        .beneficiary-assurance
      ) small {
        color: var(--foreground-muted);
        font-size: var(--type-caption-size);
        font-weight: 400;
        line-height: var(--type-caption-leading);
      }

      .charity-projects-page :is(
        .status-metric-grid,
        .beneficiary-stats,
        .impact-summary-grid,
        .big-metric,
        .money-row,
        .phase28-project-meta,
        .beneficiary-meta,
        .beneficiary-assurance
      ) strong {
        min-width: 0;
        color: var(--foreground);
        font-family: var(--font-data);
        font-size: 0.875rem;
        font-weight: 600;
        line-height: 1.45;
        overflow-wrap: anywhere;
      }

      .charity-projects-page :is(.beneficiary-stats, .impact-summary-grid, .big-metric) strong {
        font-size: clamp(1.05rem, 1.35vw, 1.3rem);
      }

      .charity-projects-page .document-tools,
      .charity-projects-page .report-toolbar {
        display: grid;
        grid-template-columns: minmax(0, 1fr) repeat(2, minmax(180px, 240px));
        gap: 10px;
        align-items: end;
        margin-bottom: 14px;
      }

      .charity-projects-page .document-tools-two {
        grid-template-columns: minmax(0, 1fr) repeat(2, minmax(180px, 240px));
      }

      .charity-projects-page .document-tools label,
      .charity-projects-page .report-toolbar label {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--foreground-muted);
      }

      .charity-projects-page .document-tools label {
        min-height: 44px;
        padding-inline: 12px;
        border: 1px solid var(--border-strong);
        border-radius: var(--radius-control);
        background: var(--control-background);
      }

      .charity-projects-page .document-tools label input {
        min-height: 40px;
        padding: 0;
        border: 0;
        background: transparent;
        box-shadow: none;
      }

      .charity-projects-page .project-grid,
      .charity-projects-page .organization-grid,
      .charity-projects-page .beneficiary-grid,
      .charity-projects-page .contributor-grid,
      .charity-projects-page .document-grid,
      .charity-projects-page .report-grid,
      .charity-projects-page .project-impact-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .charity-projects-page .project-top,
      .charity-projects-page .organization-top,
      .charity-projects-page .reminder-top {
        min-width: 0;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .charity-projects-page :is(.project-top, .organization-top, .reminder-top) > div {
        min-width: 0;
        display: grid;
        gap: 4px;
      }

      .charity-projects-page :is(.project-top, .organization-top, .reminder-top) strong {
        display: block;
        color: var(--foreground);
        font-size: var(--type-card-title-size);
        font-weight: var(--type-card-title-weight);
        line-height: var(--type-card-title-leading);
        overflow-wrap: anywhere;
      }

      .charity-projects-page :is(.project-top, .organization-top, .reminder-top) span,
      .charity-projects-page :is(.project-card, .beneficiary-card, .contributor-card, .reminder-card) > p {
        color: var(--foreground-muted);
        font-size: var(--type-body-small-size);
        font-weight: 400;
        line-height: var(--type-body-small-leading);
        overflow-wrap: anywhere;
      }

      .charity-projects-page .phase28-project-artwork {
        min-height: 112px;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 14px;
        padding: 18px;
        border: 1px solid color-mix(in srgb, var(--primary) 24%, var(--border));
        border-radius: var(--radius-card);
        background: var(--primary-soft);
        color: var(--primary-hover);
      }

      .charity-projects-page .phase28-project-artwork span {
        color: currentColor;
        font-weight: 600;
      }

      .charity-projects-page .phase28-project-artwork:is(
        .artwork-relief,
        .artwork-sacrifice,
        .artwork-sponsorship
      ) {
        border-color: color-mix(in srgb, var(--warning) 25%, var(--border));
        background: var(--warning-soft);
        color: var(--warning);
      }

      .charity-projects-page .phase28-project-artwork:is(
        .artwork-water_well,
        .artwork-mosque,
        .artwork-zakat
      ) {
        border-color: color-mix(in srgb, var(--accent) 25%, var(--border));
        background: var(--accent-soft);
        color: var(--accent-hover);
      }

      .charity-projects-page .phase28-project-artwork:is(
        .artwork-education,
        .artwork-endowment
      ) {
        border-color: color-mix(in srgb, var(--info) 25%, var(--border));
        background: var(--info-soft);
        color: var(--info);
      }

      .charity-projects-page .status,
      .charity-projects-page .verify-badge,
      .charity-projects-page .badge-row > span,
      .charity-projects-page .collab-strip > span,
      .charity-projects-page .metric-chip-row > span {
        max-width: 100%;
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 5px 9px;
        border: 1px solid var(--border);
        border-radius: var(--radius-pill);
        background: var(--surface-muted);
        color: var(--foreground-secondary);
        font-size: var(--type-caption-size);
        font-weight: 500;
        line-height: var(--type-caption-leading);
        overflow-wrap: anywhere;
      }

      .charity-projects-page :is(
        .status.completed,
        .status.paid,
        .status.active,
        .verify-badge.verified
      ) {
        border-color: color-mix(in srgb, var(--success) 30%, var(--border));
        background: var(--success-soft);
        color: var(--success);
      }

      .charity-projects-page :is(
        .status.planning,
        .status.fundraising,
        .status.pending,
        .status.partial,
        .status.needs_review,
        .verify-badge.unverified
      ) {
        border-color: color-mix(in srgb, var(--warning) 30%, var(--border));
        background: var(--warning-soft);
        color: var(--warning);
      }

      .charity-projects-page :is(
        .status.in_progress,
        .verify-badge.pending_review
      ) {
        border-color: color-mix(in srgb, var(--info) 30%, var(--border));
        background: var(--info-soft);
        color: var(--info);
      }

      .charity-projects-page :is(
        .status.paused,
        .status.late,
        .status.cancelled,
        .verify-badge.rejected
      ) {
        border-color: color-mix(in srgb, var(--danger) 30%, var(--border));
        background: var(--danger-soft);
        color: var(--danger);
      }

      .charity-projects-page .badge-row,
      .charity-projects-page .collab-strip,
      .charity-projects-page .metric-chip-row {
        min-width: 0;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 7px;
      }

      .charity-projects-page .org-strip,
      .charity-projects-page .trust-box,
      .charity-projects-page .beneficiary-assurance {
        min-width: 0;
        padding: 11px;
        border: 1px solid var(--border);
        border-radius: var(--radius-control);
        background: var(--surface-muted);
      }

      .charity-projects-page .org-strip {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 8px 12px;
      }

      .charity-projects-page .org-strip > span {
        color: var(--foreground-secondary);
        font-weight: 500;
      }

      .charity-projects-page .org-strip > small {
        grid-column: 1 / -1;
        padding-top: 7px;
        border-top: 1px solid var(--border);
        color: var(--foreground-muted);
        line-height: 1.55;
        overflow-wrap: anywhere;
      }

      .charity-projects-page .trust-box,
      .charity-projects-page .org-contact {
        display: grid;
        gap: 8px;
      }

      .charity-projects-page .trust-box > strong {
        color: var(--foreground);
        font-weight: 600;
      }

      .charity-projects-page .trust-box p,
      .charity-projects-page .org-contact :is(span, small) {
        margin: 0;
        color: var(--foreground-muted);
        font-size: var(--type-body-small-size);
        line-height: var(--type-body-small-leading);
      }

      .charity-projects-page .org-contact a {
        color: var(--primary-hover);
        overflow-wrap: anywhere;
      }

      .charity-projects-page .trust-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }

      .charity-projects-page .trust-grid span {
        padding: 9px;
        border: 1px solid var(--border);
        border-radius: var(--radius-control);
        background: var(--surface);
        color: var(--foreground-secondary);
        font-size: var(--type-body-small-size);
        line-height: var(--type-body-small-leading);
        overflow-wrap: anywhere;
      }

      .charity-projects-page .project-progress-label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        color: var(--foreground-secondary);
        font-size: var(--type-body-small-size);
      }

      .charity-projects-page .project-progress-label strong {
        color: var(--foreground);
        font-family: var(--font-data);
        font-weight: 600;
      }

      .charity-projects-page .progress,
      .charity-projects-page .impact-bar-row i {
        height: 9px;
        display: block;
        overflow: hidden;
        border-radius: var(--radius-pill);
        background: var(--border);
      }

      .charity-projects-page .progress i,
      .charity-projects-page .impact-bar-row b {
        height: 100%;
        display: block;
        border-radius: inherit;
        background: var(--primary);
      }

      .charity-projects-page .money-row,
      .charity-projects-page .phase28-project-meta,
      .charity-projects-page .beneficiary-meta,
      .charity-projects-page .beneficiary-assurance {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 128px), 1fr));
        gap: 9px;
      }

      .charity-projects-page :is(
        .money-row,
        .phase28-project-meta,
        .beneficiary-meta,
        .beneficiary-assurance
      ) > div {
        min-width: 0;
        display: grid;
        align-content: start;
        gap: 5px;
        padding: 10px;
        border: 1px solid var(--border);
        border-radius: var(--radius-control);
        background: var(--surface-muted);
      }

      .charity-projects-page .beneficiary-assurance > p {
        grid-column: 1 / -1;
        margin: 0;
        color: var(--foreground-muted);
        font-size: var(--type-body-small-size);
        line-height: var(--type-body-small-leading);
      }

      .charity-projects-page :is(.card-actions, .document-actions, .project-linked-actions) {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 128px), 1fr));
        width: 100%;
      }

      .charity-projects-page :is(.card-actions, .document-actions, .project-linked-actions) > * {
        width: 100%;
        min-width: 0;
      }

      .charity-projects-page .document-card {
        min-width: 0;
        display: grid;
        grid-template-columns: 42px minmax(0, 1fr);
        gap: 12px;
        padding: 14px;
      }

      .charity-projects-page .document-body {
        min-width: 0;
        display: grid;
        gap: 5px;
      }

      .charity-projects-page .document-body strong {
        color: var(--foreground);
        font-weight: 600;
        overflow-wrap: anywhere;
      }

      .charity-projects-page .document-body :is(span, small, em, p) {
        color: var(--foreground-muted);
        font-size: var(--type-body-small-size);
        font-style: normal;
        line-height: var(--type-body-small-leading);
        overflow-wrap: anywhere;
      }

      .charity-projects-page .document-actions {
        grid-column: 1 / -1;
      }

      .charity-projects-page .document-actions button:last-child,
      .charity-projects-page .reminder-card .card-actions button:last-child {
        border-color: color-mix(in srgb, var(--danger) 28%, var(--border));
        background: var(--danger-soft);
        color: var(--danger);
      }

      .charity-projects-page .details-list {
        display: grid;
        gap: 9px;
      }

      .charity-projects-page .details-list p {
        min-width: 0;
        display: grid;
        grid-template-columns: minmax(120px, 0.42fr) minmax(0, 1fr);
        gap: 8px 14px;
        margin: 0;
        padding: 11px 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius-control);
        background: var(--surface-muted);
        color: var(--foreground-secondary);
      }

      .charity-projects-page .details-list b {
        color: var(--foreground);
        font-weight: 600;
      }

      .charity-projects-page .details-list span {
        min-width: 0;
        color: var(--foreground-secondary);
        overflow-wrap: anywhere;
      }

      .charity-projects-page .template-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr));
        gap: 9px;
      }

      .charity-projects-page .template-card {
        min-width: 0;
        min-height: 72px;
        display: grid;
        align-content: start;
        justify-items: start;
        gap: 5px;
        padding: 12px;
        color: var(--foreground);
        text-align: start;
        cursor: pointer;
        box-shadow: none;
      }

      .charity-projects-page .template-card:hover {
        border-color: color-mix(in srgb, var(--primary) 32%, var(--border));
        background: var(--surface-hover);
      }

      .charity-projects-page .template-card strong {
        font-weight: 600;
      }

      .charity-projects-page .template-card span {
        color: var(--foreground-muted);
        font-size: var(--type-body-small-size);
        line-height: var(--type-body-small-leading);
      }

      .charity-projects-page .impact-summary-grid {
        grid-template-columns: repeat(6, minmax(0, 1fr));
      }

      .charity-projects-page .impact-summary-grid.compact-impact {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        margin-bottom: 0;
      }

      .charity-projects-page .impact-panel {
        position: relative;
        display: grid;
        align-content: start;
        gap: 10px;
        padding: 16px;
        box-shadow: none;
      }

      .charity-projects-page .impact-panel h3 {
        font-size: var(--type-card-title-size);
        line-height: var(--type-card-title-leading);
      }

      .charity-projects-page .ratio-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .charity-projects-page .ratio-grid > div,
      .charity-projects-page .project-impact-card,
      .charity-projects-page .impact-lines p {
        min-width: 0;
        margin: 0;
        padding: 11px;
        border: 1px solid var(--border);
        border-radius: var(--radius-control);
        background: var(--surface-muted);
        color: var(--foreground-secondary);
      }

      .charity-projects-page .impact-lines,
      .charity-projects-page .impact-bars {
        display: grid;
        gap: 9px;
      }

      .charity-projects-page .impact-lines .warn {
        border-color: color-mix(in srgb, var(--warning) 28%, var(--border));
        background: var(--warning-soft);
        color: var(--warning);
      }

      .charity-projects-page .impact-bar-row {
        min-width: 0;
        display: grid;
        grid-template-columns: minmax(86px, 0.72fr) minmax(0, 1fr) minmax(112px, 0.68fr);
        gap: 10px;
        align-items: center;
      }

      .charity-projects-page .impact-bar-row :is(span, strong) {
        min-width: 0;
        color: var(--foreground-secondary);
        font-size: var(--type-body-small-size);
        font-weight: 500;
        line-height: var(--type-body-small-leading);
        overflow-wrap: anywhere;
      }

      .charity-projects-page .impact-bar-row strong {
        color: var(--foreground);
        font-family: var(--font-data);
        font-weight: 600;
      }

      .charity-projects-page .project-impact-card {
        display: grid;
        gap: 10px;
      }

      .charity-projects-page .project-impact-card > strong {
        color: var(--foreground);
        font-weight: 600;
      }

      .charity-projects-page .reminder-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .charity-projects-page .reminder-card {
        display: grid;
        gap: 12px;
        padding: 15px;
      }

      .charity-projects-page .reminder-card.high {
        border-color: color-mix(in srgb, var(--danger) 30%, var(--border));
      }

      .charity-projects-page .reminder-card.normal {
        border-color: color-mix(in srgb, var(--warning) 24%, var(--border));
      }

      .charity-projects-page .reminder-card.low {
        border-color: color-mix(in srgb, var(--success) 24%, var(--border));
      }

      .charity-projects-page .reminder-top > b {
        flex: 0 0 auto;
        padding: 5px 9px;
        border-radius: var(--radius-pill);
        background: var(--warning-soft);
        color: var(--warning);
        font-size: var(--type-caption-size);
        font-weight: 600;
      }

      .charity-projects-page .reminder-card.high .reminder-top > b {
        background: var(--danger-soft);
        color: var(--danger);
      }

      .charity-projects-page .reminder-card.low .reminder-top > b {
        background: var(--success-soft);
        color: var(--success);
      }

      .charity-projects-page .donation-records {
        display: grid;
        gap: 10px;
      }

      .charity-projects-page .donation-record {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(180px, auto) auto;
        gap: 12px;
        align-items: center;
        padding: 13px;
        box-shadow: none;
      }

      .charity-projects-page .donation-record > div:first-child {
        display: grid;
        gap: 4px;
      }

      .charity-projects-page .donation-record > div:first-child strong {
        color: var(--foreground);
        font-family: var(--font-data);
        font-weight: 600;
      }

      .charity-projects-page .donation-record :is(span, small) {
        color: var(--foreground-muted);
        font-size: var(--type-body-small-size);
        line-height: var(--type-body-small-leading);
      }

      .charity-projects-page .donation-record-meta {
        display: grid;
        gap: 3px;
      }

      .charity-projects-page .report-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .charity-projects-page .report-card {
        min-width: 0;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(180px, 260px) auto;
        gap: 10px;
        align-items: end;
        padding: 12px;
        box-shadow: none;
      }

      .charity-projects-page .report-card > div {
        min-width: 0;
        display: grid;
        gap: 4px;
        align-self: center;
      }

      .charity-projects-page .report-card strong {
        color: var(--foreground);
        font-weight: 600;
      }

      .charity-projects-page .report-card span {
        color: var(--foreground-muted);
        font-size: var(--type-body-small-size);
        line-height: var(--type-body-small-leading);
      }

      .charity-projects-page .report-option-card {
        min-width: 0;
        display: grid;
        grid-template-columns: 42px minmax(0, 1fr) auto;
        gap: 12px;
        align-items: start;
        padding: 14px;
        box-shadow: none;
      }

      .charity-projects-page .report-option-card > div {
        min-width: 0;
        display: grid;
        gap: 5px;
      }

      .charity-projects-page .report-option-card strong {
        color: var(--foreground);
        font-weight: 600;
      }

      .charity-projects-page .report-option-card p {
        margin: 0;
        color: var(--foreground-muted);
        font-size: var(--type-body-small-size);
        line-height: var(--type-body-small-leading);
      }

      .charity-projects-page .impact-report-card {
        grid-template-columns: 42px minmax(0, 1fr);
      }

      .charity-projects-page .impact-report-card > :not(.report-card-icon):not(div) {
        grid-column: 1 / -1;
      }

      .charity-projects-page .aggregate-scope-note {
        border-color: color-mix(in srgb, var(--warning) 28%, var(--border));
        border-inline-start-color: var(--warning);
        background: var(--warning-soft);
      }

      .charity-projects-page .phase28-report-register {
        width: 100%;
        margin: 16px 0 22px;
        border-collapse: separate;
        border-spacing: 0 8px;
        table-layout: fixed;
        font-size: var(--type-table-cell-size);
      }

      .charity-projects-page .phase28-report-register caption {
        padding: 0 0 8px;
        color: var(--foreground);
        text-align: start;
        font-size: var(--type-card-title-size);
        font-weight: 600;
      }

      .charity-projects-page .phase28-report-register th {
        padding: 0 9px 5px;
        color: var(--foreground-muted);
        text-align: start;
        font-size: var(--type-table-header-size);
        font-weight: var(--type-table-header-weight);
        line-height: var(--type-table-header-leading);
      }

      .charity-projects-page .phase28-report-row {
        background: var(--surface-muted);
      }

      .charity-projects-page .phase28-report-row > td {
        min-width: 0;
        padding: 11px 8px;
        border-block: 1px solid var(--border);
        color: var(--foreground-secondary);
        overflow-wrap: break-word;
        vertical-align: middle;
      }

      .charity-projects-page .phase28-report-row > td:first-child {
        border-inline-start: 1px solid var(--border);
        border-start-start-radius: var(--radius-card);
        border-end-start-radius: var(--radius-card);
      }

      .charity-projects-page .phase28-report-row > td:last-child {
        border-inline-end: 1px solid var(--border);
        border-start-end-radius: var(--radius-card);
        border-end-end-radius: var(--radius-card);
      }

      .charity-projects-page .phase28-report-row strong {
        color: var(--foreground);
        font-family: var(--font-data);
        font-weight: 600;
      }

      .charity-projects-page .separate-workflow-row > td:first-child {
        border-inline-start: 4px solid var(--warning);
      }

      .charity-projects-page .charity-empty-state {
        min-height: 180px;
        display: grid;
        place-items: center;
        gap: 10px;
        padding: 28px 18px;
        border: 1px dashed var(--border-strong);
        border-radius: var(--radius-card);
        background: var(--surface-muted);
        color: var(--foreground-muted);
        text-align: center;
      }

      .charity-projects-page .charity-empty-state.compact {
        min-height: 160px;
        padding: 24px 14px;
      }

      .charity-projects-page .charity-empty-state .sfm-empty-state-icon {
        width: 48px;
        height: 48px;
        display: grid;
        place-items: center;
        border: 1px solid color-mix(in srgb, var(--primary) 20%, var(--border));
        border-radius: var(--radius-card);
        background: var(--primary-soft);
        color: var(--primary);
      }

      .charity-projects-page .charity-empty-state > strong {
        color: var(--foreground);
        font-size: var(--type-card-title-size);
        font-weight: 600;
        line-height: var(--type-card-title-leading);
      }

      .charity-projects-page .charity-empty-state > p {
        max-width: 560px;
        margin: 0;
        color: var(--foreground-muted);
        font-size: var(--type-body-size);
        line-height: var(--type-body-leading);
      }

      .charity-projects-page .sfm-empty-state-actions {
        display: flex;
        justify-content: center;
      }

      @media (max-width: 1320px) {
        .charity-projects-page .summary-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .charity-projects-page .impact-summary-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .charity-projects-page .page-section-tabs.charity-tabs {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }

      @media (max-width: 1024px) {
        .charity-projects-page .cp-hero {
          grid-template-columns: minmax(0, 1fr);
        }

        .charity-projects-page .hero-actions {
          justify-content: flex-start;
        }

        .charity-projects-page .charity-overview-grid,
        .charity-projects-page :is(.main-grid, .split-grid, .project-support-grid, .calendar-grid, .impact-layout) {
          grid-template-columns: minmax(0, 1fr);
        }

        .charity-projects-page .quick-action-grid .zakat-shortcut-card {
          grid-column: auto;
        }

        .charity-projects-page :is(
          .project-grid,
          .organization-grid,
          .beneficiary-grid,
          .contributor-grid,
          .document-grid,
          .report-grid,
          .project-impact-grid,
          .reminder-grid
        ) {
          grid-template-columns: minmax(0, 1fr);
        }

        .charity-projects-page .document-tools,
        .charity-projects-page .document-tools-two,
        .charity-projects-page .report-toolbar {
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        }

        .charity-projects-page .document-tools > :first-child,
        .charity-projects-page .report-toolbar > :first-child {
          grid-column: 1 / -1;
        }

        .charity-projects-page .impact-bar-row {
          grid-template-columns: minmax(82px, 0.5fr) minmax(0, 1fr) minmax(100px, 0.5fr);
        }

        .charity-projects-page .phase28-report-register {
          display: block;
          border-spacing: 0;
        }

        .charity-projects-page .phase28-report-register caption {
          display: block;
        }

        .charity-projects-page .phase28-report-register thead {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          overflow: hidden;
          clip: rect(0 0 0 0);
          white-space: nowrap;
          border: 0;
        }

        .charity-projects-page .phase28-report-register tbody {
          display: grid;
          gap: 10px;
        }

        .charity-projects-page .phase28-report-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          align-items: start;
          padding: 11px;
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
        }

        .charity-projects-page .phase28-report-row > td {
          display: grid;
          grid-template-columns: minmax(90px, 0.42fr) minmax(0, 1fr);
          gap: 8px;
          padding: 8px;
          border: 0;
          border-radius: 0;
        }

        .charity-projects-page .phase28-report-row > td::before {
          content: attr(data-label);
          color: var(--foreground-muted);
          font-size: var(--type-caption-size);
          font-weight: 500;
        }

        .charity-projects-page .separate-workflow-row {
          border-inline-start: 4px solid var(--warning);
        }
      }

      @media (max-width: 720px) {
        .charity-projects-page .page-section-tabs-shell.mobile-select .page-section-tabs.charity-tabs {
          display: none;
        }

        .charity-projects-page .page-section-tabs-shell.mobile-select .page-section-tabs-select {
          display: grid;
        }

        .charity-projects-page .summary-grid,
        .charity-projects-page .impact-summary-grid,
        .charity-projects-page .status-metric-grid,
        .charity-projects-page .beneficiary-stats,
        .charity-projects-page .ratio-grid,
        .charity-projects-page .trust-grid,
        .charity-projects-page .form-grid,
        .charity-projects-page .document-tools,
        .charity-projects-page .document-tools-two,
        .charity-projects-page .report-toolbar,
        .charity-projects-page .report-card {
          grid-template-columns: minmax(0, 1fr);
        }

        .charity-projects-page .document-tools > :first-child,
        .charity-projects-page .report-toolbar > :first-child {
          grid-column: auto;
        }

        .charity-projects-page .section-head,
        .charity-projects-page :is(.project-top, .organization-top, .reminder-top) {
          display: grid;
        }

        .charity-projects-page .section-actions,
        .charity-projects-page .section-head > :is(button, a) {
          width: 100%;
        }

        .charity-projects-page .impact-bar-row,
        .charity-projects-page .phase28-report-row,
        .charity-projects-page .phase28-project-meta,
        .charity-projects-page .beneficiary-meta,
        .charity-projects-page .beneficiary-assurance,
        .charity-projects-page .money-row,
        .charity-projects-page .donation-record,
        .charity-projects-page .report-option-card,
        .charity-projects-page .details-list p {
          grid-template-columns: minmax(0, 1fr);
        }

        .charity-projects-page .phase28-report-row > td {
          grid-template-columns: minmax(0, 1fr);
        }

        .charity-projects-page .beneficiary-assurance > p,
        .charity-projects-page .impact-report-card > :not(.report-card-icon):not(div) {
          grid-column: auto;
        }

        .charity-projects-page .org-strip {
          grid-template-columns: minmax(0, 1fr);
        }

        .charity-projects-page .org-strip > .verify-badge {
          justify-self: start;
        }

        .charity-projects-page .org-strip > small {
          grid-column: auto;
        }

        .charity-projects-page .modal-actions,
        .charity-projects-page :is(.card-actions, .document-actions, .project-linked-actions) {
          grid-template-columns: minmax(0, 1fr);
        }

        .charity-projects-page .hero-actions,
        .charity-projects-page .modal-actions {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          width: 100%;
        }

        .charity-projects-page .hero-actions > *,
        .charity-projects-page .modal-actions > * {
          width: 100%;
        }

        .charity-projects-page .impact-summary-grid.compact-impact {
          grid-template-columns: minmax(0, 1fr);
        }
      }

      @media (max-width: 430px) {
        .charity-projects-page .cp-hero {
          min-height: auto;
          padding: 20px 16px;
        }

        .charity-projects-page .cp-hero h1 {
          font-size: 1.875rem;
        }

        .charity-projects-page :is(
          .warm-card,
          .project-card,
          .beneficiary-card,
          .contributor-card,
          .organization-card,
          .document-card,
          .report-option-card,
          .reminder-card
        ) {
          padding: 14px;
        }

        .charity-projects-page .modal-backdrop {
          align-items: end;
          padding: 0;
        }

        .charity-projects-page .modal,
        .charity-projects-page .modal.small,
        .charity-projects-page .charity-project-modal {
          width: 100%;
          max-height: 94dvh;
          border-end-start-radius: 0;
          border-end-end-radius: 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .charity-projects-page *,
        .charity-projects-page *::before,
        .charity-projects-page *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          scroll-behavior: auto !important;
          transition-duration: 0.01ms !important;
        }
      }
    `}</style>
  );
}
