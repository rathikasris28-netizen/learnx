import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Briefcase, Loader2, ExternalLink } from 'lucide-react';

export const Partners: React.FC = () => {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('partner_programs')
      .select('*, partners(name, logo_url)')
      .then(({ data }) => {
        if (data) setPrograms(data);
      })
      .catch((err) => console.error('Error fetching partner programs:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Loading partner programs...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Partner Programs & Bootcamps</h1>
        <p className="text-sm text-slate-500">Explore exclusive learning tracks and bootcamps from LearnX partner organizations.</p>
      </div>

      {programs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center space-y-3 border border-slate-200">
          <Briefcase className="w-12 h-12 text-slate-400 mx-auto" />
          <p className="text-slate-700 font-bold">No partner programs available right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {programs.map((prog) => (
            <div key={prog.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{prog.partners?.name || 'Partner'}</span>
                <h3 className="font-bold text-slate-900 text-lg">{prog.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{prog.description}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-600">
                <span>Duration: {prog.duration || 'Flexible'}</span>
                <button className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl transition-all flex items-center space-x-1">
                  <span>Enroll</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
