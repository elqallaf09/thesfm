import type { Metadata } from 'next';
import { GoldScenarioEngine } from '@/components/gold-intelligence/GoldScenarioEngine';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'SFM Gold Scenario Engine',
  description: 'Explainable gold scenario analysis using market, macroeconomic and verified event evidence.',
};

export default function GoldScenarioIntelligencePage() {
  return <GoldScenarioEngine />;
}
