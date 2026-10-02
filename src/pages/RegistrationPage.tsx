import React, { useEffect, useState } from 'react';

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  Globe2,
  LockKeyhole,
  Mail,
  MapPin,
  UserRound,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';

type RegistrationRole = 'LEARNER' | 'MENTOR';

type Skill = {
  id: string;
  name: string;
  category?: string | null;
};

export function RegistrationPage({
  role,
  navigate,
}: {
  role?: RegistrationRole;
  navigate: (path: string) => void;
}) {
  if (!role) {
    return <RegistrationChooser navigate={navigate} />;
  }

  return <RegistrationForm role={role} navigate={navigate} />;
}

function RegistrationChooser({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  return (
    <main className="mx-auto flex min-h-[75vh] max-w-4xl items-center px-4 py-12 sm:px-6 bg-[#0B0F14]">
      <div className="w-full space-y-8">
        <header className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#4169E1] to-[#123A8C] text-lg font-extrabold text-white shadow-lg shadow-[#4169E1]/25 border border-[#4169E1]/40">
            LX
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider text-[#4169E1]">
            Join LearnX
          </p>

          <h1 className="mt-2 text-2xl sm:text-4xl font-bold text-white font-['Space_Grotesk']">
            Choose how you want to participate
          </h1>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate('/register/learner')}
            className="group flex min-h-56 flex-col items-start rounded-2xl border border-[#2F3338] bg-[#121720]/80 p-7 text-left transition-all hover:border-[#4169E1]/60 hover:bg-[#121720] hover:shadow-[0_4px_24px_rgba(18,58,140,0.25)] backdrop-blur-md"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#123A8C]/25 text-[#4169E1] border border-[#4169E1]/30 mb-2">
              <BookOpen className="h-5 w-5" />
            </div>

            <span className="mt-3 text-lg font-bold text-white font-['Space_Grotesk']">
              Join as Learner
            </span>

            <span className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
              Learn skills from other members and use Time Credits to access
              learning sessions.
            </span>

            <span className="mt-auto pt-6 text-xs font-semibold text-[#4169E1] group-hover:text-blue-300 flex items-center gap-1.5 transition-colors">
              New Learners receive 5 Time Credits{' '}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/register/mentor')}
            className="group flex min-h-56 flex-col items-start rounded-2xl border border-[#2F3338] bg-[#121720]/80 p-7 text-left transition-all hover:border-[#4169E1]/60 hover:bg-[#121720] hover:shadow-[0_4px_24px_rgba(18,58,140,0.25)] backdrop-blur-md"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#123A8C]/25 text-[#4169E1] border border-[#4169E1]/30 mb-2">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>

            <span className="mt-3 text-lg font-bold text-white font-['Space_Grotesk']">
              Join as Mentor / Knowledge Sharer
            </span>

            <span className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
              Share your skills with learners and earn Time Credits through
              verified sessions.
            </span>

            <span className="mt-auto pt-6 text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 flex items-center gap-1.5 transition-colors">
              Start with 0 Time Credits{' '}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </div>

        <p className="text-center text-xs text-slate-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="font-semibold text-[#4169E1] hover:text-blue-300 hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </main>
  );
}

function RegistrationForm({
  role,
  navigate,
}: {
  role: RegistrationRole;
  navigate: (path: string) => void;
}) {
  const { register } = useAuth();

  const learner = role === 'LEARNER';

  const [values, setValues] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    age_group: '18-24',
    city: '',
    state: '',
    preferred_language: 'English',
    education_work_status: 'College Student',
    profile_photo_url: '',
    terms_accepted: false,
  });

  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [registration, setRegistration] = useState<{
    welcome_bonus: number;
    balance: number;
  } | null>(null);

  const strongPassword =
    values.password.length >= 8 &&
    /[A-Z]/.test(values.password) &&
    /[a-z]/.test(values.password) &&
    /\d/.test(values.password) &&
    /[^A-Za-z0-9]/.test(values.password);

  useEffect(() => {
    if (learner) {
      setSkills([]);
      setSelectedSkills([]);
      return;
    }

    let cancelled = false;

    async function loadSkills() {
      setSkillsLoading(true);
      setError('');

      try {
        const result = await apiRequest<Skill[]>('/skills');

        if (!cancelled) {
          setSkills(Array.isArray(result) ? result : []);
        }
      } catch (cause: any) {
        if (!cancelled) {
          setError(
            cause?.message ||
              'Unable to load skills. Please check the backend connection.'
          );
        }
      } finally {
        if (!cancelled) {
          setSkillsLoading(false);
        }
      }
    }

    void loadSkills();

    return () => {
      cancelled = true;
    };
  }, [learner]);

  const requiredFieldsValid = Boolean(
    values.full_name.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()) &&
      values.confirm_password &&
      values.age_group &&
      values.preferred_language &&
      values.education_work_status &&
      values.terms_accepted &&
      (learner || selectedSkills.length > 0)
  );


  const update = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = event.target;

    setValues((current) => ({
      ...current,
      [target.name]:
        target instanceof HTMLInputElement && target.type === 'checkbox'
          ? target.checked
          : target.value,
    }));
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkills((current) =>
      current.includes(skillId)
        ? current.filter((id) => id !== skillId)
        : [...current, skillId]
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!values.password.trim()) {
      setError('Please enter a password.');
      return;
    }

    if (values.password !== values.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    if (!strongPassword) {
      setError(
        'Use at least 8 characters with uppercase, lowercase, number, and special character.'
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!values.terms_accepted) {
      setError(
        'Please accept the Terms & Conditions and Privacy Policy to continue.'
      );
      return;
    }

    if (!learner && selectedSkills.length === 0) {
      setError('Please select at least one skill you will share.');
      return;
    }

    if (!learner && skillsLoading) {
      setError('Please wait until the skill list finishes loading.');
      return;
    }

    setLoading(true);

    try {
      const {
        confirm_password: _confirmPassword,
        terms_accepted: _termsAccepted,
        ...accountData
      } = values;

      const result = await register(
        {
          ...accountData,
          role,
          ...(learner
            ? {}
            : {
                skills_to_share: selectedSkills,
              }),
        },
        role
      );

      setRegistration({
        welcome_bonus: result.welcome_bonus,
        balance: result.balance,
      });
    } catch (cause: any) {
      setError(
        cause?.message || 'Registration failed. Please check your details.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (registration) {
    return (
      <main className="mx-auto flex min-h-[75vh] max-w-xl items-center px-4 py-12 bg-[#0B0F14]">
        <section className="w-full space-y-4 rounded-2xl border border-emerald-800/60 bg-[#121720]/90 p-8 text-center shadow-2xl backdrop-blur-md">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />

          <h1 className="text-xl sm:text-2xl font-bold text-white font-['Space_Grotesk']">
            Registration Successful!
          </h1>

          {learner ? (
            <>
              <p className="text-sm text-slate-300">
                Welcome to LearnX!
              </p>

              <p className="text-sm font-bold text-emerald-400">
                You received: +{registration.welcome_bonus} Time Credits
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-300">
                Welcome to LearnX as a Mentor / Knowledge Sharer.
              </p>

              <p className="text-sm text-slate-300">
                Your starting Time Credit balance:{' '}
                <strong className="text-white">
                  {registration.balance}
                </strong>
              </p>
            </>
          )}

          
<button
  type="button"
  onClick={() => navigate('/login')}
  className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[#4169E1] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#123A8C]"
>
  Go to Login
  <ArrowRight className="h-4 w-4" />
</button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 bg-[#0B0F14]">
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/register')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Registration options
        </button>

        <span className="rounded-full border border-[#2F3338] bg-[#123A8C]/25 px-3 py-1 text-xs font-semibold uppercase text-blue-300">
          {learner ? 'Learner' : 'Mentor'}
        </span>
      </div>

      <header className="mb-6 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#4169E1]">
          Registration
        </p>

        <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk']">
          {learner
            ? 'Join as a Learner'
            : 'Join as a Mentor / Knowledge Sharer'}
        </h1>

        <p className="text-xs sm:text-sm text-slate-300">
          {learner
            ? 'Learn skills from other members and use Time Credits to access learning sessions.'
            : 'Share your knowledge with learners and earn Time Credits through verified learning sessions.'}
        </p>
      </header>

      {learner ? (
        <div className="mb-6 rounded-xl border border-[#4169E1]/30 bg-[#123A8C]/20 p-3.5 text-xs font-semibold text-blue-200 backdrop-blur-sm">
          🎁 New Learners receive 5 Time Credits as a one-time welcome bonus.
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-3.5 text-xs text-emerald-200 backdrop-blur-sm">
          Mentors start with 0 Time Credits and earn credits through verified
          sessions. Select the skills you will share below.
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-rose-800/60 bg-rose-950/40 p-3.5 text-xs text-rose-300 backdrop-blur-sm"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4.5 rounded-2xl border border-[#2F3338] bg-[#121720]/80 p-6 sm:grid-cols-2 sm:p-8 backdrop-blur-md shadow-2xl"
      >
        <label className="text-xs font-semibold text-slate-300">
          Full Name *
          <span className="relative mt-1.5 block">
            <UserRound className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />

            <input
              required
              name="full_name"
              autoComplete="name"
              value={values.full_name}
              onChange={update}
              placeholder="e.g. Alex Johnson"
              className="w-full rounded-xl border border-[#2F3338] bg-[#0B0F14] py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-all"
            />
          </span>
        </label>

        <label className="text-xs font-semibold text-slate-300">
          Email *
          <span className="relative mt-1.5 block">
            <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />

            <input
              required
              type="email"
              name="email"
              autoComplete="email"
              value={values.email}
              onChange={update}
              placeholder="name@example.com"
              className="w-full rounded-xl border border-[#2F3338] bg-[#0B0F14] py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-all"
            />
          </span>
        </label>

        <label className="text-xs font-semibold text-slate-300">
          Password *
          <span className="relative mt-1.5 block">
            <LockKeyhole className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />

            <input
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              name="password"
              value={values.password}
              onChange={update}
              placeholder="••••••••"
              className="w-full rounded-xl border border-[#2F3338] bg-[#0B0F14] py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-all"
            />
          </span>

          <span className="mt-1 block text-[10px] font-normal text-slate-400">
            8+ characters, uppercase, lowercase, number, and special character.
          </span>
        </label>

        <label className="text-xs font-semibold text-slate-300">
          Confirm Password *
          <span className="relative mt-1.5 block">
            <LockKeyhole className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />

            <input
              required
              type="password"
              autoComplete="new-password"
              name="confirm_password"
              value={values.confirm_password}
              onChange={update}
              placeholder="••••••••"
              className="w-full rounded-xl border border-[#2F3338] bg-[#0B0F14] py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-all"
            />
          </span>
        </label>

        <label className="text-xs font-semibold text-slate-300">
          Age Group *
          <select
            required
            name="age_group"
            value={values.age_group}
            onChange={update}
            className="mt-1.5 w-full rounded-xl border border-[#2F3338] bg-[#0B0F14] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-all"
          >
            {[
              'Under 18',
              '18-24',
              '25-34',
              '35-44',
              '45-54',
              '55+',
            ].map((age) => (
              <option key={age} value={age} className="bg-[#0B0F14] text-white">{age}</option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold text-slate-300">
          Preferred Language *
          <span className="relative mt-1.5 block">
            <Globe2 className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />

            <select
              required
              name="preferred_language"
              value={values.preferred_language}
              onChange={update}
              className="w-full rounded-xl border border-[#2F3338] bg-[#0B0F14] py-2.5 pl-10 pr-3.5 text-xs text-white focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-all"
            >
              {[
                'English',
                'Tamil',
                'Hindi',
                'Telugu',
                'Malayalam',
                'Kannada',
                'Other',
              ].map((language) => (
                <option key={language} value={language} className="bg-[#0B0F14] text-white">{language}</option>
              ))}
            </select>
          </span>
        </label>

        <label className="text-xs font-semibold text-slate-300">
          City
          <span className="relative mt-1.5 block">
            <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />

            <input
              name="city"
              autoComplete="address-level2"
              value={values.city}
              onChange={update}
              placeholder="Optional"
              className="w-full rounded-xl border border-[#2F3338] bg-[#0B0F14] py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-all"
            />
          </span>
        </label>

        <label className="text-xs font-semibold text-slate-300">
          State
          <input
            name="state"
            autoComplete="address-level1"
            value={values.state}
            onChange={update}
            placeholder="Optional"
            className="mt-1.5 w-full rounded-xl border border-[#2F3338] bg-[#0B0F14] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-all"
          />
        </label>

        <label className="text-xs font-semibold text-slate-300 sm:col-span-2">
          Education / Work Status *
          <span className="relative mt-1.5 block">
            <BriefcaseBusiness className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />

            <select
              required
              name="education_work_status"
              value={values.education_work_status}
              onChange={update}
              className="w-full rounded-xl border border-[#2F3338] bg-[#0B0F14] py-2.5 pl-10 pr-3.5 text-xs text-white focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-all"
            >
              {[
                'School Student',
                'College Student',
                'Graduate',
                'Working Professional',
                'Self-Employed',
                'Job Seeker',
                'Other',
              ].map((status) => (
                <option key={status} value={status} className="bg-[#0B0F14] text-white">{status}</option>
              ))}
            </select>
          </span>
        </label>

        <label className="text-xs font-semibold text-slate-300 sm:col-span-2">
          Profile Photo URL{' '}
          <span className="text-[10px] font-normal text-slate-500">
            Optional
          </span>

          <input
            type="url"
            name="profile_photo_url"
            value={values.profile_photo_url}
            onChange={update}
            placeholder="https://..."
            className="mt-1.5 w-full rounded-xl border border-[#2F3338] bg-[#0B0F14] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-all"
          />
        </label>

        {!learner && (
          <section className="sm:col-span-2">
            <div className="mb-2.5">
              <h2 className="text-sm font-bold text-white font-['Space_Grotesk']">
                Skills You Will Share *
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Select one or more skills that you can teach or share with
                other LearnX members.
              </p>
            </div>

            {skillsLoading ? (
              <div className="rounded-xl border border-[#2F3338] bg-[#0B0F14] p-4 text-center text-xs text-slate-400 animate-pulse">
                Loading skills from LearnX...
              </div>
            ) : skills.length === 0 ? (
              <div className="rounded-xl border border-rose-800/60 bg-rose-950/30 p-4 text-xs text-rose-300">
                No active skills are available. Please check that the backend
                and database are connected and that skills exist in the
                database.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-xl border border-[#2F3338] bg-[#0B0F14] p-3">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {skills.map((skill) => {
                    const selected = selectedSkills.includes(skill.id);

                    return (
                      <label
                        key={skill.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                          selected
                            ? 'border-[#4169E1] bg-[#123A8C]/25 text-white shadow-xs'
                            : 'border-[#2F3338] bg-[#121720]/60 hover:border-slate-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSkill(skill.id)}
                          className="mt-0.5 h-4 w-4 accent-[#4169E1]"
                        />

                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-white">
                            {skill.name}
                          </span>

                          {skill.category && (
                            <span className="mt-0.5 block text-[10px] text-slate-400">
                              {skill.category}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="mt-2 text-[10px] text-slate-400 font-medium">
              Selected skills: <span className="text-[#4169E1] font-semibold">{selectedSkills.length}</span>
            </p>
          </section>
        )}

        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-300 sm:col-span-2">
          <input
            required
            type="checkbox"
            name="terms_accepted"
            checked={values.terms_accepted}
            onChange={update}
            className="mt-0.5 h-4 w-4 accent-[#4169E1]"
          />

          <span>
            I have read and agree to the LearnX{' '}
            <button
              type="button"
              onClick={() => navigate('/terms')}
              className="font-semibold text-[#4169E1] hover:text-blue-300 underline"
            >
              Terms & Conditions
            </button>{' '}
            and{' '}
            <button
              type="button"
              onClick={() => navigate('/privacy')}
              className="font-semibold text-[#4169E1] hover:text-blue-300 underline"
            >
              Privacy Policy
            </button>
            .
          </span>
        </label>

        <button
          type="submit"
          disabled={
            loading ||
            skillsLoading ||
            !requiredFieldsValid ||
            !strongPassword ||
            values.password !== values.confirm_password
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4169E1] to-[#123A8C] px-5 py-3 text-xs font-semibold text-white shadow-md shadow-[#4169E1]/20 hover:from-[#5278ef] hover:to-[#1746a2] disabled:cursor-not-allowed disabled:opacity-50 transition-all sm:col-span-2"
        >
          {loading ? 'Creating account...' : 'Register'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-400">
        Already registered?{' '}
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="font-semibold text-[#4169E1] hover:text-blue-300 hover:underline"
        >
          Sign in
        </button>
      </p>
    </main>
  );
}
