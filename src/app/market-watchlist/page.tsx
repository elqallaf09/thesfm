import { redirect } from 'next/navigation';

export default function MarketWatchlistRedirect() {
  redirect('/market-analysis?tab=watchlist');
}
