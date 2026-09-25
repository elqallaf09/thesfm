# THE SFM integrations / التكاملات

Create an expiring key in Settings → Apps and integrations. Select only the needed scopes. The key is shown once; revoke it from that page at any time. HTTPS is mandatory. Never put keys in URLs or public code.

- `GET /api/connect/v1/portfolio?offset=0` — `portfolio:read`; 100 owner records/page, original currency, recorded amounts (not quotes).
- `GET /api/connect/v1/notifications` — `notifications:read`; latest 50 owner notifications.
- `POST /api/connect/v1/snapshots` — `snapshots:write`; a separate incoming snapshot, no ledger or trading changes.

Use the header `Authorization: Bearer <your-key>`. Quota: 30 calls per key per minute, shared across server instances. Expiry: 1–90 days. A 401 means the key is invalid, revoked, expired, missing its scope or over quota. Never automatically retry a POST with a new external ID; reuse the original ID.

Snapshot JSON fields: `source` (`mt5`, `ibkr`, `bank`, `wallet`, `custom`), `externalId` (1–100 characters), `observedAt` (ISO timestamp with timezone), `currency` (ISO code), `balance` and `equity` (numbers or null), and `positions` (up to 500). Each position has `symbol`, signed `quantity`, `value` (number or null) and `currency`. Missing values must be null, not invented zeros. Source names describe the submitting connector; they do not certify independent provider verification. Same source/external ID and payload is idempotent; a conflicting payload returns 409.

## MT5 / ميتاتريدر

1. Download `sfm-mt5-exporter.mq5`, open in MetaEditor and compile on your installed MT5 version.
2. MT5 → Tools → Options → Expert Advisors → allow WebRequest only for `https://www.the-sfm.com`.
3. Run the script with a dedicated `snapshots:write` key. It exports current balance/equity and open-position lots once. It places no orders.
4. Open the received snapshots panel. Account currency and source time must match the terminal.

Position volume is lots, including negative lots for short positions; market values remain null. Cent-account currencies are rejected. The exporter has not been compiled or tested on a live MT5 terminal in this Linux build environment. Validate first in your demo terminal. This is a local exporter, not a broker-server connection.

## IBKR, banks and wallets

The snapshot contract accepts data from your approved connector. No direct bank or IBKR OAuth/Flex connection is activated merely by creating a key. These require provider access, consent, test credentials and independent reconciliation. The site never asks for a bank password or silently imports a snapshot into your official financial ledger.
