
import React, { useEffect, useState } from 'react';
import {
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { apiRequest } from '../lib/api';

interface WalletResponse {
  id?: string;
  userId?: string;
  balance?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface WalletTransaction {
  id: string;
  userId?: string;
  amount: number;
  transactionType?: string;
  transaction_type?: string;
  description?: string | null;
  sessionId?: string | null;
  session_id?: string | null;
  createdAt?: string;
  created_at?: string;
}

export function TimeWalletPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const [balance, setBalance] = useState<number>(0);
  const [totalEarned, setTotalEarned] = useState<number>(0);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [transactions, setTransactions] = useState<
    WalletTransaction[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWallet = async () => {
    setLoading(true);
    setError('');

    try {
      const [walletResponse, transactionResponse] =
        await Promise.all([
          apiRequest<WalletResponse>(
            '/time-wallet'
          ),
          apiRequest<WalletTransaction[]>(
            '/time-wallet/transactions'
          ),
        ]);

      const walletBalance = Number(
        walletResponse?.balance ?? 0
      );

      const transactionList = Array.isArray(
        transactionResponse
      )
        ? transactionResponse
        : [];

      /*
       * The backend currently records:
       *
       * ADJUSTMENT     -> learner welcome bonus
       * SESSION_EARN   -> verified knowledge sharing
       *
       * Positive SESSION_EARN amounts are earned
       * through verified knowledge sharing.
       *
       * Negative transactions, if created by the
       * backend later, are treated as utilized credits.
       */
      const earned = transactionList.reduce(
        (total, transaction) => {
          const type =
            transaction.transactionType ??
            transaction.transaction_type ??
            '';

          const amount = Number(
            transaction.amount ?? 0
          );

          if (
            type === 'SESSION_EARN' &&
            amount > 0
          ) {
            return total + amount;
          }

          return total;
        },
        0
      );

      const spent = transactionList.reduce(
        (total, transaction) => {
          const amount = Number(
            transaction.amount ?? 0
          );

          if (amount < 0) {
            return total + Math.abs(amount);
          }

          return total;
        },
        0
      );

      setBalance(walletBalance);
      setTotalEarned(earned);
      setTotalSpent(spent);
      setTransactions(transactionList);
    } catch (err: any) {
      setBalance(0);
      setTotalEarned(0);
      setTotalSpent(0);
      setTransactions([]);

      setError(
        err?.message ||
          'Unable to load your Time Credit wallet.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const getTransactionType = (
    transaction: WalletTransaction
  ) =>
    transaction.transactionType ??
    transaction.transaction_type ??
    'TRANSACTION';

  const getTransactionDate = (
    transaction: WalletTransaction
  ) =>
    transaction.createdAt ??
    transaction.created_at ??
    '';

  const getTransactionLabel = (
    transaction: WalletTransaction
  ) => {
    const type = getTransactionType(transaction);

    if (type === 'ADJUSTMENT') {
      return 'WELCOME BONUS';
    }

    if (type === 'SESSION_EARN') {
      return 'SESSION EARN';
    }

    if (
      type === 'SESSION_SPEND' ||
      type === 'SPEND' ||
      type === 'USED'
    ) {
      return 'USED';
    }

    return type.replace(/_/g, ' ');
  };

  const getTransactionClass = (
    transaction: WalletTransaction
  ) => {
    const type = getTransactionType(transaction);

    if (type === 'SESSION_EARN') {
      return 'bg-emerald-950 text-emerald-300 border border-emerald-800/40';
    }

    if (type === 'ADJUSTMENT') {
      return 'bg-cyan-950 text-cyan-300 border border-cyan-800/40';
    }

    if (
      type === 'SESSION_SPEND' ||
      type === 'SPEND' ||
      type === 'USED'
    ) {
      return 'bg-amber-950 text-amber-300 border border-amber-800/40';
    }

    return 'bg-slate-800 text-slate-300';
  };

  const formatDate = (
    transaction: WalletTransaction
  ) => {
    const dateValue =
      getTransactionDate(transaction);

    if (!dateValue) {
      return '—';
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk']">
          Time Credit Wallet
        </h1>

        <p className="text-xs text-slate-400 mt-1">
          View your LearnX Time Credits and
          server-verified transaction history.
        </p>
      </div>

      {/* Non-Monetary Principle */}
      <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-950/20 text-xs text-blue-300 space-y-1">
        <div className="flex items-center gap-2 font-bold text-white">
          <ShieldCheck className="h-4 w-4 text-blue-400" />

          <span>
            Core Rule: 1 Hour Verified Sharing = 1
            Time Credit
          </span>
        </div>

        <p className="text-slate-300 text-[11px] leading-relaxed">
          Time Credits are internal LearnX learning
          units with no cash value. They cannot be
          withdrawn, sold for money, or converted to
          currency.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-950/30 text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />

          <div>
            <p className="font-semibold">
              Wallet could not be loaded
            </p>

            <p className="mt-1 text-rose-300/80">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Available Balance */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Available Balance
            </span>

            <Coins className="h-4 w-4 text-cyan-400" />
          </div>

          <div className="text-3xl font-extrabold text-white font-['Space_Grotesk']">
            {loading ? '—' : balance}{' '}
            <span className="text-xs font-normal text-cyan-400">
              TC
            </span>
          </div>

          <p className="text-[11px] text-slate-400 mt-1">
            Available for LearnX learning sessions
          </p>
        </div>

        {/* Total Earned */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Earned
            </span>

            <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
          </div>

          <div className="text-3xl font-extrabold text-white font-['Space_Grotesk']">
            {loading ? '—' : `+${totalEarned}`}{' '}
            <span className="text-xs font-normal text-emerald-400">
              TC
            </span>
          </div>

          <p className="text-[11px] text-slate-400 mt-1">
            From verified knowledge-sharing sessions
          </p>
        </div>

        {/* Total Utilized */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Utilized
            </span>

            <ArrowUpRight className="h-4 w-4 text-amber-400" />
          </div>

          <div className="text-3xl font-extrabold text-white font-['Space_Grotesk']">
            {loading ? '—' : totalSpent}{' '}
            <span className="text-xs font-normal text-amber-400">
              TC
            </span>
          </div>

          <p className="text-[11px] text-slate-400 mt-1">
            Credits used for learning sessions
          </p>
        </div>
      </div>

      {/* Ledger */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white font-['Space_Grotesk']">
              Transaction Ledger
            </h2>

            <p className="text-[11px] text-slate-500 mt-1">
              Your Time Credit activity recorded by
              the LearnX backend.
            </p>
          </div>

          <button
            onClick={fetchWallet}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 text-[11px] font-semibold hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Loading Time Credit transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-6 space-y-2">
            <Coins className="h-8 w-8 text-slate-600 mx-auto" />

            <p className="text-xs text-slate-400">
              No Time Credit transactions have been
              recorded yet.
            </p>

            <p className="text-[11px] text-slate-500">
              New learners receive a one-time 5 TC
              welcome bonus. Knowledge sharers earn
              Time Credits after verified sessions.
            </p>

            <button
              onClick={() => navigate('/discover')}
              className="mt-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500"
            >
              Start Learning
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-[10px] text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-3">
                    Type
                  </th>

                  <th className="py-3 px-3">
                    Amount
                  </th>

                  <th className="py-3 px-3">
                    Description
                  </th>

                  <th className="py-3 px-3">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60">
                {transactions.map(
                  (transaction) => {
                    const amount = Number(
                      transaction.amount ?? 0
                    );

                    const type =
                      getTransactionType(
                        transaction
                      );

                    return (
                      <tr
                        key={transaction.id}
                        className="hover:bg-slate-950/40"
                      >
                        {/* Type */}
                        <td className="py-3 px-3 font-semibold">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${getTransactionClass(
                              transaction
                            )}`}
                          >
                            {getTransactionLabel(
                              transaction
                            )}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-3 font-bold text-white">
                          <span
                            className={
                              amount > 0
                                ? 'text-emerald-300'
                                : amount < 0
                                  ? 'text-amber-300'
                                  : 'text-slate-300'
                            }
                          >
                            {amount > 0
                              ? `+${amount}`
                              : amount}{' '}
                            TC
                          </span>
                        </td>

                        {/* Description */}
                        <td className="py-3 px-3 text-slate-200">
                          {transaction.description ||
                            (type ===
                            'SESSION_EARN'
                              ? 'Verified knowledge-sharing session'
                              : type ===
                                'ADJUSTMENT'
                                ? 'Welcome bonus'
                                : 'Time Credit transaction')}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                          {formatDate(
                            transaction
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rule Explanation */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40">
        <h3 className="text-xs font-bold text-white mb-2">
          How Time Credits Work
        </h3>

        <div className="space-y-2 text-[11px] text-slate-400 leading-relaxed">
          <p>
            <span className="text-blue-300 font-semibold">
              Learner:
            </span>{' '}
            receives 5 Time Credits as a one-time
            welcome bonus after registration.
          </p>

          <p>
            <span className="text-emerald-300 font-semibold">
              Knowledge Sharer:
            </span>{' '}
            starts with 0 Time Credits and earns
            credits through verified knowledge-sharing
            sessions.
          </p>

          <p>
            <span className="text-white font-semibold">
              Verification:
            </span>{' '}
            session credits are awarded only after both
            participants confirm completion.
          </p>

          <p>
            <span className="text-amber-300 font-semibold">
              Non-monetary:
            </span>{' '}
            Time Credits are internal LearnX learning
            units and have no cash or currency value.
          </p>
        </div>
      </div>
    </div>
  );
}