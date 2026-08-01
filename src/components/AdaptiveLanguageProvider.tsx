'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { PublicLanguageProvider } from '@/components/PublicLanguageProvider';
import { isPublicShellRoute } from '@/config/workspaces/public-shell-routes';
import { resolveWorkspaceRouteId } from '@/config/workspaces/workspace-route-index';

const PersonalFinanceLanguageProvider = dynamic(
  () => import('@/components/language/PersonalFinanceLanguageProvider').then(module => module.PersonalFinanceLanguageProvider),
);
const MarketsTradingLanguageProvider = dynamic(
  () => import('@/components/language/MarketsTradingLanguageProvider').then(module => module.MarketsTradingLanguageProvider),
);
const BusinessProjectsLanguageProvider = dynamic(
  () => import('@/components/language/BusinessProjectsLanguageProvider').then(module => module.BusinessProjectsLanguageProvider),
);
const AdministrationLanguageProvider = dynamic(
  () => import('@/components/language/AdministrationLanguageProvider').then(module => module.AdministrationLanguageProvider),
);

export function AdaptiveLanguageProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  if (isPublicShellRoute(pathname)) {
    return <PublicLanguageProvider>{children}</PublicLanguageProvider>;
  }

  switch (resolveWorkspaceRouteId(pathname)) {
    case 'markets-trading':
      return <MarketsTradingLanguageProvider>{children}</MarketsTradingLanguageProvider>;
    case 'business-projects':
      return <BusinessProjectsLanguageProvider>{children}</BusinessProjectsLanguageProvider>;
    case 'administration':
      return <AdministrationLanguageProvider>{children}</AdministrationLanguageProvider>;
    default:
      return <PersonalFinanceLanguageProvider>{children}</PersonalFinanceLanguageProvider>;
  }
}
