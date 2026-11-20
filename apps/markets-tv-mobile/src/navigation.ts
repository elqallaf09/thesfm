export const HOME_URL = 'https://www.the-sfm.com/tv';
const FIRST_PARTY_HOSTS = new Set(['www.the-sfm.com', 'the-sfm.com']);
export type LinkAction = 'internal' | 'external' | 'blank' | 'blocked';

export function classifyLink(value: string): LinkAction {
  if (value === 'about:blank') return 'blank';
  if (value.length > 4096 || /[\u0000-\u0020\\]/.test(value)) return 'blocked';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return 'blocked';
    return FIRST_PARTY_HOSTS.has(url.hostname) ? 'internal' : 'external';
  } catch { return 'blocked'; }
}

export type Presentation = { theme: 'light' | 'dark'; language: 'ar' | 'en' | 'fr' };
export function readPresentation(message: string, origin: string): Presentation | null {
  if (message.length > 512 || classifyLink(origin) !== 'internal') return null;
  try {
    const value = JSON.parse(message);
    if (value?.type !== 'sfm-tv-presentation' || !['light', 'dark'].includes(value.theme)
      || !['ar', 'en', 'fr'].includes(value.language)) return null;
    return { theme: value.theme, language: value.language };
  } catch { return null; }
}

// The page can report presentation only; it cannot issue native commands.
export const PRESENTATION_BRIDGE = `(() => {
  if (window.__sfmPhonePresentation) return;
  window.__sfmPhonePresentation = true;
  let last = '', scheduled = false;
  const publish = () => {
    scheduled = false;
    const root = document.querySelector('[data-tv-root]');
    if (!root) return;
    const theme = root.classList.contains('tv-light') ? 'light' : 'dark';
    const language = ['ar', 'en', 'fr'].includes(root.lang) ? root.lang : 'ar';
    const message = JSON.stringify({type:'sfm-tv-presentation', theme, language});
    if (message !== last && window.ReactNativeWebView) {
      last = message; window.ReactNativeWebView.postMessage(message);
    }
  };
  new MutationObserver(() => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(publish); }
  }).observe(document.documentElement, {subtree:true, childList:true, attributes:true, attributeFilter:['class','lang']});
  publish();
})(); true;`;
