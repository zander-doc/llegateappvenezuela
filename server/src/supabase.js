import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

const baseOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};

export const supabaseAnon = createClient(config.supabaseUrl, config.supabaseAnonKey, baseOptions);

export function supabaseForUser(accessToken) {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    ...baseOptions,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
