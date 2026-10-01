
import React, { useEffect, useState } from 'react';
import {
  Award,
  Clock,
  ArrowRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { apiRequest } from '../lib/api';

interface QuizQuestion {
  id: string;
  question_text?: string;
  questionText?: string;
}

interface QuizItem {
  id: string;
  title: string;
  description?: string | null;
  time_limit_minutes?: number;
  timeLimitMinutes?: number;
  passing_score?: number;
  passingScore?: number;
  skill_name?: string;
  skill?: {
    id: string;
    name: string;
    category?: string;
  } | null;
  questions?: QuizQuestion[];
}

export function QuizzesPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadQuizzes = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiRequest<
        QuizItem[] | { quizzes?: QuizItem[] }
      >('/quizzes');

      const quizList = Array.isArray(response)
        ? response
        : Array.isArray(response?.quizzes)
          ? response.quizzes
          : [];

      setQuizzes(quizList);
    } catch (err: any) {
      setQuizzes([]);
      setError(
        err.message || 'Failed to load assessments.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQuizzes();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
          <Award className="h-6 w-6 text-amber-400" />
          Skill Assessments & Quizzes
        </h1>

        <p className="text-xs text-slate-400 mt-1">
          Validate your knowledge and measure your current
          skill level through assessments.
        </p>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-800/50 bg-rose-950/30 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>

          <button
            onClick={() => void loadQuizzes()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">
          Loading assessments from catalog...
        </div>
      ) : quizzes.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8">
          <Award className="h-8 w-8 text-slate-600 mx-auto mb-3" />

          <p className="text-xs text-slate-400">
            No quizzes currently published.
          </p>

          {!error && (
            <p className="text-[11px] text-slate-600 mt-1">
              Published skill assessments will appear here.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map((quiz) => {
            const skillName =
              quiz.skill_name ||
              quiz.skill?.name ||
              'Skill Assessment';

            const duration =
              Number(
                quiz.time_limit_minutes ??
                  quiz.timeLimitMinutes ??
                  15
              ) || 15;

            const passingScore =
              Number(
                quiz.passing_score ??
                  quiz.passingScore ??
                  70
              ) || 70;

            const questionCount =
              Array.isArray(quiz.questions)
                ? quiz.questions.length
                : 0;

            return (
              <div
                key={quiz.id}
                className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">
                      {skillName}
                    </span>

                    <span className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                      <Clock className="h-3 w-3" />
                      {duration} min
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white leading-snug">
                    {quiz.title}
                  </h3>

                  {quiz.description && (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {quiz.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400">
                    Passing:{' '}
                    <strong className="text-white">
                      {passingScore}%
                    </strong>

                    {questionCount > 0 && (
                      <>
                        {' '}
                        · {questionCount}{' '}
                        {questionCount === 1
                          ? 'question'
                          : 'questions'}
                      </>
                    )}
                  </span>

                  <button
                    onClick={() =>
                      navigate(`/quizzes/${quiz.id}`)
                    }
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow-sm hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <span>Start Quiz</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
