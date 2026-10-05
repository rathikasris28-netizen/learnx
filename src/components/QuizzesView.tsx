import React, { useState, useEffect } from 'react';
import { CheckSquare, Award, CheckCircle, XCircle, RotateCcw } from 'lucide-react';

interface QuizzesViewProps {
  user: any;
}

export default function QuizzesView({ user }: QuizzesViewProps) {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<{ [key: number]: number }>({});
  const [quizResult, setQuizResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/quizzes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setQuizzes(data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const openQuiz = async (quizId: number) => {
    try {
      const res = await fetch(`/api/quizzes/${quizId}`);
      const data = await res.json();
      setActiveQuiz(data);
      setCurrentAnswers({});
      setQuizResult(null);
    } catch (err) {
      console.error(err);
    }
  };

  const submitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuiz) return;
    const answersArray = activeQuiz.questions.map((_: any, idx: number) => currentAnswers[idx] ?? -1);

    try {
      const res = await fetch(`/api/quizzes/${activeQuiz.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('learnx_token')}`
        },
        body: JSON.stringify({ answers: answersArray })
      });
      const data = await res.json();
      if (res.ok) {
        setQuizResult(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold mb-4 border border-indigo-500/30">
            <CheckSquare className="w-3.5 h-3.5" /> Mastery Assessment
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Interactive Quizzes</h1>
          <p className="text-slate-300 mt-2 text-sm">
            Test your knowledge across Python, English Communication, AI, and more. Instant scoring and detailed explanations.
          </p>
        </div>
      </div>

      {activeQuiz ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs bg-indigo-950 text-indigo-400 border border-indigo-800 px-2.5 py-0.5 rounded-full font-semibold">
                {activeQuiz.category} • {activeQuiz.difficulty}
              </span>
              <h2 className="text-2xl font-bold text-white mt-1">{activeQuiz.title}</h2>
            </div>
            <button
              onClick={() => setActiveQuiz(null)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl transition"
            >
              Back to Quizzes
            </button>
          </div>

          {quizResult ? (
            <div className="space-y-6">
              <div className="bg-indigo-950/60 border border-indigo-800 p-6 rounded-2xl text-center">
                <Award className="w-12 h-12 text-indigo-400 mx-auto mb-2 animate-bounce" />
                <h3 className="text-2xl font-bold text-white">Quiz Completed!</h3>
                <p className="text-xl text-indigo-300 font-semibold mt-1">Score: {quizResult.score} / {quizResult.total} ({quizResult.percentage}%)</p>
              </div>

              <div className="space-y-4">
                {quizResult.questions.map((q: any, idx: number) => {
                  const userAnswer = (quizResult.answers as any)?.[idx];
                  const isCorrect = userAnswer === q.correct;
                  return (
                    <div key={q.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {isCorrect ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                        <span className="text-sm font-semibold text-white">Q{idx + 1}. {q.question}</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-2">Explanation: {q.explanation}</p>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setQuizResult(null)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Retake Quiz
              </button>
            </div>
          ) : (
            <form onSubmit={submitQuiz} className="space-y-6">
              {activeQuiz.questions.map((q: any, idx: number) => (
                <div key={q.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                  <p className="text-sm font-semibold text-white mb-3">Q{idx + 1}. {q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((opt: string, optIdx: number) => (
                      <label key={optIdx} className="flex items-center gap-3 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-3 rounded-xl text-xs text-slate-200 cursor-pointer transition">
                        <input
                          type="radio"
                          name={`question-${idx}`}
                          checked={currentAnswers[idx] === optIdx}
                          onChange={() => setCurrentAnswers({ ...currentAnswers, [idx]: optIdx })}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition shadow-md"
              >
                Submit Quiz Answers
              </button>
            </form>
          )}
        </div>
      ) : (
        loading ? (
          <div className="text-center py-12 text-slate-400">Loading quizzes...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quizzes.map((q) => (
              <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
                <div>
                  <span className="text-xs bg-indigo-950 text-indigo-400 border border-indigo-800 px-2.5 py-1 rounded-full font-semibold">
                    {q.category} • {q.difficulty}
                  </span>
                  <h3 className="text-xl font-bold text-white mt-3 mb-2">{q.title}</h3>
                  <p className="text-slate-400 text-sm mb-6">Test your mastery with timed questions and instant feedback.</p>
                </div>
                <button
                  onClick={() => openQuiz(q.id)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-semibold transition shadow-md"
                >
                  Start Quiz
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
