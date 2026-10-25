import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const cloudAccountsAvailable = Boolean(url && publishableKey);
let client: SupabaseClient | null = null;

/** Uses only the public/publishable Supabase key. Never put service role secrets in the browser. */
export function seasonDatabase(): SupabaseClient | null {
  if (typeof window === 'undefined' || !url || !publishableKey) return null;
  if (!client) client = createClient(url, publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
