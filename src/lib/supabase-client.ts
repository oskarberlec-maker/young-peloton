import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env['VITE_SUPABASE_URL'] as string | undefined;
const publishableKey = import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined;
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

/**
 * Supabase exposes the availability of external sign-in providers via its public
 * Auth settings endpoint. A missing/failed response is unknown (null), not "off".
 */
export async function googleProviderEnabled(): Promise<boolean | null> {
  if (!url || !publishableKey) return false;
  try {
    const response = await fetch(url.replace(/\/$/, '') + '/auth/v1/settings', {
      headers: { apikey: publishableKey },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const settings: { external?: Record<string, boolean> } = await response.json();
    return typeof settings.external?.['google'] === 'boolean' ? settings.external['google'] : null;
  } catch {
    return null;
  }
}
