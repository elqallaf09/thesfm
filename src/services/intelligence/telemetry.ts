import type {
  IntelligenceAssetType,
  IntelligenceLocale,
} from '@/domain/intelligence/contracts';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';

export type IntelligenceTelemetryEvent = {
  name: string;
  value?: number;
  provider?: string | null;
  cacheStatus?: 'hit' | 'miss' | 'stale' | 'unknown';
  fallbackUsed?: boolean;
  failureClass?: string | null;
  count?: number;
  supportState?: 'supported' | 'unsupported' | 'denied' | 'failed';
};

export interface IntelligenceTelemetry {
  record(event: IntelligenceTelemetryEvent): void;
  flush(): Promise<void>;
}

export class IntelligenceTelemetryCollector implements IntelligenceTelemetry {
  private readonly events: IntelligenceTelemetryEvent[] = [];

  constructor(private readonly context: {
    correlationId: string;
    authenticated: boolean;
    locale: IntelligenceLocale;
    assetType: IntelligenceAssetType | 'SYSTEM';
    route:
      | '/api/intelligence/analyze'
      | '/api/intelligence/latest'
      | '/api/intelligence/timeline'
      | '/api/intelligence/outcomes/latest'
      | '/api/intelligence/outcomes/evaluate'
      | '/api/intelligence/recent'
      | '/api/intelligence/accuracy';
  }) {}

  record(event: IntelligenceTelemetryEvent) {
    this.events.push({ ...event, name: event.name.slice(0, 80) });
  }

  async flush() {
    if (this.events.length === 0) return;
    const admin = createServerSupabaseAdmin();
    if (!admin) return;
    const deploymentSha = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_DEPLOYMENT_SHA || 'unknown').slice(0, 80);
    const buildVersion = (process.env.NEXT_PUBLIC_BUILD_VERSION || process.env.npm_package_version || 'unknown').slice(0, 80);
    const environment = process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview'
      ? process.env.VERCEL_ENV
      : 'development';
    const providerEvents = new Set(['intelligence_provider_called', 'intelligence_provider_failed', 'intelligence_provider_fallback_used']);
    const rows = this.events.map(event => ({
      event_type: providerEvents.has(event.name) ? 'provider_metric' : 'api_metric',
      metric_name: event.name,
      metric_value: Math.max(0, Number(event.value ?? 1)),
      rating: null,
      route_template: this.context.route,
      session_id: this.context.correlationId,
      authenticated: this.context.authenticated,
      locale: this.context.locale,
      theme: 'unknown',
      viewport_class: 'unknown',
      device_class: 'unknown',
      browser_family: 'Unknown',
      network_class: 'unknown',
      deployment_sha: deploymentSha,
      build_version: buildVersion,
      environment,
      occurred_at: new Date().toISOString(),
      cache_status: event.cacheStatus ?? null,
      provider: event.provider?.slice(0, 80) ?? null,
      endpoint_class: 'financial_intelligence',
      asset_class: this.context.assetType === 'SYSTEM'
        ? 'system'
        : this.context.assetType.toLowerCase() === 'commodity'
        ? 'commodity'
        : this.context.assetType.toLowerCase() === 'fund'
          ? 'fund'
          : this.context.assetType.toLowerCase(),
      fallback_used: event.fallbackUsed ?? null,
      failure_class: event.failureClass?.slice(0, 80) ?? null,
      event_count: event.count ?? null,
      support_state: event.supportState ?? null,
      correlation_id: this.context.correlationId,
    }));
    const { error } = await admin.from('observability_events').insert(rows);
    if (error && process.env.NODE_ENV !== 'production') {
      console.warn('[intelligence-observability] flush skipped', { code: error.code, count: rows.length });
    }
    this.events.length = 0;
  }
}

export class MemoryIntelligenceTelemetry implements IntelligenceTelemetry {
  readonly events: IntelligenceTelemetryEvent[] = [];
  record(event: IntelligenceTelemetryEvent) { this.events.push(event); }
  async flush() {}
}
