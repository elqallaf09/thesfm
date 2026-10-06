'use client';

import { useEffect } from 'react';

/**
 * Registers the one root service worker used for both notifications and the
 * installable application shell. Keeping a single worker avoids two scripts
 * competing for the same root scope.
 */
export function PwaServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    void navigator.serviceWorker.register('/sfm-notifications-sw.js', { scope: '/' });
  }, []);

  return null;
}
