import type { Metadata } from 'next';
import { GoldScenarioEngine } from '@/components/gold-intelligence/GoldScenarioEngine';
import { GoldResearchSearch } from '@/components/gold-intelligence/GoldResearchSearch';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'SFM Gold Scenario Engine',
  description: 'Explainable gold scenario analysis using market, macroeconomic and verified event evidence.',
};

export default function GoldScenarioIntelligencePage() {
  return <><GoldScenarioEngine /><GoldResearchSearch /></>;
}
