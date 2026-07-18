import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { test } from '@playwright/test';
import { adminAuthStatePath, userAuthStatePath } from './auth-state';

const approvedPreviewOrigin = 'https://lwcaapfqxaoxkojehfdq.supabase.co';
const enabled = process.env.SFM_PREVIEW_OBSERVABILITY_QA === '1';

type StorageState = {
  cookies?: Array<{ name?: string; value?: string }>;
};

type ObservabilityRow = {
  session_id?: unknown;
  authenticated?: unknown;
  environment?: unknown;
  deployment_sha?: unknown;
  route_template?: unknown;
  event_type?: unknown;
  metric_name?: unknown;
};

test.use({
  storageState: userAuthStatePath,
  trace: 'off',
  screenshot: 'off',
  video: 'off',
});

test.describe('authenticated Preview release validation', () => {
  test.skip(!enabled, 'Preview-only request-to-row validation runs in the authenticated Preview job.');

  test('Preview user is denied admin observability access while the admin is allowed', async ({ browser, page, baseURL }) => {
    const previewOrigin = exactPreviewOrigin(baseURL);
    const userAccess = await adminAccessProbe(page, previewOrigin);
    assertAdminProbeOrigin(userAccess, previewOrigin);
    if (userAccess.me.status !== 200 || userAccess.me.isAdmin !== false) {
      throw new Error('Preview user admin identity probe did not resolve as a normal user.');
    }
    if (userAccess.operations.status !== 403 || userAccess.operations.code !== 'FORBIDDEN') {
      throw new Error('Preview user was not denied the admin observability route.');
    }

    const adminContext = await browser.newContext({ storageState: adminAuthStatePath });
    try {
      const adminPage = await adminContext.newPage();
      const adminAccess = await adminAccessProbe(adminPage, previewOrigin);
      assertAdminProbeOrigin(adminAccess, previewOrigin);
      if (adminAccess.me.status !== 200 || adminAccess.me.isAdmin !== true || adminAccess.me.role !== 'admin') {
        throw new Error('Preview admin identity probe did not resolve as the active admin fixture.');
      }
      if (adminAccess.operations.status !== 200 || adminAccess.operations.ok !== true) {
        throw new Error('Preview admin could not access the required admin observability route.');
      }
    } finally {
      await adminContext.close();
    }
  });

  test('authenticated browser request creates one isolated Preview observability row and cleans it up', async ({ page }) => {
  const previewOrigin = process.env.SUPABASE_PREVIEW_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const expectedSha = process.env.E2E_EXPECTED_DEPLOYMENT_SHA;
  if (previewOrigin !== approvedPreviewOrigin) {
    throw new Error('SUPABASE_PREVIEW_URL must target the approved isolated Preview project.');
  }
  if (!serviceRoleKey?.trim()) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for Preview row validation.');
  if (!expectedSha || !/^[0-9a-f]{40}$/i.test(expectedSha)) {
    throw new Error('E2E_EXPECTED_DEPLOYMENT_SHA must be the exact 40-character committed SHA.');
  }

  const userSession = await readSession(userAuthStatePath);
  const adminSession = await readSession(adminAuthStatePath);
  if (userSession.subject === adminSession.subject) {
    throw new Error('Cross-user isolation requires distinct authenticated user and admin sessions.');
  }

  const ownProfiles = await profileCount(previewOrigin, serviceRoleKey, userSession.token, userSession.subject);
  const otherProfiles = await profileCount(previewOrigin, serviceRoleKey, userSession.token, adminSession.subject);
  if (ownProfiles !== 1) throw new Error('Authenticated user could not read exactly their own Preview profile.');
  if (otherProfiles !== 0) throw new Error('Cross-user Preview profile isolation failed.');

  const navigation = await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  if ((navigation?.status() ?? 200) >= 500 || new URL(page.url()).pathname === '/login') {
    throw new Error('Authenticated Preview user flow failed before observability validation.');
  }

  const sessionId = `rc_${randomUUID().replaceAll('-', '')}`;
  let validationError: unknown;
  try {
    const before = await observabilityRows(previewOrigin, serviceRoleKey, sessionId);
    if (before.length !== 0) throw new Error('Synthetic observability session was not empty before validation.');

    const result = await page.evaluate(async ({ syntheticSession }) => {
      const response = await fetch('/api/observability', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          events: [{
            type: 'api_metric',
            name: 'rc_preview_request_to_row',
            value: 1,
            rating: 'good',
            route: '/projects/2c8a63fe-51d8-4d0a-9d68-1f498cde31ce?tab=finance',
            timestamp: new Date().toISOString(),
            sessionId: syntheticSession,
            authenticated: true,
            locale: 'en',
            theme: 'light',
            viewportClass: 'large',
            deviceClass: 'desktop',
            browserFamily: 'Chrome',
            networkClass: 'unknown',
            deploymentSha: 'client-value-must-not-win',
            buildVersion: 'release-candidate-validation',
            environment: 'preview',
            statusClass: '2xx',
            method: 'POST',
            endpointClass: 'observability_ingestion',
          }],
        }),
      });
      return { status: response.status };
    }, { syntheticSession: sessionId });
    if (result.status !== 204) {
      throw new Error(`Preview observability endpoint returned HTTP ${result.status}; expected 204.`);
    }

    const rows = await waitForSingleRow(previewOrigin, serviceRoleKey, sessionId);
    const row = rows[0];
    if (row.session_id !== sessionId) throw new Error('Synthetic observability row session did not match.');
    if (row.authenticated !== true) throw new Error('Synthetic observability row lost authenticated context.');
    if (row.environment !== 'preview') throw new Error('Synthetic observability row was not marked Preview.');
    if (row.deployment_sha !== expectedSha) throw new Error('Synthetic observability row deployment SHA did not match the committed SHA.');
    if (row.route_template !== '/projects/[id]') throw new Error('Synthetic observability route was not normalized.');
    if (row.event_type !== 'api_metric' || row.metric_name !== 'rc_preview_request_to_row') {
      throw new Error('Synthetic observability row identity did not match the validation event.');
    }

    const serialized = JSON.stringify(row);
    if (/@|bearer\s|eyJ[a-zA-Z0-9_-]{10,}\.|password|secret|cookie|authorization|api.?key|x-vercel/i.test(serialized)) {
      throw new Error('Synthetic observability row contained a prohibited PII or secret-like value.');
    }
  } catch (error) {
    validationError = error;
  } finally {
    await deleteObservabilityRows(previewOrigin, serviceRoleKey, sessionId);
    const remaining = await observabilityRows(previewOrigin, serviceRoleKey, sessionId);
    if (remaining.length !== 0) throw new Error('Synthetic observability cleanup did not leave zero rows.');
  }

    if (validationError) throw validationError;
  });
});

function exactPreviewOrigin(baseURL: string | undefined) {
  if (!baseURL) throw new Error('Authenticated admin probes require the configured Preview base URL.');
  const target = new URL(baseURL);
  if (target.protocol !== 'https:' || !target.hostname.endsWith('.vercel.app')) {
    throw new Error('Authenticated admin probes may run only against an HTTPS Vercel Preview origin.');
  }
  return target.origin;
}

async function adminAccessProbe(page: import('@playwright/test').Page, previewOrigin: string) {
  const initialUrl = page.url();
  if (initialUrl !== 'about:blank') {
    throw new Error('Authenticated admin probe regression requires a fresh about:blank page.');
  }
  const navigation = await page.goto(new URL('/', previewOrigin).href, { waitUntil: 'domcontentloaded' });
  if ((navigation?.status() ?? 200) >= 500 || new URL(page.url()).origin !== previewOrigin) {
    throw new Error('Authenticated admin probe did not establish the exact Preview origin.');
  }

  const access = await page.evaluate(async () => {
    const read = async (path: string) => {
      const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store' });
      const value = await response.json().catch(() => null) as Record<string, unknown> | null;
      return {
        url: response.url,
        status: response.status,
        ok: value?.ok === true,
        code: typeof value?.code === 'string' ? value.code.slice(0, 80) : null,
        isAdmin: typeof value?.isAdmin === 'boolean' ? value.isAdmin : null,
        role: value?.role === 'admin' || value?.role === 'super_admin' ? value.role : null,
      };
    };
    return {
      me: await read('/api/admin/me'),
      operations: await read('/api/admin/ops-center'),
    };
  });
  return { initialUrl, pageOrigin: new URL(page.url()).origin, ...access };
}

function assertAdminProbeOrigin(
  access: Awaited<ReturnType<typeof adminAccessProbe>>,
  previewOrigin: string,
) {
  if (access.initialUrl !== 'about:blank' || access.pageOrigin !== previewOrigin) {
    throw new Error('Authenticated admin probe did not start from about:blank on the exact Preview origin.');
  }
  for (const [name, result, pathname] of [
    ['identity', access.me, '/api/admin/me'],
    ['operations', access.operations, '/api/admin/ops-center'],
  ] as const) {
    const target = new URL(result.url);
    if (target.origin !== previewOrigin || target.pathname !== pathname) {
      throw new Error(`Authenticated admin ${name} request escaped the exact Preview origin.`);
    }
  }
}

async function readSession(path: string) {
  const state = JSON.parse(await fs.readFile(path, 'utf8')) as StorageState;
  const stored = state.cookies?.find(cookie => cookie.name === 'sfm_access_token')?.value;
  if (!stored) throw new Error('Authenticated Preview state is missing its access session.');
  const token = decodeURIComponent(stored);
  const payloadPart = token.split('.')[1];
  if (!payloadPart) throw new Error('Authenticated Preview access session is malformed.');

  let subject: unknown;
  try {
    subject = (JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as { sub?: unknown }).sub;
  } catch {
    throw new Error('Authenticated Preview access session could not be decoded.');
  }
  if (typeof subject !== 'string' || !/^[0-9a-f-]{36}$/i.test(subject)) {
    throw new Error('Authenticated Preview access session has no valid subject.');
  }
  return { token, subject };
}

async function profileCount(origin: string, serviceRoleKey: string, userToken: string, profileId: string) {
  const url = new URL('/rest/v1/profiles', origin);
  url.searchParams.set('select', 'id');
  url.searchParams.set('id', `eq.${profileId}`);
  const response = await fetch(url, {
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${userToken}` },
  });
  if (!response.ok) throw new Error(`Preview profile isolation probe returned HTTP ${response.status}.`);
  const rows = await response.json().catch(() => null) as unknown;
  if (!Array.isArray(rows)) throw new Error('Preview profile isolation probe returned an invalid response.');
  return rows.length;
}

async function observabilityRows(origin: string, serviceRoleKey: string, sessionId: string) {
  const url = new URL('/rest/v1/observability_events', origin);
  url.searchParams.set('select', '*');
  url.searchParams.set('session_id', `eq.${sessionId}`);
  const response = await fetch(url, {
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
  });
  if (!response.ok) throw new Error(`Preview observability read returned HTTP ${response.status}.`);
  const rows = await response.json().catch(() => null) as unknown;
  if (!Array.isArray(rows)) throw new Error('Preview observability read returned an invalid response.');
  return rows as ObservabilityRow[];
}

async function waitForSingleRow(origin: string, serviceRoleKey: string, sessionId: string) {
  const deadline = Date.now() + 8_000;
  do {
    const rows = await observabilityRows(origin, serviceRoleKey, sessionId);
    if (rows.length > 1) throw new Error('Preview observability request created more than one synthetic row.');
    if (rows.length === 1) return rows;
    await new Promise(resolve => setTimeout(resolve, 250));
  } while (Date.now() < deadline);
  throw new Error('Preview observability request did not create a synthetic row.');
}

async function deleteObservabilityRows(origin: string, serviceRoleKey: string, sessionId: string) {
  const url = new URL('/rest/v1/observability_events', origin);
  url.searchParams.set('session_id', `eq.${sessionId}`);
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      prefer: 'return=minimal',
    },
  });
  if (!response.ok) throw new Error(`Preview observability cleanup returned HTTP ${response.status}.`);
}
