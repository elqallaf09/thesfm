# Mobile symbol drawer acceptance

The integrated drawer uses `assets/drawer-data.js` for bounded, cancellable,
symbol- and language-specific requests. UI data is requested when needed, not
invented to fill empty panels. The standalone Trader has a separate counterpart.

## Automated coverage

- Cold-open quote/profile, news, technical, earnings and dividends requests.
- Failure versus empty-success, explicit retry and preservation of partial data.
- Per-symbol cache bounds, TTL, cancellation and ignoring late results.
- Null, blank and non-numeric technical fields are missing; genuine zero is valid.
- Arabic, English and French, both themes, compact phones and landscape.
- Focus trap and restoration, Escape/close, keyboard tabs, scroll preservation,
  the secondary More disclosure and 44px minimum close/touch controls.
- Full analysis must still fetch when the cache contains only drawer resources.

Run `pnpm test:run` for unit coverage. The relevant fixture browser suites are
`trader-symbol-data.spec.ts`, `trader-drawer-focus.spec.ts`, and
`trader-drawer-host-focus.spec.ts` under `tests/smoke`.

These tests use explicitly isolated fixtures. They do not establish live market
prices, provider subscription entitlements, exchange coverage or behavior on a
physical iPhone. Production acceptance must inspect actual source timestamps,
provider status and failed responses without exposing provider secrets. Missing
confidence, targets, technical data or earnings dates must remain missing.
