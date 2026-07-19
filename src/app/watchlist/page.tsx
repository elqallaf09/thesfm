import { redirect } from 'next/navigation';

export default function WatchlistRedirect() {
  redirect('/ai-analyst/overview?legacy=market&tab=watchlist');
}
