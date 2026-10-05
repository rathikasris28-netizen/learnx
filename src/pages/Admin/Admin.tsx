import React, { useEffect, useState } from 'react';
import { learnxApi } from '../../services/learnx';
import { Shield, Users, Video, AlertTriangle, Loader2 } from 'lucide-react';

export const Admin: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    learnxApi.getAdminStats()
      .then((data) => setStats(data))
      .catch((err) => console.error('Error fetching admin stats:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Loading admin portal...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admin Portal</h1>
          <p className="text-sm text-slate-500">Platform statistics and administrative moderation.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Users</span>
          <div className="text-3xl font-extrabold text-slate-900">{stats?.totalUsers || 0}</div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sessions</span>
          <div className="text-3xl font-extrabold text-slate-900">{stats?.totalSessions || 0}</div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">User Reports</span>
          <div className="text-3xl font-extrabold text-slate-900">{stats?.totalReports || 0}</div>
        </div>
      </div>
    </div>
  );
};
