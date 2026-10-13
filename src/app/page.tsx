'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Tv, 
  Sliders, 
  QrCode, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Sparkles, 
  Volume2, 
  CheckCircle2, 
  Play,
  Flame,
  LayoutDashboard,
  ExternalLink
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { motion } from 'framer-motion';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-obsidian-950 text-slate-100 flex flex-col justify-between selection:bg-neon-500 selection:text-obsidian-950">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-obsidian-800/80 bg-obsidian-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-forest-800 via-forest-900 to-obsidian-950 border border-neon-500/40 flex items-center justify-center shadow-neon-glow">
              <span className="text-neon-400 font-display font-black text-lg">⚡</span>
            </div>
            <span className="font-display font-extrabold text-xl tracking-tight text-white flex items-center gap-1">
              Tip<span className="text-neon-400">Tip</span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-neon-400 border border-emerald-500/20">
                SaaS
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-forest-800 text-white shadow-neon-glow hover:opacity-95 transition-all flex items-center gap-1.5"
            >
              <span>Launch Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-24 lg:pt-28 lg:pb-32">
          {/* Subtle Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-forest-800/30 to-emerald-500/20 rounded-full blur-[120px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-950/80 border border-emerald-500/30 text-neon-400 text-xs font-mono mb-2 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-ambervip-400" />
              <span>Next-Generation LiveStream Donation & Alert SaaS</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.08]">
              Tactical Live Alerts. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-neon-400 to-teal-200">
                Forest Green Precision.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Ditch the generic streamer widgets. TipTip delivers zero-latency OBS browser source overlays, Howler audio engine chimes, PromptPay & Stripe checkouts with supersonic real-time triggers.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <Link
                href="/dashboard"
                className="px-6 py-3.5 rounded-2xl font-display font-bold text-sm bg-gradient-to-r from-emerald-500 to-neon-500 text-obsidian-950 shadow-neon-glow-lg hover:scale-105 transition-all flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4 fill-current" />
                Streamer Dashboard
              </Link>

              <Link
                href="/overlay/demo-obs-alert-token-12345"
                target="_blank"
                className="px-6 py-3.5 rounded-2xl font-display font-bold text-sm bg-obsidian-900 border border-emerald-500/30 text-neon-300 hover:border-neon-500 transition-all flex items-center gap-2"
              >
                <Tv className="w-4 h-4" />
                OBS Overlay (Live Tab)
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </Link>

              <Link
                href="/chromakitsune"
                className="px-6 py-3.5 rounded-2xl font-display font-bold text-sm bg-obsidian-900 border border-obsidian-800 text-slate-300 hover:text-white transition-all flex items-center gap-2"
              >
                <Flame className="w-4 h-4 text-ambervip-400" />
                Public Donor Portal
              </Link>
            </div>

            {/* Interactive Demo Preview Card */}
            <div className="pt-12 max-w-4xl mx-auto">
              <div className="relative rounded-3xl glass-panel p-2 sm:p-4 border border-emerald-500/30 shadow-2xl bg-obsidian-900/80">
                <div className="rounded-2xl bg-obsidian-950 p-6 sm:p-10 border border-obsidian-800 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
                  {/* Subtle Grid */}
                  <div 
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: 'radial-gradient(#10B981 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }}
                  />

                  {/* Simulated Alert Notification */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ repeat: Infinity, repeatType: 'reverse', duration: 4 }}
                    className="relative z-10 flex flex-col items-center text-center max-w-md w-full"
                  >
                    <div className="px-8 py-6 rounded-2xl glass-panel border border-neon-400/50 shadow-neon-glow-lg bg-obsidian-900/95 text-white w-full">
                      <div className="mx-auto mb-3 w-28 h-28 flex items-center justify-center">
                        <img
                          src="https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif"
                          alt="Demo Alert GIF"
                          className="w-full h-full object-contain filter drop-shadow-md"
                        />
                      </div>
                      <div className="font-extrabold text-2xl tracking-tight mb-1">
                        <span className="text-neon-400">CyberSamurai</span> tipped{' '}
                        <span className="text-ambervip-400">฿500</span>
                      </div>
                      <div className="text-[11px] font-mono uppercase text-neon-300/80 mb-2">
                        CyberSamurai supported with ฿500!
                      </div>
                      <div className="p-3 rounded-xl bg-obsidian-950/80 border border-emerald-500/20 text-slate-200 text-xs italic">
                        &ldquo;That 1v4 clutch in the final ring was pure mastery! GG!&rdquo;
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-20 border-t border-obsidian-800/60 bg-obsidian-900/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-display font-extrabold text-white">
                Engineered for High-Stakes Streamers
              </h2>
              <p className="text-slate-400 text-sm mt-2">
                Every component was crafted with zero-latency, reliability, and visual prestige in mind.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl glass-panel border border-obsidian-800 hover:border-emerald-500/30 transition-all">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-neon-400 flex items-center justify-center mb-4 border border-emerald-500/20">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Zero-Latency Realtime</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Supabase Realtime triggers OBS overlay browser sources in milliseconds upon successful payment receipt.
                </p>
              </div>

              <div className="p-6 rounded-2xl glass-panel border border-obsidian-800 hover:border-emerald-500/30 transition-all">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-neon-400 flex items-center justify-center mb-4 border border-emerald-500/20">
                  <Volume2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Howler Audio Engine</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Reliable audio playback in OBS browser sandbox environments with synthesized fallback chimes and Web Speech TTS.
                </p>
              </div>

              <div className="p-6 rounded-2xl glass-panel border border-obsidian-800 hover:border-emerald-500/30 transition-all">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-neon-400 flex items-center justify-center mb-4 border border-emerald-500/20">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Multi-Gateway Checkouts</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Seamless PromptPay QR, Stripe Card processing, and TrueMoney Wallet with automated idempotency guards.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-obsidian-800 py-8 bg-obsidian-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © 2026 <span className="font-semibold text-slate-300">TipTip Live</span>. Forest Green & Neon Emerald Streamer Architecture.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin" className="hover:text-neon-400 transition-colors">
              Super Admin
            </Link>
            <Link href="/dashboard" className="hover:text-neon-400 transition-colors">
              Dashboard
            </Link>
            <Link href="/chromakitsune" className="hover:text-neon-400 transition-colors">
              Demo Streamer
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
