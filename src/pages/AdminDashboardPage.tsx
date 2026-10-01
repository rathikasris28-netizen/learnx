import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Star,
  RefreshCw,
} from 'lucide-react';
import { apiRequest } from '../lib/api';

interface AdminMetrics {
  total_users?: number;
  active_learners?: number;
  active_sharers?: number;
  total_sessions?: number;
  completed_sessions?: number;
  total_learning_hours?: number;
  credits_exchanged?: number;
  average_rating?: number;
  pending_reports?: number;
}

interface AdminUser {
  id: string;
  full_name?: string;
  email?: string;
  role?: string;
  preferred_language?: string;
  trust_score?: number;
  wallet_balance?: number;
  is_email_verified?: boolean;
}

interface AnalyticsResponse {
  metrics?: AdminMetrics;
  popular_skills?: unknown[];
}

interface UsersResponse {
  users?: AdminUser[];
}

export function AdminDashboardPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const { user } = useAuth();

  const [metrics, setMetrics] =
    useState<AdminMetrics | null>(null);

  const [popularSkills, setPopularSkills] =
    useState<unknown[]>([]);

  const [usersList, setUsersList] =
    useState<AdminUser[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const loadAdminData = async () => {
    setLoading(true);
    setError('');

    try {
      const [analyticsResponse, usersResponse] =
        await Promise.all([
          apiRequest<AnalyticsResponse>(
            '/admin/analytics'
          ),
          apiRequest<UsersResponse>(
            '/admin/users'
          ),
        ]);

      setMetrics(
        analyticsResponse?.metrics ?? null
      );

      setPopularSkills(
        Array.isArray(
          analyticsResponse?.popular_skills
        )
          ? analyticsResponse.popular_skills
          : []
      );

      setUsersList(
        Array.isArray(usersResponse?.users)
          ? usersResponse.users
          : []
      );
    } catch (err: any) {
      setMetrics(null);
      setPopularSkills([]);
      setUsersList([]);

      setError(
        err?.message ||
          'Unable to load administrator data.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadAdminData();
    } else {
      setLoading(false);
    }
  }, [user?.role]);

  if (user?.role !== 'ADMIN') {
    return (
      <div className="py-24 text-center space-y-3">
        <ShieldCheck className="h-10 w-10 text-rose-400 mx-auto" />

        <h2 className="text-base font-bold text-white">
          Administrative Access Required
        </h2>

        <p className="text-xs text-slate-400">
          Your account does not possess platform
          administrator privileges.
        </p>

        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs font-semibold mb-2">
          <ShieldCheck className="h-3.5 w-3.5 text-rose-400" />

          <span>
            Platform Administrator Console
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk']">
              Real-Time Operational Analytics
            </h1>

            <p className="text-xs text-slate-400 mt-1">
              Live platform data covering users,
              sessions, Time Credits, ratings, and
              account verification.
            </p>
          </div>

          <button
            type="button"
            onClick={loadAdminData}
            disabled={loading}
            className="self-start sm:self-auto px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                loading ? 'animate-spin' : ''
              }`}
            />

            Refresh
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-16 text-center text-xs text-slate-500">
          Loading administrator analytics...
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-950/20">
          <p className="text-sm font-semibold text-rose-300">
            Unable to load administrator data
          </p>

          <p className="text-xs text-rose-300/70 mt-1">
            {error}
          </p>

          <button
            type="button"
            onClick={loadAdminData}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Analytics */}
      {!loading &&
        !error &&
        metrics && (
          <>
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Total Users */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-md">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Total Users
                </span>

                <div className="text-2xl font-bold text-white font-['Space_Grotesk']">
                  {metrics.total_users ?? 0}
                </div>

                <p className="text-[10px] text-slate-500 mt-0.5">
                  {metrics.active_learners ?? 0}{' '}
                  Learners ·{' '}
                  {metrics.active_sharers ?? 0}{' '}
                  Sharers
                </p>
              </div>

              {/* Total Sessions */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-md">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Total Sessions
                </span>

                <div className="text-2xl font-bold text-white font-['Space_Grotesk']">
                  {metrics.total_sessions ?? 0}
                </div>

                <p className="text-[10px] text-slate-500 mt-0.5">
                  {metrics.completed_sessions ?? 0}{' '}
                  completed (
                  {metrics.total_learning_hours ?? 0}{' '}
                  hrs)
                </p>
              </div>

              {/* Credits Exchanged */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-md">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Credits Exchanged
                </span>

                <div className="text-2xl font-bold text-cyan-400 font-['Space_Grotesk']">
                  {metrics.credits_exchanged ?? 0}{' '}
                  <span className="text-xs text-slate-400">
                    TC
                  </span>
                </div>

                <p className="text-[10px] text-slate-500 mt-0.5">
                  1 Hour Sharing = 1 TC
                </p>
              </div>

              {/* Average Rating */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-md">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Average Rating
                </span>

                <div className="text-2xl font-bold text-amber-400 font-['Space_Grotesk'] flex items-center gap-1">
                  <Star className="h-5 w-5 fill-current" />

                  <span>
                    {metrics.average_rating ?? 0}
                  </span>
                </div>

                <p className="text-[10px] text-slate-500 mt-0.5">
                  {metrics.pending_reports ?? 0}{' '}
                  pending reports
                </p>
              </div>
            </div>

            {/* User Management */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h2 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Registered Accounts (
                  {usersList.length})
                </h2>

                <span className="text-[10px] text-slate-500">
                  Real registered platform accounts
                </span>
              </div>

              {usersList.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No registered accounts found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="border-b border-slate-800 text-[10px] text-slate-400 uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-3">
                          Name
                        </th>

                        <th className="py-3 px-3">
                          Email
                        </th>

                        <th className="py-3 px-3">
                          Role
                        </th>

                        <th className="py-3 px-3">
                          Language
                        </th>

                        <th className="py-3 px-3">
                          Trust
                        </th>

                        <th className="py-3 px-3">
                          Wallet
                        </th>

                        <th className="py-3 px-3">
                          Verified
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-800/60">
                      {usersList.map((account) => (
                        <tr
                          key={account.id}
                          className="hover:bg-slate-950/40"
                        >
                          <td className="py-3 px-3 font-bold text-white">
                            {account.full_name ||
                              '—'}
                          </td>

                          <td className="py-3 px-3 text-slate-300">
                            {account.email || '—'}
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                account.role ===
                                'ADMIN'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800/40'
                                  : account.role ===
                                    'KNOWLEDGE_SHARER'
                                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/40'
                                    : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {account.role ===
                              'KNOWLEDGE_SHARER'
                                ? 'Knowledge Sharer'
                                : account.role ||
                                  '—'}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-slate-400">
                            {account.preferred_language ||
                              '—'}
                          </td>

                          <td className="py-3 px-3 text-purple-400 font-semibold">
                            {typeof account.trust_score ===
                            'number'
                              ? `${account.trust_score}%`
                              : '—'}
                          </td>

                          <td className="py-3 px-3 font-semibold text-cyan-400">
                            {typeof account.wallet_balance ===
                            'number'
                              ? `${account.wallet_balance} TC`
                              : '—'}
                          </td>

                          <td className="py-3 px-3">
                            {account.is_email_verified ? (
                              <span className="text-emerald-400 font-semibold text-[10px]">
                                ✓ Verified
                              </span>
                            ) : (
                              <span className="text-amber-400 font-semibold text-[10px]">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Popular Skills */}
            {popularSkills.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                <h2 className="text-base font-bold text-white font-['Space_Grotesk'] mb-4">
                  Popular Skills
                </h2>

                <div className="flex flex-wrap gap-2">
                  {popularSkills.map(
                    (skill, index) => {
                      const skillItem =
                        skill as Record<
                          string,
                          unknown
                        >;

                      const name =
                        typeof skillItem.name ===
                        'string'
                          ? skillItem.name
                          : typeof skillItem.skill_name ===
                              'string'
                            ? skillItem.skill_name
                            : `Skill ${index + 1}`;

                      return (
                        <span
                          key={
                            typeof skillItem.id ===
                            'string'
                              ? skillItem.id
                              : `${name}-${index}`
                          }
                          className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-950/50 text-xs text-slate-300"
                        >
                          {name}
                        </span>
                      );
                    }
                  )}
                </div>
              </div>
            )}
          </>
        )}

      {/* No analytics data */}
      {!loading &&
        !error &&
        !metrics && (
          <div className="py-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40">
            <ShieldCheck className="h-10 w-10 text-slate-600 mx-auto mb-3" />

            <h2 className="text-sm font-bold text-white">
              No analytics data available
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              The administrator analytics endpoint did
              not return platform metrics.
            </p>
          </div>
        )}
    </div>
  );
}