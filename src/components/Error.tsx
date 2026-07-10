"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

export default function Error({
  error,
}: {
  error: Error & { digest?: string; cause?: any };
}) {
  const { t, dir } = useLanguage();
  const [errorDetails, setErrorDetails] = useState<Record<string, any>>({});

  useEffect(() => {
    const details: Record<string, any> = {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };

    details.url = window.location.href;
    details.timestamp = new Date().toISOString();

    setErrorDetails(details);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 p-4" dir={dir}>
      <div className="text-2xl font-semibold text-red-500">{t('error_generic_title')}</div>
      <Button
        onClick={() => {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(
              {
                type: "IFRAME_ERROR",
                payload: errorDetails,
              },
              "*"
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
