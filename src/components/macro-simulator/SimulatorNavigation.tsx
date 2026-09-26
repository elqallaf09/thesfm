'use client';
import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { modeCopy, type GameLanguage } from './game-copy';
import styles from './game.module.css';
export function SimulatorNavigation({ active }: { active: 'lab' | 'game' }) {
  const { lang: selected } = useLanguage();
  const lang: GameLanguage = selected === 'en' || selected === 'fr' ? selected : 'ar';
  return <WorkspacePageContainer variant="full"><nav className={styles.navigation} dir={lang === 'ar' ? 'rtl' : 'ltr'} aria-label={modeCopy.navigation[lang]}>
    <Link prefetch={false} href="/economic-intelligence/simulator" aria-current={active === 'lab' ? 'page' : undefined}>{modeCopy.lab[lang]}</Link>
    <Link prefetch={false} href="/economic-intelligence/simulator/game" aria-current={active === 'game' ? 'page' : undefined}>{modeCopy.game[lang]}</Link>
  </nav></WorkspacePageContainer>;
}
