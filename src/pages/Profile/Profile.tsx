import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, MapPin, Globe, Award, Shield, Loader2, CheckCircle2 } from 'lucide-react';

export const Profile: React.FC = () => {
  const { profile, user, refreshProfile } = useAuth();
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Your Profile & Settings</h1>
        <p className="text-sm text-slate-500">Manage your LearnX account information and preferences.</p>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl font-medium flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center space-x-4 border-b border-slate-100 pb-6">
          <div className="w-16 h-16 rounded-full bg-indigo-100 border-2 border-indigo-600 text-indigo-700 font-bold text-2xl flex items-center justify-center shadow-md">
            {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">{profile?.full_name || 'LearnX User'}</h2>
            <p className="text-xs text-slate-500">{user?.email}</p>
            <div className="flex items-center space-x-2 mt-2">
              <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                Role: {profile?.role || 'USER'}
              </span>
              <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                Active
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Age Group</span>
            <p className="font-semibold text-slate-800">{profile?.age_group || 'Not specified'}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preferred Language</span>
            <p className="font-semibold text-slate-800">{profile?.preferred_language || 'English'}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">City, State</span>
            <p className="font-semibold text-slate-800">
              {profile?.city || 'City'}, {profile?.state || 'State'}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</span>
            <p className="font-semibold text-slate-800">{profile?.education_work_status || 'Student'}</p>
          </div>
        </div>

        <div className="space-y-1 pt-4 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bio</span>
          <p className="text-sm text-slate-600 leading-relaxed">{profile?.bio || 'No bio provided yet.'}</p>
        </div>
      </div>
    </div>
  );
};
