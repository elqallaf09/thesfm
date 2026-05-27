import { redirect } from 'next/navigation';

export default function AlertsRedirect() {
  redirect('/market-analysis?tab=alerts');
}
