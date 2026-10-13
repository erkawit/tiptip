import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DEMO_STREAMER, DEMO_WIDGET } from '@/lib/supabase/mock-data';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;

  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
  }

  try {
    // 1. Fetch public profile (RLS safe view)
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, channel_name, slug, avatar_url, bio, is_verified')
      .eq('slug', slug)
      .eq('is_banned', false)
      .single();

    if (error || !profile) {
      // Fallback to demo streamer if slug matches or in demo mode
      return NextResponse.json({
        streamer: DEMO_STREAMER,
        widget_token: DEMO_WIDGET.token,
        isDemo: true,
      });
    }

    // 2. Fetch streamer's primary alert box widget token
    const { data: widget } = await supabaseAdmin
      .from('widgets')
      .select('token')
      .eq('streamer_id', profile.id)
      .eq('widget_type', 'alert_box')
      .eq('is_active', true)
      .single();

    return NextResponse.json({
      streamer: profile,
      widget_token: widget?.token || DEMO_WIDGET.token,
      isDemo: false,
    });
  } catch (err: any) {
    console.warn('[Streamer Profile API] Error fetching profile:', err);
    return NextResponse.json({
      streamer: DEMO_STREAMER,
      widget_token: DEMO_WIDGET.token,
      isDemo: true,
    });
  }
}
