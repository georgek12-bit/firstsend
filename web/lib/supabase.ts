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

/** Absolute URL for a page on this site, used for sign-in email links. */
export const siteUrl = (path: string) => window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH || '') + path;
