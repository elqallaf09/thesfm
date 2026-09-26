import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { startGame, draftAllocation } from '../../src/domain/macro-simulator/game';
import { restoreGame, serializeGame } from '../../src/domain/macro-simulator/game-session';
import { gameCopy } from '../../src/components/macro-simulator/game-copy';
import { sessionCopy, type SessionCopyKey } from '../../src/components/macro-simulator/session-copy';

// Normal guest flow; no recordings of account/login DOM or provider responses.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test('macro game checkpoint resumes without double credit and validates transfers', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => { localStorage.setItem('sfm_lang', 'ar'); });
  await page.goto('/login?mode=register', { waitUntil: 'domcontentloaded' });
  await page.locator('button.guest-btn').first().click();
  await page.waitForURL(/\/dashboard(?:\?|$)/);
  await page.goto('/economic-intelligence/simulator/game', { waitUntil: 'domcontentloaded' });
  const game = page.getByTestId('macro-game');
  const session = game.getByTestId('macro-game-session');
  const button = (key: SessionCopyKey) => session.getByRole('button', { name: sessionCopy[key].ar, exact: true });
  const rationale = game.getByLabel(gameCopy.rationale.ar, { exact: true });
  const result = game.getByTestId('macro-game-outcome');
  const rows = game.getByTestId('macro-game-journal').locator('tbody tr');
  const note = 'أراجع الافتراضات قبل الكشف وأحفظ قراري التعليمي دون معلومات شخصية.';
  await expect(button('save')).toBeDisabled();
  await button('restore').click();
  await expect(session.getByRole('status')).toHaveText(sessionCopy.noSave.ar);
  await game.getByRole('button', { name: gameCopy.start.ar, exact: true }).click();
  await rationale.fill(note);
  await button('save').click();
  await expect(session.getByRole('status')).toHaveText(sessionCopy.saved.ar);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(button('save')).toBeDisabled(); // No silent restore or persistence write.
  await button('restore').click();
  await expect(button('confirmRestore')).toBeFocused();
  await button('confirmRestore').click();
  await expect(rationale).toHaveValue(note);
  await expect(rationale).toBeEnabled();
  await expect(rows).toHaveCount(0); await expect(result).toHaveCount(0);
  await game.getByTestId('macro-game-reveal').click();
  await expect(rows).toHaveCount(1);
  const beforeReload = await rows.first().innerText();
  await button('save').click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await button('restore').click(); await button('confirmRestore').click();
  await expect(rows).toHaveCount(1); await expect(rows.first()).toHaveText(beforeReload);
  await expect(rationale).toBeDisabled(); await expect(result).toBeVisible();
  await expect(game.getByTestId('macro-game-reveal')).toHaveCount(0);
  await button('restore').click(); await button('cancel').click();
  await expect(button('restore')).toBeFocused(); await expect(rows).toHaveCount(1);

  const downloading = page.waitForEvent('download');
  await button('export').click(); const download = await downloading;
  expect(download.suggestedFilename()).toBe('sfm-macro-game-v1.json');
  const path = await download.path(); if (!path) throw new Error('Expected a session download');
  const exported = await readFile(path, 'utf8');
  expect(restoreGame(exported).game.history).toHaveLength(1);
  expect(exported).not.toContain('"holdings"'); expect(exported).not.toContain('"userKey"');
  const upload = session.locator('input[type="file"]');
  await upload.setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await expect(session.getByRole('alert')).toHaveText(sessionCopy.invalid.ar); await expect(rows).toHaveCount(1);
  const forged = { ...JSON.parse(exported), endingValue: 1000000000 };
  await upload.setInputFiles({ name: 'forged.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(forged)) });
  await expect(session.getByRole('alert')).toHaveText(sessionCopy.invalid.ar); await expect(rows).toHaveCount(1);
  await game.getByTestId('macro-game-next').click();
  await expect(result).toHaveCount(0); await expect(rows).toHaveCount(1);
  await rationale.fill(note); await game.getByTestId('macro-game-reveal').click();
  await expect(rows).toHaveCount(2);

  const incoming = startGame(250000);
  const file = { name: 'session.json', mimeType: 'application/json', buffer: Buffer.from(serializeGame(incoming, { action: 'hold', rationale: note, weights: draftAllocation(incoming.holdings) })) };
  await upload.setInputFiles(file); await expect(rows).toHaveCount(2);
  await button('cancel').click(); await expect(rows).toHaveCount(2);
  await upload.setInputFiles(file); await button('confirmRestore').click();
  await expect(rows).toHaveCount(0); await expect(rationale).toHaveValue(note);
  await expect(result).toHaveCount(0); await expect(session.getByRole('alert')).toHaveCount(0);
  await button('save').click();
  await button('remove').click(); await button('cancel').click();
  await button('restore').click(); await expect(button('confirmRestore')).toBeVisible(); await button('cancel').click();
  await button('remove').click(); await button('confirmDelete').click();
  await expect(session.getByRole('status')).toHaveText(sessionCopy.deleted.ar);
  await expect(rationale).toHaveValue(note);
  await button('restore').click(); await expect(session.getByRole('status')).toHaveText(sessionCopy.noSave.ar);
  for (const width of [820, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => session.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(4);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(4);
  }
});
