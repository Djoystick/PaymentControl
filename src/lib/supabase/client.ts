import { createClient } from "@supabase/supabase-js";
import { clientEnv, isSupabaseClientConfigured } from "@/lib/config/client-env";

export const createSupabaseBrowserClient = () => {
  if (!isSupabaseClientConfigured) {
    return null;
  }

  return createClient(clientEnv.supabaseUrl, clientEnv.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
};
