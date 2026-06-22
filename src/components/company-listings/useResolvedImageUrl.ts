'use client';

import { useEffect, useMemo, useState } from 'react';

function normalizeImageInput(value?: string | null) {
  const raw = value?.trim() ?? '';
  if (!raw || /[^\x00-\x7F]/.test(raw)) return '';
  try {
    const url = new URL(raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) return '';
    return url.toString();
  } catch {
    return '';
  }
}

export function useResolvedImageUrl(source?: string | null) {
  const normalizedSource = useMemo(() => normalizeImageInput(source), [source]);
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!normalizedSource) {
      setImageUrl('');
      setLoading(false);
      setFailed(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    setImageUrl('');

    fetch(`/api/company-listings/resolve-image?url=${encodeURIComponent(normalizedSource)}`, {
      signal: controller.signal,
      cache: 'force-cache',
    })
      .then(response => response.json().then(payload => ({ response, payload })))
      .then(({ response, payload }) => {
        if (!response.ok || !payload?.ok || !payload?.imageUrl) {
          throw new Error('image resolution failed');
        }
        setImageUrl(String(payload.imageUrl));
      })
      .catch(error => {
        if (error?.name === 'AbortError') return;
        setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [normalizedSource]);

  return {
    imageUrl,
    loading,
    failed,
    setFailed,
    hasSource: Boolean(normalizedSource),
  };
}
