/** @typedef {{ success: string, warning: string, danger: string, muted: string }} StatusColors */

/**
 * Match complete API statuses; "non_compliant" also contains "compliant".
 * @param {string | null | undefined} value
 * @param {StatusColors} colors
 */
export function shariahTag(value, colors) {
  if (!value?.trim()) return null;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  switch (normalized) {
    case 'compliant':
    case 'متوافق':
      return { label: 'متوافق', color: colors.success };
    case 'non_compliant':
    case 'not_compliant':
    case 'غير_متوافق':
      return { label: 'غير متوافق', color: colors.danger };
    case 'needs_review':
    case 'قيد_المراجعة':
      return { label: 'قيد المراجعة', color: colors.warning };
    case 'unclassified':
    case 'غير_مصنف':
      return { label: 'غير مصنف', color: colors.muted };
    default:
      return { label: 'غير مصنف', color: colors.muted };
  }
}

/** @param {number | null | undefined} value */
export function absoluteKnownAmount(value) {
  return value == null || !Number.isFinite(value) ? null : Math.abs(value);
}
