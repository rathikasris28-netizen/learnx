import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, MapPin, Globe, Briefcase, ShieldCheck, CheckCircle2, Edit3, Save } from 'lucide-react';
import { apiRequest } from '../lib/api';

export function ProfilePage({ navigate }: { navigate: (path: string) => void }) {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    mobile: user?.mobile || '',
    city: user?.city || '',
    state: user?.state || '',
    preferred_language: user?.preferred_language || 'English',
    education_status: user?.education_status || '',
    bio: user?.bio || ''
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');

    try {
      await apiRequest('/profile', {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      await refreshUser();
      setEditing(false);
      setMsg('Profile updated successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-extrabold text-xl text-white uppercase shadow-lg shadow-cyan-500/20">
            {user?.full_name?.slice(0, 2) || 'LX'}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white font-['Space_Grotesk']">
              {user?.full_name}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {user?.email} · Role: <span className="text-cyan-400 font-semibold">{user?.role}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setEditing(!editing)}
          className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Edit3 className="h-3.5 w-3.5" />
          <span>{editing ? 'Cancel' : 'Edit Profile'}</span>
        </button>
      </div>

      {msg && (
        <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-xs">
          {msg}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Info or Edit Form (2 cols) */}
        <div className="md:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <h2 className="text-sm font-bold text-white font-['Space_Grotesk']">
              Personal Information
            </h2>

            {editing ? (
              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Mobile</label>
                    <input
                      type="text"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Preferred Language</label>
                    <input
                      type="text"
                      value={formData.preferred_language}
                      onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Education / Profession</label>
                    <input
                      type="text"
                      value={formData.education_status}
                      onChange={(e) => setFormData({ ...formData, education_status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Bio</label>
                  <textarea
                    rows={3}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-semibold text-xs shadow-md transition-colors flex items-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Location</span>
                  <span className="text-white font-medium">{user?.city ? `${user.city}, ${user.state || ''}` : 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Preferred Language</span>
                  <span className="text-white font-medium">{user?.preferred_language || 'English'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Education / Profession</span>
                  <span className="text-white font-medium">{user?.education_status || 'Member'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Contact</span>
                  <span className="text-white font-medium">{user?.mobile || 'Confidential'}</span>
                </div>
                <div className="sm:col-span-2 pt-2 border-t border-slate-800/60">
                  <span className="text-slate-500 block mb-0.5">Bio</span>
                  <p className="text-slate-300 leading-relaxed">{user?.bio || 'Passionate peer knowledge exchanger.'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Trust & Platform Verification (1 col) */}
        <div className="space-y-4">
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <h3 className="text-sm font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-cyan-400" />
              Trust & Verification
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">Trust Score</span>
                <span className="text-cyan-400 font-extrabold text-sm">{user?.trust_score ?? 85}%</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">Reliability Score</span>
                <span className="text-emerald-400 font-extrabold text-sm">{user?.reliability_score ?? 90}%</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">Email Verification</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
