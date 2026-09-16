/** Selected SQL row fields used by the Economic Intelligence read adapters.
 * JSON and unselected/dynamic columns remain unknown and require narrowing.
 * These contracts do not bypass session ownership or database RLS checks.
 */
export type EconomicStoredRow = Record<string, unknown> & {
  id: string;
  event_key?: string | null;
  source_id?: string | null;
  status?: string | null;
  read?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  resolved_at?: string | null;
  severity?: string | null;
  action_url?: string | null;
  decision_type?: string | null;
  decision_title?: string | null;
  currency?: string | null;
  metadata?: unknown;
};
