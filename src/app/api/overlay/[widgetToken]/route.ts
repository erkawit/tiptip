import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DEMO_SETTINGS } from '@/lib/supabase/mock-data';

export async function GET(
  req: NextRequest,
  { params }: { params: { widgetToken: string } }
) {
  const widgetToken = params.widgetToken;

  if (!widgetToken) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  try {
    const { data: widget, error } = await supabaseAdmin
      .from('widgets')
      .select(`
        id,
        streamer_id,
        token,
        widget_type,
        is_active,
        widget_settings (
          sound_url,
          volume,
          image_url,
          font_family,
          font_url,
          template_text,
          duration,
          min_amount,
          text_color,
          text_accent_color,
          animation_in,
          animation_out,
          tts_enabled,
          tts_min_amount,
          tts_voice,
          glow_color
        )
      `)
      .eq('token', widgetToken)
      .eq('is_active', true)
      .single();

    if (error || !widget) {
      // Fallback for demo token
      return NextResponse.json({
        token: widgetToken,
        settings: DEMO_SETTINGS,
        isDemo: true,
      });
    }

    const settings = Array.isArray(widget.widget_settings)
      ? widget.widget_settings[0]
      : widget.widget_settings;

    return NextResponse.json({
      token: widget.token,
      streamer_id: widget.streamer_id,
      settings: settings || DEMO_SETTINGS,
      isDemo: false,
    });
  } catch (err: any) {
    console.warn('[Overlay API] Error fetching widget config:', err);
    return NextResponse.json({
      token: widgetToken,
      settings: DEMO_SETTINGS,
      isDemo: true,
    });
  }
}
