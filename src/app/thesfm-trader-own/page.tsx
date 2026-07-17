import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// The terminal home is the dashboard; redirecting keeps one canonical URL so
// the shared sidebar active state resolves.
export default function TheSfmTraderOwnPage() {
  redirect('/thesfm-trader-own/dashboard');
}
