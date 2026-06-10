'use client';

import { useId } from 'react';
import { ArrowLeft, ChevronDown, CheckCircle2, CircleDollarSign, Plus, type LucideIcon } from 'lucide-react';

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export function ProgressPanel({
  step,
  progress,
  steps,
  statuses,
  labels,
}: {
  step: Step;
  progress: number;
  steps: readonly string[];
  statuses: Record<Step, 'completed' | 'current' | 'optional' | 'missing' | 'skipped'>;
  labels: {
    title: string;
    subtitle: string;
    complete: string;
    listTitle: string;
    completed: string;
    current: string;
    upcoming: string;
    optional: string;
  };
}) {
  const optionalSteps = new Set<Step>([5, 6, 7]);
  return (
    <section className="progress-panel">
      <div className="progress-panel-head">
        <ListChecks size={18} aria-hidden="true" />
        <div>
          <h3>{labels.title}</h3>
          <p>{labels.subtitle}</p>
        </div>
      </div>
      <div className="progress-panel-meter">
        <strong>{step === 8 ? labels.complete : `${progress}%`}</strong>
        <span aria-hidden="true"><i style={{ width: `${progress}%` }} /></span>
      </div>
      <details className="progress-details" open={step !== 8}>
        <summary>
          <span>{labels.listTitle}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </summary>
        <ol>
          {steps.map((label, index) => {
            const stepId = index as Step;
            const isDone = step === 8 ? true : statuses[stepId] === 'completed' || statuses[stepId] === 'skipped';
            const isActive = step === stepId;
            const statusText = isDone ? labels.completed : isActive ? labels.current : labels.upcoming;
            return (
              <li className={`${isDone ? 'done' : ''} ${isActive ? 'active' : ''} ${optionalSteps.has(stepId) ? 'optional' : ''}`} key={label}>
                <span className="progress-row-icon">
                  {isDone ? <CheckCircle2 size={14} /> : <span>{index + 1}</span>}
                </span>
                <b>{label}</b>
                <small>{statusText}</small>
                {optionalSteps.has(stepId) && <em>{labels.optional}</em>}
              </li>
            );
          })}
        </ol>
      </details>
    </section>
  );
}

export function SummaryCard({
  icon: Icon,
  label,
  value,
  description,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  description: string;
  tone: 'currency' | 'income' | 'remaining' | 'saving' | 'count';
}) {
  const iconColors: Record<string, {bg:string;color:string}> = {
    currency: {bg:'#EEF2FF',color:'#3730A3'},
    income: {bg:'#ECFDF5',color:'#047857'},
    saving: {bg:'#FFFBEB',color:'#B45309'},
    count: {bg:'rgba(29,140,255,.10)',color:'var(--sfm-primary)'},
    remaining: {bg:'rgba(24,212,212,.12)',color:'#0E7490'},
  };
  const ic = iconColors[tone] ?? iconColors.count;
  return (
    <article style={{display:'grid',gridTemplateColumns:'auto minmax(0,1fr)',gap:'12px',alignItems:'start',border:'1px solid rgba(29,140,255,.10)',background:'linear-gradient(180deg,#FFFFFF,#F8FBFF)',borderRadius:'18px',padding:'15px',minWidth:0,minHeight:'100px',boxShadow:'0 8px 22px rgba(3,18,37,.05)'}}>
      <div style={{width:'40px',height:'40px',borderRadius:'13px',display:'grid',placeItems:'center',background:ic.bg,color:ic.color,flexShrink:0}} aria-hidden="true">
        <Icon size={18} />
      </div>
      <div style={{minWidth:0}}>
        <small style={{display:'block',color:'var(--sfm-muted-readable)',fontSize:'11px',fontWeight:950,lineHeight:1.35}}>{label}</small>
        <strong style={{display:'block',marginTop:'5px',color:'var(--sfm-midnight)',fontSize:'clamp(17px,1.8vw,22px)',lineHeight:1.18,fontWeight:950,overflowWrap:'anywhere'}}>{value}</strong>
        <p style={{margin:'5px 0 0',color:'var(--sfm-muted-readable)',fontSize:'11px',fontWeight:820,lineHeight:1.5}}>{description}</p>
      </div>
    </article>
  );
}

export function ReportCard({ icon: Icon, title, value, detail }: { icon: LucideIcon; title: string; value: string; detail: string }) {
  return (
    <article style={{display:'grid',gridTemplateColumns:'auto minmax(0,1fr)',gap:'12px',alignItems:'start',border:'1px solid rgba(29,140,255,.10)',background:'linear-gradient(180deg,#FFFFFF,#F8FBFF)',borderRadius:'16px',padding:'14px',boxShadow:'0 6px 18px rgba(3,18,37,.05)'}}>
      <div style={{width:'38px',height:'38px',borderRadius:'12px',display:'grid',placeItems:'center',background:'rgba(29,140,255,.08)',color:'var(--sfm-primary)',flexShrink:0}} aria-hidden="true">
        <Icon size={18} />
      </div>
      <div style={{minWidth:0}}>
        <small style={{display:'block',color:'var(--sfm-muted-readable)',fontSize:'11px',fontWeight:950}}>{title}</small>
        <strong style={{display:'block',marginTop:'4px',color:'var(--sfm-midnight)',fontSize:'clamp(16px,1.6vw,20px)',fontWeight:950,overflowWrap:'anywhere'}}>{value}</strong>
        <p style={{margin:'4px 0 0',color:'var(--sfm-muted-readable)',fontSize:'11px',lineHeight:1.5}}>{detail}</p>
      </div>
    </article>
  );
}

export function Stepper({
  step,
  steps,
  statuses,
  ariaLabel,
  labels,
}: {
  step: number;
  steps: readonly string[];
  statuses: Record<Step, 'completed' | 'current' | 'optional' | 'missing' | 'skipped'>;
  ariaLabel: string;
  labels: { completed: string; current: string; upcoming: string };
}) {
  return (
    <ol className="setup-stepper" aria-label={ariaLabel}>
      {steps.map((item, index) => {
        const status = statuses[index as Step];
        const state = status === 'completed' ? 'done' : index === step ? 'active' : 'upcoming';
        const stateLabel = state === 'done' ? labels.completed : state === 'active' ? labels.current : labels.upcoming;
        return (
          <li key={item} className={state} aria-current={index === step ? 'step' : undefined}>
            <span>{index < step ? <CheckCircle2 size={14} aria-hidden="true" /> : index + 1}</span>
            <b>{item}</b>
            <em>{stateLabel}</em>
          </li>
        );
      })}
      <style jsx>{`
        .setup-stepper{display:flex;flex-wrap:wrap;gap:9px;overflow-x:visible;padding:2px 2px 16px;margin:0 0 18px;list-style:none;scrollbar-width:none;max-width:100%;min-width:0}
        .setup-stepper::-webkit-scrollbar{display:none}
        .setup-stepper li{flex:1 1 170px;min-width:0;display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-areas:"icon title" "icon state";align-items:center;gap:3px 8px;border:1px solid rgba(29,140,255,.14);background:var(--sfm-light-card);color:var(--sfm-muted-readable);border-radius:18px;padding:9px 11px;font-weight:900;font-size:12px;transition:background .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease}
        .setup-stepper li.active{background:linear-gradient(135deg,var(--sfm-primary-dark),var(--sfm-card-dark));color:#FFFFFF;border-color:rgba(167,243,240,.30);box-shadow:0 12px 28px rgba(29,140,255,.18),inset 0 -2px 0 rgba(24,212,212,.50)}
        .setup-stepper li.done{background:#ECFDF5;color:#047857;border-color:rgba(16,185,129,.22)}
        .setup-stepper li.upcoming{background:#FFFFFF}
        .setup-stepper span{grid-area:icon;width:28px;height:28px;border-radius:999px;background:rgba(29,140,255,.13);display:grid;place-items:center;flex:0 0 auto;color:var(--sfm-primary-dark)}
        .setup-stepper li.active span{background:rgba(234,246,255,.14);color:var(--sfm-soft-cyan)}
        .setup-stepper li.done span{background:#D1FAE5;color:#047857}
        .setup-stepper b{grid-area:title;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.25}
        .setup-stepper em{grid-area:state;font-style:normal;font-size:10px;font-weight:950;color:inherit;opacity:.78;line-height:1.15}
        @media(max-width:720px){.setup-stepper{flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;overscroll-behavior-inline:contain;padding-bottom:12px;margin-bottom:14px}.setup-stepper li{flex:0 0 min(78vw,250px)}}
      `}</style>
    </ol>
  );
}

export function IncomeDecisionCard({
  title,
  body,
  primaryLabel,
  secondaryLabel,
  onAdd,
  onSkip,
}: {
  title: string;
  body: string;
  primaryLabel: string;
  secondaryLabel: string;
  onAdd: () => void;
  onSkip: () => void;
}) {
  return (
    <section className="income-decision-card" aria-labelledby="setup-step-title">
      <style jsx>{`
        .income-decision-card {
          display: grid;
          justify-items: center;
          text-align: center;
          gap: 18px;
          border: 1px solid rgba(29,140,255,.16);
          background: linear-gradient(180deg,#FFFFFF,rgba(234,246,255,.72));
          border-radius: 28px;
          padding: clamp(22px,4vw,34px);
          box-shadow: 0 18px 46px rgba(3,18,37,.08);
          min-width: 0;
          overflow: hidden;
        }
        .income-decision-icon {
          width: 76px; height: 76px; border-radius: 999px;
          display: grid; place-items: center;
          background: linear-gradient(135deg,rgba(234,246,255,.95),rgba(24,212,212,.12));
          border: 1px solid rgba(29,140,255,.16);
          color: var(--sfm-primary);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.75), 0 12px 28px rgba(29,140,255,.12);
        }
        .income-decision-copy { display: grid; gap: 10px; max-width: 620px; }
        .income-decision-copy h3 { margin: 0; color: var(--sfm-primary-dark); font-size: clamp(24px,3.5vw,34px); line-height: 1.25; font-weight: 950; }
        .income-decision-copy p { margin: 0; color: var(--sfm-muted-readable); font-size: 15px; font-weight: 850; line-height: 1.9; }
        .income-decision-actions {
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          width: 100%;
          max-width: 340px;
        }
        .income-action-btn {
          width: 100%; min-height: 52px; border-radius: 18px; padding: 0 22px;
          font: 950 15px Tajawal,Arial,sans-serif;
          display: inline-flex; align-items: center; justify-content: center; gap: 10px;
          cursor: pointer; white-space: nowrap; min-width: 0;
          border: 0;
          background: linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));
          color: #FFFFFF;
          box-shadow: 0 18px 38px rgba(29,140,255,.24);
          transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
        }
        .income-action-btn:hover { transform: translateY(-2px); filter: saturate(1.08) brightness(1.04); box-shadow: 0 22px 48px rgba(24,212,212,.30); }
        .income-action-btn:active { transform: translateY(0) scale(.985); }
        .income-skip-link {
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          background: none; border: none; padding: 6px 12px; border-radius: 10px;
          font: 700 13px Tajawal,Arial,sans-serif;
          color: var(--sfm-muted-readable);
          cursor: pointer; transition: color .18s, background .18s; white-space: nowrap;
        }
        .income-skip-link:hover { color: var(--sfm-primary); background: rgba(29,140,255,.07); }
        :global(.dark) .income-decision-card { background: linear-gradient(180deg,#0F1E32,#0B1728); border-color: #1D3050; }
        :global(.dark) .income-decision-icon { background: linear-gradient(135deg,rgba(47,214,192,.18),rgba(29,140,255,.12)); border-color: rgba(47,214,192,.24); color: #8EEAE5; }
        :global(.dark) .income-decision-copy h3 { color: #F8FBFF; }
        :global(.dark) .income-decision-copy p { color: #C7D3E1; }
        :global(.dark) .income-action-btn { color: #061A2E; box-shadow: 0 18px 38px rgba(47,214,192,.20); }
        :global(.dark) .income-skip-link { color: #8A9DB5; }
        :global(.dark) .income-skip-link:hover { color: #8EEAE5; background: rgba(47,214,192,.10); }
      `}</style>
      <div className="income-decision-icon" aria-hidden="true">
        <CircleDollarSign size={30} />
      </div>
      <div className="income-decision-copy">
        <h3 id="setup-step-title">{title}</h3>
        <p>{body}</p>
      </div>
      <div className="income-decision-actions">
        <button
          type="button"
          className="income-action-btn"
          onClick={onAdd}
        >
          <Plus size={18} aria-hidden="true" />
          <span>{primaryLabel}</span>
        </button>
        <button
          type="button"
          className="income-skip-link"
          onClick={onSkip}
        >
          <span>{secondaryLabel}</span>
          <ArrowLeft size={15} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

export function RecurringIncomeToggle({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  const labelId = useId();
  const descriptionId = useId();

  return (
    <div className="recurring-income-card">
      <div className="recurring-income-copy">
        <strong id={labelId}>{label}</strong>
        <p id={descriptionId}>{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        className={checked ? 'recurring-income-switch active' : 'recurring-income-switch'}
        onClick={() => onChange(!checked)}
      >
        <span aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToggleRow({
  active,
  setActive,
  yes,
  no,
}: {
  active: boolean;
  setActive: (value: boolean) => void;
  yes: string;
  no: string;
}) {
  const base: React.CSSProperties = {
    minHeight: '48px', borderRadius: '14px', padding: '0 22px',
    fontSize: '15px', fontWeight: 900, cursor: 'pointer',
    fontFamily: 'Tajawal, Arial, sans-serif', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', transition: 'all .18s ease',
    whiteSpace: 'nowrap',
  };
  const activeStyle: React.CSSProperties = {
    ...base,
    background: 'linear-gradient(135deg, #0b76e0, #18d4d4)',
    color: '#fff', border: '1px solid transparent',
    boxShadow: '0 4px 14px rgba(11,118,224,.25)',
  };
  const inactiveStyle: React.CSSProperties = {
    ...base,
    background: 'rgba(255,255,255,0.7)', color: 'var(--sfm-foreground)',
    border: '1px solid rgba(29,140,255,.22)',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
      <button type="button" style={active ? activeStyle : inactiveStyle} onClick={() => setActive(true)} aria-pressed={active}>{yes}</button>
      <button type="button" style={!active ? activeStyle : inactiveStyle} onClick={() => setActive(false)} aria-pressed={!active}>{no}</button>
    </div>
  );
}

export function ExistingDataCard({
  title,
  value,
  hint,
  confirmLabel,
  editLabel,
  onConfirm,
  onEdit,
}: {
  title: string;
  value: string;
  hint: string;
  confirmLabel: string;
  editLabel: string;
  onConfirm: () => void;
  onEdit: () => void;
}) {
  return (
    <article className="existing-data-card">
      <CheckCircle2 size={22} aria-hidden="true" />
      <div>
        <h3>{title}</h3>
        <strong>{value}</strong>
        <p>{hint}</p>
      </div>
      <div className="existing-actions">
        <button type="button" className="primary-btn" onClick={onConfirm}>{confirmLabel}</button>
        <button type="button" className="ghost-btn" onClick={onEdit}>{editLabel}</button>
      </div>
    </article>
  );
}

export function Field({ id, label, value, onChange, type = 'text', placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="form-field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        value={value}
        type={type}
        min={type === 'number' ? '0' : undefined}
        step={type === 'number' ? '0.001' : undefined}
        inputMode={type === 'number' ? 'decimal' : undefined}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  );
}

export function SelectField({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="form-field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={event => onChange(event.target.value)}>
        {options.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
