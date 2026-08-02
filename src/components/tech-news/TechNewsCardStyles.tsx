'use client';

// Card/media/evidence/featured-grid/main-layout/side-panel styles. Split out
// of TechNewsPage.tsx alongside TechNewsLayoutStyles.tsx -- see that file's
// header comment for why.
export function TechNewsCardStyles() {
  return (
    <style jsx global>{`
      .tech-news-featured{display:grid;gap:14px}
      .tech-news-featured-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .tech-news-featured-head h2{margin:0;color:var(--foreground);font-size:19px;font-weight:600}
      .tech-news-featured-head span{display:inline-flex;align-items:center;gap:7px;color:var(--accent);font-size:12px;font-weight:600}
      .tech-news-featured-grid{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(300px,.85fr);gap:16px;align-items:stretch}
      .tech-news-featured-side{display:grid;gap:12px;min-width:0}
      .tech-news-evidence-card{display:grid;gap:8px;min-width:0;align-content:start}
      .tech-news-featured-grid>.tech-news-evidence-card:first-child,.tech-news-evidence-card>.tech-news-card-lead{height:100%}
      .tech-news-evidence{display:flex;align-items:flex-start;gap:8px;padding:9px 11px;border:1px solid var(--border);border-radius:var(--radius-control);background:var(--surface-muted);color:var(--foreground-muted);font-size:12px;line-height:1.45}
      .tech-news-evidence>svg{margin-top:2px;flex:none;color:var(--info)}
      .tech-news-evidence>div{display:grid;gap:2px;min-width:0}
      .tech-news-evidence strong{color:var(--foreground);font-weight:600}
      .tech-news-evidence span{font-weight:400}
      .tech-news-evidence.official{border-color:var(--border-strong);background:var(--primary-soft)}
      .tech-news-evidence.conflicting{border-color:var(--border-strong);background:var(--warning-soft);color:var(--warning)}

      /* Media fallback: a compact branded strip (source initials + a category
         icon), never a fixed-height blank/solid rectangle. This pipeline's
         stories never carry a real provider image today, so this is what
         renders on every card that has a media region; a real photo (when
         one exists) replaces it and gets an aspect-ratio box instead. */
      .tech-news-media-fallback{
        display:flex;align-items:center;gap:10px;min-height:0;padding:10px 12px;
        border-radius:var(--radius-card);border:1px solid var(--border);
        background:var(--surface-muted);color:var(--foreground-muted);
      }
      .tech-news-media-fallback-icon{flex:0 0 auto;color:var(--accent)}
      .tech-news-media-fallback-initials{font-family:var(--font-data);font-size:12px;font-weight:700;letter-spacing:.04em;color:var(--foreground-secondary)}
      .tech-news-card-media.has-image{position:relative;aspect-ratio:16/9;border-radius:var(--radius-card);overflow:hidden;background:var(--surface-muted)}
      .tech-news-card-media.has-image img{width:100%;height:100%;object-fit:cover;display:block}

      .tech-news-card{display:grid;grid-template-rows:auto auto 1fr auto;gap:12px;min-width:0;min-height:100%;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);padding:16px;box-shadow:var(--shadow-card);color:var(--foreground);overflow:hidden}
      .tech-news-card:hover{border-color:var(--border-strong);box-shadow:var(--shadow-md)}
      .tech-news-card-lead{grid-template-rows:auto auto 1fr auto}
      .tech-news-card-compact{grid-template-columns:minmax(0,1fr);padding:14px}
      .tech-news-card-body{display:grid;gap:10px;align-content:start;min-width:0}
      .tech-news-card-top{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0}
      .tech-news-card-kicker{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
      .tech-news-source-badge{display:inline-flex;align-items:center;max-width:180px;min-height:28px;padding:0 10px;border-radius:var(--radius-pill);background:var(--success-soft);color:var(--success);border:1px solid var(--border);font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .tech-news-date-meta{display:inline-flex;align-items:center;gap:5px;color:var(--foreground-muted);font-size:12px;font-weight:400}
      .tech-news-symbol-chip{min-height:30px;display:inline-flex;align-items:center;border-radius:var(--radius-pill);background:var(--info-soft);color:var(--info);border:1px solid var(--border);padding:0 10px;font-size:12px;font-weight:600;white-space:nowrap}
      .tech-news-title-stack{display:grid;gap:8px;min-width:0}
      .tech-news-title-stack h2,.tech-news-card h2{margin:0;color:var(--foreground);font-size:clamp(15px,1.3vw,18px);font-weight:600;line-height:1.45;letter-spacing:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .tech-news-card-lead h2{font-size:clamp(21px,2.2vw,28px);line-height:1.24;-webkit-line-clamp:3}
      .tech-news-card-secondary h2{font-size:clamp(14px,1.1vw,16px);-webkit-line-clamp:2}
      .tech-news-card p{margin:0;color:var(--foreground-secondary);font-size:13.5px;font-weight:400;line-height:1.68;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .tech-news-card-lead p{-webkit-line-clamp:3;font-size:14.5px}
      .tech-news-translation-toggle,.tech-news-translation-badge{width:max-content;max-width:100%;min-height:40px;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface-muted);color:var(--foreground-muted);padding:0 10px;font-family:var(--font-ui);font-size:12px;font-weight:600}
      .tech-news-translation-toggle{cursor:pointer}
      .tech-news-translation-toggle:hover,.tech-news-translation-toggle:focus-visible{outline:none;border-color:var(--accent);color:var(--primary)}
      .tech-news-translation-badge.translated{border-color:var(--border);background:var(--info-soft);color:var(--info)}
      .tech-news-context-row{display:flex;flex-wrap:wrap;gap:7px}
      .tech-news-context-row span{display:inline-flex;align-items:center;min-height:26px;padding:0 9px;border:1px solid var(--border);background:var(--surface-muted);color:var(--foreground-muted);border-radius:var(--radius-pill);font-size:12px;font-weight:400}
      .tech-news-stock-context{display:flex;justify-content:space-between;align-items:center;gap:12px;border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--radius-card);padding:12px;min-width:0}
      .tech-news-stock-context > div:first-child{display:grid;gap:3px;min-width:0}
      .tech-news-stock-context small{color:var(--foreground-muted);font-size:12px;font-weight:600}
      .tech-news-stock-context strong{color:var(--foreground);font-size:15px;font-weight:600;letter-spacing:.02em}
      .tech-news-price-stack{display:grid;justify-items:end;gap:5px;min-width:0}
      .tech-news-price-stack b{color:var(--foreground);font-size:14px;font-weight:600;white-space:nowrap}
      .tech-news-price-stack.unavailable b{color:var(--foreground-muted);font-size:12px;white-space:normal;text-align:end}
      .tech-news-change{display:inline-flex;align-items:center;gap:5px;border-radius:var(--radius-pill);padding:5px 8px;font-size:12px;font-weight:600}
      .tech-news-change.up{background:var(--success-soft);color:var(--market-positive)}
      .tech-news-change.down{background:var(--danger-soft);color:var(--danger)}
      .tech-news-change.neutral{background:var(--surface-muted);color:var(--foreground-secondary)}
      .tech-news-card-footer{display:flex;justify-content:space-between;align-items:center;gap:12px;border-top:1px solid var(--border);padding-top:12px;min-width:0}
      .tech-news-quote-note{color:var(--foreground-muted);font-size:12px;font-weight:400}
      .tech-news-read-link{min-height:42px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid transparent;border-radius:var(--radius-pill);background:var(--primary);color:var(--primary-foreground);padding:0 15px;font-size:12.5px;font-weight:600;text-decoration:none;white-space:nowrap;box-shadow:var(--shadow-card)}
      .tech-news-read-link:hover,.tech-news-read-link:focus-visible{outline:none;box-shadow:var(--focus-shadow)}
      .tech-news-read-link.disabled{background:var(--surface-muted);border-color:var(--border);color:var(--foreground-muted);box-shadow:none}

      .tech-news-layout{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:22px;align-items:start}
      .tech-news-content-column{display:grid;gap:14px;min-width:0}
      .tech-news-feed{display:grid;gap:14px}
      .tech-news-feed.grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      @media(min-width:1500px){.tech-news-feed.grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
      .tech-news-feed.list{grid-template-columns:1fr}

      .tech-news-side-panel{position:sticky;top:calc(var(--global-header-height) + 1rem);display:grid;gap:14px;min-width:0}
      .tech-side-card{display:grid;gap:12px;border:1px solid var(--border);background:var(--surface);border-radius:var(--radius-panel);padding:15px;box-shadow:var(--shadow-card);min-width:0}
      .tech-side-card summary{list-style:none;margin:0;display:flex;align-items:center;gap:8px;color:var(--foreground);font-size:15px;font-weight:600;cursor:pointer}
      .tech-side-card summary::-webkit-details-marker{display:none}
      .tech-side-card summary svg{color:var(--accent);flex:0 0 auto}
      .tech-side-card summary:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px}
      .tech-side-card[open] summary{margin-bottom:2px}
      .tech-side-card h3{margin:0;display:flex;align-items:center;gap:8px;color:var(--foreground);font-size:15px;font-weight:600}
      .tech-side-card h3 svg{color:var(--accent)}
      .tech-side-list{display:grid;gap:9px}
      .tech-side-list a,.tech-side-news-item{display:grid;gap:5px;text-decoration:none;color:inherit;border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--radius-control);padding:10px}
      .tech-side-list a:hover,.tech-side-list a:focus-visible{outline:none;border-color:var(--accent);background:var(--accent-soft)}
      .tech-side-list strong{color:var(--foreground);font-size:12.5px;font-weight:600;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .tech-side-list small{display:inline-flex;align-items:center;gap:5px;color:var(--foreground-muted);font-size:12px;font-weight:400}
      .tech-side-source{width:max-content;max-width:100%;border:1px solid var(--border);background:var(--success-soft);color:var(--success);border-radius:var(--radius-pill);padding:4px 8px;font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .tech-side-ranked-list{list-style:none;margin:0;padding:0;display:grid;gap:9px}
      .tech-side-ranked-list li{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:9px;border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--radius-control);padding:10px}
      .tech-side-rank{width:30px;height:30px;display:grid;place-items:center;border-radius:var(--radius-control);background:var(--primary-soft);color:var(--info);font-size:12px;font-weight:600}
      .tech-side-ranked-list div{display:grid;gap:2px;min-width:0}
      .tech-side-ranked-list b{color:var(--foreground);font-size:14px;font-weight:600}
      .tech-side-ranked-list small{color:var(--foreground-muted);font-size:12px;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .tech-side-ranked-list em{font-style:normal;border:1px solid var(--border);background:var(--success-soft);color:var(--success);border-radius:var(--radius-pill);padding:6px 8px;font-size:12px;font-weight:600;white-space:nowrap}
      .tech-side-source-list{display:grid;gap:8px}
      .tech-side-source-list span{display:flex;justify-content:space-between;align-items:center;gap:10px;min-width:0;border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--radius-control);padding:10px}
      .tech-side-source-list b{min-width:0;color:var(--foreground);font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .tech-side-source-list small{color:var(--foreground-muted);font-size:12px;font-weight:600;white-space:nowrap}
      .tech-source-note{display:grid;gap:7px;color:var(--foreground-muted);font-size:12px;font-weight:400;line-height:1.65}

      .tech-news-read-link:focus-visible,.tech-side-list a:focus-visible,.tech-news-translation-toggle:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px;box-shadow:var(--focus-shadow)}

      @media(max-width:1280px){
        .tech-news-layout{grid-template-columns:1fr}
        .tech-news-side-panel{position:static;grid-template-columns:repeat(3,minmax(0,1fr))}
      }
      @media(max-width:1024px){
        .tech-news-featured-grid{grid-template-columns:1fr}
        .tech-news-featured-side{grid-template-columns:repeat(2,minmax(0,1fr))}
        .tech-news-side-panel{grid-template-columns:1fr}
      }
      @media(max-width:760px){
        .tech-news-featured-side{grid-template-columns:1fr}
        .tech-news-feed.grid{grid-template-columns:1fr}
        .tech-news-card-footer{display:grid}
        .tech-news-read-link{width:100%}
        .tech-news-stock-context{display:grid}
        .tech-news-price-stack{justify-items:start}
      }
      @media(prefers-reduced-motion:reduce){
        .tech-news-card{transition:none}
      }
    `}</style>
  );
}

export default TechNewsCardStyles;
