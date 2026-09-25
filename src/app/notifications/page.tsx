'use client';

import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';
import { NotificationsPage } from '@/components/finance/NotificationsPage';

export default function NotificationsRoute() {
  const { lang } = useLanguage();
  return <><Link className="sfm-channel-settings-link" href="/notifications/channels">{lang === 'ar' ? 'قنوات التنبيهات' : lang === 'fr' ? 'Canaux de notification' : 'Notification channels'}</Link><NotificationsPage /></>;
}
