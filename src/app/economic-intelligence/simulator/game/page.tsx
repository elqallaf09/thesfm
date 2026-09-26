'use client';
import { useAuth } from '@/hooks/useAuth';
import { MacroGame } from '@/components/macro-simulator/MacroGame';
import { SimulatorNavigation } from '@/components/macro-simulator/SimulatorNavigation';
/** Do not carry a learning journal across account identities. */
export default function MacroSimulatorGamePage() {
  const { user } = useAuth();
  return <><SimulatorNavigation active="game" /><MacroGame key={user?.id ?? 'guest'} /></>;
}
