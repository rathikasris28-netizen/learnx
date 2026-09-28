import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Award, Zap, Compass, Flame, HeartHandshake, Star, Coins, CheckCircle2, Lock } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Achievement } from '../types';

export function AchievementsPage({ navigate }: { navigate: (path: string) => void }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/achievements').then((res) => {
      setAchievements(res.achievements || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap': return <Zap className="h-6 w-6 text-yellow-400" />;
      case 'Compass': return <Compass className="h-6 w-6 text-cyan-400" />;
      case 'Flame': return <Flame className="h-6 w-6 text-rose-500" />;
      case 'HeartHandshake': return <HeartHandshake className="h-6 w-6 text-emerald-400" />;
      case 'Award': return <Award className="h-6 w-6 text-purple-400" />;
      case 'Star': return <Star className="h-6 w-6 text-amber-400" />;
      case 'Coins': return <Coins className="h-6 w-6 text-cyan-400" />;
      default: return <CheckCircle2 className="h-6 w-6 text-blue-400" />;
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
          <Award className="h-6 w-6 text-amber-400" />
          Platform Achievements & Milestones
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Awarded strictly based on verified sessions, attendance, and knowledge sharing contributions.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">
          Loading platform achievements...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={`p-5 rounded-2xl border transition-all ${
                a.unlocked
                  ? 'border-cyan-500/40 bg-gradient-to-b from-cyan-950/30 to-slate-900/60 shadow-lg'
                  : 'border-slate-800 bg-slate-950/40 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl border ${
                  a.unlocked ? 'border-cyan-500/30 bg-cyan-950/40' : 'border-slate-800 bg-slate-900'
                }`}>
                  {getIcon(a.icon)}
                </div>
                {a.unlocked ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800/40 text-[10px] text-emerald-300 font-bold">
                    UNLOCKED
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Lock className="h-3 w-3" /> Locked
                  </span>
                )}
              </div>

              <h3 className="text-sm font-bold text-white mb-1">
                {a.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {a.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
