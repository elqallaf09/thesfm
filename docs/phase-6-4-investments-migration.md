# Phase 6.4 Investments Center migration contract

## Sequence

1. **Legacy read** — `/invest` remains live and retains all add, edit, delete, price and deep-link behavior.
2. **Additive migration** — `investment_positions` copies each `investment_items.id` as its own primary key and preserves a complete `legacy_snapshot`. Legacy rows are not changed.
3. **Background verification** — `investment_position_migration_checks` starts every copied row as `PENDING`. A verifier must compare recorded fields and explicitly mark the result before it can be treated as canonical.
4. **Canonical read switch** — a later, separately reviewed change may read only verified canonical positions. It must retain the UUID and route context.
5. **Legacy retirement** — only after route and data parity tests pass. No redirect is introduced by this foundation.

There are no database triggers, compatibility writes, or synchronization jobs in this phase. The new center continues to read the original holdings until the verification stage is complete.

## Route matrix

| Current route | Canonical destination | Status in this change | ID/query behavior |
| --- | --- | --- | --- |
| `/invest` | `/investments` | Legacy compatibility remains; no redirect before parity | Existing links, IDs, and query strings remain untouched |
| `/invest/add` | `/invest` | Existing compatibility redirect remains | Existing behavior preserved |
| `/investments` | `/investments` | New overview | No private data is exposed to guests |
| `/investments/stocks` | `/investments/stocks` | New asset-class surface | Reads original holdings during verification |
| `/investments/real-estate` | `/investments/real-estate` | New asset-class surface | Private property works without a catalog record |
| `/investments/gold-silver` | `/investments/gold-silver` | New asset-class surface | Uses the canonical asset avatar/fallback path |
| `/investments/crypto` | `/investments/crypto` | New asset-class surface | Uses the canonical asset avatar/fallback path |
| `/investments/funds` | `/investments/funds` | New asset-class surface | Uses the canonical asset avatar/fallback path |
| `/investments/bonds` | `/investments/bonds` | New asset-class surface | No invented market data |
| `/investments/commodities` | `/investments/commodities` | New asset-class surface | No invented market data |

## Data and security contract

- `investment_asset_catalog` is optional. `investment_positions.catalog_asset_id` is nullable by design.
- `investment_documents` is position-linked and stored in the private `investment-documents` bucket. It is distinct from `project_documents` and Investment Offers material.
- User-scoped RLS applies to positions, migration checks, valuations, transactions, property details, ownership sources, and documents. Child-row policies also prove that the linked position belongs to the same user.
- The catalog exposes active public asset metadata only; it never contains ownership or portfolio data.
- Imported rows copy only direct legacy fields. They do not infer transactions, valuations, ownership percentages, FX, canonical identifiers, catalog links, or confidence.
- Currency totals exclude values whose conversion is unavailable or stale. Missing values are not converted to zero.
- Asset cards reuse `AssetAvatar` and its Phase 6.3 negative logo-failure cache. The secondary ownership identity remains separate through `PlatformIdentity`.
- The sole Investments intelligence action is the canonical `/ai-analyst/analyze/[symbol]` handoff. Private assets retain a safe internal identifier and render a truthful unavailable state rather than a fabricated market analysis.

## Deferred infrastructure validation — July 23, 2026

**Deferred until July 23, 2026:** Provision an authenticated isolated Supabase Preview branch and validate the clean migration chain, RLS matrix, storage policies, document lifecycle, cross-user denial, reconciliation, rollback/reapply behavior, and zero-resource cleanup audit.

The migration, schema, RLS, storage-policy, and backfill proposal remain unchanged by the focused client-performance stabilization. No migration has been applied and no shared or Production Supabase environment is a substitute for this validation.
