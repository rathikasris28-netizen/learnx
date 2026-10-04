import React, { useEffect, useState } from 'react';
import { learnxApi } from '../../services/learnx';
import { HelpCircle, CheckCircle2, Loader2, Award } from 'lucide-react';

export const Quizzes: React.FC = () => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    learnxApi.getQuizzes()
      .then((data) => setQuizzes(data))
      .catch((err) => console.error('Error fetching quizzes:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuiz) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await learnxApi.submitQuizAttempt(selectedQuiz.id, answers, 120);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to submit quiz attempt.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Loading quizzes...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Skill Assessments & Quizzes</h1>
        <p className="text-sm text-slate-500">Test your knowledge and earn verified SkillProofs and certificates.</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl font-medium">
          {error}
        </div>
      )}

      {selectedQuiz ? (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{selectedQuiz.title}</h2>
              <p className="text-xs text-slate-500">{selectedQuiz.description}</p>
            </div>
            <button
              onClick={() => {
                setSelectedQuiz(null);
                setResult(null);
                setAnswers({});
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
            >
              Back to Quizzes
            </button>
          </div>

          {result ? (
            <div className="p-8 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4">
              <Award className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-xl font-extrabold text-emerald-900">Quiz Submitted Successfully!</h3>
              <p className="text-sm text-emerald-700">Your score has been securely calculated by the database RPC.</p>
              <div className="text-2xl font-black text-emerald-800">
                Score: {result.score ?? result.percentage ?? 'Passed'}
              </div>
              <button
                onClick={() => {
                  setSelectedQuiz(null);
                  setResult(null);
                  setAnswers({});
                }}
                className="px-6 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl text-sm"
              >
                Back to Quizzes
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitQuiz} className="space-y-6">
              {selectedQuiz.questions?.map((q: any, idx: number) => (
                <div key={idx} className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-800 text-sm">
                    {idx + 1}. {q.question || q.text}
                  </p>
                  <div className="space-y-2">
                    {q.options?.map((opt: string, optIdx: number) => (
                      <label key={optIdx} className="flex items-center space-x-3 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name={`question-${idx}`}
                          required
                          value={opt}
                          onChange={() => setAnswers({ ...answers, [idx]: opt })}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Submit Quiz Attempt</span>}
              </button>
            </form>
          )}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center space-y-3 border border-slate-200">
          <HelpCircle className="w-12 h-12 text-slate-400 mx-auto" />
          <p className="text-slate-700 font-bold">No active quizzes available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-lg">{quiz.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{quiz.description}</p>
              </div>
              <button
                onClick={() => setSelectedQuiz(quiz)}
                className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-sm transition-all"
              >
                Take Assessment
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
