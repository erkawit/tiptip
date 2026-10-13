'use client';

import React, { useState, useEffect } from 'react';
import { DashboardNavbar } from '@/components/DashboardNavbar';
import { DEMO_DONATIONS } from '@/lib/supabase/mock-data';
import { Donation } from '@/lib/types';
import { History, Download, Search, Filter, CheckCircle2, Clock, DollarSign } from 'lucide-react';
import { showTipTipAlert, showSuccessNotification } from '@/lib/swal';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export default function DonationsPage() {
  const [donations, setDonations] = useState<Donation[]>(DEMO_DONATIONS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('all');

  useEffect(() => {
    const loadDonations = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: records } = await supabase
            .from('donations')
            .select('*')
            .eq('streamer_id', user.id)
            .order('created_at', { ascending: false });

          if (records && records.length > 0) {
            setDonations(records as Donation[]);
          }
        }
      } catch (err) {
        console.warn('Donations load warning:', err);
      }
    };

    loadDonations();

    // Subscribe to realtime donations
    const sub = supabase
      .channel('ledger-donations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'donations' },
        (payload) => {
          if (payload.new) {
            setDonations((prev) => [payload.new as Donation, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, []);

  const filtered = donations.filter((d) => {
    const matchesSearch =
      d.donor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.message && d.message.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesMethod = filterMethod === 'all' || d.payment_method === filterMethod;
    return matchesSearch && matchesMethod;
  });

  const exportCSV = () => {
    if (filtered.length === 0) {
      showTipTipAlert({
        icon: 'info',
        title: 'No Records',
        text: 'There are no transactions to export.',
      });
      return;
    }

    const headers = ['Date', 'Donor Name', 'Amount (THB)', 'Payment Method', 'Transaction ID', 'Status', 'Message'];
    const rows = filtered.map((d) => [
      `"${new Date(d.created_at).toISOString()}"`,
      `"${d.donor_name.replace(/"/g, '""')}"`,
      d.amount,
      `"${d.payment_method}"`,
      `"${d.transaction_id}"`,
      `"${d.status}"`,
      `"${(d.message || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tiptip_donations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showSuccessNotification('CSV Exported', `Downloaded ${filtered.length} transaction records.`);
  };

  return (
    <div className="min-h-screen bg-obsidian-950 text-slate-100 dark:bg-obsidian-950 dark:text-slate-100 light:bg-mintlight-50 light:text-forest-950">
      <DashboardNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-white light:text-forest-950 flex items-center gap-2.5">
              <History className="w-7 h-7 text-neon-400" />
              Donation Transaction Ledger
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Complete real-time transaction ledger with payment gateway references and donor notes.
            </p>
          </div>

          <button
            onClick={exportCSV}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-obsidian-800 text-slate-200 border border-obsidian-700 hover:border-neon-500/40 hover:text-white flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-neon-400" />
            Export Statement (CSV)
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search donor name or message..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-obsidian-900 border border-obsidian-800 focus:border-neon-500 text-xs text-slate-200 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-500 hidden sm:block" />
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-obsidian-900 border border-obsidian-800 text-xs text-slate-300 outline-none w-full sm:w-44"
            >
              <option value="all">All Gateways</option>
              <option value="promptpay">PromptPay QR</option>
              <option value="stripe">Stripe Cards</option>
              <option value="truemoney">TrueMoney Wallet</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl glass-panel border border-obsidian-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-obsidian-900/80 border-b border-obsidian-800 text-slate-400 font-mono uppercase">
                <tr>
                  <th className="py-3.5 px-4">Date / Time</th>
                  <th className="py-3.5 px-4">Donor Name</th>
                  <th className="py-3.5 px-4">Message</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4">Reference</th>
                  <th className="py-3.5 px-4 text-right">Net Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-obsidian-800/50">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-obsidian-900/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      {item.donor_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                      {item.message || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded font-mono uppercase text-[10px] bg-obsidian-800 border border-obsidian-700 text-neon-400">
                        {item.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {item.transaction_id}
                    </td>
                    <td className="py-3.5 px-4 text-right font-display font-bold text-sm text-neon-300 whitespace-nowrap">
                      +฿{item.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
