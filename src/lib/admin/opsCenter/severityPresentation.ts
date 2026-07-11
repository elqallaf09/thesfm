import { AlertTriangle, CheckCircle2, HelpCircle, Info, MinusCircle, XCircle } from 'lucide-react';
import type { StatusTone } from '@/components/market/statusPresentation';
import type { OpsFeatureHealthStatus, OpsHealthLevel, OpsSeverity } from './types';

/**
 * Mirrors src/components/market/statusPresentation.ts's Record<enum, tone/icon> pattern exactly —
 * one canonical mapping per enum, reused everywhere so a status never renders with a color alone.
 */
export const OPS_HEALTH_TONE: Record<OpsHealthLevel, StatusTone> = {
  healthy: 'success',
  degraded: 'warning',
  critical: 'danger',
  maintenance: 'info',
};

export const OPS_HEALTH_ICON: Record<OpsHealthLevel, typeof CheckCircle2> = {
  healthy: CheckCircle2,
  degraded: AlertTriangle,
  critical: XCircle,
  maintenance: Info,
};

export const FEATURE_HEALTH_TONE: Record<OpsFeatureHealthStatus, StatusTone> = {
  healthy: 'success',
  partial: 'warning',
  failed: 'danger',
  disabled: 'muted',
  maintenance: 'info',
};

export const FEATURE_HEALTH_ICON: Record<OpsFeatureHealthStatus, typeof CheckCircle2> = {
  healthy: CheckCircle2,
  partial: AlertTriangle,
  failed: XCircle,
  disabled: MinusCircle,
  maintenance: Info,
};

export const SEVERITY_TONE: Record<OpsSeverity, StatusTone> = {
  critical: 'danger',
  warning: 'warning',
  info: 'info',
};

export const SEVERITY_ICON: Record<OpsSeverity, typeof CheckCircle2> = {
  critical: XCircle,
  warning: AlertTriangle,
  info: Info,
};

/** Normalized job-status bucket used by JobSourceStats across all 3 real job sources. */
export type JobStatusBucket = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export const JOB_STATUS_TONE: Record<JobStatusBucket, StatusTone> = {
  queued: 'muted',
  running: 'info',
  succeeded: 'success',
  failed: 'danger',
  cancelled: 'muted',
};

export const JOB_STATUS_ICON: Record<JobStatusBucket, typeof CheckCircle2> = {
  queued: MinusCircle,
  running: Info,
  succeeded: CheckCircle2,
  failed: XCircle,
  cancelled: MinusCircle,
};

/** Every `NotInstrumented` value renders with this single tone/icon pair — never color alone. */
export const NOT_INSTRUMENTED_TONE: StatusTone = 'muted';
export const NOT_INSTRUMENTED_ICON = HelpCircle;
