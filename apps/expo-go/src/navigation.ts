import { MOBILE_RESOURCES, type PhoneProduct } from '../../../src/lib/mobile/resourceContract';
export type Screen = { kind: 'home' | 'catalog' | 'account' | 'notifications' | 'channels' | 'markets' | 'tools' | 'reports' | 'records' | 'symbol' | 'news' | 'calendar' | 'screening' | 'unavailable'; resource?: string; symbol?: string; path?: string };
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
  if (path === '/notifications/channels') return { screen: { kind: 'channels' } };
  if (['/notifications', '/notif'].includes(path)) return { screen: { kind: 'notifications' } };
  if (product === 'finance' && ['/reports', '/reports-center'].includes(path)) return { screen: { kind: 'reports' } };
  if (product === 'business' && ['/business-operations', '/business-hub'].includes(path)) return { screen: { kind: 'reports' } };
  const resource = MOBILE_RESOURCES.find(item => item.products.includes(product) && item.paths.includes(path));
  if (resource) return { screen: { kind: 'records', resource: resource.id } };
  if (product === 'investor' && ['/global-markets', '/world-stocks', '/ai-analyst/markets'].includes(path)) return { screen: { kind: 'markets' } };
  if (product === 'investor' && ['/market-news', '/ai-analyst/news', '/gulf-news', '/europe-news'].includes(path)) return { screen: { kind: 'news' } };
  if (product === 'investor' && ['/economic-calendar', '/ai-analyst/calendar'].includes(path)) return { screen: { kind: 'calendar' } };
  if (product === 'investor' && path === '/sharia-stocks') return { screen: { kind: 'screening' } };
  if (product === 'investor' && /^\/(symbol-details|world-stocks)\/[^/]+$/.test(path)) {
    try { return { screen: { kind: 'symbol', symbol: decodeURIComponent(path.split('/')[2]) } }; } catch { /* invalid link */ }
  }
  if (['/zakat', '/zakat-calculator', '/compound-interest-calculator', '/loan-calculator'].includes(path)) return { screen: { kind: 'tools', path } };
  return { screen: { kind: 'unavailable', path } };
}
