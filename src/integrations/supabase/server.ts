// Shared privileged client. This module must remain server-only.
import { createClient } from "@supabase/supabase-js";
import { getSupabasePrivilegedConfig } from '@/lib/server/supabaseEnvironment';

const config = getSupabasePrivilegedConfig();

export const supabaseAdmin = createClient(
  config?.url || "",
  config?.secretKey || ""
);
