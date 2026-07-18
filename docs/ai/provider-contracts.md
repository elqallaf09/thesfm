# Intelligence provider contracts

## Contract

An intelligence provider implements:

```ts
type IntelligenceProvider = {
  id: string;
  supports(asset: CanonicalAssetIdentity): boolean;
  getSnapshot(
    request: AnalysisRequest,
    asset: CanonicalAssetIdentity,
  ): Promise<VerifiedIntelligenceSnapshot>;
};
```

The provider returns verified observations, not a recommendation. Recommendation, confidence, risk, and explanation remain server-owned deterministic concerns.

## Required snapshot behavior

A successful snapshot must provide:

- the resolved canonical asset identity;
- a stable provider/source identifier;
- receipt time and truthful `dataAsOf` when known;
- `LIVE`, `DELAYED`, `CACHED`, or `UNAVAILABLE` delivery state;
- positive finite quote price and at least one valid historical candle;
- normalized finite candles only;
- operational delivery reliability from observable provider state;
- provider attempts and fallback status;
- null for unsupported fundamentals or Sharia fields.

It must not provide or influence:

- final confidence;
- recommendation;
- target or stop-loss values;
- invented timestamps;
- fabricated fundamentals or indicator values;
- inferred Sharia compliance.

## Current adapter

`ExistingMarketDataIntelligenceProvider` wraps the established `proxyAnalyze` pipeline. This preserves existing provider selection, normalization, health, and fallback behavior while preventing provider-specific response shapes from reaching the intelligence domain or browser.

The adapter:

- maps canonical intelligence asset types to established market types;
- rejects invalid, empty, or non-positive market results;
- normalizes timestamp, quote, history, fundamental, and Sharia fields;
- maps live/delayed/cached/fallback delivery into an operational-reliability input;
- records safe provider attempt metadata;
- converts provider messages to non-sensitive warning codes rather than forwarding raw text.

The operational-reliability values describe delivery state only. They are not model accuracy or a historical win rate.

## Error taxonomy and fallback

| Error | Retryable | API behavior |
| --- | --- | --- |
| `INVALID_ASSET` | No | Stop and return a safe 404 |
| `UNSUPPORTED_ASSET` | No | Stop and return a safe 422 |
| `PROVIDER_TIMEOUT` | Yes | Record failure and try the next supported provider |
| `PROVIDER_UNAVAILABLE` | Yes | Record failure and try the next supported provider |

Each provider call has a 20-second server timeout. Retryable errors advance to the next configured provider; the same provider is not called repeatedly in one request. This bounds latency and prevents client-triggered fan-out. At present there is one aggregate adapter, whose internal market pipeline already performs its established provider fallback.

Provider errors are recorded as safe classifications and attempt metadata. Raw exceptions, payloads, URLs, API keys, tokens, and prompts are never stored or returned.

## Freshness and provenance

Providers must not describe old data as live. `dataAsOf` is evaluated by the server freshness policy; cached provider state is at least delayed and can become stale. The result records selected provider, every safe attempt, fallback use, and the kinds of data actually supplied.

If live refresh fails and a prior shared result is reused, the orchestrator—not the provider—marks every factor and the overall result stale and recalculates confidence.

## Sharia evidence

Sharia data is available only when all of these are present:

- a supported status;
- a named source;
- a valid review timestamp.

Company name, sector, symbol, country, and language-model output are never acceptable substitutes. Missing context produces `VERIFIED_SHARIA_STATUS_UNAVAILABLE`.

## Adding a provider

Before a provider can be enabled:

1. Implement `supports` with an allow-listed capability model.
2. Normalize to the canonical snapshot without exposing the raw response.
3. Add success, timeout, partial, total failure, and fallback tests.
4. Document update frequency and data-as-of semantics.
5. Confirm credentials are server-only and provider URLs are not client-controlled.
6. Confirm field-level license and storage permissions.
7. Add safe observability labels and a bounded timeout.
8. Validate the provider on Preview before configuration is enabled elsewhere.

Provider order is server configuration. Client input cannot select an arbitrary URL or secret provider configuration.
