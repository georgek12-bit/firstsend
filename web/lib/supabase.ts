import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when the build has Supabase keys. Without them the app runs as a browser-only demo. */
export const LIVE = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!LIVE) throw new Error('Supabase is not configured');
  client ??= createClient(url!, anonKey!, {
    auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
  });
  return client;
}

/** Public OAuth client ID for Google's own sign-in button. */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

/** Absolute URL for a page on this site, used for sign-in email links. */
export const siteUrl = (path: string) => window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH || '') + path;

/**
 * Which social sign-in providers are switched on in Supabase. Read from the public auth settings
 * endpoint, so a button appears as soon as the provider is enabled in the dashboard.
 */
export async function enabledProviders(): Promise<Record<string, boolean>> {
  if (!LIVE) return {};
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anonKey! } });
    if (!res.ok) return {};
    return (await res.json()).external ?? {};
  } catch {
    return {};
  }
}

/** Error Supabase put in the address bar after a failed Google/Microsoft/Apple sign-in, if any. */
export function authErrorFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const msg = params.get('error_description') ?? hash.get('error_description');
  return msg ? msg.replace(/\+/g, ' ') : null;
}
