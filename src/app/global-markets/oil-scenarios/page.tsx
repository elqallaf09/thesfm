import type { Metadata } from 'next';
import { OilScenarioEngine } from '@/components/global-markets/OilScenarioEngine';

export const metadata: Metadata = {
  title: 'Oil Scenario Engine | THE SFM',
  description: 'Transparent oil-market sensitivity scenarios for chokepoints, supply, inventories, shipping, demand and rates.',
};

export default function OilScenariosPage() {
  return <OilScenarioEngine />;
}
