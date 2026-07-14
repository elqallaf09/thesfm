'use client';

import { useId } from 'react';
import { ArrowLeft, ChevronDown, CheckCircle2, CircleDollarSign, ListChecks, Plus, type LucideIcon } from 'lucide-react';

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
    currency: {bg:'var(--primary-soft)',color:'var(--primary)'},
    income: {bg:'var(--success-soft)',color:'var(--success)'},
    saving: {bg:'var(--warning-soft)',color:'var(--warning)'},
    count: {bg:'var(--info-soft)',color:'var(--info)'},
    remaining: {bg:'var(--accent-soft)',color:'var(--accent)'},
  };
  const ic = iconColors[tone] ?? iconColors.count;
  return (
    <article style={{display:'grid',gridTemplateColumns:'auto minmax(0,1fr)',gap:'12px',alignItems:'start',border:'1px solid var(--border)',background:'var(--surface)',borderRadius:'var(--radius-card)',padding:'15px',minWidth:0,minHeight:'100px',boxShadow:'var(--shadow-xs)'}}>
      <div style={{width:'40px',height:'40px',borderRadius:'var(--radius-control)',display:'grid',placeItems:'center',background:ic.bg,color:ic.color,flexShrink:0}} aria-hidden="true">
        <Icon size={18} />
      </div>
      <div style={{minWidth:0}}>
        <small style={{display:'block',color:'var(--foreground-secondary)',fontSize:'12px',fontWeight:700,lineHeight:1.35}}>{label}</small>
        <strong style={{display:'block',marginTop:'5px',color:'var(--foreground)',fontSize:'clamp(17px,1.8vw,22px)',lineHeight:1.18,fontWeight:700,overflowWrap:'anywhere'}}>{value}</strong>
        <p style={{margin:'5px 0 0',color:'var(--foreground-secondary)',fontSize:'12px',fontWeight:700,lineHeight:1.5}}>{description}</p>
      </div>
    </article>
  );
}

export function ReportCard({ icon: Icon, title, value, detail }: { icon: LucideIcon; title: string; value: string; detail: string }) {
  return (
    <article style={{display:'grid',gridTemplateColumns:'auto minmax(0,1fr)',gap:'12px',alignItems:'start',border:'1px solid var(--border)',background:'var(--surface)',borderRadius:'var(--radius-card)',padding:'14px',boxShadow:'var(--shadow-xs)'}}>
      <div style={{width:'38px',height:'38px',borderRadius:'var(--radius-control)',display:'grid',placeItems:'center',background:'var(--primary-soft)',color:'var(--primary)',flexShrink:0}} aria-hidden="true">
        <Icon size={18} />
      </div>
      <div style={{minWidth:0}}>
        <small style={{display:'block',color:'var(--foreground-secondary)',fontSize:'12px',fontWeight:700}}>{title}</small>
        <strong style={{display:'block',marginTop:'4px',color:'var(--foreground)',fontSize:'clamp(16px,1.6vw,20px)',fontWeight:700,overflowWrap:'anywhere'}}>{value}</strong>
        <p style={{margin:'4px 0 0',color:'var(--foreground-secondary)',fontSize:'12px',lineHeight:1.5}}>{detail}</p>
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
        .setup-stepper li{flex:1 1 170px;min-width:0;display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-areas:"icon title" "icon state";align-items:center;gap:3px 8px;border:1px solid var(--border);background:var(--surface);color:var(--foreground-secondary);border-radius:var(--radius-card);padding:9px 11px;font-weight:500;font-size:12px;transition:background var(--duration) var(--ease),border-color var(--duration) var(--ease),box-shadow var(--duration) var(--ease),transform var(--duration) var(--ease)}
        .setup-stepper li.active{background:var(--primary-soft);color:var(--primary-active);border-color:var(--primary);box-shadow:var(--active-indicator-inline-start)}
        .setup-stepper li.done{background:var(--success-soft);color:var(--success);border-color:color-mix(in srgb,var(--success) 28%,var(--border))}
        .setup-stepper li.upcoming{background:var(--surface)}
        .setup-stepper span{grid-area:icon;width:28px;height:28px;border-radius:var(--radius-pill);background:var(--primary-soft);display:grid;place-items:center;flex:0 0 auto;color:var(--primary)}
        .setup-stepper li.active span{background:var(--primary);color:var(--primary-foreground)}
        .setup-stepper li.done span{background:var(--success);color:var(--foreground-inverse)}
        .setup-stepper b{grid-area:title;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.25}
        .setup-stepper em{grid-area:state;font-style:normal;font-size:12px;font-weight:500;color:inherit;line-height:1.15}
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
          border: 1px solid var(--border);
          background: var(--surface);
          border-radius: var(--radius-panel);
          padding: clamp(22px,4vw,34px);
          box-shadow: var(--shadow-card);
          min-width: 0;
          overflow: hidden;
        }
        .income-decision-icon {
          width: 76px; height: 76px; border-radius: var(--radius-pill);
          display: grid; place-items: center;
          background: var(--primary-soft);
          border: 1px solid color-mix(in srgb,var(--primary) 24%,var(--border));
          color: var(--primary);
          box-shadow: var(--shadow-xs);
        }
        .income-decision-copy { display: grid; gap: 10px; max-width: 620px; }
        .income-decision-copy h3 { margin: 0; color: var(--foreground); font-size: clamp(24px,3.5vw,34px); line-height: 1.25; font-weight: 700; }
        .income-decision-copy p { margin: 0; color: var(--foreground-secondary); font-size: 15px; font-weight: 400; line-height: 1.9; }
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
          width: 100%; min-height: 52px; border-radius: var(--radius-control); padding: 0 22px;
          font: 600 15px var(--font-ui);
          display: inline-flex; align-items: center; justify-content: center; gap: 10px;
          cursor: pointer; white-space: nowrap; min-width: 0;
          border: 1px solid var(--primary);
          background: var(--primary);
          color: var(--primary-foreground);
          box-shadow: var(--shadow-sm);
          transition: transform var(--duration) var(--ease), box-shadow var(--duration) var(--ease), background var(--duration) var(--ease), border-color var(--duration) var(--ease);
        }
        .income-action-btn:hover { transform: translateY(-2px); background:var(--primary-hover); border-color:var(--primary-hover); box-shadow:var(--shadow-md); }
        .income-action-btn:active { transform: translateY(0) scale(.985); }
        .income-action-btn:focus-visible,.income-skip-link:focus-visible { outline:3px solid var(--focus-ring); outline-offset:3px; }
        .income-skip-link {
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          background: none; border: none; padding: 6px 12px; border-radius: var(--radius-sm);
          font: 600 13px var(--font-ui);
          color: var(--foreground-secondary);
          cursor: pointer; transition: color .18s, background .18s; white-space: nowrap;
        }
        .income-skip-link:hover { color: var(--primary); background: var(--primary-soft); }
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
    minHeight: '48px', borderRadius: 'var(--radius-control)', padding: '0 22px',
    fontSize: '15px', fontWeight: 600, cursor: 'pointer',
    fontFamily: 'var(--font-ui)', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', transition: 'all .18s ease',
    whiteSpace: 'nowrap',
  };
  const activeStyle: React.CSSProperties = {
    ...base,
    background: 'var(--primary)',
    color: 'var(--primary-foreground)', border: '1px solid var(--primary)',
    boxShadow: 'var(--shadow-sm)',
  };
  const inactiveStyle: React.CSSProperties = {
    ...base,
    background: 'var(--surface)', color: 'var(--foreground)',
    border: '1px solid var(--border-strong)',
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
