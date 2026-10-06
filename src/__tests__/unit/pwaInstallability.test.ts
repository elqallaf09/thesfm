import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('SFM installable application shell', () => {
  it('keeps a single root worker for installability and notifications', () => {
    const registrar = read('src/components/PwaServiceWorkerRegistrar.tsx');
    const worker = read('public/sfm-notifications-sw.js');

    expect(registrar).toContain("register('/sfm-notifications-sw.js', { scope: '/' })");
    expect(registrar).toContain("new Set(['127.0.0.1', '::1', 'localhost'])");
    expect(worker).toContain("CACHE_NAME = 'the-sfm-shell-v1'");
    expect(worker).toContain("caches.match('/offline.html')");
    expect(worker).toContain("self.addEventListener('push'");
  });

  it('uses an offline fallback that deliberately avoids account data', () => {
    const offline = read('public/offline.html');

    expect(offline).toContain('لا يعرض THE SFM بيانات الحساب المحفوظة');
    expect(offline).toContain('/icons/icon-192.png');
  });

  it('keeps the four store products in one canonical catalog', () => {
    const catalog = read('src/lib/mobile/appCatalog.ts');

    for (const product of ['finance', 'investor', 'business', 'tv']) {
      expect(catalog).toContain(`id: '${product}'`);
    }
    expect(catalog).toContain("platforms: ['android', 'huawei', 'tvos', 'webos']");
  });
});
