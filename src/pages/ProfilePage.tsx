
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  CheckCircle2,
  Edit3,
  Save,
  X,
} from 'lucide-react';
import { apiRequest } from '../lib/api';

export function ProfilePage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const { user, refreshUser } = useAuth();

  const getEducationWorkStatus = () =>
    (user as any)?.education_work_status ??
    (user as any)?.education_status ??
    '';

  const [editing, setEditing] = useState(false);

  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    city: user?.city || '',
    state: user?.state || '',
    preferred_language:
      user?.preferred_language || 'English',
    education_work_status:
      getEducationWorkStatus(),
    bio: user?.bio || '',
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setFormData({
      full_name: user?.full_name || '',
      city: user?.city || '',
      state: user?.state || '',
      preferred_language:
        user?.preferred_language || 'English',
      education_work_status:
        (user as any)?.education_work_status ??
        (user as any)?.education_status ??
        '',
      bio: user?.bio || '',
    });
  }, [user]);

  const handleCancel = () => {
    setFormData({
      full_name: user?.full_name || '',
      city: user?.city || '',
      state: user?.state || '',
      preferred_language:
        user?.preferred_language || 'English',
      education_work_status:
        (user as any)?.education_work_status ??
        (user as any)?.education_status ??
        '',
      bio: user?.bio || '',
    });

    setEditing(false);
    setMsg('');
    setError('');
  };

  const handleSave = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const fullName = formData.full_name.trim();

    if (!fullName) {
      setError('Full name is required.');
      return;
    }

    if (!formData.preferred_language.trim()) {
      setError('Preferred language is required.');
      return;
    }

    setSaving(true);
    setMsg('');
    setError('');

    try {
      await apiRequest('/profile', {
        method: 'PUT',
        body: {
          full_name: fullName,
          city: formData.city.trim() || null,
          state: formData.state.trim() || null,
          preferred_language:
            formData.preferred_language.trim(),
          education_work_status:
            formData.education_work_status.trim() || null,
          bio: formData.bio.trim() || null,
        },
      });

      await refreshUser();

      setEditing(false);
      setMsg('Profile updated successfully.');
    } catch (err: any) {
      setError(
        err.message ||
          'Failed to update profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * Backend role values:
   * LEARNER
   * KNOWLEDGE_SHARER
   * ADMIN
   * PARTNER
   */
  const roleLabel =
    user?.role === 'KNOWLEDGE_SHARER'
      ? 'Knowledge Sharer'
      : user?.role === 'LEARNER'
        ? 'Learner'
        : user?.role || 'Member';

  const emailVerified =
    (user as any)?.is_email_verified ??
    (user as any)?.email_verified ??
    false;

  const trustScore =
    (user as any)?.trust_score;

  const reliabilityScore =
    (user as any)?.reliability_score;

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
              {user?.full_name || 'LearnX Member'}
            </h1>

            <p className="text-xs text-slate-400 mt-0.5">
              {user?.email || 'Email unavailable'} · Role:{' '}
              <span className="text-cyan-400 font-semibold">
                {roleLabel}
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (editing) {
              handleCancel();
            } else {
              setMsg('');
              setError('');
              setEditing(true);
            }
          }}
          className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          {editing ? (
            <X className="h-3.5 w-3.5" />
          ) : (
            <Edit3 className="h-3.5 w-3.5" />
          )}

          <span>
            {editing ? 'Cancel' : 'Edit Profile'}
          </span>
        </button>
      </div>

      {/* Success Message */}
      {msg && (
        <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-xs">
          {msg}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-950/40 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Personal Information */}
        <div className="md:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <h2 className="text-sm font-bold text-white font-['Space_Grotesk']">
              Personal Information
            </h2>

            {editing ? (
              <form
                onSubmit={handleSave}
                className="space-y-4 text-xs"
              >
                {/* Full Name */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Full Name *
                  </label>

                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        full_name: e.target.value,
                      })
                    }
                    required
                    autoComplete="name"
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* City + State */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      City
                    </label>

                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          city: e.target.value,
                        })
                      }
                      autoComplete="address-level2"
                      placeholder="Optional"
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      State
                    </label>

                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          state: e.target.value,
                        })
                      }
                      autoComplete="address-level1"
                      placeholder="Optional"
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Language + Education */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Preferred Language *
                    </label>

                    <input
                      type="text"
                      value={formData.preferred_language}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          preferred_language:
                            e.target.value,
                        })
                      }
                      required
                      placeholder="English"
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Education / Work Status
                    </label>

                    <input
                      type="text"
                      value={
                        formData.education_work_status
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          education_work_status:
                            e.target.value,
                        })
                      }
                      placeholder="e.g. Student, Developer"
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Bio
                  </label>

                  <textarea
                    rows={4}
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bio: e.target.value,
                      })
                    }
                    placeholder="Tell other LearnX members a little about yourself..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-semibold text-xs shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />

                    <span>
                      {saving
                        ? 'Saving...'
                        : 'Save Profile'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-5 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Location */}
                <div>
                  <span className="text-slate-500 block mb-0.5">
                    Location
                  </span>

                  <span className="text-white font-medium">
                    {user?.city
                      ? `${user.city}${user.state ? `, ${user.state}` : ''}`
                      : 'Not specified'}
                  </span>
                </div>

                {/* Language */}
                <div>
                  <span className="text-slate-500 block mb-0.5">
                    Preferred Language
                  </span>

                  <span className="text-white font-medium">
                    {user?.preferred_language ||
                      'English'}
                  </span>
                </div>

                {/* Education */}
                <div>
                  <span className="text-slate-500 block mb-0.5">
                    Education / Work Status
                  </span>

                  <span className="text-white font-medium">
                    {(user as any)
                      ?.education_work_status ||
                      (user as any)?.education_status ||
                      'Not specified'}
                  </span>
                </div>

                {/* Email */}
                <div>
                  <span className="text-slate-500 block mb-0.5">
                    Email
                  </span>

                  <span className="text-white font-medium break-all">
                    {user?.email || 'Not available'}
                  </span>
                </div>

                {/* Bio */}
                <div className="sm:col-span-2 pt-2 border-t border-slate-800/60">
                  <span className="text-slate-500 block mb-0.5">
                    Bio
                  </span>

                  <p className="text-slate-300 leading-relaxed">
                    {user?.bio ||
                      'No bio added yet.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trust & Verification */}
        <div className="space-y-4">
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <h3 className="text-sm font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-cyan-400" />
              Trust & Verification
            </h3>

            <div className="space-y-3 text-xs">
              {/* Trust Score */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">
                  Trust Score
                </span>

                <span className="text-cyan-400 font-extrabold text-sm">
                  {trustScore ?? '—'}
                  {trustScore !== undefined &&
                  trustScore !== null
                    ? '%'
                    : ''}
                </span>
              </div>

              {/* Reliability */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">
                  Reliability Score
                </span>

                <span className="text-emerald-400 font-extrabold text-sm">
                  {reliabilityScore ?? '—'}
                  {reliabilityScore !== undefined &&
                  reliabilityScore !== null
                    ? '%'
                    : ''}
                </span>
              </div>

              {/* Email Verification */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">
                  Email Verification
                </span>

                {emailVerified ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified
                  </span>
                ) : (
                  <span className="text-amber-400 font-semibold">
                    Not Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* LearnX Profile Info */}
          <div className="p-5 rounded-2xl border border-cyan-800/30 bg-cyan-950/20">
            <h3 className="text-xs font-bold text-cyan-300 mb-2">
              LearnX Profile
            </h3>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Your profile information helps LearnX
              match you with relevant learners and
              knowledge sharers. Keep your skills and
              learning goals updated from the relevant
              LearnX sections.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}