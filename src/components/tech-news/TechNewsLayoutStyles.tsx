'use client';

// Page-chrome styles: hero header, ticker, quick filters (search + category
// nav), advanced-filters trigger/modal, results bar, load-more, empty/error
// states, and the loading skeleton shell. Split out of TechNewsPage.tsx so
// that file stays focused on data flow and composition rather than ~1000
// lines of CSS text. See TechNewsCardStyles.tsx for card/media/side-panel
// styles.
export function TechNewsLayoutStyles() {
  return (
    <style jsx global>{`
      .tech-news-shell{
        min-height:100dvh;
        background:var(--background);
        color:var(--foreground);
        font-family:var(--font-ui);
        overflow-x:hidden;
      }

      [dir].tech-news-shell .tech-news-main{
        width:100%;
        margin-inline:auto;
        display:grid;
        gap:var(--workspace-page-section-gap);
        min-width:0;
      }

      .tech-ticker-strip{
        display:flex;
        align-items:center;
        gap:8px;
        padding:8px;
        border:1px solid var(--border);
        background:var(--surface);
        box-shadow:var(--shadow-card);
        border-radius:var(--radius-card);
        overflow:hidden;
      }
      .tech-ticker-viewport{min-height:50px;min-width:0;flex:1;overflow:hidden}
      .tech-ticker-track{display:flex;align-items:center;gap:8px;width:max-content}
      .tech-ticker-set{display:flex;align-items:center;gap:8px;flex:none}
      .tech-ticker-delay-badge{
        display:inline-flex;align-items:center;gap:5px;min-height:28px;padding:0 10px;
        border-radius:var(--radius-pill);background:var(--info-soft);color:var(--info);
        font-size:12px;font-weight:600;white-space:nowrap;
      }
      .tech-ticker-item{
        width:210px;min-height:56px;display:grid;grid-template-columns:minmax(0,1fr) auto;
        align-items:center;gap:4px 6px;padding:7px 10px;border:1px solid var(--border);
        border-radius:var(--radius-control);background:var(--surface);box-shadow:var(--shadow-card);
      }
      .tech-ticker-item .tech-ticker-identity{grid-column:1 / -1;display:flex;align-items:center;gap:7px;min-width:0}
      .tech-ticker-item .tech-ticker-identity > div{display:grid;gap:1px;min-width:0;overflow:hidden}
      .tech-ticker-item .tech-ticker-identity .asset-identity-name{font-size:12px;line-height:1.1}
      .tech-ticker-item .tech-ticker-identity .asset-identity-symbol{font-size:12px}
      .tech-ticker-item .tech-ticker-identity strong{font-size:12px;color:var(--foreground-muted);text-transform:uppercase;letter-spacing:.2px;line-height:1}
      .tech-ticker-item small{display:inline-flex;align-items:center;gap:3px;min-width:0;max-width:100%;overflow:hidden;color:var(--foreground-muted);font-size:12px;font-weight:400;text-overflow:ellipsis;white-space:nowrap;grid-column:1 / -1}
      .tech-ticker-price{grid-column:1;color:var(--foreground);font-size:12px;font-weight:600;white-space:nowrap}
      .tech-ticker-change{grid-column:2;display:inline-flex;align-items:center;gap:4px;justify-self:end;border-radius:var(--radius-pill);padding:3px 6px;font-size:12px;font-weight:600;white-space:nowrap}
      .tech-ticker-change.up{background:var(--success-soft);color:var(--market-positive)}
      .tech-ticker-change.down{background:var(--danger-soft);color:var(--danger)}
      .tech-ticker-change.neutral{background:var(--surface-muted);color:var(--foreground-secondary)}

      @media (max-width: 620px) {
        .tech-ticker-strip{padding:6px}
        .tech-ticker-viewport{min-height:52px}
        .tech-ticker-item{width:206px;min-height:58px;padding:7px 9px;gap:3px 6px}
        .tech-ticker-item small{font-size:12px}
        .tech-ticker-price{font-size:12px}
        .tech-ticker-change{font-size:12px}
      }

      .tech-news-header{
        position:relative;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr) auto;
        gap:18px;align-items:center;border:1px solid var(--border);border-radius:var(--radius-panel);
        padding:18px 22px;background:var(--hero-gradient);box-shadow:var(--shadow-md);color:var(--hero-foreground);
      }
      .tech-news-title-row{position:relative;z-index:1;display:flex;align-items:center;gap:14px;min-width:0}
      .tech-news-title-icon{width:46px;height:46px;flex:0 0 auto;display:grid;place-items:center;border-radius:var(--radius-card);background:var(--background-overlay);border:1px solid var(--border);color:var(--hero-foreground)}
      .tech-news-title-copy{display:grid;gap:5px;min-width:0}
      .tech-news-eyebrow{width:max-content;max-width:100%;display:inline-flex;align-items:center;gap:7px;min-height:28px;padding:0 12px;border-radius:var(--radius-pill);background:var(--background-overlay);border:1px solid var(--border);color:var(--hero-foreground);font-size:12px;font-weight:600}
      .tech-news-header h1{margin:0;font-size:clamp(24px,2.6vw,34px);font-weight:600;line-height:1.12;letter-spacing:0;color:var(--hero-foreground)}
      .tech-news-header p{margin:0;max-width:680px;color:var(--hero-foreground-muted);font-size:13.5px;font-weight:400;line-height:1.6}
      .tech-news-header-actions{position:relative;z-index:1;display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}
      .tech-news-header-stat{min-width:86px;min-height:60px;display:grid;place-items:center;border-radius:var(--radius-card);background:var(--background-overlay);border:1px solid var(--border)}
      .tech-news-header-stat span{font-size:22px;font-weight:600;color:var(--hero-foreground)}
      .tech-news-header-stat b{font-size:11px;font-weight:600;color:var(--hero-foreground-muted)}
      .tech-news-header-meta{display:grid;gap:6px}
      .tech-news-header-meta span{display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:0 11px;border-radius:var(--radius-pill);background:var(--background-overlay);color:var(--hero-foreground-muted);border:1px solid var(--border);font-size:11.5px;font-weight:600;white-space:nowrap}
      .tech-news-refresh-btn{width:42px;height:var(--control-h);border:1px solid var(--border);border-radius:var(--radius-control);background:var(--background-overlay);color:var(--hero-foreground);display:grid;place-items:center;cursor:pointer;transition:transform .18s ease,background .18s ease,box-shadow .18s ease}
      .tech-news-refresh-btn:hover,.tech-news-refresh-btn:focus-visible{outline:none;transform:translateY(-1px);background:var(--accent);box-shadow:var(--focus-shadow)}
      .tech-news-refresh-btn:disabled{opacity:.68;cursor:not-allowed}
      .spinning{animation:techSpin 1s linear infinite}
      @keyframes techSpin{to{transform:rotate(360deg)}}

      .tech-news-coverage-notice{display:flex;align-items:flex-start;gap:9px;padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-control);background:var(--warning-soft);color:var(--warning);font-size:13px;font-weight:400;line-height:1.55}
      .tech-news-coverage-notice svg{margin-top:2px;flex:none}

      .tech-news-quick-filters{display:grid;gap:12px}
      .tech-news-search{min-height:48px;display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:var(--radius-control);background:var(--surface-muted);padding-inline:14px;min-width:0}
      .tech-news-search svg{color:var(--foreground-muted);flex:0 0 auto}
      .tech-news-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--foreground);font-family:var(--font-ui);font-size:14px;font-weight:400}
      .tech-news-search:focus-within{border-color:var(--accent);box-shadow:var(--focus-shadow)}
      .tech-news-chip-row{display:flex;flex-wrap:wrap;gap:6px;overflow:visible;padding-bottom:2px;scrollbar-width:thin}
      .tech-news-chip-row button{flex:0 0 auto;min-height:42px;display:inline-flex;align-items:center;gap:8px;border:1px solid transparent;border-radius:var(--radius-pill);background:var(--surface-muted);color:var(--foreground-secondary);padding:0 14px;font-family:var(--font-ui);font-size:12.5px;font-weight:600;cursor:pointer;transition:border-color .18s ease,background .18s ease,color .18s ease}
      .tech-news-chip-row button b{min-width:22px;height:22px;border-radius:var(--radius-pill);display:grid;place-items:center;background:color-mix(in srgb, var(--foreground) 8%, transparent);color:var(--foreground-muted);font-size:11px}
      .tech-news-chip-row button.active{background:var(--primary-soft);border-color:color-mix(in srgb, var(--primary) 30%, transparent);color:var(--primary-hover);font-weight:600;box-shadow:var(--active-indicator-inline-start)}
      :root[dir="rtl"] .tech-news-chip-row button.active{box-shadow:var(--active-indicator-inline-end)}
      .tech-news-chip-row button.active b{background:var(--primary);color:var(--primary-foreground)}
      .tech-news-chip-row button:hover:not(.active){background:var(--surface-hover);color:var(--foreground)}
      .tech-news-chip-row button:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px}
      @media(max-width:760px){
        .tech-news-chip-row{margin-inline:-2px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:8px}
        .tech-news-chip-row::-webkit-scrollbar{display:none}
      }

      .tech-news-advanced-filters-trigger{
        display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;
        border:1px solid transparent;border-radius:var(--radius-pill);background:var(--surface-muted);
        color:var(--foreground-secondary);font-family:var(--font-ui);font-size:12.5px;font-weight:600;cursor:pointer;
        transition:border-color .18s ease,background .18s ease,color .18s ease;
      }
      .tech-news-advanced-filters-trigger:hover{background:var(--surface-hover);color:var(--foreground)}
      .tech-news-advanced-filters-trigger:focus-visible{outline:none;border-color:var(--focus-ring);box-shadow:var(--focus-shadow)}
      .tech-news-advanced-filters-trigger b{min-width:20px;height:20px;border-radius:var(--radius-pill);display:grid;place-items:center;background:var(--primary);color:var(--primary-foreground);font-size:11px}
      .tech-news-advanced-filters-body{display:grid;gap:14px}
      .tech-news-advanced-filters-count{margin:0;color:var(--foreground-muted);font-size:12.5px;font-weight:600}
      .tech-news-advanced-filters-clear{justify-self:start}
      .tech-news-select-control{display:grid;gap:6px;min-width:0}
      .tech-news-select-control span{color:var(--foreground-muted);font-size:12px;font-weight:600}
      .tech-news-select-control select{width:100%;height:var(--control-h-lg);border:1px solid var(--border);border-radius:var(--radius-control);background:var(--surface-muted);color:var(--foreground);padding-inline:12px;font-family:var(--font-ui);font-size:13px;font-weight:600;outline:none;text-overflow:ellipsis}
      .tech-news-select-control select:focus{border-color:var(--accent);box-shadow:var(--focus-shadow)}
      .tech-news-clear-btn{min-height:40px;border:1px solid transparent;border-radius:var(--radius-pill);background:var(--surface-muted);color:var(--foreground-secondary);display:inline-flex;align-items:center;gap:7px;padding:0 13px;font-family:var(--font-ui);font-size:12px;font-weight:600;cursor:pointer;transition:border-color .18s ease,background .18s ease,color .18s ease}
      .tech-news-clear-btn:hover{background:var(--surface-hover);color:var(--foreground)}
      .tech-news-clear-btn:focus-visible{outline:none;border-color:var(--focus-ring);box-shadow:var(--focus-shadow)}
      .tech-news-active-filters{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
      .tech-news-active-filters button{display:inline-flex;align-items:center;gap:7px;max-width:100%;min-height:40px;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--info-soft);color:var(--info);padding:0 10px;font-family:var(--font-ui);font-size:12px;font-weight:600;cursor:pointer}
      .tech-news-active-filters button span{color:var(--info)}
      .tech-news-active-filters button b{min-width:0;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
      .tech-news-active-filters button:hover,.tech-news-active-filters button:focus-visible{outline:none;border-color:var(--primary);box-shadow:var(--focus-shadow)}
      .tech-news-active-filters .tech-news-clear-btn{background:transparent}

      .tech-news-results-bar{min-height:56px;display:flex;justify-content:space-between;align-items:center;gap:14px;border:1px solid var(--border);background:var(--surface);border-radius:var(--radius-panel);padding:11px 14px;box-shadow:var(--shadow-card)}
      .tech-news-results-bar > div:first-child{display:grid;gap:3px}
      .tech-news-results-bar span{color:var(--foreground-muted);font-size:12px;font-weight:600}
      .tech-news-results-bar b{color:var(--foreground);font-size:16px;font-weight:600}
      .tech-news-view-toggle{display:inline-flex;gap:6px;padding:5px;border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--radius-control)}
      .tech-news-view-toggle button{min-height:40px;display:inline-flex;align-items:center;gap:7px;border:0;border-radius:var(--radius-control);background:transparent;color:var(--foreground-muted);padding:0 11px;font-family:var(--font-ui);font-size:12px;font-weight:600;cursor:pointer}
      .tech-news-view-toggle button.active{background:var(--surface);color:var(--primary);box-shadow:var(--shadow-card)}
      .tech-news-view-toggle button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

      .tech-news-load-more-wrap{display:grid;place-items:center;min-height:48px;margin-top:2px}
      .tech-news-load-more-wrap span{color:var(--foreground-muted);font-size:12px;font-weight:600}
      .tech-news-load-more{min-width:220px;min-height:46px;border:0;border-radius:var(--radius-pill);background:var(--primary);color:var(--primary-foreground);padding:0 22px;font-family:var(--font-ui);font-size:13px;font-weight:600;cursor:pointer;box-shadow:var(--shadow-card)}
      .tech-news-load-more:hover,.tech-news-load-more:focus-visible{outline:none;box-shadow:var(--focus-shadow)}

      .tech-news-state{display:grid;place-items:center;gap:10px;text-align:center;padding:56px 20px;color:var(--foreground-muted);background:var(--surface);border:1px dashed var(--border-strong);border-radius:var(--radius-panel)}
      .tech-news-state svg{color:var(--accent)}
      .tech-news-state strong{display:block;color:var(--foreground);font-size:20px;font-weight:600}
      .tech-news-state p{margin:0;max-width:640px;color:var(--foreground-muted);font-weight:400;line-height:1.75}
      .tech-news-state button{border:0;border-radius:var(--radius-control);background:var(--primary);color:var(--primary-foreground);display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;font-family:var(--font-ui);font-size:12px;font-weight:600;cursor:pointer}
      .tech-news-disclaimer{text-align:center;color:var(--foreground-muted);font-size:12px;font-weight:400;line-height:1.7;margin:0}

      .tech-news-skeleton-root{display:grid;gap:var(--workspace-page-section-gap)}
      .tech-news-quick-filters-skeleton{display:grid;gap:10px}
      .tech-news-quick-filters-skeleton span{display:block;height:48px;border-radius:var(--radius-control);background:var(--skeleton-gradient);background-size:220% 100%;animation:techNewsShimmer 1.2s linear infinite}
      .tech-news-quick-filters-skeleton span:last-child{height:42px;width:60%}
      .tech-news-skeleton span,.tech-news-skeleton i,.tech-news-skeleton b,.tech-news-skeleton small{display:block;border-radius:var(--radius-pill);background:var(--skeleton-gradient);background-size:220% 100%;animation:techNewsShimmer 1.2s linear infinite}
      .tech-news-skeleton span{width:42%;height:18px}
      .tech-news-skeleton i{width:100%;height:15px;margin-top:8px}
      .tech-news-skeleton b{width:58%;height:38px;border-radius:var(--radius-control);margin-top:10px}
      .tech-news-skeleton small{width:35%;height:14px;margin-top:8px}
      .tech-news-skeleton-media{display:block;width:100%;height:64px;margin-bottom:10px;border-radius:var(--radius-card);background:var(--skeleton-gradient);background-size:220% 100%;animation:techNewsShimmer 1.2s linear infinite}
      @keyframes techNewsShimmer{to{background-position:-220% 0}}

      .tech-news-refresh-btn:focus-visible,.tech-news-clear-btn:focus-visible,.tech-news-select-control select:focus-visible,.tech-news-active-filters button:focus-visible,.tech-news-chip-row button:focus-visible,.tech-news-view-toggle button:focus-visible,.tech-news-load-more:focus-visible,.tech-news-state button:focus-visible,.tech-news-advanced-filters-trigger:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px;box-shadow:var(--focus-shadow)}

      @media(max-width:1024px){
        .tech-news-header{grid-template-columns:1fr}
        .tech-news-header-actions{justify-content:flex-start}
      }
      @media(max-width:760px){
        [dir].tech-news-shell .tech-news-main{gap:16px}
        .tech-news-header{padding:16px;border-radius:var(--radius-panel)}
        .tech-news-title-row{align-items:flex-start}
        .tech-news-title-icon{width:42px;height:42px;border-radius:var(--radius-control)}
        .tech-news-header h1{font-size:24px}
        .tech-news-header-meta{width:100%}
        .tech-news-header-meta span{width:100%;white-space:normal}
        .tech-news-results-bar{display:grid}
        .tech-news-view-toggle{width:100%;justify-content:stretch}
        .tech-news-view-toggle button{flex:1;justify-content:center}
        .tech-news-load-more{width:100%;min-width:0}
        .tech-ticker-strip{gap:6px;padding:7px;border-radius:var(--radius-control)}
        .tech-ticker-viewport{min-height:46px;overflow:hidden}
        .tech-ticker-track{gap:7px;animation-duration:48s}
        .tech-ticker-set{gap:7px}
        .tech-ticker-item{inline-size:148px;min-height:46px;padding:6px 9px;border-radius:var(--radius-control)}
        .tech-ticker-delay-badge{min-height:26px;padding:0 9px;font-size:12px}
      }
      @media(prefers-reduced-motion:reduce){
        .tech-ticker-track{animation:none}
        .tech-news-chip-row button,.tech-news-refresh-btn{transition:none}
        .spinning{animation:none}
        .tech-news-skeleton span,.tech-news-skeleton i,.tech-news-skeleton b,.tech-news-skeleton small,.tech-news-skeleton-media,.tech-news-quick-filters-skeleton span{animation:none}
      }
    `}</style>
  );
}

export default TechNewsLayoutStyles;
