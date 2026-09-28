import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Award, Clock, ArrowRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { apiRequest } from '../lib/api';
import confetti from 'canvas-confetti';
import { QuizTimer } from '../components/QuizTimer';

export function QuizDetailPage({ 
  quizId, 
  navigate 
}: { 
  quizId: string; 
  navigate: (path: string) => void;
}) {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    apiRequest(`/quizzes/${quizId}`).then((res) => {
      setQuiz(res.quiz);
      setQuestions(res.questions || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [quizId]);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (result) return; // locked after submission
    setSelectedAnswers({ ...selectedAnswers, [questionId]: optionIndex });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting || result) return;
    setSubmitting(true);

    try {
      const data = await apiRequest(`/quizzes/${quizId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: selectedAnswers })
      });
      setResult(data);
      if (data.passed) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    } catch (err: any) {
      alert(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTimeExpired = () => {
    if (!result && !submitting) {
      alert('Time expired! Automatically submitting your assessment.');
      handleSubmit();
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-500">
        Loading quiz assessment...
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-xs text-slate-400">Quiz not found.</p>
        <button onClick={() => navigate('/quizzes')} className="text-xs text-[#1565D8] underline">
          Return to Quizzes
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Quiz Header with Timer */}
      <div className="p-6 rounded-2xl border border-[#E2E8F0] bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold text-[#1565D8] uppercase tracking-wider block mb-1">
            {quiz.skill_name || 'Skill Assessment'}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] font-['Space_Grotesk']">
            {quiz.title}
          </h1>
          <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
            {quiz.description}
          </p>
        </div>
        {!result && (
          <div className="shrink-0">
            <QuizTimer 
              durationMinutes={quiz.time_limit_minutes || 15} 
              onTimeExpired={handleTimeExpired} 
            />
          </div>
        )}
      </div>

      {/* Result Card if Submitted */}
      {result && (
        <div className={`p-6 rounded-2xl border shadow-sm space-y-3 ${
          result.passed 
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900' 
            : 'border-amber-200 bg-amber-50 text-amber-900'
        }`}>
          <div className="flex items-center gap-3">
            {result.passed ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-8 w-8 text-amber-600 shrink-0" />
            )}
            <div>
              <h3 className="text-base font-bold">
                {result.passed ? 'Assessment Passed Successfully!' : 'Assessment Complete — Review Recommended'}
              </h3>
              <p className="text-xs mt-0.5">
                Score: <strong className="text-sm font-bold">{result.score}%</strong> ({result.correct_count} of {result.total_questions} correct) · Demonstrated Level: <strong className="uppercase">{result.demonstrated_level}</strong>
              </p>
            </div>
          </div>

          {result.weak_topics?.length > 0 && (
            <div className="pt-2 border-t border-emerald-200/50">
              <span className="text-xs font-semibold block mb-1">Topics to practice with a peer sharer:</span>
              <div className="flex flex-wrap gap-1.5">
                {result.weak_topics.map((t: string) => (
                  <span key={t} className="px-2.5 py-1 rounded-md bg-white/80 border border-emerald-200 text-[11px] font-semibold text-emerald-800">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => navigate('/discover')}
              className="px-4 py-2 rounded-xl bg-[#1565D8] text-white font-semibold text-xs hover:bg-blue-700 transition-colors shadow-xs"
            >
              Find Peer Mentor for Weak Topics
            </button>
            <button
              onClick={() => {
                setResult(null);
                setSelectedAnswers({});
              }}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Retake Quiz
            </button>
          </div>
        </div>
      )}

      {/* Questions Form */}
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        {questions.map((q, qIndex) => (
          <div
            key={q.id}
            className="p-6 rounded-2xl border border-[#E2E8F0] bg-white shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-bold text-[#1565D8]">Question {qIndex + 1} of {questions.length}</span>
              {q.topic && <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{q.topic}</span>}
            </div>

            <h3 className="text-sm font-semibold text-[#0F172A] leading-relaxed">
              {q.question_text}
            </h3>

            <div className="space-y-2.5">
              {q.options.map((opt: string, optIndex: number) => {
                const isSelected = selectedAnswers[q.id] === optIndex;
                return (
                  <div
                    key={optIndex}
                    onClick={() => handleSelectOption(q.id, optIndex)}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'border-[#1565D8] bg-[#EAF3FF] text-[#0F172A] font-semibold shadow-2xs'
                        : 'border-[#E2E8F0] bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded-lg border flex items-center justify-center text-[11px] font-bold ${
                      isSelected ? 'border-[#1565D8] bg-[#1565D8] text-white' : 'border-slate-300 bg-slate-50 text-slate-600'
                    }`}>
                      {isSelected ? '✓' : String.fromCharCode(65 + optIndex)}
                    </div>
                    <span>{opt}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {!result && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting || Object.keys(selectedAnswers).length === 0}
              className="px-8 py-3 rounded-xl bg-[#1565D8] text-white font-semibold text-xs shadow-md hover:bg-blue-700 disabled:opacity-40 transition-all"
            >
              {submitting ? 'Evaluating Assessment...' : 'Submit Assessment Answers'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
