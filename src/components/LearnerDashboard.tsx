import React, { useState } from 'react';
import { Sparkles, Coins, BookOpen, Award, CheckSquare, Video, ArrowRight, UserCheck, Star, Calendar, MessageSquare, Bot } from 'lucide-react';

interface LearnerDashboardProps {
  user: any;
  skills: any[];
  sessions: any[];
  courses: any[];
  bootcamps: any[];
  quizzes: any[];
  credits: number;
  setActiveTab: (tab: string) => void;
  onJoinSession: (session: any) => void;
}

export default function LearnerDashboard({
  user,
  skills,
  sessions,
  courses,
  bootcamps,
  quizzes,
  credits,
  setActiveTab,
  onJoinSession
}: LearnerDashboardProps) {
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const upcomingSessions = sessions.filter(s => s.status === 'ACCEPTED' || s.status === 'PENDING');

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResponse('');
    try {
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('learnx_token')}`
        },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();
      setAiResponse(data.recommendation);
    } catch (err) {
      setAiResponse('Unable to connect to AI Assistant. Keep practicing and exploring new mentors!');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-purple-900/50 to-slate-900 border border-indigo-800/60 rounded-3xl p-8 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold mb-4 border border-indigo-500/30">
            <Sparkles className="w-3.5 h-3.5" /> Learner Dashboard
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Welcome back, {user.name}! 👋
          </h1>
          <p className="text-slate-300 mt-2 text-base">
            Your peer-to-peer learning journey continues. You have <span className="text-amber-400 font-bold">{credits} Time Credits</span> ready to use for booking live sessions with expert mentors.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <button
              onClick={() => setActiveTab('explore')}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
            >
              Explore Sharers <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab('courses')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-6 py-3 rounded-xl border border-slate-700 transition"
            >
              Browse Courses
            </button>
          </div>
        </div>
      </div>

      {/* AI Learning Assistant Widget */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Gemini AI Learning Coach</h2>
            <p className="text-xs text-slate-400">Ask for personalized skill paths, coding tips, or interview preparation advice.</p>
          </div>
        </div>
        <form onSubmit={handleAskAI} className="flex gap-3">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. Give me a 4-week roadmap to master Python and AI fundamentals..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={aiLoading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-md"
          >
            {aiLoading ? 'Thinking...' : 'Ask AI'}
          </button>
        </form>
        {aiResponse && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-indigo-900/50 text-slate-200 text-sm whitespace-pre-line leading-relaxed">
            {aiResponse}
          </div>
        )}
      </div>

      {/* Grid: Upcoming Sessions & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" /> Upcoming & Active Sessions
            </h2>
            <button onClick={() => setActiveTab('sessions')} className="text-xs text-indigo-400 hover:underline font-medium">
              View All
            </button>
          </div>

          {upcomingSessions.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
              <Video className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No upcoming sessions scheduled.</p>
              <button
                onClick={() => setActiveTab('explore')}
                className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
              >
                Find a Mentor Now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingSessions.map((session) => (
                <div key={session.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${session.status === 'ACCEPTED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                        {session.status}
                      </span>
                      <span className="text-xs text-slate-400">{new Date(session.scheduled_at).toLocaleString()}</span>
                    </div>
                    <h3 className="text-white font-semibold text-base">{session.skill_name} Session with {session.mentor_name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Room: {session.room_name}</p>
                  </div>
                  {session.status === 'ACCEPTED' && (
                    <button
                      onClick={() => onJoinSession(session)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-md flex items-center justify-center gap-2"
                    >
                      <Video className="w-4 h-4" /> Join Live Room
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats & Wallet Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Learning Snapshot</h2>
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Time Credits</span>
                    <span className="text-lg font-bold text-white">{credits} Credits</span>
                  </div>
                </div>
                <button onClick={() => setActiveTab('wallet')} className="text-xs text-indigo-400 hover:underline">Wallet</button>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Courses Enrolled</span>
                    <span className="text-lg font-bold text-white">{courses.length} Active</span>
                  </div>
                </div>
                <button onClick={() => setActiveTab('courses')} className="text-xs text-indigo-400 hover:underline">View</button>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Quizzes Available</span>
                    <span className="text-lg font-bold text-white">{quizzes.length} Quizzes</span>
                  </div>
                </div>
                <button onClick={() => setActiveTab('quizzes')} className="text-xs text-indigo-400 hover:underline">Take</button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400">LearnX Core Cycle: <span className="text-indigo-400 font-semibold">Learn → Share → Earn → Grow</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
