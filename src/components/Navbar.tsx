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
  User, 
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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div 
          onClick={() => navigate(user ? '/dashboard' : '/')}
          className="flex cursor-pointer items-center gap-3 transition-opacity hover:opacity-90"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            <span className="font-extrabold text-base tracking-wider">LX</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg text-slate-900 font-['Space_Grotesk'] tracking-tight">LearnX</span>
              <span className="hidden sm:inline text-xs text-blue-600 font-semibold">· Exchange</span>
            </div>
            <span className="hidden md:inline text-[10px] text-slate-500 -mt-1">Give what you know. Grow together.</span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {user ? (
            <>
              <button 
                onClick={() => navigate('/dashboard')}
                className={`transition-colors ${currentPath === '/dashboard' ? 'text-blue-600 font-semibold' : 'text-slate-600 hover:text-blue-600'}`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => navigate('/discover')}
                className={`flex items-center gap-1.5 transition-colors ${currentPath === '/discover' ? 'text-blue-600 font-semibold' : 'text-slate-600 hover:text-blue-600'}`}
              >
                <Compass className="h-4 w-4" />
                Discover
              </button>
              <button 
                onClick={() => navigate('/recommendations')}
                className={`flex items-center gap-1.5 transition-colors ${currentPath === '/recommendations' ? 'text-blue-600 font-semibold' : 'text-slate-600 hover:text-blue-600'}`}
              >
                <Sparkles className="h-4 w-4 text-blue-600" />
                AI Match
              </button>
              <button 
                onClick={() => navigate('/sessions')}
                className={`flex items-center gap-1.5 transition-colors ${currentPath === '/sessions' ? 'text-blue-600 font-semibold' : 'text-slate-600 hover:text-blue-600'}`}
              >
                <Calendar className="h-4 w-4" />
                Sessions
              </button>
              <button 
                onClick={() => navigate('/courses')}
                className={`flex items-center gap-1.5 transition-colors ${currentPath === '/courses' || currentPath === '/partner-courses' ? 'text-blue-600 font-semibold' : 'text-slate-600 hover:text-blue-600'}`}
              >
                <GraduationCap className="h-4 w-4 text-emerald-600" />
                Courses
              </button>
              <button 
                onClick={() => navigate('/bootcamps')}
                className={`flex items-center gap-1.5 transition-colors ${currentPath === '/bootcamps' ? 'text-blue-600 font-semibold' : 'text-slate-600 hover:text-blue-600'}`}
              >
                <GraduationCap className="h-4 w-4 text-blue-600" />
                Bootcamps
              </button>
              <button 
                onClick={() => navigate('/notes')}
                className={`flex items-center gap-1.5 transition-colors ${currentPath === '/notes' ? 'text-blue-600 font-semibold' : 'text-slate-600 hover:text-blue-600'}`}
              >
                <BookOpen className="h-4 w-4 text-indigo-600" />
                Notes
              </button>
              <button 
                onClick={() => navigate('/assistant')}
                className={`flex items-center gap-1.5 transition-colors ${currentPath === '/assistant' ? 'text-blue-600 font-semibold' : 'text-slate-600 hover:text-blue-600'}`}
              >
                <Bot className="h-4 w-4 text-blue-600" />
                AI Mentor
              </button>
              <button 
                onClick={() => navigate('/quizzes')}
                className={`flex items-center gap-1.5 transition-colors ${currentPath === '/quizzes' ? 'text-blue-600 font-semibold' : 'text-slate-600 hover:text-blue-600'}`}
              >
                <Award className="h-4 w-4 text-amber-500" />
                Quizzes
              </button>
              {user.role === 'ADMIN' && (
                <button 
                  onClick={() => navigate('/admin')}
                  className={`flex items-center gap-1.5 transition-colors ${currentPath.startsWith('/admin') ? 'text-rose-600 font-semibold' : 'text-slate-600 hover:text-rose-600'}`}
                >
                  <ShieldCheck className="h-4 w-4 text-rose-500" />
                  Admin
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={() => navigate('/discover')} className="text-slate-600 hover:text-blue-600">
                Skill Catalog
              </button>
              <button onClick={() => navigate('/courses')} className="text-slate-600 hover:text-blue-600">
                Partner Courses
              </button>
              <button onClick={() => navigate('/recommendations')} className="text-slate-600 hover:text-blue-600">
                How AI Matching Works
              </button>
            </>
          )}
        </nav>

        {/* Right Section: Time Wallet, Notifications, Profile */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Time Wallet Badge */}
              <button 
                onClick={() => navigate('/time-wallet')}
                title="Time Credits Ledger (1 Hour Sharing = 1 TC)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors shadow-2xs"
              >
                <Coins className="h-4 w-4 text-blue-600" />
                <span>{user.wallet_balance ?? 0} TC</span>
              </button>

              {/* Notifications Bell */}
              <div className="relative">
                <button
                  onClick={handleToggleNotifications}
                  className="relative p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {(user.unread_notifications_count ?? 0) > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                      {user.unread_notifications_count}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl z-50">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-semibold text-slate-800">Real-Time Notifications</span>
                      <button 
                        onClick={markAllRead}
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Check className="h-3 w-3" /> Mark all read
                      </button>
                    </div>

                    <div className="mt-2 max-h-72 overflow-y-auto space-y-2">
                      {notifications.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">
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
                            className={`p-2.5 rounded-xl cursor-pointer transition-colors text-left ${n.is_read ? 'bg-slate-50 text-slate-600' : 'bg-blue-50/70 border border-blue-100 text-slate-900'}`}
                          >
                            <p className="text-xs font-bold text-slate-900">{n.title}</p>
                            <p className="text-[11px] mt-0.5 text-slate-600 line-clamp-2">{n.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                className="flex items-center gap-2 cursor-pointer p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 border border-blue-200 text-xs font-bold text-blue-700 uppercase">
                  {user.full_name?.slice(0, 2) || 'LX'}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-800 leading-tight">{user.full_name?.split(' ')[0]}</span>
                  <span className="text-[10px] text-blue-600 capitalize font-medium">{user.role?.toLowerCase()}</span>
                </div>
              </div>

              <button
                onClick={() => logout()}
                title="Sign Out"
                className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/login')}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:from-blue-500 hover:to-indigo-500 transition-all"
              >
                Register
              </button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 py-4 space-y-1.5 shadow-lg">
          {user ? (
            <>
              <button onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 font-medium rounded-xl hover:bg-blue-50 hover:text-blue-600">
                Dashboard
              </button>
              <button onClick={() => { navigate('/discover'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 font-medium rounded-xl hover:bg-blue-50 hover:text-blue-600">
                Discover Skills
              </button>
              <button onClick={() => { navigate('/recommendations'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 font-medium rounded-xl hover:bg-blue-50 hover:text-blue-600">
                AI Matching
              </button>
              <button onClick={() => { navigate('/sessions'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 font-medium rounded-xl hover:bg-blue-50 hover:text-blue-600">
                My Sessions
              </button>
              <button onClick={() => { navigate('/courses'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 font-medium rounded-xl hover:bg-blue-50 hover:text-blue-600">
                Partner Courses
              </button>
              <button onClick={() => { navigate('/time-wallet'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 font-medium rounded-xl hover:bg-blue-50 hover:text-blue-600">
                Time Wallet ({user.wallet_balance ?? 0} TC)
              </button>
              <button onClick={() => { navigate('/assistant'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 font-medium rounded-xl hover:bg-blue-50 hover:text-blue-600">
                AI Mentor
              </button>
              <button onClick={() => { navigate('/quizzes'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 font-medium rounded-xl hover:bg-blue-50 hover:text-blue-600">
                Quizzes & Assessments
              </button>
              <button onClick={() => { navigate('/profile'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 font-medium rounded-xl hover:bg-blue-50 hover:text-blue-600">
                My Profile
              </button>
              {user.role === 'ADMIN' && (
                <button onClick={() => { navigate('/admin'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-rose-600 font-semibold rounded-xl hover:bg-rose-50">
                  Admin Console
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={() => { navigate('/discover'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 rounded-xl hover:bg-blue-50">
                Skill Catalog
              </button>
              <button onClick={() => { navigate('/login'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 rounded-xl hover:bg-blue-50">
                Sign In
              </button>
              <button onClick={() => { navigate('/register'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-blue-600 font-semibold rounded-xl hover:bg-blue-50">
                Register Account
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
