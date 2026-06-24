export type SubscriptionCategory =
  | 'entertainment'
  | 'ai'
  | 'social'
  | 'telecom'
  | 'productivity'
  | 'cloud'
  | 'health'
  | 'education'
  | 'gaming'
  | 'other';

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'daily';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'trial' | 'expired';
export type SubscriptionRegion = 'gulf' | 'arab' | 'asia' | 'europe' | 'global' | 'other';

export type SubscriptionExample = {
  id: string;
  name: string;
  category: SubscriptionCategory;
  region?: SubscriptionRegion;
  aliases?: string[];
  defaultBillingCycle?: BillingCycle;
};

export const SUBSCRIPTION_CATEGORIES: SubscriptionCategory[] = [
  'entertainment',
  'ai',
  'social',
  'telecom',
  'productivity',
  'cloud',
  'health',
  'education',
  'gaming',
  'other',
];

export const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ['active', 'paused', 'cancelled', 'trial', 'expired'];
export const BILLING_CYCLES: BillingCycle[] = ['weekly', 'monthly', 'quarterly', 'yearly'];
export const TELECOM_REGIONS: SubscriptionRegion[] = ['gulf', 'arab', 'asia', 'europe', 'global', 'other'];

export const SUBSCRIPTION_EXAMPLES: SubscriptionExample[] = [
  { id: 'netflix', name: 'Netflix', category: 'entertainment' },
  { id: 'spotify', name: 'Spotify', category: 'entertainment' },
  { id: 'youtube-premium', name: 'YouTube Premium', category: 'entertainment' },
  { id: 'shahid', name: 'Shahid', category: 'entertainment' },
  { id: 'osn-plus', name: 'OSN+', category: 'entertainment' },
  { id: 'disney-plus', name: 'Disney+', category: 'entertainment' },
  { id: 'apple-tv', name: 'Apple TV+', category: 'entertainment' },
  { id: 'anghami', name: 'Anghami', category: 'entertainment' },
  { id: 'chatgpt', name: 'ChatGPT', category: 'ai' },
  { id: 'claude', name: 'Claude', category: 'ai' },
  { id: 'gemini', name: 'Gemini', category: 'ai' },
  { id: 'perplexity', name: 'Perplexity', category: 'ai' },
  { id: 'midjourney', name: 'Midjourney', category: 'ai' },
  { id: 'cursor', name: 'Cursor', category: 'ai' },
  { id: 'github-copilot', name: 'GitHub Copilot', category: 'ai' },
  { id: 'canva-pro', name: 'Canva Pro', category: 'productivity' },
  { id: 'microsoft-365', name: 'Microsoft 365', category: 'productivity', defaultBillingCycle: 'yearly' },
  { id: 'adobe-creative-cloud', name: 'Adobe Creative Cloud', category: 'productivity' },
  { id: 'notion', name: 'Notion', category: 'productivity' },
  { id: 'todoist', name: 'Todoist', category: 'productivity' },
  { id: 'figma', name: 'Figma', category: 'productivity' },
  { id: 'icloud', name: 'iCloud+', category: 'cloud' },
  { id: 'google-one', name: 'Google One', category: 'cloud' },
  { id: 'dropbox', name: 'Dropbox', category: 'cloud' },
  { id: 'onedrive', name: 'OneDrive', category: 'cloud' },
  { id: 'x-premium', name: 'X Premium', category: 'social' },
  { id: 'snapchat-plus', name: 'Snapchat+', category: 'social' },
  { id: 'meta-verified', name: 'Meta Verified', category: 'social' },
  { id: 'linkedin-premium', name: 'LinkedIn Premium', category: 'social' },
  { id: 'telegram-premium', name: 'Telegram Premium', category: 'social' },
  { id: 'apple-fitness', name: 'Apple Fitness+', category: 'health' },
  { id: 'whoop', name: 'WHOOP', category: 'health' },
  { id: 'peloton', name: 'Peloton', category: 'health' },
  { id: 'calm', name: 'Calm', category: 'health' },
  { id: 'coursera', name: 'Coursera', category: 'education' },
  { id: 'udemy', name: 'Udemy', category: 'education' },
  { id: 'skillshare', name: 'Skillshare', category: 'education' },
  { id: 'duolingo', name: 'Duolingo', category: 'education' },
  { id: 'playstation-plus', name: 'PlayStation Plus', category: 'gaming', defaultBillingCycle: 'yearly' },
  { id: 'xbox-game-pass', name: 'Xbox Game Pass', category: 'gaming' },
  { id: 'nintendo-switch-online', name: 'Nintendo Switch Online', category: 'gaming', defaultBillingCycle: 'yearly' },
  { id: 'zain-kuwait', name: 'Zain Kuwait', category: 'telecom', region: 'gulf', aliases: ['Zain KW'] },
  { id: 'stc-kuwait', name: 'stc Kuwait', category: 'telecom', region: 'gulf' },
  { id: 'ooredoo-kuwait', name: 'Ooredoo Kuwait', category: 'telecom', region: 'gulf' },
  { id: 'stc-saudi', name: 'stc Saudi Arabia', category: 'telecom', region: 'gulf' },
  { id: 'mobily', name: 'Mobily', category: 'telecom', region: 'gulf' },
  { id: 'zain-saudi', name: 'Zain Saudi Arabia', category: 'telecom', region: 'gulf' },
  { id: 'etisalat-uae', name: 'e& UAE / Etisalat', category: 'telecom', region: 'gulf' },
  { id: 'du-uae', name: 'du UAE', category: 'telecom', region: 'gulf' },
  { id: 'ooredoo-qatar', name: 'Ooredoo Qatar', category: 'telecom', region: 'gulf' },
  { id: 'vodafone-qatar', name: 'Vodafone Qatar', category: 'telecom', region: 'gulf' },
  { id: 'batelco', name: 'Batelco Bahrain', category: 'telecom', region: 'gulf' },
  { id: 'omantel', name: 'Omantel', category: 'telecom', region: 'gulf' },
  { id: 'vodafone-egypt', name: 'Vodafone Egypt', category: 'telecom', region: 'arab' },
  { id: 'orange-egypt', name: 'Orange Egypt', category: 'telecom', region: 'arab' },
  { id: 'we-egypt', name: 'WE / Telecom Egypt', category: 'telecom', region: 'arab' },
  { id: 'zain-jordan', name: 'Zain Jordan', category: 'telecom', region: 'arab' },
  { id: 'maroc-telecom', name: 'Maroc Telecom', category: 'telecom', region: 'arab' },
  { id: 'tunisie-telecom', name: 'Tunisie Telecom', category: 'telecom', region: 'arab' },
  { id: 'asiacell', name: 'Asiacell Iraq', category: 'telecom', region: 'arab' },
  { id: 'jio', name: 'Jio India', category: 'telecom', region: 'asia' },
  { id: 'airtel-india', name: 'Airtel India', category: 'telecom', region: 'asia' },
  { id: 'singtel', name: 'Singtel', category: 'telecom', region: 'asia' },
  { id: 'softbank-japan', name: 'SoftBank Japan', category: 'telecom', region: 'asia' },
  { id: 'sk-telecom', name: 'SK Telecom', category: 'telecom', region: 'asia' },
  { id: 'china-mobile', name: 'China Mobile', category: 'telecom', region: 'asia' },
  { id: 'telkomsel', name: 'Telkomsel', category: 'telecom', region: 'asia' },
  { id: 'bt', name: 'BT', category: 'telecom', region: 'europe' },
  { id: 'ee', name: 'EE', category: 'telecom', region: 'europe' },
  { id: 'vodafone-uk', name: 'Vodafone UK', category: 'telecom', region: 'europe' },
  { id: 'orange-france', name: 'Orange France', category: 'telecom', region: 'europe' },
  { id: 'telekom-germany', name: 'Telekom Germany', category: 'telecom', region: 'europe' },
  { id: 'movistar-spain', name: 'Movistar Spain', category: 'telecom', region: 'europe' },
  { id: 'tim-italy', name: 'TIM Italy', category: 'telecom', region: 'europe' },
  { id: 'att', name: 'AT&T', category: 'telecom', region: 'global' },
  { id: 'verizon', name: 'Verizon', category: 'telecom', region: 'global' },
  { id: 'tmobile', name: 'T-Mobile', category: 'telecom', region: 'global' },
  { id: 'xfinity', name: 'Xfinity Internet', category: 'telecom', region: 'global' },
  { id: 'vodafone-global', name: 'Vodafone', category: 'telecom', region: 'global' },
  { id: 'orange-global', name: 'Orange', category: 'telecom', region: 'global' },
  { id: 'home-internet', name: 'Home Internet', category: 'telecom', region: 'other' },
  { id: 'fiber-internet', name: 'Fiber Internet', category: 'telecom', region: 'other' },
  { id: 'mobile-data', name: 'Mobile Data', category: 'telecom', region: 'other' },
  { id: 'domain-hosting', name: 'Domain / Hosting', category: 'other' },
  { id: 'vpn', name: 'VPN', category: 'other' },
];

export function monthlyEquivalent(amount: number, cycle: BillingCycle) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (cycle === 'weekly') return amount * 52 / 12;
  if (cycle === 'quarterly') return amount / 3;
  if (cycle === 'yearly') return amount / 12;
  if (cycle === 'daily') return amount * 365 / 12;
  return amount;
}

export function annualEquivalent(amount: number, cycle: BillingCycle) {
  return monthlyEquivalent(amount, cycle) * 12;
}

export function isSpendActiveStatus(status: SubscriptionStatus) {
  return status === 'active';
}

export function normalizeSubscriptionSearch(value: string) {
  return value.trim().toLowerCase();
}

function inputDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function nextRenewalDate(startDate: string, cycle: BillingCycle, now = new Date()) {
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const next = new Date(start);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (cycle === 'weekly') {
    while (next < today) next.setDate(next.getDate() + 7);
  } else if (cycle === 'quarterly') {
    while (next < today) next.setMonth(next.getMonth() + 3);
  } else if (cycle === 'yearly') {
    while (next < today) next.setFullYear(next.getFullYear() + 1);
  } else if (cycle === 'daily') {
    while (next < today) next.setDate(next.getDate() + 1);
  } else {
    while (next < today) next.setMonth(next.getMonth() + 1);
  }

  return inputDateString(next);
}
