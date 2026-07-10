import 'server-only';

export type MarketNewsLogEvent =
  | 'provider_fetch_started'
  | 'provider_fetch_completed'
  | 'provider_fetch_failed'
  | 'news_normalized'
  | 'news_rejected'
  | 'duplicate_detected'
  | 'story_cluster_created'
  | 'conflict_detected'
  | 'news_saved';

const SENSITIVE_KEY = /authorization|cookie|secret|token|api[-_]?key|password|credential|raw|html|payload/i;

function safeValue(value: unknown, depth = 0): unknown {
  if (depth > 3) return '[truncated]';
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') {
    const withoutQueryCredentials = value.replace(/([?&](?:token|api_?key|apikey|secret|authorization)=)[^&\s]+/gi, '$1[redacted]');
    return withoutQueryCredentials.length > 500 ? `${withoutQueryCredentials.slice(0, 497)}...` : withoutQueryCredentials;
  }
  if (Array.isArray(value)) return value.slice(0, 25).map(item => safeValue(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !SENSITIVE_KEY.test(key))
        .slice(0, 40)
        .map(([key, nested]) => [key, safeValue(nested, depth + 1)]),
    );
  }
  return String(value);
}

export function logMarketNewsEvent(event: MarketNewsLogEvent, metadata: Record<string, unknown> = {}) {
  const record = {
    event,
    timestamp: new Date().toISOString(),
    service: 'market-news',
    ...safeValue(metadata) as Record<string, unknown>,
  };

  const line = JSON.stringify(record);
  if (event === 'provider_fetch_failed' || event === 'conflict_detected') {
    console.warn(line);
    return;
  }
  console.info(line);
}

