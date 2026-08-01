import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AppCard } from '@/components/layout/AppCard';

export function SecurityStyles() {
  return (
    <style jsx global>{`
      .security-shell{min-height:100vh;background:var(--background);color:var(--foreground);font-family:var(--font-ui)}
      .security-content{display:grid;gap:22px}
      .sfm-primary-link,.ghost-action,.solid-action,.danger-action{min-height:var(--control-h);display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:var(--radius-pill);padding:0 16px;text-decoration:none;font:600 13px/1.4 var(--font-ui);cursor:pointer;transition:transform var(--duration-fast) var(--ease),box-shadow var(--duration-fast) var(--ease),background-color var(--duration-fast) var(--ease),border-color var(--duration-fast) var(--ease),color var(--duration-fast) var(--ease)}
      .sfm-primary-link,.solid-action{border:1px solid var(--primary);background:var(--primary);color:var(--primary-foreground);box-shadow:var(--shadow-xs)}
      .sfm-primary-link:hover,.solid-action:hover:not(:disabled){border-color:var(--primary-hover);background:var(--primary-hover);color:var(--primary-foreground);box-shadow:var(--shadow-sm);transform:translateY(-1px)}
      .ghost-action{border:1px solid var(--border-strong);background:var(--surface);color:var(--foreground-secondary)}
      .ghost-action:hover:not(:disabled){border-color:color-mix(in srgb,var(--primary) 38%,var(--border));background:var(--surface-hover);color:var(--foreground)}
      .ghost-action.danger{border-color:color-mix(in srgb,var(--danger) 36%,var(--border));background:var(--danger-soft);color:var(--danger)}
      .danger-action{border:1px solid var(--danger);background:var(--danger);color:var(--danger-foreground)}
      .ghost-action.danger:hover:not(:disabled),.danger-action:hover:not(:disabled){border-color:var(--danger);background:var(--danger);color:var(--danger-foreground)}
      .sfm-primary-link:focus-visible,.ghost-action:focus-visible,.solid-action:focus-visible,.danger-action:focus-visible,.security-mail-link:focus-visible,.security-state button:focus-visible,.faq-list summary:focus-visible{outline:2px solid var(--focus-ring);outline-offset:3px}
      .sfm-primary-link:disabled,.ghost-action:disabled,.solid-action:disabled,.danger-action:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}
      .ghost-action.full{width:100%}
      .security-toast,.security-state,.message-inline{border:1px solid color-mix(in srgb,var(--success) 32%,var(--border));background:var(--success-soft);color:var(--success);border-radius:var(--radius-card);padding:12px 14px;font-weight:600}
      .message-inline.danger,.security-state.danger{border-color:color-mix(in srgb,var(--danger) 32%,var(--border));background:var(--danger-soft);color:var(--danger)}
      .security-state{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .security-state button{border:1px solid color-mix(in srgb,var(--danger) 32%,var(--border));border-radius:var(--radius-pill);background:var(--surface);color:var(--danger);padding:8px 12px;font:600 13px/1.4 var(--font-ui);cursor:pointer}
      .security-score-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(320px,.9fr);gap:18px}
      .security-score-card{display:flex;align-items:center;justify-content:space-between;gap:18px;background:var(--surface);color:var(--foreground);border-color:var(--border-strong);box-shadow:var(--shadow-card)}
      .security-kicker{display:inline-flex;align-items:center;gap:8px;color:var(--primary-hover);font-weight:600}
      .security-score-copy{flex:1;display:flex;flex-direction:column;min-width:0}
      .security-score-copy h2{margin:10px 0 0;font-family:var(--font-data);font-size:56px;font-weight:700;line-height:1}
      .security-score-copy p{margin:8px 0 0;color:var(--foreground-secondary);font-weight:500}
      .score-ring{width:128px;height:128px;display:grid;place-items:center;position:relative;flex:0 0 auto}
      .score-ring svg{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg);overflow:visible}
      .score-ring circle{fill:none;stroke-width:10}
      .score-ring-track{stroke:var(--surface-muted)}
      .score-ring-value{stroke:var(--ring-color);stroke-linecap:round}
      .score-ring-label{display:grid;place-items:center;gap:2px;position:relative;z-index:1}
      .score-ring strong{font-family:var(--font-data);font-size:30px;font-weight:700;line-height:1}
      .score-ring small{color:var(--foreground-muted);font-family:var(--font-data);font-size:12px;font-weight:500}
      .security-checks-card h2,.security-section h2{margin:0;color:var(--foreground);font-size:20px;font-weight:600}
      .security-checks-card p,.section-copy{margin:6px 0 0;color:var(--foreground-muted);font-weight:400;line-height:1.7}
      .check-list{display:grid;gap:9px;margin-top:14px}
      .check-row{display:flex;align-items:center;gap:9px;border:1px solid color-mix(in srgb,var(--warning) 30%,var(--border));background:var(--warning-soft);color:var(--warning);border-radius:var(--radius-control);padding:10px 12px;font-weight:600}
      .check-row.done{border-color:color-mix(in srgb,var(--success) 30%,var(--border));background:var(--success-soft);color:var(--success)}
      .security-main-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
      .security-section{display:grid;gap:14px}
      .security-section.wide{grid-column:1/-1}
      .section-head{display:flex;align-items:center;gap:10px}
      .section-head span{width:42px;height:42px;display:grid;place-items:center;border-radius:var(--radius-card);background:var(--primary-soft);color:var(--primary)}
      .control-row{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--radius-panel);padding:14px}
      .control-row strong,.device-card strong,.muted-panel strong,.activity-item strong{display:block;color:var(--foreground);font-size:15px;font-weight:600}
      .control-row p,.device-card p,.muted-panel p,.activity-item p,.danger-note{margin:4px 0 0;color:var(--foreground-muted);font-weight:400;line-height:1.65}
      .danger-note{color:var(--danger)}
      .control-row small,.device-card small{display:block;margin-top:8px;color:var(--foreground-muted);font-weight:500}
      .status-pill{display:inline-flex;width:max-content;margin-top:9px;border-radius:var(--radius-pill);border:1px solid var(--border);background:var(--surface);color:var(--foreground-secondary);padding:5px 10px;font-weight:600;font-size:12px}
      .status-pill.on{background:var(--success-soft);border-color:color-mix(in srgb,var(--success) 32%,var(--border));color:var(--success)}
      .coming-row,.muted-panel{border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--radius-card);padding:12px}
      .coming-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
      .coming-row h3{margin:0;color:var(--foreground);font-size:15px;font-weight:600}
      .coming-row p{margin:4px 0 0;color:var(--foreground-muted);font-weight:400;line-height:1.6}
      .soon-badge{border-radius:var(--radius-pill);background:var(--warning-soft);color:var(--warning);padding:5px 9px;font-weight:600;font-size:12px;white-space:nowrap}
      .device-card{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:start;border:1px solid color-mix(in srgb,var(--info) 30%,var(--border));background:var(--info-soft);border-radius:var(--radius-panel);padding:14px}
      .device-card>svg{color:var(--info)}
      .activity-list{display:grid;gap:10px}
      .activity-item{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start}
      .activity-item>span{width:34px;height:34px;display:grid;place-items:center;border-radius:var(--radius-control);background:var(--success-soft);color:var(--success)}
      .empty-security{display:flex;align-items:center;gap:9px;color:var(--foreground-muted);font-weight:500;border:1px dashed var(--border-strong);border-radius:var(--radius-card);padding:16px}
      .usage-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
      .usage-grid span{display:flex;align-items:center;gap:8px;border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--radius-control);padding:11px 12px;color:var(--foreground);font-weight:500}
      .usage-grid svg{color:var(--success)}
      .no-sale{display:flex;align-items:center;gap:9px;border:1px solid color-mix(in srgb,var(--success) 30%,var(--border));background:var(--success-soft);color:var(--success);border-radius:var(--radius-card);padding:13px;font-weight:600;line-height:1.6}
      .faq-list{display:grid;gap:10px}
      .faq-list details{border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--radius-card);padding:13px}
      .faq-list details[open]{border-color:color-mix(in srgb,var(--primary) 34%,var(--border));background:var(--primary-soft)}
      .faq-list summary{cursor:pointer;color:var(--foreground);font-weight:600}
      .faq-list p{margin:10px 0 0;color:var(--foreground-secondary);font-weight:400;line-height:1.8}
      .security-mail-link{width:max-content;max-width:100%;display:inline-flex;align-items:center;justify-content:center;border-radius:var(--radius-pill);border:1px solid color-mix(in srgb,var(--primary) 32%,var(--border));background:var(--primary-soft);color:var(--primary-hover);padding:10px 14px;text-decoration:none;font:600 13px/1.4 var(--font-ui);overflow-wrap:anywhere}
      .security-mail-link:hover{border-color:var(--primary);background:var(--primary);color:var(--primary-foreground)}
      .security-modal-overlay{position:fixed;inset:0;z-index:90;background:var(--background-overlay);backdrop-filter:blur(8px);display:grid;place-items:center;padding:18px}
      .security-modal{width:min(520px,100%);max-height:calc(100dvh - 36px);overflow:auto;background:var(--surface-elevated);border:1px solid var(--border);border-radius:var(--radius-panel);padding:22px;box-shadow:var(--shadow-popover);display:grid;gap:14px}
      .security-modal.mfa-modal{width:min(620px,100%)}
      .modal-icon{width:48px;height:48px;border-radius:var(--radius-card);display:grid;place-items:center;background:var(--info-soft);color:var(--info)}
      .modal-icon.danger{background:var(--danger-soft);color:var(--danger)}
      .security-modal h2{margin:0;color:var(--foreground);font-size:21px;font-weight:600}
      .security-modal p{margin:0;color:var(--foreground-secondary);font-weight:400;line-height:1.7}
      .security-modal label{display:grid;gap:8px;color:var(--foreground);font-weight:500}
      .security-modal input{height:var(--control-h-lg);border-radius:var(--radius-control);border:1.5px solid var(--border-strong);background:var(--control-background);color:var(--foreground);padding:0 13px;font:500 14px/1.4 var(--font-ui);outline:0;text-align:center;letter-spacing:4px}
      .security-modal input:focus{border-color:var(--focus-ring);box-shadow:var(--focus-shadow)}
      .modal-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}
      .totp-qr{width:190px;height:190px;object-fit:contain;justify-self:center;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);padding:12px}
      .manual-secret{display:grid;gap:7px;border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--radius-card);padding:12px}
      .manual-secret span{font-weight:600;color:var(--foreground)}
      .manual-secret code{direction:ltr;text-align:left;white-space:normal;overflow-wrap:anywhere;color:var(--accent-hover);font:600 13px/1.5 var(--font-data)}
      @media(max-width:900px){.security-score-grid,.security-main-grid{grid-template-columns:1fr}.security-section.wide{grid-column:auto}.security-score-copy h2{font-size:44px}}
      @media(max-width:640px){.security-score-card{display:grid}.score-ring{width:112px;height:112px}.control-row,.coming-row{display:grid}.sfm-primary-link,.ghost-action,.solid-action,.danger-action{width:100%}.modal-actions{display:grid;grid-template-columns:1fr}.security-content{gap:16px}}
    `}</style>
  );
}

export function SecuritySection({ title, icon: Icon, children, wide = false }: { title: string; icon: LucideIcon; children: ReactNode; wide?: boolean }) {
  return (
    <AppCard className={`security-section${wide ? ' wide' : ''}`}>
      <div className="section-head">
        <span><Icon size={20} /></span>
        <h2>{title}</h2>
      </div>
      {children}
    </AppCard>
  );
}

export function ComingSoonRow({ title, body, label }: { title: string; body: string; label: string }) {
  return (
    <div className="coming-row">
      <div>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
      <span className="soon-badge">{label}</span>
    </div>
  );
}
