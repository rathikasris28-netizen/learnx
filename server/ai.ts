
import { db } from "./db.ts";
import { Prisma } from "@prisma/client";

/**
 * ============================================================
 * LearnX AI utilities
 * ============================================================
 *
 * Database:
 *   Supabase PostgreSQL
 *
 * ORM:
 *   Prisma
 *
 * Important:
 *   - No SQLite
 *   - No local database
 *   - No demo users
 *   - No demo sessions
 *   - No fake credits
 *   - No automatic test data
 *
 * Supabase Authentication remains responsible for:
 *   - email
 *   - password
 *   - email verification
 *   - authentication sessions
 *
 * Current application data:
 *   - Supabase Auth user metadata
 *   - skills
 *   - user_skills
 *   - learning requests
 *   - availability
 *   - matches
 *   - sessions
 *   - Time Credits
 *   - reviews
 *   - reliability
 *   - notifications
 *   - learning progress
 *   - quizzes
 *   - achievements
 *   - certificates
 *   - partners
 *   - reports
 *   - admin data
 */

/**
 * ============================================================
 * NATURAL LANGUAGE SEARCH
 * ============================================================
 */

export interface NaturalLanguageSearchResult {
  skill_name?: string;
  level?: string;
  language?: string;
  preferred_time?: string;
  goal?: string;
}

export async function parseNaturalLanguageSearch(
  query: string,
): Promise<NaturalLanguageSearchResult> {
  const qLower = query.toLowerCase();

  /**
   * Read the real skill catalog from Supabase PostgreSQL.
   */
  const skills = await db.skill.findMany({
    where: {
      isActive: true,
    },
    select: {
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  let matchedSkill: string | undefined;

  for (const skill of skills) {
    if (qLower.includes(skill.name.toLowerCase())) {
      matchedSkill = skill.name;
      break;
    }
  }

  /**
   * Level extraction.
   */
  let level: string | undefined;

  if (
    qLower.includes("beginner") ||
    qLower.includes("basic") ||
    qLower.includes("starter") ||
    qLower.includes("intro")
  ) {
    level = "BEGINNER";
  } else if (
    qLower.includes("intermediate") ||
    qLower.includes("medium")
  ) {
    level = "INTERMEDIATE";
  } else if (
    qLower.includes("advanced") ||
    qLower.includes("expert") ||
    qLower.includes("master")
  ) {
    level = "ADVANCED";
  } else if (qLower.includes("elementary")) {
    level = "ELEMENTARY";
  }

  /**
   * Language extraction.
   */
  let language: string | undefined;

  if (qLower.includes("tamil")) {
    language = "Tamil";
  } else if (qLower.includes("english")) {
    language = "English";
  } else if (qLower.includes("hindi")) {
    language = "Hindi";
  }

  /**
   * Time extraction.
   *
   * Supports:
   *   6 pm
   *   6:30 pm
   *   18:00
   *   7:00 pm
   */
  let preferred_time: string | undefined;

  const timeMatch = query.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)?/,
  );

  if (
    timeMatch &&
    (
      qLower.includes("pm") ||
      qLower.includes("am") ||
      qLower.includes("at") ||
      qLower.includes("clock")
    )
  ) {
    let hour = Number.parseInt(timeMatch[1], 10);

    const minute = timeMatch[2] ?? "00";
    const ampm = timeMatch[3]?.toLowerCase();

    if (ampm === "pm" && hour < 12) {
      hour += 12;
    }

    if (ampm === "am" && hour === 12) {
      hour = 0;
    }

    preferred_time =
      `${hour.toString().padStart(2, "0")}:${minute}:00`;
  }

  return {
    skill_name: matchedSkill,
    level,
    language,
    preferred_time,
    goal: query,
  };
}

/**
 * ============================================================
 * MATCHING
 * ============================================================
 */

export interface MatchCandidate {
  user_id: string;
  full_name: string;
  profile_photo: string | null;
  city: string | null;
  state: string | null;
  preferred_language: string;
  bio: string | null;

  skill_id: string;
  skill_name: string;
  skill_level: string;

  availability_status: string;
  available_from: string;
  available_until: string;

  trust_score: number;
  reliability_score: number;

  verification_level: string;

  rating_avg: number;
  rating_count: number;

  match_percentage: number;
  why_recommended: string;
}

export interface ComputeMatchesParams {
  learner_id: string;
  skill_id?: string;
  skill_name?: string;
  level?: string;
  language?: string;
  time?: string;
}

/**
 * Find real knowledge sharers from PostgreSQL.
 *
 * No demo users.
 * No hard-coded mentor accounts.
 * No SQLite.
 *
 * IMPORTANT:
 * The old implementation queried public.profiles.
 * That table is no longer part of the current LearnX database.
 *
 * Profile information is now stored in Supabase Auth user metadata.
 * Therefore auth.users is used for matching profile information.
 *
 * Current database columns used:
 *   auth.users.raw_user_meta_data
 *   user_skills.user_id
 *   user_skills.skill_id
 *   user_skills.skill_type
 *   user_skills.skill_level
 *   skills.id
 *   skills.name
 *   skills.is_active
 *   user_availability
 *   user_reliability
 *   session_reviews
 */
export async function computeMatches(
  params: ComputeMatchesParams & {
    profiles?: Array<{
      id: string;
      email?: string | null;
      user_metadata?: Record<string, any> | null;
      email_confirmed_at?: string | null;
    }>;
  },
): Promise<MatchCandidate[]> {
  const learnerSkills = await db.userSkill.findMany({
    where: {
      userId: params.learner_id,
      skillType: "LEARN",
      isActive: true,
    },
    select: {
      skillId: true,
      skillLevel: true,
      skill: {
        select: {
          name: true,
        },
      },
    },
  });

  const learnerSkillLevels = new Map<string, string>();

  for (const skill of learnerSkills) {
    learnerSkillLevels.set(
      skill.skillId,
      String(skill.skillLevel ?? "BEGINNER"),
    );
  }

  let learnerSkillIds: string[] = [];

  if (!params.skill_id && !params.skill_name) {
    learnerSkillIds = learnerSkills.map(
      (skill) => skill.skillId,
    );

    if (learnerSkillIds.length === 0) {
      return [];
    }
  }

  const shareSkills = await db.userSkill.findMany({
    where: {
      skillType: "SHARE",
      isActive: true,
      ...(params.skill_id
        ? { skillId: params.skill_id }
        : {}),
      ...(params.skill_name
        ? {
            skill: {
              name: {
                equals: params.skill_name,
                mode: "insensitive",
              },
            },
          }
        : {}),
      ...(!params.skill_id &&
      !params.skill_name &&
      learnerSkillIds.length > 0
        ? {
            skillId: {
              in: learnerSkillIds,
            },
          }
        : {}),
    },
    select: {
      userId: true,
      skillId: true,
      skillLevel: true,
      skill: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
    },
  });

  if (shareSkills.length === 0) {
    return [];
  }

  const profiles = new Map(
    (params.profiles ?? []).map((profile) => [
      profile.id,
      profile,
    ]),
  );

  const reliabilityRows =
    await db.userReliability.findMany({
      where: {
        userId: {
          in: [
            ...new Set(
              shareSkills.map(
                (skill) => skill.userId,
              ),
            ),
          ],
        },
      },
      select: {
        userId: true,
        reliabilityScore: true,
      },
    });

  const reliabilityMap = new Map(
    reliabilityRows.map((row) => [
      row.userId,
      Number(row.reliabilityScore ?? 90),
    ]),
  );

  const availabilityRows =
    await db.userAvailability.findMany({
      where: {
        userId: {
          in: [
            ...new Set(
              shareSkills.map(
                (skill) => skill.userId,
              ),
            ),
          ],
        },
      },
      select: {
        userId: true,
        status: true,
        availableFrom: true,
        availableUntil: true,
      },
    });

  const availabilityMap = new Map(
    availabilityRows.map((row) => [
      row.userId,
      row,
    ]),
  );

  const reviewRows =
    await db.sessionReview.groupBy({
      by: ["reviewedUserId"],
      where: {
        reviewedUserId: {
          in: [
            ...new Set(
              shareSkills.map(
                (skill) => skill.userId,
              ),
            ),
          ],
        },
      },
      _avg: {
        rating: true,
      },
      _count: {
        id: true,
      },
    });

  const reviewMap = new Map(
    reviewRows.map((row) => [
      row.reviewedUserId,
      {
        avg: Number(row._avg.rating ?? 5),
        count: Number(row._count.id ?? 0),
      },
    ]),
  );

  const candidates: MatchCandidate[] = [];

  for (const row of shareSkills) {
    if (row.userId === params.learner_id) {
      continue;
    }

    if (!row.skill.isActive) {
      continue;
    }

    const profile = profiles.get(row.userId);

    /*
     * Only registered users that were returned
     * by Supabase Auth are valid sharers.
     */
    if (!profile) {
      continue;
    }

    const metadata =
      profile.user_metadata ?? {};

    /*
     * Only Knowledge Sharers / Mentors
     * should appear in Explore Sharers.
     */
    const role = String(
      metadata.role ?? "",
    );

    if (
      role !== "KNOWLEDGE_SHARER" &&
      role !== "MENTOR"
    ) {
      continue;
    }

    if (
      metadata.is_active === false
    ) {
      continue;
    }

    const availability =
      availabilityMap.get(row.userId);

    const availabilityStatus =
      String(
        availability?.status ??
          "INACTIVE",
      );

    const availableFrom =
      availability?.availableFrom
        ? String(
            availability.availableFrom,
          )
        : "17:00:00";

    const availableUntil =
      availability?.availableUntil
        ? String(
            availability.availableUntil,
          )
        : "21:00:00";

    const reliabilityScore =
      reliabilityMap.get(
        row.userId,
      ) ?? 90;

    const trustScore = Math.min(
      100,
      Math.max(
        0,
        Math.round(reliabilityScore),
      ),
    );

    const review =
      reviewMap.get(row.userId);

    const ratingAvg =
      review?.avg ?? 5;

    const ratingCount =
      review?.count ?? 0;

    const skillLevel = String(
      row.skillLevel ??
        "BEGINNER",
    );

    const learnerLevel =
      learnerSkillLevels.get(
        row.skillId,
      );

    let score = 70;

    /*
     * Exact learner skill overlap.
     */
    if (
      learnerSkillIds.includes(
        row.skillId,
      )
    ) {
      score += 10;
    }

    if (
      availabilityStatus ===
      "ACTIVE"
    ) {
      score += 12;
    } else if (
      availabilityStatus ===
      "IN_CLASS"
    ) {
      score -= 5;
    } else {
      score -= 10;
    }

    if (
      params.time &&
      params.time >= availableFrom &&
      params.time <= availableUntil
    ) {
      score += 8;
    }

    const profileLanguage =
      String(
        metadata.preferred_language ??
          "English",
      );

    if (
      params.language &&
      profileLanguage
        .toLowerCase()
        .includes(
          params.language.toLowerCase(),
        )
    ) {
      score += 10;
    }

    if (params.level) {
      if (
        params.level ===
        skillLevel
      ) {
        score += 5;
      } else if (
        params.level ===
          "BEGINNER" &&
        (
          skillLevel ===
            "INTERMEDIATE" ||
          skillLevel ===
            "ADVANCED"
        )
      ) {
        score += 4;
      }
    } else if (learnerLevel) {
      if (
        learnerLevel ===
        skillLevel
      ) {
        score += 8;
      } else if (
        learnerLevel ===
          "BEGINNER" &&
        (
          skillLevel ===
            "INTERMEDIATE" ||
          skillLevel ===
            "ADVANCED"
        )
      ) {
        score += 5;
      } else if (
        learnerLevel ===
          "INTERMEDIATE" &&
        skillLevel ===
          "ADVANCED"
      ) {
        score += 4;
      }
    }

    const trustBonus = Math.min(
      5,
      Math.max(
        0,
        ((trustScore - 80) /
          20) *
          5,
      ),
    );

    score += trustBonus;

    if (ratingAvg >= 4.5) {
      score += 2;
    }

    const finalPercentage =
      Math.min(
        99,
        Math.max(
          60,
          Math.round(score),
        ),
      );

    const fullName =
      String(
        metadata.full_name ??
          profile.email?.split("@")[0] ??
          "LearnX User",
      );

    const reasons: string[] = [
      `Shares ${row.skill.name} (${skillLevel})`,
    ];

    if (learnerLevel) {
      reasons.push(
        `Learner level: ${learnerLevel}`,
      );
    }

    if (
      availabilityStatus ===
      "ACTIVE"
    ) {
      reasons.push(
        `Currently Active (${availableFrom.slice(
          0,
          5,
        )} - ${availableUntil.slice(
          0,
          5,
        )})`,
      );
    }

    if (profileLanguage) {
      reasons.push(
        `Speaks ${profileLanguage}`,
      );
    }

    if (ratingAvg >= 4.5) {
      reasons.push(
        `${ratingAvg.toFixed(
          1,
        )}/5.0 Rating`,
      );
    }

    reasons.push(
      `${trustScore}% Trust Score`,
    );

    candidates.push({
      user_id:
        row.userId,

      full_name:
        fullName,

      profile_photo:
        metadata.profile_photo_url ??
        null,

      city:
        metadata.city ??
        null,

      state:
        metadata.state ??
        null,

      preferred_language:
        profileLanguage,

      bio:
        metadata.bio ??
        null,

      skill_id:
        row.skillId,

      skill_name:
        row.skill.name,

      skill_level:
        skillLevel,

      availability_status:
        availabilityStatus,

      available_from:
        availableFrom,

      available_until:
        availableUntil,

      trust_score:
        trustScore,

      reliability_score:
        reliabilityScore,

      verification_level:
        "COMMUNITY_VERIFIED",

      rating_avg:
        ratingAvg,

      rating_count:
        ratingCount,

      match_percentage:
        finalPercentage,

      why_recommended:
        `${finalPercentage}% Match: ${reasons.join(
          " · ",
        )}`,
    });
  }

  candidates.sort(
    (a, b) =>
      b.match_percentage -
      a.match_percentage,
  );

  return candidates;
}

/**
 * ============================================================
 * STRUCTURED LEARNING PLAN
 * ============================================================
 */

export interface LearningPlanWeek {
  week: number;
  title: string;
  topics: string[];
  activities: string[];
  goal: string;
}

export interface StructuredLearningPlan {
  skill: string;
  level: string;
  duration_weeks: number;
  weeks: LearningPlanWeek[];
}

/**
 * Generate a structured 4-week learning plan.
 *
 * This function does not write anything to the database.
 * The route can decide whether/when to save it.
 */
export function generateStructuredLearningPlan(
  skillName: string,
  level: string = "BEGINNER",
): StructuredLearningPlan {
  const normalizedLevel =
    level.toUpperCase();

  return {
    skill: skillName,
    level: normalizedLevel,
    duration_weeks: 4,

    weeks: [
      {
        week: 1,
        title: "Foundation",

        topics: [
          `${skillName} basics`,
          "Important terminology",
          "Core concepts",
          "Basic tools and environment",
        ],

        activities: [
          `Understand the fundamentals of ${skillName}.`,
          "Practice simple examples.",
          "Create short notes for important concepts.",
          "Complete beginner-level exercises.",
        ],

        goal:
          `Build a strong foundation in ${skillName}.`,
      },

      {
        week: 2,
        title: "Core Skills",

        topics: [
          "Core concepts",
          "Common operations",
          "Practical examples",
          "Problem solving",
        ],

        activities: [
          "Practice intermediate examples.",
          "Solve small problems.",
          "Work with real-world examples.",
          "Attend a knowledge-sharing session.",
        ],

        goal:
          `Develop practical working knowledge of ${skillName}.`,
      },

      {
        week: 3,
        title: "Practical Application",

        topics: [
          "Real-world use cases",
          "Mini project concepts",
          "Best practices",
          "Debugging and improvement",
        ],

        activities: [
          "Build a small practical project.",
          "Identify and fix mistakes.",
          "Apply best practices.",
          "Share what you learned with another learner.",
        ],

        goal:
          `Apply ${skillName} to a practical task.`,
      },

      {
        week: 4,
        title: "Project and Assessment",

        topics: [
          "Mini project",
          "Revision",
          "Assessment",
          "Knowledge sharing",
        ],

        activities: [
          "Complete the mini project.",
          "Revise important concepts.",
          "Take a skill assessment or quiz.",
          "Review your learning progress.",
          "Share one useful concept with another learner.",
        ],

        goal:
          `Demonstrate practical understanding of ${skillName}.`,
      },
    ],
  };
}

/**
 * ============================================================
 * SKILL HELPERS
 * ============================================================
 */

/**
 * Returns a real skill by name.
 */
export async function findSkillByName(
  skillName: string,
) {
  return db.skill.findFirst({
    where: {
      name: {
        equals: skillName,
        mode: "insensitive",
      },
      isActive: true,
    },
  });
}

/**
 * Returns a real skill by ID.
 */
export async function findSkillById(
  skillId: string,
) {
  return db.skill.findUnique({
    where: {
      id: skillId,
    },
  });
}

/**
 * Returns real SHARE skills belonging to a user.
 */
export async function getUserShareSkills(
  userId: string,
) {
  return db.userSkill.findMany({
    where: {
      userId,
      skillType: "SHARE",
    },

    include: {
      skill: true,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Returns real LEARN skills belonging to a user.
 */
export async function getUserLearnSkills(
  userId: string,
) {
  return db.userSkill.findMany({
    where: {
      userId,
      skillType: "LEARN",
    },

    include: {
      skill: true,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}
