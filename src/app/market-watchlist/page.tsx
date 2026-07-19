import { redirect } from 'next/navigation';

export default function MarketWatchlistRedirect() {
  redirect('/ai-analyst/overview?legacy=market&tab=watchlist');
}
