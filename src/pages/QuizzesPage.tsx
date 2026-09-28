import React, { useState, useEffect } from 'react';
import { Award, Clock, ArrowRight, CheckCircle2, HelpCircle } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Quiz } from '../types';

export function QuizzesPage({ navigate }: { navigate: (path: string) => void }) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/quizzes').then((res) => {
      setQuizzes(res.quizzes || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
          <Award className="h-6 w-6 text-amber-400" />
          Skill Assessments & Quizzes
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Validate your knowledge, diagnose weak topics, and earn SkillProof verification badges.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">
          Loading assessments from catalog...
        </div>
      ) : quizzes.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8">
          <p className="text-xs text-slate-400">No quizzes currently published.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map((q) => (
            <div
              key={q.id}
              className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 shadow-sm"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">
                    {q.skill_name}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="h-3 w-3" /> {q.time_limit_minutes} min
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white leading-snug">
                  {q.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {q.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Passing: <strong className="text-white">{q.passing_score}%</strong> · {q.total_questions || 4} questions
                </span>
                <button
                  onClick={() => navigate(`/quizzes/${q.id}`)}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow-sm hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center gap-1.5"
                >
                  <span>Start Quiz</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
