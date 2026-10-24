# Native workspace source integration — 2026-10-24

This records source integration of PR #301. Distribution of new Android APKs and
rollout of restrictive database policies remain separate release steps.

## Compatibility prerequisite completed

The additive `email_mfa_sessions` table was deployed to the production project
`hirjgsyfolsvfqjayyfz` before merging the email-verification handlers. Read-back
confirmed RLS, the session/user/expiry SELECT policy, no anonymous SELECT, and
no authenticated INSERT privilege. No customer financial records were written.

The management API initially assigned version `20261024112132`. Its one SQL
statement matched the repository file byte-for-byte (MD5
`1e39991b5e555762f6ea3b078bf47122`). An identity-checked transaction aligned only
that ledger version to the repository's `20261014180745`; read-back confirmed
the canonical version and unchanged SQL hash. No application SQL was replayed.

## Source verification

- The complete migration chain and all authorization SQL suites passed in the
  PostgreSQL 17 CI job for `c74f0af5e373c6412dbc4d210446a0e477fe3e58`.
- Seven focused auth, native session, attachment and build-security suites passed
  locally: 82 tests. Exact final-revision CI remains the merge gate.
- Next.js was patched to 15.5.28 to resolve the registry's new critical/high
  advisories. Local security backports remain subject to their installed-package
  regression and raw-registry audit checks.
- Expo CLI's Zod dependency is pinned to published fix 4.6.7. Installed-package
  checks cover bounded invalid collections, the actual Expo plugin parser,
  command validation, and strict MCP JSON schema generation. The website audit
  has no high/critical findings; the mobile audit retains one high node-forge
  advisory covered by the installed, tested backport.

## Subsequent rollout

The business-role, private-attachment-bucket and enrolled-MFA enforcement
migrations were not applied as part of this source integration. Deploy and
verify the compatible reader and authentication handlers before applying those
restrictions. Historical migration gaps must retain their individual
dispositions; do not bulk-adopt or replay them.

The original Android signer, distribution APKs, physical-device authenticated
QA, full native English/French, and advanced web/native feature parity retain
the limits recorded in `docs/security/2026-10-14-mobile-web-review.md`.
