'use client';
import { useAuth } from '@/hooks/useAuth';
import { MacroGame } from '@/components/macro-simulator/MacroGame';
import { SimulatorNavigation } from '@/components/macro-simulator/SimulatorNavigation';
/** Reset page memory across identities; checkpoints are explicitly account/tab scoped. */
export default function MacroSimulatorGamePage() {
  const { user } = useAuth();
  const userKey = user?.id ?? 'guest';
  return <><SimulatorNavigation active="game" /><MacroGame key={userKey} userKey={userKey} /></>;
}
