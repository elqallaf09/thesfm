// This file is protected and cannot be modified.
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { isClient } from '@/lib/utils';

let supabaseInstance: SupabaseClient | null = null;

export const supabase: SupabaseClient = isClient()
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
