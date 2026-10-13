'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { supabase } from '@/lib/supabase/client';
import { DEMO_SETTINGS } from '@/lib/supabase/mock-data';
import { WidgetSettings, AlertQueueItem } from '@/lib/types';
import { playAlertSound, playTTS } from '@/lib/sound';
import { Sparkles, Volume2, ShieldCheck, Play } from 'lucide-react';

export default function OverlayPage() {
  const params = useParams();
  const widgetToken = (params?.widgetToken as string) || 'demo-obs-alert-token-12345';

  const [settings, setSettings] = useState<WidgetSettings>(DEMO_SETTINGS);
  const [queue, setQueue] = useState<AlertQueueItem[]>([]);
  const [currentAlert, setCurrentAlert] = useState<AlertQueueItem | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isTestMode, setIsTestMode] = useState<boolean>(false);
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false);

  // Trigger confetti burst on alert
  const triggerConfetti = useCallback(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#10B981', '#34D399', '#F59E0B', '#064E3B', '#FFFFFF'],
      });
    } catch (e) {
      console.warn('Confetti error:', e);
    }
  }, []);

  // Fetch widget and initial settings
  useEffect(() => {
    const loadWidgetConfig = async () => {
      try {
        const res = await fetch(`/api/overlay/${widgetToken}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.settings) {
            setSettings(data.settings);
            return;
          }
        }
      } catch (err) {
        console.warn('Using default demo widget configuration:', err);
      }
    };

    loadWidgetConfig();
  }, [widgetToken]);

  // Set up Supabase Realtime channel listener
  useEffect(() => {
    // 1. Listen for Broadcast events on this widget's channel
    const channelName = `overlay-${widgetToken}`;
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'new-alert' }, ({ payload }) => {
        enqueueAlert(payload);
      })
      .subscribe();

    // 2. Also listen to local Cross-Tab BroadcastChannel for easy browser test clicks
    let localBroadcast: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      localBroadcast = new BroadcastChannel('tiptip-live-alerts');
      localBroadcast.onmessage = (event) => {
        if (event.data?.token === widgetToken || event.data?.isTest) {
          enqueueAlert(event.data);
        }
      };
    }

    return () => {
      supabase.removeChannel(channel);
      if (localBroadcast) localBroadcast.close();
    };
  }, [widgetToken]);

  const enqueueAlert = (item: Partial<AlertQueueItem>) => {
    const newItem: AlertQueueItem = {
      id: item.id || `alert-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      donor_name: item.donor_name || 'Anonymous Supporter',
      amount: Number(item.amount) || 100,
      currency: item.currency || 'THB',
      message: item.message || '',
      gif_url: item.gif_url || settings.image_url,
      settings: settings,
      timestamp: Date.now(),
    };

    setQueue((prev) => [...prev, newItem]);
  };

  // Process FIFO Queue
  useEffect(() => {
    if (isPlaying || queue.length === 0) return;

    const [nextAlert, ...remaining] = queue;
    setQueue(remaining);
    setCurrentAlert(nextAlert);
    setIsPlaying(true);

    const alertDurationSec = (settings.duration || 7) * 1000;

    // Trigger visual confetti
    triggerConfetti();

    // Play Sound through Howler engine
    playAlertSound(settings.sound_url, settings.volume);

    // Text to Speech if enabled
    if (settings.tts_enabled && nextAlert.amount >= (settings.tts_min_amount || 0) && nextAlert.message) {
      setTimeout(() => {
        const ttsSpeech = `${nextAlert.donor_name} says: ${nextAlert.message}`;
        playTTS(ttsSpeech, settings.tts_voice);
      }, 1000);
    }

    // Schedule alert departure
    const timer = setTimeout(() => {
      setCurrentAlert(null);
      setIsPlaying(false);
    }, alertDurationSec);

    return () => clearTimeout(timer);
  }, [queue, isPlaying, settings, triggerConfetti]);

  // Test Alert Trigger (For Streamer testing in overlay preview)
  const triggerManualTest = (amount = 250, donor = 'SakuraGamer', msg = 'Huge GG on that victory royale! Enjoy the bubble tea 🧋!') => {
    setAudioUnlocked(true);
    enqueueAlert({
      donor_name: donor,
      amount,
      currency: 'THB',
      message: msg,
      gif_url: settings.image_url,
    });
  };

  // Format template string
  const renderTemplate = (alert: AlertQueueItem) => {
    let text = settings.template_text || '{donor_name} donated {currency}{amount}!';
    text = text.replace('{donor_name}', alert.donor_name);
    text = text.replace('{amount}', Number(alert.amount).toLocaleString());
    text = text.replace('{currency}', alert.currency === 'THB' ? '฿' : `${alert.currency} `);
    text = text.replace('{message}', alert.message || '');
    return text;
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-transparent select-none">
      {/* Audio Unlock Notification for Browsers that block autoplay outside OBS */}
      {!audioUnlocked && (
        <div 
          onClick={() => {
            setAudioUnlocked(true);
            playAlertSound('', 20); // prime audio context
          }}
          className="fixed bottom-3 right-3 z-50 flex items-center gap-2 px-3 py-1.5 text-xs font-mono bg-obsidian-900/90 text-neon-400 border border-emerald-500/30 rounded-lg cursor-pointer hover:bg-obsidian-850 transition-all opacity-40 hover:opacity-100"
        >
          <Volume2 className="w-3.5 h-3.5 animate-pulse text-neon-400" />
          <span>Click once to prime audio for OBS preview</span>
        </div>
      )}

      {/* Main Alert Container */}
      <main className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        <AnimatePresence mode="wait">
          {currentAlert && (
            <motion.div
              key={currentAlert.id}
              initial={{ scale: 0.6, opacity: 0, y: 50, rotateX: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -40, filter: 'blur(10px)' }}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 20,
              }}
              className="relative flex flex-col items-center max-w-xl text-center pointer-events-auto"
            >
              {/* Glowing Aura Background */}
              <div 
                className="absolute -inset-4 rounded-3xl opacity-50 blur-2xl animate-pulse"
                style={{
                  background: `radial-gradient(circle, ${settings.text_accent_color || '#10B981'} 0%, rgba(6, 78, 59, 0.4) 60%, transparent 100%)`,
                }}
              />

              {/* Alert Card Surface */}
              <div className="relative px-8 py-7 rounded-2xl glass-panel border border-neon-400/40 shadow-2xl backdrop-blur-xl bg-obsidian-900/90 text-white min-w-[380px] max-w-lg">
                {/* Media Image / GIF */}
                <div className="relative mx-auto mb-4 w-44 h-44 flex items-center justify-center">
                  <motion.img
                    src={currentAlert.gif_url || settings.image_url}
                    alt="Alert Animation"
                    className="w-full h-full object-contain filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)]"
                    animate={{ rotate: [-2, 2, -2] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  />
                  {currentAlert.amount >= 1000 && (
                    <div className="absolute -top-2 -right-2 bg-ambervip-500 text-obsidian-950 text-xs font-black uppercase px-2.5 py-1 rounded-full shadow-lg border border-amber-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> VIP
                    </div>
                  )}
                </div>

                {/* Primary Alert Header */}
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="font-extrabold text-2xl tracking-tight mb-2"
                  style={{
                    fontFamily: settings.font_family || 'Outfit',
                    color: settings.text_color || '#FFFFFF',
                    textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                  }}
                >
                  <span style={{ color: settings.text_accent_color || '#34D399' }}>
                    {currentAlert.donor_name}
                  </span>{' '}
                  <span className="text-slate-200">tipped</span>{' '}
                  <span className="text-ambervip-400 font-black">
                    {currentAlert.currency === 'THB' ? '฿' : currentAlert.currency}
                    {Number(currentAlert.amount).toLocaleString()}
                  </span>
                </motion.div>

                {/* Subtitle / Custom Template if provided */}
                <div className="text-xs uppercase tracking-widest font-mono text-neon-400/80 mb-3 font-semibold">
                  {renderTemplate(currentAlert)}
                </div>

                {/* Donor Message Box */}
                {currentAlert.message && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25 }}
                    className="mt-3 p-3.5 rounded-xl bg-obsidian-950/80 border border-emerald-500/20 text-slate-100 text-base leading-relaxed break-words font-medium shadow-inner"
                  >
                    &ldquo;{currentAlert.message}&rdquo;
                  </motion.div>
                )}

                {/* Tactical Corner Accents */}
                <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-neon-400" />
                <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-neon-400" />
                <div className="absolute bottom-2 left-2 w-2 h-2 border-b-2 border-l-2 border-neon-400" />
                <div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-neon-400" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Tactical Testing Bar (Toggleable for Streamer Verification) */}
      <div className="fixed top-3 left-3 z-40 opacity-20 hover:opacity-100 transition-opacity flex items-center gap-2">
        <button
          onClick={() => setIsTestMode(!isTestMode)}
          className="px-2.5 py-1 text-[11px] font-mono rounded bg-obsidian-900 text-neon-400 border border-obsidian-700 hover:border-neon-500 flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          {isTestMode ? 'Hide Test Bar' : 'Overlay Controls'}
        </button>

        {isTestMode && (
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-obsidian-900/90 border border-neon-500/30 backdrop-blur-md">
            <button
              onClick={() => triggerManualTest(100, 'Alex_Walker', 'Love the stream! Keep winning!')}
              className="px-2 py-0.5 text-[11px] font-medium rounded bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 flex items-center gap-1"
            >
              <Play className="w-2.5 h-2.5" /> Test ฿100
            </button>
            <button
              onClick={() => triggerManualTest(1500, 'CyberLord_VIP', 'GG WP! Special VIP alert test with custom TTS!')}
              className="px-2 py-0.5 text-[11px] font-medium rounded bg-amber-600/30 text-amber-300 hover:bg-amber-600/50 flex items-center gap-1"
            >
              <Sparkles className="w-2.5 h-2.5" /> Test VIP ฿1,500
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
