import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Share2, Plus, Loader2, Coins } from 'lucide-react';

export const Share: React.FC = () => {
  const { user } = useAuth();
  const [shareSkills, setShareSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_skills')
      .select('*, skills(name, category)')
      .eq('user_id', user.id)
      .eq('skill_type', 'SHARE')
      .then(({ data }) => {
        if (data) setShareSkills(data);
      })
      .catch((err) => console.error('Error fetching share skills:', err))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Loading your sharing catalog...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Share Your Knowledge</h1>
          <p className="text-sm text-slate-500">Teach what you know and earn Time Credits (+1 credit per verified hour).</p>
        </div>
        <div className="flex items-center space-x-1.5 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-amber-800 font-bold text-sm">
          <Coins className="w-4 h-4 text-amber-600" />
          <span>1 Hour Sharing = +1 Time Credit</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
          <Share2 className="w-5 h-5 text-indigo-600" />
          <span>Your Teaching Skills</span>
        </h2>

        {shareSkills.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">No sharing skills listed yet. Complete onboarding or update your profile.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shareSkills.map((item) => (
              <div key={item.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{item.skills?.name || 'Skill'}</span>
                  <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {item.skill_level}
                  </span>
                </div>
                <p className="text-xs text-slate-500">Category: {item.skills?.category || 'General'}</p>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
                  <span>Status: Active</span>
                  <span className="font-bold text-indigo-600">+1 Credit / Hr</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
