# Economic Intelligence isolation verification

## Reproducible real-service check

`.github/workflows/economic-intelligence-isolation.yml` starts a disposable Supabase CLI stack on the GitHub runner and applies the current checkout's full migration chain. It is not a mocked Supabase client or a Postgres schema stand-in. CLI version is pinned to 2.113.0.

The Node probe creates two disposable users through local Supabase Auth, signs both in with the local anonymous API key, and checks that their session JWT subjects match and their roles are `authenticated`. The service-role key is used only for creating/removing those test accounts, never for tested table access.

For `user_decisions`, `notifications` and `economic_intelligence_confirmations`, both directions test own insert/read/update/delete; cross-user read/update/delete; forged ownership inserts; ownership transfer; and anonymous access. A second user's complete row must remain unchanged. Real notification triggers must record a read as opened, not actioned/resolved, and preserve the evidence metadata.

## Boundaries

The probe requires explicit disposable-local opt-in and rejects all origins except `http://127.0.0.1:54321`, including redirects. Guard tests run before any stack or test-account creation. No production secrets are supplied, no project is linked and no remote database push is executed. Tests remove their users; the workflow always removes only its own local stack and credential file. Only a non-sensitive result JSON is uploaded.

Passing this check proves these cases against the repository's migrated local Supabase stack. It does not certify production's historical schema or replace hosted-preview checks of the Next.js API authentication layer. The existing hosted-preview Playwright test is retained unchanged.

Status is determined by the fresh workflow result on the exact head. Adding this workflow is not itself a successful verification. Run artifacts record the tested checkout and each passed assertion. The new job is not silently presented as a repository-required check; normal merge policy remains unchanged.
