'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { PublicLanguageProvider } from '@/components/PublicLanguageProvider';
import { isPublicShellRoute } from '@/config/workspaces/public-shell-routes';

const WorkspaceLanguageProvider = dynamic(
  () => import('@/components/LanguageProvider').then(module => module.LanguageProvider),
);

export function AdaptiveLanguageProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  if (isPublicShellRoute(pathname)) {
    return <PublicLanguageProvider>{children}</PublicLanguageProvider>;
  }
  return <WorkspaceLanguageProvider>{children}</WorkspaceLanguageProvider>;
}
