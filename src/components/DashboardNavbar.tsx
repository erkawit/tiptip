'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { 
  Tv, 
  Sliders, 
  History, 
  CreditCard, 
  ExternalLink, 
  ShieldAlert,
  Wallet,
  LogOut,
  LogIn,
  User
} from 'lucide-react';
import { DEMO_STREAMER } from '@/lib/supabase/mock-data';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Profile } from '@/lib/types';

export function DashboardNavbar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile>(DEMO_STREAMER);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsAuthenticated(true);
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (userProfile) {
            setProfile(userProfile as Profile);
          }
        }
      } catch (err) {
        console.warn('Navbar user check:', err);
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setProfile(DEMO_STREAMER);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const navLinks = [
    { name: 'Overview', href: '/dashboard', icon: Tv },
    { name: 'Alert Studio', href: '/dashboard/studio', icon: Sliders },
    { name: 'Transactions', href: '/dashboard/donations', icon: History },
    { name: 'Payouts', href: '/dashboard/payouts', icon: CreditCard },
    { name: 'Admin Control', href: '/admin', icon: ShieldAlert },
  ];

  return (
    <header className="sticky top-0 z-30 w-full border-b border-obsidian-800/80 bg-obsidian-950/80 backdrop-blur-md dark:border-obsidian-800/80 dark:bg-obsidian-950/80 light:border-mintlight-200 light:bg-mintlight-50/90 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-forest-800 via-forest-900 to-obsidian-950 border border-neon-500/40 flex items-center justify-center shadow-neon-glow group-hover:scale-105 transition-transform">
              <span className="text-neon-400 font-display font-black text-lg">⚡</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-lg tracking-tight text-white light:text-forest-950 flex items-center gap-1">
                Tip<span className="text-neon-400">Tip</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-neon-400 border border-emerald-500/20">
                  Live
                </span>
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-forest-900/50 text-neon-300 border border-neon-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-obsidian-800/50 light:text-forest-700 light:hover:text-forest-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Section: Balance, Public Link, Profile & Auth */}
        <div className="flex items-center gap-3">
          {/* Quick Balance Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-forest-950/80 border border-neon-500/30 text-neon-400 shadow-sm">
            <Wallet className="w-4 h-4 text-neon-400" />
            <span className="text-xs font-mono text-slate-300">Balance:</span>
            <span className="text-sm font-display font-bold text-white">
              ฿{profile.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Public Portal Link */}
          <Link
            href={`/${profile.slug}`}
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-obsidian-800 text-slate-200 border border-obsidian-700 hover:border-neon-500/40 hover:text-neon-400 transition-all"
          >
            <span>Public Tip Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          {/* Theme Switcher */}
          <ThemeToggle />

          {/* User Profile & Auth Button */}
          <div className="flex items-center gap-2 pl-2 border-l border-obsidian-800">
            <img
              src={profile.avatar_url}
              alt={profile.channel_name}
              className="w-8 h-8 rounded-full border border-neon-500/40 object-cover"
            />
            <span className="hidden lg:inline text-xs font-semibold text-slate-200 max-w-[120px] truncate">
              {profile.channel_name}
            </span>

            {isAuthenticated ? (
              <form action="/auth/signout" method="POST">
                <button
                  type="submit"
                  title="Sign Out"
                  className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-obsidian-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                title="Sign In"
                className="p-1.5 text-neon-400 hover:text-neon-300 rounded-lg hover:bg-obsidian-800 transition-colors"
              >
                <LogIn className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
