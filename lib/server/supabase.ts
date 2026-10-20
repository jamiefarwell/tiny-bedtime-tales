import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config, cloudEnabled } from './config';

/** Supabase client acting as the signed-in parent (reads their cookies). */
export async function supabaseForRequest(): Promise<SupabaseClient | null> {
  if (!cloudEnabled()) return null;
  const store = await cookies();
  return createServerClient(config.supabaseUrl, config.supabaseKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component render, where cookies are read-only;
          // proxy.ts refreshes the session instead.
        }
      },
    },
  });
}

/** The signed-in parent's user id, verified with Supabase Auth. */
export async function currentUser(): Promise<{ id: string; email?: string } | null> {
  const sb = await supabaseForRequest();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? undefined } : null;
}

let admin: SupabaseClient | null = null;
/** Service-role client for wallet and webhook work. Never expose to the browser. */
export function supabaseAdmin(): SupabaseClient {
  if (!cloudEnabled()) throw new Error('Supabase is not configured');
  admin ??= createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
