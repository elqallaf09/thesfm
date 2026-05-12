// This file is protected and cannot be modified.
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_DATABASE_URL;
    const key = process.env.NEXT_PUBLIC_DATABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      throw new Error(
        "Missing Supabase environment variables. Please set NEXT_PUBLIC_DATABASE_URL and NEXT_PUBLIC_DATABASE_PUBLISHABLE_KEY"
      );
    }

    supabaseInstance = createClient(url, key, {
      auth: {
        storage: typeof window !== 'undefined' ? localStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return supabaseInstance;
};

export const supabase = typeof window !== 'undefined' ? getSupabase() : ({} as SupabaseClient);
