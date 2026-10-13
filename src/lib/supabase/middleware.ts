import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured } from './client';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If Supabase is not configured (offline / local sandbox demo),
  // allow unrestricted access so developers can test dashboards immediately.
  if (!isSupabaseConfigured()) {
    return supabaseResponse;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Do not run on static assets, icons, or webhooks
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/overlay') ||
    pathname.includes('.')
  ) {
    return supabaseResponse;
  }

  // Refresh auth session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allow explicit demo override with query param e.g. ?demo=true
  const isDemoQuery = request.nextUrl.searchParams.get('demo') === 'true';

  // Protected Routes: /dashboard and subroutes
  const isProtectedPath = pathname.startsWith('/dashboard') || pathname.startsWith('/admin');

  if (isProtectedPath && !user && !isDemoQuery) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from /login
  if (pathname === '/login' && user) {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/dashboard';
    const url = request.nextUrl.clone();
    url.pathname = redirectTo;
    url.searchParams.delete('redirectTo');
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
