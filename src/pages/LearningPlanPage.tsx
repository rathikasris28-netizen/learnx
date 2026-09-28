import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Sparkles, CheckCircle2, Clock, Check } from 'lucide-react';
import { apiRequest } from '../lib/api';

export function LearningPlanPage({ navigate }: { navigate: (path: string) => void }) {
  const { user } = useAuth();
  const [skillName, setSkillName] = useState<string>(user?.learn_skills?.[0]?.name || 'Python');
  const [plan, setPlan] = useState<any>(null);
  const [completedActivities, setCompletedActivities] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const generatePlan = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/ai/learning-plan', {
        method: 'POST',
        body: JSON.stringify({ skill_name: skillName, level: 'BEGINNER' })
      });
      setPlan(data);
    } catch (err: any) {
      alert(err.message || 'Failed to generate learning plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generatePlan();
  }, [skillName]);

  const toggleActivity = (actId: string) => {
    setCompletedActivities(prev => ({
      ...prev,
      [actId]: !prev[actId]
    }));
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-cyan-400" />
            AI Learning Blueprint
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            A structured 4-week progressive curriculum tailored to your level and peer milestones.
          </p>
        </div>

        {/* Skill Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Skill:</span>
          <select
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none focus:border-cyan-500"
          >
            {user?.learn_skills?.map(s => (
              <option key={s.id} value={s.name}>{s.name}</option>
            )) || (
              <>
                <option value="Python">Python</option>
                <option value="Web Development">Web Development</option>
                <option value="English Speaking">English Speaking</option>
              </>
            )}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500">
          Generating structured 4-week pedagogical blueprint...
        </div>
      ) : plan ? (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">{plan.title}</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                4-week progressive blueprint with hands-on exercises and peer session goals.
              </p>
            </div>
            <button
              onClick={() => navigate(`/discover?search=${encodeURIComponent(skillName)}`)}
              className="px-4 py-2 rounded-xl bg-cyan-500 text-white font-semibold text-xs hover:bg-cyan-400"
            >
              Book Peer Practice
            </button>
          </div>

          <div className="space-y-4">
            {plan.weeks?.map((w: any) => (
              <div
                key={w.week}
                className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-xs">
                      W{w.week}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white">{w.title}</h3>
                      <p className="text-xs text-slate-400">{w.focus}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {w.activities?.map((act: any) => {
                    const isChecked = !!completedActivities[act.id];
                    return (
                      <div
                        key={act.id}
                        onClick={() => toggleActivity(act.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center gap-3 ${
                          isChecked
                            ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200 line-through opacity-80'
                            : 'border-slate-800/80 bg-slate-950/60 text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className={`h-4 w-4 rounded-md border flex items-center justify-center text-[10px] ${
                          isChecked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-700'
                        }`}>
                          {isChecked && '✓'}
                        </div>
                        <span>{act.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
