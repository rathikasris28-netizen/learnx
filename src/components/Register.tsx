import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Globe2,
  GraduationCap,
  Lightbulb,
  Plus,
  UserRound,
  X,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';

type SkillLevel =
  | 'BEGINNER'
  | 'ELEMENTARY'
  | 'INTERMEDIATE'
  | 'ADVANCED';

type Skill = {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  isActive?: boolean;
};

type LearnSkillSelection = {
  skill_id: string;
  name: string;
  level: SkillLevel;
};

type ShareSkillSelection = {
  skill_id: string;
  name: string;
  level: SkillLevel;
  experience: string;
  languages: string[];
  description: string;
  beginner_friendly: boolean;
  skill_proof: string;
};

type AiSuggestion = {
  skill_id: string;
  name: string;
  reason?: string;
  confidence?: number;
};

type OnboardingAvailability = {
  status: 'ACTIVE' | 'INACTIVE';
  available_from: string;
  available_until: string;
  timezone: string;
};

const SKILL_LEVELS: Array<{
  value: SkillLevel;
  label: string;
}> = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'ELEMENTARY', label: 'Elementary' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

const TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Kuala_Lumpur',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
];

const DEFAULT_LANGUAGES = [
  'English',
  'Tamil',
  'Hindi',
  'Telugu',
  'Malayalam',
  'Kannada',
];

export function OnboardingPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const { user, refreshUser } = useAuth();

  const userRole = String(user?.role ?? '').toUpperCase();

  const isMentor =
    userRole === 'KNOWLEDGE_SHARER' || userRole === 'MENTOR';

  const preferredLanguage = String(
  user?.preferred_language ?? 'English'
);
  const [step, setStep] = useState(1);

  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);

  const [learnSkills, setLearnSkills] = useState<LearnSkillSelection[]>([]);
  const [shareSkills, setShareSkills] = useState<ShareSkillSelection[]>([]);

  const [availability, setAvailability] =
    useState<OnboardingAvailability>({
      status: 'ACTIVE',
      available_from: '18:00',
      available_until: '21:00',
      timezone: 'Asia/Kolkata',
    });

  const [bio, setBio] = useState('');
  const [learningGoal, setLearningGoal] = useState('');
  const [targetSkillLevel, setTargetSkillLevel] =
    useState<SkillLevel>('BEGINNER');
  const [learningSchedule, setLearningSchedule] = useState('');
  const [learningInterests, setLearningInterests] = useState('');
  const [language, setLanguage] = useState(preferredLanguage);

  const [experience, setExperience] = useState('');
  const [mentorLanguages, setMentorLanguages] = useState<string[]>(
    preferredLanguage ? [preferredLanguage] : ['English']
  );

  const [aiSuggested, setAiSuggested] = useState<AiSuggestion[]>([]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSkills() {
      setSkillsLoading(true);
      setError('');

      try {
        const result = await apiRequest<Skill[] | { skills?: Skill[] }>(
          '/skills'
        );

        const loadedSkills = Array.isArray(result)
          ? result
          : Array.isArray(result?.skills)
            ? result.skills
            : [];

        if (!cancelled) {
          setSkills(loadedSkills);
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
  }, []);

  useEffect(() => {
    setLanguage(preferredLanguage);

    if (preferredLanguage && mentorLanguages.length === 0) {
      setMentorLanguages([preferredLanguage]);
    }
  }, [preferredLanguage]);

  const selectedLearnSkillIds = useMemo(
    () => new Set(learnSkills.map((skill) => skill.skill_id)),
    [learnSkills]
  );

  const selectedShareSkillIds = useMemo(
    () => new Set(shareSkills.map((skill) => skill.skill_id)),
    [shareSkills]
  );

  const toggleLearnSkill = (skill: Skill) => {
    setLearnSkills((current) => {
      const existing = current.find(
        (item) => item.skill_id === skill.id
      );

      if (existing) {
        return current.filter((item) => item.skill_id !== skill.id);
      }

      return [
        ...current,
        {
          skill_id: skill.id,
          name: skill.name,
          level: 'BEGINNER',
        },
      ];
    });
  };

  const updateLearnSkillLevel = (
    skillId: string,
    level: SkillLevel
  ) => {
    setLearnSkills((current) =>
      current.map((item) =>
        item.skill_id === skillId
          ? {
              ...item,
              level,
            }
          : item
      )
    );
  };

  const toggleShareSkill = (skill: Skill) => {
    setShareSkills((current) => {
      const existing = current.find(
        (item) => item.skill_id === skill.id
      );

      if (existing) {
        return current.filter((item) => item.skill_id !== skill.id);
      }

      return [
        ...current,
        {
          skill_id: skill.id,
          name: skill.name,
          level: 'INTERMEDIATE',
          experience: '',
          languages: preferredLanguage
            ? [preferredLanguage]
            : ['English'],
          description: '',
          beginner_friendly: true,
          skill_proof: '',
        },
      ];
    });
  };

  const updateShareSkill = (
    skillId: string,
    field:
      | 'level'
      | 'experience'
      | 'description'
      | 'skill_proof',
    value: string
  ) => {
    setShareSkills((current) =>
      current.map((item) =>
        item.skill_id === skillId
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const toggleShareSkillLanguage = (
    skillId: string,
    selectedLanguage: string
  ) => {
    setShareSkills((current) =>
      current.map((item) => {
        if (item.skill_id !== skillId) {
          return item;
        }

        const languages = item.languages.includes(selectedLanguage)
          ? item.languages.filter(
              (languageItem) => languageItem !== selectedLanguage
            )
          : [...item.languages, selectedLanguage];

        return {
          ...item,
          languages,
        };
      })
    );
  };

  const toggleBeginnerFriendly = (skillId: string) => {
    setShareSkills((current) =>
      current.map((item) =>
        item.skill_id === skillId
          ? {
              ...item,
              beginner_friendly: !item.beginner_friendly,
            }
          : item
      )
    );
  };

  const toggleMentorLanguage = (selectedLanguage: string) => {
    setMentorLanguages((current) =>
      current.includes(selectedLanguage)
        ? current.filter(
            (languageItem) => languageItem !== selectedLanguage
          )
        : [...current, selectedLanguage]
    );
  };

  const validateAvailability = () => {
    if (!availability.available_from || !availability.available_until) {
      return 'Please select your availability time.';
    }

    if (
      availability.available_from >= availability.available_until
    ) {
      return 'Available from time must be earlier than available until time.';
    }

    if (!availability.timezone) {
      return 'Please select your timezone.';
    }

    return '';
  };

  const validateShareSkills = () => {
    if (!isMentor) {
      return '';
    }

    if (shareSkills.length === 0) {
      return 'Please select at least one skill you will share.';
    }

    for (const skill of shareSkills) {
      if (!skill.experience.trim()) {
        return `Please enter your experience for ${skill.name}.`;
      }

      if (!skill.description.trim()) {
        return `Please describe what you can teach for ${skill.name}.`;
      }

      if (skill.languages.length === 0) {
        return `Please select at least one language for ${skill.name}.`;
      }
    }

    return '';
  };

  const validateLearning = () => {
    if (learnSkills.length === 0) {
      return 'Please select at least one skill you want to learn.';
    }

    if (!learningGoal.trim()) {
      return 'Please enter your learning goal.';
    }

    return '';
  };

  const handleNext = () => {
    setError('');

    if (step === 1) {
      if (isMentor) {
        const shareError = validateShareSkills();

        if (shareError) {
          setError(shareError);
          return;
        }
      } else {
        const learningError = validateLearning();

        if (learningError) {
          setError(learningError);
          return;
        }
      }

      setStep(2);
      return;
    }

    if (step === 2) {
      if (!isMentor) {
        // Sharing is optional for learners.
        setStep(3);
        return;
      }

      // Learning is optional for mentors.
      setStep(3);
    }
  };

  const handleBack = () => {
    setError('');

    if (step <= 1) {
      navigate('/register');
      return;
    }

    setStep((current) => current - 1);
  };

  const handleFinish = async () => {
    setError('');

    const availabilityError = validateAvailability();

    if (availabilityError) {
      setError(availabilityError);
      return;
    }

    const shareError = validateShareSkills();

    if (shareError) {
      setError(shareError);
      return;
    }

    if (!isMentor) {
      const learningError = validateLearning();

      if (learningError) {
        setError(learningError);
        return;
      }
    }

    setLoading(true);

    try {
      await apiRequest('/onboarding', {
        method: 'POST',
        body: {
          learn_skills: learnSkills,
          share_skills: shareSkills,
          availability,
          bio: bio.trim(),
          learning_goal: learningGoal.trim(),
          target_skill_level: targetSkillLevel,
          learning_schedule: learningSchedule.trim(),
          learning_interests: learningInterests.trim(),
          preferred_language: language,
          mentor_experience: experience.trim(),
          mentor_languages: mentorLanguages,
        },
      });

      await refreshUser();

      setCompleted(true);

      window.setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (cause: any) {
      setError(
        cause?.message ||
          'Unable to complete onboarding. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderSkillGrid = (
    type: 'learn' | 'share'
  ) => {
    if (skillsLoading) {
      return (
        <div className="rounded-xl border border-slate-700 bg-slate-950 p-6 text-center text-sm text-slate-400">
          Loading skills from LearnX...
        </div>
      );
    }

    if (skills.length === 0) {
      return (
        <div className="rounded-xl border border-rose-800/50 bg-rose-950/20 p-6 text-sm text-rose-200">
          No active skills are available. Please check the backend and
          database connection.
        </div>
      );
    }

    return (
      <div className="grid max-h-[420px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
        {skills.map((skill) => {
          const selected =
            type === 'learn'
              ? selectedLearnSkillIds.has(skill.id)
              : selectedShareSkillIds.has(skill.id);

          return (
            <button
              key={skill.id}
              type="button"
              onClick={() =>
                type === 'learn'
                  ? toggleLearnSkill(skill)
                  : toggleShareSkill(skill)
              }
              className={`rounded-xl border p-4 text-left transition-colors ${
                selected
                  ? type === 'learn'
                    ? 'border-cyan-500/70 bg-cyan-950/30'
                    : 'border-emerald-500/70 bg-emerald-950/30'
                  : 'border-slate-700 bg-slate-900/60 hover:border-slate-500'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {skill.name}
                  </p>

                  {skill.category && (
                    <p className="mt-1 text-[10px] text-slate-500">
                      {skill.category}
                    </p>
                  )}
                </div>

                {selected && (
                  <CheckCircle2
                    className={`h-5 w-5 shrink-0 ${
                      type === 'learn'
                        ? 'text-cyan-300'
                        : 'text-emerald-300'
                    }`}
                  />
                )}
              </div>

              {skill.description && (
                <p className="mt-2 line-clamp-2 text-xs text-slate-400">
                  {skill.description}
                </p>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const renderLearnSkillDetails = () => {
    if (learnSkills.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-5 text-sm text-slate-500">
          No learning skills selected yet.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {learnSkills.map((skill) => (
          <div
            key={skill.skill_id}
            className="rounded-xl border border-slate-700 bg-slate-900/70 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">
                {skill.name}
              </p>

              <button
                type="button"
                onClick={() => toggleLearnSkill({
                  id: skill.skill_id,
                  name: skill.name,
                })}
                className="text-slate-500 hover:text-white"
                aria-label={`Remove ${skill.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-3 block text-xs font-semibold text-slate-400">
              Current Level
              <select
                value={skill.level}
                onChange={(event) =>
                  updateLearnSkillLevel(
                    skill.skill_id,
                    event.target.value as SkillLevel
                  )
                }
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              >
                {SKILL_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
      </div>
    );
  };

  const renderShareSkillDetails = () => {
    if (shareSkills.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-5 text-sm text-slate-500">
          No sharing skills selected yet.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {shareSkills.map((skill) => (
          <section
            key={skill.skill_id}
            className="rounded-xl border border-emerald-800/50 bg-slate-900/70 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {skill.name}
                </h3>

                <p className="mt-1 text-[10px] text-slate-500">
                  Knowledge sharing details
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  toggleShareSkill({
                    id: skill.skill_id,
                    name: skill.name,
                  })
                }
                className="text-slate-500 hover:text-white"
                aria-label={`Remove ${skill.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-300">
                Your Level *
                <select
                  value={skill.level}
                  onChange={(event) =>
                    updateShareSkill(
                      skill.skill_id,
                      'level',
                      event.target.value
                    )
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
                >
                  {SKILL_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold text-slate-300">
                Experience *
                <input
                  value={skill.experience}
                  onChange={(event) =>
                    updateShareSkill(
                      skill.skill_id,
                      'experience',
                      event.target.value
                    )
                  }
                  placeholder="Example: 2 years"
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
                />
              </label>

              <label className="text-xs font-semibold text-slate-300 sm:col-span-2">
                What can you teach? *
                <textarea
                  value={skill.description}
                  onChange={(event) =>
                    updateShareSkill(
                      skill.skill_id,
                      'description',
                      event.target.value
                    )
                  }
                  rows={3}
                  placeholder={`Describe what you can teach in ${skill.name}...`}
                  className="mt-1.5 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
                />
              </label>

              <div className="sm:col-span-2">
                <p className="text-xs font-semibold text-slate-300">
                  Teaching Languages *
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {DEFAULT_LANGUAGES.map((item) => {
                    const selected = skill.languages.includes(item);

                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() =>
                          toggleShareSkillLanguage(
                            skill.skill_id,
                            item
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          selected
                            ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                            : 'border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="text-xs font-semibold text-slate-300 sm:col-span-2">
                Skill Proof / Certification
                <textarea
                  value={skill.skill_proof}
                  onChange={(event) =>
                    updateShareSkill(
                      skill.skill_id,
                      'skill_proof',
                      event.target.value
                    )
                  }
                  rows={2}
                  placeholder="Optional: certificate, project, work experience, portfolio, etc."
                  className="mt-1.5 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
                />
              </label>

              <label className="flex items-start gap-2 text-xs text-slate-300 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={skill.beginner_friendly}
                  onChange={() =>
                    toggleBeginnerFriendly(skill.skill_id)
                  }
                  className="mt-0.5 h-4 w-4 accent-emerald-500"
                />

                <span>
                  I can teach this skill to beginners.
                </span>
              </label>
            </div>
          </section>
        ))}
      </div>
    );
  };

  const renderStepThree = () => (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-center gap-3">
          <Clock3 className="h-5 w-5 text-cyan-300" />

          <div>
            <h2 className="text-sm font-bold text-white">
              Availability
            </h2>

            <p className="text-xs text-slate-400">
              Tell LearnX when you are generally available for sessions.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-300">
            Status
            <select
              value={availability.status}
              onChange={(event) =>
                setAvailability((current) => ({
                  ...current,
                  status: event.target.value as
                    | 'ACTIVE'
                    | 'INACTIVE',
                }))
              }
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
            >
              <option value="ACTIVE">Active / Available</option>
              <option value="INACTIVE">Inactive / Unavailable</option>
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-300">
            Timezone
            <select
              value={availability.timezone}
              onChange={(event) =>
                setAvailability((current) => ({
                  ...current,
                  timezone: event.target.value,
                }))
              }
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
            >
              {TIMEZONES.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-300">
            Available From
            <input
              type="time"
              value={availability.available_from}
              onChange={(event) =>
                setAvailability((current) => ({
                  ...current,
                  available_from: event.target.value,
                }))
              }
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
            />
          </label>

          <label className="text-xs font-semibold text-slate-300">
            Available Until
            <input
              type="time"
              value={availability.available_until}
              onChange={(event) =>
                setAvailability((current) => ({
                  ...current,
                  available_until: event.target.value,
                }))
              }
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-center gap-3">
          <UserRound className="h-5 w-5 text-cyan-300" />

          <div>
            <h2 className="text-sm font-bold text-white">
              Profile Introduction
            </h2>

            <p className="text-xs text-slate-400">
              Help other members understand your interests and background.
            </p>
          </div>
        </div>

        <textarea
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          rows={4}
          placeholder="Write a short introduction..."
          className="mt-4 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
        />
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-center gap-3">
          <Globe2 className="h-5 w-5 text-cyan-300" />

          <div>
            <h2 className="text-sm font-bold text-white">
              Preferred Language
            </h2>

            <p className="text-xs text-slate-400">
              Used for matching you with compatible members.
            </p>
          </div>
        </div>

        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
        >
          {DEFAULT_LANGUAGES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-cyan-300" />

          <div>
            <h2 className="text-sm font-bold text-white">
              Learning Goal
            </h2>

            <p className="text-xs text-slate-400">
              This helps LearnX understand what you want to achieve.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <label className="block text-xs font-semibold text-slate-300">
            Learning Goal
            <textarea
              value={learningGoal}
              onChange={(event) => setLearningGoal(event.target.value)}
              rows={3}
              placeholder="Example: I want to learn Python for data analysis."
              className="mt-1.5 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
            />
          </label>

          <label className="block text-xs font-semibold text-slate-300">
            Target Skill Level
            <select
              value={targetSkillLevel}
              onChange={(event) =>
                setTargetSkillLevel(
                  event.target.value as SkillLevel
                )
              }
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
            >
              {SKILL_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-300">
            Preferred Learning Schedule
            <input
              value={learningSchedule}
              onChange={(event) =>
                setLearningSchedule(event.target.value)
              }
              placeholder="Example: Weekdays 6 PM - 8 PM"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
            />
          </label>

          <label className="block text-xs font-semibold text-slate-300">
            Learning Interests
            <input
              value={learningInterests}
              onChange={(event) =>
                setLearningInterests(event.target.value)
              }
              placeholder="Example: AI, Web Development, Data Science"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
            />
          </label>
        </div>
      </section>

      {isMentor && (
        <section className="rounded-xl border border-emerald-800/50 bg-emerald-950/10 p-5">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-5 w-5 text-emerald-300" />

            <div>
              <h2 className="text-sm font-bold text-white">
                Mentor Details
              </h2>

              <p className="text-xs text-slate-400">
                These details help learners understand your experience.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <label className="block text-xs font-semibold text-slate-300">
              Overall Teaching Experience
              <input
                value={experience}
                onChange={(event) =>
                  setExperience(event.target.value)
                }
                placeholder="Example: 2 years teaching Python"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
              />
            </label>

            <div>
              <p className="text-xs font-semibold text-slate-300">
                Preferred Teaching Languages
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {DEFAULT_LANGUAGES.map((item) => {
                  const selected = mentorLanguages.includes(item);

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleMentorLanguage(item)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        selected
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                          : 'border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {aiSuggested.length > 0 && (
        <section className="rounded-xl border border-cyan-800/50 bg-cyan-950/10 p-5">
          <div className="flex items-center gap-3">
            <Lightbulb className="h-5 w-5 text-cyan-300" />

            <div>
              <h2 className="text-sm font-bold text-white">
                AI Suggested Skills
              </h2>

              <p className="text-xs text-slate-400">
                Review and confirm suggestions before they are added to
                your profile.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {aiSuggested.map((suggestion) => (
              <div
                key={suggestion.skill_id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-950 p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-white">
                    {suggestion.name}
                  </p>

                  {suggestion.reason && (
                    <p className="mt-1 text-xs text-slate-400">
                      {suggestion.reason}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const selected = skills.find(
                      (skill) => skill.id === suggestion.skill_id
                    );

                    if (!selected) return;

                    if (isMentor) {
                      if (!selectedShareSkillIds.has(selected.id)) {
                        toggleShareSkill(selected);
                      }
                    } else if (
                      !selectedLearnSkillIds.has(selected.id)
                    ) {
                      toggleLearnSkill(selected);
                    }

                    setAiSuggested((current) =>
                      current.filter(
                        (item) =>
                          item.skill_id !== suggestion.skill_id
                      )
                    );
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-700 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-950/40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  if (completed) {
    return (
      <main className="mx-auto flex min-h-[75vh] max-w-xl items-center px-4 py-12">
        <section className="w-full rounded-xl border border-emerald-800/50 bg-slate-900/70 p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-300" />

          <h1 className="mt-4 text-2xl font-bold text-white">
            Onboarding Complete!
          </h1>

          <p className="mt-2 text-sm text-slate-300">
            Your LearnX profile is ready.
          </p>

          <p className="mt-4 text-xs text-slate-500">
            Taking you to your dashboard...
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase text-cyan-300">
          LearnX Onboarding
        </p>

        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
          {isMentor
            ? 'Set up your Knowledge Sharer profile'
            : 'Set up your learning profile'}
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Tell LearnX what you want to learn, what you can share, and
          when you are available.
        </p>
      </header>

      <div className="mb-6 grid grid-cols-3 gap-2">
        {[1, 2, 3].map((item) => (
          <div key={item}>
            <div
              className={`h-1.5 rounded-full ${
                item <= step
                  ? 'bg-cyan-500'
                  : 'bg-slate-800'
              }`}
            />

            <p
              className={`mt-2 text-[10px] font-semibold ${
                item === step
                  ? 'text-cyan-300'
                  : 'text-slate-500'
              }`}
            >
              Step {item}
            </p>
          </div>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-rose-800/50 bg-rose-950/30 p-3 text-xs text-rose-200"
        >
          {error}
        </div>
      )}

      {step === 1 && (
        <section className="space-y-5 rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-7">
          <div>
            <div className="flex items-center gap-3">
              {isMentor ? (
                <GraduationCap className="h-6 w-6 text-emerald-300" />
              ) : (
                <BookOpen className="h-6 w-6 text-cyan-300" />
              )}

              <div>
                <h2 className="text-lg font-bold text-white">
                  {isMentor
                    ? 'What skills will you share?'
                    : 'What do you want to learn?'}
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  {isMentor
                    ? 'Select the skills you are ready to teach or share with other members.'
                    : 'Select the skills you want to learn through LearnX sessions.'}
                </p>
              </div>
            </div>
          </div>

          {isMentor
            ? renderSkillGrid('share')
            : renderSkillGrid('learn')}

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-400">
            Selected:{' '}
            <strong className="text-white">
              {isMentor
                ? shareSkills.length
                : learnSkills.length}
            </strong>
          </div>

          {isMentor && shareSkills.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-bold text-white">
                Share Skill Details
              </h3>

              {renderShareSkillDetails()}
            </div>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="space-y-5 rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-7">
          <div className="flex items-center gap-3">
            {isMentor ? (
              <BookOpen className="h-6 w-6 text-cyan-300" />
            ) : (
              <GraduationCap className="h-6 w-6 text-emerald-300" />
            )}

            <div>
              <h2 className="text-lg font-bold text-white">
                {isMentor
                  ? 'What would you like to learn?'
                  : 'Do you also want to share a skill?'}
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                {isMentor
                  ? 'Learning skills are optional for mentors.'
                  : 'Sharing skills is optional for learners. You can add them now or later.'}
              </p>
            </div>
          </div>

          {isMentor ? (
            <>
              {renderSkillGrid('learn')}

              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-400">
                Selected learning skills:{' '}
                <strong className="text-white">
                  {learnSkills.length}
                </strong>
              </div>

              {learnSkills.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-bold text-white">
                    Current Learning Levels
                  </h3>

                  {renderLearnSkillDetails()}
                </div>
              )}
            </>
          ) : (
            <>
              {renderSkillGrid('share')}

              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-400">
                Sharing skills selected:{' '}
                <strong className="text-white">
                  {shareSkills.length}
                </strong>
              </div>

              {shareSkills.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-bold text-white">
                    Share Skill Details
                  </h3>

                  {renderShareSkillDetails()}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {step === 3 && renderStepThree()}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:border-slate-500 hover:text-white disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={loading || skillsLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-cyan-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleFinish()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-emerald-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Complete Onboarding'}
            <CheckCircle2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="mt-5 text-center text-[10px] text-slate-600">
        LearnX uses your selected skills, language, availability, and
        goals to help create relevant learning matches.
      </p>
    </main>
  );
}