'use client';

import React, { useState, useEffect } from 'react';
import { DashboardNavbar } from '@/components/DashboardNavbar';
import { DEMO_STREAMER } from '@/lib/supabase/mock-data';
import { CreditCard, Wallet, ArrowDownRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { showTipTipAlert, showSuccessNotification } from '@/lib/swal';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

interface PayoutRecord {
  id: string;
  date: string;
  method: string;
  status: string;
  amount: number;
}

const DEFAULT_HISTORY: PayoutRecord[] = [
  { id: 'p-1', date: 'Oct 10, 2026', method: 'PromptPay (0812345678)', status: 'Completed', amount: 8000 },
  { id: 'p-2', date: 'Sep 28, 2026', method: 'PromptPay (0812345678)', status: 'Completed', amount: 12500 },
];

export default function PayoutsPage() {
  const [balance, setBalance] = useState(DEMO_STREAMER.balance);
  const [payoutAmount, setPayoutAmount] = useState('5000');
  const [promptPayId, setPromptPayId] = useState(DEMO_STREAMER.payout_promptpay || '0812345678');
  const [bankAccount, setBankAccount] = useState(DEMO_STREAMER.payout_bank_account || '712-2-90182-3');
  const [history, setHistory] = useState<PayoutRecord[]>(DEFAULT_HISTORY);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load real balance and payout records
  useEffect(() => {
    const loadPayoutData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('balance, payout_promptpay, payout_bank_account')
            .eq('id', user.id)
            .single();

          if (profile) {
            setBalance(profile.balance);
            if (profile.payout_promptpay) setPromptPayId(profile.payout_promptpay);
            if (profile.payout_bank_account) setBankAccount(profile.payout_bank_account);
          }

          const { data: payouts } = await supabase
            .from('payout_requests')
            .select('*')
            .eq('streamer_id', user.id)
            .order('created_at', { ascending: false });

          if (payouts && payouts.length > 0) {
            setHistory(
              payouts.map((p) => ({
                id: p.id,
                date: new Date(p.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
                method: `${p.method.toUpperCase()} (${p.account_number})`,
                status: p.status.charAt(0).toUpperCase() + p.status.slice(1),
                amount: p.amount,
              }))
            );
          }
        }
      } catch (err) {
        console.warn('Payout data load warning:', err);
      }
    };
    loadPayoutData();
  }, []);

  const handleRequestPayout = async () => {
    const amt = parseFloat(payoutAmount);
    if (isNaN(amt) || amt <= 0 || amt > balance) {
      showTipTipAlert({
        icon: 'error',
        title: 'Invalid Amount',
        text: 'Withdrawal amount must be within your available balance.',
        confirmButtonText: 'OK',
      });
      return;
    }

    const confirmRes = await showTipTipAlert({
      title: 'Confirm Withdrawal Request',
      html: `You are requesting a payout of <b>฿${amt.toLocaleString()}</b> to PromptPay <b>${promptPayId}</b>.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Submit Payout',
      cancelButtonText: 'Cancel',
    });

    if (!confirmRes.isConfirmed) return;

    setIsSubmitting(true);
    try {
      if (isSupabaseConfigured()) {
        const { data: payout, error } = await supabase.rpc('request_payout', {
          p_amount: amt,
          p_method: 'promptpay',
          p_account_number: promptPayId,
          p_account_holder: 'Streamer Account',
        });

        if (error) throw error;

        setBalance((prev) => prev - amt);
        setHistory((prev) => [
          {
            id: payout?.id || `req-${Date.now()}`,
            date: 'Today',
            method: `PROMPTPAY (${promptPayId})`,
            status: 'Pending',
            amount: amt,
          },
          ...prev,
        ]);
      } else {
        // Demo sandbox mode
        setBalance((prev) => prev - amt);
        setHistory((prev) => [
          {
            id: `req-${Date.now()}`,
            date: 'Just now',
            method: `PROMPTPAY (${promptPayId})`,
            status: 'Processing',
            amount: amt,
          },
          ...prev,
        ]);
      }

      showSuccessNotification(
        'Payout Submitted!',
        'Your request is queued for instant batch processing. Funds typically clear within 10-15 minutes.'
      );
    } catch (err: any) {
      console.error('Payout request error:', err);
      showTipTipAlert({
        icon: 'error',
        title: 'Payout Failed',
        text: err.message || 'Could not process payout request. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-950 text-slate-100 dark:bg-obsidian-950 dark:text-slate-100 light:bg-mintlight-50 light:text-forest-950">
      <DashboardNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-white light:text-forest-950 flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-neon-400" />
            Payout & Earnings Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Automated withdrawals to PromptPay, Thai Bank Accounts, or Stripe Express Connect.
          </p>
        </div>

        {/* Balance Card & Payout Request */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 rounded-2xl glass-panel p-6 border border-emerald-500/30 bg-gradient-to-b from-forest-950/60 to-obsidian-900/90 shadow-neon-glow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>Available Withdrawable Balance</span>
                <Wallet className="w-4 h-4 text-neon-400" />
              </div>
              <div className="text-3xl font-display font-black text-white light:text-forest-950">
                ฿{balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-neon-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready for immediate transfer
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-obsidian-800 space-y-3">
              <label className="block text-xs font-medium text-slate-300">
                Amount to Withdraw (THB)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-bold text-slate-400">฿</span>
                <input
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-obsidian-950 border border-obsidian-700 text-sm font-mono text-white outline-none focus:border-neon-500"
                />
              </div>

              <button
                onClick={handleRequestPayout}
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-forest-800 text-white shadow-neon-glow hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowDownRight className="w-4 h-4" />
                {isSubmitting ? 'Submitting...' : 'Request Withdrawal'}
              </button>
            </div>
          </div>

          {/* Destination Accounts */}
          <div className="lg:col-span-2 rounded-2xl glass-panel p-6 border border-obsidian-800 space-y-6">
            <h3 className="font-display font-bold text-base text-white light:text-forest-950 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-neon-400" />
              Verified Payout Destinations
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-obsidian-900 border border-obsidian-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-neon-400 font-semibold">
                    PromptPay QR / Phone
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-neon-300 px-2 py-0.5 rounded font-mono">
                    Default
                  </span>
                </div>
                <input
                  type="text"
                  value={promptPayId}
                  onChange={(e) => setPromptPayId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-obsidian-950 border border-obsidian-700 text-xs font-mono text-slate-200 outline-none"
                />
                <p className="text-[11px] text-slate-400">Zero transfer fee • 24/7 instant arrival</p>
              </div>

              <div className="p-4 rounded-xl bg-obsidian-900 border border-obsidian-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-slate-400 font-semibold">
                    Kasikornbank (K-Bank)
                  </span>
                  <span className="text-[10px] bg-obsidian-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                    Secondary
                  </span>
                </div>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-obsidian-950 border border-obsidian-700 text-xs font-mono text-slate-200 outline-none"
                />
                <p className="text-[11px] text-slate-400">Account holder: Streamer Verified Studio</p>
              </div>
            </div>

            {/* Payout History */}
            <div>
              <h4 className="text-xs font-mono uppercase text-slate-400 mb-3">Recent Payout Dispatches</h4>
              <div className="rounded-xl border border-obsidian-800 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-obsidian-900 text-slate-400 font-mono">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-obsidian-800/50">
                    {history.map((record) => (
                      <tr key={record.id}>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{record.date}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-200">{record.method}</td>
                        <td className="py-2.5 px-3 text-neon-400">{record.status}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                          ฿{record.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
