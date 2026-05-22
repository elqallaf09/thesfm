import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const TABLE_CHECKS = {
  profiles: "profiles",
  expenses: "expense_items",
  expense_items: "expense_items",
  income: "monthly_income_sources",
  investments: "investment_items",
  savings: "savings_items",
  goals: "financial_goals",
  projects: "projects",
  campaigns: "ad_campaigns",
  notifications: "notifications",
} as const;

function tableStatus(message?: string) {
  if (!message) return "ok";
  const lower = message.toLowerCase();
  if (lower.includes("could not find") || lower.includes("does not exist") || lower.includes("relation")) {
    return "missing table";
  }
  return `error: ${message}`;
}

function columnStatus(message?: string) {
  if (!message) return "ok";
  const lower = message.toLowerCase();
  if (lower.includes("could not find") || lower.includes("does not exist") || lower.includes("column")) {
    return "missing column";
  }
  return `error: ${message}`;
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const missingEnv = [
    !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : "",
    !anonKey ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : "",
  ].filter(Boolean);

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({
      ok: false,
      database: "missing-env",
      missingEnv,
      tables: Object.fromEntries(Object.keys(TABLE_CHECKS).map(key => [key, "not checked"])),
      columns: { "expense_items.enhanced": "not checked" },
    }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const tableEntries = await Promise.all(
    Object.entries(TABLE_CHECKS).map(async ([key, table]) => {
      const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
      return [key, tableStatus(error?.message)] as const;
    })
  );
  const tables = Object.fromEntries(tableEntries);

  const { error: enhancedError } = await supabase
    .from("expense_items")
    .select("enhanced", { count: "exact", head: true });
  const columns = {
    "expense_items.enhanced": columnStatus(enhancedError?.message),
  };

  const ok = missingEnv.length === 0
    && Object.values(tables).every(status => status === "ok")
    && Object.values(columns).every(status => status === "ok");

  return NextResponse.json({
    ok,
    database: "connected",
    missingEnv,
    tables,
    columns,
  }, { status: ok ? 200 : 500 });
}
