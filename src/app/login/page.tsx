'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { showTipTipAlert, showSuccessNotification } from '@/lib/swal';
import { 
  Sparkles, 
  LogIn, 
  UserPlus, 
  Mail, 
  Lock, 
  Tv, 
  ArrowRight, 
  ShieldCheck, 
  Zap,
  Flame,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirectTo') || '/dashboard';

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [channelName, setChannelName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);

  const handleOAuth = async (provider: 'twitch' | 'google' | 'discord') => {
    if (!isSupabaseConfigured()) {
      showTipTipAlert({
        icon: 'info',
        title: 'Demo Sandbox Mode',
        text: 'Supabase credentials are not connected yet. Entering demo studio mode.',
        confirmButtonText: 'Enter Demo Dashboard',
      }).then(() => {
        router.push(redirectTo);
      });
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      showTipTipAlert({
        icon: 'error',
        title: 'OAuth Error',
        text: err.message || 'Could not initiate OAuth login.',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSupabaseConfigured()) {
      showTipTipAlert({
        icon: 'success',
        title: 'Welcome to Demo Mode!',
        text: 'No Supabase credentials detected in .env.local — logging in as ChromaKitsune demo streamer.',
        confirmButtonText: 'Launch Dashboard',
      }).then(() => {
        router.push(redirectTo);
      });
      return;
    }

    setIsLoading(true);

    try {
      if (useMagicLink) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
          },
        });
        if (error) throw error;

        showTipTipAlert({
          icon: 'success',
          title: 'Magic Link Sent!',
          text: `Check your email at ${email} for your instant login link.`,
        });
      } else if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        showSuccessNotification('Signed In', 'Welcome back to TipTip Live!');
        router.push(redirectTo);
      } else {
        // Sign up
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              channel_name: channelName.trim() || email.split('@')[0],
              full_name: channelName.trim() || email.split('@')[0],
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
          },
        });
        if (error) throw error;

        if (data.session) {
          showSuccessNotification('Account Created', 'Welcome to TipTip Live!');
          router.push(redirectTo);
        } else {
          showTipTipAlert({
            icon: 'info',
            title: 'Confirm Your Email',
            text: `A verification link has been sent to ${email}. Click it to activate your streamer studio!`,
          });
        }
      }
    } catch (err: any) {
      showTipTipAlert({
        icon: 'error',
        title: 'Authentication Failed',
        text: err.message || 'Please check your credentials and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const enterDemoMode = () => {
    router.push('/dashboard?demo=true');
  };

  return (
    <div className="min-h-screen bg-obsidian-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-neon-500 selection:text-obsidian-950 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-forest-900/40 via-emerald-950/20 to-transparent blur-3xl opacity-70 pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 mb-6">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-forest-800 via-forest-900 to-obsidian-950 border border-neon-500/40 flex items-center justify-center shadow-neon-glow group-hover:scale-105 transition-transform">
            <span className="text-neon-400 font-display font-black text-2xl">⚡</span>
          </div>
          <span className="font-display font-extrabold text-2xl tracking-tight text-white flex items-center gap-1.5">
            Tip<span className="text-neon-400">Tip</span>
            <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-neon-400 border border-emerald-500/20">
              Live
            </span>
          </span>
        </Link>
        <h2 className="mt-4 text-2xl font-display font-extrabold tracking-tight text-white">
          {mode === 'signin' ? 'Sign in to Streamer Studio' : 'Create Streamer Account'}
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Precision OBS live alerts, instant PromptPay tips, and tactical dashboards
        </p>
      </div>

      {/* Main Auth Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="rounded-3xl glass-panel p-6 sm:p-8 border border-emerald-500/30 bg-obsidian-900/95 shadow-glass space-y-6">
          {/* Mode Switcher Tabs */}
          <div className="flex p-1 rounded-xl bg-obsidian-950 border border-obsidian-800">
            <button
              type="button"
              onClick={() => { setMode('signin'); setUseMagicLink(false); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'signin'
                  ? 'bg-gradient-to-r from-emerald-600 to-forest-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setUseMagicLink(false); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'signup'
                  ? 'bg-gradient-to-r from-emerald-600 to-forest-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create Account
            </button>
          </div>

          {/* Social / OAuth Providers */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => handleOAuth('twitch')}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#9146FF]/15 text-[#BF94FF] border border-[#9146FF]/30 hover:bg-[#9146FF]/25 hover:border-[#9146FF]/60 transition-all flex items-center justify-center gap-2"
            >
              <Tv className="w-4 h-4 text-[#BF94FF]" />
              Continue with Twitch
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleOAuth('google')}
                className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-obsidian-950 border border-obsidian-800 hover:border-obsidian-700 text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <span className="font-bold text-red-400">G</span> Google / YouTube
              </button>

              <button
                type="button"
                onClick={() => handleOAuth('discord')}
                className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-[#5865F2]/15 text-[#99AAB5] border border-[#5865F2]/30 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <span className="font-bold text-[#5865F2]">D</span> Discord
              </button>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-obsidian-800 w-full" />
            <span className="bg-obsidian-900 px-3 text-[11px] font-mono uppercase text-slate-500 absolute">
              or with email
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Streamer / Channel Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. NeonValkyrie"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950 border border-obsidian-800 focus:border-neon-500 text-xs text-white outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="streamer@twitch.tv"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-obsidian-950 border border-obsidian-800 focus:border-neon-500 text-xs text-white outline-none"
                />
              </div>
            </div>

            {!useMagicLink && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => setUseMagicLink(true)}
                      className="text-[11px] text-neon-400 hover:underline"
                    >
                      Use Magic Link instead?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-obsidian-950 border border-obsidian-800 focus:border-neon-500 text-xs text-white outline-none"
                  />
                </div>
              </div>
            )}

            {useMagicLink && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setUseMagicLink(false)}
                  className="text-[11px] text-neon-400 hover:underline"
                >
                  Use Password instead
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-display font-extrabold text-sm bg-gradient-to-r from-emerald-500 via-neon-500 to-forest-700 text-obsidian-950 shadow-neon-glow hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <span>Processing...</span>
              ) : mode === 'signin' ? (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Create Free Streamer Studio</span>
                  <Sparkles className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Bypass Button */}
          <div className="pt-2 border-t border-obsidian-800/80 text-center">
            <button
              type="button"
              onClick={enterDemoMode}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-mono text-neon-400 bg-forest-950/60 border border-emerald-500/30 hover:border-neon-400 hover:bg-forest-900/60 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-3.5 h-3.5 text-ambervip-400" />
              <span>Instant Test Drive (Demo Mode)</span>
            </button>
            <p className="text-[10px] text-slate-500 mt-2">
              Explore all dashboard controls and live OBS overlay features without signing up.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-obsidian-950 flex items-center justify-center text-neon-400 font-mono text-xs">
          Loading TipTip Studio...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
