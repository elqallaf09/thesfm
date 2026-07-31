import { TR_AI } from '@/lib/translations/ai';
import { TR_AUTH } from '@/lib/translations/auth';
import { TR_CHARITY } from '@/lib/translations/charity';
import { TR_COMMON } from '@/lib/translations/common';
import { TR_DASHBOARD } from '@/lib/translations/dashboard';
import { TR_GOALS } from '@/lib/translations/goals';
import { TR_NAV } from '@/lib/translations/nav';
import { TR_PROFILE } from '@/lib/translations/profile';
import { TR_SAVINGS } from '@/lib/translations/savings';
import { TR_SETTINGS } from '@/lib/translations/settings';
import type { TranslationDictionary } from '@/lib/translations/types';

export const PERSONAL_FINANCE_TRANSLATIONS = {
  ...TR_AI,
  ...TR_AUTH,
  ...TR_CHARITY,
  ...TR_COMMON,
  ...TR_DASHBOARD,
  ...TR_GOALS,
  ...TR_NAV,
  ...TR_PROFILE,
  ...TR_SAVINGS,
  ...TR_SETTINGS,
} satisfies TranslationDictionary;
