import { expect, test } from '@playwright/test';

async function useArabic(page: import('@playwright/test').Page, theme: 'light' | 'dark' = 'light') {
  await page.addInitScript(({ selectedTheme }) => {
    localStorage.setItem('sfm_lang', 'ar');
    localStorage.setItem('the-sfm-theme', selectedTheme);
    localStorage.setItem('theme', selectedTheme);
  }, { selectedTheme: theme });
}

test.describe('premium login experience', () => {
  test('renders the approved authentic brand, neutral preview and responsive auth hierarchy', async ({ page }, testInfo) => {
    await useArabic(page);
    await page.goto('/login');

    await expect(page.getByRole('heading', { level: 1, name: 'مرحباً بعودتك' })).toBeVisible();
    await expect(page.locator('.showcase-brand img')).toHaveCount(1);
    await expect(page.locator('.brand img[alt="THE SFM"]')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'متابعة كضيف' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'تسجيل الدخول عبر Google' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'إنشاء حساب جديد' })).toBeVisible();
    await expect(page.getByText('معاينة توضيحية للمنتج')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/KWD|SAR|AED|USD|ISO|PCI DSS|GDPR/);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`premium-login-ar-${testInfo.project.name}.png`), fullPage: true });
  });

  test('supports validation, password visibility, remembered identifier and keyboard focus', async ({ page }, testInfo) => {
    await useArabic(page);
    await page.goto('/login');
    await page.getByRole('button', { name: 'تسجيل الدخول', exact: true }).click();
    await expect(page.locator('.auth-msg[role="alert"]')).toContainText('أكمل كل الحقول المطلوبة');
    await page.screenshot({ path: testInfo.outputPath(`premium-login-validation-${testInfo.project.name}.png`), fullPage: true });

    const identifier = page.getByLabel(/اسم المستخدم أو البريد الإلكتروني/);
    const password = page.locator('input[autocomplete="current-password"]');
    await identifier.fill('visual-review');
    await password.fill('password-only-for-mocked-ui');
    await page.getByRole('button', { name: 'إظهار كلمة المرور' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await expect(page.getByRole('checkbox', { name: 'تذكرني' })).toBeChecked();

    await page.keyboard.press('Tab');
    const hasFocus = await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.matches('button,input,a,select'));
    expect(hasFocus).toBe(true);
  });

  test('switches language and theme with explicit accessible controls', async ({ page }, testInfo) => {
    await useArabic(page);
    await page.goto('/login');
    if (testInfo.project.name !== 'chromium-desktop') {
      await expect(page.getByRole('heading', { level: 1, name: 'مرحباً بعودتك' })).toBeVisible();
      return;
    }

    await page.getByRole('button', { name: 'اختيار اللغة' }).click();
    await page.getByRole('option', { name: 'English' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('premium-login-en-light.png'), fullPage: true });

    await page.getByRole('button', { name: 'Choose language' }).click();
    await page.getByRole('option', { name: 'Français' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Heureux de vous revoir' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('premium-login-fr-light.png'), fullPage: true });

    await page.getByRole('button', { name: 'Mode sombre' }).click();
    await expect(page.getByRole('button', { name: 'Mode sombre' })).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: testInfo.outputPath('premium-login-fr-dark.png'), fullPage: true });
  });
});
