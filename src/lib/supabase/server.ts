import { supabase } from "@/integrations/supabase/client";

export async function createClient() {
  return supabase;
}
