import React, { useState, useEffect } from 'react';
import { Coins, ArrowUpRight, ArrowDownLeft, Sparkles } from 'lucide-react';

interface WalletViewProps {
  credits: number;
}

export default function WalletView({ credits }: WalletViewProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/credits', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('learnx_token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border border-amber-800/60 rounded-3xl p-8 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-semibold mb-4 border border-amber-500/30">
            <Coins className="w-3.5 h-3.5" /> Internal Currency
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Time Credit Wallet</h1>
          <p className="text-slate-300 mt-2 text-sm max-w-lg">
            Time Credits have no monetary cash value and cannot be withdrawn. They are earned by teaching/sharing skills for 1 verified hour (+1 credit) and used to learn from expert peers.
          </p>
        </div>
        <div className="bg-slate-950/80 border border-amber-800/80 rounded-2xl p-6 text-center shadow-inner min-w-[200px]">
          <Coins className="w-8 h-8 text-amber-400 mx-auto mb-2 animate-bounce" />
          <span className="text-xs text-slate-400 block uppercase tracking-wider">Available Balance</span>
          <span className="text-3xl font-black text-amber-300 mt-1 block">{credits} Credits</span>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-4">Transaction History</h2>

        {loading ? (
          <div className="text-center py-10 text-slate-400">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-10 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
            <p className="text-slate-400 text-sm">No credit transactions recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${tx.type === 'EARNED' || tx.type === 'WELCOME' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {tx.type === 'EARNED' || tx.type === 'WELCOME' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-semibold">{tx.description}</h3>
                    <span className="text-[10px] text-slate-500">{new Date(tx.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <span className={`text-sm font-bold ${tx.type === 'EARNED' || tx.type === 'WELCOME' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {tx.type === 'EARNED' || tx.type === 'WELCOME' ? `+${tx.amount}` : `-${tx.amount}`} Credits
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
