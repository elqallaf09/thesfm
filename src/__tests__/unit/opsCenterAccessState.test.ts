import { describe, expect, it, vi } from 'vitest';
import { createOperationsAccessState } from '@/lib/admin/opsCenter/accessState';

describe('Operations Center authorization recovery', () => {
  it('keeps a denial latched while a retry is loading and clears it on a newer authenticated response', () => {
    const access = createOperationsAccessState();
    const changed = vi.fn();
    access.subscribe(changed);
    const initialGet = access.beginRequest();
    access.allow(initialGet);
    const failedGet = access.beginRequest();
    access.deny(failedGet);
    expect(access.getSnapshot()).toBe(true);

    const retryGet = access.beginRequest();
    expect(access.getSnapshot()).toBe(true);
    expect(changed).toHaveBeenCalledTimes(1);
    access.allow(retryGet);
    expect(access.getSnapshot()).toBe(false);
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it('does not restore access from a GET that started before a denied POST', () => {
    const access = createOperationsAccessState();
    const inFlightGet = access.beginRequest();
    const deniedPost = access.beginRequest();
    access.deny(deniedPost);
    access.allow(inFlightGet);
    expect(access.getSnapshot()).toBe(true);

    const recoveryGet = access.beginRequest();
    access.allow(recoveryGet);
    expect(access.getSnapshot()).toBe(false);
  });

  it('ignores an older delayed denial after a newer authenticated action succeeds', () => {
    const access = createOperationsAccessState();
    const inFlightGet = access.beginRequest();
    const successfulPost = access.beginRequest();
    access.allow(successfulPost);
    access.deny(inFlightGet);
    expect(access.getSnapshot()).toBe(false);
  });

  it('retains the denial through aborted or unsuccessful retries without a validated success', () => {
    const access = createOperationsAccessState();
    const previousSuccess = access.beginRequest();
    access.allow(previousSuccess);
    access.deny(access.beginRequest());
    access.beginRequest();
    // A shared store may return to its last success on abort; that old receipt is not recovery.
    access.allow(previousSuccess);
    expect(access.getSnapshot()).toBe(true);
    access.beginRequest();
    expect(access.getSnapshot()).toBe(true);
  });

  it('permits an authenticated POST to recover from a prior denied GET', () => {
    const access = createOperationsAccessState();
    access.deny(access.beginRequest());
    const post = access.beginRequest();
    expect(access.getSnapshot()).toBe(true);
    access.allow(post);
    expect(access.getSnapshot()).toBe(false);
  });
});
