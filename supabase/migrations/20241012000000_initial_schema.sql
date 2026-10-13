-- ====================================================================
-- TipTip LiveStream Platform - Database Schema & Security Architecture
-- Production PostgreSQL Migration with RLS and Storage Policies
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom Types & Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('donor', 'streamer', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE widget_type AS ENUM ('alert_box', 'goal_bar', 'leaderboard', 'chat_box', 'event_ticker');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_gateway AS ENUM ('stripe', 'truemoney', 'promptpay', 'test_sandbox');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE donation_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ====================================================================
-- 3. Core Tables
-- ====================================================================

-- 3.1 Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role DEFAULT 'streamer' NOT NULL,
    channel_name VARCHAR(100) NOT NULL,
    slug VARCHAR(60) UNIQUE NOT NULL,
    avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
    bio TEXT DEFAULT 'Welcome to my stream! Thank you for the support.',
    balance NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (balance >= 0),
    payout_promptpay VARCHAR(30),
    payout_bank_name VARCHAR(50),
    payout_bank_account VARCHAR(30),
    is_verified BOOLEAN DEFAULT false NOT NULL,
    is_banned BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for fast slug lookups on donor portal
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles(slug);

-- 3.2 Widgets Table (OBS Overlay endpoints)
CREATE TABLE IF NOT EXISTS public.widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    streamer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
    widget_type widget_type DEFAULT 'alert_box' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_widgets_token ON public.widgets(token);
CREATE INDEX IF NOT EXISTS idx_widgets_streamer ON public.widgets(streamer_id);

-- 3.3 Widget Settings Table (Alert Studio Customizations)
CREATE TABLE IF NOT EXISTS public.widget_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_id UUID UNIQUE NOT NULL REFERENCES public.widgets(id) ON DELETE CASCADE,
    sound_url TEXT DEFAULT '/sounds/emerald-chime.mp3',
    volume INTEGER DEFAULT 80 CHECK (volume >= 0 AND volume <= 100),
    image_url TEXT DEFAULT 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    font_family VARCHAR(50) DEFAULT 'Outfit',
    font_url TEXT,
    template_text VARCHAR(255) DEFAULT '{donor_name} tipped {currency}{amount}!',
    duration INTEGER DEFAULT 7 CHECK (duration >= 2 AND duration <= 30),
    min_amount NUMERIC(10, 2) DEFAULT 10.00 CHECK (min_amount >= 0),
    text_color VARCHAR(15) DEFAULT '#FFFFFF',
    text_accent_color VARCHAR(15) DEFAULT '#10B981',
    animation_in VARCHAR(30) DEFAULT 'bounceIn',
    animation_out VARCHAR(30) DEFAULT 'fadeOut',
    tts_enabled BOOLEAN DEFAULT true NOT NULL,
    tts_min_amount NUMERIC(10, 2) DEFAULT 20.00,
    tts_voice VARCHAR(40) DEFAULT 'th-TH',
    glow_color VARCHAR(15) DEFAULT '#10B981',
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_widget_settings_widget ON public.widget_settings(widget_id);

-- 3.4 Donations Table
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    streamer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    donor_name VARCHAR(100) DEFAULT 'Anonymous' NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(6) DEFAULT 'THB' NOT NULL,
    message VARCHAR(500),
    payment_method payment_gateway NOT NULL,
    status donation_status DEFAULT 'pending' NOT NULL,
    transaction_id VARCHAR(120) UNIQUE NOT NULL,
    slip_url TEXT,
    gif_url TEXT,
    is_alerted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_donations_streamer_created ON public.donations(streamer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_tx ON public.donations(transaction_id);

-- 3.5 Media Assets (User uploaded sounds, images, fonts)
CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    streamer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('audio', 'image', 'gif', 'font')),
    mime_type VARCHAR(80),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_streamer ON public.media_assets(streamer_id);

-- 3.6 Payout Requests Table (Streamer withdrawal management)
CREATE TABLE IF NOT EXISTS public.payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    streamer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    method VARCHAR(30) DEFAULT 'promptpay' NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_holder VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
    processed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payouts_streamer ON public.payout_requests(streamer_id);

-- 3.7 Audit Logs Table (Security and Super Admin tracing)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);

-- ====================================================================
-- 4. Automatic Balance Update Trigger on Completed Donations
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_donation_completed()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed')) THEN
        -- Add net donation to streamer balance (e.g. 97% net after 3% platform fee)
        UPDATE public.profiles
        SET balance = balance + (NEW.amount * 0.97),
            updated_at = NOW()
        WHERE id = NEW.streamer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_donation_completed ON public.donations;
CREATE TRIGGER trg_donation_completed
    AFTER UPDATE ON public.donations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_donation_completed();

-- Profile auto-creation on Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    gen_slug VARCHAR(60);
    raw_name VARCHAR(100);
BEGIN
    raw_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Streamer_' || SUBSTRING(NEW.id::text, 1, 6));
    gen_slug := LOWER(REGEXP_REPLACE(raw_name, '[^a-zA-Z0-9]+', '-', 'g'));
    
    -- Ensure unique slug
    IF EXISTS (SELECT 1 FROM public.profiles WHERE slug = gen_slug) THEN
        gen_slug := gen_slug || '-' || SUBSTRING(encode(gen_random_bytes(3), 'hex'), 1, 4);
    END IF;

    INSERT INTO public.profiles (id, channel_name, slug, avatar_url, role)
    VALUES (
        NEW.id,
        raw_name,
        gen_slug,
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces'),
        'streamer'
    );

    -- Auto-provision default Alert Box widget for streamer
    INSERT INTO public.widgets (streamer_id, widget_type)
    VALUES (NEW.id, 'alert_box')
    RETURNING id INTO gen_slug; -- reuse variable for id storage

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-provision Widget Settings when Widget is created
CREATE OR REPLACE FUNCTION public.handle_new_widget()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.widget_settings (widget_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_widget_created ON public.widgets;
CREATE TRIGGER trg_widget_created
    AFTER INSERT ON public.widgets
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_widget();

-- ====================================================================
-- 5. Row Level Security (RLS) Architecture
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.1 Profiles Policies
-- Anyone can view public profile details for streamer tipping portal
CREATE POLICY "Public profiles are readable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

-- Streamers can update their own channel settings
CREATE POLICY "Streamers can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admin can manage all profiles
CREATE POLICY "Admin can manage all profiles"
    ON public.profiles FOR ALL
    USING (public.is_admin());

-- 5.2 Widgets Policies
-- Streamer can manage their own widgets
CREATE POLICY "Streamers can manage own widgets"
    ON public.widgets FOR ALL
    USING (auth.uid() = streamer_id)
    WITH CHECK (auth.uid() = streamer_id);

-- OBS Overlays need to read widget by token without authentication
CREATE POLICY "OBS overlays can read widget by token"
    ON public.widgets FOR SELECT
    USING (is_active = true);

-- 5.3 Widget Settings Policies
CREATE POLICY "Streamers can manage own widget settings"
    ON public.widget_settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.widgets
            WHERE widgets.id = widget_settings.widget_id
            AND widgets.streamer_id = auth.uid()
        )
    );

CREATE POLICY "OBS overlay can read widget settings"
    ON public.widget_settings FOR SELECT
    USING (true);

-- 5.4 Donations Policies
-- Streamer can read donations addressed to them
CREATE POLICY "Streamers can view own donations"
    ON public.donations FOR SELECT
    USING (auth.uid() = streamer_id OR public.is_admin());

-- Public users / payment webhooks can insert donations
CREATE POLICY "Public can insert donations"
    ON public.donations FOR INSERT
    WITH CHECK (true);

-- System webhooks / Admins can update donation status
CREATE POLICY "System and Admins can update donations"
    ON public.donations FOR UPDATE
    USING (public.is_admin() OR auth.uid() = streamer_id);

-- 5.5 Media Assets Policies
CREATE POLICY "Streamers can manage own media assets"
    ON public.media_assets FOR ALL
    USING (auth.uid() = streamer_id)
    WITH CHECK (auth.uid() = streamer_id);

CREATE POLICY "Public can view media assets"
    ON public.media_assets FOR SELECT
    USING (true);

-- 5.6 Payout Requests Policies
CREATE POLICY "Streamers can view and submit payouts"
    ON public.payout_requests FOR ALL
    USING (auth.uid() = streamer_id)
    WITH CHECK (auth.uid() = streamer_id);

CREATE POLICY "Admins can manage payouts"
    ON public.payout_requests FOR ALL
    USING (public.is_admin());

-- 5.7 Audit Logs Policies
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_admin());

CREATE POLICY "System can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (true);

-- ====================================================================
-- 6. Storage Buckets Configuration
-- ====================================================================
-- Note: Insert statements into storage.buckets and storage.policies
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('alerts-audio', 'alerts-audio', true),
    ('alerts-images', 'alerts-images', true),
    ('custom-fonts', 'custom-fonts', true),
    ('payment-slips', 'payment-slips', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "Public can view alert images and sounds"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('alerts-audio', 'alerts-images', 'custom-fonts'));

CREATE POLICY "Streamers can upload their media"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id IN ('alerts-audio', 'alerts-images', 'custom-fonts')
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Streamers can delete their media"
    ON storage.objects FOR DELETE
    USING (
        bucket_id IN ('alerts-audio', 'alerts-images', 'custom-fonts')
        AND auth.uid() = owner
    );

-- ====================================================================
-- 7. Supabase Realtime Publication
-- ====================================================================
-- Enable realtime broadcast for instant OBS alert reception
ALTER PUBLICATION supabase_realtime ADD TABLE public.donations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.widgets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.widget_settings;
