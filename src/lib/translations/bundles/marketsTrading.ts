import { TR_AI } from '@/lib/translations/ai';
import { TR_AUTH } from '@/lib/translations/auth';
import { TR_BANK } from '@/lib/translations/bank';
import { TR_COMMON } from '@/lib/translations/common';
import { TR_CRYPTO } from '@/lib/translations/crypto';
import { TR_DEFENSIVE } from '@/lib/translations/defensive';
import { TR_INVEST } from '@/lib/translations/invest';
import { TR_MARKET } from '@/lib/translations/market';
import { TR_NAV } from '@/lib/translations/nav';
import { TR_NEWS } from '@/lib/translations/news';
import { TR_SHARIA_RESEARCH } from '@/lib/translations/sharia-research';
import { TR_STOCK } from '@/lib/translations/stock';
import { TR_TECH } from '@/lib/translations/tech';
import type { TranslationDictionary } from '@/lib/translations/types';

export const MARKETS_TRADING_TRANSLATIONS = {
  ...TR_AI,
  ...TR_AUTH,
  ...TR_BANK,
  ...TR_COMMON,
  ...TR_CRYPTO,
  ...TR_DEFENSIVE,
  ...TR_INVEST,
  ...TR_MARKET,
  ...TR_NAV,
  ...TR_NEWS,
  ...TR_SHARIA_RESEARCH,
  ...TR_STOCK,
  ...TR_TECH,
} satisfies TranslationDictionary;
