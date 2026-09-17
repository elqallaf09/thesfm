-- Explicit exposure: do not depend on a project's default table grants.
-- Owner RLS remains in force; a browser may read, never author, valuations.
begin;

revoke all privileges on table
  public.investment_valuation_evidence,
  public.investment_valuation_snapshots,
  public.investment_snapshot_evidence
from public, anon, authenticated;

grant select on table
  public.investment_valuation_evidence,
  public.investment_valuation_snapshots,
  public.investment_snapshot_evidence
to authenticated;

grant select, insert on table
  public.investment_valuation_evidence,
  public.investment_valuation_snapshots,
  public.investment_snapshot_evidence
to service_role;

revoke all privileges on function
  public.persist_investment_valuation_snapshot(uuid, uuid, jsonb, jsonb, jsonb)
from public, anon, authenticated;
grant execute on function
  public.persist_investment_valuation_snapshot(uuid, uuid, jsonb, jsonb, jsonb)
to service_role;

commit;
