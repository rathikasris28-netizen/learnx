import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Users, Calendar, Coins, Star, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../lib/api';

export function AdminDashboardPage({ navigate }: { navigate: (path: string) => void }) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [popularSkills, setPopularSkills] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAdminData() {
      try {
        setLoading(true);
        const [analyticsRes, usersRes] = await Promise.all([
          apiRequest('/admin/analytics'),
          apiRequest('/admin/users')
        ]);
        setMetrics(analyticsRes.metrics);
        setPopularSkills(analyticsRes.popular_skills || []);
        setUsersList(usersRes.users || []);
      } catch (err: any) {
        // Not admin or access denied
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, []);

  if (user?.role !== 'ADMIN') {
    return (
      <div className="py-24 text-center space-y-3">
        <ShieldCheck className="h-10 w-10 text-rose-400 mx-auto" />
        <h2 className="text-base font-bold text-white">Administrative Access Required</h2>
        <p className="text-xs text-slate-400">Your account does not possess platform administrator privileges.</p>
        <button onClick={() => navigate('/dashboard')} className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs font-semibold mb-2">
          <ShieldCheck className="h-3.5 w-3.5 text-rose-400" />
          <span>Platform Administrator Console</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk']">
          Real-Time Operational Analytics
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Direct database queries tracking real user engagement, sessions, and Time Credit velocity.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">
          Querying PostgreSQL and SQLite tables...
        </div>
      ) : metrics ? (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-md">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Total Users
              </span>
              <div className="text-2xl font-bold text-white font-['Space_Grotesk']">
                {metrics.total_users}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {metrics.active_learners} Learners · {metrics.active_sharers} Sharers
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-md">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Total Sessions
              </span>
              <div className="text-2xl font-bold text-white font-['Space_Grotesk']">
                {metrics.total_sessions}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {metrics.completed_sessions} completed ({metrics.total_learning_hours} hrs)
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-md">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Credits Exchanged
              </span>
              <div className="text-2xl font-bold text-cyan-400 font-['Space_Grotesk']">
                {metrics.credits_exchanged} <span className="text-xs text-slate-400">TC</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                1 Hour Sharing = 1 TC
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-md">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Average Rating
              </span>
              <div className="text-2xl font-bold text-amber-400 font-['Space_Grotesk'] flex items-center gap-1">
                <Star className="h-5 w-5 fill-current" />
                <span>{metrics.average_rating}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {metrics.pending_reports} pending reports
              </p>
            </div>
          </div>

          {/* User Management Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
            <h2 className="text-base font-bold text-white font-['Space_Grotesk']">
              Registered Accounts ({usersList.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 text-[10px] text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-3">Name</th>
                    <th className="py-3 px-3">Email</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Language</th>
                    <th className="py-3 px-3">Trust</th>
                    <th className="py-3 px-3">Wallet</th>
                    <th className="py-3 px-3">Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-950/40">
                      <td className="py-3 px-3 font-bold text-white">{u.full_name}</td>
                      <td className="py-3 px-3 text-slate-300">{u.email}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'ADMIN' ? 'bg-rose-950 text-rose-300 border border-rose-800/40' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">{u.preferred_language}</td>
                      <td className="py-3 px-3 text-purple-400 font-semibold">{u.trust_score}%</td>
                      <td className="py-3 px-3 font-semibold text-cyan-400">{u.wallet_balance} TC</td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-400 font-semibold text-[10px]">
                          {u.is_email_verified ? '✓ Verified' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
