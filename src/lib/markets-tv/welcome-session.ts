const SESSION_KEY = 'sfm-tv-welcome-shown';
const IOS_LAUNCH_KEY = 'sfm-tv-last-ios-welcome';
let shownInDocument = false;

export function tvIosLaunch(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { __sfmTvIosLaunch?: string }).__sfmTvIosLaunch;
}

/** Claim startup once per tab/WebView session, including full-page TV navigation. */
export function claimTvWelcome(): boolean {
  if (typeof window === 'undefined' || shownInDocument) return false;
  shownInDocument = true;
  const launch = tvIosLaunch();
  if (launch) {
    // Home can replace the WKWebView during the same native launch.
    try {
      if (window.localStorage.getItem(IOS_LAUNCH_KEY) === launch) return false;
      window.localStorage.setItem(IOS_LAUNCH_KEY, launch);
      return true;
    } catch { /* Fall back to this WebView's session when persistent storage is unavailable. */ }
  }
  try {
    if (window.sessionStorage.getItem(SESSION_KEY)) return false;
    // Claim before playback so navigation during the introduction cannot replay it.
    window.sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // Restricted storage still permits one introduction per document.
  }
  return true;
}
