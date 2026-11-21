import { useEffect, useState } from 'react';
import type { TvLanguage, TvSnapshot } from '@/lib/markets-tv/types';
import { TvBroadcastPager } from './TvBroadcastPager';

export function TvCryptoPager({ requestedPage, snapshot, language, move }: {
  requestedPage: number; snapshot: TvSnapshot | null; language: TvLanguage; move: (page: number) => void;
}) {
  // Keep the focused remote button mounted while the next page is in flight.
  const [pages, setPages] = useState(0);
  useEffect(() => {
    if (snapshot?.scene !== 'crypto' || !snapshot.pageSize || snapshot.directoryTotal === undefined) return;
    setPages(Math.ceil(snapshot.directoryTotal / snapshot.pageSize));
    if (snapshot.page !== undefined && snapshot.page !== requestedPage) move(snapshot.page);
  }, [snapshot, requestedPage, move]);
  return <TvBroadcastPager page={requestedPage} pages={pages} language={language} move={move}/>;
}
