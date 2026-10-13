-- Seed data for TipTip platform

-- 1. Create demo auth users in auth.users schema (if not exist)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES 
(
    '00000000-0000-0000-0000-000000000000',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'authenticated',
    'authenticated',
    'chromakitsune@tiptip.live',
    crypt('Streamer123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"ChromaKitsune","channel_name":"ChromaKitsune"}',
    NOW(),
    NOW()
),
(
    '00000000-0000-0000-0000-000000000000',
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'authenticated',
    'authenticated',
    'admin@tiptip.live',
    crypt('Admin123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"TipTip Master Admin","channel_name":"TipTip Master Admin"}',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Upsert profile details
INSERT INTO public.profiles (
    id,
    role,
    channel_name,
    slug,
    avatar_url,
    bio,
    balance,
    payout_promptpay,
    is_verified
) VALUES 
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'streamer',
    'ChromaKitsune',
    'chromakitsune',
    'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=300&h=300&fit=crop&crop=faces',
    'Apex Legends & Valorant Radiant rank player. Thank you for fueling the stream coffee & ramen!',
    12450.00,
    '0812345678',
    true
),
(
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'admin',
    'TipTip Master Admin',
    'admin',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop&crop=faces',
    'Platform Administrator & Financial Controller',
    0.00,
    '0899999999',
    true
)
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    channel_name = EXCLUDED.channel_name,
    slug = EXCLUDED.slug,
    avatar_url = EXCLUDED.avatar_url,
    bio = EXCLUDED.bio,
    balance = EXCLUDED.balance,
    payout_promptpay = EXCLUDED.payout_promptpay,
    is_verified = EXCLUDED.is_verified;

-- 3. Demo alert box widget for ChromaKitsune
INSERT INTO public.widgets (
    id,
    streamer_id,
    token,
    widget_type,
    is_active
) VALUES 
(
    'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'demo-obs-alert-token-12345',
    'alert_box',
    true
)
ON CONFLICT (id) DO UPDATE SET
    token = EXCLUDED.token,
    is_active = EXCLUDED.is_active;

-- 4. Widget settings with forest green / emerald styling
INSERT INTO public.widget_settings (
    id,
    widget_id,
    sound_url,
    volume,
    image_url,
    font_family,
    template_text,
    duration,
    min_amount,
    text_color,
    text_accent_color,
    tts_enabled,
    tts_min_amount
) VALUES 
(
    'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
    85,
    'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    'Outfit',
    '{donor_name} supported with {currency}{amount}!',
    8,
    10.00,
    '#FFFFFF',
    '#10B981',
    true,
    20.00
)
ON CONFLICT (widget_id) DO UPDATE SET
    sound_url = EXCLUDED.sound_url,
    volume = EXCLUDED.volume,
    image_url = EXCLUDED.image_url,
    font_family = EXCLUDED.font_family,
    template_text = EXCLUDED.template_text,
    duration = EXCLUDED.duration,
    min_amount = EXCLUDED.min_amount,
    text_color = EXCLUDED.text_color,
    text_accent_color = EXCLUDED.text_accent_color,
    tts_enabled = EXCLUDED.tts_enabled,
    tts_min_amount = EXCLUDED.tts_min_amount;

-- 5. Sample recent donations
INSERT INTO public.donations (
    id,
    streamer_id,
    donor_name,
    amount,
    currency,
    message,
    payment_method,
    status,
    transaction_id,
    platform_fee,
    net_amount,
    is_alerted,
    created_at
) VALUES
(
    gen_random_uuid(),
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'CyberSamurai',
    500.00,
    'THB',
    'Clutch ace in the last round was insane bro! Keep it up!',
    'promptpay',
    'completed',
    'TXN_PP_98124819',
    15.00,
    485.00,
    true,
    NOW() - INTERVAL '1 hour'
),
(
    gen_random_uuid(),
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'NeonRider',
    1000.00,
    'THB',
    'Big respect from Bangkok! Love the high quality overlay!',
    'stripe',
    'completed',
    'TXN_ST_77182931',
    30.00,
    970.00,
    true,
    NOW() - INTERVAL '3 hours'
),
(
    gen_random_uuid(),
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'KittenWarrior',
    150.00,
    'THB',
    'Ramen noodles fund for the late night grind! gg!',
    'truemoney',
    'completed',
    'TXN_TM_55192831',
    4.50,
    145.50,
    true,
    NOW() - INTERVAL '5 hours'
)
ON CONFLICT (transaction_id) DO NOTHING;
