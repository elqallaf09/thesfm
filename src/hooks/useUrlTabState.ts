'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import {
  buildUrlWithTabValue,
  canonicalizeUrlTabState,
  normalizeUrlTabValue,
  readUrlTabValue,
  URL_TAB_STATE_CHANGE_EVENT,
  type UrlTabHistoryMode,
  type UrlTabStateOptions,
} from '@/lib/navigation/urlTabState';

export type SetUrlTabValueOptions = {
  history?: UrlTabHistoryMode;
};

export type SetUrlTabValue<T extends string> = (
  value: T,
  options?: SetUrlTabValueOptions,
) => void;

export function useUrlTabState<T extends string>(
  options: UrlTabStateOptions<T>,
): [T, SetUrlTabValue<T>] {
  const {
    param,
    values,
    defaultValue,
    omitDefault,
    legacyValueResolver,
    legacyHash,
  } = options;

  const subscribe = useCallback((listener: () => void) => {
    window.addEventListener('popstate', listener);
    window.addEventListener(URL_TAB_STATE_CHANGE_EVENT, listener);
    if (legacyHash) window.addEventListener('hashchange', listener);
    return () => {
      window.removeEventListener('popstate', listener);
      window.removeEventListener(URL_TAB_STATE_CHANGE_EVENT, listener);
      if (legacyHash) window.removeEventListener('hashchange', listener);
    };
  }, [legacyHash]);

  const getSnapshot = useCallback(
    () => readUrlTabValue(window.location.search, {
      param,
      values,
      defaultValue,
      omitDefault,
      legacyValueResolver,
      legacyHash,
    }, window.location.hash),
    [defaultValue, legacyHash, legacyValueResolver, omitDefault, param, values],
  );
  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (typeof window === 'undefined' || (!legacyValueResolver && !legacyHash)) return;

    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const canonicalUrl = canonicalizeUrlTabState(window.location.href, {
      param,
      values,
      defaultValue,
      omitDefault,
      legacyValueResolver,
      legacyHash,
    });
    if (canonicalUrl === currentUrl) return;

    window.history.replaceState(window.history.state, '', canonicalUrl);
    window.dispatchEvent(new Event(URL_TAB_STATE_CHANGE_EVENT));
  }, [defaultValue, legacyHash, legacyValueResolver, omitDefault, param, value, values]);

  const setValue = useCallback<SetUrlTabValue<T>>((requestedValue, setOptions) => {
    if (typeof window === 'undefined') return;

    const nextValue = normalizeUrlTabValue(requestedValue, values, defaultValue, legacyValueResolver);
    const nextUrl = canonicalizeUrlTabState(buildUrlWithTabValue(window.location.href, nextValue, {
      param,
      values,
      defaultValue,
      omitDefault,
      legacyValueResolver,
      legacyHash,
    }), {
      param,
      values,
      defaultValue,
      omitDefault,
      legacyValueResolver,
      legacyHash,
    });
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl === currentUrl) return;

    const method = setOptions?.history === 'replace' ? 'replaceState' : 'pushState';
    window.history[method](window.history.state, '', nextUrl);
    window.dispatchEvent(new Event(URL_TAB_STATE_CHANGE_EVENT));
  }, [defaultValue, legacyHash, legacyValueResolver, omitDefault, param, values]);

  return [value, setValue];
}
