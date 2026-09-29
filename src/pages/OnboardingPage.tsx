import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  ArrowRight,
  Check,
  Plus,
  Clock,
  BookOpen,
  Share2,
  CheckCircle2,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Skill } from '../types';

type SkillLevel =
  | 'BEGINNER'
  | 'ELEMENTARY'
  | 'INTERMEDIATE'
  | 'ADVANCED';

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
  name: string;
  type: 'LEARN' | 'SHARE';
  reason: string;
};

type OnboardingAvailability = {
  status: string;
  available_from: string;
  available_until: string;
};

const LEVELS: SkillLevel[] = [
  'BEGINNER',
  'ELEMENTARY',
  'INTERMEDIATE',
  'ADVANCED',
];

const LANGUAGES = [
  'English',
  'Tamil',
  'Hindi',
  'Telugu',
  'Malayalam',
  'Kannada',
  'Other',
];

export function OnboardingPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const { user, refreshUser } = useAuth();

  const userRole = String(user?.role ?? '').toUpperCase();

  const isMentor =
    userRole === 'KNOWLEDGE_SHARER' ||
    userRole === 'MENTOR';

  const [step, setStep] = useState(1);

  const [skillsCatalog, setSkillsCatalog] =
    useState<Skill[]>([]);

  const [loadingSkills, setLoadingSkills] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [formError, setFormError] =
    useState('');

  const [learnSkills, setLearnSkills] =
    useState<LearnSkillSelection[]>([]);

  const [shareSkills, setShareSkills] =
    useState<ShareSkillSelection[]>([]);

  const [availability, setAvailability] =
    useState<OnboardingAvailability>({
      status: 'ACTIVE',
      available_from: '18:00:00',
      available_until: '21:00:00',
    });

  const [bio, setBio] =
    useState('');

  const [learningGoal, setLearningGoal] =
    useState('');

  const [targetSkillLevel, setTargetSkillLevel] =
    useState<SkillLevel>('INTERMEDIATE');

  const [learningSchedule, setLearningSchedule] =
    useState('Flexible');

  const [learningInterests, setLearningInterests] =
    useState('');

  const [preferredLanguage, setPreferredLanguage] =
    useState(
      user?.preferred_language || 'English'
    );

  const [aiSuggested, setAiSuggested] =
    useState<AiSuggestion[]>([]);

  /* =====================================================
     LOAD SKILLS
  ===================================================== */

  useEffect(() => {
    let mounted = true;

    const loadSkills = async () => {
      setLoadingSkills(true);
      setFormError('');

      try {
        const response = await apiRequest('/skills');

        if (!mounted) return;

        const skills = Array.isArray(response?.skills)
          ? response.skills
          : [];

        setSkillsCatalog(skills);
      } catch (error) {
        console.error(
          'Failed to load skills:',
          error
        );

        if (mounted) {
          setFormError(
            'Unable to load skills. Please refresh and try again.'
          );
        }
      } finally {
        if (mounted) {
          setLoadingSkills(false);
        }
      }
    };

    loadSkills();

    return () => {
      mounted = false;
    };
  }, []);

  /* =====================================================
     UPDATE USER LANGUAGE
  ===================================================== */

  useEffect(() => {
    if (user?.preferred_language) {
      setPreferredLanguage(
        user.preferred_language
      );
    }
  }, [user?.preferred_language]);

  /* =====================================================
     LEARN SKILLS
  ===================================================== */

  const toggleLearnSkill = (skill: Skill) => {
    setFormError('');

    setLearnSkills((current) => {
      const exists = current.some(
        (item) =>
          item.skill_id === skill.id
      );

      if (exists) {
        return current.filter(
          (item) =>
            item.skill_id !== skill.id
        );
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

  const updateLearnLevel = (
    skillId: string,
    level: SkillLevel
  ) => {
    setLearnSkills((current) =>
      current.map((skill) =>
        skill.skill_id === skillId
          ? {
              ...skill,
              level,
            }
          : skill
      )
    );
  };

  /* =====================================================
     SHARE SKILLS
  ===================================================== */

  const toggleShareSkill = (skill: Skill) => {
    setFormError('');

    setShareSkills((current) => {
      const exists = current.some(
        (item) =>
          item.skill_id === skill.id
      );

      if (exists) {
        return current.filter(
          (item) =>
            item.skill_id !== skill.id
        );
      }

      return [
        ...current,
        {
          skill_id: skill.id,
          name: skill.name,
          level: 'INTERMEDIATE',
          experience: '',
          languages: [preferredLanguage],
          description: '',
          beginner_friendly: true,
          skill_proof: '',
        },
      ];
    });
  };

  const updateShareLevel = (
    skillId: string,
    level: SkillLevel
  ) => {
    setShareSkills((current) =>
      current.map((skill) =>
        skill.skill_id === skillId
          ? {
              ...skill,
              level,
            }
          : skill
      )
    );
  };

  const updateShareDetails = (
    skillId: string,
    field:
      | 'experience'
      | 'description'
      | 'beginner_friendly'
      | 'skill_proof'
      | 'languages',
    value: string | boolean | string[]
  ) => {
    setShareSkills((current) =>
      current.map((skill) =>
        skill.skill_id === skillId
          ? {
              ...skill,
              [field]: value,
            }
          : skill
      )
    );
  };

  /* =====================================================
     AI SUGGESTIONS
  ===================================================== */

  const acceptAiSuggestion = (
    item: AiSuggestion
  ) => {
    const skill = skillsCatalog.find(
      (candidate) =>
        candidate.name.toLowerCase() ===
        item.name.toLowerCase()
    );

    if (!skill) return;

    if (item.type === 'LEARN') {
      setLearnSkills((current) => {
        if (
          current.some(
            (selected) =>
              selected.skill_id === skill.id
          )
        ) {
          return current;
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
    }

    if (item.type === 'SHARE') {
      setShareSkills((current) => {
        if (
          current.some(
            (selected) =>
              selected.skill_id === skill.id
          )
        ) {
          return current;
        }

        return [
          ...current,
          {
            skill_id: skill.id,
            name: skill.name,
            level: 'INTERMEDIATE',
            experience: '',
            languages: [preferredLanguage],
            description: '',
            beginner_friendly: true,
            skill_proof: '',
          },
        ];
      });
    }

    setAiSuggested((current) =>
      current.filter(
        (suggestion) =>
          !(
            suggestion.name === item.name &&
            suggestion.type === item.type
          )
      )
    );
  };

  /* =====================================================
     VALIDATION
  ===================================================== */

  const validateShareSkills = () => {
    const incompleteSkill = shareSkills.find(
      (skill) =>
        !skill.experience.trim() ||
        !skill.description.trim() ||
        skill.languages.length === 0
    );

    if (incompleteSkill) {
      return `Complete the experience, languages, and description for ${incompleteSkill.name}.`;
    }

    return '';
  };

  const validateMentor = () => {
    if (shareSkills.length === 0) {
      return 'Select at least one skill that you can share.';
    }

    const shareError = validateShareSkills();

    if (shareError) {
      return shareError;
    }

    if (
      availability.available_from >=
      availability.available_until
    ) {
      return 'Available From must be earlier than Available Until.';
    }

    return '';
  };

  const validateLearner = () => {
    if (learnSkills.length === 0) {
      return 'Select at least one skill you want to learn.';
    }

    if (!learningGoal.trim()) {
      return 'Please enter your learning goal.';
    }

    const shareError = validateShareSkills();

    if (shareError) {
      return shareError;
    }

    if (
      availability.available_from >=
      availability.available_until
    ) {
      return 'Preferred Study Time From must be earlier than Preferred Study Time Until.';
    }

    return '';
  };

  /* =====================================================
     COMPLETE ONBOARDING
  ===================================================== */

  const handleFinish = async () => {
    if (loading) return;

    setFormError('');

    const validationError = isMentor
      ? validateMentor()
      : validateLearner();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        /*
         * IMPORTANT:
         * Both roles can LEARN and SHARE.
         * Registration role does not remove either capability.
         */
        learn_skills: learnSkills,

        share_skills: shareSkills,

        availability,

        bio: bio.trim(),

        learning_goal:
          learningGoal.trim(),

        target_skill_level:
          targetSkillLevel,

        learning_schedule:
          learningSchedule,

        learning_interests:
          learningInterests.trim(),

        preferred_language:
          preferredLanguage,

        mentor_experience:
          shareSkills
            .map((skill) =>
              skill.experience.trim()
            )
            .filter(Boolean)
            .join('; '),

        mentor_languages:
          Array.from(
            new Set(
              shareSkills.flatMap(
                (skill) =>
                  skill.languages
              )
            )
          ),
      };

      await apiRequest('/onboarding', {
        method: 'POST',
        body: payload,
      });

      await refreshUser();

      navigate('/dashboard');
    } catch (error: any) {
      console.error(
        'Onboarding failed:',
        error
      );

      setFormError(
        error?.message ||
          'Failed to complete onboarding. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     SKILL GRID
  ===================================================== */

  const renderSkillGrid = (
    mode: 'learn' | 'share'
  ) => {
    if (loadingSkills) {
      return (
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 text-center text-xs text-slate-400">
          Loading skills...
        </div>
      );
    }

    if (skillsCatalog.length === 0) {
      return (
        <div className="rounded-xl border border-rose-800/40 bg-rose-950/20 p-6 text-center text-xs text-rose-200">
          No skills are currently available.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
        {skillsCatalog.map((skill) => {
          const selected =
            mode === 'learn'
              ? learnSkills.some(
                  (item) =>
                    item.skill_id ===
                    skill.id
                )
              : shareSkills.some(
                  (item) =>
                    item.skill_id ===
                    skill.id
                );

          return (
            <button
              key={skill.id}
              type="button"
              onClick={() =>
                mode === 'learn'
                  ? toggleLearnSkill(skill)
                  : toggleShareSkill(skill)
              }
              className={`rounded-xl border p-3 text-left transition-all ${
                selected
                  ? mode === 'learn'
                    ? 'border-cyan-500 bg-cyan-950/40 text-white'
                    : 'border-emerald-500 bg-emerald-950/40 text-white'
                  : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[9px] font-semibold uppercase text-slate-500">
                  {skill.category}
                </span>

                {selected && (
                  <Check
                    className={`h-3.5 w-3.5 ${
                      mode === 'learn'
                        ? 'text-cyan-400'
                        : 'text-emerald-400'
                    }`}
                  />
                )}
              </div>

              <div className="text-xs font-semibold">
                {skill.name}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  /* =====================================================
     LEARN SKILLS STEP
  ===================================================== */

  const renderLearnerSkillsStep = () => (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <BookOpen className="h-4 w-4 text-cyan-400" />
              What skills do you want to learn?
            </h2>

            <p className="mt-0.5 text-xs text-slate-400">
              Select one or more skills and specify your current level.
            </p>
          </div>

          <span className="text-xs font-semibold text-cyan-400">
            {learnSkills.length} selected
          </span>
        </div>

        {aiSuggested.filter(
          (item) =>
            item.type === 'LEARN'
        ).length > 0 && (
          <div className="mb-6 rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-cyan-300">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              AI Suggestions
            </div>

            <div className="flex flex-wrap gap-2">
              {aiSuggested
                .filter(
                  (item) =>
                    item.type === 'LEARN'
                )
                .map((item) => (
                  <div
                    key={`${item.type}-${item.name}`}
                    className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs"
                  >
                    <span className="font-semibold text-white">
                      {item.name}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        acceptAiSuggestion(
                          item
                        )
                      }
                      className="flex items-center gap-1 rounded bg-cyan-500 px-2 py-1 text-[10px] font-semibold text-white"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {renderSkillGrid('learn')}

        {learnSkills.length > 0 && (
          <div className="mt-6 space-y-3 border-t border-slate-800 pt-5">
            <h3 className="mb-3 text-xs font-semibold text-slate-300">
              Starting Level
            </h3>

            {learnSkills.map(
              (skill) => (
                <div
                  key={skill.skill_id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="text-xs font-bold text-white">
                    {skill.name}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {LEVELS.map(
                      (level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() =>
                            updateLearnLevel(
                              skill.skill_id,
                              level
                            )
                          }
                          className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${
                            skill.level ===
                            level
                              ? 'bg-cyan-500 text-white'
                              : 'bg-slate-900 text-slate-400'
                          }`}
                        >
                          {level}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            if (
              learnSkills.length ===
              0
            ) {
              setFormError(
                'Select at least one skill before continuing.'
              );
              return;
            }

            setFormError('');
            setStep(2);
          }}
          disabled={loadingSkills}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md disabled:opacity-40"
        >
          Next: Skills You Can Share
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  /* =====================================================
     SHARE SKILLS STEP
  ===================================================== */

  const renderShareSkillsStep = () => (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <Share2 className="h-4 w-4 text-emerald-400" />
              What knowledge can you share?
            </h2>

            <p className="mt-0.5 text-xs text-slate-400">
              Sharing knowledge is optional for Learners. Verified knowledge sharing earns Time Credits according to actual session duration.
            </p>
          </div>

          <span className="text-xs font-semibold text-emerald-400">
            {shareSkills.length} selected
          </span>
        </div>

        {aiSuggested.filter(
          (item) =>
            item.type === 'SHARE'
        ).length > 0 && (
          <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              AI Suggestions
            </div>

            <div className="flex flex-wrap gap-2">
              {aiSuggested
                .filter(
                  (item) =>
                    item.type ===
                    'SHARE'
                )
                .map((item) => (
                  <div
                    key={`${item.type}-${item.name}`}
                    className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs"
                  >
                    <span className="font-semibold text-white">
                      {item.name}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        acceptAiSuggestion(
                          item
                        )
                      }
                      className="flex items-center gap-1 rounded bg-emerald-500 px-2 py-1 text-[10px] font-semibold text-white"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {renderSkillGrid('share')}

        {shareSkills.length > 0 && (
          <div className="mt-6 space-y-3 border-t border-slate-800 pt-5">
            {shareSkills.map(
              (skill) => (
                <div
                  key={skill.skill_id}
                  className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs font-bold text-white">
                      {skill.name}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {LEVELS.map(
                        (level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() =>
                              updateShareLevel(
                                skill.skill_id,
                                level
                              )
                            }
                            className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${
                              skill.level ===
                              level
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-900 text-slate-400'
                            }`}
                          >
                            {level}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="text-[11px] text-slate-300">
                      Experience *
                      <input
                        value={
                          skill.experience
                        }
                        onChange={(
                          event
                        ) =>
                          updateShareDetails(
                            skill.skill_id,
                            'experience',
                            event.target
                              .value
                          )
                        }
                        placeholder="e.g. 3 years"
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                      />
                    </label>

                    <label className="text-[11px] text-slate-300">
                      Languages *
                      <select
                        multiple
                        value={
                          skill.languages
                        }
                        onChange={(
                          event
                        ) =>
                          updateShareDetails(
                            skill.skill_id,
                            'languages',
                            Array.from(
                              event.target
                                .selectedOptions,
                              (option) =>
                                option.value
                            )
                          )
                        }
                        className="mt-1 h-20 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                      >
                        {LANGUAGES.map(
                          (
                            language
                          ) => (
                            <option
                              key={
                                language
                              }
                              value={
                                language
                              }
                            >
                              {language}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label className="text-[11px] text-slate-300 sm:col-span-2">
                      Skill Description *
                      <textarea
                        value={
                          skill.description
                        }
                        onChange={(
                          event
                        ) =>
                          updateShareDetails(
                            skill.skill_id,
                            'description',
                            event.target
                              .value
                          )
                        }
                        rows={2}
                        placeholder={`Describe what you can teach in ${skill.name}`}
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                      />
                    </label>

                    <label className="flex items-center gap-2 text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={
                          skill.beginner_friendly
                        }
                        onChange={(
                          event
                        ) =>
                          updateShareDetails(
                            skill.skill_id,
                            'beginner_friendly',
                            event.target
                              .checked
                          )
                        }
                        className="accent-emerald-500"
                      />
                      Beginner-friendly
                    </label>

                    <label className="text-[11px] text-slate-300">
                      SkillProof information
                      <input
                        value={
                          skill.skill_proof
                        }
                        onChange={(
                          event
                        ) =>
                          updateShareDetails(
                            skill.skill_id,
                            'skill_proof',
                            event.target
                              .value
                          )
                        }
                        placeholder="Credential or evidence description"
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                      />
                    </label>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setFormError('');
            setStep(1);
          }}
          className="rounded-xl px-4 py-2 text-xs text-slate-400 hover:text-white"
        >
          Back
        </button>

        <button
          type="button"
          onClick={() => {
            if (
              isMentor &&
              shareSkills.length === 0
            ) {
              setFormError(
                'Select at least one skill that you can share.'
              );
              return;
            }

            const shareError =
              validateShareSkills();

            if (shareError) {
              setFormError(shareError);
              return;
            }

            setFormError('');
            setStep(3);
          }}
          className="ml-auto flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md"
        >
          Next: Availability
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  /* =====================================================
     FINAL STEP
  ===================================================== */

  const renderFinalStep = () => (
    <div className="space-y-6">
      <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <Clock className="h-4 w-4 text-cyan-400" />

            Learning, Availability & Profile
          </h2>

          <p className="mt-0.5 text-xs text-slate-400">
            Review your learning interests, sharing availability, and profile information.
          </p>
        </div>

        {isMentor && (
          <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/20 p-3 text-xs text-emerald-200">
            Mentors start with 0 Time Credits.
            Credits are earned only through
            verified knowledge-sharing sessions.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-300 sm:col-span-2">
            What do you want to learn?
            {isMentor
              ? ' (Optional)'
              : ' *'}

            <textarea
              rows={2}
              value={learningGoal}
              onChange={(event) =>
                setLearningGoal(
                  event.target.value
                )
              }
              placeholder="Describe the outcome you are working toward"
              className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
            />
          </label>

          <label className="text-xs font-semibold text-slate-300">
            Target Skill Level

            <select
              value={targetSkillLevel}
              onChange={(event) =>
                setTargetSkillLevel(
                  event.target
                    .value as SkillLevel
                )
              }
              className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
            >
              {LEVELS.map(
                (level) => (
                  <option
                    key={level}
                    value={level}
                  >
                    {level}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-300">
            Preferred Language

            <select
              value={preferredLanguage}
              onChange={(event) =>
                setPreferredLanguage(
                  event.target.value
                )
              }
              className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
            >
              {LANGUAGES.map(
                (language) => (
                  <option
                    key={language}
                    value={language}
                  >
                    {language}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-300">
            Preferred Schedule

            <select
              value={learningSchedule}
              onChange={(event) =>
                setLearningSchedule(
                  event.target.value
                )
              }
              className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
            >
              <option>
                Flexible
              </option>

              <option>
                Weekday mornings
              </option>

              <option>
                Weekday evenings
              </option>

              <option>
                Weekends
              </option>
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-300">
            Learning Interests

            <textarea
              rows={2}
              value={learningInterests}
              onChange={(event) =>
                setLearningInterests(
                  event.target.value
                )
              }
              placeholder="Topics or projects you are interested in"
              className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">
              Availability Status
            </label>

            <select
              value={
                availability.status
              }
              onChange={(event) =>
                setAvailability(
                  (current) => ({
                    ...current,
                    status:
                      event.target
                        .value,
                  })
                )
              }
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
            >
              <option value="ACTIVE">
                Available
              </option>

              <option value="INACTIVE">
                Not available
              </option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">
              {isMentor
                ? 'Available From'
                : 'Preferred Study Time From'}
            </label>

            <input
              type="time"
              value={availability.available_from.slice(
                0,
                5
              )}
              onChange={(event) =>
                setAvailability(
                  (current) => ({
                    ...current,
                    available_from:
                      event.target
                        .value +
                      ':00',
                  })
                )
              }
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">
              {isMentor
                ? 'Available Until'
                : 'Preferred Study Time Until'}
            </label>

            <input
              type="time"
              value={availability.available_until.slice(
                0,
                5
              )}
              onChange={(event) =>
                setAvailability(
                  (current) => ({
                    ...current,
                    available_until:
                      event.target
                        .value +
                      ':00',
                  })
                )
              }
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-300">
            Profile Introduction
          </label>

          <textarea
            rows={3}
            value={bio}
            onChange={(event) =>
              setBio(
                event.target.value
              )
            }
            placeholder="Introduce yourself to the LearnX community..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
          />
        </div>

        <div className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-950/80 p-4 text-xs">
          <div className="font-semibold text-white">
            Summary Review
          </div>

          <div className="text-slate-400">
            Skills to Learn:{' '}
            <span className="text-cyan-300">
              {learnSkills
                .map(
                  (skill) =>
                    `${skill.name} (${skill.level})`
                )
                .join(', ') ||
                'None'}
            </span>
          </div>

          <div className="text-slate-400">
            Skills to Share:{' '}
            <span className="text-emerald-300">
              {shareSkills
                .map(
                  (skill) =>
                    `${skill.name} (${skill.level})`
                )
                .join(', ') ||
                'None'}
            </span>
          </div>

          <div className="text-slate-400">
            Goal:{' '}
            <span className="text-white">
              {learningGoal ||
                'Not set'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setFormError('');
            setStep(2);
          }}
          className="rounded-xl px-4 py-2 text-xs text-slate-400 hover:text-white"
        >
          Back
        </button>

        <button
          type="button"
          onClick={handleFinish}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3 text-xs font-semibold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? 'Saving Profile...'
            : 'Complete Onboarding'}

          <CheckCircle2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  /* =====================================================
     MAIN UI
  ===================================================== */

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-10 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-800/40 bg-cyan-950/40 px-3 py-1 text-xs font-semibold text-cyan-300">
          Personalize Your Experience
        </div>

        <h1 className="font-['Space_Grotesk'] text-2xl font-bold text-white sm:text-3xl">
          Welcome to LearnX,{' '}
          {user?.full_name?.split(
            ' '
          )[0] || 'Friend'}
          !
        </h1>

        <p className="mt-1 text-xs text-slate-400">
          You can learn skills, share knowledge,
          or do both.
        </p>

        {formError && (
          <p
            role="alert"
            className="mx-auto mt-4 max-w-2xl rounded-lg border border-rose-800/50 bg-rose-950/30 p-3 text-left text-xs text-rose-200"
          >
            {formError}
          </p>
        )}

        {/* Progress */}

        <div className="mt-8 flex items-center justify-center gap-3">
          <div
            className={`flex items-center gap-2 text-xs font-semibold ${
              step === 1
                ? 'text-cyan-400'
                : 'text-slate-500'
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                step === 1
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              1
            </span>

            <span>
              {isMentor
                ? 'Skills to Share'
                : 'What to Learn'}
            </span>
          </div>

          <div className="h-0.5 w-8 bg-slate-800" />

          <div
            className={`flex items-center gap-2 text-xs font-semibold ${
              step === 2
                ? 'text-cyan-400'
                : 'text-slate-500'
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                step === 2
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              2
            </span>

            <span>
              {isMentor
                ? 'What to Learn'
                : 'Skills You Can Share'}
            </span>
          </div>

          <div className="h-0.5 w-8 bg-slate-800" />

          <div
            className={`flex items-center gap-2 text-xs font-semibold ${
              step === 3
                ? 'text-cyan-400'
                : 'text-slate-500'
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                step === 3
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              3
            </span>

            <span>
              Learning & Availability
            </span>
          </div>
        </div>
      </div>

      {/* =================================================
          STEP 1
      ================================================= */}

      {step === 1 &&
        (isMentor
          ? renderShareSkillsStep()
          : renderLearnerSkillsStep())}

      {/* =================================================
          STEP 2
      ================================================= */}

      {step === 2 &&
        (isMentor
          ? renderLearnerSkillsStep()
          : renderShareSkillsStep())}

      {/* =================================================
          STEP 3
      ================================================= */}

      {step === 3 &&
        renderFinalStep()}
    </div>
  );
}