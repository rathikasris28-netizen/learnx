
import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import confetti from 'canvas-confetti';
import { QuizTimer } from '../components/QuizTimer';

interface QuizQuestion {
  id: string;
  quiz_id?: string;
  question_text: string;
  options: string[];
  points?: number;
  topic?: string | null;
}

interface QuizData {
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

interface QuizResponse extends QuizData {
  previous_attempt?: QuizAttempt | null;
}

interface QuizAttempt {
  id?: string;
  quizId?: string;
  userId?: string;
  score: number;
  correctAnswers?: number;
  totalQuestions?: number;
  passed: boolean;
  completedAt?: string;
}

interface QuizSubmitResponse {
  attempt: QuizAttempt;
  score: number;
  correct: number;
  total: number;
}

interface SelectedAnswers {
  [questionId: string]: number;
}

export function QuizDetailPage({
  quizId,
  navigate,
}: {
  quizId: string;
  navigate: (path: string) => void;
}) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] =
    useState<SelectedAnswers>({});
  const [result, setResult] =
    useState<QuizSubmitResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadQuiz = async () => {
      setLoading(true);
      setError('');

      try {
        const response =
          await apiRequest<QuizResponse>(
            `/quizzes/${quizId}`
          );

        if (cancelled) {
          return;
        }

        setQuiz(response || null);

        const normalizedQuestions = Array.isArray(
          response?.questions
        )
          ? response.questions.map((question) => ({
              ...question,
              options: Array.isArray(question.options)
                ? question.options
                : [],
            }))
          : [];

        setQuestions(normalizedQuestions);

        if (response?.previous_attempt) {
          const previous = response.previous_attempt;

          setResult({
            attempt: previous,
            score: Number(previous.score || 0),
            correct: Number(
              previous.correctAnswers || 0
            ),
            total: Number(
              previous.totalQuestions ||
                normalizedQuestions.length
            ),
          });
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err.message || 'Failed to load quiz assessment.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadQuiz();

    return () => {
      cancelled = true;
    };
  }, [quizId]);

  const handleSelectOption = (
    questionId: string,
    optionIndex: number
  ) => {
    if (result || submitting) {
      return;
    }

    setSelectedAnswers((previous) => ({
      ...previous,
      [questionId]: optionIndex,
    }));
  };

  const handleSubmit = async (
    event?: React.FormEvent
  ) => {
    event?.preventDefault();

    if (submitting || result) {
      return;
    }

    if (questions.length === 0) {
      setError('This quiz has no questions.');
      return;
    }

    if (
      Object.keys(selectedAnswers).length === 0
    ) {
      setError(
        'Please answer at least one question before submitting.'
      );
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const answers = Object.entries(
        selectedAnswers
      ).map(
        ([question_id, selected_answer]) => ({
          question_id,
          selected_answer,
        })
      );

      const data =
        await apiRequest<QuizSubmitResponse>(
          `/quizzes/${quizId}/submit`,
          {
            method: 'POST',
            body: {
              answers,
            },
          }
        );

      setResult(data);

      if (data?.attempt?.passed) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err: any) {
      setError(
        err.message || 'Submission failed.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleTimeExpired = () => {
    if (!result && !submitting) {
      void handleSubmit();
    }
  };

  const handleRetake = () => {
    setResult(null);
    setSelectedAnswers({});
    setError('');
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
        <p className="text-xs text-slate-400">
          {error || 'Quiz not found.'}
        </p>

        <button
          onClick={() => navigate('/quizzes')}
          className="text-xs text-[#1565D8] underline"
        >
          Return to Quizzes
        </button>
      </div>
    );
  }

  const skillName =
    quiz.skill_name ||
    quiz.skill?.name ||
    'Skill Assessment';

  const durationMinutes =
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

  const isPassed =
    result?.attempt?.passed === true;

  const resultCorrect =
    result?.correct ??
    result?.attempt?.correctAnswers ??
    0;

  const resultTotal =
    result?.total ??
    result?.attempt?.totalQuestions ??
    questions.length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Quiz Header */}
      <div className="p-6 rounded-2xl border border-[#E2E8F0] bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold text-[#1565D8] uppercase tracking-wider block mb-1">
            {skillName}
          </span>

          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] font-['Space_Grotesk']">
            {quiz.title}
          </h1>

          {quiz.description && (
            <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
              {quiz.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] text-slate-500">
            <span>
              Questions:{' '}
              <strong className="text-slate-700">
                {questions.length}
              </strong>
            </span>

            <span>•</span>

            <span>
              Passing score:{' '}
              <strong className="text-slate-700">
                {passingScore}%
              </strong>
            </span>
          </div>
        </div>

        {!result && (
          <div className="shrink-0">
            <QuizTimer
              durationMinutes={durationMinutes}
              onTimeExpired={handleTimeExpired}
            />
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Result */}
      {result && (
        <div
          className={`p-6 rounded-2xl border shadow-sm space-y-4 ${
            isPassed
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {isPassed ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-8 w-8 text-amber-600 shrink-0" />
            )}

            <div>
              <h3 className="text-base font-bold">
                {isPassed
                  ? 'Assessment Passed Successfully!'
                  : 'Assessment Complete — Review Recommended'}
              </h3>

              <p className="text-xs mt-0.5">
                Score:{' '}
                <strong className="text-sm font-bold">
                  {Number(result.score || 0).toFixed(0)}%
                </strong>{' '}
                ({resultCorrect} of {resultTotal} correct)
              </p>
            </div>
          </div>

          <div className="text-xs">
            {isPassed ? (
              <p>
                Your score meets the{' '}
                <strong>{passingScore}%</strong>{' '}
                passing requirement for this assessment.
              </p>
            ) : (
              <p>
                Your score is below the{' '}
                <strong>{passingScore}%</strong>{' '}
                passing requirement. You can review the skill
                and attempt the assessment again.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              onClick={() => navigate('/discover')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#1565D8] text-white font-semibold text-xs hover:bg-blue-700 transition-colors shadow-xs"
            >
              Find a Knowledge Sharer
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={handleRetake}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retake Quiz
            </button>
          </div>
        </div>
      )}

      {/* Questions */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {questions.map((question, questionIndex) => (
          <div
            key={question.id}
            className="p-6 rounded-2xl border border-[#E2E8F0] bg-white shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between gap-3 text-xs text-[#64748B]">
              <span className="font-bold text-[#1565D8]">
                Question {questionIndex + 1} of{' '}
                {questions.length}
              </span>

              {question.topic && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                  {question.topic}
                </span>
              )}
            </div>

            <h3 className="text-sm font-semibold text-[#0F172A] leading-relaxed">
              {question.question_text}
            </h3>

            <div className="space-y-2.5">
              {question.options.map(
                (option, optionIndex) => {
                  const isSelected =
                    selectedAnswers[question.id] ===
                    optionIndex;

                  return (
                    <button
                      key={`${question.id}-${optionIndex}`}
                      type="button"
                      disabled={!!result || submitting}
                      onClick={() =>
                        handleSelectOption(
                          question.id,
                          optionIndex
                        )
                      }
                      className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'border-[#1565D8] bg-[#EAF3FF] text-[#0F172A] font-semibold shadow-2xs'
                          : 'border-[#E2E8F0] bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      } ${
                        result || submitting
                          ? 'cursor-default'
                          : 'cursor-pointer'
                      }`}
                    >
                      <span
                        className={`h-5 w-5 shrink-0 rounded-lg border flex items-center justify-center text-[11px] font-bold ${
                          isSelected
                            ? 'border-[#1565D8] bg-[#1565D8] text-white'
                            : 'border-slate-300 bg-slate-50 text-slate-600'
                        }`}
                      >
                        {isSelected
                          ? '✓'
                          : String.fromCharCode(
                              65 + optionIndex
                            )}
                      </span>

                      <span>{option}</span>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        ))}

        {questions.length === 0 && (
          <div className="p-8 rounded-2xl border border-slate-200 bg-white text-center">
            <p className="text-xs text-slate-500">
              This quiz currently has no questions.
            </p>
          </div>
        )}

        {!result && questions.length > 0 && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={
                submitting ||
                Object.keys(selectedAnswers).length === 0
              }
              className="px-8 py-3 rounded-xl bg-[#1565D8] text-white font-semibold text-xs shadow-md hover:bg-blue-700 disabled:opacity-40 transition-all"
            >
              {submitting
                ? 'Evaluating Assessment...'
                : 'Submit Assessment Answers'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
