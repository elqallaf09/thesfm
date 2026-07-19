import { redirect } from 'next/navigation';

export default function MarketAlertsRedirect() {
  redirect('/ai-analyst/overview?legacy=market&tab=alerts');
}
