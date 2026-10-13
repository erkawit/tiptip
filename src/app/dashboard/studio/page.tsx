'use client';

import React, { useState } from 'react';
import { DashboardNavbar } from '@/components/DashboardNavbar';
import { DEMO_SETTINGS, DEMO_WIDGET } from '@/lib/supabase/mock-data';
import { WidgetSettings } from '@/lib/types';
import { playAlertSound } from '@/lib/sound';
import { showSuccessNotification, showTipTipAlert } from '@/lib/swal';
import { 
  Sliders, 
  Volume2, 
  Image as ImageIcon, 
  Type, 
  Clock, 
  Sparkles, 
  Play, 
  Save, 
  Mic, 
  Palette,
  CheckCircle2,
  RefreshCw,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

const SOUND_PRESETS = [
  { name: 'Emerald Sparkle Chime', url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
  { name: 'Level Up Fanfare', url: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3' },
  { name: 'Arcade Coin Ding', url: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3' },
  { name: 'Cyber Notification', url: 'https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3' },
];

const GIF_PRESETS = [
  { name: 'Dancing Cat', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
  { name: 'Neon Diamond', url: 'https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif' },
  { name: 'Pixel Gold Chest', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif' },
  { name: 'Anime Celebration', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' },
];

export default function AlertStudioPage() {
  const [settings, setSettings] = useState<WidgetSettings>(DEMO_SETTINGS);
  const [widgetToken, setWidgetToken] = useState(DEMO_WIDGET.token);
  const [widgetId, setWidgetId] = useState(DEMO_WIDGET.id);
  const [previewActive, setPreviewActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Load real widget and settings
  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: widget } = await supabase
            .from('widgets')
            .select('id, token, widget_settings(*)')
            .eq('streamer_id', user.id)
            .eq('widget_type', 'alert_box')
            .single();

          if (widget) {
            setWidgetId(widget.id);
            setWidgetToken(widget.token);
            const loadedSettings = Array.isArray(widget.widget_settings)
              ? widget.widget_settings[0]
              : widget.widget_settings;
            if (loadedSettings) {
              setSettings(loadedSettings as WidgetSettings);
            }
          }
        }
      } catch (err) {
        console.warn('Studio config load:', err);
      }
    };
    loadSettings();
  }, []);

  // Upload custom sound or visual to Supabase Storage
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, type: 'audio' | 'image') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isSupabaseConfigured()) {
      // Local preview URL
      const localUrl = URL.createObjectURL(file);
      if (type === 'audio') setSettings((prev) => ({ ...prev, sound_url: localUrl }));
      else setSettings((prev) => ({ ...prev, image_url: localUrl }));
      showSuccessNotification('Loaded Local Asset', 'Asset loaded in preview session.');
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required for storage upload');

      const bucket = type === 'audio' ? 'alerts-audio' : 'alerts-images';
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 6)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);

      if (type === 'audio') {
        setSettings((prev) => ({ ...prev, sound_url: publicUrl }));
      } else {
        setSettings((prev) => ({ ...prev, image_url: publicUrl }));
      }

      showSuccessNotification('Media Uploaded!', 'Asset saved to Supabase Storage and applied to alert settings.');
    } catch (err: any) {
      console.error('Storage upload error:', err);
      showTipTipAlert({
        icon: 'error',
        title: 'Upload Failed',
        text: err.message || 'Could not upload media file.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Preview the sound using Howler
  const handleTestSound = () => {
    playAlertSound(settings.sound_url, settings.volume);
  };

  // Trigger interactive preview inside the preview panel
  const handleTriggerLivePreview = () => {
    setPreviewActive(false);
    setTimeout(() => {
      setPreviewActive(true);
      playAlertSound(settings.sound_url, settings.volume);
      setTimeout(() => setPreviewActive(false), settings.duration * 1000);
    }, 100);
  };

  // Insert template tag into template_text
  const insertTag = (tag: string) => {
    setSettings((prev) => ({
      ...prev,
      template_text: `${prev.template_text} ${tag}`,
    }));
  };

  // Save settings with database update & Realtime broadcast
  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (isSupabaseConfigured() && widgetId) {
        await supabase
          .from('widget_settings')
          .upsert({
            widget_id: widgetId,
            sound_url: settings.sound_url,
            volume: settings.volume,
            image_url: settings.image_url,
            font_family: settings.font_family,
            template_text: settings.template_text,
            duration: settings.duration,
            min_amount: settings.min_amount,
            text_color: settings.text_color,
            text_accent_color: settings.text_accent_color,
            tts_enabled: settings.tts_enabled,
            tts_min_amount: settings.tts_min_amount,
            tts_voice: settings.tts_voice,
            glow_color: settings.glow_color,
            updated_at: new Date().toISOString(),
          });

        // Broadcast settings update to OBS overlay
        const channel = supabase.channel(`overlay-${widgetToken}`);
        await channel.send({
          type: 'broadcast',
          event: 'settings-updated',
          payload: settings,
        });
      }

      showSuccessNotification(
        'Studio Settings Saved!',
        'Your OBS Browser Source overlay has been updated in real-time. No OBS restart required.'
      );
    } catch (err: any) {
      console.warn('Save settings warning:', err);
      showSuccessNotification(
        'Settings Saved (Local/Demo)',
        'Alert styles updated for this session.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Dispatch alert to live OBS overlay tab
  const handleBroadcastToOBS = () => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('tiptip-live-alerts');
      channel.postMessage({
        id: `studio-test-${Date.now()}`,
        token: widgetToken,
        donor_name: 'StudioDirector',
        amount: 777,
        currency: 'THB',
        message: 'Direct broadcast from TipTip Alert Studio! Looks sleek in OBS!',
        isTest: true,
      });
      channel.close();
    }
    showTipTipAlert({
      icon: 'success',
      title: 'Dispatched to OBS!',
      text: 'Signal broadcasted to all active OBS browser source instances.',
      confirmButtonText: 'Great!',
      iconColor: '#10B981',
    });
  };

  return (
    <div className="min-h-screen bg-obsidian-950 text-slate-100 dark:bg-obsidian-950 dark:text-slate-100 light:bg-mintlight-50 light:text-forest-950">
      <DashboardNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Studio Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-white light:text-forest-950 flex items-center gap-2.5">
              <Sliders className="w-7 h-7 text-neon-400" />
              Alert Customization Studio
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Configure visuals, Howler audio, typography, and Text-to-Speech triggers for your live OBS overlays.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleBroadcastToOBS}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-obsidian-800 text-neon-400 border border-emerald-500/30 hover:border-neon-500 hover:bg-obsidian-750 transition-all flex items-center gap-2 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Send Test to OBS
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-forest-800 text-white shadow-neon-glow hover:opacity-95 transition-all flex items-center gap-2"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Studio Workspace: Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Configuration Controls (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Module 1: Audio Engine & Volume */}
            <div className="rounded-2xl glass-panel p-6 border border-obsidian-800 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-neon-400">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-white light:text-forest-950">
                      Audio Engine & Sound Effect
                    </h3>
                    <p className="text-xs text-slate-400">High-fidelity alert chime powered by Howler.js</p>
                  </div>
                </div>
                <button
                  onClick={handleTestSound}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-neon-300 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3 fill-current" /> Test Audio
                </button>
              </div>

              {/* Preset Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Sound Presets</label>
                <div className="grid grid-cols-2 gap-2">
                  {SOUND_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => setSettings({ ...settings, sound_url: preset.url })}
                      className={`px-3 py-2 text-left rounded-xl text-xs font-medium border transition-all ${
                        settings.sound_url === preset.url
                          ? 'bg-forest-900/60 border-neon-400 text-neon-300 shadow-sm'
                          : 'bg-obsidian-900 border-obsidian-800 text-slate-400 hover:border-obsidian-700'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Audio URL */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Custom Sound URL (MP3 / WAV)
                </label>
                <input
                  type="text"
                  value={settings.sound_url}
                  onChange={(e) => setSettings({ ...settings, sound_url: e.target.value })}
                  placeholder="https://example.com/alert.mp3"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950 border border-obsidian-800 focus:border-neon-500 text-xs text-slate-200 font-mono outline-none"
                />
              </div>

              {/* Volume Slider */}
              <div>
                <div className="flex justify-between items-center text-xs font-medium mb-1">
                  <span className="text-slate-300">Master Volume</span>
                  <span className="font-mono text-neon-400">{settings.volume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.volume}
                  onChange={(e) => setSettings({ ...settings, volume: Number(e.target.value) })}
                  className="w-full h-2 bg-obsidian-900 rounded-lg appearance-none cursor-pointer accent-neon-500"
                />
              </div>
            </div>

            {/* Module 2: Visual Media & Animation */}
            <div className="rounded-2xl glass-panel p-6 border border-obsidian-800 space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-neon-400">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white light:text-forest-950">
                    Visual Media & Duration
                  </h3>
                  <p className="text-xs text-slate-400">Select GIF animations and display timeout</p>
                </div>
              </div>

              {/* GIF Presets */}
              <div className="grid grid-cols-4 gap-3">
                {GIF_PRESETS.map((gif) => (
                  <div
                    key={gif.name}
                    onClick={() => setSettings({ ...settings, image_url: gif.url })}
                    className={`p-2 rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center ${
                      settings.image_url === gif.url
                        ? 'bg-forest-900/60 border-neon-400 shadow-neon-glow'
                        : 'bg-obsidian-900 border-obsidian-800 hover:border-obsidian-700'
                    }`}
                  >
                    <img src={gif.url} alt={gif.name} className="w-16 h-16 object-contain mb-1 rounded" />
                    <span className="text-[10px] font-medium text-slate-300 truncate w-full">{gif.name}</span>
                  </div>
                ))}
              </div>

              {/* Custom Image URL */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Custom Image / GIF URL
                </label>
                <input
                  type="text"
                  value={settings.image_url}
                  onChange={(e) => setSettings({ ...settings, image_url: e.target.value })}
                  placeholder="https://media.giphy.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950 border border-obsidian-800 focus:border-neon-500 text-xs text-slate-200 font-mono outline-none"
                />
              </div>

              {/* Display Duration & Min Amount Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center text-xs font-medium mb-1">
                    <span className="text-slate-300">Display Duration</span>
                    <span className="font-mono text-neon-400">{settings.duration}s</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="20"
                    value={settings.duration}
                    onChange={(e) => setSettings({ ...settings, duration: Number(e.target.value) })}
                    className="w-full h-2 bg-obsidian-900 rounded-lg appearance-none cursor-pointer accent-neon-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs font-medium mb-1">
                    <span className="text-slate-300">Minimum Tip Threshold</span>
                    <span className="font-mono text-neon-400">฿{settings.min_amount}</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={settings.min_amount}
                    onChange={(e) => setSettings({ ...settings, min_amount: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded-lg bg-obsidian-950 border border-obsidian-800 text-xs font-mono text-slate-200 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Module 3: Typography & Text Layout */}
            <div className="rounded-2xl glass-panel p-6 border border-obsidian-800 space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-neon-400">
                  <Type className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white light:text-forest-950">
                    Typography & Custom Template
                  </h3>
                  <p className="text-xs text-slate-400">Message variables and color accents</p>
                </div>
              </div>

              {/* Variable Chips */}
              <div>
                <span className="block text-xs font-medium text-slate-300 mb-1.5">
                  Click to insert variables:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {['{donor_name}', '{amount}', '{currency}', '{message}'].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => insertTag(chip)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-obsidian-900 border border-obsidian-700 text-neon-400 hover:border-neon-500 transition-colors"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template input */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Alert Message Template
                </label>
                <input
                  type="text"
                  value={settings.template_text}
                  onChange={(e) => setSettings({ ...settings, template_text: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950 border border-obsidian-800 focus:border-neon-500 text-xs text-slate-200 outline-none font-medium"
                />
              </div>

              {/* Font & Color selections */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Font Family</label>
                  <select
                    value={settings.font_family}
                    onChange={(e) => setSettings({ ...settings, font_family: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-obsidian-950 border border-obsidian-800 text-xs text-slate-200 outline-none"
                  >
                    <option value="Outfit">Outfit</option>
                    <option value="Plus Jakarta Sans">Jakarta Sans</option>
                    <option value="JetBrains Mono">JetBrains Mono</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.text_color}
                      onChange={(e) => setSettings({ ...settings, text_color: e.target.value })}
                      className="w-8 h-8 rounded border border-obsidian-700 cursor-pointer bg-transparent"
                    />
                    <span className="text-xs font-mono text-slate-400">{settings.text_color}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Neon Accent</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.text_accent_color}
                      onChange={(e) => setSettings({ ...settings, text_accent_color: e.target.value })}
                      className="w-8 h-8 rounded border border-obsidian-700 cursor-pointer bg-transparent"
                    />
                    <span className="text-xs font-mono text-slate-400">{settings.text_accent_color}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Module 4: Text-To-Speech (TTS) */}
            <div className="rounded-2xl glass-panel p-6 border border-obsidian-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-neon-400">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-white light:text-forest-950">
                      Text-to-Speech (TTS) Voice
                    </h3>
                    <p className="text-xs text-slate-400">Automatic speech synthesis for tip messages</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.tts_enabled}
                    onChange={(e) => setSettings({ ...settings, tts_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-obsidian-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {settings.tts_enabled && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-obsidian-800/80">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Min Amount for TTS
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={settings.tts_min_amount}
                      onChange={(e) => setSettings({ ...settings, tts_min_amount: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg bg-obsidian-950 border border-obsidian-800 text-xs font-mono text-slate-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Voice Language
                    </label>
                    <select
                      value={settings.tts_voice}
                      onChange={(e) => setSettings({ ...settings, tts_voice: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-obsidian-950 border border-obsidian-800 text-xs text-slate-200 outline-none"
                    >
                      <option value="th-TH">Thai (th-TH)</option>
                      <option value="en-US">English (en-US)</option>
                      <option value="ja-JP">Japanese (ja-JP)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Interactive Live Preview Sandbox (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="sticky top-24 rounded-2xl glass-panel p-6 border border-emerald-500/30 bg-gradient-to-b from-forest-950/40 to-obsidian-900/90 shadow-glass">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <h3 className="font-display font-bold text-base text-white light:text-forest-950">
                    Live OBS Overlay Preview
                  </h3>
                </div>

                <button
                  onClick={handleTriggerLivePreview}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-neon-glow transition-all flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Preview Alert Now
                </button>
              </div>

              {/* Sandbox Canvas */}
              <div className="relative w-full h-[460px] rounded-xl bg-obsidian-950/95 border border-obsidian-800 overflow-hidden flex items-center justify-center p-4">
                {/* Simulated Game Backdrop Grid */}
                <div 
                  className="absolute inset-0 opacity-15"
                  style={{
                    backgroundImage: 'radial-gradient(#10B981 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                />

                <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-500 uppercase">
                  OBS Canvas (1920x1080 Scoped)
                </div>

                {/* Animated Alert Instance */}
                <AnimatePresence mode="wait">
                  {(previewActive || !previewActive) && (
                    <motion.div
                      key={previewActive ? 'active' : 'idle'}
                      initial={{ scale: 0.7, opacity: 0, y: 30 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.7, opacity: 0, y: -20 }}
                      className="relative z-10 flex flex-col items-center text-center max-w-sm w-full"
                    >
                      <div className="relative px-6 py-5 rounded-2xl glass-panel border border-neon-400/50 shadow-2xl bg-obsidian-900/95 text-white w-full">
                        {/* GIF */}
                        <div className="mx-auto mb-3 w-28 h-28 flex items-center justify-center">
                          <img
                            src={settings.image_url}
                            alt="Preview GIF"
                            className="w-full h-full object-contain filter drop-shadow-md"
                          />
                        </div>

                        {/* Title */}
                        <div
                          className="font-extrabold text-xl tracking-tight mb-1"
                          style={{
                            fontFamily: settings.font_family,
                            color: settings.text_color,
                          }}
                        >
                          <span style={{ color: settings.text_accent_color }}>
                            KitsuneSupporter
                          </span>{' '}
                          <span>tipped</span>{' '}
                          <span className="text-ambervip-400 font-black">฿500</span>
                        </div>

                        {/* Subtitle Template */}
                        <div className="text-[10px] uppercase font-mono text-neon-400/90 font-semibold mb-2">
                          {settings.template_text
                            .replace('{donor_name}', 'KitsuneSupporter')
                            .replace('{amount}', '500')
                            .replace('{currency}', '฿')
                            .replace('{message}', 'Keep up the clutch plays!')}
                        </div>

                        {/* Message */}
                        <div className="p-2.5 rounded-lg bg-obsidian-950/80 border border-emerald-500/20 text-slate-200 text-xs italic">
                          &ldquo;Keep up the clutch plays! Love from Thailand 🇹🇭!&rdquo;
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Canvas Specs Helper */}
              <div className="mt-4 pt-3 border-t border-obsidian-800 text-xs text-slate-400 flex items-center justify-between">
                <span>Sound: {settings.sound_url ? 'Configured' : 'Synthetic Chime'}</span>
                <span>Volume: {settings.volume}%</span>
                <span>TTS: {settings.tts_enabled ? 'Active' : 'Off'}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
