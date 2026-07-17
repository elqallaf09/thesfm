# Schema-lint prioritized remediation report

Status: **NO-GO pending P0 remediation or explicit security exception**
Source: `clean-chain-schema-lint.md` captured from the empty temporary clean-chain project
Scope: analysis only; no SQL, migration, grant, policy, bucket, function, or index change was generated

## Executive result

The 627 advisor records reconcile exactly. There are no exact duplicate keys within a single
lint category. Two trigger functions are each reported once for `anon` and once for
`authenticated`; consolidating those role-level repeats leaves **625 unique remediation
items**.

| Priority | Raw advisor records | Deduplicated items | Production blocker |
|---|---:|---:|---|
| P0 | 4 | 2 | Yes |
| P1 | 2 | 2 | No, but resolve or formally accept before release |
| P2 | 296 | 296 | No |
| P3 | 325 | 325 | No |
| **Total** | **627** | **625** | |

The two P0 items are the public-schema `SECURITY DEFINER` trigger functions
`handle_new_user()` and `sync_profile_email_from_auth()`. Each role-specific advisor record is
preserved in the raw count, but each function is one remediation unit.

## Exact classification by advisor category

| Advisor category | Raw | Unique | Classification |
|---|---:|---:|---|
| `anon_security_definer_function_executable` | 2 | 2 | P0: 2 |
| `authenticated_security_definer_function_executable` | 3 | 3 | P0: 2; P1: 1 |
| `public_bucket_allows_listing` | 2 | 2 | P1: 1; P2: 1 |
| `function_search_path_mutable` | 12 | 12 | P2: 12 |
| `rls_enabled_no_policy` | 13 | 13 | P2: 13 |
| `unindexed_foreign_keys` | 66 | 66 | P2: 66 |
| `auth_rls_initplan` | 201 | 201 | P2: 201 |
| `multiple_permissive_policies` | 3 | 3 | P2: 3 |
| `unused_index` | 325 | 325 | P3: 325 |
| **Total** | **627** | **625 after cross-role deduplication** | |

## P0 — Production blockers

### 1. `public.handle_new_user()` — 2 raw findings, 1 deduplicated item

- Root cause: a `SECURITY DEFINER` function exists in the exposed `public` schema with default
  executable privileges reaching both `anon` and `authenticated`. It also lacks a fixed
  `search_path`.
- Affected table/path: trigger on `auth.users`; privileged insert into `public.profiles`.
- Estimated impact: potential privileged profile-write or object-resolution abuse in the auth
  provisioning path. The function returns `trigger`, so direct RPC execution may fail at
  runtime, but the exposed grant and mutable path are not an acceptable unverified production
  boundary.
- Recommended fix: remove direct client-role execution, pin a safe path with fully qualified
  objects, and keep only the trigger execution path; verify signup and profile creation.
- Migration risk: **Medium** — a privilege or function-definition mistake can break all new
  user provisioning.
- Blocks Production: **Yes**, until remediated or a targeted RPC/grant test proves and documents
  an acceptable exception.

### 2. `public.sync_profile_email_from_auth()` — 2 raw findings, 1 deduplicated item

- Root cause: a `SECURITY DEFINER` trigger function in `public` retains executable privileges
  for both `anon` and `authenticated`. It has `search_path = public`, but remains an exposed
  privileged function.
- Affected table/path: trigger on `auth.users`; privileged update of `public.profiles.email`.
- Estimated impact: potential profile-email integrity exposure and unnecessary privileged API
  surface. Trigger-only semantics reduce direct exploitability but do not justify the grants.
- Recommended fix: remove direct client-role execution and constrain the trigger function to a
  hardened path or non-exposed schema; verify signup, confirmation, and email-change flows.
- Migration risk: **Medium** — an incorrect change can stop email synchronization or auth
  updates.
- Blocks Production: **Yes**, pending remediation or an explicit tested exception.

## P1 — High priority

### 3. `storage.objects` / bucket `avatars` — 1 finding

- Root cause: the public bucket also has a broad authenticated `SELECT` policy, allowing object
  listing even though public object delivery does not require listing permission.
- Affected table: `storage.objects`, restricted to bucket `avatars` by policy intent.
- Estimated impact: enumeration of avatar object names and path conventions; filenames may leak
  stable user identifiers or account relationships.
- Recommended fix: separate public object retrieval from listing and constrain listing to the
  owner or an explicitly required prefix; validate avatar rendering and replacement behavior.
- Migration risk: **Medium** — the UI may currently rely on list operations rather than known
  object paths.
- Blocks Production: **No**, but requires resolution or a documented privacy acceptance before
  release.

### 4. `public.is_current_user_admin_role(text)` — 1 finding

- Root cause: authenticated users intentionally receive execute permission on a
  `SECURITY DEFINER` helper used by admin RLS policies.
- Affected tables: `public.admin_roles` and `public.admin_audit_logs` policy evaluation.
- Estimated impact: high if the function body, grants, or search path drift because it sits on
  the admin authorization boundary. Current repository code revokes `public`/`anon`, pins the
  search path, checks `(select auth.uid())`, and limits results to active admin roles, so the
  advisor record is not evidence of a current privilege bypass.
- Recommended fix: security-review and document the intentional exception; consider a
  non-exposed helper design only if policy semantics can be preserved.
- Migration risk: **High** — changing invocation privileges or function semantics can lock out
  administrators or weaken admin RLS.
- Blocks Production: **No**, provided the current body/grants are verified and accepted.

## P2 — Recommended improvements

### Public listing on `company-assets` — 1 finding

- Root cause: public delivery is combined with a broad `SELECT` policy on `storage.objects`.
- Affected table: `storage.objects`, bucket `company-assets`.
- Estimated impact: enumeration of public company-asset names and inventory. Confidentiality
  impact is lower than avatars because the bucket is designed for public company assets.
- Recommended fix: remove unnecessary listing or constrain it to the exact application need.
- Migration risk: **Low–Medium** — confirm no page discovers assets by listing the bucket.
- Blocks Production: **No**.

### Mutable function search paths — 12 findings

- Root cause: twelve trigger functions use the caller/role search path. Repository inspection
  shows these are ordinary trigger functions, not `SECURITY DEFINER` functions, which lowers
  privilege-escalation impact but leaves object-shadowing and correctness risk.
- Estimated impact: low-probability function/object resolution errors; risk rises if an
  untrusted role can create objects in a searched schema.
- Recommended fix: pin a minimal path and qualify referenced objects/functions without changing
  trigger behavior.
- Migration risk: **Low–Medium** — broad trigger coverage requires update-path regression tests.
- Blocks Production: **No**.

Affected functions and tables:

- `set_project_expenses_updated_at`: `project_expenses`
- `set_business_operations_updated_at`: `business_customers`, `business_employees`,
  `business_invoices`, `business_operating_expenses`, `business_sales`, `business_suppliers`
- `set_business_user_roles_updated_at`: `business_user_roles`
- `set_debts_updated_at`: `debts`
- `normalize_business_employee_row`: `business_employees`
- `set_company_listing_updated_at`: `company_listings`
- `set_subscription_updated_at`: `user_subscriptions`
- `set_ai_usage_limits_updated_at`: `ai_usage_limits`
- `set_updated_at`: `market_news_articles`, `market_news_bookmarks`, `market_news_conflicts`,
  `market_news_processing_results`, `market_news_source_health`, `market_news_sources`,
  `market_news_story_clusters`, `sharia_methodologies`, `sharia_research_jobs`,
  `sharia_screening_results`, `sharia_security_identities`, `trader_access`, `trader_alerts`,
  `trader_followed_trades`
- `set_subscription_manager_updated_at`: `client_notes`, `clients`, `payments`, `subscriptions`
- `set_instagram_automation_updated_at`: `instagram_automation_posts`
- `set_admin_roles_updated_at`: `admin_roles`

### RLS enabled with no policy — 13 findings / 13 tables

- Root cause: migrations enable RLS but define no client policy. This is deny-by-default for
  non-bypass roles, so it is not a data-exposure finding. It may be intentional for server-only
  tables or an incomplete access model.
- Affected tables: `company_analytics_events`, `events`, `orders`, `page_views`,
  `sharia_evidence_items`, `sharia_financial_values`, `sharia_security_identities`,
  `sharia_source_documents`, `trader_assets`, `trader_cache`, `trader_provider_status`,
  `trader_scan_results`, `trader_scan_runs`.
- Estimated impact: client reads/writes return no rows or fail; service-role access remains.
  There is no direct confidentiality loss from the absence of policies.
- Recommended fix: declare each table server-only and align grants, or define least-privilege
  policies where client access is a verified requirement.
- Migration risk: **Medium–High** — adding the wrong policy can create BOLA/IDOR; leaving a
  required table deny-all can break workflows.
- Blocks Production: **No by itself**; any table required by a critical Preview workflow becomes
  a functional release blocker.

### Unindexed foreign keys — 66 findings / 48 tables

- Root cause: foreign-key columns lack a covering leading index.
- Estimated impact: slower joins, parent-row updates/deletes, and longer lock duration as data
  volume grows. The finding is structurally valid even on an empty database, but actual severity
  depends on cardinality and workload.
- Recommended fix: prioritize high-write and parent-delete paths, verify whether a composite
  index already covers the leading FK columns, then add only justified indexes.
- Migration risk: **Medium** — index creation consumes I/O/storage and may lock or contend unless
  planned for the deployment environment.
- Blocks Production: **No**, absent measured latency or lock failures.

Affected tables, with finding counts:

`activity_logs` (2), `ad_campaigns` (2), `admin_roles` (1), `analytics_events` (1),
`business_invoices` (1), `charity_documents` (2), `client_files` (1), `client_notes` (1),
`company_analytics_events` (1), `debt_payments` (1), `events` (1), `expense_items` (1),
`instagram_automation_posts` (3), `investment_items` (1), `khums_entries` (1),
`khums_payments` (1), `khums_reminders` (1), `market_news_bookmarks` (1),
`market_news_conflicts` (2), `market_news_story_clusters` (2), `market_news_story_sources` (1),
`orders` (1), `page_views` (1), `payment_history` (2), `project_documents` (1),
`project_due_diligence_items` (1), `project_expenses` (1), `project_funding_readiness` (1),
`project_funding_shortlist` (2), `project_investor_events` (2), `project_investor_links` (1),
`project_investor_questions` (2), `project_jurisdiction_assessments` (1),
`project_milestones` (1), `project_pitch_decks` (1), `project_risks` (1), `project_tasks` (1),
`savings` (1), `savings_items` (1), `sharia_research_jobs` (3),
`sharia_screening_results` (1), `sharia_search_history` (4), `signal_notifications` (1),
`site_events` (1), `site_sessions` (1), `subscription_notifications` (3), `trader_access` (1),
`trader_notification_log` (1).

### RLS auth-function InitPlan optimization — 201 findings / 56 tables

- Root cause: policies call `auth.uid()`, another `auth.*` function, or `current_setting()`
  directly, allowing PostgreSQL to re-evaluate the expression for each row instead of once as
  an InitPlan.
- Estimated impact: avoidable CPU and latency on RLS-filtered queries; impact becomes material
  on scans or high-cardinality tables.
- Recommended fix: preserve each authorization predicate while converting stable auth lookups
  to scalar subqueries, followed by owner/admin/cross-user regression tests.
- Migration risk: **Medium–High** — the syntactic optimization is simple, but changing 201 policy
  expressions creates broad authorization-regression risk.
- Blocks Production: **No**, unless load testing ties a critical workflow failure or timeout to
  these policy evaluations.

Affected tables, with policy counts:

`ad_campaigns` (1), `analytics_events` (1), `business_customers` (4),
`business_employees` (4), `business_invoices` (4), `business_operating_expenses` (4),
`business_sales` (4), `business_suppliers` (4), `business_user_roles` (2),
`charity_beneficiaries` (4), `charity_commitments` (4), `charity_documents` (4),
`charity_project_contributors` (4), `charity_project_donations` (4),
`charity_project_impact_metrics` (4), `charity_projects` (4), `charity_reminders` (4),
`company_listings` (4), `debt_payments` (4), `debts` (4), `email_2fa_codes` (1),
`expense_items` (4), `financial_goals` (4), `financial_profiles` (1),
`generated_reports` (4), `holdings` (1), `market_agent_history` (2),
`market_price_alerts` (4), `market_watchlist` (4), `monthly_income_sources` (4),
`notifications` (4), `profiles` (4), `project_documents` (4),
`project_due_diligence_items` (4), `project_expenses` (4),
`project_feasibility_studies` (4), `project_financial_models` (4),
`project_funding_readiness` (4), `project_funding_shortlist` (4), `project_income` (4),
`project_investor_events` (3), `project_investor_links` (4),
`project_investor_questions` (4), `project_jurisdiction_assessments` (4),
`project_milestones` (4), `project_pitch_decks` (4), `project_risks` (4),
`project_strategic_documents` (4), `project_tasks` (4), `projects` (4), `savings` (4),
`savings_items` (4), `user_decisions` (4), `user_subscriptions` (1), `zakat_assets` (4),
`zakat_calculations` (4).

### Multiple permissive SELECT policies — 3 findings / 3 tables

- Root cause: PostgreSQL ORs multiple permissive policies for the same role/action, so each row
  can require multiple policy evaluations and policy overlap can be harder to reason about.
- Estimated impact: small query overhead and authorization-maintenance risk. The named policies
  appear intentional on `admin_roles` and `company_listings`; the `market_symbols` policies look
  semantically redundant.
- Recommended fix: review and consolidate only where the same access model can be expressed
  without widening access.
- Migration risk: **Medium–High** — policy consolidation can silently change visibility.
- Blocks Production: **No**.

Affected tables and policies:

- `admin_roles`: `Admins can read own admin role`; `Super admins can read all admin roles`
- `company_listings`: `Owners can read own company listings`; `Public can read approved company listings`
- `market_symbols`: `Anyone can read active market symbols`; `Authenticated users can read active market symbols`

## P3 — Cosmetic / informational only

### Unused indexes — 325 findings / 114 tables

- Root cause: the advisor was run immediately after applying the schema to an empty, data-free
  project. No application workload ran, so usage counters could not establish that any index was
  used.
- Estimated impact: **none can be inferred from this audit**. These records are expected in this
  environment and are not evidence that an index is redundant.
- Recommended fix: no schema change. Collect representative production-like index statistics
  and query plans over a defined observation window before considering any removal.
- Migration risk: **High if acted on now** — dropping an index from this evidence alone could
  create severe query, uniqueness, or write-path regressions.
- Blocks Production: **No**.

Affected tables, with index counts:

`account_activity` (2), `activity_logs` (2), `admin_audit_logs` (2), `admin_roles` (3),
`ai_usage_events` (2), `ai_usage_limits` (1), `analytics_events` (5),
`business_customers` (2), `business_employees` (5), `business_invoices` (3),
`business_operating_expenses` (2), `business_sales` (4), `business_suppliers` (2),
`charity_beneficiaries` (5), `charity_commitments` (1), `charity_documents` (4),
`charity_organizations` (4), `charity_project_contributors` (4),
`charity_project_donations` (4), `charity_project_impact_metrics` (2), `charity_projects` (4),
`charity_reminders` (9), `client_files` (1), `client_notes` (1), `clients` (3),
`company_analytics_events` (2), `company_listings` (7), `debts` (3),
`email_2fa_codes` (2), `events` (1), `expense_items` (8), `financial_goals` (1),
`funding_programs` (1), `generated_reports` (2), `holdings` (1),
`instagram_automation_events` (2), `instagram_automation_posts` (3), `investment_items` (11),
`investment_platforms` (3), `khums_entries` (2), `khums_payments` (2),
`khums_reminders` (2), `khums_years` (2), `market_agent_history` (1),
`market_news_article_markets` (2), `market_news_article_sectors` (1),
`market_news_article_symbols` (2), `market_news_articles` (14), `market_news_bookmarks` (1),
`market_news_conflicts` (1), `market_news_fetch_logs` (2),
`market_news_processing_results` (1), `market_news_source_health` (1),
`market_news_source_health_history` (1), `market_news_sources` (1),
`market_news_story_clusters` (22), `market_news_story_sources` (1), `market_price_alerts` (1),
`market_provider_state` (1), `market_signals` (3), `market_symbols` (12),
`market_watchlist` (1), `monthly_income_sources` (12), `news_translations` (2),
`notifications` (4), `page_views` (2), `payment_history` (2), `payments` (3),
`project_documents` (5), `project_due_diligence_items` (1), `project_expenses` (3),
`project_feasibility_studies` (2), `project_financial_models` (2),
`project_funding_readiness` (1), `project_funding_shortlist` (1), `project_income` (4),
`project_investor_events` (1), `project_investor_links` (1),
`project_investor_questions` (1), `project_jurisdiction_assessments` (1),
`project_milestones` (3), `project_pitch_decks` (1), `project_risks` (1),
`project_strategic_documents` (3), `project_tasks` (3), `projects` (1), `savings_items` (3),
`sharia_evidence_items` (2), `sharia_financial_values` (2), `sharia_research_jobs` (4),
`sharia_screening_results` (4), `sharia_search_history` (3),
`sharia_security_identities` (3), `sharia_source_documents` (4), `signal_history` (1),
`signal_notifications` (2), `site_events` (5), `site_sessions` (2),
`subscription_notifications` (1), `subscription_reminder_runs` (1), `subscriptions` (2),
`trader_access` (1), `trader_alerts` (2), `trader_cache` (1),
`trader_followed_trades` (4), `trader_notification_log` (1),
`trader_recommendation_history` (2), `trader_scan_results` (2), `trader_scan_runs` (1),
`user_decisions` (5), `user_signal_preferences` (1), `user_subscriptions` (1),
`zakat_assets` (1), `zakat_calculations` (3).

## Prioritized remediation order

1. Close or formally disprove the two public privileged-function exposures; regression-test
   auth signup, email confirmation/change, and profile synchronization.
2. Remove or explicitly accept avatar enumeration; review the intentional admin helper at the
   same security boundary.
3. Decide which 13 deny-all tables are intentionally server-only before adding any policy.
4. Optimize the 201 RLS expressions in small, workflow-aligned batches with cross-user tests.
5. Address the 12 mutable trigger paths and 3 overlapping policy sets.
6. Add justified foreign-key indexes based on workload and locking risk.
7. Treat all 325 unused-index records as non-actionable until representative usage statistics
   exist.

## Release conclusion

The lint set contains **two deduplicated P0 remediation items**, so it does block Production
under this classification. Independently, the clean-chain audit remains NO-GO because
`public.observability_events` is absent; that schema gap is not one of these 627 advisor
records and is not included in the priority counts above.
