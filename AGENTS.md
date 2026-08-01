# THE SFM repository guide

THE SFM is a multilingual financial workspace built with Next.js 15, React 19,
TypeScript, Tailwind CSS 4, and Supabase. Use pnpm 11.1.3 (the version pinned in
`package.json`) and Node.js 22.13.0 (the CI version).

## Safety and architecture

- Keep credentials, provider keys, service-role operations, and authorization
  checks on the server. Never expose a Supabase service-role key through a
  `NEXT_PUBLIC_*` variable.
- Browser access to Supabase must respect RLS. Server-only administrative
  operations live under `src/lib/server` and API routes must use the shared
  route policy where one exists.
- Preserve the protected boundary around `/thesfm-trader-own`. Changes to its
  iframe bridge or static asset server must follow
  `docs/adr/0001-trader-terminal-boundary.md`.
- Treat `supabase/migrations` as an append-only history. Validate the complete
  clean migration chain; do not edit an applied migration to repair drift.
- Keep Arabic, English, and French translation keys aligned. Arabic and RTL
  behavior are release requirements, not optional polish.

## Required checks

Run the smallest relevant checks while developing, then run these before a
release-ready pull request:

```text
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm check:i18n
pnpm check:maintainability
pnpm test:run
pnpm build
pnpm check:performance-budget
```

The production build requires the public Supabase variables documented in the
release checklist. Follow `docs/release/release-checklist.md` for canary,
telemetry, migration, and rollback evidence.

## Change discipline

- Prefer focused modules over adding more code to a grandfathered oversized
  file. The maintainability guard blocks new files above 900 lines, growth of
  existing oversized files, and new `!important` debt.
- Treat `scripts/eslint-debt-baseline.json` as a debt ratchet. Lower a rule's
  allowance whenever unused variables or explicit `any` warnings are removed;
  never raise it to accommodate new warnings.
- Add or update tests for authorization, data transformations, navigation, and
  bridge contracts.
- Do not weaken security, accessibility, performance, or migration checks to
  make CI pass. Record a time-bounded exception in the pull request if a check
  cannot be satisfied.
- Do not commit generated build output, browser recordings, local databases,
  provider payloads, or credentials.
- Keep generated QA evidence in CI or release artifacts, not Git. The repository
  hygiene guard rejects generated paths and tracked files above 5 MiB.
