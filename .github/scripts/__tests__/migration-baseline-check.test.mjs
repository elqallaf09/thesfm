import { describe, it, expect, vi } from 'vitest';
import {
  BASELINE_VERSION,
  BASELINE_TABLES,
  BASELINE_FUNCTION_SPECS,
  assertSafeToWrite,
  assertSafeToMaterializeBaseline,
  parseMigrationListTable,
  classifyBaselineState,
  localMigrationVersions,
  verifyMigrationHistoryComplete,
  verifyBaselineRecordedOnce,
  hashBaselineFile,
  functionIdentity,
  assertBaselineFunctionCatalogRow,
  assertBaselineFunctionPrivileges,
  queryBaselineObjectStatus,
  queryBaselineFunctionCatalogRow,
  queryBaselineFunctionPrivileges,
  verifyBaselineFunctionSpec,
  queryBaselineRlsStatus,
  materializeBaseline,
  verifyPostMaterialization,
  MigrationBaselineError,
} from '../migration-baseline-check.mjs';

const GET_SITE_ANALYTICS_SPEC = BASELINE_FUNCTION_SPECS[0];

const VALID_CATALOG_ROW = Object.freeze({
  identity: 'public.get_site_analytics()',
  proname: 'get_site_analytics',
  prosecdef: true,
  proconfig: ['search_path=public'],
  result_type: 'json',
});

const VALID_PRIVILEGE_ROW = Object.freeze({
  service_role_execute: true,
  anon_execute: false,
  authenticated_execute: false,
});

const PRODUCTION_REF = 'aaaaaaaaaaaaaaaaaaaa';
const BRANCH_REF = 'bbbbbbbbbbbbbbbbbbbb';

const SAFE_ARGS = {
  ref: BRANCH_REF,
  productionRef: PRODUCTION_REF,
  source: 'workflow_created',
  branchId: 'branch-1',
  createdBranchId: 'branch-1',
  persistent: false,
};

function jsonResponse(status, body) {
  return { status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(body), json: async () => body };
}

describe('assertSafeToWrite', () => {
  it('does not throw for a workflow-created, non-persistent, non-Production branch matching branch_id', () => {
    expect(() => assertSafeToWrite(SAFE_ARGS)).not.toThrow();
  });

  it('refuses when the resolved ref equals SUPABASE_PRODUCTION_REF', () => {
    expect(() => assertSafeToWrite({ ...SAFE_ARGS, ref: PRODUCTION_REF })).toThrow(/equals SUPABASE_PRODUCTION_REF/);
  });

  it('refuses an externally reused branch', () => {
    expect(() => assertSafeToWrite({ ...SAFE_ARGS, source: 'externally_reused' })).toThrow(/only ever permitted for a branch this exact workflow run created/);
  });

  it('refuses when branch ownership (branch_id match) cannot be proven', () => {
    expect(() => assertSafeToWrite({ ...SAFE_ARGS, branchId: 'branch-1', createdBranchId: 'branch-2' })).toThrow(/does not match the exact branch/);
  });

  it('refuses when persistence/schema-only cannot be confirmed', () => {
    expect(() => assertSafeToWrite({ ...SAFE_ARGS, persistent: true })).toThrow(/non-persistent\/schema-only/);
  });
});

describe('assertSafeToMaterializeBaseline', () => {
  it('does not throw for a workflow-created branch with baseline state "fully_missing"', () => {
    expect(() => assertSafeToMaterializeBaseline({ ...SAFE_ARGS, baselineState: 'fully_missing' })).not.toThrow();
  });

  it('refuses (fails closed) a partial baseline state — never attempts automated partial repair', () => {
    expect(() => assertSafeToMaterializeBaseline({ ...SAFE_ARGS, baselineState: 'partial' })).toThrow(/partial state.*manual investigation/s);
  });

  it('refuses a healthy baseline state (nothing to materialize)', () => {
    expect(() => assertSafeToMaterializeBaseline({ ...SAFE_ARGS, baselineState: 'healthy' })).toThrow(/expected state "fully_missing"/);
  });

  it('refuses when the resolved ref could be Production, even with a fully_missing baseline', () => {
    expect(() => assertSafeToMaterializeBaseline({ ...SAFE_ARGS, ref: PRODUCTION_REF, baselineState: 'fully_missing' })).toThrow(/equals SUPABASE_PRODUCTION_REF/);
  });

  it('refuses an externally reused branch, even with a fully_missing baseline', () => {
    expect(() => assertSafeToMaterializeBaseline({ ...SAFE_ARGS, source: 'externally_reused', baselineState: 'fully_missing' })).toThrow(/only ever permitted for a branch this exact workflow run created/);
  });

  it('refuses when branch ownership cannot be proven, even with a fully_missing baseline', () => {
    expect(() => assertSafeToMaterializeBaseline({ ...SAFE_ARGS, branchId: 'x', createdBranchId: 'y', baselineState: 'fully_missing' })).toThrow(/does not match the exact branch/);
  });
});

describe('parseMigrationListTable', () => {
  const REAL_SAMPLE = `
   Local            | Remote           | Time (UTC)
  ------------------|------------------|-----------------------
   \`00000000000000\` | \`00000000000000\` | \`00000000000000\`
   \`001\`            | \` \`              | \`001\`
`;

  it('parses real CLI table output into structured rows, skipping header/separator lines', () => {
    expect(parseMigrationListTable(REAL_SAMPLE)).toEqual([
      { version: '00000000000000', local: true, remote: true },
      { version: '001', local: true, remote: false },
    ]);
  });
});

describe('classifyBaselineState', () => {
  it('is "healthy" when applied remotely and every baseline object exists', () => {
    const rows = [{ version: BASELINE_VERSION, local: true, remote: true }];
    expect(classifyBaselineState(rows, [])).toBe('healthy');
  });

  it('is "fully_missing" — the live-confirmed defect — when applied remotely and every baseline object is absent', () => {
    const rows = [{ version: BASELINE_VERSION, local: true, remote: true }];
    expect(classifyBaselineState(rows, [...BASELINE_TABLES])).toBe('fully_missing');
  });

  it('is "partial" when applied remotely and only some baseline objects are absent', () => {
    const rows = [{ version: BASELINE_VERSION, local: true, remote: true }];
    expect(classifyBaselineState(rows, ['profiles', 'events'])).toBe('partial');
  });

  it('is "not_yet_applied" when the baseline is not yet recorded remotely — the normal db push path handles it', () => {
    const rows = [{ version: BASELINE_VERSION, local: true, remote: false }];
    expect(classifyBaselineState(rows, [...BASELINE_TABLES])).toBe('not_yet_applied');
  });

  it('is "not_yet_applied" when the baseline row is absent from the table entirely', () => {
    expect(classifyBaselineState([], ['profiles'])).toBe('not_yet_applied');
  });
});

describe('localMigrationVersions', () => {
  it('extracts the version prefix and ignores non-sql files', () => {
    expect(localMigrationVersions(['00000000000000_create_base_public_schema.sql', '001_add_sfm_persistence_columns.sql', 'README.md']))
      .toEqual(['00000000000000', '001']);
  });
});

describe('verifyMigrationHistoryComplete', () => {
  it('does not throw when every local version appears exactly once remotely', () => {
    const rows = [
      { version: '00000000000000', local: true, remote: true },
      { version: '001', local: true, remote: true },
    ];
    expect(() => verifyMigrationHistoryComplete(['00000000000000', '001'], rows)).not.toThrow();
  });

  it('throws (NO-GO) when a local version is missing remotely', () => {
    const rows = [{ version: '00000000000000', local: true, remote: true }];
    expect(() => verifyMigrationHistoryComplete(['00000000000000', '001'], rows)).toThrow(/missing 1 local version/);
  });

  it('throws (NO-GO) when a version appears more than once remotely — migration history duplicated', () => {
    const rows = [
      { version: '00000000000000', local: true, remote: true },
      { version: '00000000000000', local: true, remote: true },
    ];
    expect(() => verifyMigrationHistoryComplete(['00000000000000'], rows)).toThrow(/duplicate remote entries/);
  });
});

describe('verifyBaselineRecordedOnce', () => {
  it('does not throw when the baseline appears exactly once, applied', () => {
    expect(() => verifyBaselineRecordedOnce([{ version: BASELINE_VERSION, local: true, remote: true }])).not.toThrow();
  });

  it('throws when the baseline no longer appears applied at all', () => {
    expect(() => verifyBaselineRecordedOnce([{ version: BASELINE_VERSION, local: true, remote: false }])).toThrow(/no longer appears as applied/);
  });

  it('throws (migration history duplicated) when the baseline appears more than once', () => {
    const rows = [
      { version: BASELINE_VERSION, local: true, remote: true },
      { version: BASELINE_VERSION, local: true, remote: true },
    ];
    expect(() => verifyBaselineRecordedOnce(rows)).toThrow(/more than once/);
  });
});

describe('hashBaselineFile', () => {
  it('reports a stable sha256 and byte size without ever needing the raw SQL to be logged', () => {
    const result = hashBaselineFile('select 1;');
    expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(result.bytes).toBe(Buffer.byteLength('select 1;', 'utf8'));
  });

  it('produces different hashes for different content', () => {
    expect(hashBaselineFile('a').sha256).not.toBe(hashBaselineFile('b').sha256);
  });
});

describe('queryBaselineObjectStatus / queryBaselineRlsStatus', () => {
  it('reports which baseline tables are present vs missing', async () => {
    const fetchImpl = vi.fn(async (url, init) => {
      expect(url).toBe(`https://api.supabase.com/v1/projects/${BRANCH_REF}/database/query/read-only`);
      expect(JSON.parse(init.body).query).toContain('information_schema.tables');
      return jsonResponse(201, [{ table_name: 'profiles' }]);
    });
    const result = await queryBaselineObjectStatus({ ref: BRANCH_REF, accessToken: 't', fetchImpl });
    expect(result.present).toEqual(['profiles']);
    expect(result.missing).toEqual(BASELINE_TABLES.filter((t) => t !== 'profiles'));
  });

  it('reports tables missing RLS and tables missing entirely', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(201, [
      { relname: 'profiles', relrowsecurity: true },
      { relname: 'events', relrowsecurity: false },
    ]));
    const result = await queryBaselineRlsStatus({ ref: BRANCH_REF, accessToken: 't', fetchImpl });
    expect(result.withoutRls).toEqual(['events']);
  });
});

// A live run showed the Management API's write-query call can succeed and
// actually create the function, while information_schema.routines still
// reports it missing (plausibly because the read-only query role has no
// EXECUTE privilege on a function the baseline immediately locks down to
// service_role only). These tests cover the pg_catalog-based replacement.
describe('assertBaselineFunctionCatalogRow (pure)', () => {
  it('passes for a single row matching every expected property', () => {
    expect(() => assertBaselineFunctionCatalogRow(GET_SITE_ANALYTICS_SPEC, [VALID_CATALOG_ROW])).not.toThrow();
  });

  it('fails closed when pg_proc returns no matching function (also covers a wrong argument signature, which the SQL filter excludes the same way)', () => {
    expect(() => assertBaselineFunctionCatalogRow(GET_SITE_ANALYTICS_SPEC, []))
      .toThrow(/not found via pg_catalog/);
  });

  it('fails closed on duplicate matching functions', () => {
    expect(() => assertBaselineFunctionCatalogRow(GET_SITE_ANALYTICS_SPEC, [VALID_CATALOG_ROW, VALID_CATALOG_ROW]))
      .toThrow(/expected exactly one/);
  });

  it('fails closed when SECURITY DEFINER is false', () => {
    expect(() => assertBaselineFunctionCatalogRow(GET_SITE_ANALYTICS_SPEC, [{ ...VALID_CATALOG_ROW, prosecdef: false }]))
      .toThrow(/not SECURITY DEFINER/);
  });

  it('fails closed when search_path is missing from proconfig', () => {
    expect(() => assertBaselineFunctionCatalogRow(GET_SITE_ANALYTICS_SPEC, [{ ...VALID_CATALOG_ROW, proconfig: null }]))
      .toThrow(/does not have "search_path=public"/);
  });

  it('fails closed when search_path is set to the wrong value', () => {
    expect(() => assertBaselineFunctionCatalogRow(GET_SITE_ANALYTICS_SPEC, [{ ...VALID_CATALOG_ROW, proconfig: ['search_path=other'] }]))
      .toThrow(/does not have "search_path=public"/);
  });

  it('accepts proconfig serialized as a Postgres array literal string', () => {
    expect(() => assertBaselineFunctionCatalogRow(GET_SITE_ANALYTICS_SPEC, [{ ...VALID_CATALOG_ROW, proconfig: '{search_path=public}' }]))
      .not.toThrow();
  });

  it('fails closed on the wrong result type', () => {
    expect(() => assertBaselineFunctionCatalogRow(GET_SITE_ANALYTICS_SPEC, [{ ...VALID_CATALOG_ROW, result_type: 'jsonb' }]))
      .toThrow(/returns "jsonb", expected "json"/);
  });
});

describe('assertBaselineFunctionPrivileges (pure)', () => {
  it('passes when the granted role has EXECUTE and the revoked roles do not', () => {
    expect(() => assertBaselineFunctionPrivileges(GET_SITE_ANALYTICS_SPEC, VALID_PRIVILEGE_ROW)).not.toThrow();
  });

  it('fails closed when service_role lacks EXECUTE', () => {
    expect(() => assertBaselineFunctionPrivileges(GET_SITE_ANALYTICS_SPEC, { ...VALID_PRIVILEGE_ROW, service_role_execute: false }))
      .toThrow(/"service_role" lacks EXECUTE/);
  });

  it('fails closed when anon unexpectedly has EXECUTE', () => {
    expect(() => assertBaselineFunctionPrivileges(GET_SITE_ANALYTICS_SPEC, { ...VALID_PRIVILEGE_ROW, anon_execute: true }))
      .toThrow(/"anon" unexpectedly has EXECUTE/);
  });

  it('fails closed when authenticated unexpectedly has EXECUTE', () => {
    expect(() => assertBaselineFunctionPrivileges(GET_SITE_ANALYTICS_SPEC, { ...VALID_PRIVILEGE_ROW, authenticated_execute: true }))
      .toThrow(/"authenticated" unexpectedly has EXECUTE/);
  });
});

describe('queryBaselineFunctionCatalogRow / queryBaselineFunctionPrivileges', () => {
  it('queries pg_catalog.pg_proc/pg_namespace, not information_schema.routines', async () => {
    const fetchImpl = vi.fn(async (url, init) => {
      const query = JSON.parse(init.body).query;
      expect(query).toContain('pg_catalog.pg_proc');
      expect(query).toContain('pg_catalog.pg_namespace');
      expect(query).not.toContain('information_schema.routines');
      return jsonResponse(201, [VALID_CATALOG_ROW]);
    });
    const rows = await queryBaselineFunctionCatalogRow({ ref: BRANCH_REF, accessToken: 't', fetchImpl, spec: GET_SITE_ANALYTICS_SPEC });
    expect(rows).toEqual([VALID_CATALOG_ROW]);
  });

  it('queries has_function_privilege for every granted and revoked role', async () => {
    const fetchImpl = vi.fn(async (url, init) => {
      const query = JSON.parse(init.body).query;
      expect(query).toContain("has_function_privilege('service_role', 'public.get_site_analytics()', 'EXECUTE')");
      expect(query).toContain("has_function_privilege('anon', 'public.get_site_analytics()', 'EXECUTE')");
      expect(query).toContain("has_function_privilege('authenticated', 'public.get_site_analytics()', 'EXECUTE')");
      return jsonResponse(201, [VALID_PRIVILEGE_ROW]);
    });
    const row = await queryBaselineFunctionPrivileges({ ref: BRANCH_REF, accessToken: 't', fetchImpl, spec: GET_SITE_ANALYTICS_SPEC });
    expect(row).toEqual(VALID_PRIVILEGE_ROW);
  });

  it('fails closed when the privilege query returns no rows', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(201, []));
    await expect(queryBaselineFunctionPrivileges({ ref: BRANCH_REF, accessToken: 't', fetchImpl, spec: GET_SITE_ANALYTICS_SPEC }))
      .rejects.toThrow(/returned no rows/);
  });
});

describe('verifyBaselineFunctionSpec (live queries, mocked)', () => {
  function fetchFor(catalogRows, privilegeRow) {
    return vi.fn(async (url, init) => {
      const query = JSON.parse(init.body).query;
      if (query.includes('pg_proc')) return jsonResponse(201, catalogRows);
      if (query.includes('has_function_privilege')) return jsonResponse(201, privilegeRow ? [privilegeRow] : []);
      throw new Error(`Unexpected query in test: ${query}`);
    });
  }

  it('passes end-to-end when pg_catalog and privileges both check out — even if information_schema would have reported the function missing', async () => {
    const fetchImpl = fetchFor([VALID_CATALOG_ROW], VALID_PRIVILEGE_ROW);
    await expect(verifyBaselineFunctionSpec({ ref: BRANCH_REF, accessToken: 't', fetchImpl, spec: GET_SITE_ANALYTICS_SPEC }))
      .resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('never queries information_schema.routines', async () => {
    const fetchImpl = fetchFor([VALID_CATALOG_ROW], VALID_PRIVILEGE_ROW);
    await verifyBaselineFunctionSpec({ ref: BRANCH_REF, accessToken: 't', fetchImpl, spec: GET_SITE_ANALYTICS_SPEC });
    for (const call of fetchImpl.mock.calls) {
      expect(JSON.parse(call[1].body).query).not.toContain('information_schema.routines');
    }
  });

  it('fails closed end-to-end when pg_proc has no matching row', async () => {
    const fetchImpl = fetchFor([], VALID_PRIVILEGE_ROW);
    await expect(verifyBaselineFunctionSpec({ ref: BRANCH_REF, accessToken: 't', fetchImpl, spec: GET_SITE_ANALYTICS_SPEC }))
      .rejects.toThrow(/not found via pg_catalog/);
  });

  it('fails closed end-to-end when the privilege check shows service_role lacks EXECUTE', async () => {
    const fetchImpl = fetchFor([VALID_CATALOG_ROW], { ...VALID_PRIVILEGE_ROW, service_role_execute: false });
    await expect(verifyBaselineFunctionSpec({ ref: BRANCH_REF, accessToken: 't', fetchImpl, spec: GET_SITE_ANALYTICS_SPEC }))
      .rejects.toThrow(/"service_role" lacks EXECUTE/);
  });
});

describe('functionIdentity', () => {
  it('builds a schema.name(args) identity string', () => {
    expect(functionIdentity(GET_SITE_ANALYTICS_SPEC)).toBe('public.get_site_analytics()');
  });
});

describe('materializeBaseline', () => {
  it('posts the exact SQL to the write-query endpoint (read_only: false) and succeeds on a 2xx response', async () => {
    const fetchImpl = vi.fn(async (url, init) => {
      expect(url).toBe(`https://api.supabase.com/v1/projects/${BRANCH_REF}/database/query`);
      expect(init.headers.Authorization).toBe('Bearer test-token');
      const body = JSON.parse(init.body);
      expect(body).toEqual({ query: 'create table x();', read_only: false });
      return jsonResponse(201, []);
    });
    await expect(materializeBaseline({ ref: BRANCH_REF, accessToken: 'test-token', sql: 'create table x();', fetchImpl })).resolves.toBeDefined();
  });

  it.each([401, 403, 429, 500])('fails closed on Management API HTTP %s', async (status) => {
    const fetchImpl = vi.fn(async () => jsonResponse(status, { message: `simulated ${status}` }));
    await expect(materializeBaseline({ ref: BRANCH_REF, accessToken: 't', sql: 'select 1;', fetchImpl }))
      .rejects.toThrow(new RegExp(`HTTP ${status}`));
  });

  it('fails closed when the response body reports a SQL error despite a 2xx HTTP status', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { error: 'relation "x" already exists' }));
    await expect(materializeBaseline({ ref: BRANCH_REF, accessToken: 't', sql: 'select 1;', fetchImpl }))
      .rejects.toThrow(/SQL error.*already exists/);
  });

  it('fails closed on a network error', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('ECONNRESET'); });
    await expect(materializeBaseline({ ref: BRANCH_REF, accessToken: 't', sql: 'select 1;', fetchImpl }))
      .rejects.toThrow(/Could not reach the Supabase Management API/);
  });
});

describe('verifyPostMaterialization', () => {
  const BASELINE_APPLIED_ONCE = `
   Local            | Remote           | Time (UTC)
  ------------------|------------------|-----------------------
   \`00000000000000\` | \`00000000000000\` | \`00000000000000\`
`;

  function allPresentFetch() {
    return vi.fn(async (url, init) => {
      const query = JSON.parse(init.body).query;
      if (query.includes('information_schema.tables')) return jsonResponse(201, BASELINE_TABLES.map((t) => ({ table_name: t })));
      if (query.includes('pg_proc')) return jsonResponse(201, [VALID_CATALOG_ROW]);
      if (query.includes('has_function_privilege')) return jsonResponse(201, [VALID_PRIVILEGE_ROW]);
      return jsonResponse(201, BASELINE_TABLES.map((t) => ({ relname: t, relrowsecurity: true })));
    });
  }

  it('passes when the baseline is recorded once and every object/function/RLS is present', async () => {
    await expect(verifyPostMaterialization({
      ref: BRANCH_REF,
      accessToken: 't',
      fetchImpl: allPresentFetch(),
      migrationStatusText: BASELINE_APPLIED_ONCE,
    })).resolves.toBeUndefined();
  });

  it('is a workflow NO-GO when a baseline object is still missing after materialization', async () => {
    const fetchImpl = vi.fn(async (url, init) => {
      const query = JSON.parse(init.body).query;
      if (query.includes('information_schema.tables')) return jsonResponse(201, BASELINE_TABLES.filter((t) => t !== 'profiles').map((t) => ({ table_name: t })));
      return jsonResponse(201, []);
    });
    await expect(verifyPostMaterialization({ ref: BRANCH_REF, accessToken: 't', fetchImpl, migrationStatusText: BASELINE_APPLIED_ONCE }))
      .rejects.toThrow(/still missing after materialization.*profiles/s);
  });

  it('is a workflow NO-GO when pg_catalog shows the baseline function still missing after materialization — this is the exact live regression this check was rewritten to catch correctly', async () => {
    const fetchImpl = vi.fn(async (url, init) => {
      const query = JSON.parse(init.body).query;
      if (query.includes('information_schema.tables')) return jsonResponse(201, BASELINE_TABLES.map((t) => ({ table_name: t })));
      if (query.includes('pg_proc')) return jsonResponse(201, []);
      return jsonResponse(201, []);
    });
    await expect(verifyPostMaterialization({ ref: BRANCH_REF, accessToken: 't', fetchImpl, migrationStatusText: BASELINE_APPLIED_ONCE }))
      .rejects.toThrow(/not found via pg_catalog/);
  });

  it('is a workflow NO-GO when the function exists via pg_catalog but service_role lacks EXECUTE', async () => {
    const fetchImpl = vi.fn(async (url, init) => {
      const query = JSON.parse(init.body).query;
      if (query.includes('information_schema.tables')) return jsonResponse(201, BASELINE_TABLES.map((t) => ({ table_name: t })));
      if (query.includes('pg_proc')) return jsonResponse(201, [VALID_CATALOG_ROW]);
      if (query.includes('has_function_privilege')) return jsonResponse(201, [{ ...VALID_PRIVILEGE_ROW, service_role_execute: false }]);
      return jsonResponse(201, []);
    });
    await expect(verifyPostMaterialization({ ref: BRANCH_REF, accessToken: 't', fetchImpl, migrationStatusText: BASELINE_APPLIED_ONCE }))
      .rejects.toThrow(/"service_role" lacks EXECUTE/);
  });
});
