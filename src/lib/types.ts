export type UserRole = 'donor' | 'streamer' | 'admin';

export type WidgetType = 'alert_box' | 'goal_bar' | 'leaderboard' | 'chat_box' | 'event_ticker';

export type PaymentMethod = 'stripe' | 'truemoney' | 'promptpay' | 'test_sandbox';

export type DonationStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Profile {
  id: string;
  role: UserRole;
  channel_name: string;
  slug: string;
  avatar_url: string;
  bio: string;
  balance: number;
  payout_promptpay?: string;
  payout_bank_name?: string;
  payout_bank_account?: string;
  is_verified: boolean;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Widget {
  id: string;
  streamer_id: string;
  token: string;
  widget_type: WidgetType;
  is_active: boolean;
  created_at: string;
  settings?: WidgetSettings;
}

export interface WidgetSettings {
  id: string;
  widget_id: string;
  sound_url: string;
  volume: number; // 0 - 100
  image_url: string;
  font_family: string;
  font_url?: string;
  template_text: string;
  duration: number; // seconds
  min_amount: number;
  text_color: string;
  text_accent_color: string;
  animation_in: string;
  animation_out: string;
  tts_enabled: boolean;
  tts_min_amount: number;
  tts_voice: string;
  glow_color: string;
  updated_at?: string;
}

export interface Donation {
  id: string;
  streamer_id: string;
  donor_name: string;
  amount: number;
  currency: string;
  message?: string;
  payment_method: PaymentMethod;
  status: DonationStatus;
  transaction_id: string;
  slip_url?: string;
  gif_url?: string;
  is_alerted?: boolean;
  created_at: string;
}

export interface AlertQueueItem {
  id: string;
  donor_name: string;
  amount: number;
  currency: string;
  message?: string;
  gif_url?: string;
  settings?: WidgetSettings;
  timestamp: number;
}

export interface MediaAsset {
  id: string;
  streamer_id: string;
  file_path: string;
  file_type: 'audio' | 'image' | 'gif' | 'font';
  mime_type?: string;
  file_name: string;
  file_size?: number;
  created_at: string;
}

export interface PayoutRequest {
  id: string;
  streamer_id: string;
  amount: number;
  method: string;
  account_number: string;
  account_holder: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  created_at: string;
}
