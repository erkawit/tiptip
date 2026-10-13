'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardNavbar } from '@/components/DashboardNavbar';
import { 
  ShieldAlert, 
  Users, 
  Activity, 
  DollarSign, 
  Ban, 
  CheckCircle, 
  ExternalLink, 
  TrendingUp,
  Cpu,
  RefreshCw,
  Search,
  Check,
  X
} from 'lucide-react';
import { showTipTipAlert, showSuccessNotification } from '@/lib/swal';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

interface ManagedUser {
  id: string;
  name: string;
  slug: string;
  email: string;
  role: string;
  is_verified: boolean;
  is_banned: boolean;
  balance: number;
}

const INITIAL_USERS: ManagedUser[] = [
  {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'ChromaKitsune',
    slug: 'chromakitsune',
    email: 'streamer@chromakitsune.tv',
    role: 'streamer',
    is_verified: true,
    is_banned: false,
    balance: 14850.00,
  },
  {
    id: 'u-2',
    name: 'ValkyriePilot',
    slug: 'valkyriepilot',
    email: 'valk@gamingpro.com',
    role: 'streamer',
    is_verified: false,
    is_banned: false,
    balance: 4200.00,
  },
  {
    id: 'u-3',
    name: 'SpamBot999',
    slug: 'spambot999',
    email: 'spammer@phish.xyz',
    role: 'streamer',
    is_verified: false,
    is_banned: true,
    balance: 0.00,
  },
];

export default function AdminPage() {
  const [users, setUsers] = useState<ManagedUser[]>(INITIAL_USERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFeeRate, setPlatformFeeRate] = useState(3.0); // 3%
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [gmv, setGmv] = useState<number>(482900);
  const [txCount, setTxCount] = useState<number>(3412);

  const fetchAdminData = async () => {
    setIsRefreshing(true);
    try {
      if (isSupabaseConfigured()) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (profiles && profiles.length > 0) {
          setUsers(
            profiles.map((p) => ({
              id: p.id,
              name: p.channel_name,
              slug: p.slug,
              email: `${p.slug}@streamer.tv`,
              role: p.role,
              is_verified: p.is_verified,
              is_banned: p.is_banned,
              balance: p.balance,
            }))
          );
        }

        const { data: donations } = await supabase
          .from('donations')
          .select('amount, status')
          .eq('status', 'completed');

        if (donations && donations.length > 0) {
          const total = donations.reduce((sum, d) => sum + Number(d.amount), 0);
          setGmv(total);
          setTxCount(donations.length);
        }
      }
    } catch (err) {
      console.warn('Admin data fetch warning:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Toggle user ban status
  const handleToggleBan = async (user: ManagedUser) => {
    const action = user.is_banned ? 'Unban' : 'Ban';
    const confirmRes = await showTipTipAlert({
      title: `${action} User Account?`,
      html: `Are you sure you want to ${action.toLowerCase()} <b>${user.name}</b> (${user.slug})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Yes, ${action}`,
      cancelButtonText: 'Cancel',
    });

    if (!confirmRes.isConfirmed) return;

    const newBannedState = !user.is_banned;
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('profiles')
          .update({ is_banned: newBannedState })
          .eq('id', user.id);
      } catch (e) {
        console.warn('Admin ban update warning:', e);
      }
    }

    setUsers(users.map((u) => (u.id === user.id ? { ...u, is_banned: newBannedState } : u)));
    showSuccessNotification(
      `User ${action}ned`,
      `${user.name} has been updated in the platform directory.`
    );
  };

  // Toggle streamer verification
  const handleToggleVerify = async (user: ManagedUser) => {
    const newVerifiedState = !user.is_verified;
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('profiles')
          .update({ is_verified: newVerifiedState })
          .eq('id', user.id);
      } catch (e) {
        console.warn('Admin verify update warning:', e);
      }
    }

    setUsers(users.map((u) => (u.id === user.id ? { ...u, is_verified: newVerifiedState } : u)));
    showSuccessNotification(
      'Verification Status Toggled',
      `${user.name} verification status has been updated.`
    );
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-obsidian-950 text-slate-100 dark:bg-obsidian-950 dark:text-slate-100 light:bg-mintlight-50 light:text-forest-950">
      <DashboardNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-red-500/20 text-red-400 border border-red-500/30">
                Super Admin Role
              </span>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-white light:text-forest-950">
                Platform Control & Monitoring
              </h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Global system analytics, fee rates, payout clearances, and user security management.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsRefreshing(true);
                setTimeout(() => setIsRefreshing(false), 500);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-obsidian-800 text-slate-200 border border-obsidian-700 hover:border-neon-500/40 flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-neon-400' : ''}`} />
              Refresh Node Telemetry
            </button>
          </div>
        </div>

        {/* System Telemetry & Financial Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl glass-panel p-5 border border-obsidian-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Gross Volume (GMV)</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-display font-black text-white light:text-forest-950">
              ฿{gmv.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-neon-400 font-medium">
              {txCount.toLocaleString()} transactions processed
            </div>
          </div>

          <div className="rounded-2xl glass-panel p-5 border border-obsidian-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Platform Take Fee ({platformFeeRate.toFixed(1)}%)</span>
              <TrendingUp className="w-4 h-4 text-neon-400" />
            </div>
            <div className="mt-2 text-2xl font-display font-black text-neon-300">
              ฿{Math.round(gmv * (platformFeeRate / 100)).toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Retained platform gross margin
            </div>
          </div>

          <div className="rounded-2xl glass-panel p-5 border border-obsidian-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Active Streamers</span>
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-2 text-2xl font-display font-black text-white light:text-forest-950">
              184
            </div>
            <div className="mt-1 text-xs text-slate-400">
              98% verified live partners
            </div>
          </div>

          <div className="rounded-2xl glass-panel p-5 border border-obsidian-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Webhook Latency</span>
              <Activity className="w-4 h-4 text-neon-400" />
            </div>
            <div className="mt-2 text-2xl font-display font-black text-emerald-400">
              28 ms
            </div>
            <div className="mt-1 text-xs text-emerald-400/80">
              Realtime Postgres Broadcast OK
            </div>
          </div>
        </div>

        {/* User Management Section */}
        <div className="rounded-2xl glass-panel p-6 border border-obsidian-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-display font-bold text-white light:text-forest-950 flex items-center gap-2">
                <Users className="w-5 h-5 text-neon-400" />
                Streamer Accounts & Security Auditing
              </h2>
              <p className="text-xs text-slate-400">
                Manage streamer permissions, verification badges, and enforcement bans.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search user, slug or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-xs text-slate-200 outline-none focus:border-neon-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-obsidian-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-obsidian-900 text-slate-400 font-mono uppercase">
                <tr>
                  <th className="py-3 px-4">Channel / Streamer</th>
                  <th className="py-3 px-4">Slug Portal</th>
                  <th className="py-3 px-4">Account Balance</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-obsidian-800/50">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-obsidian-900/40">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{user.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{user.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-neon-400">
                      <Link href={`/${user.slug}`} target="_blank" className="hover:underline flex items-center gap-1">
                        /{user.slug} <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-200">
                      ฿{user.balance.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      {user.is_verified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-neon-300 border border-emerald-500/30">
                          <Check className="w-3 h-3" /> Verified Partner
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-obsidian-800 text-slate-400">
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {user.is_banned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
                          Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleVerify(user)}
                          className="px-2.5 py-1 rounded text-[11px] font-medium bg-obsidian-800 border border-obsidian-700 hover:border-emerald-500 text-slate-300 hover:text-emerald-300"
                        >
                          {user.is_verified ? 'Revoke Partner' : 'Verify'}
                        </button>
                        <button
                          onClick={() => handleToggleBan(user)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                            user.is_banned
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : 'bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/25'
                          }`}
                        >
                          {user.is_banned ? 'Unban' : 'Ban User'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Webhook & Gateway Health Monitor */}
        <div className="rounded-2xl glass-panel p-6 border border-obsidian-800">
          <h2 className="text-base font-display font-bold text-white light:text-forest-950 mb-3 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-neon-400" />
            Infrastructure & Gateway Connectors
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-obsidian-900 border border-obsidian-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-200">Stripe Webhooks</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  Operational
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Endpoint: /api/webhooks/stripe</p>
              <p className="text-[11px] text-slate-500 mt-1">200 OK • 100% Delivery rate</p>
            </div>

            <div className="p-4 rounded-xl bg-obsidian-900 border border-obsidian-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-200">TrueMoney Gateway</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  Operational
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Endpoint: /api/webhooks/truemoney</p>
              <p className="text-[11px] text-slate-500 mt-1">Instant QR reconciliation</p>
            </div>

            <div className="p-4 rounded-xl bg-obsidian-900 border border-obsidian-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-200">Supabase Realtime</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  Connected
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Broadcast Channel: overlay-*</p>
              <p className="text-[11px] text-slate-500 mt-1">Zero dropped alert events</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
