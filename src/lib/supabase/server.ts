import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isSupabaseConfigured } from './client';
import { Profile } from '../types';
import { DEMO_STREAMER } from './mock-data';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock-instance.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key-tiptip-stream';

export async function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}

/**
 * Helper to fetch the current authenticated user and profile.
 * Falls back to DEMO_STREAMER in demo mode or when unauthenticated.
 */
export async function getCurrentUserAndProfile(): Promise<{
  user: any | null;
  profile: Profile;
  isDemo: boolean;
}> {
  if (!isSupabaseConfigured()) {
    return { user: null, profile: DEMO_STREAMER, isDemo: true };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { user: null, profile: DEMO_STREAMER, isDemo: true };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      // Auto-fallback with basic user info if profile trigger hasn't finished yet
      return {
        user,
        profile: {
          ...DEMO_STREAMER,
          id: user.id,
          channel_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Streamer',
          slug: user.user_metadata?.slug || user.email?.split('@')[0] || 'streamer',
        },
        isDemo: false,
      };
    }

    return { user, profile: profile as Profile, isDemo: false };
  } catch (error) {
    console.warn('[Supabase Server] Error fetching current user:', error);
    return { user: null, profile: DEMO_STREAMER, isDemo: true };
  }
}
