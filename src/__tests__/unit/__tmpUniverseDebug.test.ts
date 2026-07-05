import { it } from 'vitest';
import { getFullSymbolUniverse } from '@/lib/trader/marketCatalog';

it('debug universe rows', async () => {
  const kuwait = await getFullSymbolUniverse({ market: 'kuwait', category: 'stock' });
  console.log('kuwait bad currency', kuwait.entries.filter(entry => entry.currency !== 'KWD').slice(0, 20));
  const crypto = await getFullSymbolUniverse({ market: 'crypto' });
  console.log('crypto bad type', crypto.entries.filter(entry => entry.assetType !== 'crypto').slice(0, 20));
});
