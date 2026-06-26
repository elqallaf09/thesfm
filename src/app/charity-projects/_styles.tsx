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

        .charity-projects-page .sfm-dashboard-page-content.charity-projects-content {
          width: 100%;
          max-inline-size: min(1440px, 100%);
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

        .charity-projects-page .page-section-tabs.charity-tabs {
          gap: 8px;
          padding: 8px;
          border-radius: 20px;
          scroll-padding-inline: 12px;
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
          grid-column: 1 / -1;
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
        .dark .charity-projects-page .modal .privacy-note {
          background: rgba(10, 20, 34, .72);
          border-color: #1D3050;
          color: var(--sfm-body);
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
      `}</style>
    </>
  );
}
