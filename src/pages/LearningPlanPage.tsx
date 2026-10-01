import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen } from 'lucide-react';
import { apiRequest } from '../lib/api';

interface LearningPlanActivity {
  id: string;
  title: string;
}

interface LearningPlanWeek {
  week: number;
  title: string;
  focus: string;
  activities: LearningPlanActivity[];
}

interface LearningPlan {
  id?: string;
  title?: string;
  weeks?: LearningPlanWeek[];
}

interface LearningPath {
  id: string;
  title: string;
  description?: string;
  currentLevel?: string;
  targetLevel?: string;
  isAiGenerated?: boolean;
}

interface LearningPlanResponse {
  learning_path: LearningPath;
  plan: LearningPlanWeek[];
}

export function LearningPlanPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const { user } = useAuth();

  const availableSkills = user?.learn_skills || [];

  const [skillName, setSkillName] = useState<string>(
    availableSkills[0]?.name || 'Python'
  );

  const [plan, setPlan] = useState<LearningPlanResponse | null>(null);
  const [completedActivities, setCompletedActivities] = useState<
    Record<string, boolean>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generatePlan = async () => {
    if (!skillName.trim()) {
      return;
    }

    setLoading(true);
    setError('');
    setPlan(null);
    setCompletedActivities({});

    try {
      const selectedSkill = availableSkills.find(
        (skill) => skill.name === skillName
      );

      const data = await apiRequest<LearningPlanResponse>(
        '/ai/learning-plan',
        {
          method: 'POST',
          body: {
            ...(selectedSkill?.id
              ? { skill_id: selectedSkill.id }
              : { skill_name: skillName }),
            skill_name: skillName,
            level: 'BEGINNER',
            target_level: 'INTERMEDIATE',
          },
        }
      );

      const weeks = Array.isArray(data?.plan) ? data.plan : [];

      setPlan({
        learning_path: data.learning_path,
        plan: weeks,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to generate learning plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void generatePlan();
  }, [skillName]);

  const toggleActivity = (activityId: string) => {
    setCompletedActivities((previous) => ({
      ...previous,
      [activityId]: !previous[activityId],
    }));
  };

  const weeks = plan?.plan || [];
  const totalActivities = weeks.reduce(
    (total, week) =>
      total + (Array.isArray(week.activities) ? week.activities.length : 0),
    0
  );

  const completedCount = Object.values(completedActivities).filter(
    Boolean
  ).length;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-cyan-400" />
            AI Learning Blueprint
          </h1>

          <p className="text-xs text-slate-400 mt-1">
            A structured 4-week progressive curriculum tailored to your
            selected learning skill.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Skill:</span>

          <select
            value={skillName}
            onChange={(event) => setSkillName(event.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none focus:border-cyan-500"
          >
            {availableSkills.length > 0 ? (
              availableSkills.map((skill) => (
                <option key={skill.id} value={skill.name}>
                  {skill.name}
                </option>
              ))
            ) : (
              <>
                <option value="Python">Python</option>
                <option value="Web Development">Web Development</option>
                <option value="English Speaking">English Speaking</option>
              </>
            )}
          </select>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-800/50 bg-rose-950/30 px-4 py-3 text-xs text-rose-200"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500">
          Generating structured 4-week learning blueprint...
        </div>
      ) : plan ? (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-white">
                {plan.learning_path?.title ||
                  `4-Week ${skillName} Learning Path`}
              </h2>

              <p className="text-xs text-slate-300 mt-1">
                {plan.learning_path?.description ||
                  `AI-generated learning path for ${skillName}.`}
              </p>

              <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                <span>
                  Level:{' '}
                  <strong className="text-slate-200">
                    {plan.learning_path?.currentLevel || 'BEGINNER'}
                  </strong>
                </span>

                <span>•</span>

                <span>
                  Target:{' '}
                  <strong className="text-slate-200">
                    {plan.learning_path?.targetLevel || 'INTERMEDIATE'}
                  </strong>
                </span>

                <span>•</span>

                <span>
                  Progress:{' '}
                  <strong className="text-cyan-300">
                    {completedCount}/{totalActivities}
                  </strong>
                </span>
              </div>
            </div>

            <button
              onClick={() =>
                navigate(
                  `/discover?search=${encodeURIComponent(skillName)}`
                )
              }
              className="px-4 py-2 rounded-xl bg-cyan-500 text-white font-semibold text-xs hover:bg-cyan-400 transition-colors shrink-0"
            >
              Book Peer Practice
            </button>
          </div>

          {weeks.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center">
              <BookOpen className="h-8 w-8 text-slate-500 mx-auto mb-3" />
              <p className="text-xs text-slate-400">
                No weekly activities were returned for this learning plan.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {weeks.map((week) => (
                <div
                  key={week.week}
                  className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-xs">
                        W{week.week}
                      </span>

                      <div>
                        <h3 className="text-sm font-bold text-white">
                          {week.title}
                        </h3>

                        <p className="text-xs text-slate-400">
                          {week.focus}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {Array.isArray(week.activities) &&
                    week.activities.length > 0 ? (
                      week.activities.map((activity) => {
                        const isChecked =
                          !!completedActivities[activity.id];

                        return (
                          <button
                            key={activity.id}
                            type="button"
                            onClick={() =>
                              toggleActivity(activity.id)
                            }
                            className={`w-full text-left p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center gap-3 ${
                              isChecked
                                ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200 line-through opacity-80'
                                : 'border-slate-800/80 bg-slate-950/60 text-slate-200 hover:border-slate-700'
                            }`}
                          >
                            <span
                              className={`h-4 w-4 shrink-0 rounded-md border flex items-center justify-center text-[10px] ${
                                isChecked
                                  ? 'border-emerald-500 bg-emerald-500 text-white'
                                  : 'border-slate-700'
                              }`}
                            >
                              {isChecked ? '✓' : ''}
                            </span>

                            <span>{activity.title}</span>
                          </button>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-500">
                        No activities available for this week.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="py-20 text-center text-xs text-slate-500">
          Select a skill to generate your learning blueprint.
        </div>
      )}
    </div>
  );
}