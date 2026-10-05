import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { learnxApi } from '../../services/learnx';
import { Coins, BookOpen, Share2, Video, CheckCircle2, Bell, Award, ArrowRight, Loader2, Star } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    learnxApi.getDashboardSummary()
      .then((data) => setSummary(data))
      .catch((err) => {
        console.error('Error loading dashboard summary:', err);
        setError('Failed to load real dashboard summary.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Loading your real dashboard...</p>
      </div>
    );
  }

  const stats = [
    {
      title: 'Time Credits',
      value: summary?.credit_balance ?? 0,
      icon: Coins,
      color: 'bg-amber-50 text-amber-600 border-amber-200',
      actionText: 'View balance',
      onClick: () => navigate('/dashboard'),
    },
    {
      title: 'Learn Skills',
      value: summary?.learn_skills_count ?? 0,
      icon: BookOpen,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      actionText: 'Find skill to learn',
      onClick: () => navigate('/learn'),
    },
    {
      title: 'Share Skills',
      value: summary?.share_skills_count ?? 0,
      icon: Share2,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      actionText: 'Manage share skills',
      onClick: () => navigate('/share'),
    },
    {
      title: 'Active Sessions',
      value: summary?.active_sessions_count ?? 0,
      icon: Video,
      color: 'bg-violet-50 text-violet-600 border-violet-200',
      actionText: 'View sessions',
      onClick: () => navigate('/sessions'),
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/10 skew-x-12 pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="bg-indigo-500/50 text-indigo-100 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            {profile?.preferred_language || 'English'} Peer Exchange
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Welcome back, {profile?.full_name || 'Learner'}!
          </h1>
          <p className="text-indigo-100 text-sm leading-relaxed">
            Give What You Know. Learn What You Need. Grow Together with verified peer sessions and Time Credits.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/learn')}
              className="px-5 py-2.5 bg-white text-indigo-700 font-semibold rounded-xl text-sm shadow-md hover:bg-indigo-50 transition-all flex items-center space-x-2"
            >
              <span>Find a Skill to Learn</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/matches')}
              className="px-5 py-2.5 bg-indigo-500/40 hover:bg-indigo-500/60 text-white font-semibold rounded-xl text-sm border border-indigo-400/30 transition-all"
            >
              View AI Matches
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              onClick={stat.onClick}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.title}</span>
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {stat.value}
                </div>
                <div className="text-xs font-medium text-slate-500 mt-1 flex items-center space-x-1">
                  <span>{stat.actionText}</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Summary & Trust Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => navigate('/learn')}
              className="p-5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer space-y-2"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Create Learning Request</h3>
              <p className="text-xs text-slate-500">Specify what you want to learn and find expert matches instantly.</p>
            </div>

            <div
              onClick={() => navigate('/sessions')}
              className="p-5 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 transition-all cursor-pointer space-y-2"
            >
              <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center font-bold">
                <Video className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Upcoming Sessions</h3>
              <p className="text-xs text-slate-500">Join your scheduled live learning sessions and complete milestones.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Your Trust Score</h2>
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-extrabold text-slate-900">{summary?.trust_score ?? '5.0'}</span>
              <span className="text-sm font-medium text-slate-500">/ 5.0</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Trust score is calculated securely based on completed sessions, peer reviews, and reliability.
            </p>
          </div>

          <button
            onClick={() => navigate('/profile')}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-all"
          >
            View Full Profile
          </button>
        </div>
      </div>
    </div>
  );
};
