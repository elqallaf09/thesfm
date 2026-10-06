'use client';

import { useEffect } from 'react';

const loopbackHosts = new Set(['127.0.0.1', '::1', 'localhost']);

/**
 * Registers the one root service worker used for both notifications and the
 * installable application shell. Keeping a single worker avoids two scripts
 * competing for the same root scope.
 */
export function PwaServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // The HTTPS loopback proxy used by the browser suite intentionally has no
    // worker-script trust chain. Registering there creates console errors in
    // otherwise unrelated product tests, while real HTTPS deployments retain
    // the offline shell and notification worker.
    if (loopbackHosts.has(window.location.hostname)) return;

    void navigator.serviceWorker.register('/sfm-notifications-sw.js', { scope: '/' });
  }, []);

  return null;
}
