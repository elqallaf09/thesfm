import type { FinancialProfile } from "@/lib/wakeel";

export async function getAuthedUserId(): Promise<string | null> {
  return "test-user";
}

export async function loadProfile(userId: string): Promise<FinancialProfile> {
  return {
    currency: "د.ك",
    cash: 5000,
    investments: 220000,
    gold: 30000,
    receivables: 10000,
    liabilities: 20000,
    nisab: 24000,
  };
}
