/* ═══════════════════════════════════════════════════════

   SFM — Global Translations (AR | EN | FR)

   Domain files: src/lib/translations/*.ts
   Import from this barrel: import { TR } from '@/lib/translations'

═══════════════════════════════════════════════════════ */

export type Lang = 'ar' | 'en' | 'fr';

type TranslationEntry = Partial<Record<Lang, string>> & { ar: string; en: string };

import { TR_ADMIN } from './translations/admin';
import { TR_AI } from './translations/ai';
import { TR_AUTH } from './translations/auth';
import { TR_BANK } from './translations/bank';
import { TR_CHARITY } from './translations/charity';
import { TR_COMMON } from './translations/common';
import { TR_COMPANY } from './translations/company';
import { TR_CRYPTO } from './translations/crypto';
import { TR_DEFENSIVE } from './translations/defensive';
import { TR_GOALS } from './translations/goals';
import { TR_INVEST } from './translations/invest';
import { TR_INVESTMENT_OFFERS } from './translations/investment-offers';
import { TR_MARKET } from './translations/market';
import { TR_NAV } from './translations/nav';
import { TR_NEWS } from './translations/news';
import { TR_PROFILE } from './translations/profile';
import { TR_PROJECTS } from './translations/projects';
import { TR_SAVINGS } from './translations/savings';
import { TR_SETTINGS } from './translations/settings';
import { TR_STOCK } from './translations/stock';
import { TR_TECH } from './translations/tech';

export const TR: Record<string, TranslationEntry> = {
  ...TR_ADMIN,
  ...TR_AI,
  ...TR_AUTH,
  ...TR_BANK,
  ...TR_CHARITY,
  ...TR_COMMON,
  ...TR_COMPANY,
  ...TR_CRYPTO,
  ...TR_DEFENSIVE,
  ...TR_GOALS,
  ...TR_INVEST,
  ...TR_INVESTMENT_OFFERS,
  ...TR_MARKET,
  ...TR_NAV,
  ...TR_NEWS,
  ...TR_PROFILE,
  ...TR_PROJECTS,
  ...TR_SAVINGS,
  ...TR_SETTINGS,
  ...TR_STOCK,
  ...TR_TECH,
};

export function t(key: keyof typeof TR, lang: Lang): string {
  return TR[key]?.[lang] ?? TR[key]?.en ?? TR[key]?.ar ?? String(key);
}

export const MONTHS = {
  ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  fr: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
};
