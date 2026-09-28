import React from 'react';
import { 
  LayoutDashboard, 
  Compass, 
  Share2, 
  Calendar, 
  BookOpen, 
  GraduationCap, 
  Award, 
  Bell, 
  FileText, 
  Coins, 
  TrendingUp, 
  Sparkles, 
  Settings, 
  HelpCircle, 
  User, 
  ShieldCheck 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Sidebar({ currentPath, navigate }: { currentPath: string; navigate: (path: string) => void }) {
  const { user } = useAuth();

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Learn & Discover', path: '/discover', icon: Compass },
    { label: 'AI Match', path: '/recommendations', icon: Sparkles },
    { label: 'Share Knowledge', path: '/sessions', icon: Share2 },
    { label: 'My Sessions', path: '/sessions', icon: Calendar },
    { label: 'Skills', path: '/skills', icon: BookOpen },
    { label: 'Notes', path: '/notes', icon: FileText },
    { label: 'Courses', path: '/courses', icon: GraduationCap },
    { label: 'Bootcamps', path: '/bootcamps', icon: GraduationCap },
    { label: 'Notifications', path: '/notifications', icon: Bell },
    { label: 'Certificates', path: '/certificates', icon: Award },
    { label: 'Time Wallet', path: '/time-wallet', icon: Coins },
    { label: 'Progress Analytics', path: '/learning-path', icon: TrendingUp },
    { label: 'Achievements', path: '/achievements', icon: Award },
  ];

  if (user?.role === 'ADMIN') {
    menuItems.push({ label: 'Admin Console', path: '/admin', icon: ShieldCheck });
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-slate-800/80 bg-[#0b0f17] min-h-[calc(100vh-4rem)] sticky top-16 z-30">
      {/* Brand / Logo */}
      <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-bold text-base shadow-sm shadow-cyan-500/20">
          LX
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg text-white font-['Space_Grotesk'] tracking-tight">LearnX</span>
          <span className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">Exchange · Grow</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all relative group ${
                isActive 
                  ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-cyan-500 rounded-r-full" />
              )}
              <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Profile / Quick Info */}
      <div className="p-4 border-t border-slate-800/80 space-y-2">
        <button
          onClick={() => navigate('/profile')}
          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-900 transition-colors text-left"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold uppercase">
            {user?.full_name?.slice(0, 2) || 'LX'}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-semibold text-white truncate">{user?.full_name || 'Guest User'}</span>
            <span className="text-[10px] text-cyan-400 capitalize font-medium">{user?.role?.toLowerCase() || 'Learner'}</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
