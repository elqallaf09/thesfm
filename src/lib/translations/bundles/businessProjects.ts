import { TR_AUTH } from '@/lib/translations/auth';
import { TR_COMMON } from '@/lib/translations/common';
import { TR_COMPANY } from '@/lib/translations/company';
import { TR_INVEST } from '@/lib/translations/invest';
import { TR_INVESTMENT_OFFERS } from '@/lib/translations/investment-offers';
import { TR_NAV } from '@/lib/translations/nav';
import { TR_PROFILE } from '@/lib/translations/profile';
import { TR_PROJECTS } from '@/lib/translations/projects';
import type { TranslationDictionary } from '@/lib/translations/types';

export const BUSINESS_PROJECTS_TRANSLATIONS = {
  ...TR_AUTH,
  ...TR_COMMON,
  ...TR_COMPANY,
  ...TR_INVEST,
  ...TR_INVESTMENT_OFFERS,
  ...TR_NAV,
  ...TR_PROFILE,
  ...TR_PROJECTS,
} satisfies TranslationDictionary;
