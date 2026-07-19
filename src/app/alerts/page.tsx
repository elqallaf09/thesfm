import { redirect } from 'next/navigation';

export default function AlertsRedirect() {
  redirect('/ai-analyst/overview?legacy=market&tab=alerts');
}
