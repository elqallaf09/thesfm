'use client';

export function CharityStyles() {
  return (
    <>
      <style jsx>{`
      .charity-projects-page{min-height:100vh;background:var(--sfm-page-gradient);color:var(--sfm-deep-navy);font-family:Tajawal,Arial,sans-serif;overflow-x:hidden}
      .charity-projects-content{display:grid;gap:26px;width:100%;max-width:1440px;margin-inline:auto;min-width:0}
      .charity-projects-content > *,.summary-grid > *,.main-grid > *,.split-grid > *,.template-grid > *,.project-grid > *,.calendar-grid > *,.reminder-grid > *,.impact-layout > *,.impact-summary-grid > *{min-width:0}
      .cp-hero{position:relative;width:100%;max-width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:24px;border-radius:30px;padding:clamp(24px,3vw,38px);background:radial-gradient(circle at 18% 20%,rgba(24,212,212,.34),transparent 30%),radial-gradient(circle at 84% 8%,rgba(167,243,240,.16),transparent 24%),linear-gradient(135deg,var(--sfm-deep-navy),var(--sfm-primary-dark) 58%,var(--sfm-card-dark) 140%);color:var(--sfm-card);border:1px solid rgba(167,243,240,.18);box-shadow:0 22px 56px rgba(3,18,37,.22);overflow:hidden}
      .cp-hero:after{content:"";position:absolute;inset:auto 24px 0 auto;width:230px;height:120px;border:1px solid rgba(167,243,240,.18);border-bottom:0;border-radius:120px 120px 0 0;opacity:.42;pointer-events:none}
      .cp-hero > div{position:relative;z-index:1}.cp-hero > div:first-child{min-width:0}.cp-hero span{display:inline-flex;width:max-content;max-width:100%;align-items:center;gap:8px;border:1px solid rgba(167,243,240,.2);background:rgba(167,243,240,.1);color:var(--sfm-soft-cyan);border-radius:999px;padding:7px 11px;font-size:12.5px;font-weight:950;line-height:1.2}.cp-hero h1{margin:12px 0 10px;font-size:clamp(34px,3.4vw,48px);line-height:1.12;font-weight:950;letter-spacing:0}.cp-hero p{max-width:820px;margin:0;color:rgba(234,246,255,.84);font-size:16.5px;line-height:1.85}.hero-actions{display:flex;gap:10px;align-items:center;justify-content:flex-end;flex-wrap:wrap;max-width:min(100%,560px)}
      button,a{font-family:inherit}.gold-btn,.dark-btn,.ghost-btn,.mini-gold,.primary-wide{border:0;border-radius:14px;min-height:44px;padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:850;cursor:pointer;text-decoration:none;line-height:1.2;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease,background .18s ease}.gold-btn,.mini-gold,.primary-wide{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#031225;box-shadow:0 14px 30px rgba(29,140,255,.22)}.gold-btn{min-height:50px;padding-inline:20px;border-radius:16px;font-size:14px}.dark-btn{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);color:var(--sfm-card);backdrop-filter:blur(10px)}.ghost-btn{background:var(--sfm-card);border:1px solid rgba(29,140,255,.22);color:var(--sfm-midnight)}.mini-gold{min-height:44px;font-size:13px;white-space:normal;text-align:center}.gold-btn:hover,.dark-btn:hover,.ghost-btn:hover,.mini-gold:hover,.primary-wide:hover,.gold-btn:focus-visible,.dark-btn:focus-visible,.ghost-btn:focus-visible,.mini-gold:focus-visible,.primary-wide:focus-visible{transform:translateY(-1px);box-shadow:0 18px 38px rgba(3,18,37,.16),0 0 0 3px rgba(24,212,212,.16);outline:none}
      .notice{border:1px solid rgba(29,140,255,.2);background:linear-gradient(135deg,rgba(255,255,255,.86),rgba(234,246,255,.72));color:var(--sfm-primary-hover);border-radius:16px;padding:13px 15px;font-weight:850;box-shadow:0 10px 24px rgba(3,18,37,.05)}.warm-card{background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(248,251,255,.88));border:1px solid rgba(29,140,255,.13);border-radius:24px;padding:clamp(18px,2vw,24px);box-shadow:0 14px 36px rgba(3,18,37,.07)}
      .summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}.summary-card{position:relative;display:grid;align-content:start;gap:10px;min-height:132px;overflow:hidden}.summary-card:before{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:linear-gradient(90deg,var(--sfm-primary),var(--sfm-accent));opacity:.85}.summary-card span{width:46px;height:46px;border-radius:16px;background:linear-gradient(135deg,rgba(29,140,255,.12),rgba(24,212,212,.11));color:var(--sfm-primary);display:grid;place-items:center;border:1px solid rgba(29,140,255,.12)}.summary-card small,.section-head small{color:#6B5A46;font-weight:900;font-size:13px;line-height:1.45}.summary-card strong{font-size:clamp(22px,2vw,28px);line-height:1.2;color:var(--sfm-midnight);overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
      .main-grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(280px,1fr);gap:18px}.main-grid > #zakat-calculator,.main-grid > #zakat-calculator + .span-5{display:none}.zakat-shortcut-card{align-self:start}.zakat-shortcut-card .primary-wide{margin-top:14px}.span-7,.span-5{grid-column:auto}.split-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px}.section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px;min-width:0}.section-head > div{min-width:0}.section-head h2{margin:0;color:var(--sfm-midnight);font-size:clamp(21px,2vw,25px);line-height:1.32;font-weight:950}.section-head p{max-width:820px;margin:6px 0 0;color:var(--sfm-muted-readable);line-height:1.75}.section-head svg{color:var(--sfm-primary);flex:0 0 auto}
      .form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.form-grid.one{grid-template-columns:1fr}.form-grid label,.impact-input,.currency-field{display:grid;gap:7px;color:var(--sfm-midnight);font-size:13px;font-weight:800;min-width:0}.form-grid input,.form-grid select,.form-grid textarea,.impact-input input{width:100%;border:1px solid rgba(29,140,255,.18);border-radius:13px;background:var(--sfm-background);color:var(--sfm-deep-navy);min-height:46px;padding:0 12px;outline:none}.form-grid textarea{min-height:92px;padding-top:12px;resize:vertical}.form-grid input:focus,.form-grid select:focus,.form-grid textarea:focus,.impact-input input:focus{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.15);background:var(--sfm-card)}.wide{grid-column:1/-1}.check-row{display:flex!important;align-items:center;gap:9px}.check-row input{width:18px!important;min-height:18px!important}.primary-wide{width:100%}
      .zakat-premium-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr) minmax(280px,.82fr);gap:14px;align-items:start}.zakat-panel{display:grid;gap:14px;border:1px solid rgba(29,140,255,.14);background:var(--sfm-light-card);border-radius:20px;padding:16px;min-width:0}.zakat-panel h3,.zakat-history h3{margin:0;color:var(--sfm-midnight);font-size:17px}.asset-input-box,.non-zakat-box,.manual-price-box,.hawl-mini-list{border:1px solid rgba(29,140,255,.13);background:var(--sfm-card);border-radius:16px;padding:13px;display:grid;gap:10px;min-width:0}.asset-input-box strong,.non-zakat-box strong,.hawl-mini-list strong{color:var(--sfm-midnight)}.non-zakat-box p,.manual-price-box p{margin:0;color:var(--sfm-muted);line-height:1.7;font-size:13px}.chip-grid{display:flex;flex-wrap:wrap;gap:8px}.chip{border:1px solid rgba(29,140,255,.2);background:var(--sfm-light-card);color:var(--sfm-midnight);border-radius:999px;min-height:36px;padding:0 12px;font-weight:900;cursor:pointer}.chip.active{background:var(--sfm-midnight);color:var(--sfm-card);border-color:var(--sfm-midnight)}.other-asset-input{display:grid;gap:7px;color:var(--sfm-midnight);font-weight:800}.other-asset-input input{width:100%;border:1px solid rgba(29,140,255,.18);border-radius:13px;background:var(--sfm-background);color:var(--sfm-deep-navy);min-height:44px;padding:0 12px;outline:none}.price-status-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.price-card{background:var(--sfm-midnight);border:1px solid rgba(167,243,240,.18);border-radius:16px;padding:14px;color:var(--sfm-card);min-width:0}.price-card small,.price-card span{display:block;color:var(--sfm-soft-cyan);font-weight:800}.price-card strong{display:block;margin:5px 0;color:var(--sfm-card);font-size:20px;overflow-wrap:anywhere}.price-meta{display:flex;flex-wrap:wrap;gap:8px;color:var(--sfm-primary-hover);font-size:12px;font-weight:900}.price-meta span{border-radius:999px;background:rgba(29,140,255,.10);padding:6px 10px}.zakat-outcome{margin:0;border-radius:15px;background:#ECFDF5;color:#047857;padding:12px;font-weight:900;line-height:1.7}.guidance-list{display:grid;gap:8px}.guidance-list p{margin:0;display:flex;gap:8px;align-items:flex-start;border-radius:14px;background:var(--sfm-card);border:1px solid rgba(29,140,255,.12);padding:10px;color:var(--sfm-midnight);line-height:1.6}.guidance-list svg{color:var(--sfm-primary);flex:0 0 auto;margin-top:2px}.hawl-mini-list div{display:grid;gap:2px;border-radius:12px;background:var(--sfm-light-card);padding:9px}.hawl-mini-list b{color:var(--sfm-midnight)}.hawl-mini-list small,.hawl-mini-list span{color:var(--sfm-muted)}.zakat-history{margin-top:14px;border-top:1px solid rgba(29,140,255,.14);padding-top:14px}.history-row{display:grid;grid-template-columns:1fr 1fr 1fr 1fr .7fr auto;gap:8px;align-items:center;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:14px;padding:10px;margin-top:8px;min-width:0}.history-row span,.history-row small,.history-row strong{min-width:0;overflow-wrap:anywhere;color:var(--sfm-midnight)}.history-row small{color:var(--sfm-primary-hover)}.history-row button{border:1px solid rgba(121,31,31,.14);background:#FEF2F2;color:#B91C1C;border-radius:10px;min-height:34px;padding:0 10px;font-weight:900;cursor:pointer}
      .result-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:0}.result-grid div,.big-metric{background:rgba(29,140,255,.10);border:1px solid rgba(29,140,255,.14);border-radius:16px;padding:14px}.result-grid small,.big-metric span{display:block;color:var(--sfm-primary-hover);font-weight:800}.result-grid strong,.big-metric strong{display:block;margin-top:5px;color:var(--sfm-midnight);font-size:24px;overflow-wrap:anywhere}.disclaimer,.nisab,.muted{margin:12px 0 0;color:var(--sfm-muted);line-height:1.8}.nisab{display:flex;gap:8px;align-items:flex-start;color:var(--sfm-primary-hover);background:var(--sfm-light-card);border-radius:13px;padding:10px}
      .nisab-reached{background:#ECFDF5!important}.nisab-reached small,.nisab-reached strong{color:#047857!important}.nisab-missing{background:rgba(29,140,255,.10)!important}.metals-status{display:grid;grid-template-columns:minmax(0,1.4fr) repeat(4,minmax(0,1fr)) auto;gap:10px;align-items:stretch;margin-top:14px;border:1px solid rgba(29,140,255,.14);background:var(--sfm-light-card);border-radius:18px;padding:12px}.metals-status div{min-width:0}.metals-status strong,.metals-status b,.metals-status span,.metals-status small{display:block}.metals-status strong,.metals-status b{color:var(--sfm-midnight);overflow-wrap:anywhere}.metals-status span,.metals-status small{color:var(--sfm-primary-hover);font-size:12px;line-height:1.5}.metals-status button{border:0;border-radius:12px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:var(--sfm-deep-navy);padding:0 12px;font:900 12px Tajawal,Arial,sans-serif;cursor:pointer}.metals-status button:disabled{opacity:.65;cursor:wait}
      .template-grid,.project-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.template-card{text-align:start;border:1px solid rgba(29,140,255,.16);background:#FDF8EE;border-radius:16px;padding:14px;cursor:pointer}.template-card:hover{background:rgba(29,140,255,.10)}.template-card strong,.template-card span{display:block}.template-card span{margin-top:5px;color:#8A6A55}
      .project-card{border:1px solid rgba(29,140,255,.13);border-radius:20px;background:linear-gradient(180deg,var(--sfm-card),var(--sfm-light-card));padding:16px;display:grid;gap:13px;box-shadow:0 10px 26px rgba(3,18,37,.05)}.project-top{display:flex;justify-content:space-between;gap:12px;min-width:0}.project-top strong{display:block;color:var(--sfm-midnight);font-size:17px;line-height:1.4;overflow-wrap:anywhere}.project-top span,.badge-row span,.project-card p{color:var(--sfm-muted-readable);font-size:12px;overflow-wrap:anywhere}.status,.badge-row span{border-radius:999px;padding:5px 9px;background:rgba(29,140,255,.10);color:var(--sfm-primary-hover);font-size:11px;font-weight:900}.badge-row{display:flex;gap:8px;flex-wrap:wrap}.progress{height:9px;border-radius:99px;background:#E7EEF7;overflow:hidden}.progress i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--sfm-primary),var(--sfm-accent))}.money-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.money-row div{background:rgba(255,255,255,.7);border:1px solid rgba(29,140,255,.10);border-radius:13px;padding:10px;min-width:0}.money-row small{display:block;color:#6B5A46;font-weight:900}.money-row strong{display:block;color:var(--sfm-midnight);font-size:13px;overflow-wrap:anywhere}.card-actions{display:flex;gap:8px;flex-wrap:wrap}.card-actions button{border:1px solid rgba(29,140,255,.16);background:var(--sfm-light-card);color:var(--sfm-midnight);border-radius:11px;min-height:38px;padding:0 10px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-weight:850;font-size:12px}.card-actions button:hover,.card-actions button:focus-visible,.doc-count-btn:hover,.doc-count-btn:focus-visible{border-color:rgba(24,212,212,.38);box-shadow:0 0 0 3px rgba(24,212,212,.14);outline:none}.doc-count-btn{justify-self:start;border:1px solid rgba(29,140,255,.16);background:var(--sfm-light-card);color:var(--sfm-primary-hover);border-radius:999px;min-height:34px;padding:0 12px;font-weight:900;cursor:pointer}
      .vault-head{align-items:flex-start}.vault-head p{margin:5px 0 0;color:var(--sfm-muted);line-height:1.7}.document-tools{display:grid;grid-template-columns:minmax(0,1fr) minmax(190px,260px) minmax(190px,260px);gap:10px;margin-bottom:14px}.document-tools label{display:flex;align-items:center;gap:8px;border:1px solid rgba(29,140,255,.18);background:var(--sfm-background);border-radius:14px;padding:0 12px;min-height:46px;color:var(--sfm-primary)}.document-tools input,.document-tools select{width:100%;border:0;background:transparent;color:var(--sfm-deep-navy);outline:none;font:800 13px Tajawal,Arial,sans-serif}.document-tools select{border:1px solid rgba(29,140,255,.18);background:var(--sfm-background);border-radius:14px;padding:0 12px;min-height:46px}.document-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.document-card{display:grid;grid-template-columns:42px minmax(0,1fr);gap:12px;border:1px solid rgba(29,140,255,.14);background:var(--sfm-card);border-radius:18px;padding:14px;min-width:0}.document-icon{width:42px;height:42px;border-radius:14px;background:rgba(29,140,255,.10);color:var(--sfm-primary);display:grid;place-items:center}.document-body{display:grid;gap:5px;min-width:0}.document-body strong{color:var(--sfm-midnight);overflow-wrap:anywhere}.document-body span{justify-self:start;border-radius:999px;background:var(--sfm-light-card);color:var(--sfm-primary-hover);padding:4px 9px;font-size:11px;font-weight:900}.document-body small,.document-body em,.document-body p{color:var(--sfm-muted);font-size:12px;line-height:1.6;overflow-wrap:anywhere}.document-body em{font-style:normal;color:var(--sfm-midnight)}.document-actions{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap}.document-actions button{border:1px solid rgba(29,140,255,.16);background:var(--sfm-light-card);color:var(--sfm-midnight);border-radius:11px;min-height:36px;padding:0 10px;cursor:pointer;font-weight:900}.document-actions button:last-child{background:#FEF2F2;color:#B91C1C;border-color:rgba(121,31,31,.14)}.empty-state.compact{padding:24px 12px}.file-chip{display:flex;align-items:center;gap:8px;border:1px solid rgba(29,140,255,.16);background:rgba(29,140,255,.10);border-radius:14px;padding:10px;color:var(--sfm-midnight);min-width:0}.file-chip span{font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.file-chip small{color:var(--sfm-primary-hover);margin-inline-start:auto}.file-chip button{width:30px;height:30px;border-radius:10px;border:1px solid rgba(29,140,255,.18);background:var(--sfm-card);display:grid;place-items:center;cursor:pointer}
      .beneficiary-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}.beneficiary-stats div{border:1px solid rgba(29,140,255,.14);background:#FDF8EE;border-radius:16px;padding:12px}.beneficiary-stats small,.details-list b{display:block;color:var(--sfm-primary-hover);font-weight:900}.beneficiary-stats strong{display:block;margin-top:4px;color:var(--sfm-midnight);font-size:18px}.beneficiary-grid,.contributor-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.beneficiary-card,.contributor-card{border:1px solid rgba(29,140,255,.14);background:var(--sfm-card);border-radius:18px;padding:14px;display:grid;gap:12px}.privacy-note{margin:0;border:1px solid rgba(29,140,255,.14);background:var(--sfm-light-card);border-radius:13px;padding:10px;color:var(--sfm-primary-hover);line-height:1.7}.details-list{display:grid;gap:9px}.details-list p{margin:0;border:1px solid rgba(29,140,255,.12);background:#FDF8EE;border-radius:12px;padding:10px}.details-list span{display:block;color:var(--sfm-midnight);margin-top:3px;overflow-wrap:anywhere}.collab-strip{display:flex;flex-wrap:wrap;gap:8px}.collab-strip span{border-radius:999px;background:#FDF8EE;border:1px solid rgba(29,140,255,.14);color:var(--sfm-primary-hover);padding:6px 10px;font-size:12px;font-weight:900}
      .organization-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.organization-card{border:1px solid rgba(29,140,255,.14);background:var(--sfm-card);border-radius:18px;padding:15px;display:grid;gap:12px;min-width:0}.organization-top{display:flex;justify-content:space-between;gap:12px;min-width:0}.organization-top strong{display:block;color:var(--sfm-midnight);font-size:17px;overflow-wrap:anywhere}.organization-top span,.org-contact span,.org-contact small{display:block;color:var(--sfm-muted);font-size:12px;line-height:1.6;overflow-wrap:anywhere}.verify-badge{align-self:start;border-radius:999px;padding:5px 9px;font-size:11px;white-space:nowrap;background:rgba(29,140,255,.10);color:var(--sfm-primary-hover)}.verify-badge.verified{background:#ECFDF5;color:#047857}.verify-badge.pending_review{background:#E6F1FB;color:#0C447C}.verify-badge.rejected{background:#FEF2F2;color:#B91C1C}.trust-box{border:1px solid rgba(29,140,255,.12);background:#FDF8EE;border-radius:14px;padding:11px;display:grid;gap:8px}.trust-box strong{color:var(--sfm-midnight)}.trust-box p{margin:0;color:var(--sfm-muted)}.trust-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.trust-grid span{border-radius:12px;background:var(--sfm-card);color:var(--sfm-primary-hover);padding:8px;font-size:12px;font-weight:900}.org-contact{display:grid;gap:4px}.org-contact a{color:#0C447C;overflow-wrap:anywhere}.org-strip{display:flex;align-items:center;gap:8px;flex-wrap:wrap;border:1px solid rgba(29,140,255,.12);background:#FDF8EE;border-radius:14px;padding:9px;color:var(--sfm-midnight)}.org-strip span,.org-strip small{color:var(--sfm-muted);font-size:12px}.org-strip b{font-size:11px}
      .impact-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:16px}.impact-summary-grid div,.impact-panel{border:1px solid rgba(29,140,255,.13);background:linear-gradient(180deg,rgba(255,255,255,.82),rgba(234,246,255,.62));border-radius:19px;padding:16px;min-width:0;box-shadow:0 10px 24px rgba(3,18,37,.045)}.impact-summary-grid small,.ratio-grid small{display:block;color:var(--sfm-primary-hover);font-weight:900;line-height:1.45}.impact-summary-grid strong,.ratio-grid strong{display:block;color:var(--sfm-midnight);font-size:clamp(18px,1.7vw,22px);line-height:1.25;margin-top:5px;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}.impact-layout{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:14px}.impact-panel h3{margin:0 0 12px;color:var(--sfm-midnight);font-size:18px;line-height:1.35;font-weight:950}.ratio-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ratio-grid div{border-radius:14px;background:var(--sfm-card);padding:12px;border:1px solid rgba(29,140,255,.1)}.ratio-grid p{grid-column:1/-1;margin:0;color:var(--sfm-primary-hover)}.impact-bars{display:grid;gap:10px}.impact-bar-row{display:grid;grid-template-columns:minmax(74px,.7fr) minmax(0,1fr) minmax(100px,.7fr);gap:10px;align-items:center}.impact-bar-row span,.impact-bar-row strong{color:var(--sfm-midnight);font-size:13px;line-height:1.45;overflow-wrap:anywhere}.impact-bar-row i{display:block;height:10px;border-radius:99px;background:#E7EEF7;overflow:hidden}.impact-bar-row b{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--sfm-primary),var(--sfm-accent))}.project-impact-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.project-impact-card{display:grid;gap:10px;border:1px solid rgba(29,140,255,.12);background:var(--sfm-card);border-radius:16px;padding:14px}.project-impact-card strong{color:var(--sfm-midnight)}.project-impact-card>span{color:var(--sfm-muted-readable);font-size:13px}.metric-chip-row{display:flex;flex-wrap:wrap;gap:8px}.metric-chip-row span{border-radius:999px;background:var(--sfm-light-card);border:1px solid rgba(29,140,255,.14);color:var(--sfm-primary-hover);padding:6px 10px;font-size:12px;font-weight:900}
      .hijri-calendar{display:grid;gap:18px}.calendar-grid{display:grid;grid-template-columns:minmax(280px,.82fr) minmax(0,1.18fr);gap:18px;align-items:start}.alert-panel,.season-panel{position:relative;border:1px solid rgba(29,140,255,.13);background:linear-gradient(180deg,rgba(255,255,255,.88),rgba(234,246,255,.66));border-radius:20px;padding:18px;display:grid;align-content:start;gap:14px;box-shadow:0 10px 26px rgba(3,18,37,.05);overflow:hidden}.alert-panel:before,.season-panel:before{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:linear-gradient(90deg,var(--sfm-primary),var(--sfm-accent));opacity:.72}.alert-panel strong,.season-panel strong{color:var(--sfm-midnight);font-size:17px;line-height:1.35;font-weight:950}.alert-panel p{margin:0;color:var(--sfm-muted-readable);font-size:14px;line-height:1.75}.alert-line{border-radius:15px;background:var(--sfm-card);border:1px solid rgba(29,140,255,.12);padding:12px;display:grid;gap:5px}.alert-line b{color:var(--sfm-midnight)}.alert-line span{color:var(--sfm-primary-hover);font-size:13px;line-height:1.5}.season-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.season-grid span{border-radius:15px;background:var(--sfm-card);border:1px solid rgba(29,140,255,.12);padding:13px;display:grid;align-content:start;gap:7px}.season-grid b{color:var(--sfm-midnight);font-size:14px;line-height:1.4}.season-grid small{color:#6B5A46;line-height:1.55;font-size:12px;font-weight:800}.reminder-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.reminder-card{border:1px solid rgba(29,140,255,.14);background:linear-gradient(180deg,var(--sfm-card),var(--sfm-light-card));border-radius:18px;padding:16px;display:grid;gap:12px}.reminder-card.high{border-color:rgba(185,28,28,.22);background:linear-gradient(180deg,#FFF8F8,#FFFFFF)}.reminder-card.low{background:linear-gradient(180deg,#F9FBF6,#FFFFFF)}.reminder-top{display:flex;justify-content:space-between;gap:12px;min-width:0}.reminder-top strong{display:block;color:var(--sfm-midnight);font-size:16px;line-height:1.45;overflow-wrap:anywhere}.reminder-top span,.reminder-card small,.reminder-card p{color:var(--sfm-muted-readable);line-height:1.6}.reminder-top b{align-self:start;border-radius:999px;background:rgba(29,140,255,.10);color:var(--sfm-primary-hover);padding:5px 9px;font-size:11px;white-space:nowrap}
      .empty-state{display:grid;place-items:center;text-align:center;gap:10px;min-height:190px;padding:30px 18px;color:#6B5A46;border:1px dashed rgba(29,140,255,.22);border-radius:20px;background:radial-gradient(circle at 50% 0,rgba(24,212,212,.12),transparent 34%),linear-gradient(135deg,rgba(255,255,255,.82),rgba(234,246,255,.68))}.empty-state.compact{min-height:170px;padding:26px 18px}.empty-state svg{color:var(--sfm-primary);margin-bottom:2px;background:rgba(29,140,255,.09);border:1px solid rgba(29,140,255,.14);border-radius:16px;padding:8px;box-sizing:content-box}.empty-state strong{color:var(--sfm-midnight);font-size:18px;line-height:1.45;font-weight:950}.empty-state p{max-width:560px;margin:0;color:var(--sfm-muted-readable);font-size:14px;line-height:1.75}.empty-state .mini-gold{justify-self:center}.impact-lines{display:grid;gap:9px}.impact-lines p{margin:0;border-radius:13px;background:var(--sfm-background);padding:10px;color:var(--sfm-midnight)}.impact-lines .warn{background:rgba(29,140,255,.10);color:var(--sfm-primary-hover)}.report-card{display:grid;grid-template-columns:minmax(0,1fr) 110px auto auto;gap:10px;align-items:end;border:1px solid rgba(29,140,255,.16);border-radius:18px;background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(24,212,212,.06));padding:14px;margin-bottom:12px}.report-card strong,.report-card span{display:block}.report-card strong{color:var(--sfm-midnight)}.report-card span{margin-top:4px;color:var(--sfm-primary-hover);font-size:12px}.report-card select{height:42px;border:1px solid rgba(29,140,255,.25);border-radius:12px;background:var(--sfm-card);color:var(--sfm-midnight);padding:0 10px;font:800 13px Tajawal,Arial,sans-serif}.report-card button{height:42px;border:0;border-radius:12px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:var(--sfm-deep-navy);padding:0 14px;display:inline-flex;align-items:center;justify-content:center;gap:7px;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap}.report-card button:disabled{opacity:.65;cursor:wait}.future-list{display:grid;gap:9px}.future-list span{display:flex;justify-content:space-between;gap:8px;border:1px solid rgba(29,140,255,.12);border-radius:12px;padding:10px;color:var(--sfm-midnight)}.future-list b{color:var(--sfm-primary)}
      .modal-backdrop{position:fixed;inset:0;z-index:90;background:rgba(3,18,37,.46);display:grid;place-items:center;padding:18px}.modal{width:min(760px,100%);max-height:92dvh;overflow:auto;background:var(--sfm-card);border:1px solid rgba(29,140,255,.18);border-radius:24px;padding:20px}.modal.small{width:min(420px,100%)}.modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}.modal-head h2{margin:0}.modal-head button{width:40px;height:40px;border-radius:12px;border:1px solid rgba(29,140,255,.18);background:var(--sfm-background);display:grid;place-items:center;cursor:pointer}.modal-actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:10px;margin-top:4px}
      .dark .charity-projects-page{background:var(--sfm-page-gradient);color:var(--sfm-foreground)}
      .dark .cp-hero{background:radial-gradient(circle at 18% 20%,rgba(24,212,212,.18),transparent 30%),radial-gradient(circle at 86% 10%,rgba(29,140,255,.16),transparent 26%),linear-gradient(135deg,#061A2E,#081D34 58%,#102F52 145%);border-color:rgba(167,243,240,.14);box-shadow:0 22px 58px rgba(0,0,0,.34)}
      .dark .warm-card,.dark .summary-card,.dark .project-card,.dark .reminder-card,.dark .alert-panel,.dark .season-panel,.dark .impact-panel,.dark .impact-summary-grid div,.dark .modal{background:linear-gradient(180deg,rgba(16,47,82,.94),rgba(11,42,74,.86));border-color:rgba(167,243,240,.12);box-shadow:0 18px 42px rgba(0,0,0,.28)}
      .dark .summary-card:before,.dark .alert-panel:before,.dark .season-panel:before{opacity:.95}
      .dark .summary-card strong,.dark .section-head h2,.dark .project-top strong,.dark .project-impact-card strong,.dark .impact-panel h3,.dark .alert-panel strong,.dark .season-panel strong,.dark .reminder-top strong,.dark .season-grid b,.dark .alert-line b,.dark .empty-state strong,.dark .report-card strong,.dark .money-row strong,.dark .ratio-grid strong,.dark .impact-summary-grid strong,.dark .impact-bar-row span,.dark .impact-bar-row strong{color:var(--sfm-heading)}
      .dark .summary-card small,.dark .section-head small,.dark .money-row small,.dark .season-grid small{color:#A7F3F0}
      .dark .section-head p,.dark .project-card p,.dark .project-top span,.dark .reminder-top span,.dark .reminder-card small,.dark .reminder-card p,.dark .empty-state p,.dark .alert-panel p,.dark .badge-row span,.dark .project-impact-card>span{color:var(--sfm-body)}
      .dark .summary-card span,.dark .empty-state svg{background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.20);color:#A7F3F0}
      .dark .alert-line,.dark .season-grid span,.dark .project-impact-card,.dark .ratio-grid div,.dark .money-row div,.dark .form-grid input,.dark .form-grid select,.dark .form-grid textarea,.dark .impact-input input,.dark .report-card select,.dark .file-chip button{background:#0A1422;border-color:#1D3050;color:var(--sfm-foreground)}
      .dark .empty-state{background:radial-gradient(circle at 50% 0,rgba(47,214,192,.12),transparent 34%),linear-gradient(135deg,rgba(16,47,82,.82),rgba(10,20,34,.82));border-color:rgba(167,243,240,.18);color:var(--sfm-body)}
      .dark .report-card,.dark .notice,.dark .nisab,.dark .privacy-note,.dark .org-strip,.dark .trust-box,.dark .beneficiary-stats div,.dark .details-list p,.dark .collab-strip span{background:rgba(10,20,34,.62);border-color:#1D3050;color:var(--sfm-body)}
      .dark .progress,.dark .impact-bar-row i{background:#1D3050}
      .dark .dark-btn{background:rgba(255,255,255,.08);border-color:rgba(167,243,240,.16)}
      .dark .ghost-btn{background:#0A1422;color:var(--sfm-heading);border-color:#1D3050}
      .dark .modal-backdrop{background:rgba(0,0,0,.62)}
      @media(max-width:1180px){.cp-hero{grid-template-columns:1fr;align-items:start}.hero-actions{justify-content:flex-start;max-width:100%}.main-grid,.split-grid,.calendar-grid,.zakat-premium-grid,.impact-layout{grid-template-columns:1fr}.project-grid,.document-grid,.reminder-grid,.beneficiary-grid,.contributor-grid,.organization-grid,.project-impact-grid{grid-template-columns:1fr}.metals-status{grid-template-columns:repeat(2,minmax(0,1fr))}.metals-status button{min-height:42px}}
      @media(max-width:900px){.charity-projects-content{gap:20px}.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.section-head{display:grid;justify-items:start}.section-head .mini-gold{justify-self:start}.report-card{grid-template-columns:1fr}.report-card button,.report-card select{width:100%}.impact-bar-row{grid-template-columns:1fr;gap:6px}.impact-bar-row strong{justify-self:start}.document-tools,.metals-status,.price-status-grid,.result-grid,.money-row,.beneficiary-stats,.trust-grid,.ratio-grid{grid-template-columns:1fr}}
      @media(max-width:640px){.charity-projects-content{gap:18px}.cp-hero{border-radius:22px;padding:20px}.cp-hero h1{font-size:30px}.hero-actions{display:grid;grid-template-columns:1fr;width:100%}.gold-btn,.dark-btn,.ghost-btn,.mini-gold,.primary-wide{width:100%;min-height:44px}.summary-grid{grid-template-columns:1fr}.summary-card{min-height:auto}.season-grid{grid-template-columns:1fr}.empty-state,.empty-state.compact{min-height:160px;padding:24px 14px}.modal-actions{display:grid}.form-grid{grid-template-columns:1fr}.card-actions,.document-actions{display:grid}.card-actions button,.document-actions button{width:100%;justify-content:center}.reminder-top,.project-top,.organization-top{display:grid}.badge-row{gap:6px}.future-list span{display:grid}.file-chip{display:grid;grid-template-columns:auto minmax(0,1fr) auto}}
    `}</style>
      <style jsx global>{`
        .charity-projects-page,
        .charity-projects-page * {
          box-sizing: border-box;
        }

        .charity-projects-page {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          background:
            radial-gradient(circle at 8% 0%, rgba(47, 214, 192, .12), transparent 28%),
            var(--sfm-page-gradient);
        }

        .charity-projects-page .sfm-dashboard-page-shell {
          min-width: 0;
          overflow-x: hidden;
        }

        @media (min-width: 1025px) {
          .charity-projects-page .sfm-dashboard-page-shell {
            width: auto;
            max-width: none;
            margin-inline-start: var(--sidebar-w);
            margin-inline-end: 0;
            padding-inline: clamp(22px, 2.4vw, 36px);
          }
        }

        .charity-projects-page .sfm-dashboard-page-content.charity-projects-content {
          width: 100%;
          max-inline-size: min(1360px, 100%);
          margin-inline: auto;
          display: grid;
          gap: clamp(18px, 2vw, 28px);
          min-width: 0;
        }

        .charity-projects-page .sfm-dashboard-page-content.charity-projects-content > *,
        .charity-projects-page .warm-card,
        .charity-projects-page .summary-card,
        .charity-projects-page .project-card,
        .charity-projects-page .alert-panel,
        .charity-projects-page .season-panel,
        .charity-projects-page .impact-panel,
        .charity-projects-page .modal {
          max-width: 100%;
          min-width: 0;
        }

        .charity-projects-page .cp-hero {
          align-items: center;
        }

        .charity-projects-page .hero-actions {
          align-content: center;
        }

        .charity-projects-page .summary-grid {
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
        }

        .charity-projects-page .summary-card {
          min-height: 112px;
          grid-template-columns: auto minmax(0, 1fr);
          align-content: center;
          align-items: center;
          column-gap: 12px;
          row-gap: 5px;
          padding: 16px;
        }

        .charity-projects-page .summary-card span {
          grid-row: 1 / span 2;
          width: 42px;
          height: 42px;
          border-radius: 14px;
        }

        .charity-projects-page .summary-card small {
          color: var(--sfm-muted-readable);
          font-size: 12.5px;
          line-height: 1.45;
          white-space: normal;
        }

        .charity-projects-page .summary-card strong {
          font-size: clamp(20px, 1.6vw, 25px);
          line-height: 1.25;
        }

        .charity-projects-page .section-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .charity-projects-page .page-section-tabs.charity-tabs {
          gap: 8px;
          padding: 8px;
          border-radius: 20px;
          scroll-padding-inline: 12px;
          overflow: visible;
        }

        .charity-projects-page .page-section-tabs.charity-tabs button {
          min-height: 42px;
          padding-inline: 14px;
          border-radius: 15px;
          font-size: 12.5px;
        }

        .charity-projects-page .page-section-tabs.charity-tabs b {
          min-width: 22px;
          padding: 3px 6px;
          font-size: 10.5px;
        }

        .charity-projects-page .calendar-grid {
          grid-template-columns: minmax(0, 1.35fr) minmax(280px, .65fr);
          gap: 14px;
        }

        .charity-projects-page .calendar-season-panel,
        .charity-projects-page .calendar-alert-panel {
          min-height: 0;
          padding: 16px;
        }

        .charity-projects-page .season-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .charity-projects-page .season-card {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr);
          gap: 11px;
          align-items: start;
          min-width: 0;
          border-radius: 16px;
          border: 1px solid rgba(29, 140, 255, .12);
          background: var(--sfm-card);
          padding: 13px;
        }

        .charity-projects-page .season-card-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          color: var(--sfm-primary);
          background: linear-gradient(135deg, rgba(29, 140, 255, .10), rgba(24, 212, 212, .09));
          border: 1px solid rgba(29, 140, 255, .12);
        }

        .charity-projects-page .season-card b,
        .charity-projects-page .season-card strong,
        .charity-projects-page .season-card small {
          display: block;
          min-width: 0;
        }

        .charity-projects-page .season-card b {
          font-size: 13.5px;
        }

        .charity-projects-page .season-card strong {
          margin-top: 4px;
          color: var(--sfm-midnight);
          font-size: 15px;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .charity-projects-page .season-card small {
          margin-top: 4px;
        }

        .charity-projects-page .calendar-alert-panel {
          gap: 10px;
        }

        .charity-projects-page .calendar-alert-panel .alert-line {
          padding: 11px;
        }

        .charity-projects-page .sfm-empty-state.charity-empty-state,
        .charity-projects-page .empty-state.compact {
          min-height: 136px !important;
          padding: 18px !important;
          border-radius: 18px !important;
          gap: 8px !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .88), rgba(234, 246, 255, .68)) !important;
        }

        .charity-projects-page .sfm-empty-state.charity-empty-state .sfm-empty-state-icon {
          width: 46px;
          height: 46px;
          border-radius: 15px;
        }

        .charity-projects-page .sfm-empty-state.charity-empty-state strong {
          color: var(--sfm-midnight);
          font-size: 17px;
          line-height: 1.45;
          font-weight: 950;
        }

        .charity-projects-page .sfm-empty-state.charity-empty-state p {
          max-width: 560px;
          color: var(--sfm-muted-readable);
          font-size: 13.5px;
          line-height: 1.7;
        }

        .charity-projects-page .sfm-empty-state-actions {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .charity-projects-page .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 90;
          display: grid;
          place-items: center;
          padding: clamp(12px, 2vw, 24px);
          overflow-y: auto;
          overscroll-behavior: contain;
          background: rgba(3, 18, 37, .58);
          backdrop-filter: blur(12px);
        }

        .charity-projects-page .modal {
          width: min(860px, calc(100vw - 32px));
          max-height: min(90dvh, 860px);
          overflow: auto;
          overflow-x: hidden;
          border-radius: 28px;
          padding: clamp(18px, 2.2vw, 26px);
          border: 1px solid rgba(29, 140, 255, .18);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, .98), rgba(248, 251, 255, .94));
          box-shadow: 0 30px 80px rgba(3, 18, 37, .24);
        }

        .charity-projects-page .modal.small {
          width: min(500px, calc(100vw - 32px));
        }

        .charity-projects-page .modal-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(29, 140, 255, .13);
        }

        .charity-projects-page .modal-head > div {
          display: grid;
          gap: 5px;
          min-width: 0;
        }

        .charity-projects-page .modal-kicker {
          width: max-content;
          max-width: 100%;
          border-radius: 999px;
          padding: 5px 10px;
          background: rgba(29, 140, 255, .09);
          color: var(--sfm-primary-hover);
          font-size: 12px;
          font-weight: 950;
          line-height: 1.2;
        }

        .charity-projects-page .modal-head h2 {
          margin: 0;
          color: var(--sfm-midnight);
          font-size: clamp(22px, 2.1vw, 30px);
          line-height: 1.25;
          font-weight: 950;
        }

        .charity-projects-page .modal-head button {
          flex: 0 0 auto;
          width: 44px;
          height: 44px;
          min-height: 44px;
          border-radius: 14px;
          border: 1px solid rgba(29, 140, 255, .18);
          background: var(--sfm-card);
          color: var(--sfm-midnight);
          display: grid;
          place-items: center;
          cursor: pointer;
        }

        .charity-projects-page .modal .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          width: 100%;
          min-width: 0;
        }

        .charity-projects-page .modal-form-stack {
          display: grid;
          gap: 14px;
        }

        .charity-projects-page .modal .form-section {
          display: grid;
          gap: 12px;
          border: 1px solid rgba(29, 140, 255, .13);
          border-radius: 20px;
          background: rgba(29, 140, 255, .045);
          padding: 14px;
          min-width: 0;
        }

        .charity-projects-page .modal .form-section h3 {
          margin: 0;
          color: var(--sfm-midnight);
          font-size: 15px;
          line-height: 1.4;
          font-weight: 950;
        }

        .charity-projects-page .modal .form-grid label,
        .charity-projects-page .modal .impact-input,
        .charity-projects-page .modal .currency-field {
          width: 100%;
          min-width: 0;
          color: var(--sfm-midnight);
          font-size: 13.5px;
          font-weight: 900;
          text-align: start;
        }

        .charity-projects-page .modal .form-grid input,
        .charity-projects-page .modal .form-grid select,
        .charity-projects-page .modal .form-grid textarea,
        .charity-projects-page .modal .impact-input input {
          width: 100%;
          min-width: 0;
          min-height: 50px;
          border-radius: 15px;
          border: 1.5px solid rgba(29, 140, 255, .19);
          background: rgba(255, 255, 255, .92);
          color: var(--sfm-deep-navy);
          padding-inline: 14px;
          font: 850 14px Tajawal, Arial, sans-serif;
        }

        .charity-projects-page .modal .form-grid textarea {
          min-height: 112px;
          padding-block: 12px;
          line-height: 1.7;
        }

        .charity-projects-page .modal .form-grid input:focus,
        .charity-projects-page .modal .form-grid select:focus,
        .charity-projects-page .modal .form-grid textarea:focus,
        .charity-projects-page .modal .impact-input input:focus,
        .charity-projects-page .modal-head button:focus-visible {
          outline: none;
          border-color: var(--sfm-accent);
          box-shadow: 0 0 0 3px rgba(24, 212, 212, .18);
        }

        .charity-projects-page .modal .check-row {
          display: grid !important;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(29, 140, 255, .13);
          border-radius: 15px;
          padding: 12px 14px;
          background: rgba(29, 140, 255, .06);
        }

        .charity-projects-page .modal .check-row input {
          width: 20px !important;
          height: 20px !important;
          min-height: 20px !important;
          padding: 0;
        }

        .charity-projects-page .modal .privacy-note {
          color: var(--sfm-primary-hover);
          background: rgba(29, 140, 255, .08);
        }

        .charity-projects-page .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding-top: 4px;
        }

        .charity-projects-page .modal-actions button {
          min-width: 138px;
          min-height: 46px;
        }

        .charity-projects-page .empty-state {
          min-height: clamp(160px, 18vw, 210px);
          padding: clamp(22px, 2.4vw, 32px);
        }

        .charity-projects-page .empty-state.compact {
          min-height: 160px;
        }

        .charity-projects-page button:disabled {
          opacity: .62;
          cursor: not-allowed;
          transform: none;
        }

        .charity-projects-page .quick-action-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          align-items: stretch;
        }

        .charity-projects-page .quick-action-grid > #zakat-calculator,
        .charity-projects-page .quick-action-grid > #zakat-calculator + .span-5 {
          display: none !important;
        }

        .charity-projects-page .quick-action-grid > .warm-card,
        .charity-projects-page .project-dashboard,
        .charity-projects-page .report-dashboard,
        .charity-projects-page .overview-impact-card {
          display: grid;
          gap: 16px;
        }

        .charity-projects-page .quick-action-grid .section-head,
        .charity-projects-page .report-option-card .section-head {
          margin-bottom: 0;
        }

        .charity-projects-page .status-metric-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
        }

        .charity-projects-page .status-metric-grid div {
          min-height: 86px;
          border: 1px solid rgba(29, 140, 255, .13);
          border-radius: 16px;
          background: linear-gradient(180deg, rgba(255, 255, 255, .92), rgba(234, 246, 255, .58));
          padding: 13px;
          display: grid;
          align-content: center;
          gap: 4px;
        }

        .charity-projects-page .status-metric-grid small {
          color: var(--sfm-primary-hover);
          font-size: 12px;
          font-weight: 900;
          line-height: 1.45;
        }

        .charity-projects-page .status-metric-grid strong {
          color: var(--sfm-midnight);
          font-size: 22px;
          line-height: 1.2;
          font-weight: 950;
          font-variant-numeric: tabular-nums;
        }

        .charity-projects-page .project-linked-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .charity-projects-page .report-toolbar {
          display: grid;
          grid-template-columns: minmax(180px, 260px) minmax(0, 1fr);
          gap: 12px;
          align-items: end;
          border: 1px solid rgba(29, 140, 255, .13);
          border-radius: 18px;
          background: rgba(29, 140, 255, .06);
          padding: 14px;
        }

        .charity-projects-page .report-toolbar label {
          display: grid;
          gap: 7px;
          color: var(--sfm-midnight);
          font-size: 13px;
          font-weight: 900;
        }

        .charity-projects-page .report-toolbar select {
          min-height: 44px;
          border: 1px solid rgba(29, 140, 255, .2);
          border-radius: 13px;
          background: var(--sfm-card);
          color: var(--sfm-midnight);
          padding-inline: 12px;
          font: 850 13px Tajawal, Arial, sans-serif;
        }

        .charity-projects-page .report-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .charity-projects-page .report-option-card {
          border: 1px solid rgba(29, 140, 255, .13);
          border-radius: 18px;
          background: var(--sfm-card);
          padding: 15px;
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          min-width: 0;
        }

        .charity-projects-page .report-option-card > svg {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          padding: 10px;
          color: var(--sfm-primary);
          background: rgba(29, 140, 255, .10);
          border: 1px solid rgba(29, 140, 255, .12);
          box-sizing: border-box;
        }

        .charity-projects-page .report-option-card strong {
          display: block;
          color: var(--sfm-midnight);
          font-size: 16px;
          line-height: 1.35;
        }

        .charity-projects-page .report-option-card p {
          margin: 4px 0 0;
          color: var(--sfm-muted-readable);
          font-size: 13px;
          line-height: 1.65;
        }

        .charity-projects-page .report-option-card button {
          min-height: 40px;
          border: 1px solid rgba(29, 140, 255, .18);
          border-radius: 12px;
          background: var(--sfm-light-card);
          color: var(--sfm-midnight);
          padding-inline: 12px;
          cursor: pointer;
          font: 900 12.5px Tajawal, Arial, sans-serif;
          white-space: nowrap;
        }

        .charity-projects-page .impact-report-card {
          grid-column: 1 / -1;
          grid-template-columns: 42px minmax(0, 1fr) minmax(220px, .65fr);
          align-items: start;
        }

        .charity-projects-page .impact-report-card .impact-lines,
        .charity-projects-page .impact-report-card > .muted {
          grid-column: 2 / -1;
          margin-top: 0;
        }

        .charity-projects-page [hidden] {
          display: none !important;
        }

        .charity-projects-page .sfm-dashboard-page-content.charity-projects-content {
          justify-items: stretch;
        }

        .charity-projects-page .cp-hero {
          grid-template-columns: minmax(0, 1fr) minmax(260px, max-content);
          gap: clamp(16px, 2vw, 28px);
          border-radius: 24px;
          padding: clamp(22px, 2.4vw, 32px);
        }

        .charity-projects-page .cp-hero h1 {
          font-size: clamp(30px, 3vw, 42px);
          line-height: 1.14;
        }

        .charity-projects-page .cp-hero p {
          max-width: 760px;
          font-size: 15.5px;
          line-height: 1.75;
        }

        .charity-projects-page .hero-actions {
          min-width: 260px;
          justify-content: flex-end;
        }

        .charity-projects-page .gold-btn,
        .charity-projects-page .dark-btn,
        .charity-projects-page .ghost-btn,
        .charity-projects-page .mini-gold,
        .charity-projects-page .primary-wide {
          border-radius: 12px;
          min-height: 42px;
          font-size: 13px;
          white-space: nowrap;
        }

        .charity-projects-page .summary-grid {
          align-items: stretch;
        }

        .charity-projects-page .summary-card {
          height: 100%;
          border-radius: 18px;
          box-shadow: 0 12px 30px rgba(3, 18, 37, .06);
        }

        .charity-projects-page .summary-card strong {
          direction: ltr;
          text-align: start;
        }

        .charity-projects-page .page-section-tabs.charity-tabs {
          position: sticky;
          top: 12px;
          z-index: 4;
          border-radius: 18px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .94), rgba(234, 246, 255, .86));
          box-shadow: 0 14px 34px rgba(3, 18, 37, .08);
        }

        .charity-projects-page .page-section-tabs.charity-tabs button {
          min-height: 48px;
          border-radius: 13px;
          border-color: rgba(29, 140, 255, .16);
          background: rgba(255, 255, 255, .74);
        }

        .charity-projects-page .page-section-tabs.charity-tabs button.active {
          background: var(--sfm-midnight);
          border-color: rgba(167, 243, 240, .34);
          color: #FFFFFF;
          box-shadow: 0 12px 24px rgba(3, 18, 37, .18);
        }

        .charity-projects-page .charity-overview-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.38fr) minmax(310px, .62fr);
          gap: 16px;
          align-items: start;
        }

        .charity-projects-page .overview-main-stack,
        .charity-projects-page .overview-side-stack {
          display: grid;
          gap: 16px;
          min-width: 0;
        }

        .charity-projects-page .overview-side-stack {
          align-content: start;
        }

        .charity-projects-page .overview-side-stack .reminder-grid,
        .charity-projects-page .overview-side-stack .quick-action-grid {
          grid-template-columns: minmax(0, 1fr) !important;
        }

        .charity-projects-page .overview-side-stack .quick-action-grid {
          gap: 12px;
        }

        .charity-projects-page .overview-side-stack .quick-action-grid > .warm-card {
          min-height: 0;
          padding: 16px;
        }

        .charity-projects-page .calendar-grid {
          grid-template-columns: minmax(0, 1.2fr) minmax(260px, .8fr);
        }

        .charity-projects-page .compact-impact {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          margin-bottom: 0;
        }

        .charity-projects-page .project-dashboard,
        .charity-projects-page .family-collaboration,
        .charity-projects-page .beneficiary-tracking,
        .charity-projects-page .document-vault,
        .charity-projects-page .report-dashboard,
        .charity-projects-page #impact-dashboard,
        .charity-projects-page #charity-organization-directory {
          display: grid;
          gap: 16px;
        }

        .charity-projects-page .project-grid,
        .charity-projects-page .document-grid,
        .charity-projects-page .beneficiary-grid,
        .charity-projects-page .contributor-grid,
        .charity-projects-page .organization-grid,
        .charity-projects-page .project-impact-grid {
          grid-template-columns: repeat(auto-fit, minmax(min(360px, 100%), 1fr));
          gap: 14px;
        }

        .charity-projects-page .project-card,
        .charity-projects-page .document-card,
        .charity-projects-page .beneficiary-card,
        .charity-projects-page .contributor-card,
        .charity-projects-page .organization-card,
        .charity-projects-page .report-option-card {
          border-radius: 18px;
          box-shadow: 0 12px 28px rgba(3, 18, 37, .055);
        }

        .charity-projects-page .document-tools {
          grid-template-columns: minmax(0, 1fr) repeat(2, minmax(180px, 240px));
          align-items: stretch;
          margin-bottom: 0;
        }

        .charity-projects-page .document-tools.document-tools-two {
          grid-template-columns: minmax(0, 1fr) minmax(180px, 260px);
        }

        .charity-projects-page .document-tools label,
        .charity-projects-page .document-tools select,
        .charity-projects-page .report-card select,
        .charity-projects-page .report-card button {
          min-height: 44px;
          height: auto;
        }

        .charity-projects-page .beneficiary-stats,
        .charity-projects-page .status-metric-grid,
        .charity-projects-page .impact-summary-grid {
          align-items: stretch;
        }

        .charity-projects-page .beneficiary-stats {
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          margin-bottom: 0;
        }

        .charity-projects-page .beneficiary-stats div,
        .charity-projects-page .status-metric-grid div,
        .charity-projects-page .impact-summary-grid div {
          min-height: 88px;
          display: grid;
          align-content: center;
        }

        .charity-projects-page .sfm-empty-state.charity-empty-state {
          min-height: 124px !important;
          border: 1px dashed rgba(29, 140, 255, .24);
          box-shadow: none;
        }

        .charity-projects-page .sfm-empty-state.charity-empty-state .sfm-empty-state-icon {
          display: grid;
          place-items: center;
          color: var(--sfm-primary);
          background: rgba(29, 140, 255, .09);
          border: 1px solid rgba(29, 140, 255, .14);
        }

        .charity-projects-page .modal {
          width: min(980px, calc(100vw - 32px));
        }

        .charity-projects-page .modal.small {
          width: min(540px, calc(100vw - 32px));
        }

        .charity-projects-page .modal .form-section {
          padding: 16px;
        }

        .charity-projects-page .modal-actions {
          align-items: center;
          margin-top: 2px;
        }

        @media (max-width: 1180px) {
          .charity-projects-page .summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .charity-projects-page .charity-overview-grid,
          .charity-projects-page .calendar-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .charity-projects-page .quick-action-grid,
          .charity-projects-page .status-metric-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .charity-projects-page .calendar-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .charity-projects-page .season-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .charity-projects-page .section-actions {
            justify-content: flex-start;
          }
        }

        @media (max-width: 900px) {
          .charity-projects-page .summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .charity-projects-page .report-toolbar,
          .charity-projects-page .report-grid,
          .charity-projects-page .impact-report-card,
          .charity-projects-page .document-tools,
          .charity-projects-page .document-tools.document-tools-two {
            grid-template-columns: minmax(0, 1fr);
          }

          .charity-projects-page .impact-report-card .impact-lines,
          .charity-projects-page .impact-report-card > .muted {
            grid-column: auto;
          }

          .charity-projects-page .page-section-tabs.charity-tabs {
            position: relative;
            top: auto;
          }
        }

        @media (max-width: 640px) {
          .charity-projects-page .summary-grid,
          .charity-projects-page .season-grid,
          .charity-projects-page .quick-action-grid,
          .charity-projects-page .status-metric-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .charity-projects-page .summary-card {
            min-height: 96px;
            grid-template-columns: auto minmax(0, 1fr);
          }

          .charity-projects-page .section-actions {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            width: 100%;
          }

          .charity-projects-page .page-section-tabs.charity-tabs {
            width: 100%;
            max-width: calc(100vw - 28px);
          }

          .charity-projects-page .page-section-tabs.charity-tabs button {
            flex-basis: max(148px, 44vw);
            min-height: 44px;
          }

          .charity-projects-page .sfm-empty-state.charity-empty-state,
          .charity-projects-page .empty-state.compact {
            min-height: 116px !important;
          }

          .charity-projects-page .page-section-tabs.charity-tabs {
            overflow-x: auto;
            overflow-y: hidden;
          }

          .charity-projects-page .report-option-card {
            grid-template-columns: 42px minmax(0, 1fr);
          }

          .charity-projects-page .report-option-card button {
            grid-column: 1 / -1;
            width: 100%;
          }

          .charity-projects-page .modal .form-grid,
          .charity-projects-page .form-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }

        .dark .charity-projects-page {
          background:
            radial-gradient(circle at 8% 0%, rgba(47, 214, 192, .10), transparent 30%),
            var(--sfm-page-gradient);
        }

        .dark .charity-projects-page .modal {
          background:
            linear-gradient(180deg, rgba(16, 47, 82, .98), rgba(10, 20, 34, .96));
          border-color: rgba(167, 243, 240, .16);
          box-shadow: 0 30px 86px rgba(0, 0, 0, .46);
        }

        .dark .charity-projects-page .modal-head {
          border-bottom-color: rgba(167, 243, 240, .14);
        }

        .dark .charity-projects-page .modal-head h2,
        .dark .charity-projects-page .modal .form-section h3,
        .dark .charity-projects-page .modal .form-grid label,
        .dark .charity-projects-page .modal .impact-input,
        .dark .charity-projects-page .modal .currency-field {
          color: var(--sfm-heading);
        }

        .dark .charity-projects-page .modal-kicker {
          background: rgba(47, 214, 192, .12);
          color: #A7F3F0;
        }

        .dark .charity-projects-page .modal-head button,
        .dark .charity-projects-page .modal .form-grid input,
        .dark .charity-projects-page .modal .form-grid select,
        .dark .charity-projects-page .modal .form-grid textarea,
        .dark .charity-projects-page .modal .impact-input input {
          background: #0A1422;
          border-color: #1D3050;
          color: var(--sfm-foreground);
        }

        .dark .charity-projects-page .modal .check-row,
        .dark .charity-projects-page .modal .form-section,
        .dark .charity-projects-page .modal .privacy-note {
          background: rgba(10, 20, 34, .72);
          border-color: #1D3050;
          color: var(--sfm-body);
        }

        .dark .charity-projects-page .season-card,
        .dark .charity-projects-page .status-metric-grid div,
        .dark .charity-projects-page .report-toolbar,
        .dark .charity-projects-page .report-option-card,
        .dark .charity-projects-page .sfm-empty-state.charity-empty-state {
          background: rgba(10, 20, 34, .62) !important;
          border-color: #1D3050 !important;
        }

        .dark .charity-projects-page .season-card strong,
        .dark .charity-projects-page .status-metric-grid strong,
        .dark .charity-projects-page .report-option-card strong,
        .dark .charity-projects-page .report-toolbar label,
        .dark .charity-projects-page .sfm-empty-state.charity-empty-state strong {
          color: var(--sfm-heading);
        }

        .dark .charity-projects-page .season-card small,
        .dark .charity-projects-page .status-metric-grid small,
        .dark .charity-projects-page .report-option-card p,
        .dark .charity-projects-page .sfm-empty-state.charity-empty-state p {
          color: var(--sfm-body);
        }

        .dark .charity-projects-page .season-card-icon {
          background: rgba(47, 214, 192, .12);
          border-color: rgba(47, 214, 192, .20);
          color: #A7F3F0;
        }

        .dark .charity-projects-page .report-toolbar select,
        .dark .charity-projects-page .report-option-card button {
          background: #0A1422;
          border-color: #1D3050;
          color: var(--sfm-heading);
        }

        @media (max-width: 1024px) {
          .charity-projects-page .sfm-dashboard-page-content.charity-projects-content {
            max-inline-size: 100%;
          }
        }

        @media (max-width: 720px) {
          .charity-projects-page .cp-hero {
            align-items: start;
          }

          .charity-projects-page .page-section-tabs.charity-tabs {
            padding: 7px;
          }

          .charity-projects-page .page-section-tabs.charity-tabs button {
            min-height: 40px;
            padding-inline: 12px;
            font-size: 12px;
          }

          .charity-projects-page .modal-backdrop {
            align-items: end;
            padding: 10px;
          }

          .charity-projects-page .modal,
          .charity-projects-page .modal.small {
            width: 100%;
            max-height: 92dvh;
            border-radius: 24px 24px 0 0;
            padding: 16px;
          }

          .charity-projects-page .modal-head {
            gap: 12px;
            margin-bottom: 14px;
            padding-bottom: 12px;
          }

          .charity-projects-page .modal .form-grid {
            grid-template-columns: minmax(0, 1fr);
            gap: 12px;
          }

          .charity-projects-page .modal-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .charity-projects-page .modal-actions button {
            width: 100%;
            min-width: 0;
          }
        }

        /* Charity module production polish: scoped layout system for all internal tabs. */
        .charity-projects-page {
          --charity-radius-xl: 26px;
          --charity-radius-lg: 20px;
          --charity-radius-md: 14px;
          --charity-border: rgba(29, 140, 255, .14);
          --charity-border-strong: rgba(29, 140, 255, .22);
          --charity-shadow: 0 18px 44px rgba(3, 18, 37, .08);
          --charity-shadow-soft: 0 10px 28px rgba(3, 18, 37, .055);
          overflow-x: clip;
        }

        .charity-projects-page .sfm-dashboard-page-content.charity-projects-content {
          width: min(100%, 1480px);
          max-inline-size: min(1480px, calc(100vw - 32px));
          margin-inline: auto;
          gap: clamp(16px, 1.8vw, 24px);
          min-width: 0;
        }

        .charity-projects-page .sfm-dashboard-page-content.charity-projects-content > * {
          inline-size: 100%;
          min-width: 0;
        }

        .charity-projects-page .cp-hero {
          grid-template-columns: minmax(0, 1fr) minmax(320px, 620px);
          align-items: center;
          min-height: 0;
        }

        .charity-projects-page .cp-hero span {
          line-height: 1.35;
        }

        .charity-projects-page .cp-hero h1,
        .charity-projects-page .section-head h2,
        .charity-projects-page .project-card strong,
        .charity-projects-page .beneficiary-card strong,
        .charity-projects-page .contributor-card strong,
        .charity-projects-page .document-card strong,
        .charity-projects-page .report-option-card strong {
          letter-spacing: 0;
          text-wrap: balance;
        }

        .charity-projects-page .hero-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
          min-width: 0;
          max-width: 100%;
        }

        .charity-projects-page .hero-actions > :is(button, a) {
          flex: 0 1 auto;
        }

        .charity-projects-page .gold-btn,
        .charity-projects-page .dark-btn,
        .charity-projects-page .ghost-btn,
        .charity-projects-page .mini-gold,
        .charity-projects-page .primary-wide,
        .charity-projects-page .report-option-card button,
        .charity-projects-page .report-card button,
        .charity-projects-page .modal-actions button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
          border-radius: var(--charity-radius-md);
          font-weight: 900;
          line-height: 1.2;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease;
        }

        .charity-projects-page :is(.gold-btn, .dark-btn, .ghost-btn, .mini-gold, .primary-wide, .report-option-card button, .report-card button, .modal-actions button):hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .charity-projects-page :is(.gold-btn, .dark-btn, .ghost-btn, .mini-gold, .primary-wide, .report-option-card button, .report-card button, .modal-actions button):focus-visible,
        .charity-projects-page :is(input, select, textarea, button, a):focus-visible {
          outline: 3px solid rgba(47, 214, 192, .34);
          outline-offset: 2px;
        }

        .charity-projects-page .warm-card {
          border-radius: var(--charity-radius-xl);
          border: 1px solid var(--charity-border);
          box-shadow: var(--charity-shadow-soft);
          background:
            linear-gradient(180deg, rgba(255,255,255,.98), rgba(246,251,255,.94));
          min-width: 0;
        }

        .charity-projects-page .summary-grid {
          grid-template-columns: repeat(5, minmax(0, 1fr));
          align-items: stretch;
        }

        .charity-projects-page .summary-card {
          min-height: 124px;
          padding: 18px;
          overflow: hidden;
        }

        .charity-projects-page .summary-card strong,
        .charity-projects-page .impact-summary-grid strong,
        .charity-projects-page .beneficiary-stats strong,
        .charity-projects-page .status-metric-grid strong,
        .charity-projects-page .money-row strong,
        .charity-projects-page .price-card strong {
          direction: ltr;
          unicode-bidi: isolate;
          font-variant-numeric: tabular-nums;
        }

        .charity-projects-page .page-section-tabs.charity-tabs {
          display: flex;
          align-items: stretch;
          gap: 8px;
          min-height: 62px;
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }

        .charity-projects-page .page-section-tabs.charity-tabs::-webkit-scrollbar {
          display: none;
        }

        .charity-projects-page .page-section-tabs.charity-tabs button {
          flex: 1 0 auto;
          min-width: max-content;
          min-height: 48px;
          white-space: nowrap;
        }

        .charity-projects-page .page-section-tabs.charity-tabs button.active {
          transform: none;
        }

        .charity-projects-page .section-head {
          margin-bottom: 0;
          align-items: center;
        }

        .charity-projects-page .section-head small {
          display: inline-flex;
          width: fit-content;
          margin-bottom: 6px;
          color: var(--sfm-primary-hover);
          font-size: 12px;
          font-weight: 950;
          line-height: 1.2;
        }

        .charity-projects-page .section-head p {
          max-width: 760px;
        }

        .charity-projects-page :is(.project-dashboard, .family-collaboration, .beneficiary-tracking, .document-vault, .report-dashboard, #impact-dashboard) {
          min-height: 0;
          padding: clamp(18px, 2vw, 24px);
        }

        .charity-projects-page .charity-overview-grid {
          align-items: stretch;
        }

        .charity-projects-page .overview-main-stack,
        .charity-projects-page .overview-side-stack {
          align-content: start;
        }

        .charity-projects-page .calendar-grid,
        .charity-projects-page .project-grid,
        .charity-projects-page .beneficiary-grid,
        .charity-projects-page .contributor-grid,
        .charity-projects-page .document-grid,
        .charity-projects-page .report-grid,
        .charity-projects-page .organization-grid,
        .charity-projects-page .project-impact-grid,
        .charity-projects-page .quick-action-grid,
        .charity-projects-page .reminder-grid {
          min-width: 0;
        }

        .charity-projects-page .project-card,
        .charity-projects-page .beneficiary-card,
        .charity-projects-page .contributor-card,
        .charity-projects-page .document-card,
        .charity-projects-page .organization-card,
        .charity-projects-page .report-option-card,
        .charity-projects-page .reminder-card,
        .charity-projects-page .season-card {
          min-width: 0;
          height: 100%;
          border-radius: var(--charity-radius-lg);
          border: 1px solid var(--charity-border);
          box-shadow: var(--charity-shadow-soft);
        }

        .charity-projects-page .project-top,
        .charity-projects-page .reminder-top,
        .charity-projects-page .organization-top,
        .charity-projects-page .file-chip,
        .charity-projects-page .report-card,
        .charity-projects-page .document-tools {
          min-width: 0;
        }

        .charity-projects-page .project-top > div,
        .charity-projects-page .reminder-top > div,
        .charity-projects-page .organization-top > div,
        .charity-projects-page .report-option-card > div,
        .charity-projects-page .document-card > div {
          min-width: 0;
        }

        .charity-projects-page .project-card p,
        .charity-projects-page .beneficiary-card p,
        .charity-projects-page .contributor-card p,
        .charity-projects-page .document-card p,
        .charity-projects-page .report-option-card p,
        .charity-projects-page .muted {
          overflow-wrap: anywhere;
        }

        .charity-projects-page .status-metric-grid,
        .charity-projects-page .beneficiary-stats,
        .charity-projects-page .impact-summary-grid {
          gap: 12px;
        }

        .charity-projects-page .status-metric-grid div,
        .charity-projects-page .beneficiary-stats div,
        .charity-projects-page .impact-summary-grid div {
          border-radius: 18px;
          border: 1px solid rgba(29, 140, 255, .13);
          background: rgba(255, 255, 255, .74);
          box-shadow: none;
        }

        .charity-projects-page .document-tools {
          display: grid;
          gap: 10px;
          padding: 12px;
          border-radius: 20px;
          border: 1px solid rgba(29, 140, 255, .11);
          background: rgba(234, 246, 255, .56);
        }

        .charity-projects-page .document-tools label {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }

        .charity-projects-page :is(.document-tools input, .document-tools select, .report-card select, .modal input, .modal select, .modal textarea, .impact-input input) {
          width: 100%;
          min-height: 46px;
          border-radius: 13px;
          border: 1px solid rgba(29, 140, 255, .18);
          background: var(--sfm-card);
          color: var(--sfm-deep-navy);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.72);
        }

        .charity-projects-page .modal label,
        .charity-projects-page .form-grid label,
        .charity-projects-page .impact-input {
          display: grid;
          gap: 7px;
          color: var(--sfm-midnight);
          font-weight: 850;
          line-height: 1.45;
        }

        .charity-projects-page .modal label span,
        .charity-projects-page .form-grid label span,
        .charity-projects-page .impact-input span {
          color: var(--sfm-muted-readable);
          font-size: 12.5px;
          font-weight: 900;
        }

        .charity-projects-page .modal .form-grid,
        .charity-projects-page .form-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          align-items: start;
        }

        .charity-projects-page .modal .form-grid .wide,
        .charity-projects-page .form-grid .wide,
        .charity-projects-page .modal textarea {
          grid-column: 1 / -1;
        }

        .charity-projects-page .modal .form-section {
          border-radius: 20px;
          border: 1px solid rgba(29, 140, 255, .12);
          background: rgba(234, 246, 255, .42);
        }

        .charity-projects-page .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          border-top: 1px solid rgba(29, 140, 255, .11);
          padding-top: 14px;
        }

        .charity-projects-page .sfm-empty-state.charity-empty-state {
          width: 100%;
          max-width: none;
          min-height: 132px !important;
          padding: 18px !important;
          border-radius: 20px !important;
          background:
            linear-gradient(135deg, rgba(255,255,255,.96), rgba(234,246,255,.70)) !important;
        }

        .charity-projects-page .sfm-empty-state.charity-empty-state h3 {
          margin-bottom: 4px;
          color: var(--sfm-midnight);
          font-size: 17px;
          line-height: 1.4;
        }

        .charity-projects-page .sfm-empty-state.charity-empty-state p {
          max-width: 560px;
          margin-inline: auto;
          line-height: 1.75;
        }

        .charity-projects-page .report-option-card {
          grid-template-columns: 46px minmax(0, 1fr) auto;
          align-items: center;
          padding: 16px;
        }

        .charity-projects-page .report-option-card > svg {
          width: 46px;
          height: 46px;
          padding: 12px;
          border-radius: 16px;
          background: rgba(29, 140, 255, .09);
        }

        .charity-projects-page .report-toolbar,
        .charity-projects-page .report-card {
          border-radius: 20px;
        }

        .dark .charity-projects-page {
          --charity-border: rgba(167, 243, 240, .14);
          --charity-border-strong: rgba(167, 243, 240, .22);
          --charity-shadow: 0 18px 48px rgba(0, 0, 0, .22);
          --charity-shadow-soft: 0 10px 30px rgba(0, 0, 0, .18);
        }

        .dark .charity-projects-page .warm-card,
        .dark .charity-projects-page .project-card,
        .dark .charity-projects-page .beneficiary-card,
        .dark .charity-projects-page .contributor-card,
        .dark .charity-projects-page .document-card,
        .dark .charity-projects-page .organization-card,
        .dark .charity-projects-page .report-option-card,
        .dark .charity-projects-page .reminder-card,
        .dark .charity-projects-page .season-card,
        .dark .charity-projects-page .modal .form-section {
          background:
            linear-gradient(180deg, rgba(16, 47, 82, .88), rgba(8, 24, 42, .92));
          border-color: var(--charity-border);
          box-shadow: var(--charity-shadow-soft);
        }

        .dark .charity-projects-page .status-metric-grid div,
        .dark .charity-projects-page .beneficiary-stats div,
        .dark .charity-projects-page .impact-summary-grid div,
        .dark .charity-projects-page .document-tools {
          background: rgba(10, 20, 34, .58);
          border-color: rgba(167, 243, 240, .12);
        }

        .dark .charity-projects-page :is(.document-tools input, .document-tools select, .report-card select, .modal input, .modal select, .modal textarea, .impact-input input) {
          background: #081827;
          border-color: rgba(167, 243, 240, .18);
          color: var(--sfm-heading);
          box-shadow: none;
        }

        .dark .charity-projects-page .modal label,
        .dark .charity-projects-page .form-grid label,
        .dark .charity-projects-page .impact-input,
        .dark .charity-projects-page .sfm-empty-state.charity-empty-state h3 {
          color: var(--sfm-heading);
        }

        .dark .charity-projects-page .sfm-empty-state.charity-empty-state {
          background:
            linear-gradient(135deg, rgba(16,47,82,.88), rgba(8,24,42,.88)) !important;
          border-color: rgba(167, 243, 240, .18) !important;
        }

        .dark .charity-projects-page .page-section-tabs.charity-tabs {
          background:
            linear-gradient(135deg, rgba(8,24,42,.94), rgba(16,47,82,.86));
          border-color: rgba(167, 243, 240, .14);
        }

        .dark .charity-projects-page .page-section-tabs.charity-tabs button {
          background: rgba(10, 20, 34, .74);
          border-color: rgba(167, 243, 240, .12);
          color: var(--sfm-body);
        }

        .dark .charity-projects-page .page-section-tabs.charity-tabs button.active {
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-primary-dark));
          color: #FFFFFF;
        }

        @media (max-width: 1260px) {
          .charity-projects-page .cp-hero {
            grid-template-columns: minmax(0, 1fr);
          }

          .charity-projects-page .hero-actions {
            justify-content: flex-start;
          }

          .charity-projects-page .summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 920px) {
          .charity-projects-page .sfm-dashboard-page-content.charity-projects-content {
            max-inline-size: min(100%, calc(100vw - 24px));
          }

          .charity-projects-page .summary-grid,
          .charity-projects-page .compact-impact {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .charity-projects-page .page-section-tabs.charity-tabs {
            position: relative;
            top: auto;
            min-height: 58px;
          }

          .charity-projects-page .page-section-tabs.charity-tabs button {
            flex: 0 0 auto;
            min-width: 146px;
          }

          .charity-projects-page .report-option-card {
            grid-template-columns: 46px minmax(0, 1fr);
          }

          .charity-projects-page .report-option-card button,
          .charity-projects-page .impact-report-card .impact-input,
          .charity-projects-page .impact-report-card .impact-lines,
          .charity-projects-page .impact-report-card > .muted {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 640px) {
          .charity-projects-page .sfm-dashboard-page-content.charity-projects-content {
            max-inline-size: min(100%, calc(100vw - 18px));
            gap: 14px;
          }

          .charity-projects-page .cp-hero {
            padding: 18px;
            border-radius: 22px;
          }

          .charity-projects-page .hero-actions {
            display: grid;
            grid-template-columns: 1fr;
            width: 100%;
          }

          .charity-projects-page .summary-grid,
          .charity-projects-page .compact-impact,
          .charity-projects-page .modal .form-grid,
          .charity-projects-page .form-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .charity-projects-page .summary-card {
            min-height: 104px;
          }

          .charity-projects-page .section-head,
          .charity-projects-page .vault-head {
            display: grid;
            align-items: start;
          }

          .charity-projects-page .section-actions {
            justify-content: stretch;
          }

          .charity-projects-page .section-actions > *,
          .charity-projects-page .card-actions > *,
          .charity-projects-page .document-actions > * {
            width: 100%;
          }

          .charity-projects-page .page-section-tabs.charity-tabs {
            max-width: 100%;
            padding: 7px;
          }

          .charity-projects-page .page-section-tabs.charity-tabs button {
            min-width: 136px;
          }

          .charity-projects-page :is(.project-dashboard, .family-collaboration, .beneficiary-tracking, .document-vault, .report-dashboard, #impact-dashboard) {
            padding: 16px;
            border-radius: 22px;
          }

          .charity-projects-page .sfm-empty-state.charity-empty-state {
            min-height: 118px !important;
          }
        }

        /* Final deterministic overrides: keep the Charity dashboard from falling back to unstyled blocks. */
        .charity-projects-page .cp-hero {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 620px) !important;
          align-items: center !important;
          gap: clamp(16px, 2vw, 28px) !important;
          border-radius: 26px !important;
          padding: clamp(22px, 2.4vw, 32px) !important;
          color: var(--sfm-card) !important;
          background:
            radial-gradient(circle at 18% 20%, rgba(24, 212, 212, .34), transparent 30%),
            radial-gradient(circle at 84% 8%, rgba(167, 243, 240, .16), transparent 24%),
            linear-gradient(135deg, var(--sfm-deep-navy), var(--sfm-primary-dark) 58%, var(--sfm-card-dark) 140%) !important;
          border: 1px solid rgba(167, 243, 240, .18) !important;
          box-shadow: 0 22px 56px rgba(3, 18, 37, .22) !important;
          overflow: hidden !important;
        }

        .charity-projects-page .cp-hero h1 {
          margin: 12px 0 10px !important;
          color: #FFFFFF !important;
          font-size: clamp(32px, 3vw, 44px) !important;
          line-height: 1.14 !important;
          font-weight: 950 !important;
        }

        .charity-projects-page .cp-hero p {
          max-width: 780px !important;
          margin: 0 !important;
          color: rgba(234, 246, 255, .84) !important;
          font-size: 15.5px !important;
          line-height: 1.78 !important;
        }

        .charity-projects-page .template-grid {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 12px !important;
          align-items: stretch !important;
        }

        .charity-projects-page .template-card {
          display: grid !important;
          align-content: start !important;
          gap: 8px !important;
          min-height: 116px !important;
          padding: 15px !important;
          border: 1px solid rgba(29, 140, 255, .14) !important;
          border-radius: 18px !important;
          background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(253,248,238,.88)) !important;
          color: var(--sfm-midnight) !important;
          text-align: start !important;
          box-shadow: 0 10px 24px rgba(3, 18, 37, .05) !important;
        }

        .charity-projects-page .template-card strong,
        .charity-projects-page .template-card span {
          display: block !important;
          min-width: 0 !important;
          overflow-wrap: anywhere !important;
          line-height: 1.55 !important;
        }

        .charity-projects-page .template-card strong {
          color: var(--sfm-midnight) !important;
          font-size: 15px !important;
          font-weight: 950 !important;
        }

        .charity-projects-page .template-card span {
          color: var(--sfm-muted-readable) !important;
          font-size: 12.5px !important;
        }

        .charity-projects-page .cp-hero span {
          display: inline-flex !important;
          width: fit-content !important;
          align-items: center !important;
          border: 1px solid rgba(167, 243, 240, .22) !important;
          background: rgba(167, 243, 240, .10) !important;
          color: var(--sfm-soft-cyan) !important;
          border-radius: 999px !important;
          padding: 7px 11px !important;
          font-size: 12.5px !important;
          font-weight: 950 !important;
        }

        .charity-projects-page .summary-grid {
          display: grid !important;
          grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
          gap: 12px !important;
          align-items: stretch !important;
        }

        .charity-projects-page .warm-card,
        .charity-projects-page .summary-card,
        .charity-projects-page .project-card,
        .charity-projects-page .beneficiary-card,
        .charity-projects-page .contributor-card,
        .charity-projects-page .document-card,
        .charity-projects-page .organization-card,
        .charity-projects-page .report-option-card,
        .charity-projects-page .reminder-card,
        .charity-projects-page .season-card,
        .charity-projects-page .alert-panel,
        .charity-projects-page .impact-panel {
          border: 1px solid rgba(29, 140, 255, .14) !important;
          background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(246,251,255,.94)) !important;
          border-radius: 22px !important;
          box-shadow: 0 14px 34px rgba(3, 18, 37, .07) !important;
        }

        .charity-projects-page .summary-card {
          display: grid !important;
          grid-template-columns: auto minmax(0, 1fr) !important;
          align-content: center !important;
          min-height: 124px !important;
          padding: 18px !important;
        }

        .charity-projects-page .summary-card span {
          grid-row: 1 / span 2 !important;
          width: 42px !important;
          height: 42px !important;
          border-radius: 14px !important;
          display: grid !important;
          place-items: center !important;
          color: var(--sfm-primary) !important;
          background: rgba(29, 140, 255, .10) !important;
        }

        .charity-projects-page .summary-card small,
        .charity-projects-page .summary-card strong {
          min-width: 0 !important;
        }

        .charity-projects-page .page-section-tabs.charity-tabs {
          display: grid !important;
          grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
          min-height: 64px !important;
          gap: 8px !important;
          padding: 8px !important;
          overflow: visible !important;
          border-radius: 20px !important;
          background: linear-gradient(135deg, rgba(255, 255, 255, .94), rgba(234, 246, 255, .86)) !important;
          box-shadow: 0 14px 34px rgba(3, 18, 37, .08) !important;
        }

        .charity-projects-page .page-section-tabs.charity-tabs button {
          width: 100% !important;
          min-width: 0 !important;
          min-height: 48px !important;
          border-radius: 14px !important;
          white-space: normal !important;
          line-height: 1.35 !important;
        }

        .charity-projects-page .page-section-tabs.charity-tabs button.active {
          background: var(--sfm-midnight) !important;
          color: #FFFFFF !important;
          border-color: rgba(167, 243, 240, .34) !important;
          box-shadow: 0 12px 24px rgba(3, 18, 37, .18) !important;
        }

        .charity-projects-page .charity-overview-grid {
          display: grid !important;
          grid-template-columns: minmax(0, 1.38fr) minmax(310px, .62fr) !important;
          gap: 16px !important;
          align-items: start !important;
        }

        .charity-projects-page :is(.project-dashboard, .family-collaboration, .beneficiary-tracking, .document-vault, .report-dashboard, #impact-dashboard) {
          display: grid !important;
          gap: 16px !important;
          padding: clamp(18px, 2vw, 24px) !important;
        }

        .charity-projects-page .sfm-empty-state.charity-empty-state {
          display: grid !important;
          place-items: center !important;
          gap: 10px !important;
          min-height: 132px !important;
          padding: 18px !important;
          text-align: center !important;
          border: 1px dashed rgba(29, 140, 255, .24) !important;
          border-radius: 20px !important;
          background: linear-gradient(135deg, rgba(255,255,255,.96), rgba(234,246,255,.70)) !important;
          box-shadow: none !important;
        }

        .dark .charity-projects-page .cp-hero {
          background:
            radial-gradient(circle at 18% 20%, rgba(24, 212, 212, .18), transparent 30%),
            radial-gradient(circle at 86% 10%, rgba(29, 140, 255, .16), transparent 26%),
            linear-gradient(135deg, #061A2E, #081D34 58%, #102F52 145%) !important;
          border-color: rgba(167, 243, 240, .14) !important;
          box-shadow: 0 22px 58px rgba(0, 0, 0, .34) !important;
        }

        .dark .charity-projects-page .cp-hero h1 {
          color: #FFFFFF !important;
          text-shadow: 0 2px 24px rgba(0, 0, 0, .24) !important;
        }

        .dark .charity-projects-page .cp-hero p,
        .dark .charity-projects-page .cp-hero span {
          color: rgba(234, 246, 255, .88) !important;
        }

        .dark .charity-projects-page :is(.warm-card, .summary-card, .project-card, .beneficiary-card, .contributor-card, .document-card, .organization-card, .report-option-card, .reminder-card, .season-card, .alert-panel, .impact-panel) {
          background: linear-gradient(180deg, rgba(16, 47, 82, .88), rgba(8, 24, 42, .92)) !important;
          border-color: rgba(167, 243, 240, .14) !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, .18) !important;
        }

        .dark .charity-projects-page .template-card {
          background: linear-gradient(180deg, rgba(16, 47, 82, .88), rgba(8, 24, 42, .92)) !important;
          border-color: rgba(167, 243, 240, .14) !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, .18) !important;
        }

        .dark .charity-projects-page .template-card strong {
          color: var(--sfm-heading) !important;
        }

        .dark .charity-projects-page .template-card span {
          color: var(--sfm-body) !important;
        }

        @media (max-width: 1260px) {
          .charity-projects-page .cp-hero {
            grid-template-columns: 1fr !important;
          }

          .charity-projects-page .summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }

          .charity-projects-page .template-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .charity-projects-page .charity-overview-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 900px) {
          .charity-projects-page .summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .charity-projects-page .page-section-tabs.charity-tabs {
            display: flex !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            scrollbar-width: none !important;
          }

          .charity-projects-page .page-section-tabs.charity-tabs::-webkit-scrollbar {
            display: none !important;
          }

          .charity-projects-page .page-section-tabs.charity-tabs button {
            flex: 0 0 max(152px, 46vw) !important;
          }
        }

        @media (max-width: 640px) {
          .charity-projects-page .cp-hero {
            padding: 18px !important;
            border-radius: 22px !important;
          }

          .charity-projects-page .summary-grid {
            grid-template-columns: 1fr !important;
          }

          .charity-projects-page .template-grid {
            grid-template-columns: 1fr !important;
          }

          .charity-projects-page .summary-card {
            min-height: 104px !important;
          }
        }

        /* Professional charity dashboard rebuild. */
        .charity-projects-page {
          background:
            radial-gradient(circle at 8% 0%, rgba(47, 214, 192, .10), transparent 30%),
            var(--sfm-page-gradient) !important;
          overflow-x: clip !important;
        }

        .charity-projects-page .sfm-dashboard-page-content.charity-projects-content {
          width: min(100%, 1280px) !important;
          max-inline-size: min(1280px, calc(100vw - 32px)) !important;
          margin-inline: auto !important;
          gap: clamp(14px, 1.55vw, 22px) !important;
          min-width: 0 !important;
        }

        .charity-projects-page .sfm-dashboard-page-content.charity-projects-content > * {
          inline-size: 100% !important;
          min-width: 0 !important;
        }

        .charity-projects-page .cp-hero {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          gap: 18px !important;
          min-height: 0 !important;
          padding: clamp(20px, 2.15vw, 28px) !important;
          border-radius: 26px !important;
        }

        .charity-projects-page .cp-hero h1 {
          max-width: 780px !important;
          font-size: clamp(32px, 3vw, 44px) !important;
          letter-spacing: 0 !important;
          text-wrap: balance !important;
        }

        .charity-projects-page .cp-hero p {
          max-width: 820px !important;
          font-size: 15.5px !important;
          line-height: 1.85 !important;
        }

        .charity-projects-page .hero-actions {
          justify-content: flex-start !important;
          gap: 9px !important;
          min-width: 0 !important;
        }

        .charity-projects-page .charity-action-button,
        .charity-projects-page .mini-gold,
        .charity-projects-page .ghost-btn,
        .charity-projects-page .dark-btn,
        .charity-projects-page .gold-btn,
        .charity-projects-page .primary-wide,
        .charity-projects-page .card-actions button,
        .charity-projects-page .document-actions button,
        .charity-projects-page .doc-count-btn,
        .charity-projects-page .report-option-card button,
        .charity-projects-page .template-card {
          min-height: 40px !important;
          width: auto !important;
          border-radius: 13px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 7px !important;
          font-weight: 950 !important;
          line-height: 1.25 !important;
          white-space: nowrap !important;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease !important;
        }

        .charity-projects-page .charity-action-button {
          border: 1px solid rgba(167, 243, 240, .22) !important;
          padding: 0 15px !important;
          cursor: pointer !important;
          font-family: inherit !important;
        }

        .charity-projects-page .charity-action-button.primary {
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent)) !important;
          color: #fff !important;
          box-shadow: 0 14px 30px rgba(29, 140, 255, .20) !important;
        }

        .charity-projects-page .charity-action-button.secondary {
          background: rgba(255, 255, 255, .10) !important;
          color: var(--sfm-card) !important;
        }

        .charity-projects-page .charity-action-button.ghost {
          background: rgba(255, 255, 255, .96) !important;
          color: var(--sfm-midnight) !important;
          border-color: rgba(255, 255, 255, .50) !important;
        }

        .charity-projects-page :is(.charity-action-button, .mini-gold, .ghost-btn, .dark-btn, .gold-btn, .primary-wide, .card-actions button, .document-actions button, .doc-count-btn, .report-option-card button):hover:not(:disabled) {
          transform: translateY(-1px) !important;
          box-shadow: 0 16px 34px rgba(3, 18, 37, .12), 0 0 0 3px rgba(24, 212, 212, .12) !important;
        }

        .charity-projects-page :is(button, a, input, select, textarea):focus-visible {
          outline: 3px solid rgba(47, 214, 192, .34) !important;
          outline-offset: 2px !important;
        }

        .charity-projects-page .summary-grid {
          grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
          gap: 12px !important;
        }

        .charity-projects-page .summary-card.charity-stat-card {
          height: 100% !important;
          min-height: 118px !important;
          grid-template-columns: auto minmax(0, 1fr) !important;
          grid-template-rows: auto 1fr !important;
          gap: 7px 12px !important;
          padding: 17px 16px !important;
          border-radius: 20px !important;
        }

        .charity-projects-page .summary-card.charity-stat-card strong,
        .charity-projects-page :is(.money-row strong, .impact-summary-grid strong, .beneficiary-stats strong, .status-metric-grid strong, .result-grid strong, .price-card strong, .history-row strong, .report-option-card strong, .big-metric strong) {
          direction: ltr !important;
          unicode-bidi: isolate !important;
          font-variant-numeric: tabular-nums !important;
        }

        .charity-projects-page .summary-card.charity-stat-card small {
          font-size: 12.5px !important;
          line-height: 1.45 !important;
          font-weight: 950 !important;
        }

        .charity-projects-page .summary-card.charity-stat-card strong {
          align-self: end !important;
          font-size: clamp(18px, 1.35vw, 23px) !important;
          line-height: 1.25 !important;
          overflow-wrap: normal !important;
          word-break: keep-all !important;
        }

        .charity-projects-page .page-section-tabs.charity-tabs {
          min-height: 62px !important;
          border: 1px solid rgba(29, 140, 255, .13) !important;
          border-radius: 22px !important;
          background: linear-gradient(135deg, rgba(255,255,255,.95), rgba(234,246,255,.84)) !important;
          box-shadow: 0 14px 34px rgba(3,18,37,.07) !important;
        }

        .charity-projects-page .page-section-tabs.charity-tabs button {
          min-height: 48px !important;
          border-radius: 15px !important;
          font-size: 13px !important;
          text-align: center !important;
        }

        .charity-projects-page .page-section-tabs.charity-tabs button.active {
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-primary-dark)) !important;
          color: #fff !important;
          border-color: rgba(167,243,240,.30) !important;
        }

        .charity-projects-page .charity-overview-grid {
          grid-template-columns: minmax(0, 1.14fr) minmax(320px, .86fr) !important;
          gap: 16px !important;
        }

        .charity-projects-page :is(.overview-main-stack, .overview-side-stack) {
          display: grid !important;
          gap: 16px !important;
          min-width: 0 !important;
        }

        .charity-projects-page :is(.warm-card, .summary-card, .project-card, .beneficiary-card, .contributor-card, .document-card, .organization-card, .report-option-card, .reminder-card, .season-card, .alert-panel, .impact-panel, .template-card) {
          border-radius: 22px !important;
          border: 1px solid rgba(29, 140, 255, .14) !important;
          background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(247,251,255,.94)) !important;
          box-shadow: 0 14px 34px rgba(3,18,37,.065) !important;
        }

        .charity-projects-page :is(.project-dashboard, .family-collaboration, .beneficiary-tracking, .document-vault, .report-dashboard, #impact-dashboard, #charity-organization-directory) {
          padding: clamp(18px, 2vw, 24px) !important;
          display: grid !important;
          gap: 15px !important;
          min-height: auto !important;
        }

        .charity-projects-page :is(.section-head, .charity-section-header, .vault-head) {
          align-items: center !important;
          margin-bottom: 0 !important;
          gap: 14px !important;
        }

        .charity-projects-page :is(.section-head h2, .charity-section-header h2) {
          letter-spacing: 0 !important;
          text-wrap: balance !important;
        }

        .charity-projects-page :is(.section-head p, .charity-section-header p) {
          max-width: 760px !important;
          margin-top: 6px !important;
        }

        .charity-projects-page .charity-section-icon {
          width: 44px !important;
          height: 44px !important;
          border-radius: 15px !important;
          display: grid !important;
          place-items: center !important;
          background: rgba(29, 140, 255, .10) !important;
          color: var(--sfm-primary) !important;
          border: 1px solid rgba(29, 140, 255, .12) !important;
        }

        .charity-projects-page .document-tools,
        .charity-projects-page .report-toolbar,
        .charity-projects-page .report-card {
          display: grid !important;
          grid-template-columns: minmax(260px, 1fr) repeat(2, minmax(160px, .34fr)) !important;
          gap: 10px !important;
          align-items: center !important;
          width: 100% !important;
        }

        .charity-projects-page .document-tools-two {
          grid-template-columns: minmax(260px, 1fr) repeat(2, minmax(170px, .4fr)) !important;
        }

        .charity-projects-page .report-toolbar {
          grid-template-columns: minmax(220px, .35fr) minmax(0, 1fr) !important;
        }

        .charity-projects-page .report-toolbar .section-actions {
          justify-content: flex-end !important;
        }

        .charity-projects-page :is(.project-grid, .beneficiary-grid, .contributor-grid, .organization-grid, .document-grid, .report-grid, .project-impact-grid) {
          display: grid !important;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)) !important;
          gap: 12px !important;
        }

        .charity-projects-page .report-grid {
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)) !important;
        }

        .charity-projects-page .document-grid {
          grid-template-columns: 1fr !important;
        }

        .charity-projects-page .document-card {
          grid-template-columns: auto minmax(0, 1fr) auto !important;
          align-items: center !important;
          padding: 14px !important;
        }

        .charity-projects-page :is(.project-card, .beneficiary-card, .contributor-card, .organization-card, .document-card, .report-option-card, .reminder-card) {
          padding: 15px !important;
          min-height: auto !important;
        }

        .charity-projects-page .report-option-card.charity-report-card {
          display: grid !important;
          grid-template-columns: auto minmax(0, 1fr) !important;
          align-items: start !important;
          gap: 12px !important;
          min-height: 170px !important;
        }

        .charity-projects-page .report-card-icon {
          width: 42px !important;
          height: 42px !important;
          border-radius: 14px !important;
          display: grid !important;
          place-items: center !important;
          background: rgba(29, 140, 255, .10) !important;
          color: var(--sfm-primary) !important;
        }

        .charity-projects-page .report-option-card.charity-report-card button {
          grid-column: 1 / -1 !important;
          justify-self: start !important;
          padding-inline: 14px !important;
        }

        .charity-projects-page .impact-report-card label,
        .charity-projects-page .impact-report-card .impact-lines,
        .charity-projects-page .impact-report-card .muted {
          grid-column: 1 / -1 !important;
        }

        .charity-projects-page .sfm-empty-state.charity-empty-state {
          min-height: 116px !important;
          padding: 16px !important;
          border-radius: 18px !important;
          text-align: center !important;
          border: 1px dashed rgba(29,140,255,.22) !important;
          background: linear-gradient(135deg, rgba(255,255,255,.92), rgba(234,246,255,.68)) !important;
        }

        .charity-projects-page .zakat-premium-grid {
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr) minmax(280px, .78fr) !important;
          gap: 14px !important;
        }

        .charity-projects-page .zakat-panel,
        .charity-projects-page .asset-input-box,
        .charity-projects-page .non-zakat-box,
        .charity-projects-page .manual-price-box,
        .charity-projects-page .result-grid div,
        .charity-projects-page .price-card {
          border-radius: 18px !important;
          min-width: 0 !important;
        }

        .charity-projects-page .form-grid {
          gap: 12px !important;
        }

        .charity-projects-page .form-grid input,
        .charity-projects-page .form-grid select,
        .charity-projects-page .form-grid textarea,
        .charity-projects-page .document-tools input,
        .charity-projects-page .document-tools select,
        .charity-projects-page .report-toolbar select {
          min-height: 44px !important;
          border-radius: 13px !important;
        }

        .charity-projects-page [dir='ltr'],
        .charity-projects-page :is(code, .ticker, .symbol) {
          direction: ltr !important;
          unicode-bidi: isolate !important;
        }

        .dark .charity-projects-page :is(.warm-card, .summary-card, .project-card, .beneficiary-card, .contributor-card, .document-card, .organization-card, .report-option-card, .reminder-card, .season-card, .alert-panel, .impact-panel, .template-card) {
          background: linear-gradient(180deg, rgba(16,47,82,.90), rgba(8,24,42,.94)) !important;
          border-color: rgba(167,243,240,.14) !important;
          box-shadow: 0 14px 34px rgba(0,0,0,.20) !important;
        }

        .dark .charity-projects-page .page-section-tabs.charity-tabs {
          background: linear-gradient(135deg, rgba(8,24,42,.94), rgba(16,47,82,.86)) !important;
          border-color: rgba(167,243,240,.14) !important;
        }

        .dark .charity-projects-page .page-section-tabs.charity-tabs button {
          background: rgba(10,20,34,.72) !important;
          border-color: rgba(167,243,240,.12) !important;
          color: var(--sfm-body) !important;
        }

        .dark .charity-projects-page .page-section-tabs.charity-tabs button.active {
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-primary-dark)) !important;
          color: #fff !important;
        }

        .dark .charity-projects-page .charity-action-button.ghost {
          background: rgba(8,24,42,.76) !important;
          color: var(--sfm-heading) !important;
          border-color: rgba(167,243,240,.18) !important;
        }

        .dark .charity-projects-page :is(.section-head h2, .charity-section-header h2, .project-card strong, .beneficiary-card strong, .contributor-card strong, .document-card strong, .report-option-card strong, .summary-card strong) {
          color: var(--sfm-heading) !important;
        }

        .dark .charity-projects-page :is(.section-head p, .charity-section-header p, .muted, .document-card small, .report-option-card p) {
          color: var(--sfm-body) !important;
        }

        @media (min-width: 1025px) {
          .charity-projects-page .sfm-dashboard-page-shell {
            width: auto !important;
            max-width: none !important;
            margin-inline-start: var(--sidebar-w) !important;
            margin-inline-end: 0 !important;
            padding-inline: clamp(22px, 2.4vw, 36px) !important;
          }
        }

        @media (max-width: 1260px) {
          .charity-projects-page .summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }

          .charity-projects-page .charity-overview-grid,
          .charity-projects-page .zakat-premium-grid {
            grid-template-columns: 1fr !important;
          }

          .charity-projects-page .guidance-panel {
            grid-column: 1 / -1 !important;
          }
        }

        @media (max-width: 920px) {
          .charity-projects-page .sfm-dashboard-page-content.charity-projects-content {
            max-inline-size: min(100%, calc(100vw - 24px)) !important;
          }

          .charity-projects-page .summary-grid,
          .charity-projects-page .beneficiary-stats,
          .charity-projects-page .impact-summary-grid,
          .charity-projects-page .status-metric-grid,
          .charity-projects-page .money-row,
          .charity-projects-page .result-grid,
          .charity-projects-page .price-status-grid,
          .charity-projects-page .document-tools,
          .charity-projects-page .document-tools-two,
          .charity-projects-page .report-toolbar,
          .charity-projects-page .report-card,
          .charity-projects-page .document-card {
            grid-template-columns: 1fr !important;
          }

          .charity-projects-page .report-toolbar .section-actions {
            justify-content: flex-start !important;
          }

          .charity-projects-page .page-section-tabs.charity-tabs {
            display: flex !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
          }

          .charity-projects-page .page-section-tabs.charity-tabs button {
            flex: 0 0 auto !important;
            min-width: 142px !important;
          }
        }

        @media (max-width: 560px) {
          .charity-projects-page .sfm-dashboard-page-content.charity-projects-content {
            max-inline-size: min(100%, calc(100vw - 18px)) !important;
            gap: 14px !important;
          }

          .charity-projects-page .cp-hero {
            padding: 18px !important;
            border-radius: 22px !important;
          }

          .charity-projects-page .hero-actions,
          .charity-projects-page .section-actions,
          .charity-projects-page .card-actions,
          .charity-projects-page .document-actions {
            display: grid !important;
            grid-template-columns: 1fr !important;
            width: 100% !important;
          }

          .charity-projects-page :is(.charity-action-button, .mini-gold, .ghost-btn, .dark-btn, .gold-btn, .primary-wide, .card-actions button, .document-actions button, .doc-count-btn) {
            width: 100% !important;
            white-space: normal !important;
          }

          .charity-projects-page .summary-grid,
          .charity-projects-page .form-grid {
            grid-template-columns: 1fr !important;
          }

          .charity-projects-page :is(.section-head, .charity-section-header, .vault-head) {
            display: grid !important;
          }

          .charity-projects-page .charity-section-icon {
            order: -1 !important;
          }
        }
      `}</style>
      <style jsx global>{`
        /* Charity projects visual polish v20260701 */
        .charity-projects-page {
          --charity-ink: #062033;
          --charity-emerald: #0F766E;
          --charity-mint: #2DD4BF;
          --charity-gold: #D4A037;
          --charity-paper: rgba(255, 255, 255, .94);
          background:
            radial-gradient(circle at 82% 4%, rgba(15, 118, 110, .14), transparent 30%),
            radial-gradient(circle at 14% 18%, rgba(212, 160, 55, .12), transparent 26%),
            linear-gradient(145deg, #ECF8F6 0%, #F7FBFF 48%, #EEF6FF 100%) !important;
        }

        .charity-projects-page::before {
          content: "";
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(15, 118, 110, .055) 1px, transparent 1px),
            linear-gradient(180deg, rgba(29, 140, 255, .045) 1px, transparent 1px);
          background-size: 52px 52px;
          mask-image: linear-gradient(180deg, rgba(0,0,0,.72), transparent 72%);
        }

        .charity-projects-page .sfm-dashboard-page-shell,
        .charity-projects-page .sfm-dashboard-page-content.charity-projects-content {
          position: relative !important;
          z-index: 1 !important;
        }

        @media (min-width: 1025px) {
          .charity-projects-page .sfm-dashboard-page-shell {
            --charity-sidebar-safe: var(--sidebar-w, 220px);
            --charity-page-gutter: clamp(22px, 2.4vw, 42px);
            width: calc(100vw - var(--charity-sidebar-safe)) !important;
            max-width: calc(100vw - var(--charity-sidebar-safe)) !important;
            margin-inline-start: var(--charity-sidebar-safe) !important;
            margin-inline-end: 0 !important;
            padding-inline: var(--charity-page-gutter) !important;
          }

          .charity-projects-page .sfm-dashboard-page-content.charity-projects-content {
            max-inline-size: min(1520px, 100%) !important;
          }
        }

        .charity-projects-page .sfm-dashboard-page-content.charity-projects-content {
          gap: clamp(16px, 1.65vw, 24px) !important;
        }

        .charity-projects-page .cp-hero {
          min-height: 178px !important;
          align-items: center !important;
          padding: clamp(22px, 2.4vw, 34px) !important;
          border-radius: 28px !important;
          border: 1px solid rgba(167, 243, 240, .24) !important;
          background:
            linear-gradient(135deg, rgba(6, 32, 51, .96), rgba(8, 50, 77, .92) 54%, rgba(15, 118, 110, .86)),
            radial-gradient(circle at 12% 18%, rgba(45, 212, 191, .24), transparent 30%) !important;
          box-shadow: 0 26px 68px rgba(6, 32, 51, .22) !important;
        }

        .charity-projects-page .cp-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(120deg, transparent 0 42%, rgba(255,255,255,.12) 46%, transparent 52%),
            radial-gradient(circle at 90% 18%, rgba(212, 160, 55, .22), transparent 24%);
          opacity: .82;
        }

        .charity-projects-page .cp-hero h1 {
          font-size: clamp(36px, 3.1vw, 52px) !important;
          line-height: 1.08 !important;
          color: #FFFFFF !important;
        }

        .charity-projects-page .cp-hero p {
          max-width: 760px !important;
          color: rgba(236, 253, 245, .88) !important;
        }

        .charity-projects-page .cp-hero span {
          color: #D7FFFA !important;
          background: rgba(255,255,255,.10) !important;
          border-color: rgba(167,243,240,.24) !important;
        }

        .charity-projects-page .hero-actions {
          max-width: 640px !important;
          justify-content: flex-start !important;
        }

        .charity-projects-page .charity-action-button,
        .charity-projects-page .mini-gold,
        .charity-projects-page .ghost-btn,
        .charity-projects-page .primary-wide,
        .charity-projects-page .card-actions button,
        .charity-projects-page .document-actions button,
        .charity-projects-page .report-option-card button {
          border-radius: 14px !important;
          box-shadow:
            0 12px 26px rgba(6, 32, 51, .10),
            inset 0 1px 0 rgba(255,255,255,.28) !important;
        }

        .charity-projects-page .charity-action-button.primary,
        .charity-projects-page .mini-gold,
        .charity-projects-page .primary-wide,
        .charity-projects-page .report-option-card button {
          background: linear-gradient(135deg, #16AFA3, #1D8CFF) !important;
          color: #FFFFFF !important;
        }

        .charity-projects-page .charity-action-button.secondary {
          background: rgba(255, 255, 255, .13) !important;
          color: #FFFFFF !important;
        }

        .charity-projects-page .summary-grid {
          gap: 14px !important;
        }

        .charity-projects-page .summary-card.charity-stat-card {
          min-height: 112px !important;
          padding: 16px !important;
          border-radius: 20px !important;
          background:
            linear-gradient(180deg, rgba(255,255,255,.98), rgba(247,252,251,.94)) !important;
          box-shadow: 0 16px 36px rgba(6, 32, 51, .075) !important;
        }

        .charity-projects-page .summary-card.charity-stat-card::before,
        .charity-projects-page .impact-summary-grid div::before,
        .charity-projects-page .impact-panel::before {
          background: linear-gradient(90deg, var(--charity-emerald), var(--charity-mint), var(--charity-gold)) !important;
        }

        .charity-projects-page .summary-card.charity-stat-card span {
          background: linear-gradient(135deg, rgba(15,118,110,.12), rgba(212,160,55,.14)) !important;
          color: var(--charity-emerald) !important;
        }

        .charity-projects-page .page-section-tabs.charity-tabs {
          padding: 7px !important;
          border-radius: 20px !important;
          background: rgba(255,255,255,.78) !important;
          border-color: rgba(15,118,110,.14) !important;
          backdrop-filter: blur(16px) !important;
        }

        .charity-projects-page .page-section-tabs.charity-tabs button.active {
          background: linear-gradient(135deg, #0F766E, #1D8CFF) !important;
          color: #FFFFFF !important;
        }

        .charity-projects-page :is(.warm-card, .project-card, .beneficiary-card, .contributor-card, .document-card, .organization-card, .report-option-card, .reminder-card, .season-card, .alert-panel, .impact-panel, .template-card) {
          border-color: rgba(15, 118, 110, .12) !important;
          background: linear-gradient(180deg, var(--charity-paper), rgba(248,252,251,.9)) !important;
          box-shadow: 0 18px 44px rgba(6, 32, 51, .07) !important;
        }

        .charity-projects-page #impact-dashboard {
          gap: clamp(14px, 1.4vw, 20px) !important;
          overflow: hidden !important;
        }

        .charity-projects-page #impact-dashboard > .section-head {
          padding: 4px 2px 2px !important;
          align-items: center !important;
        }

        .charity-projects-page #impact-dashboard > .section-head svg {
          width: 46px !important;
          height: 46px !important;
          padding: 11px !important;
          border-radius: 16px !important;
          background: linear-gradient(135deg, rgba(15,118,110,.13), rgba(212,160,55,.12)) !important;
          border: 1px solid rgba(15,118,110,.14) !important;
          color: var(--charity-emerald) !important;
        }

        .charity-projects-page .impact-summary-grid {
          grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
          gap: 10px !important;
          margin-bottom: 0 !important;
        }

        .charity-projects-page .impact-summary-grid div {
          position: relative !important;
          min-height: 96px !important;
          padding: 15px !important;
          align-content: space-between !important;
          overflow: hidden !important;
        }

        .charity-projects-page .impact-summary-grid div::before,
        .charity-projects-page .impact-panel::before {
          content: "";
          position: absolute;
          inset-inline: 0;
          inset-block-start: 0;
          height: 3px;
          opacity: .72;
        }

        .charity-projects-page .impact-summary-grid small,
        .charity-projects-page .ratio-grid small,
        .charity-projects-page .money-row small,
        .charity-projects-page .beneficiary-stats small {
          color: #0F766E !important;
        }

        .charity-projects-page .impact-summary-grid strong {
          font-size: clamp(17px, 1.05vw, 21px) !important;
          color: var(--charity-ink) !important;
        }

        .charity-projects-page .impact-layout {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 12px !important;
          margin-top: 0 !important;
        }

        .charity-projects-page .impact-panel {
          position: relative !important;
          padding: 16px !important;
          border-radius: 18px !important;
          overflow: hidden !important;
        }

        .charity-projects-page .impact-panel h3 {
          margin-bottom: 10px !important;
          font-size: 17px !important;
        }

        .charity-projects-page .impact-lines {
          gap: 8px !important;
        }

        .charity-projects-page .impact-lines p,
        .charity-projects-page .ratio-grid div,
        .charity-projects-page .project-impact-card,
        .charity-projects-page .metric-chip-row span {
          border-color: rgba(15,118,110,.12) !important;
          background: rgba(255,255,255,.72) !important;
        }

        .charity-projects-page .impact-bar-row {
          grid-template-columns: minmax(86px, .72fr) minmax(0, 1fr) minmax(112px, .68fr) !important;
        }

        .charity-projects-page .impact-bar-row i,
        .charity-projects-page .progress {
          background: rgba(15,118,110,.10) !important;
        }

        .charity-projects-page .impact-bar-row b,
        .charity-projects-page .progress i {
          background: linear-gradient(90deg, #0F766E, #2DD4BF, #D4A037) !important;
        }

        .charity-projects-page .project-impact-grid {
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)) !important;
        }

        .charity-projects-page .form-grid input,
        .charity-projects-page .form-grid select,
        .charity-projects-page .form-grid textarea,
        .charity-projects-page .impact-input input,
        .charity-projects-page .document-tools input,
        .charity-projects-page .document-tools select,
        .charity-projects-page .report-toolbar select {
          border-color: rgba(15,118,110,.18) !important;
          background: rgba(255,255,255,.92) !important;
        }

        .charity-projects-page .form-grid input:focus,
        .charity-projects-page .form-grid select:focus,
        .charity-projects-page .form-grid textarea:focus,
        .charity-projects-page .impact-input input:focus {
          border-color: #2DD4BF !important;
          box-shadow: 0 0 0 3px rgba(45,212,191,.18) !important;
        }

        @media (max-width: 1320px) {
          .charity-projects-page .impact-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 920px) {
          .charity-projects-page .impact-summary-grid,
          .charity-projects-page .impact-layout {
            grid-template-columns: 1fr !important;
          }

          .charity-projects-page .impact-bar-row {
            grid-template-columns: 1fr !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .charity-projects-page *,
          .charity-projects-page *::before,
          .charity-projects-page *::after {
            transition-duration: .01ms !important;
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
          }
        }

        .dark .charity-projects-page {
          background:
            radial-gradient(circle at 82% 4%, rgba(45, 212, 191, .13), transparent 30%),
            radial-gradient(circle at 18% 16%, rgba(212, 160, 55, .09), transparent 28%),
            linear-gradient(145deg, #06111F 0%, #071B2F 58%, #061A2E 100%) !important;
        }

        .dark .charity-projects-page :is(.warm-card, .summary-card, .project-card, .beneficiary-card, .contributor-card, .document-card, .organization-card, .report-option-card, .reminder-card, .season-card, .alert-panel, .impact-panel, .template-card) {
          background: linear-gradient(180deg, rgba(13,42,62,.94), rgba(8,24,42,.92)) !important;
          border-color: rgba(167,243,240,.13) !important;
        }

        .dark .charity-projects-page .impact-summary-grid strong,
        .dark .charity-projects-page .summary-card.charity-stat-card strong {
          color: var(--sfm-heading) !important;
        }
      `}</style>
    </>
  );
}
