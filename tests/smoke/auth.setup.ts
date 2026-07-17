import { expect, test } from '@playwright/test';

test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.setTimeout(90_000);

test('authenticated credential pairs are configured consistently', async () => {
  for (const role of ['USER', 'ADMIN'] as const) {
    const hasEmail = Boolean(process.env[`E2E_${role}_EMAIL`]);
    const hasPassword = Boolean(process.env[`E2E_${role}_PASSWORD`]);
    expect(hasEmail, `E2E_${role}_EMAIL and E2E_${role}_PASSWORD must be configured together.`).toBe(hasPassword);
  }
});
