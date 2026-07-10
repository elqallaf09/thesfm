'use client';

import { useLanguage } from '@/hooks/useLanguage';

export function LocalizedSkipLink() {
  const { t } = useLanguage();
  return <a className="sfm-skip-link" href="#main-content">{t('skip_to_content')}</a>;
}
