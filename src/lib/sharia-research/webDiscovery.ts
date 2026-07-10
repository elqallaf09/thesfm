import 'server-only';

import { assertSafePublicUrl, secureFetch } from './secureFetch';
import type { SourceConfigurationStatus } from './types';

type SearchResult = { title: string; url: string; content?: string };

function configuredEndpoint() {
  const endpoint = process.env.SHARIA_RESEARCH_SEARCH_ENDPOINT?.trim();
  if (!endpoint) return null;
  try {
    return new URL(endpoint);
  } catch {
    return null;
  }
}

export function isWebDiscoveryEnabled() {
  return Boolean(configuredEndpoint());
}

export async function discoverWebSources(query: string, signal?: AbortSignal) {
  const endpoint = configuredEndpoint();
  if (!endpoint) return [];
  endpoint.searchParams.set('q', query.slice(0, 180));
  endpoint.searchParams.set('format', 'json');
  const apiKey = process.env.SHARIA_RESEARCH_SEARCH_API_KEY?.trim();
  const response = await secureFetch(endpoint.toString(), {
    acceptedContentTypes: ['application/json', 'text/json'],
    maxBytes: 2 * 1024 * 1024,
    cacheTtlMs: 30 * 60 * 1000,
    respectRobots: false,
    headers: apiKey ? { authorization: `Bearer ${apiKey}` } : undefined,
    signal,
  });
  const payload = JSON.parse(new TextDecoder().decode(response.body)) as { results?: SearchResult[] };
  const safeResults: SearchResult[] = [];
  for (const result of payload.results ?? []) {
    if (!result?.url || !result.title) continue;
    try {
      await assertSafePublicUrl(result.url);
      safeResults.push({ title: String(result.title), url: String(result.url), content: result.content ? String(result.content) : undefined });
    } catch {
      // Search-provider URLs are untrusted until independently validated.
    }
    if (safeResults.length >= 10) break;
  }
  return safeResults;
}

export function webDiscoveryStatus(): SourceConfigurationStatus {
  return {
    id: 'optional-web-discovery',
    label: 'Optional self-hosted or configured web discovery',
    enabled: isWebDiscoveryEnabled(),
    tier: 4,
    requirement: isWebDiscoveryEnabled() ? null : 'SHARIA_RESEARCH_SEARCH_ENDPOINT',
  };
}
