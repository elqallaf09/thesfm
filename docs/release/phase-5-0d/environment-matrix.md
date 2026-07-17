# Environment-variable matrix

Captured read-only from Vercel project metadata on 2026-07-17. Values were not retrieved, printed, or written. “Configured” proves only that a variable name exists for the listed target; it does not prove value correctness, provider mode, or credential validity.

## Release-critical findings

- The same Vercel entries for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` target both Preview and Production. With Supabase Preview branches skipped on the Free plan, authenticated Preview mutation testing is blocked until environment isolation is proven.
- Stripe and SMTP entries also target both Preview and Production. Their mode/value parity was not inspected; live payment and email delivery remain unverified.
- Observability variables are Preview-only, so Production ingestion and alerting are not configured by this evidence.
- Client-visible variable names: `NEXT_PUBLIC_ADMIN_EMAILS`, `NEXT_PUBLIC_API_SUCCESS_SAMPLE_RATE`, `NEXT_PUBLIC_DATABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_DATABASE_URL`, `NEXT_PUBLIC_LONG_TASK_SAMPLE_RATE`, `NEXT_PUBLIC_MEMORY_SAMPLE_RATE`, `NEXT_PUBLIC_OBSERVABILITY_ENABLED`, `NEXT_PUBLIC_ROUTE_SAMPLE_RATE`, `NEXT_PUBLIC_RUM_SAMPLE_RATE`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`.

| Name | Environment | Required | Configured | Secret/public | Owner | Test evidence |
|---|---|---:|---:|---|---|---|
| ADMIN_ACCESS_CODE | production | Conditional | Yes (value not read) | server-only | Security / Operations | Vercel metadata: name present |
| ADMIN_EMAILS | preview, production | Conditional | Yes (value not read) | server-only | Security / Operations | Vercel metadata: name present |
| AI_GATEWAY_TOKEN | preview, production | Conditional | Yes (value not read) | server-only | AI platform | Vercel metadata: name present |
| ALPHA_VANTAGE_API_KEY | preview, production | Conditional | Yes (value not read) | server-only | Market data / Integrations | Vercel metadata: name present |
| ANTHROPIC_API_KEY | preview, production | Conditional | Yes (value not read) | server-only | AI platform | Vercel metadata: name present |
| CENTRAL_BANK_NEWS_API_KEY | preview, production | Conditional | Yes (value not read) | server-only | Market data / Integrations | Vercel metadata: name present |
| COMPANY_REVIEW_TO_EMAIL | preview, production | Conditional | Yes (value not read) | server-only | Operations / Email | Vercel metadata: name present |
| CONTACT_FROM_EMAIL | preview, production | Conditional | Yes (value not read) | server-only | Operations / Email | Vercel metadata: name present |
| CONTACT_TO_EMAIL | preview, production | Conditional | Yes (value not read) | server-only | Operations / Email | Vercel metadata: name present |
| CRON_SECRET | preview, production | Yes | Yes (value not read) | server-only | Platform / SRE | Vercel metadata: name present |
| DATABASE_SERVICE_ROLE_KEY | production | Conditional | Yes (value not read) | server-only | Backend / DB | Vercel metadata: name present |
| DATABASE_URL | preview, production | Conditional | Yes (value not read) | server-only | Backend / DB | Vercel metadata: name present |
| ECONOMIC_CALENDAR_API_KEY | preview, production | Conditional | Yes (value not read) | server-only | Market data / Integrations | Vercel metadata: name present |
| ECONOMIC_CALENDAR_PROVIDER | preview, production | Conditional | Yes (value not read) | server-only | Market data / Integrations | Vercel metadata: name present |
| ECONOMIC_DATA_PROVIDER | preview, production | Conditional | Yes (value not read) | server-only | Market data / Integrations | Vercel metadata: name present |
| EODHD_API_KEY | preview, production | Conditional | Yes (value not read) | server-only | Market data / Integrations | Vercel metadata: name present |
| FINNHUB_API_KEY | production, preview | Conditional | Yes (value not read) | server-only | Market data / Integrations | Vercel metadata: name present |
| FMP_API_BASE_URL | preview, production | Conditional | Yes (value not read) | server-only | Market data / Integrations | Vercel metadata: name present |
| FMP_API_KEY | preview, production | Conditional | Yes (value not read) | server-only | Market data / Integrations | Vercel metadata: name present |
| FRED_API_KEY | preview, production | Conditional | Yes (value not read) | server-only | Market data / Integrations | Vercel metadata: name present |
| FRED_BASE_URL | preview, production | Conditional | Yes (value not read) | server-only | Market data / Integrations | Vercel metadata: name present |
| GOOGLE_APPLICATION_CREDENTIALS_JSON | preview, production | Conditional | Yes (value not read) | server-only | Document AI | Vercel metadata: name present |
| GOOGLE_CLOUD_PROJECT_ID | production, preview | Conditional | Yes (value not read) | server-only | Document AI | Vercel metadata: name present |
| GOOGLE_DOCUMENT_AI_LOCATION | production, preview | Conditional | Yes (value not read) | server-only | Document AI | Vercel metadata: name present |
| GOOGLE_DOCUMENT_AI_PROCESSOR_ID | production, preview | Conditional | Yes (value not read) | server-only | Document AI | Vercel metadata: name present |
| MARKET_SENTIMENT_API_KEY | preview, production | Conditional | Yes (value not read) | server-only | Market data / Integrations | Vercel metadata: name present |
| MARKET_SENTIMENT_PROVIDER | production, preview | Conditional | Yes (value not read) | server-only | Market data / Integrations | Vercel metadata: name present |
| METALS_API_KEY | preview, production | Conditional | Yes (value not read) | server-only | Market data / Integrations | Vercel metadata: name present |
| MYFXBOOK_API_BASE_URL | production, preview | Conditional | Yes (value not read) | server-only | Market data / Integrations | Vercel metadata: name present |
| MYFXBOOK_EMAIL | production, preview | Conditional | Yes (value not read) | server-only | Market data / Integrations | Vercel metadata: name present |
| MYFXBOOK_PASSWORD | production, preview | Conditional | Yes (value not read) | server-only | Market data / Integrations | Vercel metadata: name present |
| MYMEMORY_EMAIL | preview, production | Conditional | Yes (value not read) | server-only | Market data / Integrations | Vercel metadata: name present |
| NEWS_API_KEY | preview, production | Conditional | Yes (value not read) | server-only | Market data / Integrations | Vercel metadata: name present |
| NEXT_PUBLIC_ADMIN_EMAILS | preview, production | Conditional | Yes (value not read) | public/client | Security / Operations | Vercel metadata: name present |
| NEXT_PUBLIC_API_SUCCESS_SAMPLE_RATE | preview | Conditional | Yes (value not read) | public/client | Market data / Integrations | Vercel metadata: name present |
| NEXT_PUBLIC_DATABASE_PUBLISHABLE_KEY | production | Conditional | Yes (value not read) | public/client | Backend / DB | Vercel metadata: name present |
| NEXT_PUBLIC_DATABASE_URL | production, preview | Conditional | Yes (value not read) | public/client | Backend / DB | Vercel metadata: name present |
| NEXT_PUBLIC_LONG_TASK_SAMPLE_RATE | preview | Conditional | Yes (value not read) | public/client | Market data / Integrations | Vercel metadata: name present |
| NEXT_PUBLIC_MEMORY_SAMPLE_RATE | preview | Conditional | Yes (value not read) | public/client | Market data / Integrations | Vercel metadata: name present |
| NEXT_PUBLIC_OBSERVABILITY_ENABLED | preview | Conditional | Yes (value not read) | public/client | Platform / SRE | Vercel metadata: name present; Preview only; Production unverified |
| NEXT_PUBLIC_ROUTE_SAMPLE_RATE | preview | Conditional | Yes (value not read) | public/client | Market data / Integrations | Vercel metadata: name present |
| NEXT_PUBLIC_RUM_SAMPLE_RATE | preview | Conditional | Yes (value not read) | public/client | Market data / Integrations | Vercel metadata: name present |
| NEXT_PUBLIC_SITE_URL | preview, production | Yes | Yes (value not read) | public/client | Web platform | Vercel metadata: name present |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | preview, production | Yes if paid launch | Yes (value not read) | public/client | Billing | Vercel metadata: name present; unauth routes 401; invalid webhook 400; live flow unverified |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | preview, production | Yes | Yes (value not read) | public/client | Backend / DB | Vercel metadata: name present; Production DB health 200 |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | production | Conditional | Yes (value not read) | public/client | Backend / DB | Vercel metadata: name present |
| NEXT_PUBLIC_SUPABASE_URL | preview, production | Yes | Yes (value not read) | public/client | Backend / DB | Vercel metadata: name present; Production DB health 200 |
| OBSERVABILITY_ALERT_RETENTION_DAYS | preview | Conditional | Yes (value not read) | server-only | Platform / SRE | Vercel metadata: name present; Preview only; Production unverified |
| OBSERVABILITY_ALERTS_ENABLED | preview | Conditional | Yes (value not read) | server-only | Platform / SRE | Vercel metadata: name present; Preview only; Production unverified |
| OBSERVABILITY_PROVIDER_SUCCESS_SAMPLE_RATE | preview | Conditional | Yes (value not read) | server-only | Platform / SRE | Vercel metadata: name present; Preview only; Production unverified |
| OBSERVABILITY_RETENTION_DAYS | preview | Conditional | Yes (value not read) | server-only | Platform / SRE | Vercel metadata: name present; Preview only; Production unverified |
| OBSERVABILITY_ROLLUP_RETENTION_DAYS | preview | Conditional | Yes (value not read) | server-only | Platform / SRE | Vercel metadata: name present; Preview only; Production unverified |
| OPENAI_API_KEY | preview, production | Conditional | Yes (value not read) | server-only | AI platform | Vercel metadata: name present |
| POSTGRES_DATABASE | production | Conditional | Yes (value not read) | server-only | Backend / DB | Vercel metadata: name present |
| POSTGRES_HOST | production | Conditional | Yes (value not read) | server-only | Backend / DB | Vercel metadata: name present |
| POSTGRES_PASSWORD | production | Conditional | Yes (value not read) | server-only | Backend / DB | Vercel metadata: name present |
| POSTGRES_PRISMA_URL | production | Conditional | Yes (value not read) | server-only | Backend / DB | Vercel metadata: name present |
| POSTGRES_URL | production | Conditional | Yes (value not read) | server-only | Backend / DB | Vercel metadata: name present |
| POSTGRES_URL_NON_POOLING | production | Conditional | Yes (value not read) | server-only | Backend / DB | Vercel metadata: name present |
| POSTGRES_USER | production | Conditional | Yes (value not read) | server-only | Backend / DB | Vercel metadata: name present |
| SMTP_FROM | preview, production | Yes | Yes (value not read) | server-only | Operations / Email | Vercel metadata: name present; delivery unverified |
| SMTP_HOST | production, preview | Yes | Yes (value not read) | server-only | Operations / Email | Vercel metadata: name present; delivery unverified |
| SMTP_PASS | preview, production | Yes | Yes (value not read) | server-only | Operations / Email | Vercel metadata: name present; delivery unverified |
| SMTP_PORT | production, preview | Yes | Yes (value not read) | server-only | Operations / Email | Vercel metadata: name present; delivery unverified |
| SMTP_USER | preview, production | Yes | Yes (value not read) | server-only | Operations / Email | Vercel metadata: name present; delivery unverified |
| STRIPE_PRICE_COMPANY_YEARLY | preview, production | Yes if paid launch | Yes (value not read) | server-only | Billing | Vercel metadata: name present; unauth routes 401; invalid webhook 400; live flow unverified |
| STRIPE_PRICE_PREMIUM_MONTHLY | production, preview | Yes if paid launch | Yes (value not read) | server-only | Billing | Vercel metadata: name present; unauth routes 401; invalid webhook 400; live flow unverified |
| STRIPE_PRICE_PREMIUM_YEARLY | production, preview | Yes if paid launch | Yes (value not read) | server-only | Billing | Vercel metadata: name present; unauth routes 401; invalid webhook 400; live flow unverified |
| STRIPE_SECRET_KEY | preview, production | Yes if paid launch | Yes (value not read) | server-only | Billing | Vercel metadata: name present; unauth routes 401; invalid webhook 400; live flow unverified |
| STRIPE_WEBHOOK_SECRET | preview, production | Yes if paid launch | Yes (value not read) | server-only | Billing | Vercel metadata: name present; unauth routes 401; invalid webhook 400; live flow unverified |
| SUPABASE_ANON_KEY | production | Conditional | Yes (value not read) | server-only | Backend / DB | Vercel metadata: name present |
| SUPABASE_JWT_SECRET | production | Conditional | Yes (value not read) | server-only | Backend / DB | Vercel metadata: name present |
| SUPABASE_PUBLISHABLE_KEY | production | Conditional | Yes (value not read) | server-only | Backend / DB | Vercel metadata: name present |
| SUPABASE_SECRET_KEY | production | Conditional | Yes (value not read) | server-only | Backend / DB | Vercel metadata: name present |
| SUPABASE_SERVICE_ROLE_KEY | preview, production | Yes | Yes (value not read) | server-only | Backend / DB | Vercel metadata: name present |
| SUPABASE_URL | production | Conditional | Yes (value not read) | server-only | Backend / DB | Vercel metadata: name present |
| SUPER_ADMIN_EMAILS | production, preview | Conditional | Yes (value not read) | server-only | Security / Operations | Vercel metadata: name present |
| TWELVE_DATA_API_KEY | preview, production | Conditional | Yes (value not read) | server-only | Market data / Integrations | Vercel metadata: name present |
| VERCEL_AUTOMATION_BYPASS_SECRET | preview | Conditional | Yes (value not read) | server-only | Platform / SRE | Vercel metadata: name present |

