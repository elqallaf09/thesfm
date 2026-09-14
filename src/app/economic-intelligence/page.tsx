import Link from 'next/link';
import { Archive, BrainCircuit, ChartNoAxesCombined, Landmark, LineChart, Sparkles } from 'lucide-react';
import { EconomicIntelligenceHome } from '@/components/finance/EconomicIntelligenceHome';
import { CrossWorkspaceEconomicBrief } from '@/components/finance/CrossWorkspaceEconomicBrief';
import { EconomicResolutionHistory } from '@/components/finance/EconomicResolutionHistory';
import { FinanceDashboardIntelligence } from '@/components/finance/FinanceDashboardIntelligence';

export default function EconomicIntelligencePage() {
  return (
    <main className="economic-command-center">
      <section className="command-hero">
        <div>
          <span><BrainCircuit size={16} />SFM Economic Intelligence</span>
          <h1>Economic Command Center</h1>
          <p>One workspace for your financial twin, daily priorities, cross-workspace conflicts, decisions, markets, business funding, and observed outcomes.</p>
        </div>
        <nav aria-label="Economic Intelligence quick actions">
          <Link href="/decisions/simulator"><Landmark size={16} />Decision Lab</Link>
          <Link href="/ai-analyst"><LineChart size={16} />Market Intelligence</Link>
          <Link href="/business-hub"><ChartNoAxesCombined size={16} />Business</Link>
          <Link href="/economic-intelligence/history"><Archive size={16} />Brief Archive</Link>
          <Link href="/notifications"><Sparkles size={16} />Intelligence Events</Link>
        </nav>
      </section>

      <EconomicIntelligenceHome />
      <CrossWorkspaceEconomicBrief />
      <EconomicResolutionHistory />
      <FinanceDashboardIntelligence />

      <style>{`
        .economic-command-center{width:100%;min-width:0;display:grid;gap:16px;color:var(--foreground);font-family:var(--font-ui)}
        .command-hero{margin:0 auto 2px;max-width:1440px;width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:end;padding:clamp(22px,4vw,34px);border:1px solid var(--border-strong);border-radius:var(--radius-panel);background:var(--hero-gradient);color:var(--hero-foreground);box-shadow:var(--shadow-md);overflow:hidden}
        .command-hero>div>span{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid color-mix(in srgb,var(--hero-foreground) 24%,transparent);border-radius:var(--radius-pill);background:color-mix(in srgb,var(--surface) 10%,transparent);font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
        .command-hero h1{margin:14px 0 8px;font-size:clamp(30px,5vw,48px);line-height:1.08}.command-hero p{margin:0;max-width:800px;color:var(--hero-foreground-muted);line-height:1.7;font-size:15px}
        .command-hero nav{display:grid;grid-template-columns:repeat(2,minmax(150px,1fr));gap:8px}.command-hero nav a{min-height:44px;display:flex;align-items:center;gap:8px;padding:0 12px;border:1px solid color-mix(in srgb,var(--hero-foreground) 24%,transparent);border-radius:var(--radius-control);background:color-mix(in srgb,var(--surface) 12%,transparent);color:var(--hero-foreground);text-decoration:none;font-weight:600;font-size:12px}.command-hero nav a:hover{background:color-mix(in srgb,var(--surface) 20%,transparent)}
        @media(max-width:900px){.command-hero{grid-template-columns:1fr}.command-hero nav{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:560px){.command-hero nav{grid-template-columns:1fr}}
      `}</style>
    </main>
  );
}
