import { Bell, Menu } from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DensityToggle } from '@/components/DensityToggle';
import { CommandSearchTrigger } from './CommandSearchTrigger';
import { HeaderIconAction } from './HeaderIconAction';
import { AccountMenuTrigger } from './AccountMenuTrigger';

type CommandClusterProps = {
  commandLabel: string;
  notificationsLabel: string;
  notificationsHasUnread: boolean;
  menuOpen: boolean;
  menuReady: boolean;
  menuLabel: string;
  onOpenMenu: () => void;
};

/**
 * The header's utility command surface: Quick Search anchors the cluster,
 * followed by language/theme/density and the account/notifications entry
 * points, all sharing one track (styled centrally in AppHeader.tsx).
 */
export function CommandCluster({
  commandLabel,
  notificationsLabel,
  notificationsHasUnread,
  menuOpen,
  menuReady,
  menuLabel,
  onOpenMenu,
}: CommandClusterProps) {
  return (
    <div className="sfm-global-actions">
      <CommandSearchTrigger ariaLabel={commandLabel} />
      <LanguageSwitcher variant="light" compact />
      <ThemeToggle />
      <DensityToggle />
      <HeaderIconAction href="/notifications" label={notificationsLabel} className="sfm-global-notifications">
        <Bell size={18} aria-hidden="true" />
        {notificationsHasUnread ? <span className="sfm-global-bell-dot" aria-hidden="true" /> : null}
      </HeaderIconAction>
      <AccountMenuTrigger />
      <button
        type="button"
        className="sfm-global-menu-button"
        aria-label={menuLabel}
        aria-expanded={menuOpen}
        aria-controls="sfm-mobile-menu"
        disabled={!menuReady}
        onClick={onOpenMenu}
      >
        <Menu size={22} aria-hidden="true" />
      </button>
    </div>
  );
}

export default CommandCluster;
