import React from 'react';
import { Coins, LogOut, User, BookOpen, Video, Award, Compass, CheckSquare } from 'lucide-react';

interface NavbarProps {
  user: any;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  credits: number;
}

export default function Navbar({ user, activeTab, setActiveTab, onLogout, credits }: NavbarProps) {
  const isMentor = user.role === 'KNOWLEDGE_SHARER';

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <img src="/logo.svg" alt="LearnX Logo" className="w-10 h-10 rounded-xl shadow-md shadow-emerald-500/20 object-cover" />
          <div>
            <span className="font-bold text-xl text-white tracking-tight">LearnX</span>
            <span className="text-xs block text-emerald-400 font-medium">Exchange • Learn • Grow</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'dashboard' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'}`}
          >
            Dashboard
          </button>
          {!isMentor && (
            <button
              onClick={() => setActiveTab('explore')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${activeTab === 'explore' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'}`}
            >
              <Compass className="w-4 h-4" /> Explore Sharers
            </button>
          )}
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${activeTab === 'sessions' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'}`}
          >
            <Video className="w-4 h-4" /> Sessions
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${activeTab === 'courses' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'}`}
          >
            <BookOpen className="w-4 h-4" /> Courses
          </button>
          <button
            onClick={() => setActiveTab('bootcamps')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${activeTab === 'bootcamps' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'}`}
          >
            <Award className="w-4 h-4" /> Bootcamps
          </button>
          <button
            onClick={() => setActiveTab('quizzes')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${activeTab === 'quizzes' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'}`}
          >
            <CheckSquare className="w-4 h-4" /> Quizzes
          </button>
        </nav>

        <div className="flex items-center gap-4">
          <div 
            onClick={() => setActiveTab('wallet')}
            className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl cursor-pointer hover:border-emerald-500 transition shadow-inner"
            title="Time Credits Wallet"
          >
            <Coins className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-sm font-bold text-amber-300">{credits} Credits</span>
          </div>

          <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
            <div className="text-right hidden sm:block">
              <span className="text-sm font-semibold text-white block">{user.name}</span>
              <span className="text-xs text-emerald-400 block">{isMentor ? 'Knowledge Sharer' : 'Learner'}</span>
            </div>
            <button
              onClick={onLogout}
              className="p-2 rounded-xl bg-slate-800 hover:bg-red-950/60 hover:text-red-400 text-slate-300 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
