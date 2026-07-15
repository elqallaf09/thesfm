-- Phase 4.2A follow-up: cover the new foreign keys directly for efficient
-- reference checks and moderation lookups. Additive and safe to rerun.
create index if not exists investment_items_purchase_platform_id_idx
  on public.investment_items (purchase_platform_id)
  where purchase_platform_id is not null;

create index if not exists investment_platforms_approved_by_idx
  on public.investment_platforms (approved_by)
  where approved_by is not null;
