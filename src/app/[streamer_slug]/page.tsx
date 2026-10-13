'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { DEMO_STREAMER, DEMO_SETTINGS, DEMO_WIDGET } from '@/lib/supabase/mock-data';
import { 
  Heart, 
  Sparkles, 
  CreditCard, 
  QrCode, 
  Wallet, 
  Send, 
  ShieldCheck, 
  CheckCircle2, 
  Image as ImageIcon,
  HelpCircle,
  Flame
} from 'lucide-react';
import { showTipTipAlert, showSuccessNotification } from '@/lib/swal';
import { supabase } from '@/lib/supabase/client';
import confetti from 'canvas-confetti';

const AMOUNT_PRESETS = [50, 100, 300, 500, 1000, 2500];

const GIF_OPTIONS = [
  { name: 'Cat Dance', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
  { name: 'Neon Diamond', url: 'https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif' },
  { name: 'Gold Chest', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif' },
  { name: 'Anime Cheer', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' },
];

export default function DonorPortalPage() {
  const params = useParams();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const slug = (params?.streamer_slug as string) || DEMO_STREAMER.slug;

  const [streamer, setStreamer] = useState(DEMO_STREAMER);
  const [widgetToken, setWidgetToken] = useState(DEMO_WIDGET.token);
  const [donorName, setDonorName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [amount, setAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [message, setMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'promptpay' | 'stripe' | 'truemoney'>('promptpay');
  const [selectedGif, setSelectedGif] = useState<string>(GIF_OPTIONS[0].url);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch streamer info and widget token
  React.useEffect(() => {
    const loadStreamer = async () => {
      try {
        const res = await fetch(`/api/streamers/${slug}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.streamer) {
            setStreamer(data.streamer);
          }
          if (data?.widget_token) {
            setWidgetToken(data.widget_token);
          }
        }
      } catch (err) {
        console.warn('Using default demo streamer data:', err);
      }
    };
    loadStreamer();
  }, [slug]);

  // Check if returning from successful Stripe checkout
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('success') === 'true') {
        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#10B981', '#34D399', '#F59E0B', '#FFFFFF'],
        });
        showTipTipAlert({
          icon: 'success',
          title: 'Tip Successfully Processed!',
          html: 'Your tip has been confirmed and broadcasted live to the streamer overlay. Thank you for your support!',
          confirmButtonText: 'Awesome!',
          iconColor: '#10B981',
        });
        // Clean URL query params
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const effectiveAmount = customAmount ? parseFloat(customAmount) || 0 : amount;
  const effectiveDonorName = isAnonymous ? 'Secret Supporter' : (donorName.trim() || 'Anonymous Fan');

  const handleSelectPreset = (val: number) => {
    setAmount(val);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
  };

  const handleSubmitTip = async (e: React.FormEvent) => {
    e.preventDefault();

    if (effectiveAmount < 10) {
      showTipTipAlert({
        icon: 'warning',
        title: 'Minimum Tip Required',
        text: 'Minimum tip amount is ฿10.00.',
        confirmButtonText: 'Understood',
      });
      return;
    }

    // Confirmation SweetAlert2 dialog
    const confirmResult = await showTipTipAlert({
      title: 'Confirm Live Tip',
      html: `
        <div style="text-align: left; font-size: 0.9rem; line-height: 1.6;">
          <p>Recipient: <b>${streamer.channel_name}</b></p>
          <p>Donor Name: <b>${effectiveDonorName}</b></p>
          <p>Amount: <b style="color: #34D399; font-size: 1.2rem;">฿${effectiveAmount.toLocaleString()}</b></p>
          <p>Gateway: <b style="text-transform: uppercase;">${paymentMethod}</b></p>
          ${message ? `<p style="font-style: italic; color: #A9C6B8; margin-top: 8px;">"${message}"</p>` : ''}
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: `Proceed to Pay ฿${effectiveAmount.toLocaleString()}`,
      cancelButtonText: 'Review Details',
    });

    if (!confirmResult.isConfirmed) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamer_id: streamer.id,
          streamer_slug: slug,
          widget_token: widgetToken,
          donor_name: effectiveDonorName,
          amount: effectiveAmount,
          currency: 'THB',
          message: message,
          payment_method: paymentMethod,
          gif_url: selectedGif,
        }),
      });

      const resData = await response.json();

      // If Stripe Checkout Session is generated, redirect donor
      if (resData.checkout_url) {
        window.location.href = resData.checkout_url;
        return;
      }

      // If simulated or direct completed (test mode)
      const alertPayload = {
        id: resData.transaction_id || `tip-${Date.now()}`,
        token: widgetToken,
        donor_name: effectiveDonorName,
        amount: effectiveAmount,
        currency: 'THB',
        message: message,
        gif_url: selectedGif,
        timestamp: Date.now(),
      };

      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('tiptip-live-alerts');
        bc.postMessage(alertPayload);
        bc.close();
      }

      try {
        const channel = supabase.channel(`overlay-${widgetToken}`);
        await channel.send({
          type: 'broadcast',
          event: 'new-alert',
          payload: alertPayload,
        });
      } catch (err) {
        console.warn('Realtime broadcast error:', err);
      }

      // Burst confetti on donor screen
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.7 },
        colors: ['#10B981', '#34D399', '#F59E0B', '#FFFFFF'],
      });

      // Show success modal
      await showTipTipAlert({
        icon: 'success',
        title: 'Tip Sent to Streamer!',
        html: `Your tip of <b>฿${effectiveAmount.toLocaleString()}</b> has been processed! Your alert is now animating live on <b>${streamer.channel_name}'s</b> stream!`,
        confirmButtonText: 'Awesome!',
        iconColor: '#10B981',
      });

      // Reset form
      setMessage('');
      setCustomAmount('');
    } catch (err) {
      console.error('Payment flow error:', err);
      showTipTipAlert({
        icon: 'error',
        title: 'Checkout Failed',
        text: 'Could not complete payment dispatch. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-950 text-slate-100 flex flex-col justify-between selection:bg-neon-500 selection:text-obsidian-950">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-forest-900/30 via-emerald-950/20 to-transparent blur-3xl opacity-60" />
      </div>

      {/* Main Container */}
      <main className="relative z-10 max-w-md w-full mx-auto px-4 py-8 sm:py-12 flex-1">
        {/* Streamer Header Card */}
        <div className="text-center mb-6">
          <div className="relative inline-block mx-auto mb-3">
            <img
              src={streamer.avatar_url}
              alt={streamer.channel_name}
              className="w-24 h-24 rounded-full border-2 border-neon-400 p-0.5 object-cover shadow-neon-glow mx-auto"
            />
            <div className="absolute bottom-1 right-1 bg-neon-500 text-obsidian-950 p-1 rounded-full text-xs font-black">
              ✓
            </div>
          </div>

          <h1 className="text-2xl font-display font-extrabold text-white flex items-center justify-center gap-1.5">
            {streamer.channel_name}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto line-clamp-2">
            {streamer.bio}
          </p>

          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-forest-900/60 border border-emerald-500/30 text-neon-400 text-xs font-mono">
            <Flame className="w-3.5 h-3.5 text-ambervip-400" />
            <span>Alerts Live on Stream</span>
          </div>
        </div>

        {/* Tip Form Card */}
        <form
          onSubmit={handleSubmitTip}
          className="rounded-3xl glass-panel p-6 border border-emerald-500/25 shadow-2xl bg-obsidian-900/90 space-y-6"
        >
          {/* Donor Identity */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300">Your Name</label>
              <button
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`text-[11px] font-mono transition-colors ${
                  isAnonymous ? 'text-neon-400 font-bold' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {isAnonymous ? '✓ Anonymous Mode' : 'Remain Anonymous?'}
              </button>
            </div>
            {!isAnonymous && (
              <input
                type="text"
                placeholder="Enter your streamer handle or name"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                maxLength={40}
                className="w-full px-4 py-2.5 rounded-xl bg-obsidian-950 border border-obsidian-800 focus:border-neon-500 text-sm text-slate-100 outline-none transition-colors"
              />
            )}
          </div>

          {/* Amount Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Select Tip Amount (THB)
            </label>

            {/* Chips */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {AMOUNT_PRESETS.map((val) => {
                const isSelected = !customAmount && amount === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleSelectPreset(val)}
                    className={`py-2.5 rounded-xl font-display font-bold text-sm transition-all border ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-600 to-forest-800 text-white border-neon-400 shadow-neon-glow scale-[1.02]'
                        : 'bg-obsidian-950 border-obsidian-800 text-slate-300 hover:border-obsidian-700'
                    }`}
                  >
                    ฿{val.toLocaleString()}
                    {val >= 1000 && <span className="ml-1 text-[10px] text-ambervip-400">★</span>}
                  </button>
                );
              })}
            </div>

            {/* Custom Amount */}
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">฿</span>
              <input
                type="number"
                min="10"
                step="1"
                placeholder="Or enter custom amount..."
                value={customAmount}
                onChange={handleCustomAmountChange}
                className="w-full pl-8 pr-4 py-2 rounded-xl bg-obsidian-950 border border-obsidian-800 focus:border-neon-500 text-sm font-mono text-white outline-none"
              />
            </div>
          </div>

          {/* Message Input */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300">Live Message (TTS)</label>
              <span className="text-[10px] font-mono text-slate-500">{message.length}/200</span>
            </div>
            <textarea
              placeholder="Cheer on the streamer! This will be read aloud on stream..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={200}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-obsidian-950 border border-obsidian-800 focus:border-neon-500 text-sm text-slate-100 outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Select Animated GIF */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Choose Alert GIF
            </label>
            <div className="grid grid-cols-4 gap-2">
              {GIF_OPTIONS.map((gif) => (
                <div
                  key={gif.name}
                  onClick={() => setSelectedGif(gif.url)}
                  className={`p-1.5 rounded-xl border cursor-pointer transition-all flex flex-col items-center ${
                    selectedGif === gif.url
                      ? 'bg-forest-900/60 border-neon-400 shadow-neon-glow'
                      : 'bg-obsidian-950 border-obsidian-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={gif.url} alt={gif.name} className="w-12 h-12 object-contain rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Payment Gateway
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('promptpay')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'promptpay'
                    ? 'bg-forest-900/60 border-neon-400 text-neon-300 shadow-sm'
                    : 'bg-obsidian-950 border-obsidian-800 text-slate-400'
                }`}
              >
                <QrCode className="w-5 h-5 text-neon-400" />
                <span className="text-[11px] font-bold">PromptPay</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('stripe')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'stripe'
                    ? 'bg-forest-900/60 border-neon-400 text-neon-300 shadow-sm'
                    : 'bg-obsidian-950 border-obsidian-800 text-slate-400'
                }`}
              >
                <CreditCard className="w-5 h-5 text-sky-400" />
                <span className="text-[11px] font-bold">Card / Stripe</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('truemoney')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'truemoney'
                    ? 'bg-forest-900/60 border-neon-400 text-neon-300 shadow-sm'
                    : 'bg-obsidian-950 border-obsidian-800 text-slate-400'
                }`}
              >
                <Wallet className="w-5 h-5 text-ambervip-400" />
                <span className="text-[11px] font-bold">TrueMoney</span>
              </button>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl font-display font-extrabold text-base bg-gradient-to-r from-emerald-500 via-neon-500 to-forest-700 text-obsidian-950 shadow-neon-glow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4 fill-current" />
            {isSubmitting ? 'Processing Alert...' : `Send Tip ฿${effectiveAmount.toLocaleString()}`}
          </button>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              256-Bit Encrypted
            </span>
            <span>•</span>
            <span>Instant Zero-Latency OBS Trigger</span>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-500 border-t border-obsidian-900">
        Powered by <span className="font-semibold text-neon-400">TipTip Live</span> — The Precision Stream Alert Engine
      </footer>
    </div>
  );
}
