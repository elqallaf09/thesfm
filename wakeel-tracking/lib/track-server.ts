// lib/track-server.ts
// سجّل عملية شراء بعد نجاح الدفع (نادِها من Webhook الدفع أو من راوت السيرفر).

import { createAdminClient } from "@/lib/supabase/admin";

export async function recordPurchase(params: {
  userId: string;
  amount: number;
  status?: string; // افتراضي 'paid'
}) {
  const admin = createAdminClient();
  await admin.from("orders").insert({
    user_id: params.userId,
    amount: params.amount,
    status: params.status ?? "paid",
  });
}
