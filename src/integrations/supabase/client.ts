// This file is protected and cannot be modified.
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (typeof window === 'undefined') {
    return createClient(
      process.env.NEXT_PUBLIC_DATABASE_URL!,
      process.env.NEXT_PUBLIC_DATABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } }
    );
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(
      process.env.NEXT_PUBLIC_DATABASE_URL!,
      process.env.NEXT_PUBLIC_DATABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    );
  }

  return supabaseInstance;
}

// Legacy export for backward compatibility
export const supabase = typeof window !== 'undefined'
  ? (supabaseInstance || (supabaseInstance = createClient(
      process.env.NEXT_PUBLIC_DATABASE_URL!,
      process.env.NEXT_PUBLIC_DATABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    )))
  : ({} as SupabaseClient);
