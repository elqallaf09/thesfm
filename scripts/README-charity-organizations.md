# Charity Organization Import

This script prepares trusted, admin-managed imports for `public.charity_organizations`.

## CSV columns

Use UTF-8 CSV with these headers:

```csv
name_ar,name_en,license_number,country,city,organization_type,website_url,phone,email,verification_status,data_source
```

Only mark `verification_status` as `verified` when the source is official and recorded in `data_source`.
Otherwise use `pending_review` or `unverified`.

## Run

```bash
SUPABASE_URL="https://..." SUPABASE_SECRET_KEY="..." tsx scripts/import-charity-organizations.ts ./organizations.csv
```

The service role key is server-only. Never expose it through `NEXT_PUBLIC_*` variables or frontend code.

The script is not run automatically during app runtime.
