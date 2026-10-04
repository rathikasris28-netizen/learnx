import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { TrendingUp, Award, BookOpen, Loader2 } from 'lucide-react';

export const Progress: React.FC = () => {
  const { user } = useAuth();
  const [progressList, setProgressList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('learning_progress')
      .select('*, skills(name, category)')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setProgressList(data);
      })
      .catch((err) => console.error('Error fetching progress:', err))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Loading learning progress...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Learning Progress</h1>
        <p className="text-sm text-slate-500">Track your skill development milestones, learning hours, and completion rates.</p>
      </div>

      {progressList.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center space-y-3 border border-slate-200">
          <TrendingUp className="w-12 h-12 text-slate-400 mx-auto" />
          <p className="text-slate-700 font-bold">No progress recorded yet.</p>
          <p className="text-xs text-slate-500">Start learning and completing sessions to track your real progress.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {progressList.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-base">{item.skills?.name || 'Skill Milestone'}</span>
                <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">
                  {item.current_level}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                  <span>Progress</span>
                  <span>{item.progress_percentage || 0}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-600 to-violet-600 h-full rounded-full"
                    style={{ width: `${item.progress_percentage || 0}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Completed Sessions: {item.completed_sessions || 0}</span>
                <span>Minutes: {item.learning_minutes || 0}m</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
