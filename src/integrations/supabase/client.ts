// This file is protected and cannot be modified.
import { createClient } from "@supabase/supabase-js";

const getEnvUrl = () => {
  if (process.env.NEXT_PUBLIC_DATABASE_URL &&
      process.env.NEXT_PUBLIC_DATABASE_URL.startsWith('http')) {
    return process.env.NEXT_PUBLIC_DATABASE_URL;
  }
  return 'https://placeholder.supabase.co';
};

const getEnvKey = () => {
  if (process.env.NEXT_PUBLIC_DATABASE_PUBLISHABLE_KEY) {
    return process.env.NEXT_PUBLIC_DATABASE_PUBLISHABLE_KEY;
  }
  return 'placeholder-key';
};

export const supabase = createClient(
  getEnvUrl(),
  getEnvKey(),
  {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
