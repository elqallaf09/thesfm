export type UrlTabHistoryMode = 'push' | 'replace';

export type LegacyUrlTabValueResolver<T extends string> = (
  value: string | null | undefined,
) => T | null;

export type UrlTabStateOptions<T extends string> = {
  param: string;
  values: readonly T[];
  defaultValue: T;
  omitDefault?: boolean;
  /**
   * Resolves aliases that predate the canonical query-string values. Resolver output is
   * checked against `values` before it is accepted.
   */
  legacyValueResolver?: LegacyUrlTabValueResolver<T>;
  /**
   * Allows a recognized legacy hash (for example `#watchlist`) to select a tab when the
   * query string does not contain a recognized value.
   */
  legacyHash?: boolean;
};

export const URL_TAB_STATE_CHANGE_EVENT = 'sfm:url-tab-state-change';

function normalizedParam(param: string) {
  return param.trim() || 'tab';
}

export function normalizeUrlTabValue<T extends string>(
  value: string | null | undefined,
  values: readonly T[],
  defaultValue: T,
  legacyValueResolver?: LegacyUrlTabValueResolver<T>,
): T {
  return resolveUrlTabValue(value, values, legacyValueResolver) ?? defaultValue;
}

function resolveUrlTabValue<T extends string>(
  value: string | null | undefined,
  values: readonly T[],
  legacyValueResolver?: LegacyUrlTabValueResolver<T>,
): T | null {
  if (value !== null && value !== undefined && values.includes(value as T)) {
    return value as T;
  }

  const legacyValue = legacyValueResolver?.(value) ?? null;
  return legacyValue !== null && values.includes(legacyValue) ? legacyValue : null;
}

export function readUrlTabValue<T extends string>(
  search: string | URLSearchParams,
  options: UrlTabStateOptions<T>,
  hash?: string,
): T {
  const params = typeof search === 'string'
    ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    : search;
  const queryValue = resolveUrlTabValue(
    params.get(normalizedParam(options.param)),
    options.values,
    options.legacyValueResolver,
  );
  if (queryValue !== null) return queryValue;

  if (options.legacyHash) {
    const hashValue = resolveUrlTabValue(hash, options.values, options.legacyValueResolver);
    if (hashValue !== null) return hashValue;
  }

  return options.defaultValue;
}

/**
 * Rewrites recognized legacy aliases to the canonical query-string form. A recognized
 * legacy hash is removed because its meaning is now represented by the query parameter;
 * unrelated section anchors are retained. The returned path is suitable for replaceState.
 */
export function canonicalizeUrlTabState<T extends string>(
  currentUrl: string,
  options: UrlTabStateOptions<T>,
): string {
  const url = new URL(currentUrl, 'https://the-sfm.local');
  const param = normalizedParam(options.param);
  const rawQueryValue = url.searchParams.get(param);
  const queryValue = resolveUrlTabValue(
    rawQueryValue,
    options.values,
    options.legacyValueResolver,
  );
  const hashValue = options.legacyHash
    ? resolveUrlTabValue(url.hash, options.values, options.legacyValueResolver)
    : null;
  const resolvedValue = queryValue ?? hashValue;

  if (resolvedValue !== null) {
    if ((options.omitDefault ?? true) && resolvedValue === options.defaultValue) {
      url.searchParams.delete(param);
    } else {
      url.searchParams.set(param, resolvedValue);
    }
  }

  if (hashValue !== null) url.hash = '';

  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Produces a same-origin path suitable for history.pushState/replaceState. Existing query
 * parameters and the hash are retained; only the configured tab parameter is changed.
 */
export function buildUrlWithTabValue<T extends string>(
  currentUrl: string,
  value: T,
  options: UrlTabStateOptions<T>,
): string {
  const url = new URL(currentUrl, 'https://the-sfm.local');
  const param = normalizedParam(options.param);
  const nextValue = normalizeUrlTabValue(
    value,
    options.values,
    options.defaultValue,
    options.legacyValueResolver,
  );

  if ((options.omitDefault ?? true) && nextValue === options.defaultValue) {
    url.searchParams.delete(param);
  } else {
    url.searchParams.set(param, nextValue);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
