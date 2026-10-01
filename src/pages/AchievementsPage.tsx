import React, { useEffect, useState } from 'react';
import {
  Award,
  Zap,
  Compass,
  Flame,
  HeartHandshake,
  Star,
  Coins,
  CheckCircle2,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Achievement } from '../types';

interface BackendAchievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  conditionType?: string;
  condition_type?: string;
  requiredCount?: number;
  required_count?: number;
  userAchievements?: Array<{
    id: string;
    userId?: string;
    achievementId?: string;
    awardedAt?: string;
  }>;
}

interface AchievementsResponse {
  achievements?: BackendAchievement[];
}

export function AchievementsPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAchievements = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiRequest<
        AchievementsResponse | BackendAchievement[]
      >('/achievements');

      const backendAchievements = Array.isArray(response)
        ? response
        : Array.isArray(response?.achievements)
          ? response.achievements
          : [];

      const mappedAchievements: Achievement[] =
        backendAchievements.map((achievement) => ({
          id: achievement.id,
          code: achievement.code,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,

          condition_type:
            achievement.conditionType ??
            achievement.condition_type ??
            '',

          required_count:
            achievement.requiredCount ??
            achievement.required_count ??
            1,

          unlocked:
            Array.isArray(achievement.userAchievements) &&
            achievement.userAchievements.length > 0,
        }));

      setAchievements(mappedAchievements);
    } catch (err: any) {
      setAchievements([]);
      setError(
        err?.message || 'Unable to load achievements.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, []);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap':
        return (
          <Zap className="h-6 w-6 text-yellow-400" />
        );

      case 'Compass':
        return (
          <Compass className="h-6 w-6 text-cyan-400" />
        );

      case 'Flame':
        return (
          <Flame className="h-6 w-6 text-rose-500" />
        );

      case 'HeartHandshake':
        return (
          <HeartHandshake className="h-6 w-6 text-emerald-400" />
        );

      case 'Award':
        return (
          <Award className="h-6 w-6 text-purple-400" />
        );

      case 'Star':
        return (
          <Star className="h-6 w-6 text-amber-400" />
        );

      case 'Coins':
        return (
          <Coins className="h-6 w-6 text-cyan-400" />
        );

      case 'CheckCircle2':
        return (
          <CheckCircle2 className="h-6 w-6 text-blue-400" />
        );

      default:
        return (
          <CheckCircle2 className="h-6 w-6 text-blue-400" />
        );
    }
  };

  const unlockedCount = achievements.filter(
    (achievement) => achievement.unlocked
  ).length;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
            <Award className="h-6 w-6 text-amber-400" />
            Platform Achievements & Milestones
          </h1>

          <p className="text-xs text-slate-400 mt-1">
            Achievements are based on real LearnX
            learning activity, verified sessions,
            skill progress, and assessments.
          </p>
        </div>

        {!loading && !error && (
          <div className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/60 text-xs text-slate-300">
            <span className="text-cyan-400 font-bold">
              {unlockedCount}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-white">
              {achievements.length}
            </span>{' '}
            unlocked
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-950/30 text-rose-300 text-xs flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold">
              Unable to load achievements
            </p>

            <p className="mt-1 text-rose-300/80">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={fetchAchievements}
            className="shrink-0 px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-950/40 hover:bg-rose-900/40 text-rose-200 font-semibold flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">
          Loading your real achievements...
        </div>
      ) : error ? null : achievements.length === 0 ? (
        /* Empty State */
        <div className="py-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8">
          <Award className="h-10 w-10 text-slate-600 mx-auto mb-3" />

          <h2 className="text-sm font-bold text-white">
            No achievements available
          </h2>

          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Complete real LearnX learning activities
            and verified knowledge-sharing sessions to
            make progress toward achievements.
          </p>

          <button
            type="button"
            onClick={() => navigate('/discover')}
            className="mt-4 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-semibold"
          >
            Explore LearnX
          </button>
        </div>
      ) : (
        /* Achievement Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`p-5 rounded-2xl border transition-all ${
                achievement.unlocked
                  ? 'border-cyan-500/40 bg-gradient-to-b from-cyan-950/30 to-slate-900/60 shadow-lg'
                  : 'border-slate-800 bg-slate-950/40 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`p-2.5 rounded-xl border ${
                    achievement.unlocked
                      ? 'border-cyan-500/30 bg-cyan-950/40'
                      : 'border-slate-800 bg-slate-900'
                  }`}
                >
                  {getIcon(achievement.icon)}
                </div>

                {achievement.unlocked ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800/40 text-[10px] text-emerald-300 font-bold">
                    UNLOCKED
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Lock className="h-3 w-3" />
                    Locked
                  </span>
                )}
              </div>

              <h3 className="text-sm font-bold text-white mb-1">
                {achievement.title}
              </h3>

              <p className="text-xs text-slate-400 leading-relaxed">
                {achievement.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Achievement Rule */}
      {!loading &&
        !error &&
        achievements.length > 0 && (
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40">
            <h3 className="text-xs font-bold text-white mb-2">
              Achievement Rule
            </h3>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              LearnX achievements are awarded from
              authenticated user activity. Locked
              achievements remain locked until the
              corresponding platform requirement is
              actually completed.
            </p>
          </div>
        )}
    </div>
  );
}