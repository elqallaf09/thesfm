'use client';

import { Activity, BrainCircuit, CircleAlert, CircleCheck } from 'lucide-react';
import type { EconomicDecisionPresentation } from '@/lib/decisions/economicIntelligencePresentation';

type Props = {
  presentation: EconomicDecisionPresentation;
  money: (value: number) => string;
  labels: {
    title: string;
    confidence: string;
    missing: string;
    forecast: string;
    surplus: string;
    netWorth: string;
    reasons: string;
    warnings: string;
    version: string;
    complete: string;
  };
};

export function EconomicIntelligencePanel({ presentation, money, labels }: Props) {
  return (
    <section className="decision-card economic-intelligence-panel" aria-label={labels.title}>
      <div className="decision-card-head">
        <BrainCircuit size={19} />
        <h2>{labels.title}</h2>
      </div>

      <div className="ei-summary-grid">
        <div className="ei-summary-item">
          <span>{labels.confidence}</span>
          <strong>{presentation.confidencePercent}%</strong>
          <small>{presentation.confidenceLabel}</small>
        </div>
        <div className="ei-summary-item">
          <span>{labels.version}</span>
          <strong>{presentation.analysisVersion}</strong>
          <small>{new Date(presentation.generatedAt).toLocaleDateString()}</small>
        </div>
        <div className="ei-summary-item">
          <span>{labels.missing}</span>
          <strong>{presentation.missingData.length}</strong>
          <small>{presentation.missingData.length ? presentation.missingData.map((item) => item.label).join(' · ') : labels.complete}</small>
        </div>
      </div>

      <div className="ei-block">
        <div className="ei-block-title"><Activity size={16} /><b>{labels.forecast}</b></div>
        <div className="ei-scenarios">
          {presentation.scenarios.map((scenario) => (
            <article key={scenario.id} className={`ei-scenario ${scenario.id}`}>
              <strong>{scenario.label}</strong>
              <span>{labels.surplus}: {scenario.month12 ? money(scenario.month12.monthlySurplus) : '--'}</span>
              <span>{labels.netWorth}: {scenario.month12 ? money(scenario.month12.netWorth) : '--'}</span>
            </article>
          ))}
        </div>
      </div>

      {presentation.reasons.length > 0 && (
        <div className="ei-block">
          <div className="ei-block-title"><CircleCheck size={16} /><b>{labels.reasons}</b></div>
          <ul className="ei-signals good">
            {presentation.reasons.map((item) => <li key={item.code}>{item.label}</li>)}
          </ul>
        </div>
      )}

      {presentation.warnings.length > 0 && (
        <div className="ei-block">
          <div className="ei-block-title"><CircleAlert size={16} /><b>{labels.warnings}</b></div>
          <ul className="ei-signals warning">
            {presentation.warnings.map((item) => <li key={item.code}>{item.label}</li>)}
          </ul>
        </div>
      )}

      <style jsx>{`
        .economic-intelligence-panel{display:grid;gap:14px}.ei-summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.ei-summary-item{border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--radius-card);padding:12px;min-width:0}.ei-summary-item span,.ei-summary-item small{display:block;color:var(--foreground-muted)}.ei-summary-item span{font-size:12px;font-weight:500}.ei-summary-item strong{display:block;margin:5px 0;color:var(--foreground);font-family:var(--font-data);font-size:20px}.ei-summary-item small{font-size:11px;line-height:1.5;overflow-wrap:anywhere}.ei-block{border-top:1px solid var(--border);padding-top:12px}.ei-block-title{display:flex;align-items:center;gap:7px;color:var(--foreground);margin-bottom:10px}.ei-scenarios{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.ei-scenario{display:grid;gap:6px;border:1px solid var(--border);border-radius:var(--radius-card);padding:12px;background:var(--surface-muted)}.ei-scenario strong{color:var(--foreground);font-weight:600}.ei-scenario span{color:var(--foreground-muted);font-family:var(--font-data);font-size:12px}.ei-signals{margin:0;padding:0;list-style:none;display:grid;gap:7px}.ei-signals li{border-radius:var(--radius-control);padding:9px 10px;font-size:13px;line-height:1.6}.ei-signals.good li{background:var(--success-soft);color:var(--success)}.ei-signals.warning li{background:var(--warning-soft);color:var(--foreground)}@media(max-width:820px){.ei-summary-grid,.ei-scenarios{grid-template-columns:1fr}}
      `}</style>
    </section>
  );
}
