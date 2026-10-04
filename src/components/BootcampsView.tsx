import React, { useState, useEffect } from 'react';
import { Award, Calendar, Users, CheckCircle, ArrowRight } from 'lucide-react';

interface BootcampsViewProps {
  user: any;
}

export default function BootcampsView({ user }: BootcampsViewProps) {
  const [bootcamps, setBootcamps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBootcamps = async () => {
    try {
      const res = await fetch('/api/bootcamps');
      const data = await res.json();
      if (Array.isArray(data)) setBootcamps(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBootcamps();
  }, []);

  const handleJoin = async (id: number) => {
    try {
      const res = await fetch(`/api/bootcamps/${id}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('learnx_token')}` }
      });
      if (res.ok) {
        loadBootcamps();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-xs font-semibold mb-4 border border-purple-500/30">
            <Award className="w-3.5 h-3.5" /> Intensive Programs
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Live Bootcamps</h1>
          <p className="text-slate-300 mt-2 text-sm">
            Join intensive multi-week live bootcamps led by top mentors. Master full-stack web dev, AI, and creative arts.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading bootcamps...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bootcamps.map((b) => (
            <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs bg-purple-950 text-purple-300 border border-purple-800 px-2.5 py-1 rounded-full font-semibold">
                    {b.category}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {b.participants_count} Enrolled
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{b.title}</h3>
                <p className="text-slate-300 text-sm mb-4">{b.description}</p>

                <div className="flex items-center gap-4 text-xs text-slate-400 mb-4 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" /> Start: {b.start_date}
                  </span>
                  <span>•</span>
                  <span>End: {b.end_date}</span>
                </div>

                <div className="space-y-2 mb-6">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Curriculum:</span>
                  {b.lessons?.map((l: any, i: number) => (
                    <div key={i} className="text-xs bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-slate-300">
                      Week {l.week}: {l.topic}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleJoin(b.id)}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl text-sm font-semibold transition shadow-md flex items-center justify-center gap-2"
              >
                Join Bootcamp <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
