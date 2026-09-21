import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { switchAccount } from '@/lib/auth/accountSwitch';
import { SIDEBAR_BOOTSTRAP, SIDEBAR_PREFERENCE_ATTRIBUTE, SIDEBAR_PREFERENCE_KEY } from '@/lib/navigation/sidebarPreference';

describe('account handoff', () => {
 it('does not redirect or announce before local sign-out and cookie clearing settle', async () => {
  let complete!: () => void;
  const signOut = vi.fn(() => new Promise<void>(resolve => { complete = resolve; }));
  const navigate = vi.fn(); const announce = vi.fn();
  const pending = switchAccount(signOut, navigate, announce);
  expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  expect(navigate).not.toHaveBeenCalled(); expect(announce).not.toHaveBeenCalled();
  complete(); await pending;
  expect(announce).toHaveBeenCalledOnce();
  expect(navigate).toHaveBeenCalledWith('/login?next=%2Ftoday');
 });
 it('fails closed when sign-out or cookie clearing fails', async () => {
  const navigate = vi.fn(); const announce = vi.fn();
  await expect(switchAccount(async () => { throw new Error('unavailable'); }, navigate, announce)).rejects.toThrow('unavailable');
  expect(navigate).not.toHaveBeenCalled(); expect(announce).not.toHaveBeenCalled();
 });
});
describe('sidebar first paint', () => {
 it.each([['1','true'], ['0','false'], [null,'false'], ['unexpected','false']])('restores %s before rendering', (stored, expected) => {
  const setAttribute = vi.fn(); const getItem = vi.fn(() => stored);
  runInNewContext(SIDEBAR_BOOTSTRAP, { document: { documentElement: { setAttribute } }, localStorage: { getItem } });
  expect(getItem).toHaveBeenCalledWith(SIDEBAR_PREFERENCE_KEY);
  expect(setAttribute).toHaveBeenCalledWith(SIDEBAR_PREFERENCE_ATTRIBUTE,expected);
 });
 it('keeps rendering available when storage is blocked', () => {
  expect(() => runInNewContext(SIDEBAR_BOOTSTRAP, { localStorage: { getItem() { throw new Error('blocked'); } }, document: { documentElement: { setAttribute() {} } } })).not.toThrow();
 });
});
