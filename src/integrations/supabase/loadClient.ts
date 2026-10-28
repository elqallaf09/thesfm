// Reuse the same browser client as AuthProvider when data is needed, keeping
// data-only consumers out of the initial synchronous bundle.
export async function loadSupabaseClient() {
  const { supabase } = await import('@/integrations/supabase/client');
  return supabase;
}
