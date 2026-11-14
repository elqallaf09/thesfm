const SESSION_KEY = 'sfm-tv-welcome-shown';
let shownInDocument = false;

/** Claim startup once per tab/WebView session, including full-page TV navigation. */
export function claimTvWelcome(): boolean {
  if (typeof window === 'undefined' || shownInDocument) return false;
  shownInDocument = true;
  try {
    if (window.sessionStorage.getItem(SESSION_KEY)) return false;
    // Claim before playback so navigation during the introduction cannot replay it.
    window.sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // Restricted storage still permits one introduction per document.
  }
  return true;
}
