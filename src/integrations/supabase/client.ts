// This file is protected and cannot be modified.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_DATABASE_URL || 'https://app20260512011913gmkippyfmq.nubase.co';
const supabaseKey = process.env.NEXT_PUBLIC_DATABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzUxMiJ9.eyJyZWYiOiJhcHAyMDI2MDUxMjAxMTkxM2dta2lwcHlmbXEiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImlzcyI6Im51YmFzZSIsImlhdCI6MTc3ODU3NzU1MywiZXhwIjoyMDkzOTM3NTUzfQ.hwLJcKvdZaLZnd-JHZWJ6C36_WEpKvDd6jDkCh1gNet3EFFRgGudcWc8kRDuVtKaDGxAJksPDMuRdgZ6C6tZnw';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
