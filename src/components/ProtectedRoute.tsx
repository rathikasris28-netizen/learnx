import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  requiredState?: 'auth' | 'verified' | 'onboarded' | 'admin';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredState = 'onboarded' }) => {
  const { user, profile, loading, isVerified, isOnboarded, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg animate-pulse">
          LX
        </div>
        <div className="flex items-center space-x-2 text-indigo-600 font-medium">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading LearnX...</span>
        </div>
      </div>
    );
  }

  // 1. Check Authentication
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Check Email Verification
  if (!isVerified && location.pathname !== '/verify-email') {
    return <Navigate to="/verify-email" replace />;
  }

  if (isVerified && location.pathname === '/verify-email') {
    return <Navigate to={isOnboarded ? '/dashboard' : '/onboarding'} replace />;
  }

  // 3. Check Onboarding
  if (isVerified && !isOnboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (isVerified && isOnboarded && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />;
  }

  // 4. Check Admin
  if (requiredState === 'admin' && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
