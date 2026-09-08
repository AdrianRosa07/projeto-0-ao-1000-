import { createClient } from "@supabase/supabase-js";

// @ts-expect-error - VITE_SUPABASE_URL is defined in .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
// @ts-expect-error - VITE_SUPABASE_ANON_KEY is defined in .env
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials are missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
