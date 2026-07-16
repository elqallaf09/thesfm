"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { enqueueObservabilityEvent } from '@/lib/observability/client';
import { errorSignature, normalizeRoute, sanitizeErrorText } from '@/lib/observability/core';

export default function Error({
  error,
}: {
  error: Error & { digest?: string; cause?: unknown };
}) {
  const { t, dir } = useLanguage();

  useEffect(() => {
    const safe = sanitizeErrorText(error);
    enqueueObservabilityEvent({
      type: 'client_error',
      name: 'react_error_boundary',
      value: 1,
      errorSignature: errorSignature(safe),
      failureClass: /hydration/i.test(safe) ? 'hydration' : 'runtime',
    });
  }, [error]);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4 text-foreground" dir={dir}>
      <div className="text-2xl font-semibold text-danger" role="alert">{t('error_generic_title')}</div>
      <Button
        onClick={() => {
          if (window.parent && window.parent !== window && window.location.origin !== 'null') {
            window.parent.postMessage(
              {
                type: "IFRAME_ERROR",
                payload: { signature: errorSignature(sanitizeErrorText(error)), route: normalizeRoute(window.location.pathname) },
              },
              window.location.origin,
            );
          }
        }}
        variant="default"
        className="mt-4 cursor-pointer"
      >
        {t('error_report_action')}
      </Button>
    </div>
  );
}
