const EVENT = 'sfm-account-switch-v1';

export function announceAccountSwitch() {
  try {
    const channel = new BroadcastChannel(EVENT);
    channel.postMessage('signed-out');
    channel.close();
  } catch { /* Storage notification also supports older browsers. */ }
  try { localStorage.setItem(EVENT, String(Date.now())); } catch { /* No credentials are stored. */ }
}

export function listenForAccountSwitch(onSwitch: () => void) {
  let channel: BroadcastChannel | undefined;
  const onStorage = (event: StorageEvent) => { if (event.key === EVENT && event.newValue) onSwitch(); };
  try {
    channel = new BroadcastChannel(EVENT);
    channel.onmessage = event => { if (event.data === 'signed-out') onSwitch(); };
  } catch { /* The storage listener remains available. */ }
  window.addEventListener('storage', onStorage);
  return () => { channel?.close(); window.removeEventListener('storage', onStorage); };
}

export async function switchAccount(
  signOut: (options: { scope: 'local' }) => Promise<void>,
  navigate: (url: string) => void,
  announce: () => void = announceAccountSwitch,
) {
  await signOut({ scope: 'local' });
  announce();
  // A document navigation drops private in-memory state and the Next route cache.
  // The existing login flow owns password/MFA verification for the next account.
  navigate('/login?next=%2Ftoday');
}
