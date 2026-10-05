import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Award, Loader2 } from 'lucide-react';

export const Certificates: React.FC = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('certificates')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setCertificates(data);
      })
      .catch((err) => console.error('Error fetching certificates:', err))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Loading certificates...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Your Certificates</h1>
        <p className="text-sm text-slate-500">Official certificates earned through LearnX skill completions and partner programs.</p>
      </div>

      {certificates.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center space-y-3 border border-slate-200">
          <Award className="w-12 h-12 text-slate-400 mx-auto" />
          <p className="text-slate-700 font-bold">No certificates earned yet.</p>
          <p className="text-xs text-slate-500">Complete learning paths and quizzes to earn verified certificates.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => (
            <div key={cert.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{cert.title || 'Certificate of Completion'}</h3>
                  <p className="text-xs text-slate-500">Issued: {new Date(cert.created_at || cert.issued_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
