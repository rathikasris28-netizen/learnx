import {
  Router,
  Request,
  Response,
  NextFunction,
} from 'express';

import crypto from 'node:crypto';

import { db } from './db.ts';
import {
  supabaseAdmin,
  supabaseAnon,
} from './supabase.ts';

import {
  createLiveKitToken,
  LIVEKIT_URL,
} from './livekit.ts';

import {
  parseNaturalLanguageSearch,
  computeMatches,
  generateStructuredLearningPlan,
} from './ai.ts';

export const apiRouter = Router();

/* =========================================================
   REAL-TIME EVENTS
========================================================= */

const events = new Map<
  string,
  {
    event: string;
    data: unknown;
    createdAt: number;
  }
>();

export function broadcastEvent(
  event: string,
  data: unknown
) {
  const id = crypto.randomUUID();

  events.set(id, {
    event,
    data,
    createdAt: Date.now(),
  });

  if (events.size > 500) {
    const firstKey = events.keys().next().value;

    if (firstKey) {
      events.delete(firstKey);
    }
  }

  return id;
}

/* =========================================================
   HELPERS
========================================================= */

const enumValue = (
  value: unknown,
  fallback: string
) =>
  String(value ?? fallback).toUpperCase();

const isoDate = (
  value: unknown
) =>
  value
    ? new Date(String(value))
    : undefined;

const bad = (
  res: Response,
  message: string,
  status = 400
) =>
  res.status(status).json({
    error: message,
  });

/* =========================================================
   AUTHENTICATION
========================================================= */

async function authUser(req: Request) {
  const header =
    req.headers.authorization ?? '';

  if (!header.startsWith('Bearer ')) {
    return null;
  }

  const token = header.slice(7);

  const {
    data,
    error,
  } =
    await supabaseAdmin.auth.getUser(
      token
    );

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

async function getAppProfile(user: any) {
  const userId = user.id;
  const metadata = user.user_metadata ?? {};

  const [
    userSkills,
    wallet,
    availability,
    reliability,
  ] = await Promise.all([
    db.userSkill.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        skill: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),

    db.timeCreditWallet.findUnique({
      where: {
        userId,
      },
    }),

    db.userAvailability.findUnique({
      where: {
        userId,
      },
    }),

    db.userReliability.findUnique({
      where: {
        userId,
      },
    }),
  ]);

  return {
    id: userId,
    userId,

    fullName:
      metadata.full_name ??
      user.email?.split('@')[0] ??
      'LearnX User',

    ageGroup:
      metadata.age_group ?? null,

    city:
      metadata.city ?? null,

    state:
      metadata.state ?? null,

    preferredLanguage:
      metadata.preferred_language ??
      'English',

    educationWorkStatus:
      metadata.education_work_status ??
      null,

    profilePhotoUrl:
      metadata.profile_photo_url ??
      null,

    bio:
      metadata.bio ??
      null,

    role:
      metadata.role ??
      'LEARNER',

    isEmailVerified:
      Boolean(user.email_confirmed_at),

    onboardingCompleted:
      Boolean(
        metadata.onboarding_completed
      ),

    onboarding_completed:
      Boolean(
        metadata.onboarding_completed
      ),

    isActive:
      metadata.is_active !== false,

    learningGoal:
      metadata.learning_goal ??
      null,

    targetLevel:
      metadata.target_level ??
      null,

    schedule:
      metadata.schedule ??
      null,

    interests:
      Array.isArray(metadata.interests)
        ? metadata.interests
        : [],

    teachingExperience:
      metadata.teaching_experience ??
      null,

    teachingLanguages:
      Array.isArray(
        metadata.teaching_languages
      )
        ? metadata.teaching_languages
        : [],

    shareSkillDetails:
      metadata.share_skill_details ??
      {},

    createdAt:
      user.created_at
        ? new Date(user.created_at)
        : new Date(),

    updatedAt:
      new Date(),

    userSkills,
    wallet,
    availability,
    reliability,
  };
}

async function profileFor(req: Request) {
  const user = await authUser(req);
  if (!user) return null;
  return { user, profile: await getAppProfile(user) };
}

async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const auth = await profileFor(req);

  if (!auth) {
    return bad(
      res,
      'Authentication required',
      401
    );
  }

  
  (req as any).auth = auth;

  next();
}
async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const auth = await profileFor(req);
  if (!auth) return bad(res, 'Authentication required', 401);
  if (auth.profile.role !== 'ADMIN') return bad(res, 'Admin access required', 403);
  (req as any).auth = auth;
  next();
}

function auth(req: Request): { user: any; profile: any } {
  return (req as any).auth;
}

function publicProfile(p: any) {
  if (!p) return null;

  const learnSkills = (p.userSkills ?? [])
    .filter((x: any) => x.skillType === 'LEARN')
    .map((x: any) => ({ ...x.skill, skill_level: x.skillLevel }));

  const shareSkills = (p.userSkills ?? [])
    .filter((x: any) => x.skillType === 'SHARE')
    .map((x: any) => ({ ...x.skill, skill_level: x.skillLevel }));

  return {
    ...p,
    user_id: p.id,
    profile_photo: p.profilePhotoUrl,
    learn_skills: learnSkills,
    share_skills: shareSkills,
    userSkills: undefined,
  };
}

/* =========================================================
   HEALTH
========================================================= */

apiRouter.get(
  '/health',
  async (_req, res) => {
    try {
      const [
        skills,
        users,
      ] =
        await Promise.all([
          db.skill.count({
            where: {
              isActive: true,
            },
          }),

          db.timeCreditWallet.count(),
        ]);

      res.json({
        status: 'ok',
        database:
          'Supabase PostgreSQL',
        skills,
        users,
      });
    } catch (e) {
      res.status(503).json({
        status: 'error',
        database: 'unavailable',
        error: String(e),
      });
    }
  }
);

apiRouter.get(
  '/v1/health',
  async (_req, res) => {
    try {
      await db.$queryRaw`
        SELECT 1
      `;

      res.json({
        status: 'ok',
        database:
          'Supabase PostgreSQL',
      });
    } catch (e) {
      res.status(503).json({
        status: 'error',
        error: String(e),
      });
    }
  }
);

/* =========================================================
   SKILLS
========================================================= */

const listSkills = async (
  _req: Request,
  res: Response
) => {
  const skills =
    await db.skill.findMany({
      where: {
        isActive: true,
      },

      orderBy: [
        {
          category:
            'asc',
        },

        {
          name:
            'asc',
        },
      ],
    });

  return res.json(
    skills
  );
};

apiRouter.get(
  '/v1/skills',
  listSkills
);

apiRouter.get(
  '/skills',
  listSkills
);

apiRouter.get(
  '/skills/:id',
  async (req, res) => {
    const skill =
      await db.skill.findFirst({
        where: {
          id:
            req.params.id,

          isActive:
            true,
        },
      });

    if (!skill) {
      return bad(
        res,
        'Skill not found',
        404
      );
    }

    return res.json(
      skill
    );
  }
);
/* =========================================================
   EVENTS
========================================================= */

apiRouter.get(
  '/events',
  async (_req, res) => {
    res.json(
      [
        ...events.entries(),
      ].map(
        ([
          id,
          event,
        ]) => ({
          id,
          ...event,
        })
      )
    );
  }
);

apiRouter.get(
  '/sync/events',
  async (req, res) => {
    const since =
      Number(
        req.query.since ?? 0
      );

    res.json(
      [
        ...events.entries(),
      ]
        .filter(
          ([, x]) =>
            x.createdAt > since
        )
        .map(
          ([id, x]) => ({
            id,
            ...x,
          })
        )
    );
  }
);

/* =========================================================
   REGISTRATION
========================================================= */
async function register(
  req: Request,
  res: Response,
  forcedRole?:
    | 'LEARNER'
    | 'KNOWLEDGE_SHARER'
) {
  const b =
    req.body ?? {};

  /*
   * Frontend uses:
   *
   * LEARNER
   * MENTOR
   *
   * Backend/database uses:
   *
   * LEARNER
   * KNOWLEDGE_SHARER
   *
   * Therefore MENTOR is converted here.
   */

  const requestedRole =
    enumValue(
      b.role,
      'LEARNER'
    );

  const role =
    forcedRole ??
    (
      requestedRole ===
      'MENTOR'
        ? 'KNOWLEDGE_SHARER'
        : requestedRole
    );

  if (
    ![
      'LEARNER',
      'KNOWLEDGE_SHARER',
    ].includes(role)
  ) {
    return bad(
      res,
      'Invalid registration role'
    );
  }

  if (
    !b.email ||
    !b.password ||
    !b.full_name
  ) {
    return bad(
      res,
      'full_name, email and password are required'
    );
  }

  const shareSkills =
    b.share_skills ??
    b.skills_to_share ??
    b.skills_you_will_share ??
    [];

  /*
   * Knowledge Sharer / Mentor must
   * select at least one skill to share.
   */

  if (
    role === 'KNOWLEDGE_SHARER' &&
    (!Array.isArray(shareSkills) ||
      shareSkills.length === 0)
  ) {
    return bad(
      res,
      'Please select at least one skill you will share.'
    );
  }

  /*
   * Create the Supabase authentication account through the
   * normal signUp flow.
   *
   * IMPORTANT:
   * - Supabase sends the confirmation email from signUp()
   *   when "Confirm email" is enabled in Supabase Auth.
   * - Do NOT use admin.createUser() here because that admin
   *   method does not send the signup confirmation email.
   * - The account remains unverified until the user clicks
   *   the verification link.
   */
 
  const {
  data,
  error,
} =
  await supabaseAdmin.auth.admin.createUser({
    email: String(
      b.email
    ).trim().toLowerCase(),

    password:
      String(b.password),

    email_confirm:
      true,

    user_metadata: {
      full_name:
        String(
          b.full_name
        ).trim(),

      age_group:
        b.age_group ??
        null,

      city:
        b.city ??
        null,

      state:
        b.state ??
        null,

      preferred_language:
        b.preferred_language ??
        'English',

      education_work_status:
        b.education_work_status ??
        null,

      profile_photo_url:
        b.profile_photo_url ??
        null,

      role,

      bio:
        b.bio ??
        null,

      onboarding_completed:
        false,

      is_active:
        true,
    },
  });

  if (
    error ||
    !data.user
  ) {
    return bad(
      res,
      error?.message ??
        'Registration failed',
      400
    );
  }

  const user =
    data.user;

  try {
    /*
     * Database transaction:
     *
     * 1. Create wallet
     * 2. Learner gets +5 welcome credits
     * 3. Mentor starts with 0 credits
     * 4. Save mentor sharing skills
     */

    const result =
      await db.$transaction(
        async (tx) => {
          const welcomeBonus =
            role === 'LEARNER'
              ? 5
              : 0;

          /*
           * Store registration/profile
           * information in Supabase metadata.
           */

          await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            {
              user_metadata: {
                ...(user.user_metadata ?? {}),

                full_name:
                  String(
                    b.full_name
                  ).trim(),

                age_group:
                  b.age_group ??
                  null,

                city:
                  b.city ??
                  null,

                state:
                  b.state ??
                  null,

                preferred_language:
                  b.preferred_language ??
                  'English',

                education_work_status:
                  b.education_work_status ??
                  null,

                profile_photo_url:
                  b.profile_photo_url ??
                  null,

                role,

                bio:
                  b.bio ??
                  null,

                onboarding_completed:
                  false,

                is_active:
                  true,
              },
            }
          );

          /*
           * Create Time Credit wallet.
           *
           * Learner:
           * +5 credits
           *
           * Knowledge Sharer:
           * 0 credits
           */

          const wallet =
            await tx.timeCreditWallet.create(
              {
                data: {
                  userId:
                    user.id,

                  balance:
                    welcomeBonus,
                },
              }
            );

          /*
           * Record learner welcome
           * bonus in the transaction ledger.
           */

          if (
            role ===
            'LEARNER'
          ) {
            await tx.timeCreditTransaction.create(
              {
                data: {
                  userId:
                    user.id,

                  amount:
                    5,

                  transactionType:
                    'ADJUSTMENT',

                  description:
                    'Welcome bonus',
                },
              }
            );
          }

          /*
           * Save Mentor / Knowledge Sharer
           * skills INSIDE the same transaction.
           */

          if (
            role ===
            'KNOWLEDGE_SHARER'
          ) {
            await saveSkills(
              user.id,
              shareSkills,
              'SHARE',
              tx
            );
          }

          /*
           * Do NOT call getAppProfile()
           * here.
           *
           * The transaction client (tx) and
           * normal Prisma client (db) are
           * different clients.
           *
           * Profile is fetched after the
           * transaction finishes.
           */

          return {
            wallet,
            welcomeBonus,
          };
        }
      );

    /*
     * Get the latest Supabase user after
     * registration metadata has been updated.
     */

    const freshUser =
      await supabaseAdmin.auth.admin.getUserById(
        user.id
      );

    /*
     * Fetch the fresh application profile
     * after the transaction has committed.
     */

    const profile =
      await getAppProfile(
        freshUser.data.user ??
          user
      );

    /*
     * Registration does NOT automatically
     * authenticate the user.
     *
     * Email verification is required first.
     */

    return res
      .status(201)
      .json({
        user: {
          id:
            user.id,

          user_id:
            user.id,

          email:
            user.email,

          email_confirmed:
  true,
          role,

          wallet_balance:
            result.wallet
              .balance,
        },

        profile:
          publicProfile(
            profile
          ),

        user_id:
          user.id,

        email_confirmed:
  true,

        role,

        welcome_bonus:
          result.welcomeBonus,

                balance:
          result.wallet
            .balance,
      },
    );
  } catch (e) {
    /*
     * If the database transaction fails,
     * remove the Supabase auth account so
     * registration does not leave a
     * half-created user behind.
     */

    await supabaseAdmin.auth.admin
      .deleteUser(
        user.id
      )
      .catch(
        () => undefined
      );

    return bad(
      res,
      String(e),
      500
    );
  }
}

apiRouter.post(
  '/auth/register',
  (req, res) =>
    register(req, res)
);

/*
 * Explicit learner registration.
 */

apiRouter.post(
  '/auth/register/learner',
  (req, res) =>
    register(
      req,
      res,
      'LEARNER'
    )
);

/*
 * Explicit mentor registration.
 *
 * Frontend calls this role MENTOR,
 * database stores KNOWLEDGE_SHARER.
 */

apiRouter.post(
  '/auth/register/mentor',
  (req, res) =>
    register(
      req,
      res,
      'KNOWLEDGE_SHARER'
    )
);

/* =========================================================
   LOGIN
========================================================= */

apiRouter.post(
  '/auth/login',
  async (req, res) => {
    const {
      email,
      password,
    } = req.body ?? {};

    if (
      !email ||
      !password
    ) {
      return bad(
        res,
        'Email and password are required'
      );
    }

    const {
      data,
      error,
    } =
      await supabaseAnon.auth.signInWithPassword({
        email: String(
          email
        ).trim().toLowerCase(),

        password:
          String(password),
      });

    /*
     * Invalid email/password.
     */

    if (error) {
  return bad(
    res,
    String(error.message ?? 'Login failed'),
    401
  );
}
    /*
     * Supabase should return a session
     * for a successful login.
     */

    if (
      !data.session ||
      !data.user
    ) {
      return bad(
        res,
        'Login failed',
        401
      );
    }

    /*
     * Email verification is required
     * before accessing LearnX.
     */

    

    /*
     * Fetch the latest LearnX profile
     * after email verification succeeds.
     */

    const profile =
      await getAppProfile(
        data.user
      );

    const publicUser = {
      ...data.user,

      id:
        data.user.id,

      user_id:
        data.user.id,

      email_confirmed:
        Boolean(
          data.user.email_confirmed_at
        ),

      role:
        profile.role,

      wallet_balance:
        profile.wallet
          ?.balance ?? 0,
    };

    return res.json({
      session:
        data.session,

      token:
        data.session
          .access_token,

      user:
        publicUser,

      profile:
        publicProfile(
          profile
        ),
    });
  }
);

/* =========================================================
   EMAIL VERIFICATION
========================================================= */



/*
 * GET endpoint:
 * The LearnX verify-email page calls this endpoint with
 * ?token_hash=...&type=email.
 */


/*
 * POST endpoint:
 * Keep POST support for the existing frontend/client
 * so older LearnX verification calls continue to work.
 */

apiRouter.post(
  '/auth/resend-verification',
  async (req, res) => {
    try {
      const email =
        String(
          req.body?.email ??
          ''
        ).trim().toLowerCase();

      if (!email) {
        return bad(
          res,
          'Email is required'
        );
      }

      const webAppUrl = (
        process.env.WEB_URL ??
        process.env.APP_URL ??
        'http://localhost:5173'
      ).replace(/\/+$/, '');

      const {
        error,
      } =
        await supabaseAnon.auth.resend({
          type: 'signup',
          email,
          options: {
            emailRedirectTo:
              `${webAppUrl}/verify-email`,
          },
        });

      if (error) {
        return bad(
          res,
          error.message
        );
      }

      return res.json({
        success:
          true,

        message:
          'Verification email sent. Please check your inbox and spam folder.',
      });
    } catch (e) {
      console.error(
        'Resend verification error:',
        e
      );

      return bad(
        res,
        'Unable to resend verification email',
        500
      );
    }
  }
);

/* =========================================================
   CURRENT USER
========================================================= */

apiRouter.get(
  '/auth/me',
  requireAuth,
  async (req, res) => {
    const {
      profile,
      user,
    } =
      auth(req);

    const fresh = await getAppProfile(user);

    res.json({
      user,
      profile:
        publicProfile(
          fresh
        ),
    });
  }
);

/* =========================================================
   PROFILE
========================================================= */

apiRouter.put(
  '/profile',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    const b =
      req.body ?? {};

    const currentUser = await authUser(req);
    if (!currentUser) return bad(res, 'Authentication required', 401);

    const currentMetadata = currentUser.user_metadata ?? {};
    await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      user_metadata: {
        ...currentMetadata,
        full_name: b.full_name ?? profile.fullName,
        age_group: b.age_group ?? profile.ageGroup,
        city: b.city ?? profile.city,
        state: b.state ?? profile.state,
        preferred_language: b.preferred_language ?? profile.preferredLanguage,
        education_work_status: b.education_work_status ?? profile.educationWorkStatus,
        profile_photo_url: b.profile_photo_url ?? profile.profilePhotoUrl,
        bio: b.bio ?? profile.bio,
      },
    });

    const p = await getAppProfile({
      ...currentUser,
      user_metadata: {
        ...currentMetadata,
        full_name: b.full_name ?? profile.fullName,
        age_group: b.age_group ?? profile.ageGroup,
        city: b.city ?? profile.city,
        state: b.state ?? profile.state,
        preferred_language: b.preferred_language ?? profile.preferredLanguage,
        education_work_status: b.education_work_status ?? profile.educationWorkStatus,
        profile_photo_url: b.profile_photo_url ?? profile.profilePhotoUrl,
        bio: b.bio ?? profile.bio,
      },
    });

    res.json(publicProfile(p));
  }
);

apiRouter.get(
  '/profile/:id',
  async (req, res) => {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(req.params.id);
    if (error || !data.user) return bad(res, 'Profile not found', 404);
    const p = await getAppProfile(data.user);
    return res.json(publicProfile(p));
  }
);

/* =========================================================
   SKILL MANAGEMENT
========================================================= */

async function saveSkills(
  userId: string,
  items: any[],
  type: 'LEARN' | 'SHARE',
  client: any = db
) {
  if (!Array.isArray(items)) {
    return 0;
  }

  let savedCount = 0;

  for (const item of items) {
    const skillId =
      typeof item === 'string'
        ? item
        : (
            item?.skill_id ??
            item?.skillId ??
            item?.id
          );

    if (!skillId) {
      continue;
    }

    const skill =
      await client.skill.findFirst({
        where: {
          OR: [
            {
              id: String(skillId),
            },
            {
              name: {
                equals: String(skillId),
                mode: 'insensitive',
              },
            },
          ],
        },
      });

    if (!skill) {
      continue;
    }

    const skillLevel =
      enumValue(
        typeof item === 'object'
          ? (
              item.skill_level ??
              item.level
            )
          : undefined,
        'BEGINNER'
      );

    await client.userSkill.upsert({
      where: {
        userId_skillId_skillType: {
          userId,
          skillId: skill.id,
          skillType: type,
        },
      },

      create: {
        userId,
        skillId: skill.id,
        skillType: type as any,
        skillLevel: skillLevel as any,
      },

      update: {
        skillLevel: skillLevel as any,
        isActive: true,
      },
    });

    savedCount++;
  }

  return savedCount;
}
/* =========================================================
   ONBOARDING
========================================================= */

apiRouter.post(
  '/onboarding',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    const b =
      req.body ?? {};

    const currentUser =
      await authUser(req);

    if (!currentUser) {
      return bad(
        res,
        'Authentication required',
        401
      );
    }

    const currentMetadata =
      currentUser.user_metadata ??
      {};

    /*
     * Build sharing-skill details.
     *
     * These details are kept in Supabase
     * user metadata so they are available
     * without requiring new database columns.
     */

    const shareSkills =
      b.share_skills ??
      b.skills_to_share ??
      b.skills_you_will_share ??
      [];

    const shareSkillDetails =
      Array.isArray(shareSkills)
        ? shareSkills.reduce(
            (
              result: Record<string, any>,
              item: any
            ) => {
              if (
                typeof item !==
                'object' ||
                !item
              ) {
                return result;
              }

              const skillId =
                item.skill_id ??
                item.skillId ??
                item.id ??
                item.skill;

              if (!skillId) {
                return result;
              }

              result[String(skillId)] = {
                skillLevel:
                  item.skill_level ??
                  item.level ??
                  'BEGINNER',

                experience:
                  item.experience ??
                  '',

                description:
                  item.description ??
                  '',

                teachingLanguages:
                  Array.isArray(
                    item.teaching_languages
                  )
                    ? item.teaching_languages
                    : Array.isArray(
                        item.teachingLanguages
                      )
                      ? item.teachingLanguages
                      : [],

                skillProof:
                  item.skill_proof ??
                  item.skillProof ??
                  null,

                beginnerFriendly:
                  item.beginner_friendly ??
                  item.beginnerFriendly ??
                  true,
              };

              return result;
            },
            {}
          )
        : {};

    /*
     * Update profile/onboarding metadata.
     */

    const updatedMetadata = {
      ...currentMetadata,

      full_name:
        b.full_name ??
        profile.fullName,

      age_group:
        b.age_group ??
        profile.ageGroup,

      city:
        b.city ??
        profile.city,

      state:
        b.state ??
        profile.state,

      preferred_language:
        b.preferred_language ??
        profile.preferredLanguage,

      education_work_status:
        b.education_work_status ??
        profile.educationWorkStatus,

      profile_photo_url:
        b.profile_photo_url ??
        profile.profilePhotoUrl,

      bio:
        b.bio ??
        profile.bio,

      role:
        profile.role,

      /*
       * Learner onboarding information.
       */

      learning_goal:
        b.learning_goal ??
        currentMetadata.learning_goal ??
        null,

      target_level:
        b.target_level ??
        currentMetadata.target_level ??
        null,

      schedule:
        b.schedule ??
        currentMetadata.schedule ??
        null,

      interests:
        Array.isArray(b.interests)
          ? b.interests
          : Array.isArray(
              currentMetadata.interests
            )
            ? currentMetadata.interests
            : [],

      /*
       * Mentor / Knowledge Sharer
       * onboarding information.
       */

      teaching_experience:
        b.teaching_experience ??
        currentMetadata.teaching_experience ??
        null,

      teaching_languages:
        Array.isArray(
          b.teaching_languages
        )
          ? b.teaching_languages
          : Array.isArray(
              currentMetadata.teaching_languages
            )
            ? currentMetadata.teaching_languages
            : [],

      share_skill_details:
        shareSkillDetails,

      /*
       * Availability sent by the frontend.
       *
       * The existing /availability endpoint
       * can also manage the database availability
       * record separately.
       */

      onboarding_availability:
        b.availability ??
        b.onboarding_availability ??
        currentMetadata.onboarding_availability ??
        null,

      onboarding_completed:
        true,

      is_active:
        true,
    };

    /*
     * Save updated profile information.
     */

    await supabaseAdmin.auth.admin.updateUserById(
      profile.id,
      {
        user_metadata:
          updatedMetadata,
      }
    );

    /*
     * Learner skills.
     */

    await saveSkills(
      profile.id,
      b.learn_skills ??
        b.learning_skills ??
        [],
      'LEARN'
    );

    /*
     * Mentor / Knowledge Sharer skills.
     */

    if (
      profile.role ===
      'KNOWLEDGE_SHARER'
    ) {
      await saveSkills(
        profile.id,
        shareSkills,
        'SHARE'
      );
    }

    /*
     * Fetch the latest profile after
     * all onboarding information is saved.
     */

    const freshUser =
      await supabaseAdmin.auth.admin.getUserById(
        profile.id
      );

    const fresh =
      await getAppProfile(
        freshUser.data.user ??
          {
            ...currentUser,
            user_metadata:
              updatedMetadata,
          }
      );

    return res.json(
      publicProfile(
        fresh
      )
    );
  }
);
/* =========================================================
   SEARCH AND MATCHING
========================================================= */

apiRouter.post(
  '/search/nl',
  requireAuth,
  async (req, res) => {
    const parsed =
      await parseNaturalLanguageSearch(
        String(
          req.body?.query ??
            ''
        )
      );

    res.json(parsed);
  }
);

apiRouter.get(
  '/matching',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } = auth(req);

    const {
      data: usersData,
      error: usersError,
    } =
      await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (usersError) {
      return res.status(500).json({
        error: usersError.message,
      });
    }

    const rows =
      await computeMatches({
        learner_id:
          profile.id,

        skill_id:
          req.query.skill_id as
            | string
            | undefined,

        skill_name:
          req.query.skill_name as
            | string
            | undefined,

        level:
          req.query.level as
            | string
            | undefined,

        language:
          req.query.language as
            | string
            | undefined,

        time:
          req.query.time as
            | string
            | undefined,

        profiles:
          usersData.users,
      });

    res.json(rows);
  }
);

/* =========================================================
   AVAILABILITY
========================================================= */

apiRouter.get(
  '/availability',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    const availability =
      await db.userAvailability.findUnique({
        where: {
          userId:
            profile.id,
        },
      });

    return res.json(
      availability
    );
  }
);

apiRouter.post(
  '/availability',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    const b =
      req.body ?? {};

    const status =
      enumValue(
        b.status,
        'INACTIVE'
      );

    const availability =
      await db.userAvailability.upsert({
        where: {
          userId:
            profile.id,
        },

        create: {
          userId:
            profile.id,

          status:
            status as any,

          availableFrom:
            isoDate(
              b.available_from
            ),

          availableUntil:
            isoDate(
              b.available_until
            ),

          timezone:
            b.timezone ??
            'Asia/Kolkata',
        },

        update: {
          status:
            status as any,

          availableFrom:
            isoDate(
              b.available_from
            ),

          availableUntil:
            isoDate(
              b.available_until
            ),

          timezone:
            b.timezone ??
            'Asia/Kolkata',
        },
      });

    return res.json(
      availability
    );
  }
);

/* =========================================================
   SESSION REQUESTS
========================================================= */

apiRouter.post(
  '/sessions/request',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } = auth(req);

    if (
      profile.role !==
      'LEARNER'
    ) {
      return bad(
        res,
        'Only learners can create session requests.'
      );
    }

    const b =
      req.body ?? {};

    const knowledgeSharerId =
      String(
        b.knowledge_sharer_id ??
        ''
      ).trim();

    const skillId =
      String(
        b.skill_id ??
        ''
      ).trim();

    const sessionDate =
      String(
        b.session_date ??
        ''
      ).trim();

    const startTime =
      String(
        b.start_time ??
        ''
      ).trim();

    const endTime =
      String(
        b.end_time ??
        ''
      ).trim();

    const learningGoal =
      String(
        b.learning_goal ??
        ''
      ).trim();

    if (!knowledgeSharerId) {
      return bad(
        res,
        'knowledge_sharer_id is required'
      );
    }

    if (!skillId) {
      return bad(
        res,
        'skill_id is required'
      );
    }

    if (!sessionDate) {
      return bad(
        res,
        'session_date is required'
      );
    }

    if (!startTime) {
      return bad(
        res,
        'start_time is required'
      );
    }

    if (!endTime) {
      return bad(
        res,
        'end_time is required'
      );
    }

    if (!learningGoal) {
      return bad(
        res,
        'learning_goal is required'
      );
    }

    const skill =
      await db.skill.findFirst({
        where: {
          id:
            skillId,

          isActive:
            true,
        },
      });

    if (!skill) {
      return bad(
        res,
        'Skill not found',
        404
      );
    }

    const sharerUser =
      await supabaseAdmin.auth.admin.getUserById(
        knowledgeSharerId
      );

    if (
      sharerUser.error ||
      !sharerUser.data.user
    ) {
      return bad(
        res,
        'Knowledge sharer not found.',
        404
      );
    }

    const sharerRole =
      sharerUser.data.user
        .user_metadata?.role;

    if (
      sharerRole !==
        'KNOWLEDGE_SHARER' &&
      sharerRole !==
        'MENTOR'
    ) {
      return bad(
        res,
        'Selected user is not a knowledge sharer.',
        400
      );
    }

    const sharedSkill =
      await db.userSkill.findFirst({
        where: {
          userId:
            knowledgeSharerId,

          skillId:
            skill.id,

          skillType:
            'SHARE' as any,

          isActive:
            true,
        },
      });

    if (!sharedSkill) {
      return bad(
        res,
        'This knowledge sharer does not share the selected skill.',
        400
      );
    }

    const scheduledStart =
      new Date(
        `${sessionDate}T${startTime}`
      );

    const scheduledEnd =
      new Date(
        `${sessionDate}T${endTime}`
      );

    if (
      Number.isNaN(
        scheduledStart.getTime()
      ) ||
      Number.isNaN(
        scheduledEnd.getTime()
      )
    ) {
      return bad(
        res,
        'Invalid session date or time.'
      );
    }

    /*
     * If the session crosses midnight,
     * move the end time to the next day.
     */
    if (
      scheduledEnd <=
      scheduledStart
    ) {
      scheduledEnd.setDate(
        scheduledEnd.getDate() +
          1
      );
    }

    const conflict =
      await db.session.findFirst({
        where: {
          knowledgeSharerId,
          status: {
            in: [
              'REQUESTED',
              'ACCEPTED',
              'SCHEDULED',
              'IN_PROGRESS',
            ],
          },
          scheduledStart: {
            lt:
              scheduledEnd,
          },
          scheduledEnd: {
            gt:
              scheduledStart,
          },
        },
      });

    if (conflict) {
      return bad(
        res,
        'The selected knowledge sharer already has a session during this time.',
        409
      );
    }

    const existingLearnerSession =
      await db.session.findFirst({
        where: {
          learnerId:
            profile.id,

          status: {
            in: [
              'REQUESTED',
              'ACCEPTED',
              'SCHEDULED',
              'IN_PROGRESS',
            ],
          },

          scheduledStart: {
            lt:
              scheduledEnd,
          },

          scheduledEnd: {
            gt:
              scheduledStart,
          },
        },
      });

    if (existingLearnerSession) {
      return bad(
        res,
        'You already have another session during this time.',
        409
      );
    }

    const result =
      await db.$transaction(
        async (tx) => {
          const learningRequest =
            await tx.learningRequest.create({
              data: {
                learnerId:
                  profile.id,

                skillId:
                  skill.id,

                skillLevel:
                  enumValue(
                    b.skill_level,
                    'BEGINNER'
                  ) as any,

                preferredLanguage:
                  b.preferred_language ??
                  profile.preferredLanguage,

                learningGoal,

                preferredDate:
                  new Date(
                    `${sessionDate}T00:00:00`
                  ),

                preferredStartTime:
                  scheduledStart,

                preferredEndTime:
                  scheduledEnd,

                status:
                  'OPEN',
              },
            });

          const match =
            await tx.match.create({
              data: {
                learningRequestId:
                  learningRequest.id,

                learnerId:
                  profile.id,

                knowledgeSharerId,

                skillId:
                  skill.id,

                matchScore:
                  100,

                skillMatchScore:
                  100,

                levelMatchScore:
                  100,

                languageMatchScore:
                  100,

                availabilityMatchScore:
                  100,

                status:
                  'ACCEPTED',
              },
            });

          const session =
            await tx.session.create({
              data: {
                learningRequestId:
                  learningRequest.id,

                matchId:
                  match.id,

                learnerId:
                  profile.id,

                knowledgeSharerId,

                skillId:
                  skill.id,

                scheduledStart,

                scheduledEnd,

                status:
                  'REQUESTED',

                learnerConfirmed:
                  false,

                knowledgeSharerConfirmed:
                  false,

                sessionGoal:
                  learningGoal,

                meetingRoomId:
                  `learnx-session-${crypto.randomUUID()}`,
              },
            });

          return {
            learningRequest,
            match,
            session,
          };
        }
      );

    return res
      .status(201)
      .json({
        success:
          true,

        message:
          'Session request sent successfully!',

        learning_request:
          result.learningRequest,

        match:
          result.match,

        session:
          result.session,
      });
  }
);
apiRouter.get(
  '/sessions/:id',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } = auth(req);

    const session =
      await db.session.findUnique({
        where: {
          id:
            req.params.id,
        },
        include: {
          skill: true,
        },
      });

    if (!session) {
      return bad(
        res,
        'Session not found.',
        404
      );
    }

    if (
      session.learnerId !==
        profile.id &&
      session.knowledgeSharerId !==
        profile.id
    ) {
      return bad(
        res,
        'You are not a participant in this session.',
        403
      );
    }

    const learnerUser =
      await supabaseAdmin.auth.admin.getUserById(
        session.learnerId
      );

    const sharerUser =
      await supabaseAdmin.auth.admin.getUserById(
        session.knowledgeSharerId
      );

    const learnerMetadata =
      learnerUser.data.user?.user_metadata ?? {};

    const sharerMetadata =
      sharerUser.data.user?.user_metadata ?? {};

    const sessionStart =
      session.scheduledStart.toISOString();

    const sessionEnd =
      session.scheduledEnd.toISOString();

    const sessionRecord = {
      id:
        session.id,

      learner_id:
        session.learnerId,

      knowledge_sharer_id:
        session.knowledgeSharerId,

      skill_id:
        session.skillId,

      skill_name:
        session.skill?.name ?? '',

      skill_category:
        session.skill?.category ?? null,

      learner_name:
        learnerMetadata.full_name ??
        learnerUser.data.user?.email ??
        'Learner',

      learner_email:
        learnerUser.data.user?.email ??
        null,

      learner_photo:
        learnerMetadata.profile_photo_url ??
        null,

      sharer_name:
        sharerMetadata.full_name ??
        sharerUser.data.user?.email ??
        'Knowledge Sharer',

      sharer_email:
        sharerUser.data.user?.email ??
        null,

      sharer_photo:
        sharerMetadata.profile_photo_url ??
        null,

      session_date:
        session.scheduledStart
          .toISOString()
          .slice(0, 10),

      start_time:
        session.scheduledStart
          .toTimeString()
          .slice(0, 5),

      end_time:
        session.scheduledEnd
          .toTimeString()
          .slice(0, 5),

      duration_minutes:
        Math.max(
          0,
          Math.round(
            (
              session.scheduledEnd.getTime() -
              session.scheduledStart.getTime()
            ) /
              60000
          )
        ),

      status:
        session.status,

      learning_goal:
        session.sessionGoal ??
        '',

      room_id:
        session.meetingRoomId,

      learner_confirmed:
        session.learnerConfirmed,

      sharer_confirmed:
        session.knowledgeSharerConfirmed,

      credit_awarded:
        0,

      session_stage:
        session.status ===
        'COMPLETED'
          ? 'VERIFIED'
          : session.status,

      started_at:
        session.status ===
        'IN_PROGRESS'
          ? sessionStart
          : null,

      ended_at:
        session.status ===
        'COMPLETED'
          ? sessionEnd
          : null,

      duration_seconds:
        session.status ===
        'COMPLETED'
          ? Math.max(
              0,
              Math.floor(
                (
                  session.scheduledEnd.getTime() -
                  session.scheduledStart.getTime()
                ) /
                  1000
              )
            )
          : null,

      verified_credits:
        null,

      verified_at:
        null,

      created_at:
        session.createdAt,

      updated_at:
        session.updatedAt,
    };

    return res.json({
      session:
        sessionRecord,
    });
  }
);
apiRouter.post(
  '/sessions/:id/join',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } = auth(req);

    const session =
      await db.session.findUnique({
        where: {
          id:
            req.params.id,
        },
      });

    if (!session) {
      return bad(
        res,
        'Session not found.',
        404
      );
    }

    if (
      session.learnerId !==
        profile.id &&
      session.knowledgeSharerId !==
        profile.id
    ) {
      return bad(
        res,
        'You are not a participant in this session.',
        403
      );
    }

    if (
      session.status !==
        'ACCEPTED' &&
      session.status !==
        'IN_PROGRESS'
    ) {
      return bad(
        res,
        'This session is not available to join.',
        409
      );
    }

    if (!session.meetingRoomId) {
      return bad(
        res,
        'LiveKit room is not configured for this session.',
        409
      );
    }

    const now =
      new Date();

    if (
      now.getTime() <
      session.scheduledStart.getTime()
    ) {
      return bad(
        res,
        'The session cannot be joined before its scheduled start time.',
        409
      );
    }

    let updated =
      session;

    if (
      session.status ===
      'ACCEPTED'
    ) {
      updated =
        await db.session.update({
          where: {
            id:
              session.id,
          },
          data: {
            status:
              'IN_PROGRESS',
          },
        });
    }

    const token =
      await createLiveKitToken({
        roomName:
          updated.meetingRoomId!,
        participantIdentity:
          profile.id,
        participantName:
          profile.fullName ||
          profile.email ||
          'LearnX User',
      });

    const learnerUser =
      await supabaseAdmin.auth.admin.getUserById(
        updated.learnerId
      );

    const sharerUser =
      await supabaseAdmin.auth.admin.getUserById(
        updated.knowledgeSharerId
      );

    const learnerMetadata =
      learnerUser.data.user?.user_metadata ?? {};

    const sharerMetadata =
      sharerUser.data.user?.user_metadata ?? {};

    return res.json({
      success:
        true,

      token,

      livekit_url:
        LIVEKIT_URL,

      room_id:
        updated.meetingRoomId,

      session: {
        id:
          updated.id,

        learner_id:
          updated.learnerId,

        knowledge_sharer_id:
          updated.knowledgeSharerId,

        skill_id:
          updated.skillId,

        status:
          updated.status,

        room_id:
          updated.meetingRoomId,

        learner_name:
          learnerMetadata.full_name ??
          learnerUser.data.user?.email ??
          'Learner',

        sharer_name:
          sharerMetadata.full_name ??
          sharerUser.data.user?.email ??
          'Knowledge Sharer',

        learner_confirmed:
          updated.learnerConfirmed,

        sharer_confirmed:
          updated.knowledgeSharerConfirmed,

        learning_goal:
          updated.sessionGoal ??
          '',

        started_at:
          updated.status ===
          'IN_PROGRESS'
            ? now.toISOString()
            : null,

        ended_at:
          null,
      },
    });
  }
);
apiRouter.post(
  '/sessions/:id/connected',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } = auth(req);

    const session =
      await db.session.findUnique({
        where: {
          id:
            req.params.id,
        },
        include: {
          skill: true,
        },
      });

    if (!session) {
      return bad(
        res,
        'Session not found.',
        404
      );
    }

    if (
      session.learnerId !==
        profile.id &&
      session.knowledgeSharerId !==
        profile.id
    ) {
      return bad(
        res,
        'You are not a participant in this session.',
        403
      );
    }

    if (
      session.status !==
        'ACCEPTED' &&
      session.status !==
        'IN_PROGRESS'
    ) {
      return bad(
        res,
        'This session is not active.',
        409
      );
    }

    let updated =
      session;

    if (
      session.status ===
      'ACCEPTED'
    ) {
      updated =
        await db.session.update({
          where: {
            id:
              session.id,
          },
          data: {
            status:
              'IN_PROGRESS',
          },
          include: {
            skill: true,
          },
        });
    }

    return res.json({
      success:
        true,

      message:
        'Participant connected successfully.',

      session: {
        id:
          updated.id,

        learner_id:
          updated.learnerId,

        knowledge_sharer_id:
          updated.knowledgeSharerId,

        skill_id:
          updated.skillId,

        skill_name:
          updated.skill?.name ??
          '',

        skill_category:
          updated.skill?.category ??
          null,

        session_date:
          updated.scheduledStart
            .toISOString()
            .slice(0, 10),

        start_time:
          updated.scheduledStart
            .toTimeString()
            .slice(0, 5),

        end_time:
          updated.scheduledEnd
            .toTimeString()
            .slice(0, 5),

        duration_minutes:
          Math.max(
            0,
            Math.round(
              (
                updated.scheduledEnd.getTime() -
                updated.scheduledStart.getTime()
              ) / 60000
            )
          ),

        status:
          updated.status,

        learning_goal:
          updated.sessionGoal ??
          '',

        room_id:
          updated.meetingRoomId,

        learner_confirmed:
          updated.learnerConfirmed,

        sharer_confirmed:
          updated.knowledgeSharerConfirmed,

        credit_awarded:
          0,

        session_stage:
          updated.status ===
          'COMPLETED'
            ? 'VERIFIED'
            : updated.status,

        started_at:
          updated.status ===
          'IN_PROGRESS'
            ? new Date().toISOString()
            : null,

        ended_at:
          null,

        duration_seconds:
          null,

        verified_credits:
          null,

        verified_at:
          null,

        created_at:
          updated.createdAt,

        updated_at:
          updated.updatedAt,
      },
    });
  }
);
apiRouter.get(
  '/sessions/:id/chat',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } = auth(req);

    const session =
      await db.session.findUnique({
        where: {
          id:
            req.params.id,
        },
      });

    if (!session) {
      return bad(
        res,
        'Session not found.',
        404
      );
    }

    if (
      session.learnerId !==
        profile.id &&
      session.knowledgeSharerId !==
        profile.id
    ) {
      return bad(
        res,
        'You are not a participant in this session.',
        403
      );
    }

   const messages =
  await db.sessionMessage.findMany({
    where: {
      sessionId:
        session.id,
    },
    orderBy: {
      createdAt:
        'asc',
    },
  });

return res.json({
  messages:
    messages.map((item) => ({
      id:
        item.id,

      session_id:
        item.sessionId,

      sender_id:
        item.senderId,

      message:
        item.message,

      created_at:
        item.createdAt,
    })),
});
  }
);
apiRouter.post(
  '/sessions/:id/chat',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } = auth(req);

    const session =
      await db.session.findUnique({
        where: {
          id:
            req.params.id,
        },
      });

    if (!session) {
      return bad(
        res,
        'Session not found.',
        404
      );
    }

    if (
      session.learnerId !==
        profile.id &&
      session.knowledgeSharerId !==
        profile.id
    ) {
      return bad(
        res,
        'You are not a participant in this session.',
        403
      );
    }

    const message =
      typeof req.body?.message ===
      'string'
        ? req.body.message.trim()
        : '';

    if (!message) {
      return bad(
        res,
        'Message is required.',
        400
      );
    }

    const created =
      await db.sessionMessage.create({
        data: {
          sessionId:
            session.id,
          senderId:
            profile.id,
          message,
        },
      });

    return res.status(201).json({
      success:
        true,

      message: {
        id:
          created.id,

        session_id:
          created.sessionId,

        sender_id:
          created.senderId,

        message:
          created.message,

        created_at:
          created.createdAt,
      },
    });
  }
);
/* =========================================================
   SESSION ACTIONS
========================================================= */
apiRouter.post(
  '/sessions/:id/accept',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } = auth(req);

    if (
      profile.role !==
      'KNOWLEDGE_SHARER'
    ) {
      return bad(
        res,
        'Only knowledge sharers can accept session requests.'
      );
    }

    const session =
      await db.session.findUnique({
        where: {
          id:
            req.params.id,
        },
      });

    if (!session) {
      return bad(
        res,
        'Session request not found.',
        404
      );
    }

    if (
      session.knowledgeSharerId !==
      profile.id
    ) {
      return bad(
        res,
        'You are not the knowledge sharer for this session.',
        403
      );
    }

    if (
      session.status !==
      'REQUESTED'
    ) {
      return bad(
        res,
        `This session cannot be accepted because it is already ${String(
          session.status
        ).toLowerCase()}.`,
        409
      );
    }

    const conflict =
      await db.session.findFirst({
        where: {
          knowledgeSharerId:
            profile.id,

          id: {
            not:
              session.id,
          },

          status: {
            in: [
              'REQUESTED',
              'ACCEPTED',
              'SCHEDULED',
              'IN_PROGRESS',
            ],
          },

          scheduledStart: {
            lt:
              session.scheduledEnd,
          },

          scheduledEnd: {
            gt:
              session.scheduledStart,
          },
        },
      });

    if (conflict) {
      return bad(
        res,
        'You already have another session overlapping this time slot.',
        409
      );
    }

    const updated =
      await db.session.update({
        where: {
          id:
            session.id,
        },

        data: {
          status:
            'ACCEPTED',

          meetingRoomId:
            session.meetingRoomId ??
            `learnx-session-${session.id}`,
        },
      });

    return res.json({
      success:
        true,

      message:
        'Session accepted and scheduled.',

      session:
        updated,
    });
  }
);
apiRouter.post(
  '/sessions/:id/reject',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } = auth(req);

    if (
      profile.role !==
      'KNOWLEDGE_SHARER'
    ) {
      return bad(
        res,
        'Only knowledge sharers can reject session requests.'
      );
    }

    const session =
      await db.session.findUnique({
        where: {
          id:
            req.params.id,
        },
      });

    if (!session) {
      return bad(
        res,
        'Session request not found.',
        404
      );
    }

    if (
      session.knowledgeSharerId !==
      profile.id
    ) {
      return bad(
        res,
        'You are not the knowledge sharer for this session.',
        403
      );
    }

    if (
      session.status !==
      'REQUESTED'
    ) {
      return bad(
        res,
        `This session cannot be rejected because it is already ${String(
          session.status
        ).toLowerCase()}.`,
        409
      );
    }

    const updated =
      await db.session.update({
        where: {
          id:
            session.id,
        },

        data: {
          status:
            'REJECTED',
        },
      });

    return res.json({
      success:
        true,

      message:
        'Session request rejected.',

      session:
        updated,
    });
  }
);
apiRouter.post(
  '/sessions/:id/cancel',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } = auth(req);

    const session =
      await db.session.findUnique({
        where: {
          id:
            req.params.id,
        },
      });

    if (!session) {
      return bad(
        res,
        'Session not found.',
        404
      );
    }

    if (
      session.learnerId !==
        profile.id &&
      session.knowledgeSharerId !==
        profile.id
    ) {
      return bad(
        res,
        'You are not a participant in this session.',
        403
      );
    }

    if (
      ![
        'REQUESTED',
        'ACCEPTED',
      ].includes(
        session.status
      )
    ) {
      return bad(
        res,
        `This session cannot be cancelled because it is already ${String(
          session.status
        ).toLowerCase()}.`,
        409
      );
    }

    const updated =
      await db.session.update({
        where: {
          id:
            session.id,
        },

        data: {
          status:
            'CANCELLED',
        },
      });

    return res.json({
      success:
        true,

      message:
        'Session cancelled successfully.',

      session:
        updated,
    });
  }
);
apiRouter.post(
  '/sessions/:id/start',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } = auth(req);

    const session =
      await db.session.findUnique({
        where: {
          id:
            req.params.id,
        },
      });

    if (!session) {
      return bad(
        res,
        'Session not found.',
        404
      );
    }

    if (
      session.learnerId !==
        profile.id &&
      session.knowledgeSharerId !==
        profile.id
    ) {
      return bad(
        res,
        'You are not a participant in this session.',
        403
      );
    }

    if (
      session.status !==
      'ACCEPTED'
    ) {
      return bad(
        res,
        `This session cannot be started because it is currently ${String(
          session.status
        ).toLowerCase()}.`,
        409
      );
    }

    const now =
      new Date();

    if (
      now.getTime() <
      session.scheduledStart.getTime()
    ) {
      return bad(
        res,
        'The session cannot be started before its scheduled start time.',
        409
      );
    }

    const updated =
      await db.session.update({
        where: {
          id:
            session.id,
        },

        data: {
          status:
            'IN_PROGRESS',
        },
      });

    return res.json({
      success:
        true,

      message:
        'Session started successfully.',

      session:
        updated,
    });
  }
);
apiRouter.post(
  '/sessions/:id/end',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } = auth(req);

    const session =
      await db.session.findUnique({
        where: {
          id:
            req.params.id,
        },
      });

    if (!session) {
      return bad(
        res,
        'Session not found.',
        404
      );
    }

    if (
      session.learnerId !==
        profile.id &&
      session.knowledgeSharerId !==
        profile.id
    ) {
      return bad(
        res,
        'You are not a participant in this session.',
        403
      );
    }

    if (
      session.status !==
      'IN_PROGRESS'
    ) {
      return bad(
        res,
        `This session cannot be ended because it is currently ${String(
          session.status
        ).toLowerCase()}.`,
        409
      );
    }

    const updated =
      await db.session.update({
        where: {
          id:
            session.id,
        },

        data: {
          status:
            'COMPLETED',
        },
      });

    return res.json({
      success:
        true,

      message:
        'Session completed successfully. Both participants must confirm completion before Time Credits are awarded.',

      session:
        updated,
    });
  }
);
apiRouter.post(
  '/sessions/:id/livekit-token',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } = auth(req);

    const session =
      await db.session.findUnique({
        where: {
          id: req.params.id,
        },
        include: {
          skill: true,
        },
      });

    if (!session) {
      return bad(
        res,
        'Session not found.',
        404
      );
    }

    if (
      session.learnerId !== profile.id &&
      session.knowledgeSharerId !== profile.id
    ) {
      return bad(
        res,
        'You are not a participant in this session.',
        403
      );
    }

    if (
      session.status !== 'ACCEPTED' &&
      session.status !== 'IN_PROGRESS'
    ) {
      return bad(
        res,
        'The LiveKit room is available only for an accepted or active session.',
        409
      );
    }

    if (!session.meetingRoomId) {
      return bad(
        res,
        'LiveKit room is not configured for this session.',
        409
      );
    }

    const participantName =
      profile.fullName ||
      profile.email ||
      'LearnX User';

    const token =
      await createLiveKitToken({
        roomName:
          session.meetingRoomId,

        participantIdentity:
          profile.id,

        participantName,
      });

    return res.json({
      success: true,

      token,

      livekit_url:
        LIVEKIT_URL,

      room_id:
        session.meetingRoomId,

      session_id:
        session.id,

      skill_name:
        session.skill?.name || null,
    });
  }
);
/* =========================================================
   SESSION COMPLETION + TIME CREDITS
========================================================= */

apiRouter.post(
  '/sessions/:id/confirm-completion',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    const session =
      await db.session.findUnique({
        where: {
          id:
            req.params.id,
        },
      });

    if (
      !session ||
      ![
        session.learnerId,
        session.knowledgeSharerId,
      ].includes(
        profile.id
      )
    ) {
      return bad(
        res,
        'Session not found',
        404
      );
    }

    /*
     * Only a completed session can be
     * confirmed for Time Credit processing.
     */

    if (
      String(session.status).toUpperCase() !==
      'COMPLETED'
    ) {
      return bad(
        res,
        'Session must be completed before confirming completion.'
      );
    }

    /*
     * A user can confirm only their
     * own side of the session.
     */

    const confirmationData =
      profile.id ===
      session.learnerId
        ? {
            learnerConfirmed:
              true,
          }
        : {
            knowledgeSharerConfirmed:
              true,
          };

    const result =
      await db.$transaction(
        async (tx) => {
          const updated =
            await tx.session.update({
              where: {
                id:
                  session.id,
              },

              data:
                confirmationData,
            });

          /*
           * Do NOT award credits until
           * BOTH participants confirm.
           */

          if (
            !updated.learnerConfirmed ||
            !updated.knowledgeSharerConfirmed
          ) {
            return updated;
          }

          /*
           * Prevent duplicate Time Credit
           * transactions for the same session.
           */

          const existing =
            await tx.timeCreditTransaction.findFirst({
              where: {
                sessionId:
                  session.id,

                transactionType:
                  'SESSION_EARN',
              },
            });

          if (existing) {
            return updated;
          }

          /*
           * Calculate Time Credits from the
           * scheduled session duration.
           *
           * Minimum = 1 Time Credit.
           */

          const durationHours =
            (
              updated.scheduledEnd.getTime() -
              updated.scheduledStart.getTime()
            ) /
            3600000;

          const hours =
            Math.max(
              1,
              Math.round(
                durationHours
              )
            );

          /*
           * Add credits ONLY to the
           * Knowledge Sharer's wallet.
           */

          await tx.timeCreditWallet.upsert({
            where: {
              userId:
                updated.knowledgeSharerId,
            },

            create: {
              userId:
                updated.knowledgeSharerId,

              balance:
                hours,
            },

            update: {
              balance: {
                increment:
                  hours,
              },
            },
          });

          /*
           * Create exactly one earning
           * ledger entry for this session.
           */

          await tx.timeCreditTransaction.create({
            data: {
              userId:
                updated.knowledgeSharerId,

              amount:
                hours,

              transactionType:
                'SESSION_EARN',

              sessionId:
                updated.id,

              description:
                'Verified knowledge-sharing session',
            },
          });

          return updated;
        }
      );

    return res.json(
      result
    );
  }
);
/* =========================================================
   SESSION CHAT
========================================================= */

apiRouter.get(
  '/sessions/:id/chat',
  requireAuth,
  async (_req, res) => {
    res.json([]);
  }
);

apiRouter.post(
  '/sessions/:id/chat',
  requireAuth,
  async (_req, res) => {
    res.status(201).json({
      message:
        'Chat persistence is not part of the current Prisma schema.',
    });
  }
);

/* =========================================================
   SESSION NOTES
========================================================= */

apiRouter.get(
  '/sessions/:id/notes',
  requireAuth,
  async (req, res) => {
    const session =
      await db.session.findUnique({
        where: {
          id:
            req.params.id,
        },
      });

    if (!session) {
      return bad(
        res,
        'Session not found',
        404
      );
    }

    return res.json({
      note: {
        content:
          session.notes ??
          '',
      },
    });
  }
);

apiRouter.put(
  '/sessions/:id/notes',
  requireAuth,
  async (req, res) => {
    const session =
      await db.session.update(
        {
          where: {
            id:
              req.params.id,
          },

          data: {
            notes:
              String(
                req.body?.notes ??
                  ''
              ),
          },
        }
      );

    res.json({
      notes:
        session.notes ??
        '',
    });
  }
);

/* =========================================================
   TIME WALLET
========================================================= */

apiRouter.get(
  '/time-wallet',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    const wallet =
      await db.timeCreditWallet.findUnique({
        where: {
          userId:
            profile.id,
        },
      });

    if (!wallet) {
      return res.json({
        userId:
          profile.id,

        balance:
          0,
      });
    }

    return res.json(
      wallet
    );
  }
);

apiRouter.get(
  '/time-wallet/transactions',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    const transactions =
      await db.timeCreditTransaction.findMany({
        where: {
          userId:
            profile.id,
        },

        orderBy: {
          createdAt:
            'desc',
        },
      });

    return res.json(
      transactions
    );
  }
);
/* =========================================================
   RATINGS
========================================================= */

apiRouter.post(
  '/ratings',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    const b =
      req.body ?? {};

    const session =
      await db.session.findUnique(
        {
          where: {
            id:
              b.session_id,
          },
        }
      );

    if (
      !session ||
      ![
        session.learnerId,
        session.knowledgeSharerId,
      ].includes(
        profile.id
      )
    ) {
      return bad(
        res,
        'Session not found',
        404
      );
    }

    const reviewedUserId =
      profile.id ===
      session.learnerId
        ? session.knowledgeSharerId
        : session.learnerId;

    const rating =
      await db.sessionReview.create(
        {
          data: {
            sessionId:
              session.id,

            reviewerId:
              profile.id,

            reviewedUserId,

            rating:
              Math.max(
                1,
                Math.min(
                  5,
                  Number(
                    b.rating
                  )
                )
              ),

            reviewText:
              b.review_text ??
              null,
          },
        }
      );

    res.status(201)
      .json(rating);
  }
);

apiRouter.get(
  '/ratings',
  requireAuth,
  async (req, res) => {
    const userId =
      (req.query.user_id as string) ||
      auth(req).profile.id;

    res.json(
      await db.sessionReview.findMany(
        {
          where: {
            reviewedUserId:
              userId,
          },

          include: {
            reviewer:
              true,

            session:
              true,
          },

          orderBy: {
            createdAt:
              'desc',
          },
        }
      )
    );
  }
);

/* =========================================================
   PROGRESS
========================================================= */

apiRouter.get(
  '/progress',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    res.json(
      await db.learningProgress.findMany(
        {
          where: {
            userId:
              profile.id,
          },

          include: {
            skill:
              true,
          },

          orderBy: {
            updatedAt:
              'desc',
          },
        }
      )
    );
  }
);

apiRouter.get(
  '/progress/:skillId',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    const progress =
      await db.learningProgress.findFirst(
        {
          where: {
            userId:
              profile.id,

            skillId:
              req.params.skillId,
          },

          include: {
            skill:
              true,
          },
        }
      );

    res.json(progress);
  }
);

/* =========================================================
   AI LEARNING PLAN
========================================================= */

apiRouter.post(
  '/ai/learning-plan',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    const b =
      req.body ?? {};

    const skill =
      await db.skill.findFirst(
        {
          where: {
            OR: [
              {
                id: String(
                  b.skill_id ??
                    ''
                ),
              },

              {
                name: {
                  equals:
                    String(
                      b.skill_name ??
                        ''
                    ),

                  mode:
                    'insensitive',
                },
              },
            ],
          },
        }
      );

    if (!skill) {
      return bad(
        res,
        'Skill not found',
        404
      );
    }

    const plan =
      generateStructuredLearningPlan(
        skill.name,
        enumValue(
          b.level,
          'BEGINNER'
        )
      );

    const learningPath =
      await db.learningPath.create(
        {
          data: {
            userId:
              profile.id,

            skillId:
              skill.id,

            title:
              `${skill.name} Learning Path`,

            description:
              `AI-generated learning path for ${skill.name}`,

            currentLevel:
              enumValue(
                b.level,
                'BEGINNER'
              ) as any,

            targetLevel:
              enumValue(
                b.target_level,
                'INTERMEDIATE'
              ) as any,

            isAiGenerated:
              true,
          },
        }
      );

    res.status(201).json({
      learning_path:
        learningPath,

      plan,
    });
  }
);

apiRouter.get(
  '/ai/learning-plans',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    res.json(
      await db.learningPath.findMany(
        {
          where: {
            userId:
              profile.id,
          },

          include: {
            skill:
              true,

            modules: {
              include: {
                lessons:
                  true,
              },
            },
          },

          orderBy: {
            createdAt:
              'desc',
          },
        }
      )
    );
  }
);

apiRouter.post(
  '/ai/assistant',
  requireAuth,
  async (req, res) => {
    res.json({
      message:
        'LearnX AI assistant request received.',

      query:
        req.body?.query ??
        '',
    });
  }
);

/* =========================================================
   QUIZZES
========================================================= */

apiRouter.get(
  '/quizzes',
  requireAuth,
  async (req, res) => {
    res.json(
      await db.quiz.findMany(
        {
          where: {
            isActive:
              true,
          },

          include: {
            skill:
              true,

            questions:
              true,
          },

          orderBy: {
            createdAt:
              'desc',
          },
        }
      )
    );
  }
);

apiRouter.get(
  '/quizzes/:id',
  requireAuth,
  async (req, res) => {
    const quiz =
      await db.quiz.findUnique(
        {
          where: {
            id:
              req.params.id,
          },

          include: {
            skill:
              true,

            questions: {
              orderBy: {
                questionOrder:
                  'asc',
              },
            },
          },
        }
      );

    if (!quiz) {
      return bad(
        res,
        'Quiz not found',
        404
      );
    }

    return res.json(
      quiz
    );
  }
);

apiRouter.post(
  '/quizzes/:id/submit',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    const b =
      req.body ?? {};

    const quiz =
      await db.quiz.findUnique(
        {
          where: {
            id:
              req.params.id,
          },

          include: {
            questions:
              true,
          },
        }
      );

    if (!quiz) {
      return bad(
        res,
        'Quiz not found',
        404
      );
    }

    const answers =
      Array.isArray(
        b.answers
      )
        ? b.answers
        : [];

    let correct = 0;

    for (
      const answer of answers
    ) {
      const question =
        quiz.questions.find(
          (q) =>
            q.id ===
            answer.question_id
        );

      if (
        question &&
        String(
          question.correctAnswer ??
            ''
        ).toLowerCase() ===
          String(
            answer.selected_answer ??
              ''
          ).toLowerCase()
      ) {
        correct++;
      }
    }

    const total =
      quiz.questions.length;

    const score =
      total
        ? (correct /
            total) *
          100
        : 0;

    const attempt =
      await db.quizAttempt.create(
        {
          data: {
            quizId:
              quiz.id,

            userId:
              profile.id,

            score,

            correctAnswers:
              correct,

            totalQuestions:
              total,

            passed:
              score >=
              Number(
                quiz.passing_score
              ),

            completedAt:
              new Date(),
          },
        }
      );

    res.status(201)
      .json({
        attempt,

        score,

        correct,

        total,
      });
  }
);

apiRouter.get(
  '/v1/me/quiz-attempts',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    res.json(
      await db.quizAttempt.findMany(
        {
          where: {
            userId:
              profile.id,
          },

          include: {
            quiz:
              true,
          },

          orderBy: {
            createdAt:
              'desc',
          },
        }
      )
    );
  }
);

apiRouter.get(
  '/v1/me/skill-assessments',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    res.json(
      await db.skillProof.findMany(
        {
          where: {
            userId:
              profile.id,
          },

          include: {
            skill:
              true,
          },

          orderBy: {
            createdAt:
              'desc',
          },
        }
      )
    );
  }
);

/* =========================================================
   ACHIEVEMENTS / SKILL PROOF
========================================================= */

apiRouter.get(
  '/achievements',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    res.json(
      await db.achievement.findMany(
        {
          where: {
            isActive:
              true,
          },

          include: {
            userAchievements: {
              where: {
                userId:
                  profile.id,
              },
            },
          },
        }
      )
    );
  }
);

apiRouter.get(
  '/skillproof',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    res.json(
      await db.skillProof.findMany(
        {
          where: {
            userId:
              profile.id,
          },

          include: {
            skill:
              true,
          },

          orderBy: {
            createdAt:
              'desc',
          },
        }
      )
    );
  }
);

apiRouter.get(
  '/skillproof/:skillId',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    res.json(
      await db.skillProof.findMany(
        {
          where: {
            userId:
              profile.id,

            skillId:
              req.params.skillId,
          },

          include: {
            skill:
              true,
          },
        }
      )
    );
  }
);

/* =========================================================
   PARTNERS
========================================================= */

apiRouter.get(
  '/partners',
  async (_req, res) => {
    res.json(
      await db.partner.findMany(
        {
          where: {
            status:
              'APPROVED',
          },

          include: {
            programs: {
              where: {
                status:
                  'PUBLISHED',
              },

              include: {
                skill:
                  true,
              },
            },
          },

          orderBy: {
            organizationName:
              'asc',
          },
        }
      )
    );
  }
);

apiRouter.post(
  '/partners',
  requireAdmin,
  async (req, res) => {
    const b =
      req.body ?? {};

    const partner =
      await db.partner.create(
        {
          data: {
            organizationName:
              b.organization_name,

            description:
              b.description ??
              null,

            websiteUrl:
              b.website_url ??
              null,

            logoUrl:
              b.logo_url ??
              null,

            contactEmail:
              b.contact_email ??
              null,
          },
        }
      );

    res.status(201)
      .json(partner);
  }
);

/* =========================================================
   COURSES / BOOTCAMPS
========================================================= */

async function programs(
  req: Request,
  res: Response,
  type:
    | 'COURSE'
    | 'BOOTCAMP'
) {
  res.json(
    await db.partnerProgram.findMany(
      {
        where: {
          programType:
            type as any,

          status:
            'PUBLISHED',
        },

        include: {
          partner:
            true,

          skill:
            true,
        },

        orderBy: {
          startDate:
            'asc',
        },
      }
    )
  );
}

apiRouter.get(
  '/courses',
  (req, res) =>
    programs(
      req,
      res,
      'COURSE'
    )
);

apiRouter.get(
  '/bootcamps',
  (req, res) =>
    programs(
      req,
      res,
      'BOOTCAMP'
    )
);

apiRouter.get(
  '/courses/:id',
  async (req, res) => {
    const program =
      await db.partnerProgram.findUnique(
        {
          where: {
            id:
              req.params.id,
          },

          include: {
            partner:
              true,

            skill:
              true,

            enrollments:
              true,
          },
        }
      );

    if (!program) {
      return bad(
        res,
        'Course not found',
        404
      );
    }

    return res.json(
      program
    );
  }
);

apiRouter.get(
  '/bootcamps/:id',
  async (req, res) => {
    const program =
      await db.partnerProgram.findUnique(
        {
          where: {
            id:
              req.params.id,
          },

          include: {
            partner:
              true,

            skill:
              true,

            enrollments:
              true,
          },
        }
      );

    if (!program) {
      return bad(
        res,
        'Bootcamp not found',
        404
      );
    }

    return res.json(
      program
    );
  }
);

apiRouter.post(
  '/courses',
  requireAdmin,
  async (req, res) => {
    const b =
      req.body ?? {};

    const course =
      await db.partnerProgram.create(
        {
          data: {
            partnerId:
              b.partner_id,

            skillId:
              b.skill_id ??
              null,

            title:
              b.title,

            description:
              b.description ??
              null,

            programType:
              'COURSE',

            level:
              enumValue(
                b.level,
                'BEGINNER'
              ) as any,

            language:
              b.language ??
              'English',

            durationHours:
              b.duration_hours ??
              null,

            externalUrl:
              b.external_url ??
              null,

            certificateAvailable:
              Boolean(
                b.certificate_available
              ),

            creditRequired:
              Number(
                b.credit_required ??
                  0
              ),

            status:
              enumValue(
                b.status,
                'DRAFT'
              ) as any,
          },
        }
      );

    res.status(201)
      .json(course);
  }
);

async function enroll(
  req: Request,
  res: Response
) {
  const {
    profile,
  } =
    auth(req);

  const program =
    await db.partnerProgram.findUnique(
      {
        where: {
          id:
            req.params.id,
        },
      }
    );

  if (!program) {
    return bad(
      res,
      'Program not found',
      404
    );
  }

  const enrollment =
    await db.programEnrollment.upsert(
      {
        where: {
          programId_userId:
            {
              programId:
                program.id,

              userId:
                profile.id,
            },
        },

        create: {
          programId:
            program.id,

          userId:
            profile.id,
        },

        update: {
          status:
            'ENROLLED',
        },
      }
    );

  res.status(201)
    .json(enrollment);
}

apiRouter.post(
  '/courses/:id/enroll',
  requireAuth,
  enroll
);

apiRouter.post(
  '/bootcamps/:id/enroll',
  requireAuth,
  enroll
);

apiRouter.get(
  '/my-courses',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    res.json(
      await db.programEnrollment.findMany(
        {
          where: {
            userId:
              profile.id,

            program: {
              programType:
                'COURSE',
            },
          },

          include: {
            program: {
              include: {
                partner:
                  true,

                skill:
                  true,
              },
            },
          },

          orderBy: {
            enrolledAt:
              'desc',
          },
        }
      )
    );
  }
);

apiRouter.get(
  '/my-bootcamps',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    res.json(
      await db.programEnrollment.findMany(
        {
          where: {
            userId:
              profile.id,

            program: {
              programType:
                'BOOTCAMP',
            },
          },

          include: {
            program: {
              include: {
                partner:
                  true,

                skill:
                  true,
              },
            },
          },

          orderBy: {
            enrolledAt:
              'desc',
          },
        }
      )
    );
  }
);

apiRouter.get(
  '/courses/:id/progress',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    res.json(
      await db.programEnrollment.findUnique(
        {
          where: {
            programId_userId:
              {
                programId:
                  req.params.id,

                userId:
                  profile.id,
              },
          },
        }
      )
    );
  }
);

apiRouter.put(
  '/courses/:id/progress',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    const progress =
      Number(
        req.body?.progress_percentage ??
          0
      );

    res.json(
      await db.programEnrollment.update(
        {
          where: {
            programId_userId:
              {
                programId:
                  req.params.id,

                userId:
                  profile.id,
              },
          },

          data: {
            progressPercentage:
              progress,

            status:
              progress >= 100
                ? 'COMPLETED'
                : 'IN_PROGRESS',
          },
        }
      )
    );
  }
);

apiRouter.get(
  '/courses/:id/notes',
  requireAuth,
  async (_req, res) => {
    res.json([]);
  }
);

apiRouter.post(
  '/courses/:id/notes',
  requireAuth,
  async (_req, res) => {
    res.status(201)
      .json({
        message:
          'Course notes are not represented in the current Prisma schema.',
      });
  }
);

apiRouter.put(
  '/courses/:id/notes/:noteId',
  requireAuth,
  async (_req, res) => {
    res.json({
      message:
        'Course notes are not represented in the current Prisma schema.',
    });
  }
);

apiRouter.get(
  '/v1/courses/:id/enroll',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    res.json(
      await db.programEnrollment.findUnique(
        {
          where: {
            programId_userId:
              {
                programId:
                  req.params.id,

                userId:
                  profile.id,
              },
          },
        }
      )
    );
  }
);

apiRouter.get(
  '/v1/bootcamps/:id/enroll',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    res.json(
      await db.programEnrollment.findUnique(
        {
          where: {
            programId_userId:
              {
                programId:
                  req.params.id,

                userId:
                  profile.id,
              },
          },
        }
      )
    );
  }
);

/* =========================================================
   CERTIFICATES
========================================================= */

apiRouter.get(
  '/certificates',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    res.json(
      await db.certificate.findMany(
        {
          where: {
            userId:
              profile.id,
          },

          include: {
            skill:
              true,
          },

          orderBy: {
            issuedAt:
              'desc',
          },
        }
      )
    );
  }
);

apiRouter.get(
  '/certificates/verify/:id',
  async (req, res) => {
    const certificate =
      await db.certificate.findUnique(
        {
          where: {
            id:
              req.params.id,
          },

          include: {
            skill:
              true,

            user:
              true,
          },
        }
      );

    if (!certificate) {
      return bad(
        res,
        'Certificate not found',
        404
      );
    }

    return res.json(
      certificate
    );
  }
);

/* =========================================================
   NOTIFICATIONS
========================================================= */

apiRouter.get(
  '/notifications',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    res.json(
      await db.notification.findMany(
        {
          where: {
            userId:
              profile.id,
          },

          orderBy: {
            createdAt:
              'desc',
          },
        }
      )
    );
  }
);

apiRouter.patch(
  '/notifications/:id/read',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    res.json(
      await db.notification.updateMany(
        {
          where: {
            id:
              req.params.id,

            userId:
              profile.id,
          },

          data: {
            isRead:
              true,
          },
        }
      )
    );
  }
);

apiRouter.patch(
  '/notifications/read-all',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    res.json(
      await db.notification.updateMany(
        {
          where: {
            userId:
              profile.id,

            isRead:
              false,
          },

          data: {
            isRead:
              true,
          },
        }
      )
    );
  }
);

/* =========================================================
   REPORTS
========================================================= */

apiRouter.post(
  '/reports',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    const b =
      req.body ?? {};

    const report =
      await db.userReport.create(
        {
          data: {
            reporterId:
              profile.id,

            reportedUserId:
              b.reported_user_id ??
              null,

            sessionId:
              b.session_id ??
              null,

            reportType:
              enumValue(
                b.report_type,
                'OTHER'
              ) as any,

            description:
              String(
                b.description ??
                  ''
              ),
          },
        }
      );

    res.status(201)
      .json(report);
  }
);

apiRouter.get(
  '/reports',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    const where =
      profile.role ===
      'ADMIN'
        ? {}
        : {
            reporterId:
              profile.id,
          };

    res.json(
      await db.userReport.findMany(
        {
          where,

          include: {
            reportedUser:
              true,

            reporter:
              true,

            evidence:
              true,
          },

          orderBy: {
            createdAt:
              'desc',
          },
        }
      )
    );
  }
);

/* =========================================================
   BLOCKS
========================================================= */

apiRouter.post(
  '/blocks',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    const blockedUserId =
      req.body?.blocked_user_id;

    if (!blockedUserId) {
      return bad(
        res,
        'blocked_user_id is required'
      );
    }

    const block =
      await db.userBlock.upsert(
        {
          where: {
            blockerId_blockedUserId:
              {
                blockerId:
                  profile.id,

                blockedUserId,
              },
          },

          create: {
            blockerId:
              profile.id,

            blockedUserId,

            reason:
              req.body?.reason ??
              null,
          },

          update: {
            reason:
              req.body?.reason ??
              null,
          },
        }
      );

    res.status(201)
      .json(block);
  }
);

apiRouter.get(
  '/blocks',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    res.json(
      await db.userBlock.findMany(
        {
          where: {
            blockerId:
              profile.id,
          },

        }
      )
    );
  }
);

apiRouter.delete(
  '/blocks/:userId',
  requireAuth,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    res.json(
      await db.userBlock.deleteMany(
        {
          where: {
            blockerId:
              profile.id,

            blockedUserId:
              req.params.userId,
          },
        }
      )
    );
  }
);

/* =========================================================
   ADMIN
========================================================= */

apiRouter.get(
  '/admin/analytics',
  requireAdmin,
  async (_req, res) => {
    const [
      users,
      skills,
      sessions,
      credits,
    ] =
      await Promise.all([
        db.timeCreditWallet.count(),

        db.skill.count({
          where: {
            isActive:
              true,
          },
        }),

        db.session.count(),

        db.timeCreditTransaction.aggregate(
          {
            where: {
              transactionType:
                'SESSION_EARN',
            },

            _sum: {
              amount:
                true,
            },
          }
        ),
      ]);

    res.json({
      users,

      skills,

      sessions,

      creditsEarned:
        credits._sum
          .amount ??
        0,
    });
  }
);

apiRouter.get(
  '/admin/users',
  requireAdmin,
  async (req, res) => {
    const q =
      String(
        req.query.q ??
          ''
      );

    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) return bad(res, error.message, 500);

    const users = (data.users ?? [])
      .map((user: any) => {
        const metadata = user.user_metadata ?? {};
        return {
          id: user.id,
          user_id: user.id,
          email: user.email ?? null,
          fullName: metadata.full_name ?? null,
          ageGroup: metadata.age_group ?? null,
          city: metadata.city ?? null,
          state: metadata.state ?? null,
          preferredLanguage: metadata.preferred_language ?? 'English',
          educationWorkStatus: metadata.education_work_status ?? null,
          profilePhotoUrl: metadata.profile_photo_url ?? null,
          role: metadata.role ?? 'LEARNER',
          isEmailVerified: Boolean(user.email_confirmed_at),
          isActive: metadata.is_active !== false,
          createdAt: user.created_at,
        };
      })
      .filter((user: any) => {
        if (!q) return true;
        const term = q.toLowerCase();
        return [user.fullName, user.city, user.email]
          .filter(Boolean)
          .some((value: any) => String(value).toLowerCase().includes(term));
      });

    res.json(users);
  }
);

apiRouter.get(
  '/admin/reports',
  requireAdmin,
  async (_req, res) => {
    res.json(
      await db.userReport.findMany(
        {
          include: {
            reporter:
              true,

            reportedUser:
              true,

            evidence:
              true,
          },

          orderBy: {
            createdAt:
              'desc',
          },
        }
      )
    );
  }
);

apiRouter.patch(
  '/admin/reports/:id',
  requireAdmin,
  async (req, res) => {
    const {
      profile,
    } =
      auth(req);

    const b =
      req.body ?? {};

    const report =
      await db.userReport.update(
        {
          where: {
            id:
              req.params.id,
          },

          data: {
            status:
              enumValue(
                b.status,
                'OPEN'
              ) as any,

            adminNotes:
              b.admin_notes ??
              null,

            resolvedBy:
              b.status &&
              b.status !==
                'OPEN'
                ? profile.id
                : null,

            resolvedAt:
              b.status &&
              b.status !==
                'OPEN'
                ? new Date()
                : null,
          },
        }
      );

    await db.adminAction
      .create({
        data: {
          adminId:
            profile.id,

          actionType:
            'REPORT_RESOLVED',

          targetId:
            report.id,

          notes:
            b.admin_notes ??
            null,
        },
      })
      .catch(
        () => undefined
      );

    res.json(report);
  }
);

/* =========================================================
   COMPATIBILITY ALIASES
========================================================= */

/* =========================================================
   COMPATIBILITY ALIASES
========================================================= */

apiRouter.get(
  '/v1/me/profile',
  requireAuth,
  async (req, res) => {
    const { profile } = auth(req);

    return res.json({
      profile,
    });
  }
);
export default apiRouter;