import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Trophy, Loader2 } from 'lucide-react';

export const Achievements: React.FC = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_achievements')
      .select('*, achievements(*)')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setAchievements(data);
      })
      .catch((err) => console.error('Error fetching achievements:', err))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Loading achievements...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Achievements & Badges</h1>
        <p className="text-sm text-slate-500">Badges earned through active participation and knowledge sharing.</p>
      </div>

      {achievements.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center space-y-3 border border-slate-200">
          <Trophy className="w-12 h-12 text-slate-400 mx-auto" />
          <p className="text-slate-700 font-bold">No achievements earned yet.</p>
          <p className="text-xs text-slate-500">Complete learning sessions to unlock badges.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {achievements.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3 flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">{item.achievements?.title || 'Achievement'}</h3>
                <p className="text-xs text-slate-500">{item.achievements?.description || 'Unlocked badge'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
