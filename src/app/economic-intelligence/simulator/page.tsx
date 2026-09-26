'use client';
import { useAuth } from '@/hooks/useAuth';
import { MacroLab } from '@/components/macro-simulator/MacroLab';
import { SimulatorNavigation } from '@/components/macro-simulator/SimulatorNavigation';
/** Reset all in-memory state across account changes; saved drafts are per-user and per-tab. */
export default function MacroSimulatorPage() {
  const { user } = useAuth();
  return <><SimulatorNavigation active="lab" /><MacroLab key={user?.id ?? 'guest'} userKey={user?.id ?? 'guest'} /></>;
}
