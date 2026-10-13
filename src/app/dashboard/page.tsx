'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardNavbar } from '@/components/DashboardNavbar';
import { 
  DEMO_STREAMER, 
  DEMO_WIDGET, 
  DEMO_DONATIONS 
} from '@/lib/supabase/mock-data';
import { 
  Copy, 
  Check, 
  Play, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Tv, 
  Sparkles,
  QrCode,
  CreditCard,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { showSuccessNotification, showTipTipAlert } from '@/lib/swal';
import { supabase } from '@/lib/supabase/client';

export default function DashboardPage() {
  const [streamer, setStreamer] = useState(DEMO_STREAMER);
  const [token, setToken] = useState(DEMO_WIDGET.token);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  const [donations, setDonations] = useState(DEMO_DONATIONS);
  const [isTriggering, setIsTriggering] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  // Fetch real user, profile, widgets, and donations if connected to Supabase
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // 1. Fetch profile
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (prof) {
            setStreamer(prof);
          }

          // 2. Fetch widget
          const { data: widget } = await supabase
            .from('widgets')
            .select('token')
            .eq('streamer_id', user.id)
            .eq('widget_type', 'alert_box')
            .single();

          if (widget?.token) {
            setToken(widget.token);
          }

          // 3. Fetch recent donations
          const { data: dons } = await supabase
            .from('donations')
            .select('*')
            .eq('streamer_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

          if (dons && dons.length > 0) {
            setDonations(dons);
          }
        }
      } catch (err) {
        console.warn('Dashboard real data load warning:', err);
      }
    };

    loadUserData();

    // Subscribe to realtime donations if Supabase is active
    const donChannel = supabase
      .channel('public:donations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'donations' },
        (payload) => {
          if (payload.new) {
            setDonations((prev) => [payload.new as any, ...prev]);
            setStreamer((prev) => ({
              ...prev,
              balance: prev.balance + (payload.new.net_amount || payload.new.amount),
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(donChannel);
    };
  }, []);

  const overlayUrl = `${origin || 'http://localhost:3000'}/overlay/${token}`;

  // Copy OBS URL to clipboard
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    showSuccessNotification(
      'Overlay URL Copied!',
      'Paste this exact URL into your OBS Studio / Streamlabs Browser Source (Recommended resolution: 800x600 or 1920x1080).'
    );
  };

  // Dispatch Test Alert to active OBS Browser Sources
  const triggerTestAlert = async (amount = 350, donor = 'Sakura_Stream_Fan') => {
    setIsTriggering(true);

    const testPayload = {
      id: `test-${Date.now()}`,
      token: token,
      donor_name: donor,
      amount: amount,
      currency: 'THB',
      message: 'GGWP! Testing the custom TipTip Forest Green alert overlay sound and visual! 🍃✨',
      isTest: true,
      timestamp: Date.now(),
    };

    // 1. Broadcast via local browser channel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('tiptip-live-alerts');
      channel.postMessage(testPayload);
      channel.close();
    }

    // 2. Broadcast via Supabase Realtime channel
    try {
      const supabaseChannel = supabase.channel(`overlay-${token}`);
      await supabaseChannel.send({
        type: 'broadcast',
        event: 'new-alert',
        payload: testPayload,
      });
    } catch (e) {
      console.warn('Realtime test broadcast error:', e);
    }

    setTimeout(() => {
      setIsTriggering(false);
      showTipTipAlert({
        title: 'Alert Dispatched!',
        html: `Test alert for <b>${donor} (฿${amount})</b> was broadcasted. Check your OBS Studio preview or overlay tab!`,
        icon: 'success',
        iconColor: '#10B981',
        confirmButtonText: 'Great!',
      });
    }, 400);
  };

  // Calculate stream goal
  const goalTarget = 20000;
  const currentTotal = donations.reduce((sum, d) => sum + d.amount, 0);
  const progressPercent = Math.min(Math.round((currentTotal / goalTarget) * 100), 100);

  return (
    <div className="min-h-screen bg-obsidian-950 text-slate-100 dark:bg-obsidian-950 dark:text-slate-100 light:bg-mintlight-50 light:text-forest-950">
      <DashboardNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Streamer Welcome Banner */}
        <section className="relative overflow-hidden rounded-2xl glass-panel p-6 sm:p-8 border border-neon-500/20 shadow-neon-glow">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={streamer.avatar_url}
                  alt={streamer.channel_name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-neon-400 object-cover shadow-md"
                />
                <div className="absolute -bottom-1 -right-1 bg-neon-500 text-obsidian-950 p-1 rounded-full text-[10px] font-bold">
                  ✓
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-white light:text-forest-950">
                    {streamer.channel_name}
                  </h1>
                  <span className="px-2 py-0.5 text-xs font-mono rounded bg-emerald-500/20 text-neon-400 border border-emerald-500/30">
                    Live Partner
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-1 max-w-xl">
                  {streamer.bio}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard/studio"
                className="px-4 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-600 to-forest-800 text-white shadow-neon-glow hover:opacity-95 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-neon-300" />
                Customize Alerts
              </Link>
              <Link
                href={`/${streamer.slug}`}
                target="_blank"
                className="px-4 py-2.5 rounded-xl font-medium text-sm bg-obsidian-800 text-slate-200 border border-obsidian-700 hover:border-neon-500/40 hover:text-white transition-all flex items-center gap-2"
              >
                View Donor Page
                <ArrowUpRight className="w-4 h-4 text-neon-400" />
              </Link>
            </div>
          </div>
        </section>

        {/* OBS Browser Source Generator Card */}
        <section className="rounded-2xl glass-panel p-6 border border-emerald-500/30 bg-gradient-to-b from-forest-950/60 to-obsidian-900/90 shadow-glass">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-neon-400 border border-emerald-500/20">
                <Tv className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-display font-bold text-white light:text-forest-950 flex items-center gap-2">
                  OBS Studio Browser Source URL
                  <span className="text-xs font-mono font-normal text-neon-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800">
                    Zero-Latency
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Add this link as a Browser Source in OBS, Streamlabs, or vMix. Keep this URL secret!
                </p>
              </div>
            </div>

            {/* Test Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => triggerTestAlert(250, 'Ninja_Samurai')}
                disabled={isTriggering}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-neon-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isTriggering ? 'Dispatching...' : 'Test Alert (฿250)'}
              </button>

              <Link
                href={overlayUrl}
                target="_blank"
                className="px-3.5 py-2 rounded-xl text-xs font-medium bg-obsidian-800 text-slate-300 border border-obsidian-700 hover:text-white flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Overlay Tab
              </Link>
            </div>
          </div>

          {/* URL Input with Copy & Obfuscation */}
          <div className="relative flex items-center">
            <div className="w-full flex items-center px-4 py-3 rounded-xl bg-obsidian-950/90 border border-obsidian-700 focus-within:border-neon-500 text-sm font-mono text-slate-300 overflow-hidden">
              <span className="text-emerald-500 select-none mr-2 font-bold">URL:</span>
              <span className="truncate flex-1 select-all">
                {showToken ? overlayUrl : `${origin || 'http://localhost:3000'}/overlay/••••••••••••••••••••••••`}
              </span>
            </div>

            <div className="absolute right-2 flex items-center gap-1.5">
              <button
                onClick={() => setShowToken(!showToken)}
                className="p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-obsidian-800 transition-colors"
                title={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>

              <button
                onClick={handleCopyUrl}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-500 transition-all shadow-neon-glow"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </section>

        {/* Realtime Metrics Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl glass-panel p-5 border border-obsidian-800 hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Total Stream Revenue</span>
              <TrendingUp className="w-4 h-4 text-neon-400" />
            </div>
            <div className="mt-2 text-2xl font-display font-extrabold text-white light:text-forest-950">
              ฿{streamer.balance.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-neon-400 flex items-center gap-1">
              <span>+18.4% from last week</span>
            </div>
          </div>

          <div className="rounded-2xl glass-panel p-5 border border-obsidian-800 hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Donations This Month</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-display font-extrabold text-white light:text-forest-950">
              ฿{currentTotal.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {donations.length} total tips received
            </div>
          </div>

          <div className="rounded-2xl glass-panel p-5 border border-obsidian-800 hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Average Tip Size</span>
              <Users className="w-4 h-4 text-neon-300" />
            </div>
            <div className="mt-2 text-2xl font-display font-extrabold text-white light:text-forest-950">
              ฿{Math.round(currentTotal / donations.length || 0).toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              VIP donors contributing 65%
            </div>
          </div>

          <div className="rounded-2xl glass-panel p-5 border border-obsidian-800 hover:border-amber-500/30 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Top Donor Tonight</span>
              <Sparkles className="w-4 h-4 text-ambervip-400" />
            </div>
            <div className="mt-2 text-2xl font-display font-extrabold text-ambervip-400">
              ฿2,500
            </div>
            <div className="mt-1 text-xs text-slate-300 truncate">
              VoxelKnight 🔥
            </div>
          </div>
        </section>

        {/* Goal Bar & Recent Donations Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stream Goal Bar Card */}
          <div className="rounded-2xl glass-panel p-6 border border-obsidian-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-bold text-base text-white light:text-forest-950">
                  Active Stream Goal
                </h3>
                <span className="text-xs font-mono text-neon-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {progressPercent}% Achieved
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Goal: New 4K Stream Deck & Shure SM7B Mic setup
              </p>

              {/* Progress Bar Container */}
              <div className="w-full h-4 rounded-full bg-obsidian-900 border border-obsidian-700 p-0.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-forest-600 via-emerald-500 to-neon-400 shadow-neon-glow transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-xs font-mono mt-2 text-slate-400">
                <span>฿{currentTotal.toLocaleString()}</span>
                <span>Target: ฿{goalTarget.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-obsidian-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Payout Method:</span>
              <span className="font-mono text-emerald-400 font-medium">PromptPay (081-xxx-5678)</span>
            </div>
          </div>

          {/* Realtime Donation Activity Feed */}
          <div className="lg:col-span-2 rounded-2xl glass-panel p-6 border border-obsidian-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-base text-white light:text-forest-950 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Donation Stream
              </h3>
              <Link
                href="/dashboard/donations"
                className="text-xs text-neon-400 hover:underline font-medium"
              >
                View All Transactions &rarr;
              </Link>
            </div>

            <div className="divide-y divide-obsidian-800/60">
              {donations.map((don) => (
                <div
                  key={don.id}
                  className="py-3.5 flex items-start justify-between gap-4 group hover:bg-obsidian-900/40 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-forest-950 border border-emerald-500/30 flex items-center justify-center font-display font-bold text-neon-400 text-sm">
                      {don.donor_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-100">
                          {don.donor_name}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-obsidian-800 text-slate-400 border border-obsidian-700">
                          {don.payment_method}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {new Date(don.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {don.message && (
                        <p className="text-xs text-slate-300 mt-1 line-clamp-1 italic">
                          &ldquo;{don.message}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-display font-bold text-base text-neon-400">
                      +฿{don.amount.toLocaleString()}
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400/80 uppercase">
                      {don.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
