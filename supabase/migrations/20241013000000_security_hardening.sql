-- ====================================================================
-- TipTip Live - Migration 0002: Security Hardening & Payment Ledger
-- --------------------------------------------------------------------
-- Fixes the following issues from the initial schema:
--   * Anyone could INSERT donations (incl. status = 'completed').
--   * Streamers could UPDATE their own donations / profile balance.
--   * profiles were publicly readable (leaking balance & bank data).
--   * Widget tokens were enumerable through the public SELECT policy.
--   * Storage uploads were not scoped to the uploader's folder.
--   * Balance was only credited on UPDATE and fees were hard-coded.
--   * SECURITY DEFINER functions had a mutable search_path.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. Platform fee helper (single source of truth for SQL side)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.platform_fee_rate()
RETURNS NUMERIC
LANGUAGE sql IMMUTABLE
AS $$ SELECT 0.03::numeric $$;

-- --------------------------------------------------------------------
-- 2. Hardened helper functions (fixed search_path)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_banned = false
    );
END;
$$;

-- True when the current statement runs with elevated trust:
-- service-role key, direct DB connection, or an internal trusted function.
CREATE OR REPLACE FUNCTION public.is_privileged_context()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN COALESCE(auth.role(), 'postgres') NOT IN ('authenticated', 'anon')
        OR current_setting('tiptip.privileged', true) = 'on'
        OR public.is_admin();
END;
$$;

-- --------------------------------------------------------------------
-- 3. Donations: ledger columns
-- --------------------------------------------------------------------
ALTER TABLE public.donations
    ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS net_amount NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS gateway_reference VARCHAR(255),
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_donations_status ON public.donations(status);

-- --------------------------------------------------------------------
-- 4. Profiles: slug format + privileged column protection
-- --------------------------------------------------------------------
DO $$ BEGIN
    ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_slug_format
        CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{1,58}[a-z0-9])?$') NOT VALID;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_privileged_context() THEN
        NEW.id          := OLD.id;
        NEW.balance     := OLD.balance;
        NEW.role        := OLD.role;
        NEW.is_verified := OLD.is_verified;
        NEW.is_banned   := OLD.is_banned;
        NEW.created_at  := OLD.created_at;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile ON public.profiles;
CREATE TRIGGER trg_protect_profile
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_columns();

-- --------------------------------------------------------------------
-- 5. Signup trigger: robust slug generation (handles non-latin names)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    raw_name  TEXT;
    base_slug TEXT;
    gen_slug  TEXT;
    attempt   INT := 0;
BEGIN
    raw_name := COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'channel_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'name', ''),
        NULLIF(NEW.raw_user_meta_data->>'user_name', ''),
        SPLIT_PART(COALESCE(NEW.email, ''), '@', 1),
        'Streamer'
    );
    raw_name := LEFT(raw_name, 100);

    base_slug := LOWER(REGEXP_REPLACE(raw_name, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := TRIM(BOTH '-' FROM base_slug);
    base_slug := LEFT(base_slug, 40);
    base_slug := TRIM(BOTH '-' FROM base_slug);
    IF LENGTH(base_slug) < 3 THEN
        base_slug := 'streamer-' || SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 6);
    END IF;

    gen_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE slug = gen_slug) LOOP
        attempt := attempt + 1;
        gen_slug := base_slug || '-' || SUBSTRING(encode(gen_random_bytes(3), 'hex'), 1, 4);
        IF attempt > 10 THEN
            gen_slug := 'streamer-' || REPLACE(NEW.id::text, '-', '');
            EXIT;
        END IF;
    END LOOP;

    INSERT INTO public.profiles (id, channel_name, slug, avatar_url, role)
    VALUES (
        NEW.id,
        raw_name,
        gen_slug,
        COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            NEW.raw_user_meta_data->>'picture',
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces'
        ),
        'streamer'
    );

    -- Default Alert Box widget (settings are provisioned by trg_widget_created)
    INSERT INTO public.widgets (streamer_id, widget_type) VALUES (NEW.id, 'alert_box');

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_widget()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.widget_settings (widget_id) VALUES (NEW.id)
    ON CONFLICT (widget_id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------
-- 6. Donation ledger: fee split + balance credit/debit
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.donation_compute_split()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
        NEW.platform_fee := ROUND(NEW.amount * public.platform_fee_rate(), 2);
        NEW.net_amount   := NEW.amount - NEW.platform_fee;
        NEW.completed_at := COALESCE(NEW.completed_at, NOW());
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_donation_split ON public.donations;
CREATE TRIGGER trg_donation_split
    BEFORE INSERT OR UPDATE OF status ON public.donations
    FOR EACH ROW EXECUTE FUNCTION public.donation_compute_split();

CREATE OR REPLACE FUNCTION public.handle_donation_completed()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM set_config('tiptip.privileged', 'on', true);

    -- Credit on transition into 'completed'
    IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
        UPDATE public.profiles
        SET balance = balance + COALESCE(NEW.net_amount, NEW.amount)
        WHERE id = NEW.streamer_id;
    END IF;

    -- Debit on refund of a previously completed donation
    IF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status = 'refunded' THEN
        UPDATE public.profiles
        SET balance = GREATEST(balance - COALESCE(OLD.net_amount, OLD.amount), 0)
        WHERE id = NEW.streamer_id;
    END IF;

    PERFORM set_config('tiptip.privileged', 'off', true);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_donation_completed ON public.donations;
CREATE TRIGGER trg_donation_completed
    AFTER INSERT OR UPDATE OF status ON public.donations
    FOR EACH ROW EXECUTE FUNCTION public.handle_donation_completed();

-- --------------------------------------------------------------------
-- 7. Row Level Security: tighten policies
-- --------------------------------------------------------------------

-- 7.1 Profiles: no more public full-row reads
DROP POLICY IF EXISTS "Public profiles are readable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Safe public projection for donor portals (no balance / bank data)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, channel_name, slug, avatar_url, bio, is_verified, created_at
FROM public.profiles
WHERE is_banned = false;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 7.2 Widgets & settings: no anonymous enumeration (overlay reads via server API)
DROP POLICY IF EXISTS "OBS overlays can read widget by token" ON public.widgets;
DROP POLICY IF EXISTS "OBS overlay can read widget settings" ON public.widget_settings;

DROP POLICY IF EXISTS "Streamers can manage own widget settings" ON public.widget_settings;
CREATE POLICY "Streamers can manage own widget settings"
    ON public.widget_settings FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.widgets w
        WHERE w.id = widget_settings.widget_id AND w.streamer_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.widgets w
        WHERE w.id = widget_settings.widget_id AND w.streamer_id = auth.uid()
    ));

-- 7.3 Donations: writes only through service role (payment webhooks) or admins
DROP POLICY IF EXISTS "Public can insert donations" ON public.donations;
DROP POLICY IF EXISTS "System and Admins can update donations" ON public.donations;
DROP POLICY IF EXISTS "Admins can update donations" ON public.donations;
CREATE POLICY "Admins can update donations"
    ON public.donations FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 7.4 Payouts: streamers read-only; creation goes through request_payout()
DROP POLICY IF EXISTS "Streamers can view and submit payouts" ON public.payout_requests;
DROP POLICY IF EXISTS "Streamers can view own payouts" ON public.payout_requests;
CREATE POLICY "Streamers can view own payouts"
    ON public.payout_requests FOR SELECT
    USING (auth.uid() = streamer_id);

-- 7.5 Audit logs: only trusted server code may write
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- --------------------------------------------------------------------
-- 8. Payout RPCs (atomic balance handling)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_payout(
    p_amount NUMERIC,
    p_method TEXT,
    p_account_number TEXT,
    p_account_holder TEXT
)
RETURNS public.payout_requests
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid     UUID := auth.uid();
    v_profile public.profiles;
    v_row     public.payout_requests;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
    END IF;
    IF p_amount IS NULL OR p_amount < 100 THEN
        RAISE EXCEPTION 'Minimum payout amount is 100 THB';
    END IF;
    IF p_method NOT IN ('promptpay', 'bank_transfer') THEN
        RAISE EXCEPTION 'Unsupported payout method';
    END IF;
    IF COALESCE(TRIM(p_account_number), '') = '' OR COALESCE(TRIM(p_account_holder), '') = '' THEN
        RAISE EXCEPTION 'Payout account details are required';
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;
    IF v_profile.is_banned THEN
        RAISE EXCEPTION 'Account is suspended';
    END IF;
    IF v_profile.balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    PERFORM set_config('tiptip.privileged', 'on', true);
    UPDATE public.profiles SET balance = balance - p_amount WHERE id = v_uid;
    PERFORM set_config('tiptip.privileged', 'off', true);

    INSERT INTO public.payout_requests (streamer_id, amount, method, account_number, account_holder)
    VALUES (v_uid, p_amount, p_method, LEFT(TRIM(p_account_number), 50), LEFT(TRIM(p_account_holder), 100))
    RETURNING * INTO v_row;

    INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
    VALUES (v_uid, 'payout.requested', 'payout_request', v_row.id::text,
            jsonb_build_object('amount', p_amount, 'method', p_method));

    RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_resolve_payout(
    p_payout_id UUID,
    p_status TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS public.payout_requests
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row public.payout_requests;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Admin privileges required' USING ERRCODE = '42501';
    END IF;
    IF p_status NOT IN ('processing', 'completed', 'rejected') THEN
        RAISE EXCEPTION 'Invalid payout status';
    END IF;

    SELECT * INTO v_row FROM public.payout_requests WHERE id = p_payout_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payout request not found';
    END IF;
    IF v_row.status IN ('completed', 'rejected') THEN
        RAISE EXCEPTION 'Payout request is already finalized';
    END IF;

    -- Refund the reserved amount when rejecting
    IF p_status = 'rejected' THEN
        PERFORM set_config('tiptip.privileged', 'on', true);
        UPDATE public.profiles SET balance = balance + v_row.amount WHERE id = v_row.streamer_id;
        PERFORM set_config('tiptip.privileged', 'off', true);
    END IF;

    UPDATE public.payout_requests
    SET status = p_status,
        notes = COALESCE(p_notes, notes),
        processed_at = CASE WHEN p_status IN ('completed', 'rejected') THEN NOW() ELSE processed_at END
    WHERE id = p_payout_id
    RETURNING * INTO v_row;

    INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
    VALUES (auth.uid(), 'payout.' || p_status, 'payout_request', p_payout_id::text,
            jsonb_build_object('notes', p_notes));

    RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.request_payout(NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_payout(NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_resolve_payout(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_payout(UUID, TEXT, TEXT) TO authenticated;

-- --------------------------------------------------------------------
-- 9. Storage: per-user folders, size & MIME limits
-- --------------------------------------------------------------------
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm']
WHERE id = 'alerts-audio';

UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/gif', 'image/png', 'image/jpeg', 'image/webp']
WHERE id = 'alerts-images';

UPDATE storage.buckets
SET file_size_limit = 2097152,
    allowed_mime_types = ARRAY['font/ttf', 'font/otf', 'font/woff', 'font/woff2',
                               'application/font-woff', 'application/x-font-ttf',
                               'application/x-font-otf', 'application/octet-stream']
WHERE id = 'custom-fonts';

DROP POLICY IF EXISTS "Streamers can upload their media" ON storage.objects;
DROP POLICY IF EXISTS "Streamers can delete their media" ON storage.objects;
DROP POLICY IF EXISTS "Streamers upload into own folder" ON storage.objects;
DROP POLICY IF EXISTS "Streamers update own media" ON storage.objects;
DROP POLICY IF EXISTS "Streamers delete own media" ON storage.objects;

CREATE POLICY "Streamers upload into own folder"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id IN ('alerts-audio', 'alerts-images', 'custom-fonts')
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Streamers update own media"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
        bucket_id IN ('alerts-audio', 'alerts-images', 'custom-fonts')
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Streamers delete own media"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id IN ('alerts-audio', 'alerts-images', 'custom-fonts')
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- --------------------------------------------------------------------
-- 10. Realtime: overlays use Broadcast; only donations need CDC
-- --------------------------------------------------------------------
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.widgets;
EXCEPTION WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.widget_settings;
EXCEPTION WHEN OTHERS THEN null;
END $$;
