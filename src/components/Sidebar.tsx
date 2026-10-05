import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  Share2,
  Users,
  Video,
  TrendingUp,
  HelpCircle,
  Award,
  Trophy,
  Briefcase,
  Bell,
  User,
  ShieldAlert,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Learn Skills', icon: BookOpen, path: '/learn' },
    { label: 'Share Skills', icon: Share2, path: '/share' },
    { label: 'AI Matches', icon: Users, path: '/matches' },
    { label: 'Sessions', icon: Video, path: '/sessions' },
    { label: 'Learning Progress', icon: TrendingUp, path: '/progress' },
    { label: 'Quizzes', icon: HelpCircle, path: '/quizzes' },
    { label: 'Certificates', icon: Award, path: '/certificates' },
    { label: 'Achievements', icon: Trophy, path: '/achievements' },
    { label: 'Partner Programs', icon: Briefcase, path: '/partners' },
    { label: 'Notifications', icon: Bell, path: '/notifications' },
    { label: 'Profile', icon: User, path: '/profile' },
  ];

  if (isAdmin) {
    navItems.push({ label: 'Admin Portal', icon: ShieldAlert, path: '/admin' });
  }

  const handleNav = (path: string) => {
    navigate(path);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-slate-100 hidden md:flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
            LX
          </div>
          <span className="font-bold text-slate-800 tracking-tight">LearnX Hub</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-indigo-50 text-indigo-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="bg-gradient-to-r from-indigo-500 to-violet-600 rounded-xl p-3.5 text-white shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-100">Time Credit Rule</p>
            <p className="text-[11px] mt-1 text-indigo-50 leading-relaxed">
              1 hour shared = +1 credit<br />
              1 hour learned = -1 credit
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
