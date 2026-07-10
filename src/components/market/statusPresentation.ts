import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { ProviderConnectionStatus } from '@/lib/market-state/types';

export type StatusTone = 'success' | 'info' | 'warning' | 'danger' | 'muted';

export const PROVIDER_STATUS_TONE: Record<ProviderConnectionStatus, StatusTone> = {
  connected: 'success',
  degraded: 'warning',
  rate_limited: 'warning',
  disconnected: 'danger',
  misconfigured: 'muted',
  disabled: 'muted',
  unknown: 'muted',
};

export const PROVIDER_STATUS_ICON: Record<ProviderConnectionStatus, typeof CheckCircle2> = {
  connected: CheckCircle2,
  degraded: AlertTriangle,
  rate_limited: AlertTriangle,
  disconnected: XCircle,
  misconfigured: Info,
  disabled: Info,
  unknown: Info,
};
