import type { Page } from '@playwright/test';

/**
 * Preview tooling can query the optional StorageManager persistence API.
 * Older WebKit builds do not expose navigator.storage, so provide the same
 * conservative "not persisted" answer a feature-detecting caller would use.
 */
export async function installOptionalStorageApiCompatibility(page: Page) {
  await page.addInitScript(() => {
    const persisted = async () => false;
    const storage = navigator.storage as StorageManager | undefined;

    if (!storage) {
      Object.defineProperty(navigator, 'storage', {
        configurable: true,
        value: { persisted },
      });
      return;
    }

    if (typeof storage.persisted !== 'function') {
      Object.defineProperty(storage, 'persisted', {
        configurable: true,
        value: persisted,
      });
    }
  });
}
