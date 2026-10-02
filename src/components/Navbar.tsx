import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  Coins, 
  Bell, 
  Compass, 
  Calendar, 
  BookOpen, 
  Bot, 
  Award, 
  ShieldCheck, 
  LogOut, 
  Menu, 
  X,
  Check,
  GraduationCap
} from 'lucide-react';
import { apiRequest } from '../lib/api';

interface NavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
}

export function Navbar({ currentPath, navigate }: NavbarProps) {
  const { user, logout, refreshUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = async () => {
    try {
      const data = await apiRequest('/notifications');
      setNotifications(data.notifications || []);
    } catch {
      // ignore
    }
  };

  const handleToggleNotifications = () => {
    if (!notificationsOpen) {
      fetchNotifications();
    }
    setNotificationsOpen(!notificationsOpen);
  };

  const markAllRead = async () => {
    await apiRequest('/notifications/read-all', { method: 'POST' });
    fetchNotifications();
    refreshUser();
  };

  const isNavActive = (path: string) => {
    if (path === '/courses') {
      return currentPath.startsWith('/courses') || currentPath === '/partner-courses';
    }
    if (path === '/bootcamps') {
      return currentPath.startsWith('/bootcamps');
    }
    if (path === '/admin') {
      return currentPath.startsWith('/admin');
    }
    return currentPath === path;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#2F3338] bg-[#0B0F14]/95 backdrop-blur-md shadow-lg shadow-black/40">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div 
          onClick={() => navigate(user ? '/dashboard' : '/')}
          className="flex cursor-pointer items-center gap-3 transition-opacity hover:opacity-90"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#4169E1] to-[#123A8C] text-white shadow-md shadow-[#4169E1]/25 border border-[#4169E1]/40">
            <span className="font-extrabold text-base tracking-wider">LX</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg text-white font-['Space_Grotesk'] tracking-tight">LearnX</span>
              <span className="hidden sm:inline text-xs text-[#4169E1] font-semibold">· Exchange</span>
            </div>
            <span className="hidden md:inline text-[10px] text-slate-400 -mt-1 font-medium">Give what you know. Grow together.</span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden xl:flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
          {user ? (
            <>
              <button 
                onClick={() => navigate('/dashboard')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  isNavActive('/dashboard') 
                    ? 'bg-[#123A8C]/30 text-[#4169E1] font-semibold border border-[#4169E1]/30 shadow-xs' 
                    : 'text-slate-300 hover:text-white hover:bg-[#2F3338]/50'
                }`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => navigate('/discover')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  isNavActive('/discover') 
                    ? 'bg-[#123A8C]/30 text-[#4169E1] font-semibold border border-[#4169E1]/30 shadow-xs' 
                    : 'text-slate-300 hover:text-white hover:bg-[#2F3338]/50'
                }`}
              >
                <Compass className="h-4 w-4" />
                Discover
              </button>
              <button 
                onClick={() => navigate('/recommendations')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  isNavActive('/recommendations') 
                    ? 'bg-[#123A8C]/30 text-[#4169E1] font-semibold border border-[#4169E1]/30 shadow-xs' 
                    : 'text-slate-300 hover:text-white hover:bg-[#2F3338]/50'
                }`}
              >
                <Sparkles className="h-4 w-4 text-[#4169E1]" />
                AI Match
              </button>
              <button 
                onClick={() => navigate('/sessions')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  isNavActive('/sessions') 
                    ? 'bg-[#123A8C]/30 text-[#4169E1] font-semibold border border-[#4169E1]/30 shadow-xs' 
                    : 'text-slate-300 hover:text-white hover:bg-[#2F3338]/50'
                }`}
              >
                <Calendar className="h-4 w-4" />
                Sessions
              </button>
              <button 
                onClick={() => navigate('/courses')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  isNavActive('/courses') 
                    ? 'bg-[#123A8C]/30 text-[#4169E1] font-semibold border border-[#4169E1]/30 shadow-xs' 
                    : 'text-slate-300 hover:text-white hover:bg-[#2F3338]/50'
                }`}
              >
                <GraduationCap className="h-4 w-4 text-emerald-400" />
                Courses
              </button>
              <button 
                onClick={() => navigate('/bootcamps')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  isNavActive('/bootcamps') 
                    ? 'bg-[#123A8C]/30 text-[#4169E1] font-semibold border border-[#4169E1]/30 shadow-xs' 
                    : 'text-slate-300 hover:text-white hover:bg-[#2F3338]/50'
                }`}
              >
                <GraduationCap className="h-4 w-4 text-[#4169E1]" />
                Monthly Bootcamps
              </button>
              <button 
                onClick={() => navigate('/notes')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  isNavActive('/notes') 
                    ? 'bg-[#123A8C]/30 text-[#4169E1] font-semibold border border-[#4169E1]/30 shadow-xs' 
                    : 'text-slate-300 hover:text-white hover:bg-[#2F3338]/50'
                }`}
              >
                <BookOpen className="h-4 w-4 text-blue-400" />
                Notes
              </button>
              <button 
                onClick={() => navigate('/assistant')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  isNavActive('/assistant') 
                    ? 'bg-[#123A8C]/30 text-[#4169E1] font-semibold border border-[#4169E1]/30 shadow-xs' 
                    : 'text-slate-300 hover:text-white hover:bg-[#2F3338]/50'
                }`}
              >
                <Bot className="h-4 w-4 text-[#4169E1]" />
                AI Mentor
              </button>
              <button 
                onClick={() => navigate('/quizzes')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  isNavActive('/quizzes') 
                    ? 'bg-[#123A8C]/30 text-[#4169E1] font-semibold border border-[#4169E1]/30 shadow-xs' 
                    : 'text-slate-300 hover:text-white hover:bg-[#2F3338]/50'
                }`}
              >
                <Award className="h-4 w-4 text-amber-400" />
                Quizzes
              </button>
              {user.role === 'ADMIN' && (
                <button 
                  onClick={() => navigate('/admin')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    isNavActive('/admin') 
                      ? 'bg-rose-950/40 text-rose-400 font-semibold border border-rose-800/50' 
                      : 'text-slate-300 hover:text-rose-400 hover:bg-[#2F3338]/50'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4 text-rose-400" />
                  Admin
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={() => navigate('/discover')} className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#2F3338]/50 transition-colors">
                Skill Catalog
              </button>
              <button onClick={() => navigate('/courses')} className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#2F3338]/50 transition-colors">
                Courses
              </button>
              <button onClick={() => navigate('/bootcamps')} className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#2F3338]/50 transition-colors">
                Monthly Bootcamps
              </button>
              <button onClick={() => navigate('/terms')} className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#2F3338]/50 transition-colors">
                Terms
              </button>
              <button onClick={() => navigate('/privacy')} className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#2F3338]/50 transition-colors">
                Privacy
              </button>
              <button onClick={() => navigate('/recommendations')} className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#2F3338]/50 transition-colors">
                How AI Matching Works
              </button>
            </>
          )}
        </nav>

        {/* Right Section: Time Wallet, Notifications, Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {user ? (
            <>
              {/* Time Wallet Badge */}
              <button 
                onClick={() => navigate('/time-wallet')}
                title="Time Credits Ledger (1 Hour Sharing = 1 TC)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#123A8C]/30 border border-[#4169E1]/40 text-blue-200 text-xs font-semibold hover:bg-[#123A8C]/50 hover:border-[#4169E1] transition-all shadow-xs"
              >
                <Coins className="h-4 w-4 text-[#4169E1]" />
                <span>{user.wallet_balance ?? 0} TC</span>
              </button>

              {/* Notifications Bell */}
              <div className="relative">
                <button
                  onClick={handleToggleNotifications}
                  className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#2F3338]/60 transition-colors border border-transparent hover:border-[#2F3338]"
                  aria-label="Notifications"
                >
                  <Bell className="h-4.5 w-4.5" />
                  {(user.unread_notifications_count ?? 0) > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#4169E1] text-[10px] font-bold text-white shadow-xs">
                      {user.unread_notifications_count}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl border border-[#2F3338] bg-[#0B0F14] p-3 shadow-2xl shadow-black/80 z-50 backdrop-blur-xl">
                    <div className="flex items-center justify-between pb-2.5 border-b border-[#2F3338]">
                      <span className="text-xs font-semibold text-white">Real-Time Notifications</span>
                      <button 
                        onClick={markAllRead}
                        className="text-[11px] text-[#4169E1] hover:text-blue-300 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Check className="h-3 w-3" /> Mark all read
                      </button>
                    </div>

                    <div className="mt-2 max-h-72 overflow-y-auto space-y-2">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n.id}
                            onClick={() => {
                              if (n.link) navigate(n.link);
                              setNotificationsOpen(false);
                            }}
                            className={`p-2.5 rounded-xl cursor-pointer transition-colors text-left ${
                              n.is_read 
                                ? 'bg-[#121720]/80 border border-[#2F3338]/60 text-slate-300 hover:border-slate-600' 
                                : 'bg-[#123A8C]/20 border border-[#4169E1]/40 text-white hover:bg-[#123A8C]/30'
                            }`}
                          >
                            <p className="text-xs font-semibold text-white">{n.title}</p>
                            <p className="text-[11px] mt-0.5 text-slate-300 line-clamp-2">{n.message}</p>
                            <span className="text-[10px] text-slate-500 mt-1 block">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar Menu */}
              <div 
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 cursor-pointer p-1.5 rounded-xl hover:bg-[#2F3338]/50 transition-colors border border-transparent hover:border-[#2F3338]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-[#123A8C] to-[#4169E1] border border-[#4169E1]/50 text-xs font-bold text-white uppercase shadow-xs">
                  {user.full_name?.slice(0, 2) || 'LX'}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-semibold text-white leading-tight">{user.full_name?.split(' ')[0]}</span>
                  <span className="text-[10px] text-[#4169E1] capitalize font-medium">{user.role?.toLowerCase()}</span>
                </div>
              </div>

              <button
                onClick={() => logout()}
                title="Sign Out"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/login')}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-[#4169E1] to-[#123A8C] text-white shadow-md shadow-[#4169E1]/20 hover:from-[#5278ef] hover:to-[#1746a2] transition-all"
              >
                Registration
              </button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#2F3338]/60 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-b border-[#2F3338] bg-[#0B0F14]/98 px-4 py-4 space-y-1.5 shadow-2xl backdrop-blur-xl">
          {user ? (
            <>
              <button onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-sm font-medium rounded-xl transition-colors ${currentPath === '/dashboard' ? 'bg-[#123A8C]/30 text-[#4169E1]' : 'text-slate-300 hover:bg-[#2F3338]/60 hover:text-white'}`}>
                Dashboard
              </button>
              <button onClick={() => { navigate('/discover'); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-sm font-medium rounded-xl transition-colors ${currentPath === '/discover' ? 'bg-[#123A8C]/30 text-[#4169E1]' : 'text-slate-300 hover:bg-[#2F3338]/60 hover:text-white'}`}>
                Discover Skills
              </button>
              <button onClick={() => { navigate('/recommendations'); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-sm font-medium rounded-xl transition-colors ${currentPath === '/recommendations' ? 'bg-[#123A8C]/30 text-[#4169E1]' : 'text-slate-300 hover:bg-[#2F3338]/60 hover:text-white'}`}>
                AI Matching
              </button>
              <button onClick={() => { navigate('/sessions'); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-sm font-medium rounded-xl transition-colors ${currentPath === '/sessions' ? 'bg-[#123A8C]/30 text-[#4169E1]' : 'text-slate-300 hover:bg-[#2F3338]/60 hover:text-white'}`}>
                My Sessions
              </button>
              <button onClick={() => { navigate('/courses'); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-sm font-medium rounded-xl transition-colors ${currentPath.startsWith('/courses') ? 'bg-[#123A8C]/30 text-[#4169E1]' : 'text-slate-300 hover:bg-[#2F3338]/60 hover:text-white'}`}>
                Courses
              </button>
              <button onClick={() => { navigate('/bootcamps'); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-sm font-medium rounded-xl transition-colors ${currentPath.startsWith('/bootcamps') ? 'bg-[#123A8C]/30 text-[#4169E1]' : 'text-slate-300 hover:bg-[#2F3338]/60 hover:text-white'}`}>
                Monthly Bootcamps
              </button>
              <button onClick={() => { navigate('/notes'); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-sm font-medium rounded-xl transition-colors ${currentPath === '/notes' ? 'bg-[#123A8C]/30 text-[#4169E1]' : 'text-slate-300 hover:bg-[#2F3338]/60 hover:text-white'}`}>
                Notes
              </button>
              <button onClick={() => { navigate('/assistant'); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-sm font-medium rounded-xl transition-colors ${currentPath === '/assistant' ? 'bg-[#123A8C]/30 text-[#4169E1]' : 'text-slate-300 hover:bg-[#2F3338]/60 hover:text-white'}`}>
                AI Mentor
              </button>
              <button onClick={() => { navigate('/quizzes'); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-sm font-medium rounded-xl transition-colors ${currentPath === '/quizzes' ? 'bg-[#123A8C]/30 text-[#4169E1]' : 'text-slate-300 hover:bg-[#2F3338]/60 hover:text-white'}`}>
                Quizzes & Assessments
              </button>
              <button onClick={() => { navigate('/time-wallet'); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-sm font-medium rounded-xl transition-colors ${currentPath === '/time-wallet' ? 'bg-[#123A8C]/30 text-[#4169E1]' : 'text-slate-300 hover:bg-[#2F3338]/60 hover:text-white'}`}>
                Time Wallet ({user.wallet_balance ?? 0} TC)
              </button>
              <button onClick={() => { navigate('/profile'); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-sm font-medium rounded-xl transition-colors ${currentPath === '/profile' ? 'bg-[#123A8C]/30 text-[#4169E1]' : 'text-slate-300 hover:bg-[#2F3338]/60 hover:text-white'}`}>
                My Profile
              </button>
              <button onClick={() => { navigate('/terms'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-400 font-medium rounded-xl hover:bg-[#2F3338]/40 hover:text-white">
                Terms & Conditions
              </button>
              <button onClick={() => { navigate('/privacy'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-400 font-medium rounded-xl hover:bg-[#2F3338]/40 hover:text-white">
                Privacy Policy
              </button>
              {user.role === 'ADMIN' && (
                <button onClick={() => { navigate('/admin'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-rose-400 font-semibold rounded-xl hover:bg-rose-950/40">
                  Admin Console
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={() => { navigate('/discover'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-300 rounded-xl hover:bg-[#2F3338]/60 hover:text-white">
                Skill Catalog
              </button>
              <button onClick={() => { navigate('/courses'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-300 rounded-xl hover:bg-[#2F3338]/60 hover:text-white">
                Courses
              </button>
              <button onClick={() => { navigate('/bootcamps'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-300 rounded-xl hover:bg-[#2F3338]/60 hover:text-white">
                Monthly Bootcamps
              </button>
              <button onClick={() => { navigate('/login'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-300 rounded-xl hover:bg-[#2F3338]/60 hover:text-white">
                Sign In
              </button>
              <button onClick={() => { navigate('/register'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-[#4169E1] font-semibold rounded-xl hover:bg-[#123A8C]/20">
                Registration
              </button>
              <button onClick={() => { navigate('/terms'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-400 rounded-xl hover:bg-[#2F3338]/40 hover:text-white">
                Terms & Conditions
              </button>
              <button onClick={() => { navigate('/privacy'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-400 rounded-xl hover:bg-[#2F3338]/40 hover:text-white">
                Privacy Policy
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
