# Funding Programs Import

This script prepares trusted, admin-managed imports for `public.business_funding_programs`.

No funding program should be imported as `verified` unless the source is official or otherwise reviewed by the admin team and recorded in `data_source_url`.

## CSV Columns

Use UTF-8 CSV with these headers:

```csv
name_ar,name_en,funding_type,country,provider_name,website_url,application_url,currency,typical_ticket_min,typical_ticket_max,data_status,data_source_url
```

Allowed `funding_type` values:

```text
self_funding,bank_loan,government_fund,angel,venture_capital,accelerator,incubator,islamic_finance,grant,strategic_partner,other
```

Allowed `data_status` values:

```text
verified,pending_review,unverified,outdated
```

Leave ticket sizes, deadlines, eligibility, or links empty unless they come from the recorded source. The app will not invent missing values.

## Run

```bash
SUPABASE_URL="https://..." SUPABASE_SERVICE_ROLE_KEY="..." tsx scripts/import-funding-programs.ts ./funding-programs.csv
```

The service role key is server-only. Never expose it through `NEXT_PUBLIC_*` variables or frontend code.

The script is not run automatically during app runtime.
