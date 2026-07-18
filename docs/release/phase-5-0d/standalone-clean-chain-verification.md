# Standalone Supabase clean-chain verification

Status: **NO-GO — chain executes, but required observability schema is absent**

## Temporary project

- Project reference: `bmzaosxxfiqkmckaeguf`
- Project name: `thesfm-clean-chain-20260717191443`
- Region: `ap-south-1`
- Creation requested: `2026-07-17T19:14:43.058Z`
- Supabase API-reported creation timestamp: `2026-07-17T16:52:58.680956Z`
- PostgreSQL version: `17.6.1.147`
- Chain completion: `2026-07-17T19:44:55.260Z`
- Quoted project cost: `$0/month`

The project was created as a standalone isolated project. No Production or Preview project
reference, database credential, data export, clone, import, or backup was used.

## Migration result

- Local migration count: **129**
- Remote migration-history count: **129**
- First migration: `00000000000000_create_base_public_schema.sql`
- Last migration: `20260715070609_investment_platform_directory_index_hardening.sql`
- Repository SQL failures: **none**
- Full chain executable from an empty database: **yes**

The Supabase connector truncated batched statement-history payloads for migrations `073` and
`076`, producing synthetic `SQLSTATE 42601` errors containing literal “tokens truncated”
markers not present in the repository files. Both unchanged SQL files then passed in isolated
transactions, and compact history markers were recorded. Migration `080` initially hit the
same batching artifact and passed unchanged when retried in isolation.

### Per-migration outcomes

1. `00000000000000_create_base_public_schema.sql` — **PASSED**
2. `001_add_sfm_persistence_columns.sql` — **PASSED**
3. `002_create_notifications_and_campaigns.sql` — **PASSED**
4. `003_rls_and_profile_trigger.sql` — **PASSED**
5. `004_add_settings_preferences.sql` — **PASSED**
6. `005_expense_receipt_ai_fields.sql` — **PASSED**
7. `006_user_owned_table_rls_policies.sql` — **PASSED**
8. `007_add_expense_items_enhanced.sql` — **PASSED**
9. `008_add_financial_goals_current_amount.sql` — **PASSED**
10. `009_create_market_watchlist_and_alerts.sql` — **PASSED**
11. `010_create_market_symbols.sql` — **PASSED**
12. `011_add_income_phase1_fields.sql` — **PASSED**
13. `012_add_income_recurring_workflow.sql` — **PASSED**
14. `013_add_income_exports_attachments_currency.sql` — **PASSED**
15. `014_add_expense_currency.sql` — **PASSED**
16. `015_create_charity_projects.sql` — **PASSED**
17. `016_create_charity_documents.sql` — **PASSED**
18. `017_harden_charity_documents_storage.sql` — **PASSED**
19. `018_create_charity_reminders.sql` — **PASSED**
20. `019_create_charity_beneficiaries.sql` — **PASSED**
21. `020_create_charity_project_contributors.sql` — **PASSED**
22. `021_create_zakat_calculations.sql` — **PASSED**
23. `022_create_charity_organizations.sql` — **PASSED**
24. `023_create_charity_project_impact_metrics.sql` — **PASSED**
25. `024_create_project_feasibility_studies.sql` — **PASSED**
26. `025_create_project_financial_models.sql` — **PASSED**
27. `026_create_project_tasks_and_milestones.sql` — **PASSED**
28. `027_create_project_documents.sql` — **PASSED**
29. `028_create_project_pitch_decks.sql` — **PASSED**
30. `029_extend_notifications_for_smart_center.sql` — **PASSED**
31. `030_add_onboarding_profile_fields.sql` — **PASSED**
32. `031_harden_expense_items_save_flow.sql` — **PASSED**
33. `032_create_project_funding_readiness.sql` — **PASSED**
34. `033_create_business_jurisdiction_assessments.sql` — **PASSED**
35. `034_create_business_funding_programs.sql` — **PASSED**
36. `035_add_profile_view_mode.sql` — **PASSED**
37. `036_create_user_decisions.sql` — **PASSED**
38. `037_upgrade_signup_profile_security.sql` — **PASSED**
39. `038_create_project_expenses.sql` — **PASSED**
40. `039_add_email_two_factor_profile_fields.sql` — **PASSED**
41. `040_add_profile_optional_fields.sql` — **PASSED**
42. `041_create_project_income.sql` — **PASSED**
43. `042_create_business_operations_tables.sql` — **PASSED**
44. `043_upgrade_business_operations_roles_payroll.sql` — **PASSED**
45. `044_sync_profile_email_from_auth.sql` — **PASSED**
46. `045_fix_task_center_source_grants.sql` — **PASSED**
47. `046_fix_smart_notifications_source_grants.sql` — **PASSED**
48. `047_extend_onboarding_profile_fields.sql` — **PASSED**
49. `048_add_onboarding_skip_fields.sql` — **PASSED**
50. `049_dedupe_project_documents_identity.sql` — **PASSED**
51. `050_fix_user_decisions_schema.sql` — **PASSED**
52. `051_add_performance_indexes.sql` — **PASSED**
53. `052_fix_profiles_rls_id_policy.sql` — **PASSED**
54. `053_extend_savings_items_details.sql` — **PASSED**
55. `054_create_email_2fa_codes.sql` — **PASSED**
56. `055_cleanup_duplicate_documents.sql` — **PASSED**
57. `056_fix_user_decisions_amount_schema.sql` — **PASSED**
58. `057_align_user_decisions_real_schema.sql` — **PASSED**
59. `058_add_profiles_view_mode_default.sql` — **PASSED**
60. `059_reassert_profiles_id_ownership.sql` — **PASSED**
61. `060_reassert_business_operations_rls.sql` — **PASSED**
62. `061_fix_user_decisions_legacy_title_nullable.sql` — **PASSED**
63. `062_repair_charity_reminders_table.sql` — **PASSED**
64. `063_repair_investment_items_extended_schema.sql` — **PASSED**
65. `064_create_optional_document_tables.sql` — **PASSED**
66. `065_repair_signup_profile_schema.sql` — **PASSED**
67. `066_create_news_translations.sql` — **PASSED**
68. `067_create_analytics_events.sql` — **PASSED**
69. `068_create_debt_management.sql` — **PASSED**
70. `069_create_site_analytics_tables.sql` — **PASSED**
71. `070_extend_investment_items_market_fields.sql` — **PASSED**
72. `071_add_investment_market_value_fields.sql` — **PASSED**
73. `072_create_business_management_modules.sql` — **PASSED**
74. `073_align_business_employees_save_schema.sql` — **PASSED** (initial apply_migration wrapper produced SQLSTATE 42601 near synthetic truncation token; repository SQL then passed transactionally)
75. `074_align_business_sales_save_schema.sql` — **PASSED**
76. `075_repair_debts_save_schema.sql` — **PASSED**
77. `076_create_missing_debt_and_analytics_tables.sql` — **PASSED** (initial history wrapper inserted a synthetic truncation token and raised SQLSTATE 42601; repository SQL passed transactionally)
78. `077_ensure_site_analytics_tables.sql` — **PASSED**
79. `078_resolve_debt_save_schema_failure.sql` — **PASSED** (large migration applied without statement-history payload)
80. `079_investment_items_extended_fields.sql` — **PASSED**
81. `080_fix_savings_items_save_schema.sql` — **PASSED** (initial batched call was truncated by connector; isolated retry used unchanged full SQL)
82. `081_fix_profiles_profession_save_schema.sql` — **PASSED**
83. `082_fix_business_suppliers_save_schema.sql` — **PASSED**
84. `083_fix_business_sales_save_schema.sql` — **PASSED**
85. `084_fix_business_operating_expenses_schema.sql` — **PASSED**
86. `085_monthly_debt_amortization.sql` — **PASSED**
87. `086_add_investment_purchase_price_fields.sql` — **PASSED**
88. `087_harden_project_expense_currency.sql` — **PASSED**
89. `088_upgrade_investment_items_asset_details.sql` — **PASSED**
90. `089_add_income_monthly_calculation_mode.sql` — **PASSED**
91. `090_add_market_native_currency_metadata.sql` — **PASSED**
92. `091_add_investment_native_converted_valuation.sql` — **PASSED**
93. `092_extend_investment_dynamic_asset_fields.sql` — **PASSED**
94. `093_create_company_listings_and_subscriptions.sql` — **PASSED**
95. `094_create_funding_programs.sql` — **PASSED**
96. `095_add_profile_avatar_storage.sql` — **PASSED**
97. `096_add_project_expense_ai_analysis.sql` — **PASSED**
98. `097_upgrade_market_symbols_exchange_coverage.sql` — **PASSED**
99. `098_harden_investment_holding_fields.sql` — **PASSED**
100. `099_backfill_investment_market_currencies.sql` — **PASSED**
101. `100_persist_investment_form_fields.sql` — **PASSED**
102. `101_create_market_provider_sessions.sql` — **PASSED**
103. `102_admin_company_review.sql` — **PASSED**
104. `103_create_market_agent_history.sql` — **PASSED**
105. `104_create_ai_usage_limits.sql` — **PASSED**
106. `105_company_owner_management.sql` — **PASSED**
107. `106_add_company_location_fields.sql` — **PASSED**
108. `107_company_assets_and_analytics.sql` — **PASSED**
109. `108_create_thesfm_trader_access_and_logs.sql` — **PASSED**
110. `109_create_trader_scanner_tables.sql` — **PASSED**
111. `110_create_account_activity.sql` — **PASSED**
112. `111_harden_news_translations_service_role_policy.sql` — **PASSED**
113. `112_harden_profile_trigger_search_path.sql` — **PASSED**
114. `113_create_subscription_client_management.sql` — **PASSED**
115. `114_create_instagram_automation.sql` — **PASSED**
116. `115_create_subscription_reminder_runs.sql` — **PASSED**
117. `116_create_khums_tables.sql` — **PASSED**
118. `117_create_admin_roles.sql` — **PASSED**
119. `118_create_market_signals_alerts.sql` — **PASSED**
120. `119_create_trader_followed_trades.sql` — **PASSED**
121. `120_add_shariah_fields_to_market_symbols.sql` — **PASSED**
122. `130_create_trader_cache.sql` — **PASSED**
123. `20260710000013_create_sharia_research_system.sql` — **PASSED**
124. `20260710124512_create_market_news_aggregation.sql` — **PASSED**
125. `20260710190000_create_market_provider_state.sql` — **PASSED**
126. `20260712130000_create_investor_relations.sql` — **PASSED**
127. `20260713222227_backfill_missing_auth_profiles.sql` — **PASSED**
128. `20260715070314_investment_platform_directory_tracking.sql` — **PASSED**
129. `20260715070609_investment_platform_directory_index_hardening.sql` — **PASSED**

## Metadata-only verification

- `public.profiles`: exists; RLS enabled
- `public.observability_events`: **missing**; RLS not applicable
- Existing public tables: 128
- Existing public tables with RLS disabled: 0
- Auth users: 0
- Storage objects: 0
- Storage buckets created by repository migrations: 7
- Public storage buckets after the chain: 4
- No `supabase/seed.sql` exists and no separate seed command was run
- No synthetic users or financial records were created

No checked-in migration references `observability_events`; the missing table is therefore a
repository schema gap, not a failed migration side effect.

## Regression tests

- `src/__tests__/unit/supabaseCleanChainBaseline.test.ts`: 4 passed, 0 failed

## Schema lint

- Security advisor warnings: 32
- Performance advisor warnings: 595
- Total warnings: 627
- Exact warnings: [clean-chain-schema-lint.md](./clean-chain-schema-lint.md)

## Cleanup

- Deletion status: **completed**
- Dashboard result: `Successfully deleted thesfm-clean-chain-20260717191443`
- Independent project-inventory confirmation: `2026-07-17T19:50:55.5586462Z`
- Temporary project present after deletion: no
- Remaining temporary credentials, branches, backups, or resources: none
- Final estimated cost: `$0.00` (project quote was `$0/month`)
- Credentials printed, exported, or committed: none
- Production migrations or migration-history changes: none
