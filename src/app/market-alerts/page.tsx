import { redirect } from 'next/navigation';

export default function MarketAlertsRedirect() {
  redirect('/market-analysis?tab=alerts');
}
