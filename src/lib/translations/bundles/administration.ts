import { TR_ADMIN } from '@/lib/translations/admin';
import { TR_AUTH } from '@/lib/translations/auth';
import { TR_COMMON } from '@/lib/translations/common';
import { TR_COMPANY } from '@/lib/translations/company';
import { TR_INVEST } from '@/lib/translations/invest';
import { TR_MARKET } from '@/lib/translations/market';
import { TR_NAV } from '@/lib/translations/nav';
import { TR_NEWS } from '@/lib/translations/news';
import { TR_SHARIA_RESEARCH } from '@/lib/translations/sharia-research';
import type { TranslationDictionary } from '@/lib/translations/types';

export const ADMINISTRATION_TRANSLATIONS = {
  ...TR_ADMIN,
  ...TR_AUTH,
  ...TR_COMMON,
  ...TR_COMPANY,
  ...TR_INVEST,
  ...TR_MARKET,
  ...TR_NAV,
  ...TR_NEWS,
  ...TR_SHARIA_RESEARCH,
} satisfies TranslationDictionary;
