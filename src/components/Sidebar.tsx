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
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-[#2F3338] bg-[#0B0F14] min-h-[calc(100vh-4rem)] sticky top-16 z-30 shadow-xl">
      {/* Brand / Mini Header */}
      <div className="p-5 border-b border-[#2F3338] flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#4169E1] to-[#123A8C] text-white font-bold text-sm shadow-md shadow-[#4169E1]/20 border border-[#4169E1]/40">
          LX
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-base text-white font-['Space_Grotesk'] tracking-tight">LearnX</span>
          <span className="text-[10px] text-[#4169E1] font-semibold uppercase tracking-wider">Exchange · Grow</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3.5 py-5 space-y-1">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
          return (
            <button
              key={`${item.label}-${index}`}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all relative group text-left ${
                isActive
                  ? 'bg-[#123A8C]/25 border border-[#4169E1]/40 text-blue-200 shadow-sm shadow-[#123A8C]/30'
                  : 'text-slate-300 hover:bg-[#2F3338]/50 hover:text-white border border-transparent'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#4169E1] rounded-r-full shadow-[0_0_8px_#4169E1]" />
              )}
              <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-[#4169E1]' : 'text-slate-400 group-hover:text-slate-200'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Profile / Quick Info */}
      <div className="p-3.5 border-t border-[#2F3338] space-y-2 bg-[#0B0F14]/60">
        <button
          onClick={() => navigate('/profile')}
          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#2F3338]/50 border border-transparent hover:border-[#2F3338] transition-colors text-left"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-[#123A8C] to-[#4169E1] border border-[#4169E1]/50 text-white text-xs font-bold uppercase shrink-0 shadow-xs">
            {user?.full_name?.slice(0, 2) || 'LX'}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-semibold text-white truncate">{user?.full_name || 'Guest User'}</span>
            <span className="text-[10px] text-[#4169E1] capitalize font-medium">{user?.role?.toLowerCase() || 'Learner'}</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
