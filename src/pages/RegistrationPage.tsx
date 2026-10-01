
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
    <main className="mx-auto flex min-h-[75vh] max-w-4xl items-center px-4 py-12 sm:px-6">
      <div className="w-full space-y-8">
        <header className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-lg font-extrabold text-white">
            LX
          </div>

          <p className="text-xs font-semibold uppercase text-cyan-300">
            Join LearnX
          </p>

          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            Choose how you want to participate
          </h1>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate('/register/learner')}
            className="group flex min-h-52 flex-col items-start rounded-xl border border-slate-700 bg-slate-900/70 p-6 text-left transition-colors hover:border-cyan-500/70 hover:bg-slate-900"
          >
            <BookOpen className="h-6 w-6 text-cyan-300" />

            <span className="mt-4 text-lg font-bold text-white">
              Join as Learner
            </span>

            <span className="mt-2 text-sm text-slate-300">
              Learn skills from other members and use Time Credits to access
              learning sessions.
            </span>

            <span className="mt-auto pt-5 text-xs font-semibold text-cyan-300">
              New Learners receive 5 Time Credits{' '}
              <ArrowRight className="ml-1 inline h-4 w-4" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/register/mentor')}
            className="group flex min-h-52 flex-col items-start rounded-xl border border-slate-700 bg-slate-900/70 p-6 text-left transition-colors hover:border-emerald-500/70 hover:bg-slate-900"
          >
            <BriefcaseBusiness className="h-6 w-6 text-emerald-300" />

            <span className="mt-4 text-lg font-bold text-white">
              Join as Mentor / Knowledge Sharer
            </span>

            <span className="mt-2 text-sm text-slate-300">
              Share your skills with learners and earn Time Credits through
              verified sessions.
            </span>

            <span className="mt-auto pt-5 text-xs font-semibold text-emerald-300">
              Start with 0 Time Credits{' '}
              <ArrowRight className="ml-1 inline h-4 w-4" />
            </span>
          </button>
        </div>

        <p className="text-center text-xs text-slate-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="font-semibold text-cyan-300 hover:text-white"
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
    authenticated: boolean;
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

  useEffect(() => {
    if (!registration) return;

    const destination = registration.authenticated
      ? '/onboarding'
      : `/login?registered=1&email=${encodeURIComponent(values.email)}`;

    const timeout = window.setTimeout(() => {
      navigate(destination);
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [registration, navigate, values.email]);

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
        authenticated: result.authenticated,
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
      <main className="mx-auto flex min-h-[75vh] max-w-xl items-center px-4 py-12">
        <section className="w-full space-y-4 rounded-xl border border-emerald-800/50 bg-slate-900/70 p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" />

          <h1 className="text-xl font-bold text-white">
            Registration Successful!
          </h1>

          {learner ? (
            <>
              <p className="text-sm text-slate-200">
                Welcome to LearnX!
              </p>

              <p className="text-sm font-bold text-emerald-300">
                You received: +{registration.welcome_bonus} Time Credits
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-200">
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

          <p className="text-xs text-slate-400">
            {registration.authenticated
              ? 'Taking you to onboarding...'
              : 'Account created. Taking you to sign in...'}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/register')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Registration options
        </button>

        <span className="rounded-md border border-slate-700 px-2.5 py-1 text-[10px] font-semibold uppercase text-slate-300">
          {learner ? 'Learner' : 'Mentor'}
        </span>
      </div>

      <header className="mb-6 space-y-2">
        <p className="text-xs font-semibold uppercase text-cyan-300">
          Registration
        </p>

        <h1 className="text-2xl font-bold text-white">
          {learner
            ? 'Join as a Learner'
            : 'Join as a Mentor / Knowledge Sharer'}
        </h1>

        <p className="text-sm text-slate-300">
          {learner
            ? 'Learn skills from other members and use Time Credits to access learning sessions.'
            : 'Share your knowledge with learners and earn Time Credits through verified learning sessions.'}
        </p>
      </header>

      {learner ? (
        <p className="mb-5 rounded-lg border border-amber-700/50 bg-amber-950/30 p-3 text-xs font-semibold text-amber-200">
          🎁 New Learners receive 5 Time Credits as a one-time welcome bonus.
        </p>
      ) : (
        <p className="mb-5 rounded-lg border border-emerald-800/50 bg-emerald-950/20 p-3 text-xs text-emerald-200">
          Mentors start with 0 Time Credits and earn credits through verified
          sessions. Select the skills you will share below.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-rose-800/50 bg-rose-950/30 p-3 text-xs text-rose-200"
        >
          {error}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:grid-cols-2 sm:p-7"
      >
        <label className="text-xs font-semibold text-slate-300">
          Full Name *
          <span className="relative mt-1.5 block">
            <UserRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />

            <input
              required
              name="full_name"
              autoComplete="name"
              value={values.full_name}
              onChange={update}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white"
            />
          </span>
        </label>

        <label className="text-xs font-semibold text-slate-300">
          Email *
          <span className="relative mt-1.5 block">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />

            <input
              required
              type="email"
              name="email"
              autoComplete="email"
              value={values.email}
              onChange={update}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white"
            />
          </span>
        </label>

        <label className="text-xs font-semibold text-slate-300">
          Password *
          <span className="relative mt-1.5 block">
            <LockKeyhole className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />

            <input
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              name="password"
              value={values.password}
              onChange={update}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white"
            />
          </span>

          <span className="mt-1 block text-[10px] font-normal text-slate-500">
            8+ characters, uppercase, lowercase, number, and special
            character.
          </span>
        </label>

        <label className="text-xs font-semibold text-slate-300">
          Confirm Password *
          <span className="relative mt-1.5 block">
            <LockKeyhole className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />

            <input
              required
              type="password"
              autoComplete="new-password"
              name="confirm_password"
              value={values.confirm_password}
              onChange={update}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white"
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
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
          >
            {[
              'Under 18',
              '18-24',
              '25-34',
              '35-44',
              '45-54',
              '55+',
            ].map((age) => (
              <option key={age}>{age}</option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold text-slate-300">
          Preferred Language *
          <span className="relative mt-1.5 block">
            <Globe2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />

            <select
              required
              name="preferred_language"
              value={values.preferred_language}
              onChange={update}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white"
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
                <option key={language}>{language}</option>
              ))}
            </select>
          </span>
        </label>

        <label className="text-xs font-semibold text-slate-300">
          City
          <span className="relative mt-1.5 block">
            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />

            <input
              name="city"
              autoComplete="address-level2"
              value={values.city}
              onChange={update}
              placeholder="Optional"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-600"
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
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
          />
        </label>

        <label className="text-xs font-semibold text-slate-300 sm:col-span-2">
          Education / Work Status *
          <span className="relative mt-1.5 block">
            <BriefcaseBusiness className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />

            <select
              required
              name="education_work_status"
              value={values.education_work_status}
              onChange={update}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white"
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
                <option key={status}>{status}</option>
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
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
          />
        </label>

        {!learner && (
          <section className="sm:col-span-2">
            <div className="mb-2">
              <h2 className="text-sm font-bold text-white">
                Skills You Will Share *
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Select one or more skills that you can teach or share with
                other LearnX members.
              </p>
            </div>

            {skillsLoading ? (
              <div className="rounded-lg border border-slate-700 bg-slate-950 p-4 text-center text-xs text-slate-400">
                Loading skills from LearnX...
              </div>
            ) : skills.length === 0 ? (
              <div className="rounded-lg border border-rose-800/50 bg-rose-950/20 p-4 text-xs text-rose-200">
                No active skills are available. Please check that the backend
                and database are connected and that skills exist in the
                database.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {skills.map((skill) => {
                    const selected = selectedSkills.includes(skill.id);

                    return (
                      <label
                        key={skill.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                          selected
                            ? 'border-emerald-500/70 bg-emerald-950/30'
                            : 'border-slate-800 bg-slate-900/50 hover:border-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSkill(skill.id)}
                          className="mt-0.5 h-4 w-4 accent-emerald-500"
                        />

                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-white">
                            {skill.name}
                          </span>

                          {skill.category && (
                            <span className="mt-0.5 block text-[10px] text-slate-500">
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

            <p className="mt-2 text-[10px] text-slate-500">
              Selected skills: {selectedSkills.length}
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
            className="mt-0.5 h-4 w-4 accent-cyan-500"
          />

          <span>
            I have read and agree to the LearnX{' '}
            <button
              type="button"
              onClick={() => navigate('/terms')}
              className="font-semibold text-cyan-300 underline"
            >
              Terms & Conditions
            </button>{' '}
            and{' '}
            <button
              type="button"
              onClick={() => navigate('/privacy')}
              className="font-semibold text-cyan-300 underline"
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
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white hover:from-cyan-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
        >
          {loading ? 'Creating account...' : 'Register'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-slate-400">
        Already registered?{' '}
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="font-semibold text-cyan-300 hover:text-white"
        >
          Sign in
        </button>
      </p>
    </main>
  );
}
