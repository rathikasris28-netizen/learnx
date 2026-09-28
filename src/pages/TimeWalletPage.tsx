import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Coins, ArrowDownLeft, ArrowUpRight, ShieldCheck, Clock, AlertCircle } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { CreditTransaction } from '../types';

export function TimeWalletPage({ navigate }: { navigate: (path: string) => void }) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [totalEarned, setTotalEarned] = useState<number>(0);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/time-wallet');
      setBalance(data.balance ?? 0);
      setTotalEarned(data.total_earned ?? 0);
      setTotalSpent(data.total_spent ?? 0);
      setTransactions(data.transactions || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk']">
          Time Credit Wallet & Audit Ledger
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Every credit adjustment is recorded in an immutable, server-verified transaction ledger.
        </p>
      </div>

      {/* Non-Monetary Strict Principle Notice */}
      <div className="p-4 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 text-xs text-cyan-300 space-y-1">
        <div className="flex items-center gap-2 font-bold text-white">
          <ShieldCheck className="h-4 w-4 text-cyan-400" />
          <span>Core Rule: 1 Hour Verified Sharing = 1 Time Credit</span>
        </div>
        <p className="text-slate-300 text-[11px] leading-relaxed">
          Time Credits are internal learning units with no cash value. They cannot be withdrawn, sold, transferred for money, or converted to currency. They exist solely within LearnX.
        </p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Available Balance</span>
            <Coins className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-['Space_Grotesk']">
            {balance} <span className="text-xs font-normal text-cyan-400">TC</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Spendable on 1-on-1 peer sessions
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Earned</span>
            <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-['Space_Grotesk']">
            +{totalEarned} <span className="text-xs font-normal text-emerald-400">TC</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            From verified knowledge sharing
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Utilized</span>
            <ArrowUpRight className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-['Space_Grotesk']">
            {totalSpent} <span className="text-xs font-normal text-amber-400">TC</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Invested in personal learning
          </p>
        </div>
      </div>

      {/* Ledger History Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
        <h2 className="text-base font-bold text-white font-['Space_Grotesk']">
          Transaction Ledger History
        </h2>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Loading ledger transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-6 space-y-2">
            <Coins className="h-8 w-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">
              No transactions recorded yet. Mentors earn credits only through verified sessions; new Learners receive one welcome bonus at registration.
            </p>
            <button
              onClick={() => navigate('/discover')}
              className="mt-2 px-4 py-2 rounded-xl bg-cyan-500 text-white text-xs font-semibold hover:bg-cyan-400"
            >
              Start Sharing or Learning
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-[10px] text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-950/40">
                    <td className="py-3 px-3 font-semibold">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        tx.transaction_type === 'EARNED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40' :
                        tx.transaction_type === 'WELCOME_BONUS' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/40' :
                        tx.transaction_type === 'USED' ? 'bg-amber-950 text-amber-300 border border-amber-800/40' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-white">
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount} TC
                    </td>
                    <td className="py-3 px-3 text-slate-200">
                      {tx.description}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-mono text-cyan-400">{tx.status}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {new Date(tx.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
