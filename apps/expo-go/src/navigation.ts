import { MOBILE_RESOURCES, type PhoneProduct } from '../../../src/lib/mobile/resourceContract';
export type Screen = { kind: 'home' | 'catalog' | 'account' | 'notifications' | 'markets' | 'tools' | 'records' | 'symbol' | 'unavailable'; resource?: string; symbol?: string; path?: string };
export function screenForLink(input: string, product: PhoneProduct): { screen: Screen } | { external: string } {
  let path = input;
  if (!input.startsWith('/')) {
    let url: URL;
    try { url = new URL(input); } catch { return { screen: { kind: 'unavailable', path: input } }; }
    if (url.protocol === `the-sfm-${product}:`) path = `/${url.hostname}${url.pathname}`;
    else if (url.protocol === 'https:' && ['www.the-sfm.com', 'the-sfm.com'].includes(url.hostname)) path = url.pathname;
    else if (['https:', 'mailto:', 'tel:'].includes(url.protocol)) return { external: url.toString() };
    else return { screen: { kind: 'unavailable', path: input } };
  }
  path = path.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (['/', '/today', '/dashboard', '/business-hub'].includes(path)) return { screen: { kind: 'home' } };
  if (['/settings', '/profile', '/security', '/profile/accounts'].includes(path)) return { screen: { kind: 'account' } };
  if (['/notifications', '/notif'].includes(path)) return { screen: { kind: 'notifications' } };
  const resource = MOBILE_RESOURCES.find(item => item.products.includes(product) && item.paths.includes(path));
  if (resource) return { screen: { kind: 'records', resource: resource.id } };
  if (product === 'investor' && ['/global-markets', '/world-stocks', '/ai-analyst/markets'].includes(path)) return { screen: { kind: 'markets' } };
  if (product === 'investor' && /^\/(symbol-details|world-stocks)\/[^/]+$/.test(path)) {
    try { return { screen: { kind: 'symbol', symbol: decodeURIComponent(path.split('/')[2]) } }; } catch { /* invalid link */ }
  }
  if (['/zakat', '/zakat-calculator', '/compound-interest-calculator', '/loan-calculator'].includes(path)) return { screen: { kind: 'tools', path } };
  return { screen: { kind: 'unavailable', path } };
}
