import { describe, expect, it } from 'vitest';
import { absoluteKnownAmount, shariahTag } from '../../../apps/expo-go/presentation.js';

const colors = { success: 'green', warning: 'amber', danger: 'red', muted: 'gray' };

describe('mobile status presentation', () => {
  it.each(['non_compliant', 'not_compliant', 'non-compliant', 'غير متوافق', ' NON_COMPLIANT '])(
    'never presents %s as compliant', value => {
      expect(shariahTag(value, colors)).toEqual({ label: 'غير متوافق', color: 'red' });
    },
  );

  it('keeps the four API statuses distinct', () => {
    expect(shariahTag('compliant', colors)).toEqual({ label: 'متوافق', color: 'green' });
    expect(shariahTag('needs_review', colors)).toEqual({ label: 'قيد المراجعة', color: 'amber' });
    expect(shariahTag('unclassified', colors)).toEqual({ label: 'غير مصنف', color: 'gray' });
  });

  it.each(['not yet compliant', 'unknown', 'غير معروف'])('does not infer a classification from %s', value => {
    expect(shariahTag(value, colors)).toEqual({ label: 'غير مصنف', color: 'gray' });
  });

  it.each([null, undefined, ''])('omits an absent status %s', value => {
    expect(shariahTag(value, colors)).toBeNull();
  });

  it('preserves unknown net amounts instead of displaying a false zero', () => {
    expect(absoluteKnownAmount(null)).toBeNull();
    expect(absoluteKnownAmount(undefined)).toBeNull();
    expect(absoluteKnownAmount(NaN)).toBeNull();
    expect(absoluteKnownAmount(0)).toBe(0);
    expect(absoluteKnownAmount(-120)).toBe(120);
  });
});
