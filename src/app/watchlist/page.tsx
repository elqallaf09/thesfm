import { redirect } from 'next/navigation';

export default function WatchlistRedirect() {
  redirect('/market-analysis?tab=watchlist');
}
