'use client';

import type { TvLanguage } from '@/lib/markets-tv/types';

type AndroidBuild = { version: string; code: number };
const LABEL = { ar: 'إصدار التطبيق', en: 'App version', fr: 'Version de l’application' } satisfies Record<TvLanguage, string>;

export function TvBuildInfo({ language }: { language: TvLanguage }) {
  const build = typeof window === 'undefined' ? undefined : (window as Window & { SFM_TV_ANDROID_BUILD?: AndroidBuild }).SFM_TV_ANDROID_BUILD;
  if (!build) return null;
  return <span data-tv-build={build.code}><br/>{LABEL[language]} <bdi dir="ltr">{build.version} ({build.code})</bdi></span>;
}
