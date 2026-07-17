import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import {
  cleanupAllSyntheticIncomeRecords,
  cleanupSyntheticIncomeRecordsWithClient,
  createAuthenticatedDataClient,
  createAuthenticatedDataClientFromPage,
  syntheticIncomePrefix,
} from './authenticated-data-client';
import { userAuthStatePath } from './auth-state';

const userCredentialsConfigured = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
const adminCredentialsConfigured = Boolean(process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD);

// These tests enter real credentials and load real user-owned records. Network
// traces, screenshots, and video must never persist either into CI artifacts.
test.use({ storageState: userAuthStatePath, trace: 'off', screenshot: 'off', video: 'off' });
test.setTimeout(120_000);

function syntheticLabel(suffix: string) {
  return `${syntheticIncomePrefix}${suffix}-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

async function openIncomeSources(page: Page) {
  const response = await page.goto('/income', { waitUntil: 'domcontentloaded' });
  expect(response?.status() ?? 200).toBeLessThan(500);
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  await expect(page.locator('.income-shell')).toBeVisible();
  await page.getByRole('tab', { name: /^Sources/ }).click();
  await expect(page.getByRole('tab', { name: /^Sources/ })).toHaveAttribute('aria-selected', 'true');
}

async function signInAgain(page: Page) {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  if (!email || !password) throw new Error('Authenticated user persistence validation is not configured.');

  const loginInput = page
    .locator('input[type="email"], input[autocomplete="username"], input[name="email"], input[name="username"]')
    .first();
  await expect(loginInput).toBeVisible();
  await loginInput.fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(url => url.pathname !== '/login', { waitUntil: 'domcontentloaded', timeout: 30_000 });
}

test('authenticated CRUD persists across reload and logout/login', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Source-backed CRUD runs once in desktop Chromium.');
  test.skip(!userCredentialsConfigured, 'The E2E user account is not configured.');

  const label = syntheticLabel('crud');
  const editedLabel = `${label}-edited`;
  let authenticated: Awaited<ReturnType<typeof createAuthenticatedDataClientFromPage>> | null = null;
  await page.addInitScript(() => window.localStorage.setItem('sfm_lang', 'en'));

  try {
    const response = await page.goto('/income', { waitUntil: 'domcontentloaded' });
    expect(response?.status() ?? 200).toBeLessThan(500);
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await expect(page.locator('.income-shell')).toBeVisible();
    await expect(page.locator('button.hero-primary')).toBeEnabled();
    authenticated = await createAuthenticatedDataClientFromPage(page);
    await cleanupSyntheticIncomeRecordsWithClient(authenticated);

    await page.locator('button.hero-primary').click();
    const createDialog = page.getByRole('dialog');
    await expect(createDialog).toBeVisible();
    await createDialog.locator('input').first().fill(label);
    await createDialog.locator('input[inputmode="decimal"]').fill('12.345');
    const insertResponsePromise = page.waitForResponse(candidate => {
      const url = new URL(candidate.url());
      return candidate.request().method() === 'POST' && url.pathname === '/rest/v1/monthly_income_sources';
    });
    await createDialog.getByRole('button', { name: 'Save income' }).click();
    const insertResponse = await insertResponsePromise;
    expect(insertResponse.status(), 'The authenticated income insert did not succeed.').toBe(201);
    const insertedRecord = await insertResponse.json() as { id?: string; label?: string; user_id?: string };
    expect(insertedRecord).toEqual(expect.objectContaining({ label, user_id: authenticated.user.id }));
    await expect(createDialog).toBeHidden();

    await page.getByRole('tab', { name: /^Sources/ }).click();
    let row = page.locator('article.income-row').filter({ hasText: label });
    await expect(row).toHaveCount(1);

    const { data: createdRows, error: createdError } = await authenticated.client
      .from('monthly_income_sources')
      .select('id,label,amount,user_id')
      .eq('user_id', authenticated.user.id)
      .eq('label', label);
    expect(createdError, 'The created income row could not be reloaded from its source of truth.').toBeNull();
    expect(createdRows).toHaveLength(1);
    const recordId = createdRows?.[0]?.id as string;

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: /^Sources/ }).click();
    row = page.locator('article.income-row').filter({ hasText: label });
    await expect(row).toHaveCount(1);

    await row.getByRole('button', { name: 'Edit' }).click();
    const editDialog = page.getByRole('dialog');
    await editDialog.locator('input').first().fill(editedLabel);
    await editDialog.locator('input[inputmode="decimal"]').fill('23.456');
    await editDialog.getByRole('button', { name: 'Save income' }).click();
    await expect(editDialog).toBeHidden();
    await expect(page.locator('article.income-row').filter({ hasText: editedLabel })).toHaveCount(1);

    const { data: updatedRows, error: updatedError } = await authenticated.client
      .from('monthly_income_sources')
      .select('id,label,amount,user_id')
      .eq('id', recordId)
      .eq('user_id', authenticated.user.id);
    expect(updatedError, 'The edited income row could not be reloaded from its source of truth.').toBeNull();
    expect(updatedRows).toEqual([
      expect.objectContaining({ id: recordId, label: editedLabel, amount: 23.456, user_id: authenticated.user.id }),
    ]);

    await page.getByRole('button', { name: 'Logout' }).click();
    await page.waitForURL(/\/login(?:\?|$)/, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await signInAgain(page);
    await openIncomeSources(page);
    const reauthenticated = await createAuthenticatedDataClientFromPage(page);
    authenticated = reauthenticated;
    row = page.locator('article.income-row').filter({ hasText: editedLabel });
    await expect(row).toHaveCount(1);

    await row.getByRole('button', { name: 'Delete' }).click();
    await expect(row).toHaveCount(0);
    await expect.poll(async () => {
      const { count, error } = await reauthenticated.client
        .from('monthly_income_sources')
        .select('id', { count: 'exact', head: true })
        .eq('id', recordId)
        .eq('user_id', reauthenticated.user.id);
      if (error) throw new Error('The deleted income row could not be verified at its source of truth.');
      return count;
    }).toBe(0);
  } finally {
    if (authenticated) await cleanupSyntheticIncomeRecordsWithClient(authenticated).catch(() => undefined);
    await cleanupAllSyntheticIncomeRecords();
  }
});

test('failed authenticated insert does not update the income UI', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Authenticated failure handling runs once in desktop Chromium.');
  test.skip(!userCredentialsConfigured, 'The E2E user account is not configured.');

  const label = syntheticLabel('failed-insert');
  let authenticated: Awaited<ReturnType<typeof createAuthenticatedDataClientFromPage>> | null = null;
  await page.addInitScript(() => window.localStorage.setItem('sfm_lang', 'en'));

  try {
    const response = await page.goto('/income', { waitUntil: 'domcontentloaded' });
    expect(response?.status() ?? 200).toBeLessThan(500);
    await expect(page.locator('button.hero-primary')).toBeEnabled();
    authenticated = await createAuthenticatedDataClientFromPage(page);
    await cleanupSyntheticIncomeRecordsWithClient(authenticated);

    const supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').origin;
    await page.route(`${supabaseOrigin}/rest/v1/monthly_income_sources**`, async route => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'E2E_INSERT_FAILURE', message: 'Synthetic provider failure' }),
      });
    });

    await page.locator('button.hero-primary').click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('input').first().fill(label);
    await dialog.locator('input[inputmode="decimal"]').fill('9.875');
    await dialog.getByRole('button', { name: 'Save income' }).click();

    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.form-error')).toHaveText('Income could not be saved right now. Try again.');
    await expect(page.locator('article.income-row').filter({ hasText: label })).toHaveCount(0);
    const guestContainsFailedRow = await page.evaluate(expectedLabel => {
      const rows = JSON.parse(window.localStorage.getItem('sfm_guest_income') ?? '[]') as Array<{ label?: string }>;
      return rows.some(row => row.label === expectedLabel);
    }, label);
    expect(guestContainsFailedRow).toBe(false);

    const { count, error } = await authenticated.client
      .from('monthly_income_sources')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', authenticated.user.id)
      .eq('label', label);
    expect(error, 'The failed insert verification query returned a provider error.').toBeNull();
    expect(count).toBe(0);
  } finally {
    if (authenticated) await cleanupSyntheticIncomeRecordsWithClient(authenticated).catch(() => undefined);
    await cleanupAllSyntheticIncomeRecords();
  }
});

test('second-user data isolation and RLS prevent cross-user reads and mutations', async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Source-backed RLS validation runs once in desktop Chromium.');
  test.skip(!userCredentialsConfigured || !adminCredentialsConfigured, 'Both configured validation accounts are required.');

  const label = syntheticLabel('rls');
  const owner = await createAuthenticatedDataClient('user');
  const secondUser = await createAuthenticatedDataClient('admin');

  try {
    await cleanupAllSyntheticIncomeRecords();
    expect(secondUser.user.id).not.toBe(owner.user.id);

    const { data: inserted, error: insertError } = await owner.client
      .from('monthly_income_sources')
      .insert({ user_id: owner.user.id, category: 'other', label, amount: 7.125 })
      .select('id,label,amount,user_id')
      .single();
    expect(insertError, 'The owner could not create the RLS validation row.').toBeNull();
    expect(inserted?.id).toBeTruthy();

    const recordId = inserted?.id as string;
    const { data: hiddenRows, error: hiddenError } = await secondUser.client
      .from('monthly_income_sources')
      .select('id')
      .eq('id', recordId);
    expect(hiddenError, 'The second-user isolation read returned an unexpected provider error.').toBeNull();
    expect(hiddenRows).toEqual([]);

    const { data: updatedRows, error: updateError } = await secondUser.client
      .from('monthly_income_sources')
      .update({ amount: 999 })
      .eq('id', recordId)
      .select('id');
    expect(updateError, 'The second-user isolation update returned an unexpected provider error.').toBeNull();
    expect(updatedRows).toEqual([]);

    const { data: deletedRows, error: deleteError } = await secondUser.client
      .from('monthly_income_sources')
      .delete()
      .eq('id', recordId)
      .select('id');
    expect(deleteError, 'The second-user isolation delete returned an unexpected provider error.').toBeNull();
    expect(deletedRows).toEqual([]);

    const { data: ownerRows, error: ownerReadError } = await owner.client
      .from('monthly_income_sources')
      .select('id,label,amount,user_id')
      .eq('id', recordId);
    expect(ownerReadError, 'The owner could not reload the isolated row.').toBeNull();
    expect(ownerRows).toEqual([
      expect.objectContaining({ id: recordId, label, amount: 7.125, user_id: owner.user.id }),
    ]);
  } finally {
    await owner.client.auth.signOut({ scope: 'local' });
    await secondUser.client.auth.signOut({ scope: 'local' });
    await cleanupAllSyntheticIncomeRecords();
  }
});
