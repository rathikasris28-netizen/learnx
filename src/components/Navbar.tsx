import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { learnxApi } from '../services/learnx';
import { Coins, Bell, LogOut, User as UserIcon, Shield, Menu, X } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (user) {
      learnxApi.getCreditBalance()
        .then((bal) => {
          if (bal !== null && bal !== undefined) setCreditBalance(bal);
        })
        .catch(() => {});

      learnxApi.getNotifications()
        .then((notifs) => {
          const unread = notifs.filter((n: any) => !n.is_read).length;
          setUnreadCount(unread);
        })
        .catch(() => {});
    }
  }, [user]);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden text-slate-600 hover:text-indigo-600 p-1 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:scale-105 transition-transform">
              LX
            </div>
            <div>
              <span className="text-xl font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                LearnX
              </span>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">
                Exchange. Learn. Grow.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Time Credits Badge */}
          <div
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full shadow-xs cursor-pointer hover:bg-amber-100 transition-colors"
            title="Your Time Credit Balance (1 hr sharing = +1 credit, 1 hr learning = -1 credit)"
          >
            <Coins className="w-4 h-4 text-amber-600 animate-pulse" />
            <span className="text-sm font-bold text-amber-800">{creditBalance}</span>
            <span className="text-xs font-medium text-amber-700 hidden sm:inline">Credits</span>
          </div>

          {/* Notifications Bell */}
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 focus:outline-none"
            >
              <div className="w-9 h-9 rounded-full bg-indigo-100 border-2 border-indigo-500 overflow-hidden flex items-center justify-center text-indigo-700 font-semibold shadow-xs">
                {profile?.profile_photo_url ? (
                  <img src={profile.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span>{profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}</span>
                )}
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {profile?.full_name || 'LearnX User'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                >
                  <UserIcon className="w-4 h-4 text-slate-500" />
                  <span>Profile & Settings</span>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/admin');
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-indigo-600 hover:bg-indigo-50 flex items-center space-x-2 font-medium"
                  >
                    <Shield className="w-4 h-4 text-indigo-600" />
                    <span>Admin Dashboard</span>
                  </button>
                )}
                <div className="border-t border-slate-100 my-1"></div>
                <button
                  onClick={async () => {
                    setDropdownOpen(false);
                    await signOut();
                    navigate('/login');
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center space-x-2 font-medium"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};export default Navbar;
