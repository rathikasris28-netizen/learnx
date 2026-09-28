import React, { useState, useEffect } from 'react';
import { GraduationCap, Calendar, Users, Globe, Coins, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function BootcampsPage({ navigate }: { navigate: (path: string) => void }) {
  const { user } = useAuth();
  const [bootcamps, setBootcamps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBootcamp, setSelectedBootcamp] = useState<any>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchBootcamps = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/bootcamps');
      setBootcamps(res.bootcamps || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load bootcamps.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBootcamps();
  }, []);

  const handleEnroll = async (bootcampId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setError('');
    setSuccess('');
    setEnrolling(true);
    try {
      await apiRequest(`/v1/bootcamps/${bootcampId}/enroll`, { method: 'POST' });
      setSuccess('Successfully enrolled in bootcamp! Check your Time Wallet and Learning Plan.');
      fetchBootcamps();
      setTimeout(() => setSelectedBootcamp(null), 1500);
    } catch (err: any) {
      setError(err.message || 'Enrollment failed.');
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Space_Grotesk'] tracking-tight flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-blue-600" />
            Intensive Partner Bootcamps
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Join cohort-based immersive technical bootcamps led by top institutional partners and expert instructors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/courses')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            Browse Partner Courses
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">Loading active bootcamps...</div>
      ) : bootcamps.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <GraduationCap className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No active bootcamps right now</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">Check back soon for upcoming cohort bootcamps published by our institutional partners.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bootcamps.map((bc) => (
            <div key={bc.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold uppercase tracking-wider border border-blue-100">
                    {bc.mode || 'ONLINE'} Bootcamp
                  </span>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                    <Coins className="h-3.5 w-3.5 text-blue-600" />
                    <span>{bc.time_credit_cost || 0} TC</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 font-['Space_Grotesk']">{bc.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{bc.description}</p>

                <div className="space-y-1.5 pt-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-blue-600" />
                    <span>Starts: {new Date(bc.start_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-blue-600" />
                    <span>Duration: {bc.duration}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedBootcamp(bc)}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-md hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
              >
                <span>View Details & Enroll</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bootcamp Detail Modal */}
      {selectedBootcamp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold uppercase tracking-wider">
                Bootcamp Details
              </span>
              <button onClick={() => setSelectedBootcamp(null)} className="text-slate-400 hover:text-slate-700 text-sm font-bold">✕</button>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 font-['Space_Grotesk']">{selectedBootcamp.title}</h2>
              <p className="text-xs text-slate-600 leading-relaxed">{selectedBootcamp.description}</p>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Start Date</span>
                  <span className="font-semibold text-slate-900">{new Date(selectedBootcamp.start_date).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">End Date</span>
                  <span className="font-semibold text-slate-900">{new Date(selectedBootcamp.end_date).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Duration & Mode</span>
                  <span className="font-semibold text-slate-900">{selectedBootcamp.duration} · {selectedBootcamp.mode}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Time Credit Cost</span>
                  <span className="font-semibold text-blue-600">{selectedBootcamp.time_credit_cost || 0} Time Credits</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedBootcamp(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleEnroll(selectedBootcamp.id)}
                disabled={enrolling}
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-md hover:bg-blue-500 transition-all flex items-center gap-2"
              >
                <span>{enrolling ? 'Enrolling...' : `Enroll Now (${selectedBootcamp.time_credit_cost || 0} TC)`}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
