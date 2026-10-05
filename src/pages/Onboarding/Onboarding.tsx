import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { learnxApi } from '../../services/learnx';
import { User, MapPin, Globe, BookOpen, Share2, ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

export const Onboarding: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [skills, setSkills] = useState<any[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile fields
  const [profileData, setProfileData] = useState({
    full_name: user?.user_metadata?.full_name || '',
    age_group: user?.user_metadata?.age_group || '18-24',
    city: user?.user_metadata?.city || '',
    state: user?.user_metadata?.state || '',
    preferred_language: user?.user_metadata?.preferred_language || 'English',
    education_work_status: 'STUDENT',
    bio: '',
  });

  // Learn skills: array of { skill_id, skill_level }
  const [learnSkills, setLearnSkills] = useState<{ skill_id: string; skill_level: string }[]>([
    { skill_id: '', skill_level: 'BEGINNER' },
  ]);

  // Share skills: array of { skill_id, skill_level }
  const [shareSkills, setShareSkills] = useState<{ skill_id: string; skill_level: string }[]>([
    { skill_id: '', skill_level: 'INTERMEDIATE' },
  ]);

  useEffect(() => {
    learnxApi.getSkills()
      .then((data) => {
        setSkills(data);
        if (data.length > 0) {
          if (!learnSkills[0].skill_id) learnSkills[0].skill_id = data[0].id;
          if (!shareSkills[0].skill_id) shareSkills[0].skill_id = data[0].id;
        }
      })
      .catch((err) => console.error('Error loading skills:', err))
      .finally(() => setLoadingSkills(false));
  }, []);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Filter out empty skill selections
      const validLearn = learnSkills.filter((s) => s.skill_id);
      const validShare = shareSkills.filter((s) => s.skill_id);

      if (validLearn.length === 0 || validShare.length === 0) {
        throw new Error('Please select at least one skill to learn and one skill to share.');
      }

      await learnxApi.completeOnboarding(profileData, validLearn, validShare);
      await learnxApi.ensureWallet();
      await refreshProfile();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-violet-50 flex items-center justify-center p-4 py-12">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8">
        {/* Header & Steps progress */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold flex items-center justify-center shadow-md">
                LX
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900">Welcome to LearnX</h1>
                <p className="text-xs text-slate-500">Complete your profile to start exchanging knowledge</p>
              </div>
            </div>
            <div className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              Step {step} of 3
            </div>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl font-medium">
            {error}
          </div>
        )}

        {loadingSkills ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm text-slate-600 font-medium">Loading skills from database...</p>
          </div>
        ) : (
          <form onSubmit={handleComplete} className="space-y-6">
            {/* Step 1: Profile */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in">
                <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                  <User className="w-5 h-5 text-indigo-600" />
                  <span>Your Profile Information</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Age Group *
                    </label>
                    <select
                      value={profileData.age_group}
                      onChange={(e) => setProfileData({ ...profileData, age_group: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    >
                      <option value="18-24">18-24</option>
                      <option value="25-34">25-34</option>
                      <option value="35-44">35-44</option>
                      <option value="45-54">45-54</option>
                      <option value="55+">55+</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={profileData.city}
                      onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={profileData.state}
                      onChange={(e) => setProfileData({ ...profileData, state: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Status
                    </label>
                    <select
                      value={profileData.education_work_status}
                      onChange={(e) => setProfileData({ ...profileData, education_work_status: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    >
                      <option value="STUDENT">Student</option>
                      <option value="PROFESSIONAL">Professional</option>
                      <option value="EDUCATOR">Educator</option>
                      <option value="FREELANCER">Freelancer</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Preferred Language
                  </label>
                  <select
                    value={profileData.preferred_language}
                    onChange={(e) => setProfileData({ ...profileData, preferred_language: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="English">English</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Telugu">Telugu</option>
                    <option value="Malayalam">Malayalam</option>
                    <option value="Kannada">Kannada</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Short Bio
                  </label>
                  <textarea
                    rows={3}
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    placeholder="Tell us a bit about your background and what you love learning..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Learn Skills */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in">
                <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <span>What Do You Want to Learn?</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Select skills you want to acquire from community experts.
                </p>

                {learnSkills.map((item, idx) => (
                  <div key={idx} className="flex space-x-3 items-center">
                    <select
                      value={item.skill_id}
                      onChange={(e) => {
                        const updated = [...learnSkills];
                        updated[idx].skill_id = e.target.value;
                        setLearnSkills(updated);
                      }}
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    >
                      {skills.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.category})
                        </option>
                      ))}
                    </select>

                    <select
                      value={item.skill_level}
                      onChange={(e) => {
                        const updated = [...learnSkills];
                        updated[idx].skill_level = e.target.value;
                        setLearnSkills(updated);
                      }}
                      className="w-36 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    >
                      <option value="BEGINNER">Beginner</option>
                      <option value="ELEMENTARY">Elementary</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* Step 3: Share Skills */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in">
                <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                  <Share2 className="w-5 h-5 text-indigo-600" />
                  <span>What Can You Share?</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Select skills you can teach to earn Time Credits (+1 credit per hour).
                </p>

                {shareSkills.map((item, idx) => (
                  <div key={idx} className="flex space-x-3 items-center">
                    <select
                      value={item.skill_id}
                      onChange={(e) => {
                        const updated = [...shareSkills];
                        updated[idx].skill_id = e.target.value;
                        setShareSkills(updated);
                      }}
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    >
                      {skills.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.category})
                        </option>
                      ))}
                    </select>

                    <select
                      value={item.skill_level}
                      onChange={(e) => {
                        const updated = [...shareSkills];
                        updated[idx].skill_level = e.target.value;
                        setShareSkills(updated);
                      }}
                      className="w-36 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    >
                      <option value="BEGINNER">Beginner</option>
                      <option value="ELEMENTARY">Elementary</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm flex items-center space-x-2 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm flex items-center space-x-2 shadow-md transition-all ml-auto"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl text-sm flex items-center space-x-2 shadow-md transition-all ml-auto disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Completing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Start Learning</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
