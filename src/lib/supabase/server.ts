import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  isSupabaseServerConfigured,
  serverEnv,
} from "@/lib/config/server-env";

export const createSupabaseServerClient = () => {
  if (!isSupabaseServerConfigured) {
    return null;
  }

  return createClient(serverEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
