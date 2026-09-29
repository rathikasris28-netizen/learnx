import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { db } from './db.ts';
import { supabaseAdmin, supabaseAnon } from './supabase.ts';
import { createLiveKitToken, LIVEKIT_URL } from './livekit.ts';
import {
  parseNaturalLanguageSearch,
  computeMatches,
  generateStructuredLearningPlan
} from './ai.ts';

export const apiRouter = Router();

// -------------------------------------------------------------
// HEALTH CHECK
// -------------------------------------------------------------

apiRouter.get('/health', (_req: Request, res: Response) => {
  try {
    const skillCount =
      (db.prepare('SELECT COUNT(*) as count FROM skills').get() as any)?.count ?? 0;

    res.json({
      status: 'healthy',
      database: 'connected',
      skill_count: skillCount,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'unhealthy',
      error: err.message
    });
  }
});

// -------------------------------------------------------------
// V1 SKILLS
// -------------------------------------------------------------

apiRouter.get('/v1/skills', (req: Request, res: Response) => {
  const { limit = '100', category, search } = req.query;

  let query = `
    SELECT *
    FROM skills
    WHERE is_active = 1
  `;

  const params: any[] = [];

  if (category && category !== 'All') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const safeLimit = Math.min(
    Math.max(Number(limit) || 100, 1),
    500
  );

  query += ' ORDER BY name ASC LIMIT ?';
  params.push(safeLimit);

  const skills = db.prepare(query).all(...params);

  res.json({
    success: true,
    skills
  });
});

// -------------------------------------------------------------
// REAL-TIME SSE
// -------------------------------------------------------------

const sseClients = new Set<(event: string, data: any) => void>();

export function broadcastEvent(event: string, data: any) {
  for (const client of sseClients) {
    try {
      client(event, data);
    } catch {
      // Client disconnected.
    }
  }
}

apiRouter.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.flushHeaders();

  const sendEvent = (event: string, data: any) => {
    try {
      res.write(
        `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
      );
    } catch {
      // Ignore disconnected clients.
    }
  };

  sseClients.add(sendEvent);

  sendEvent('connected', {
    time: new Date().toISOString()
  });

  req.on('close', () => {
    sseClients.delete(sendEvent);
  });
});

// -------------------------------------------------------------
// REAL-TIME SYNC FALLBACK
// -------------------------------------------------------------

apiRouter.get('/sync/events', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);

  if (!user) {
    res.status(401).json({
      error: 'Unauthorized'
    });
    return;
  }

  const userId = user.user_id;

  const sessions = db.prepare(`
    SELECT
      s.*,
      p.full_name AS other_party_name,
      sk.name AS skill_name
    FROM sessions s
    JOIN profiles p
      ON p.user_id = CASE
        WHEN s.learner_id = ?
        THEN s.knowledge_sharer_id
        ELSE s.learner_id
      END
    JOIN skills sk
      ON s.skill_id = sk.id
    WHERE
      (s.learner_id = ? OR s.knowledge_sharer_id = ?)
      AND s.updated_at > datetime('now', '-1 minute')
    ORDER BY s.updated_at DESC
  `).all(userId, userId, userId);

  const notifications = db.prepare(`
    SELECT *
    FROM notifications
    WHERE user_id = ?
      AND is_read = 0
    ORDER BY created_at DESC
    LIMIT 10
  `).all(userId);

  res.json({
    success: true,
    sessions,
    notifications,
    timestamp: Date.now()
  });
});

// -------------------------------------------------------------
// AUTHENTICATED USER HELPER
// -------------------------------------------------------------

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
    return null;
  }

  const token = authHeader
    .replace(/^Bearer\s+/i, '')
    .trim();

  if (!token) {
    return null;
  }

  try {
    const {
      data,
      error
    } = await supabaseAnon.auth.getUser(token);

    if (error || !data.user) {
      return null;
    }

    const userId = data.user.id;

    const profile = db
      .prepare(`
        SELECT *
        FROM profiles
        WHERE user_id = ?
      `)
      .get(userId) as any;

    return profile || null;
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// 1. AUTHENTICATION & PROFILE
// -------------------------------------------------------------

type RegistrationRole =
  | 'LEARNER'
  | 'KNOWLEDGE_SHARER';

// -------------------------------------------------------------
// REGISTER ACCOUNT
// -------------------------------------------------------------

async function registerAccount(
  req: Request,
  res: Response,
  fixedRole?: RegistrationRole
) {
  try {
    const {
      full_name,
      email,
      password,
      confirm_password,
      age_group,
      city,
      state,
      preferred_language,
      education_status,
      profile_photo,
      terms_accepted,
      role: requestedRole
    } = req.body;

    const role: RegistrationRole | null =
      fixedRole ??
      (
        requestedRole === 'LEARNER'
          ? 'LEARNER'
          : requestedRole === 'MENTOR' ||
            requestedRole === 'KNOWLEDGE_SHARER'
            ? 'KNOWLEDGE_SHARER'
            : null
      );

    const cleanEmail =
      typeof email === 'string'
        ? email.trim().toLowerCase()
        : '';

    const cleanFullName =
      typeof full_name === 'string'
        ? full_name.trim()
        : '';

    const passwordValid =
      typeof password === 'string' &&
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /\d/.test(password) &&
      /[^A-Za-z0-9]/.test(password);

    const allowedAgeGroups = [
      'Under 18',
      '18-24',
      '25-34',
      '35-44',
      '45-54',
      '55+'
    ];

    const allowedLanguages = [
      'English',
      'Tamil',
      'Hindi',
      'Telugu',
      'Malayalam',
      'Kannada',
      'Other'
    ];

    const allowedEducationStatuses = [
      'School Student',
      'College Student',
      'Graduate',
      'Working Professional',
      'Self-Employed',
      'Job Seeker',
      'Other'
    ];

    // ---------------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------------

    if (!role) {
      res.status(400).json({
        error: 'Choose Learner or Mentor registration.'
      });
      return;
    }

    if (
      !cleanFullName ||
      !cleanEmail ||
      typeof age_group !== 'string' ||
      !age_group ||
      typeof city !== 'string' ||
      !city.trim() ||
      typeof state !== 'string' ||
      !state.trim() ||
      typeof preferred_language !== 'string' ||
      !preferred_language ||
      typeof education_status !== 'string' ||
      !education_status
    ) {
      res.status(400).json({
        error:
          'Full name, email, age group, city, state, preferred language, and education/work status are required.'
      });
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        cleanEmail
      )
    ) {
      res.status(400).json({
        error: 'Enter a valid email address.'
      });
      return;
    }

    if (!passwordValid) {
      res.status(400).json({
        error:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
      });
      return;
    }

    if (
      typeof confirm_password === 'string' &&
      confirm_password !== password
    ) {
      res.status(400).json({
        error: 'Password and confirm password do not match.'
      });
      return;
    }

    if (
      !allowedAgeGroups.includes(age_group) ||
      !allowedLanguages.includes(preferred_language) ||
      !allowedEducationStatuses.includes(
        education_status
      )
    ) {
      res.status(400).json({
        error:
          'Choose a valid age group, preferred language, and education/work status.'
      });
      return;
    }

    if (terms_accepted !== true) {
      res.status(400).json({
        error:
          'Accept the Terms & Conditions and Privacy Policy to register.'
      });
      return;
    }

    // ---------------------------------------------------------
    // LOCAL DUPLICATE CHECK
    // ---------------------------------------------------------

    const existing = db
      .prepare(`
        SELECT id
        FROM profiles
        WHERE email = ?
      `)
      .get(cleanEmail);

    if (existing) {
      res.status(409).json({
        error:
          'An account with this email already exists.'
      });
      return;
    }

    // ---------------------------------------------------------
    // SUPABASE USER CREATION
    // ---------------------------------------------------------

    const {
      data: created,
      error: createError
    } =
      await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,

        app_metadata: {
          learnx_role: role
        },

        user_metadata: {
          full_name: cleanFullName,
          age_group,
          city: city.trim(),
          state: state.trim(),
          preferred_language,
          education_status
        }
      });

    if (createError || !created.user) {
      const duplicateEmail =
        /already|registered|exists/i.test(
          createError?.message || ''
        );

      res.status(
        duplicateEmail ? 409 : 400
      ).json({
        error: duplicateEmail
          ? 'An account with this email already exists.'
          : createError?.message ||
            'Supabase account creation failed.'
      });

      return;
    }

    const supabaseUserId =
      created.user.id;

    const acceptedAt =
      new Date().toISOString();

    let welcomeBonus = 0;

    // ---------------------------------------------------------
    // LOCAL DATABASE TRANSACTION
    // ---------------------------------------------------------

    try {
      db.exec('BEGIN IMMEDIATE');

      // -------------------------------------------------------
      // PROFILE
      // -------------------------------------------------------

      db.prepare(`
        INSERT INTO profiles (
          id,
          user_id,
          full_name,
          email,
          age_group,
          city,
          state,
          preferred_language,
          education_status,
          profile_photo,
          role,
          is_email_verified,
          onboarding_completed,
          terms_accepted_at
        )
        VALUES (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          1,
          0,
          ?
        )
      `).run(
        supabaseUserId,
        supabaseUserId,
        cleanFullName,
        cleanEmail,
        age_group,
        city.trim(),
        state.trim(),
        preferred_language,
        education_status,
        typeof profile_photo === 'string'
          ? profile_photo.trim()
          : '',
        role,
        acceptedAt
      );

      // -------------------------------------------------------
      // WALLET
      // -------------------------------------------------------

      db.prepare(`
        INSERT INTO time_credit_accounts (
          id,
          user_id,
          balance,
          total_earned,
          total_spent
        )
        VALUES (?, ?, 0, 0, 0)
      `).run(
        `tc-${supabaseUserId}`,
        supabaseUserId
      );

      // -------------------------------------------------------
      // LEARNER WELCOME BONUS
      // Exactly once
      // -------------------------------------------------------

      if (role === 'LEARNER') {
        const bonus =
          db.prepare(`
            INSERT OR IGNORE INTO credit_transactions (
              id,
              user_id,
              amount,
              transaction_type,
              status,
              description
            )
            VALUES (
              ?,
              ?,
              5,
              'WELCOME_BONUS',
              'COMPLETED',
              'New Learner Welcome Bonus'
            )
          `).run(
            crypto.randomUUID(),
            supabaseUserId
          );

        if (Number(bonus.changes) === 1) {
          db.prepare(`
            UPDATE time_credit_accounts
            SET
              balance = balance + 5,
              total_earned = total_earned + 5,
              updated_at = ?
            WHERE user_id = ?
          `).run(
            acceptedAt,
            supabaseUserId
          );

          welcomeBonus = 5;
        }
      }

      // -------------------------------------------------------
      // DEFAULT AVAILABILITY
      // -------------------------------------------------------

      db.prepare(`
        INSERT OR IGNORE INTO user_availability (
          id,
          user_id,
          status,
          available_from,
          available_until
        )
        VALUES (
          ?,
          ?,
          'ACTIVE',
          '18:00:00',
          '21:00:00'
        )
      `).run(
        `av-${supabaseUserId}`,
        supabaseUserId
      );

      // -------------------------------------------------------
      // TRUST SCORE
      // -------------------------------------------------------

      db.prepare(`
        INSERT OR IGNORE INTO trust_scores (
          id,
          user_id,
          score,
          reliability_score,
          verification_level
        )
        VALUES (
          ?,
          ?,
          85,
          90,
          'COMMUNITY_VERIFIED'
        )
      `).run(
        `ts-${supabaseUserId}`,
        supabaseUserId
      );

      // -------------------------------------------------------
      // WELCOME NOTIFICATION
      // -------------------------------------------------------

      db.prepare(`
        INSERT INTO notifications (
          id,
          user_id,
          title,
          message,
          type,
          link
        )
        VALUES (
          ?,
          ?,
          ?,
          ?,
          'SYSTEM',
          '/onboarding'
        )
      `).run(
        crypto.randomUUID(),
        supabaseUserId,
        'Welcome to LearnX!',
        'Complete your onboarding to personalize your experience.'
      );

      // -------------------------------------------------------
      // AUDIT LOG
      // -------------------------------------------------------

      db.prepare(`
        INSERT INTO audit_logs (
          id,
          actor_id,
          action,
          target_type,
          target_id,
          details_json
        )
        VALUES (
          ?,
          ?,
          'USER_REGISTER',
          'USER',
          ?,
          ?
        )
      `).run(
        crypto.randomUUID(),
        supabaseUserId,
        supabaseUserId,
        JSON.stringify({
          email: cleanEmail,
          role
        })
      );

      db.exec('COMMIT');
    } catch (databaseError) {
      db.exec('ROLLBACK');

      // Supabase account must not remain if
      // local LearnX registration failed.
      await supabaseAdmin.auth.admin
        .deleteUser(supabaseUserId)
        .catch(() => {});

      throw databaseError;
    }

    // ---------------------------------------------------------
    // AUTOMATIC LOGIN
    // ---------------------------------------------------------

    let accessToken: string | null = null;

    try {
      const signedIn =
        await supabaseAnon.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

      if (
        !signedIn.error &&
        signedIn.data.session?.access_token
      ) {
        accessToken =
          signedIn.data.session.access_token;
      }
    } catch {
      accessToken = null;
    }

    // ---------------------------------------------------------
    // RESPONSE
    // ---------------------------------------------------------

    const profile =
      db.prepare(`
        SELECT *
        FROM profiles
        WHERE user_id = ?
      `).get(supabaseUserId) as any;

    const wallet =
      db.prepare(`
        SELECT *
        FROM time_credit_accounts
        WHERE user_id = ?
      `).get(supabaseUserId) as any;

    res.status(201).json({
      success: true,
      message: 'Registration successful.',

      user_id: supabaseUserId,

      role,

      welcome_bonus: welcomeBonus,

      email_confirmed: true,

      authenticated: Boolean(accessToken),

      token: accessToken,

      user: {
        id: profile.user_id,
        user_id: profile.user_id,

        email: profile.email,

        full_name: profile.full_name,

        role: profile.role,

        is_email_verified: true,

        onboarding_completed: false,

        preferred_language:
          profile.preferred_language,

        city: profile.city,

        state: profile.state,

        profile_photo:
          profile.profile_photo,

        wallet_balance:
          wallet?.balance ?? 0,

        total_earned_credits:
          wallet?.total_earned ?? 0,

        total_spent_credits:
          wallet?.total_spent ?? 0
      }
    });
  } catch (err: any) {
    res.status(500).json({
      error:
        err.message ||
        'Failed to complete registration.'
    });
  }
}

// -------------------------------------------------------------
// REGISTRATION ROUTES
// -------------------------------------------------------------

apiRouter.post(
  '/auth/register',
  async (req: Request, res: Response) =>
    registerAccount(req, res)
);

apiRouter.post(
  '/auth/register/learner',
  async (req: Request, res: Response) =>
    registerAccount(
      req,
      res,
      'LEARNER'
    )
);

apiRouter.post(
  '/auth/register/mentor',
  async (req: Request, res: Response) =>
    registerAccount(
      req,
      res,
      'KNOWLEDGE_SHARER'
    )
);

// -------------------------------------------------------------
// LOGIN
// -------------------------------------------------------------

apiRouter.post(
  '/auth/login',
  async (req: Request, res: Response) => {
    try {
      const {
        email,
        password
      } = req.body;

      if (!email || !password) {
        res.status(400).json({
          error:
            'Email and password are required.'
        });
        return;
      }

      const cleanEmail =
        String(email)
          .trim()
          .toLowerCase();

      let authData: any;

      try {
        const authRes =
          await supabaseAnon.auth
            .signInWithPassword({
              email: cleanEmail,
              password
            });

        if (
          authRes.error ||
          !authRes.data.session
        ) {
          res.status(401).json({
            error:
              'Invalid email or password.'
          });
          return;
        }

        authData =
          authRes.data;
      } catch {
        res.status(503).json({
          error:
            'Authentication service is unavailable.'
        });
        return;
      }

      let profile =
        db.prepare(`
          SELECT *
          FROM profiles
          WHERE email = ?
        `).get(cleanEmail) as any;

      // -------------------------------------------------------
      // RECOVER PROFILE IF SUPABASE USER EXISTS
      // -------------------------------------------------------

      if (!profile && authData.user) {
        const u =
          authData.user;

        const meta =
          u.user_metadata || {};

        const requestedRole =
          u.app_metadata
            ?.learnx_role;

        const profileRole =
          requestedRole ===
          'KNOWLEDGE_SHARER'
            ? 'KNOWLEDGE_SHARER'
            : 'LEARNER';

        db.prepare(`
          INSERT INTO profiles (
            id,
            user_id,
            full_name,
            email,
            age_group,
            city,
            state,
            preferred_language,
            role,
            is_email_verified,
            onboarding_completed
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            0
          )
        `).run(
          u.id,
          u.id,
          meta.full_name ||
            cleanEmail.split('@')[0],
          cleanEmail,
          meta.age_group ||
            '18-24',
          meta.city || '',
          meta.state || '',
          meta.preferred_language ||
            'English',
          profileRole,
          u.confirmed_at ? 1 : 0
        );

        profile =
          db.prepare(`
            SELECT *
            FROM profiles
            WHERE user_id = ?
          `).get(u.id);
      }

      if (!profile) {
        res.status(401).json({
          error:
            'Account profile is unavailable.'
        });
        return;
      }

      // -------------------------------------------------------
      // ENSURE WALLET EXISTS
      // -------------------------------------------------------

      db.prepare(`
        INSERT OR IGNORE INTO time_credit_accounts (
          id,
          user_id,
          balance,
          total_earned,
          total_spent
        )
        VALUES (?, ?, 0, 0, 0)
      `).run(
        `tc-${profile.user_id}`,
        profile.user_id
      );

      const wallet =
        db.prepare(`
          SELECT *
          FROM time_credit_accounts
          WHERE user_id = ?
        `).get(
          profile.user_id
        ) as any;

      const availability =
        db.prepare(`
          SELECT *
          FROM user_availability
          WHERE user_id = ?
        `).get(
          profile.user_id
        ) as any;

      res.json({
        success: true,

        user: {
          id: profile.user_id,

          user_id:
            profile.user_id,

          email:
            profile.email,

          full_name:
            profile.full_name,

          role:
            profile.role,

          is_email_verified:
            profile.is_email_verified === 1,

          onboarding_completed:
            profile.onboarding_completed === 1,

          total_earned_credits:
            wallet?.total_earned ?? 0,

          total_spent_credits:
            wallet?.total_spent ?? 0,

          preferred_language:
            profile.preferred_language,

          city:
            profile.city,

          state:
            profile.state,

          profile_photo:
            profile.profile_photo,

          bio:
            profile.bio,

          wallet_balance:
            wallet?.balance ?? 0,

          availability:
            availability?.status ??
            'ACTIVE'
        },

        token:
          authData.session.access_token
      });
    } catch (err: any) {
      res.status(500).json({
        error:
          err.message ||
          'Login failed.'
      });
    }
  }
);

// -------------------------------------------------------------
// EMAIL VERIFICATION
// -------------------------------------------------------------

apiRouter.post(
  '/auth/verify-email',
  async (req: Request, res: Response) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const {
      user_id,
      email
    } = req.body;

    if (
      (user_id &&
        user_id !== user.user_id) ||
      (email &&
        email.toLowerCase() !==
          user.email.toLowerCase())
    ) {
      res.status(403).json({
        error:
          'You can only verify your own account.'
      });
      return;
    }

    db.prepare(`
      UPDATE profiles
      SET is_email_verified = 1
      WHERE user_id = ?
    `).run(user.user_id);

    res.json({
      success: true,
      message:
        'Email verified successfully.'
    });
  }
);

// -------------------------------------------------------------
// RESEND VERIFICATION
// -------------------------------------------------------------

apiRouter.post(
  '/auth/resend-verification',
  async (req: Request, res: Response) => {
    const {
      email
    } = req.body;

    if (!email) {
      res.status(400).json({
        error:
          'Email is required.'
      });
      return;
    }

    try {
      await supabaseAnon.auth.resend({
        type: 'signup',
        email:
          String(email)
            .trim()
            .toLowerCase()
      });
    } catch {
      // Do not expose provider details.
    }

    res.json({
      success: true,
      message:
        'Verification link resent to your email address.'
    });
  }
);

// -------------------------------------------------------------
// CURRENT USER
// -------------------------------------------------------------

apiRouter.get(
  '/auth/me',
  async (req: Request, res: Response) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error:
          'This endpoint requires a valid Bearer token'
      });
      return;
    }

    const wallet =
      db.prepare(`
        SELECT *
        FROM time_credit_accounts
        WHERE user_id = ?
      `).get(
        user.user_id
      ) as any;

    const availability =
      db.prepare(`
        SELECT *
        FROM user_availability
        WHERE user_id = ?
      `).get(
        user.user_id
      ) as any;

    const learnSkills =
      db.prepare(`
        SELECT
          s.id,
          s.name,
          s.category,
          us.skill_level
        FROM user_skills us
        JOIN skills s
          ON us.skill_id = s.id
        WHERE
          us.user_id = ?
          AND us.skill_type = 'LEARN'
        ORDER BY s.name ASC
      `).all(
        user.user_id
      );

    const shareSkills =
      db.prepare(`
        SELECT
          s.id,
          s.name,
          s.category,
          us.skill_level
        FROM user_skills us
        JOIN skills s
          ON us.skill_id = s.id
        WHERE
          us.user_id = ?
          AND us.skill_type = 'SHARE'
        ORDER BY s.name ASC
      `).all(
        user.user_id
      );

    const unreadNotifs =
      (
        db.prepare(`
          SELECT COUNT(*) AS count
          FROM notifications
          WHERE
            user_id = ?
            AND is_read = 0
        `).get(
          user.user_id
        ) as any
      )?.count ?? 0;

    res.json({
      user: {
        ...user,

        is_email_verified:
          user.is_email_verified === 1,

        onboarding_completed:
          user.onboarding_completed === 1,

        wallet_balance:
          wallet?.balance ?? 0,

        total_earned_credits:
          wallet?.total_earned ?? 0,

        total_spent_credits:
          wallet?.total_spent ?? 0,

        availability:
          availability?.status ??
          'ACTIVE',

        available_from:
          availability?.available_from ??
          '18:00:00',

        available_until:
          availability?.available_until ??
          '21:00:00',

        learn_skills:
          learnSkills,

        share_skills:
          shareSkills,

        unread_notifications_count:
          unreadNotifs
      }
    });
  }
);

// -------------------------------------------------------------
// UPDATE PROFILE
// -------------------------------------------------------------

apiRouter.put(
  '/profile',
  async (req: Request, res: Response) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const {
      full_name,
      mobile,
      city,
      state,
      preferred_language,
      education_status,
      bio,
      profile_photo
    } = req.body;

    db.prepare(`
      UPDATE profiles
      SET
        full_name = COALESCE(?, full_name),
        mobile = COALESCE(?, mobile),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        preferred_language =
          COALESCE(?, preferred_language),
        education_status =
          COALESCE(?, education_status),
        bio = COALESCE(?, bio),
        profile_photo =
          COALESCE(?, profile_photo)
      WHERE user_id = ?
    `).run(
      typeof full_name === 'string'
        ? full_name.trim()
        : null,

      typeof mobile === 'string'
        ? mobile.trim()
        : null,

      typeof city === 'string'
        ? city.trim()
        : null,

      typeof state === 'string'
        ? state.trim()
        : null,

      typeof preferred_language === 'string'
        ? preferred_language
        : null,

      typeof education_status === 'string'
        ? education_status
        : null,

      typeof bio === 'string'
        ? bio.trim()
        : null,

      typeof profile_photo === 'string'
        ? profile_photo.trim()
        : null,

      user.user_id
    );

    const updated =
      db.prepare(`
        SELECT *
        FROM profiles
        WHERE user_id = ?
      `).get(
        user.user_id
      );

    res.json({
      success: true,
      user: updated
    });
  }
);
// -------------------------------------------------------------
// VIEW PUBLIC PROFILE
// -------------------------------------------------------------

apiRouter.get('/profile/:id', (req: Request, res: Response) => {
  const profileId = req.params.id;

  const profile = db.prepare(`
    SELECT
      user_id,
      full_name,
      email,
      city,
      state,
      preferred_language,
      education_status,
      profile_photo,
      bio,
      role,
      created_at
    FROM profiles
    WHERE user_id = ?
  `).get(profileId) as any;

  if (!profile) {
    res.status(404).json({
      error: 'User profile not found.'
    });
    return;
  }

  // -----------------------------------------------------------
  // LEARN SKILLS
  // -----------------------------------------------------------

  const learnSkills = db.prepare(`
    SELECT
      s.id,
      s.name,
      s.category,
      s.description,
      us.skill_level
    FROM user_skills us
    JOIN skills s
      ON us.skill_id = s.id
    WHERE
      us.user_id = ?
      AND us.skill_type = 'LEARN'
    ORDER BY s.name ASC
  `).all(profileId);

  // -----------------------------------------------------------
  // SHARE SKILLS
  // -----------------------------------------------------------

  const shareSkills = db.prepare(`
    SELECT
      s.id,
      s.name,
      s.category,
      s.description,
      us.skill_level,
      us.experience,
      us.languages_json,
      us.skill_description,
      us.beginner_friendly,
      us.skill_proof
    FROM user_skills us
    JOIN skills s
      ON us.skill_id = s.id
    WHERE
      us.user_id = ?
      AND us.skill_type = 'SHARE'
    ORDER BY s.name ASC
  `).all(profileId);

  const trustScore = db.prepare(`
    SELECT *
    FROM trust_scores
    WHERE user_id = ?
  `).get(profileId) as any;

  const availability = db.prepare(`
    SELECT *
    FROM user_availability
    WHERE user_id = ?
  `).get(profileId) as any;

  const ratings = db.prepare(`
    SELECT
      r.*,
      p.full_name AS rater_name
    FROM ratings r
    JOIN profiles p
      ON r.rater_id = p.user_id
    WHERE r.ratee_id = ?
    ORDER BY r.created_at DESC
    LIMIT 10
  `).all(profileId);

  const avgRating = db.prepare(`
    SELECT
      AVG(overall_score) AS avg,
      COUNT(*) AS count
    FROM ratings
    WHERE ratee_id = ?
  `).get(profileId) as any;

  const parsedShareSkills = shareSkills.map(
    (skill: any) => ({
      ...skill,
      languages:
        (() => {
          try {
            return JSON.parse(
              skill.languages_json || '[]'
            );
          } catch {
            return [];
          }
        })()
    })
  );

  res.json({
    profile: {
      ...profile,

      learn_skills:
        learnSkills,

      share_skills:
        parsedShareSkills,

      trust_score:
        trustScore?.score ?? 85,

      reliability_score:
        trustScore?.reliability_score ?? 90,

      verification_level:
        trustScore?.verification_level ??
        'COMMUNITY_VERIFIED',

      availability_status:
        availability?.status ??
        'ACTIVE',

      available_from:
        availability?.available_from ??
        '18:00:00',

      available_until:
        availability?.available_until ??
        '21:00:00',

      rating_avg:
        avgRating?.avg != null
          ? Number(avgRating.avg).toFixed(1)
          : '0.0',

      rating_count:
        avgRating?.count ?? 0,

      recent_reviews:
        ratings
    }
  });
});

// -------------------------------------------------------------
// 2. ONBOARDING
// -------------------------------------------------------------
//
// IMPORTANT:
// Registration role does NOT restrict capabilities.
//
// Learner can:
//   - Learn
//   - Share
//   - Learn + Share
//
// Knowledge Sharer/Mentor can:
//   - Learn
//   - Share
//   - Learn + Share
//
// user_skills is the single source of truth.
// skill_type = LEARN
// skill_type = SHARE
// -------------------------------------------------------------

apiRouter.post(
  '/onboarding',
  async (req: Request, res: Response) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const {
      learn_skills,
      share_skills,
      availability,
      bio,
      learning_goal,
      target_skill_level,
      learning_schedule,
      learning_interests,
      preferred_language,
      mentor_experience,
      mentor_languages
    } = req.body;

    // ---------------------------------------------------------
    // BASIC SKILL ARRAY VALIDATION
    // ---------------------------------------------------------

    if (
      !Array.isArray(learn_skills) ||
      !Array.isArray(share_skills)
    ) {
      res.status(400).json({
        error: 'Invalid skills data.'
      });
      return;
    }

    if (
      learn_skills.length === 0 &&
      share_skills.length === 0
    ) {
      res.status(400).json({
        error:
          'Select at least one skill to learn or share.'
      });
      return;
    }

    // ---------------------------------------------------------
    // ALLOWED VALUES
    // ---------------------------------------------------------

    const validLevels = [
      'BEGINNER',
      'ELEMENTARY',
      'INTERMEDIATE',
      'ADVANCED'
    ];

    const allowedLanguages = [
      'English',
      'Tamil',
      'Hindi',
      'Telugu',
      'Malayalam',
      'Kannada',
      'Other'
    ];

    // ---------------------------------------------------------
    // LEARNING VALIDATION
    // ---------------------------------------------------------

    if (
      learn_skills.length > 0 &&
      (
        typeof learning_goal !== 'string' ||
        !learning_goal.trim()
      )
    ) {
      res.status(400).json({
        error:
          'Provide a learning goal when selecting learning skills.'
      });
      return;
    }

    if (
      target_skill_level &&
      !validLevels.includes(
        target_skill_level
      )
    ) {
      res.status(400).json({
        error:
          'Invalid target skill level.'
      });
      return;
    }

    if (
      preferred_language &&
      !allowedLanguages.includes(
        preferred_language
      )
    ) {
      res.status(400).json({
        error:
          'Choose a valid preferred language.'
      });
      return;
    }

    // ---------------------------------------------------------
    // AVAILABILITY VALIDATION
    // ---------------------------------------------------------

    if (availability) {
      if (
        !['ACTIVE', 'INACTIVE'].includes(
          availability.status || 'ACTIVE'
        )
      ) {
        res.status(400).json({
          error:
            'Availability status must be ACTIVE or INACTIVE.'
        });
        return;
      }

      const timePattern =
        /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

      if (
        (
          availability.available_from &&
          !timePattern.test(
            availability.available_from
          )
        ) ||
        (
          availability.available_until &&
          !timePattern.test(
            availability.available_until
          )
        )
      ) {
        res.status(400).json({
          error:
            'Availability times must use HH:MM or HH:MM:SS format.'
        });
        return;
      }
    }

    // ---------------------------------------------------------
    // VALIDATE ALL LEARN SKILLS BEFORE DB CHANGES
    // ---------------------------------------------------------

    for (
      const learningSkill of learn_skills
    ) {
      if (
        !learningSkill ||
        typeof learningSkill.skill_id !==
          'string' ||
        !learningSkill.skill_id ||
        !validLevels.includes(
          learningSkill.level
        )
      ) {
        res.status(400).json({
          error:
            'Complete each learning skill with a valid skill and level.'
        });
        return;
      }

      const skillExists =
        db.prepare(`
          SELECT id
          FROM skills
          WHERE
            id = ?
            AND is_active = 1
        `).get(
          learningSkill.skill_id
        );

      if (!skillExists) {
        res.status(400).json({
          error:
            'Selected learning skill does not exist.'
        });
        return;
      }
    }

    // ---------------------------------------------------------
    // VALIDATE ALL SHARE SKILLS BEFORE DB CHANGES
    // ---------------------------------------------------------

    for (
      const sharingSkill of share_skills
    ) {
      if (
        !sharingSkill ||
        typeof sharingSkill.skill_id !==
          'string' ||
        !sharingSkill.skill_id ||
        !validLevels.includes(
          sharingSkill.level
        )
      ) {
        res.status(400).json({
          error:
            'Complete each sharing skill with a valid skill and level.'
        });
        return;
      }

      const skillExists =
        db.prepare(`
          SELECT id
          FROM skills
          WHERE
            id = ?
            AND is_active = 1
        `).get(
          sharingSkill.skill_id
        );

      if (!skillExists) {
        res.status(400).json({
          error:
            'Selected sharing skill does not exist.'
        });
        return;
      }

      if (
        typeof sharingSkill.experience !==
          'string' ||
        !sharingSkill.experience.trim()
      ) {
        res.status(400).json({
          error:
            'Experience is required for each sharing skill.'
        });
        return;
      }

      if (
        typeof sharingSkill.description !==
          'string' ||
        !sharingSkill.description.trim()
      ) {
        res.status(400).json({
          error:
            'Description is required for each sharing skill.'
        });
        return;
      }

      if (
        !Array.isArray(
          sharingSkill.languages
        ) ||
        sharingSkill.languages.length === 0 ||
        sharingSkill.languages.some(
          (language: any) =>
            typeof language !== 'string' ||
            !language.trim()
        )
      ) {
        res.status(400).json({
          error:
            'At least one valid language is required for each sharing skill.'
        });
        return;
      }

      const invalidLanguage =
        sharingSkill.languages.some(
          (language: string) =>
            !allowedLanguages.includes(
              language.trim()
            )
        );

      if (invalidLanguage) {
        res.status(400).json({
          error:
            'One or more sharing languages are invalid.'
        });
        return;
      }
    }

    // ---------------------------------------------------------
    // NORMALIZE OPTIONAL ARRAYS
    // ---------------------------------------------------------

    const normalizedInterests =
      Array.isArray(learning_interests)
        ? learning_interests
            .filter(
              (item: any) =>
                typeof item === 'string' &&
                item.trim()
            )
            .map(
              (item: string) =>
                item.trim()
            )
        : typeof learning_interests ===
            'string'
          ? learning_interests
              .split(',')
              .map(
                (item: string) =>
                  item.trim()
              )
              .filter(Boolean)
          : null;

    const normalizedMentorLanguages =
      Array.isArray(mentor_languages)
        ? mentor_languages
            .filter(
              (item: any) =>
                typeof item === 'string' &&
                item.trim()
            )
            .map(
              (item: string) =>
                item.trim()
            )
        : null;

    // ---------------------------------------------------------
    // TRANSACTION
    // ---------------------------------------------------------

    try {
      db.exec(
        'BEGIN IMMEDIATE'
      );

      // -------------------------------------------------------
      // LEARN SKILLS
      // -------------------------------------------------------

      for (
        const learningSkill of learn_skills
      ) {
        db.prepare(`
          INSERT INTO user_skills (
            id,
            user_id,
            skill_id,
            skill_type,
            skill_level
          )
          VALUES (
            ?,
            ?,
            ?,
            'LEARN',
            ?
          )
          ON CONFLICT(
            user_id,
            skill_id,
            skill_type
          )
          DO UPDATE SET
            skill_level =
              excluded.skill_level
        `).run(
          crypto.randomUUID(),
          user.user_id,
          learningSkill.skill_id,
          learningSkill.level
        );

        // -----------------------------------------------------
        // INITIAL LEARNING PROGRESS
        // -----------------------------------------------------

        db.prepare(`
          INSERT OR IGNORE INTO learning_progress (
            id,
            user_id,
            skill_id,
            progress_percentage
          )
          VALUES (
            ?,
            ?,
            ?,
            0
          )
        `).run(
          crypto.randomUUID(),
          user.user_id,
          learningSkill.skill_id
        );

        // -----------------------------------------------------
        // LEARNING GOAL
        // -----------------------------------------------------

        const goalText =
          learning_goal.trim();

        db.prepare(`
          INSERT INTO learning_goals (
            id,
            user_id,
            skill_id,
            goal_text,
            target_level,
            preferred_schedule
          )
          SELECT
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          WHERE NOT EXISTS (
            SELECT 1
            FROM learning_goals
            WHERE
              user_id = ?
              AND skill_id = ?
              AND goal_text = ?
          )
        `).run(
          crypto.randomUUID(),
          user.user_id,
          learningSkill.skill_id,
          goalText,
          target_skill_level ||
            'INTERMEDIATE',
          typeof learning_schedule ===
            'string'
            ? learning_schedule.trim()
            : '',
          user.user_id,
          learningSkill.skill_id,
          goalText
        );
      }

      // -------------------------------------------------------
      // SHARE SKILLS
      // -------------------------------------------------------

      for (
        const sharingSkill of share_skills
      ) {
        const languages =
          sharingSkill.languages.map(
            (language: string) =>
              language.trim()
          );

        db.prepare(`
          INSERT INTO user_skills (
            id,
            user_id,
            skill_id,
            skill_type,
            skill_level,
            experience,
            languages_json,
            skill_description,
            beginner_friendly,
            skill_proof
          )
          VALUES (
            ?,
            ?,
            ?,
            'SHARE',
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )
          ON CONFLICT(
            user_id,
            skill_id,
            skill_type
          )
          DO UPDATE SET
            skill_level =
              excluded.skill_level,
            experience =
              excluded.experience,
            languages_json =
              excluded.languages_json,
            skill_description =
              excluded.skill_description,
            beginner_friendly =
              excluded.beginner_friendly,
            skill_proof =
              excluded.skill_proof
        `).run(
          crypto.randomUUID(),
          user.user_id,
          sharingSkill.skill_id,
          sharingSkill.level,
          sharingSkill.experience.trim(),
          JSON.stringify(languages),
          sharingSkill.description.trim(),
          sharingSkill.beginner_friendly
            ? 1
            : 0,
          typeof sharingSkill.skill_proof ===
            'string'
            ? sharingSkill.skill_proof.trim()
            : ''
        );
      }

      // -------------------------------------------------------
      // AVAILABILITY
      // -------------------------------------------------------

      if (availability) {
        db.prepare(`
          INSERT INTO user_availability (
            id,
            user_id,
            status,
            available_from,
            available_until,
            days_of_week
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )
          ON CONFLICT(user_id)
          DO UPDATE SET
            status =
              excluded.status,
            available_from =
              excluded.available_from,
            available_until =
              excluded.available_until,
            days_of_week =
              excluded.days_of_week,
            updated_at =
              datetime('now')
        `).run(
          crypto.randomUUID(),
          user.user_id,
          availability.status ||
            'ACTIVE',
          availability.available_from ||
            '18:00:00',
          availability.available_until ||
            '21:00:00',
          Array.isArray(
            availability.days_of_week
          )
            ? JSON.stringify(
                availability.days_of_week
              )
            : null
        );
      }

      // -------------------------------------------------------
      // PROFILE
      // -------------------------------------------------------
      //
      // IMPORTANT:
      // Do not replace existing values with [] when
      // optional onboarding fields were not supplied.
      // -------------------------------------------------------

      db.prepare(`
        UPDATE profiles
        SET
          onboarding_completed = 1,

          bio =
            COALESCE(
              ?,
              bio
            ),

          learning_goal =
            COALESCE(
              ?,
              learning_goal
            ),

          target_skill_level =
            COALESCE(
              ?,
              target_skill_level
            ),

          learning_schedule =
            COALESCE(
              ?,
              learning_schedule
            ),

          learning_interests_json =
            COALESCE(
              ?,
              learning_interests_json
            ),

          preferred_language =
            COALESCE(
              ?,
              preferred_language
            ),

          mentor_experience =
            COALESCE(
              ?,
              mentor_experience
            ),

          mentor_languages_json =
            COALESCE(
              ?,
              mentor_languages_json
            ),

          updated_at =
            datetime('now')

        WHERE user_id = ?
      `).run(
        typeof bio === 'string' &&
          bio.trim()
          ? bio.trim()
          : null,

        typeof learning_goal ===
            'string' &&
          learning_goal.trim()
          ? learning_goal.trim()
          : null,

        target_skill_level ||
          null,

        typeof learning_schedule ===
            'string' &&
          learning_schedule.trim()
          ? learning_schedule.trim()
          : null,

        normalizedInterests ===
          null
          ? null
          : JSON.stringify(
              normalizedInterests
            ),

        preferred_language ||
          null,

        typeof mentor_experience ===
            'string' &&
          mentor_experience.trim()
          ? mentor_experience.trim()
          : null,

        normalizedMentorLanguages ===
          null
          ? null
          : JSON.stringify(
              normalizedMentorLanguages
            ),

        user.user_id
      );

      // -------------------------------------------------------
      // AUDIT
      // -------------------------------------------------------

      db.prepare(`
        INSERT INTO audit_logs (
          id,
          actor_id,
          action,
          target_type,
          target_id,
          details_json
        )
        VALUES (
          ?,
          ?,
          'ONBOARDING_COMPLETED',
          'USER',
          ?,
          ?
        )
      `).run(
        crypto.randomUUID(),
        user.user_id,
        user.user_id,
        JSON.stringify({
          learn_skill_count:
            learn_skills.length,
          share_skill_count:
            share_skills.length
        })
      );

      db.exec('COMMIT');

      res.json({
        success: true,
        message:
          'Onboarding completed successfully.'
      });
    } catch (err: any) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // Ignore rollback errors.
      }

      res.status(500).json({
        error:
          err?.message ||
          'Unable to complete onboarding.'
      });
    }
  }
);

// -------------------------------------------------------------
// 3. SKILL CATALOG
// -------------------------------------------------------------

apiRouter.get(
  '/skills',
  (req: Request, res: Response) => {
    const {
      category,
      search
    } = req.query;

    let query = `
      SELECT *
      FROM skills
      WHERE is_active = 1
    `;

    const params: any[] = [];

    // ---------------------------------------------------------
    // CATEGORY FILTER
    // ---------------------------------------------------------

    if (
      category &&
      category !== 'All'
    ) {
      query += `
        AND category = ?
      `;

      params.push(
        category
      );
    }

    // ---------------------------------------------------------
    // SEARCH FILTER
    // ---------------------------------------------------------

    if (search) {
      query += `
        AND (
          name LIKE ?
          OR description LIKE ?
        )
      `;

      params.push(
        `%${search}%`,
        `%${search}%`
      );
    }

    query += `
      ORDER BY name ASC
    `;

    const skills =
      db.prepare(query)
        .all(...params);

    // ---------------------------------------------------------
    // REAL SHARE COUNTS
    // ---------------------------------------------------------

    const skillsWithCounts =
      skills.map((skill: any) => {
        const sharersCount =
          (
            db.prepare(`
              SELECT
                COUNT(DISTINCT user_id)
                  AS count
              FROM user_skills
              WHERE
                skill_id = ?
                AND skill_type = 'SHARE'
            `).get(
              skill.id
            ) as any
          )?.count ?? 0;

        return {
          ...skill,
          sharers_count:
            sharersCount
        };
      });

    res.json({
      skills:
        skillsWithCounts
    });
  }
);

// -------------------------------------------------------------
// GET SINGLE SKILL
// -------------------------------------------------------------

apiRouter.get(
  '/skills/:id',
  (req: Request, res: Response) => {
    const skill =
      db.prepare(`
        SELECT *
        FROM skills
        WHERE id = ?
          AND is_active = 1
      `).get(
        req.params.id
      ) as any;

    if (!skill) {
      res.status(404).json({
        error: 'Skill not found'
      });
      return;
    }

    // ---------------------------------------------------------
    // REAL KNOWLEDGE SHARERS
    // ---------------------------------------------------------
    //
    // IMPORTANT:
    // Only user_skills.skill_type = SHARE
    // can appear here.
    // ---------------------------------------------------------

    const sharers =
      db.prepare(`
        SELECT
          p.user_id,
          p.full_name,
          p.profile_photo,
          p.city,
          p.state,
          p.preferred_language,

          us.skill_level,
          us.experience,
          us.languages_json,
          us.skill_description,
          us.beginner_friendly,
          us.skill_proof,

          COALESCE(
            ua.status,
            'INACTIVE'
          ) AS availability_status,

          COALESCE(
            ua.available_from,
            '18:00:00'
          ) AS available_from,

          COALESCE(
            ua.available_until,
            '21:00:00'
          ) AS available_until,

          COALESCE(
            ts.score,
            85
          ) AS trust_score,

          COALESCE(
            ts.reliability_score,
            90
          ) AS reliability_score

        FROM user_skills us

        JOIN profiles p
          ON us.user_id =
             p.user_id

        LEFT JOIN user_availability ua
          ON p.user_id =
             ua.user_id

        LEFT JOIN trust_scores ts
          ON p.user_id =
             ts.user_id

        WHERE
          us.skill_id = ?
          AND us.skill_type = 'SHARE'

        ORDER BY
          COALESCE(
            ua.status,
            'INACTIVE'
          ) = 'ACTIVE' DESC,

          COALESCE(
            ts.score,
            85
          ) DESC,

          p.full_name ASC
      `).all(
        skill.id
      );

    const parsedSharers =
      sharers.map(
        (sharer: any) => ({
          ...sharer,

          languages:
            (() => {
              try {
                return JSON.parse(
                  sharer.languages_json ||
                    '[]'
                );
              } catch {
                return [];
              }
            })()
        })
      );

    // ---------------------------------------------------------
    // QUIZZES FOR THIS SKILL
    // ---------------------------------------------------------

    const quizzes =
      db.prepare(`
        SELECT *
        FROM quizzes
        WHERE skill_id = ?
          AND (
            is_active = 1
            OR is_active IS NULL
          )
        ORDER BY
          created_at DESC
      `).all(
        skill.id
      );

    res.json({
      skill,

      sharers:
        parsedSharers,

      sharers_count:
        parsedSharers.length,

      quizzes
    });
  }
);

// -------------------------------------------------------------
// NATURAL LANGUAGE SEARCH
// -------------------------------------------------------------

apiRouter.post(
  '/search/nl',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    const currentUserId =
      user
        ? user.user_id
        : 'anonymous';

    const {
      query
    } = req.body;

    if (
      !query ||
      typeof query !== 'string' ||
      !query.trim()
    ) {
      res.status(400).json({
        error:
          'Search query is required'
      });
      return;
    }

    const parsed =
      await parseNaturalLanguageSearch(
        query.trim()
      );

    const matches =
      computeMatches({
        learner_id:
          currentUserId,

        skill_name:
          parsed.skill_name,

        level:
          parsed.level,

        language:
          parsed.language,

        time:
          parsed.preferred_time
      });

    res.json({
      parsed_parameters:
        parsed,

      total_results:
        matches.length,

      results:
        matches
    });
  }
);

// -------------------------------------------------------------
// AI MATCHING RECOMMENDATIONS
// -------------------------------------------------------------

apiRouter.get(
  '/matching',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    const currentUserId =
      user
        ? user.user_id
        : 'anonymous';

    const {
      skill_id,
      skill_name,
      level,
      language,
      time
    } = req.query;

    const matches =
      computeMatches({
        learner_id:
          currentUserId,

        skill_id:
          skill_id as string,

        skill_name:
          skill_name as string,

        level:
          level as string,

        language:
          language as string,

        time:
          time as string
      });

    res.json({
      total:
        matches.length,

      matches
    });
  }
);

// -------------------------------------------------------------
// AVAILABILITY
// -------------------------------------------------------------

apiRouter.get(
  '/availability',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const availability =
      db.prepare(`
        SELECT *
        FROM user_availability
        WHERE user_id = ?
      `).get(
        user.user_id
      );

    res.json({
      availability:
        availability || {
          status: 'ACTIVE',
          available_from:
            '18:00:00',
          available_until:
            '21:00:00'
        }
    });
  }
);

// -------------------------------------------------------------
// UPDATE AVAILABILITY
// -------------------------------------------------------------

apiRouter.post(
  '/availability',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const {
      status,
      available_from,
      available_until,
      days_of_week
    } = req.body;

    // IN_CLASS must never be manually assigned.
    if (
      !status ||
      !['ACTIVE', 'INACTIVE'].includes(
        status
      )
    ) {
      res.status(400).json({
        error:
          'Status must be ACTIVE or INACTIVE. IN_CLASS is controlled by the session lifecycle.'
      });
      return;
    }

    const timePattern =
      /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

    if (
      available_from &&
      !timePattern.test(
        available_from
      )
    ) {
      res.status(400).json({
        error:
          'Invalid available_from time.'
      });
      return;
    }

    if (
      available_until &&
      !timePattern.test(
        available_until
      )
    ) {
      res.status(400).json({
        error:
          'Invalid available_until time.'
      });
      return;
    }

    const normalizedDays =
      Array.isArray(days_of_week)
        ? JSON.stringify(
            days_of_week
          )
        : null;

    db.prepare(`
      INSERT INTO user_availability (
        id,
        user_id,
        status,
        available_from,
        available_until,
        days_of_week
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?
      )
      ON CONFLICT(user_id)
      DO UPDATE SET
        status =
          excluded.status,
        available_from =
          excluded.available_from,
        available_until =
          excluded.available_until,
        days_of_week =
          COALESCE(
            excluded.days_of_week,
            user_availability.days_of_week
          ),
        updated_at =
          datetime('now')
    `).run(
      crypto.randomUUID(),
      user.user_id,
      status,
      available_from ||
        '18:00:00',
      available_until ||
        '21:00:00',
      normalizedDays
    );

    const updated =
      db.prepare(`
        SELECT *
        FROM user_availability
        WHERE user_id = ?
      `).get(
        user.user_id
      );

    broadcastEvent(
      'availability_updated',
      {
        user_id:
          user.user_id,

        availability:
          updated
      }
    );

    res.json({
      success: true,
      availability:
        updated
    });
  }
);
// -------------------------------------------------------------
// 4. SESSION HELPERS
// -------------------------------------------------------------

function parseTimeToSeconds(
  value: string
): number {
  const parts = value.split(':').map(Number);

  if (parts.length < 2) {
    return 0;
  }

  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const seconds = parts[2] || 0;

  return (
    hours * 3600 +
    minutes * 60 +
    seconds
  );
}

function calculateSessionEndTime(
  startTime: string,
  durationMinutes: number
): string {
  const startSeconds =
    parseTimeToSeconds(startTime);

  const endSeconds =
    startSeconds +
    durationMinutes * 60;

  const normalized =
    endSeconds % (24 * 3600);

  const hours =
    Math.floor(
      normalized / 3600
    );

  const minutes =
    Math.floor(
      (normalized % 3600) / 60
    );

  const seconds =
    normalized % 60;

  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0')
  ].join(':');
}

function intervalsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart =
    parseTimeToSeconds(startA);

  const aEnd =
    parseTimeToSeconds(endA);

  const bStart =
    parseTimeToSeconds(startB);

  const bEnd =
    parseTimeToSeconds(endB);

  return (
    aStart < bEnd &&
    bStart < aEnd
  );
}

// -------------------------------------------------------------
// CHECK IF USER IS BLOCKED
// -------------------------------------------------------------

function areUsersBlocked(
  userA: string,
  userB: string
): boolean {
  const blocked =
    db.prepare(`
      SELECT id
      FROM blocks
      WHERE
        (
          blocker_id = ?
          AND blocked_id = ?
        )
        OR
        (
          blocker_id = ?
          AND blocked_id = ?
        )
      LIMIT 1
    `).get(
      userA,
      userB,
      userB,
      userA
    );

  return Boolean(blocked);
}

// -------------------------------------------------------------
// SESSION PARTICIPANT CHECK
// -------------------------------------------------------------

function isSessionParticipant(
  session: any,
  userId: string
): boolean {
  return (
    session.learner_id === userId ||
    session.knowledge_sharer_id === userId
  );
}

// -------------------------------------------------------------
// GET SESSION
// -------------------------------------------------------------

function getSessionById(
  sessionId: string
) {
  return db.prepare(`
    SELECT *
    FROM sessions
    WHERE id = ?
  `).get(sessionId) as any;
}

// -------------------------------------------------------------
// SESSION DURATION
// -------------------------------------------------------------

function getVerifiedDurationSeconds(
  session: any
): number {
  if (
    !session.started_at ||
    !session.ended_at
  ) {
    return 0;
  }

  const start =
    new Date(
      session.started_at
    ).getTime();

  const end =
    new Date(
      session.ended_at
    ).getTime();

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start
  ) {
    return 0;
  }

  return Math.floor(
    (end - start) / 1000
  );
}

// -------------------------------------------------------------
// 5. CREATE SESSION REQUEST
// -------------------------------------------------------------

apiRouter.post(
  '/sessions/request',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const {
      knowledge_sharer_id,
      skill_id,
      session_date,
      start_time,
      duration_minutes,
      learning_goal
    } = req.body;

    if (
      !knowledge_sharer_id ||
      !skill_id ||
      !session_date ||
      !start_time ||
      !learning_goal
    ) {
      res.status(400).json({
        error:
          'Knowledge sharer, skill, date, start time and learning goal are required.'
      });
      return;
    }

    const duration =
      Number(
        duration_minutes || 60
      );

    if (
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration > 480
    ) {
      res.status(400).json({
        error:
          'Session duration must be between 1 and 480 minutes.'
      });
      return;
    }

    // ---------------------------------------------------------
    // PREVENT SELF BOOKING
    // ---------------------------------------------------------

    if (
      user.user_id ===
      knowledge_sharer_id
    ) {
      res.status(400).json({
        error:
          'You cannot book a session with yourself.'
      });
      return;
    }

    // ---------------------------------------------------------
    // CHECK TARGET USER
    // ---------------------------------------------------------

    const sharer =
      db.prepare(`
        SELECT *
        FROM profiles
        WHERE user_id = ?
      `).get(
        knowledge_sharer_id
      ) as any;

    if (!sharer) {
      res.status(404).json({
        error:
          'Knowledge sharer not found.'
      });
      return;
    }

    // ---------------------------------------------------------
    // BLOCK CHECK
    // ---------------------------------------------------------

    if (
      areUsersBlocked(
        user.user_id,
        knowledge_sharer_id
      )
    ) {
      res.status(403).json({
        error:
          'You cannot create a session with this user.'
      });
      return;
    }

    // ---------------------------------------------------------
    // SKILL CHECK
    // ---------------------------------------------------------
    //
    // The selected person MUST actually share
    // the selected skill.
    // ---------------------------------------------------------

    const sharedSkill =
      db.prepare(`
        SELECT
          us.*,
          s.name AS skill_name
        FROM user_skills us
        JOIN skills s
          ON us.skill_id = s.id
        WHERE
          us.user_id = ?
          AND us.skill_id = ?
          AND us.skill_type = 'SHARE'
        LIMIT 1
      `).get(
        knowledge_sharer_id,
        skill_id
      ) as any;

    if (!sharedSkill) {
      res.status(400).json({
        error:
          'This user does not share the selected skill.'
      });
      return;
    }

    // ---------------------------------------------------------
    // SKILL EXISTS
    // ---------------------------------------------------------

    const skill =
      db.prepare(`
        SELECT *
        FROM skills
        WHERE
          id = ?
          AND is_active = 1
      `).get(
        skill_id
      ) as any;

    if (!skill) {
      res.status(404).json({
        error:
          'Skill not found.'
      });
      return;
    }

    // ---------------------------------------------------------
    // DATE VALIDATION
    // ---------------------------------------------------------

    const datePattern =
      /^\d{4}-\d{2}-\d{2}$/;

    const timePattern =
      /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

    if (
      !datePattern.test(
        String(session_date)
      )
    ) {
      res.status(400).json({
        error:
          'Session date must use YYYY-MM-DD format.'
      });
      return;
    }

    if (
      !timePattern.test(
        String(start_time)
      )
    ) {
      res.status(400).json({
        error:
          'Start time must use HH:MM or HH:MM:SS format.'
      });
      return;
    }

    const normalizedStartTime =
      String(start_time).length === 5
        ? `${start_time}:00`
        : String(start_time);

    const endTime =
      calculateSessionEndTime(
        normalizedStartTime,
        duration
      );

    // ---------------------------------------------------------
    // CHECK DUPLICATE / OVERLAPPING SESSION
    // ---------------------------------------------------------

    const existingSessions =
      db.prepare(`
        SELECT
          *
        FROM sessions
        WHERE
          session_date = ?
          AND status IN (
            'REQUESTED',
            'ACCEPTED',
            'IN_PROGRESS'
          )
          AND (
            learner_id IN (?, ?)
            OR knowledge_sharer_id IN (?, ?)
          )
      `).all(
        session_date,
        user.user_id,
        knowledge_sharer_id,
        user.user_id,
        knowledge_sharer_id
      ) as any[];

    const overlapping =
      existingSessions.find(
        (existing: any) => {
          const existingStart =
            existing.start_time;

          const existingDuration =
            Number(
              existing.duration_minutes ||
              60
            );

          const existingEnd =
            calculateSessionEndTime(
              existingStart,
              existingDuration
            );

          return intervalsOverlap(
            normalizedStartTime,
            endTime,
            existingStart,
            existingEnd
          );
        }
      );

    if (overlapping) {
      res.status(409).json({
        error:
          'This time overlaps with an existing session for one of the participants.'
      });
      return;
    }

    // ---------------------------------------------------------
    // SESSION CREATION
    // ---------------------------------------------------------

    const sessionId =
      crypto.randomUUID();

    const roomId =
      `learnx-session-${sessionId}`;

    const createdAt =
      new Date().toISOString();

    try {
      db.exec(
        'BEGIN IMMEDIATE'
      );

      db.prepare(`
        INSERT INTO sessions (
          id,
          learner_id,
          knowledge_sharer_id,
          skill_id,
          session_date,
          start_time,
          duration_minutes,
          learning_goal,
          status,
          session_stage,
          room_id,
          meeting_provider,
          learner_confirmed,
          sharer_confirmed,
          created_at,
          updated_at
        )
        VALUES (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          'REQUESTED',
          'REQUESTED',
          ?,
          'BUILTIN',
          0,
          0,
          ?,
          ?
        )
      `).run(
        sessionId,
        user.user_id,
        knowledge_sharer_id,
        skill_id,
        session_date,
        normalizedStartTime,
        duration,
        String(
          learning_goal
        ).trim(),
        roomId,
        createdAt,
        createdAt
      );

      db.prepare(`
        INSERT INTO notifications (
          id,
          user_id,
          title,
          message,
          type,
          link
        )
        VALUES (
          ?,
          ?,
          ?,
          ?,
          'SESSION_REQUEST',
          ?
        )
      `).run(
        crypto.randomUUID(),
        knowledge_sharer_id,
        'New Session Request',
        `${user.full_name} requested a ${skill.name} learning session.`,
        `/sessions/${sessionId}`
      );

      db.exec('COMMIT');
    } catch (err: any) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // Ignore.
      }

      res.status(500).json({
        error:
          err.message ||
          'Unable to create session.'
      });
      return;
    }

    broadcastEvent(
      'session_requested',
      {
        session_id:
          sessionId,

        learner_id:
          user.user_id,

        knowledge_sharer_id,

        skill_id,

        session_date,

        start_time:
          normalizedStartTime
      }
    );

    res.status(201).json({
      success: true,

      session_id:
        sessionId,

      room_id:
        roomId,

      meeting_provider:
        'BUILTIN',

      status:
        'REQUESTED'
    });
  }
);

// -------------------------------------------------------------
// GET MY SESSIONS
// -------------------------------------------------------------

apiRouter.get(
  '/sessions',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const {
      status,
      role
    } = req.query;

    let query = `
      SELECT
        s.*,

        learner.full_name
          AS learner_name,

        sharer.full_name
          AS sharer_name,

        sk.name
          AS skill_name

      FROM sessions s

      JOIN profiles learner
        ON learner.user_id =
           s.learner_id

      JOIN profiles sharer
        ON sharer.user_id =
           s.knowledge_sharer_id

      JOIN skills sk
        ON sk.id =
           s.skill_id

      WHERE
        (
          s.learner_id = ?
          OR
          s.knowledge_sharer_id = ?
        )
    `;

    const params: any[] = [
      user.user_id,
      user.user_id
    ];

    if (
      typeof status === 'string' &&
      status.trim()
    ) {
      query += `
        AND s.status = ?
      `;

      params.push(
        status.trim()
      );
    }

    if (role === 'learner') {
      query += `
        AND s.learner_id = ?
      `;

      params.push(
        user.user_id
      );
    }

    if (
      role === 'sharer' ||
      role === 'mentor'
    ) {
      query += `
        AND s.knowledge_sharer_id = ?
      `;

      params.push(
        user.user_id
      );
    }

    query += `
      ORDER BY
        s.session_date DESC,
        s.start_time DESC,
        s.created_at DESC
    `;

    const sessions =
      db.prepare(query)
        .all(...params);

    res.json({
      sessions
    });
  }
);

// -------------------------------------------------------------
// GET SINGLE SESSION
// -------------------------------------------------------------

apiRouter.get(
  '/sessions/:id',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const session =
      db.prepare(`
        SELECT
          s.*,

          learner.full_name
            AS learner_name,

          learner.profile_photo
            AS learner_photo,

          sharer.full_name
            AS sharer_name,

          sharer.profile_photo
            AS sharer_photo,

          sk.name
            AS skill_name,

          sk.category
            AS skill_category

        FROM sessions s

        JOIN profiles learner
          ON learner.user_id =
             s.learner_id

        JOIN profiles sharer
          ON sharer.user_id =
             s.knowledge_sharer_id

        JOIN skills sk
          ON sk.id =
             s.skill_id

        WHERE s.id = ?
      `).get(
        req.params.id
      ) as any;

    if (!session) {
      res.status(404).json({
        error:
          'Session not found.'
      });
      return;
    }

    if (
      !isSessionParticipant(
        session,
        user.user_id
      )
    ) {
      res.status(403).json({
        error:
          'You are not a participant in this session.'
      });
      return;
    }

    res.json({
      session
    });
  }
);

// -------------------------------------------------------------
// ACCEPT SESSION
// -------------------------------------------------------------

apiRouter.post(
  '/sessions/:id/accept',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const session =
      getSessionById(
        req.params.id
      );

    if (!session) {
      res.status(404).json({
        error:
          'Session not found.'
      });
      return;
    }

    if (
      session.knowledge_sharer_id !==
      user.user_id
    ) {
      res.status(403).json({
        error:
          'Only the knowledge sharer can accept this request.'
      });
      return;
    }

    // ---------------------------------------------------------
    // ONLY REQUESTED CAN BE ACCEPTED
    // ---------------------------------------------------------

    if (
      session.status !==
      'REQUESTED'
    ) {
      res.status(409).json({
        error:
          `This session cannot be accepted because its current status is ${session.status}.`
      });
      return;
    }

    const updatedAt =
      new Date().toISOString();

    db.prepare(`
      UPDATE sessions
      SET
        status = 'ACCEPTED',
        session_stage = 'SCHEDULED',
        updated_at = ?
      WHERE
        id = ?
        AND status = 'REQUESTED'
    `).run(
      updatedAt,
      session.id
    );

    db.prepare(`
      INSERT INTO notifications (
        id,
        user_id,
        title,
        message,
        type,
        link
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        'SESSION_ACCEPTED',
        ?
      )
    `).run(
      crypto.randomUUID(),
      session.learner_id,
      'Session Accepted',
      'Your knowledge-sharing session request has been accepted.',
      `/sessions/${session.id}`
    );

    broadcastEvent(
      'session_accepted',
      {
        session_id:
          session.id,

        learner_id:
          session.learner_id,

        knowledge_sharer_id:
          session.knowledge_sharer_id
      }
    );

    res.json({
      success: true,
      status: 'ACCEPTED'
    });
  }
);

// -------------------------------------------------------------
// REJECT SESSION
// -------------------------------------------------------------

apiRouter.post(
  '/sessions/:id/reject',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const session =
      getSessionById(
        req.params.id
      );

    if (!session) {
      res.status(404).json({
        error:
          'Session not found.'
      });
      return;
    }

    if (
      session.knowledge_sharer_id !==
      user.user_id
    ) {
      res.status(403).json({
        error:
          'Only the knowledge sharer can reject this request.'
      });
      return;
    }

    if (
      session.status !==
      'REQUESTED'
    ) {
      res.status(409).json({
        error:
          `This session cannot be rejected because its current status is ${session.status}.`
      });
      return;
    }

    db.prepare(`
      UPDATE sessions
      SET
        status = 'REJECTED',
        session_stage = 'REJECTED',
        updated_at = ?
      WHERE
        id = ?
        AND status = 'REQUESTED'
    `).run(
      new Date().toISOString(),
      session.id
    );

    db.prepare(`
      INSERT INTO notifications (
        id,
        user_id,
        title,
        message,
        type,
        link
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        'SESSION_REJECTED',
        ?
      )
    `).run(
      crypto.randomUUID(),
      session.learner_id,
      'Session Request Declined',
      'Your knowledge-sharing session request was declined.',
      `/sessions/${session.id}`
    );

    broadcastEvent(
      'session_rejected',
      {
        session_id:
          session.id,

        learner_id:
          session.learner_id,

        knowledge_sharer_id:
          session.knowledge_sharer_id
      }
    );

    res.json({
      success: true,
      status: 'REJECTED'
    });
  }
);

// -------------------------------------------------------------
// CANCEL SESSION
// -------------------------------------------------------------

apiRouter.post(
  '/sessions/:id/cancel',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const session =
      getSessionById(
        req.params.id
      );

    if (!session) {
      res.status(404).json({
        error:
          'Session not found.'
      });
      return;
    }

    if (
      !isSessionParticipant(
        session,
        user.user_id
      )
    ) {
      res.status(403).json({
        error:
          'You are not a participant in this session.'
      });
      return;
    }

    if (
      ![
        'REQUESTED',
        'ACCEPTED'
      ].includes(
        session.status
      )
    ) {
      res.status(409).json({
        error:
          `This session cannot be cancelled from status ${session.status}.`
      });
      return;
    }

    const otherUserId =
      session.learner_id ===
      user.user_id
        ? session.knowledge_sharer_id
        : session.learner_id;

    db.prepare(`
      UPDATE sessions
      SET
        status = 'CANCELLED',
        session_stage = 'CANCELLED',
        cancelled_by = ?,
        cancelled_at = ?,
        updated_at = ?
      WHERE
        id = ?
        AND status IN (
          'REQUESTED',
          'ACCEPTED'
        )
    `).run(
      user.user_id,
      new Date().toISOString(),
      new Date().toISOString(),
      session.id
    );

    db.prepare(`
      INSERT INTO notifications (
        id,
        user_id,
        title,
        message,
        type,
        link
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        'SESSION_CANCELLED',
        ?
      )
    `).run(
      crypto.randomUUID(),
      otherUserId,
      'Session Cancelled',
      'A scheduled LearnX session has been cancelled.',
      `/sessions/${session.id}`
    );

    broadcastEvent(
      'session_cancelled',
      {
        session_id:
          session.id,

        cancelled_by:
          user.user_id
      }
    );

    res.json({
      success: true,
      status:
        'CANCELLED'
    });
  }
);

// -------------------------------------------------------------
// JOIN SESSION
// -------------------------------------------------------------

apiRouter.post(
  '/sessions/:id/join',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const session =
      getSessionById(
        req.params.id
      );

    if (!session) {
      res.status(404).json({
        error:
          'Session not found.'
      });
      return;
    }

    if (
      !isSessionParticipant(
        session,
        user.user_id
      )
    ) {
      res.status(403).json({
        error:
          'You are not a participant in this session.'
      });
      return;
    }

    if (
      ![
        'ACCEPTED',
        'IN_PROGRESS'
      ].includes(
        session.status
      )
    ) {
      res.status(409).json({
        error:
          'The session is not available for joining.'
      });
      return;
    }

    if (session.ended_at) {
      res.status(409).json({
        error:
          'This session has already ended.'
      });
      return;
    }

    const roomName =
      session.room_id ||
      `learnx-session-${session.id}`;

    // ---------------------------------------------------------
    // LIVEKIT TOKEN
    // ---------------------------------------------------------

let token: string;

try {
  token = await createLiveKitToken(
    user.user_id
  );
} catch (err: any) {
  res.status(503).json({
    error: err?.message || 'Unable to create LiveKit token.'
  });
  return;
}
    res.json({
      success: true,

      token,

      room_name:
        roomName,

      livekit_url:
        LIVEKIT_URL,

      session_id:
        session.id
    });
  }
);

// -------------------------------------------------------------
// SESSION CONNECTED
// -------------------------------------------------------------

apiRouter.post(
  '/sessions/:id/connected',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const session =
      getSessionById(
        req.params.id
      );

    if (!session) {
      res.status(404).json({
        error:
          'Session not found.'
      });
      return;
    }

    if (
      !isSessionParticipant(
        session,
        user.user_id
      )
    ) {
      res.status(403).json({
        error:
          'You are not a participant in this session.'
      });
      return;
    }

    if (
      ![
        'ACCEPTED',
        'IN_PROGRESS'
      ].includes(
        session.status
      )
    ) {
      res.status(409).json({
        error:
          'This session cannot be connected.'
      });
      return;
    }

    const now =
      new Date().toISOString();

    if (
      session.learner_id ===
      user.user_id
    ) {
      db.prepare(`
        UPDATE sessions
        SET
          learner_joined_at = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        now,
        now,
        session.id
      );
    } else {
      db.prepare(`
        UPDATE sessions
        SET
          sharer_joined_at = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        now,
        now,
        session.id
      );
    }

    const refreshed =
      getSessionById(
        session.id
      );

    // ---------------------------------------------------------
    // BOTH PARTICIPANTS CONNECTED
    // ---------------------------------------------------------

    if (
      refreshed?.learner_joined_at &&
      refreshed?.sharer_joined_at &&
      refreshed.status !==
        'IN_PROGRESS'
    ) {
      db.prepare(`
        UPDATE sessions
        SET
          status = 'IN_PROGRESS',
          session_stage = 'STARTED',
          started_at = COALESCE(
            started_at,
            ?
          ),
          updated_at = ?
        WHERE
          id = ?
          AND status = 'ACCEPTED'
      `).run(
        now,
        now,
        session.id
      );

      // -------------------------------------------------------
      // KNOWLEDGE SHARER IS NOW IN CLASS
      // -------------------------------------------------------

      db.prepare(`
        UPDATE user_availability
        SET
          status = 'IN_CLASS',
          updated_at = ?
        WHERE
          user_id = ?
      `).run(
        now,
        session.knowledge_sharer_id
      );

      broadcastEvent(
        'session_started',
        {
          session_id:
            session.id
        }
      );
    }

    res.json({
      success: true,
      session:
        getSessionById(
          session.id
        )
    });
  }
);

// -------------------------------------------------------------
// END SESSION
// -------------------------------------------------------------

apiRouter.post(
  '/sessions/:id/end',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const session =
      getSessionById(
        req.params.id
      );

    if (!session) {
      res.status(404).json({
        error:
          'Session not found.'
      });
      return;
    }

    if (
      !isSessionParticipant(
        session,
        user.user_id
      )
    ) {
      res.status(403).json({
        error:
          'You are not a participant in this session.'
      });
      return;
    }

    if (
      session.status !==
      'IN_PROGRESS'
    ) {
      res.status(409).json({
        error:
          'Only an in-progress session can be ended.'
      });
      return;
    }

    const endedAt =
      new Date().toISOString();

    db.prepare(`
      UPDATE sessions
      SET
        ended_at = ?,
        session_stage = 'COMPLETED',
        status = 'COMPLETED',
        updated_at = ?
      WHERE
        id = ?
        AND status = 'IN_PROGRESS'
        AND ended_at IS NULL
    `).run(
      endedAt,
      endedAt,
      session.id
    );

    // ---------------------------------------------------------
    // KNOWLEDGE SHARER BECOMES ACTIVE AGAIN
    // ---------------------------------------------------------

    db.prepare(`
      UPDATE user_availability
      SET
        status = 'ACTIVE',
        updated_at = ?
      WHERE
        user_id = ?
        AND status = 'IN_CLASS'
    `).run(
      endedAt,
      session.knowledge_sharer_id
    );

    broadcastEvent(
      'session_ended',
      {
        session_id:
          session.id,

        ended_by:
          user.user_id
      }
    );

    res.json({
      success: true,

      status:
        'COMPLETED',

      ended_at:
        endedAt
    });
  }
);

// -------------------------------------------------------------
// CONFIRM SESSION COMPLETION
// -------------------------------------------------------------

apiRouter.post(
  '/sessions/:id/confirm-completion',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const session =
      getSessionById(
        req.params.id
      );

    if (!session) {
      res.status(404).json({
        error:
          'Session not found.'
      });
      return;
    }

    if (
      !isSessionParticipant(
        session,
        user.user_id
      )
    ) {
      res.status(403).json({
        error:
          'You are not a participant in this session.'
      });
      return;
    }

    if (
      ![
        'COMPLETED',
        'VERIFIED'
      ].includes(
        session.status
      )
    ) {
      res.status(409).json({
        error:
          'The session must be completed before confirmation.'
      });
      return;
    }

    // ---------------------------------------------------------
    // TRANSACTION
    // ---------------------------------------------------------

    try {
      db.exec(
        'BEGIN IMMEDIATE'
      );

      const current =
        getSessionById(
          session.id
        );

      if (!current) {
        throw new Error(
          'Session no longer exists.'
        );
      }

      // -------------------------------------------------------
      // CONFIRM PARTICIPANT
      // -------------------------------------------------------

      if (
        current.learner_id ===
        user.user_id
      ) {
        db.prepare(`
          UPDATE sessions
          SET
            learner_confirmed = 1,
            updated_at = ?
          WHERE id = ?
        `).run(
          new Date().toISOString(),
          current.id
        );
      } else {
        db.prepare(`
          UPDATE sessions
          SET
            sharer_confirmed = 1,
            updated_at = ?
          WHERE id = ?
        `).run(
          new Date().toISOString(),
          current.id
        );
      }

      const refreshed =
        getSessionById(
          current.id
        );

      if (!refreshed) {
        throw new Error(
          'Unable to reload session.'
        );
      }

      // -------------------------------------------------------
      // BOTH CONFIRMED
      // -------------------------------------------------------

      if (
        Number(
          refreshed.learner_confirmed
        ) === 1 &&
        Number(
          refreshed.sharer_confirmed
        ) === 1
      ) {
        const durationSeconds =
          getVerifiedDurationSeconds(
            refreshed
          );

        const credits =
          Math.round(
            (
              durationSeconds /
              3600
            ) * 100
          ) / 100;

        // -----------------------------------------------------
        // PREVENT ZERO-CREDIT FAKE COMPLETIONS
        // -----------------------------------------------------

        if (
          credits <= 0
        ) {
          throw new Error(
            'Verified session duration must be greater than zero.'
          );
        }

        // -----------------------------------------------------
        // VERIFY SESSION
        // -----------------------------------------------------

        db.prepare(`
          UPDATE sessions
          SET
            status = 'VERIFIED',
            session_stage = 'VERIFIED',
            verified_at = ?,
            verified_duration_seconds = ?,
            credits_awarded = ?,
            updated_at = ?
          WHERE
            id = ?
            AND status != 'VERIFIED'
        `).run(
          new Date().toISOString(),
          durationSeconds,
          credits,
          new Date().toISOString(),
          refreshed.id
        );

        // -----------------------------------------------------
        // CREDIT TRANSACTION
        //
        // Unique session reference prevents duplicate credit.
        // -----------------------------------------------------

        const existingCredit =
          db.prepare(`
            SELECT id
            FROM credit_transactions
            WHERE
              user_id = ?
              AND reference_id = ?
              AND transaction_type =
                'SESSION_EARNED'
            LIMIT 1
          `).get(
            refreshed.knowledge_sharer_id,
            refreshed.id
          );

        if (!existingCredit) {
          db.prepare(`
            INSERT INTO credit_transactions (
              id,
              user_id,
              amount,
              transaction_type,
              status,
              description,
              reference_id
            )
            VALUES (
              ?,
              ?,
              ?,
              'SESSION_EARNED',
              'COMPLETED',
              ?,
              ?
            )
          `).run(
            crypto.randomUUID(),
            refreshed.knowledge_sharer_id,
            credits,
            `Earned ${credits} Time Credits for verified knowledge sharing session.`,
            refreshed.id
          );

          db.prepare(`
            UPDATE time_credit_accounts
            SET
              balance =
                balance + ?,

              total_earned =
                total_earned + ?,

              updated_at = ?

            WHERE user_id = ?
          `).run(
            credits,
            credits,
            new Date().toISOString(),
            refreshed.knowledge_sharer_id
          );
        }

        // -----------------------------------------------------
        // LEARNER PROGRESS
        // -----------------------------------------------------

        const currentProgress =
          db.prepare(`
            SELECT *
            FROM learning_progress
            WHERE
              user_id = ?
              AND skill_id = ?
          `).get(
            refreshed.learner_id,
            refreshed.skill_id
          ) as any;

        if (currentProgress) {
          const currentPercentage =
            Number(
              currentProgress.progress_percentage ||
              0
            );

          const hours =
            durationSeconds /
            3600;

          const newPercentage =
            Math.min(
              100,
              Math.round(
                (
                  currentPercentage +
                  hours * 5
                ) * 100
              ) / 100
            );

          db.prepare(`
            UPDATE learning_progress
            SET
              progress_percentage = ?,
              learning_hours =
                COALESCE(
                  learning_hours,
                  0
                ) + ?,
              updated_at = ?
            WHERE
              user_id = ?
              AND skill_id = ?
          `).run(
            newPercentage,
            hours,
            new Date().toISOString(),
            refreshed.learner_id,
            refreshed.skill_id
          );
        } else {
          db.prepare(`
            INSERT INTO learning_progress (
              id,
              user_id,
              skill_id,
              progress_percentage,
              learning_hours
            )
            VALUES (
              ?,
              ?,
              ?,
              ?,
              ?
            )
          `).run(
            crypto.randomUUID(),
            refreshed.learner_id,
            refreshed.skill_id,
            Math.min(
              100,
              Math.round(
                (
                  durationSeconds /
                  3600 *
                  5
                ) * 100
              ) / 100
            ),
            durationSeconds /
              3600
          );
        }

        // -----------------------------------------------------
        // SHARER ACTIVE
        // -----------------------------------------------------

        db.prepare(`
          UPDATE user_availability
          SET
            status = 'ACTIVE',
            updated_at = ?
          WHERE
            user_id = ?
        `).run(
          new Date().toISOString(),
          refreshed.knowledge_sharer_id
        );

        // -----------------------------------------------------
        // CREDIT EARNED NOTIFICATION
        // -----------------------------------------------------

        db.prepare(`
          INSERT INTO notifications (
            id,
            user_id,
            title,
            message,
            type,
            link
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            'CREDIT_EARNED',
            '/time-wallet'
          )
        `).run(
          crypto.randomUUID(),
          refreshed.knowledge_sharer_id,
          'Time Credits Awarded',
          `You earned ${credits} Time Credits for sharing your knowledge.`
        );

        // -----------------------------------------------------
        // LEARNER COMPLETION NOTIFICATION
        // -----------------------------------------------------

        db.prepare(`
          INSERT INTO notifications (
            id,
            user_id,
            title,
            message,
            type,
            link
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            'SESSION_COMPLETED',
            ?
          )
        `).run(
          crypto.randomUUID(),
          refreshed.learner_id,
          'Learning Session Completed',
          `Your ${credits}-hour learning session has been verified.`,
          `/sessions/${refreshed.id}`
        );

        // -----------------------------------------------------
        // AUDIT
        // -----------------------------------------------------

        db.prepare(`
          INSERT INTO audit_logs (
            id,
            actor_id,
            action,
            target_type,
            target_id,
            details_json
          )
          VALUES (
            ?,
            ?,
            'SESSION_VERIFIED',
            'SESSION',
            ?,
            ?
          )
        `).run(
          crypto.randomUUID(),
          user.user_id,
          refreshed.id,
          JSON.stringify({
            duration_seconds:
              durationSeconds,

            credits_awarded:
              credits
          })
        );

        db.exec('COMMIT');

        broadcastEvent(
          'session_verified',
          {
            session_id:
              refreshed.id,

            learner_id:
              refreshed.learner_id,

            knowledge_sharer_id:
              refreshed.knowledge_sharer_id,

            credits_awarded:
              credits,

            duration_seconds:
              durationSeconds
          }
        );

        res.json({
          success: true,

          verified: true,

          credits_awarded:
            credits,

          duration_seconds:
            durationSeconds,

          status:
            'VERIFIED'
        });

        return;
      }

      db.exec('COMMIT');

      res.json({
        success: true,

        verified: false,

        message:
          'Your completion confirmation was recorded. Waiting for the other participant.',
      });
    } catch (err: any) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // Ignore rollback errors.
      }

      res.status(500).json({
        error:
          err?.message ||
          'Unable to confirm session completion.'
      });
    }
  }
);

// -------------------------------------------------------------
// SESSION CHAT
// -------------------------------------------------------------

apiRouter.get(
  '/sessions/:id/chat',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const session =
      getSessionById(
        req.params.id
      );

    if (!session) {
      res.status(404).json({
        error:
          'Session not found.'
      });
      return;
    }

    if (
      !isSessionParticipant(
        session,
        user.user_id
      )
    ) {
      res.status(403).json({
        error:
          'You are not a participant in this session.'
      });
      return;
    }

    const messages =
      db.prepare(`
        SELECT
          sc.*,
          p.full_name AS sender_name,
          p.profile_photo AS sender_photo
        FROM session_chat sc
        JOIN profiles p
          ON p.user_id =
             sc.sender_id
        WHERE
          sc.session_id = ?
        ORDER BY
          sc.created_at ASC
      `).all(
        session.id
      );

    res.json({
      messages
    });
  }
);

// -------------------------------------------------------------
// SEND SESSION CHAT MESSAGE
// -------------------------------------------------------------

apiRouter.post(
  '/sessions/:id/chat',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const session =
      getSessionById(
        req.params.id
      );

    if (!session) {
      res.status(404).json({
        error:
          'Session not found.'
      });
      return;
    }

    if (
      !isSessionParticipant(
        session,
        user.user_id
      )
    ) {
      res.status(403).json({
        error:
          'You are not a participant in this session.'
      });
      return;
    }

    const {
      message
    } = req.body;

    if (
      typeof message !== 'string' ||
      !message.trim()
    ) {
      res.status(400).json({
        error:
          'Message cannot be empty.'
      });
      return;
    }

    if (
      message.length >
      5000
    ) {
      res.status(400).json({
        error:
          'Message is too long.'
      });
      return;
    }

    const messageId =
      crypto.randomUUID();

    db.prepare(`
      INSERT INTO session_chat (
        id,
        session_id,
        sender_id,
        message
      )
      VALUES (
        ?,
        ?,
        ?,
        ?
      )
    `).run(
      messageId,
      session.id,
      user.user_id,
      message.trim()
    );

    const saved =
      db.prepare(`
        SELECT
          sc.*,
          p.full_name AS sender_name,
          p.profile_photo AS sender_photo
        FROM session_chat sc
        JOIN profiles p
          ON p.user_id =
             sc.sender_id
        WHERE sc.id = ?
      `).get(
        messageId
      );

    broadcastEvent(
      'session_chat',
      {
        session_id:
          session.id,

        message:
          saved
      }
    );

    res.status(201).json({
      success: true,
      message:
        saved
    });
  }
);

// -------------------------------------------------------------
// SESSION NOTES
// -------------------------------------------------------------

apiRouter.get(
  '/sessions/:id/notes',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const session =
      getSessionById(
        req.params.id
      );

    if (!session) {
      res.status(404).json({
        error:
          'Session not found.'
      });
      return;
    }

    if (
      !isSessionParticipant(
        session,
        user.user_id
      )
    ) {
      res.status(403).json({
        error:
          'You are not a participant in this session.'
      });
      return;
    }

    const notes =
      db.prepare(`
        SELECT *
        FROM session_notes
        WHERE
          session_id = ?
          AND user_id = ?
        ORDER BY
          updated_at DESC
      `).all(
        session.id,
        user.user_id
      );

    res.json({
      notes
    });
  }
);

// -------------------------------------------------------------
// SAVE SESSION NOTES
// -------------------------------------------------------------

apiRouter.put(
  '/sessions/:id/notes',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const session =
      getSessionById(
        req.params.id
      );

    if (!session) {
      res.status(404).json({
        error:
          'Session not found.'
      });
      return;
    }

    if (
      !isSessionParticipant(
        session,
        user.user_id
      )
    ) {
      res.status(403).json({
        error:
          'You are not a participant in this session.'
      });
      return;
    }

    const {
      note
    } = req.body;

    if (
      typeof note !== 'string'
    ) {
      res.status(400).json({
        error:
          'Note must be text.'
      });
      return;
    }

    if (
      note.length >
      20000
    ) {
      res.status(400).json({
        error:
          'Note is too long.'
      });
      return;
    }

    const existing =
      db.prepare(`
        SELECT id
        FROM session_notes
        WHERE
          session_id = ?
          AND user_id = ?
        LIMIT 1
      `).get(
        session.id,
        user.user_id
      ) as any;

    const now =
      new Date().toISOString();

    if (existing) {
      db.prepare(`
        UPDATE session_notes
        SET
          note = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        note,
        now,
        existing.id
      );
    } else {
      db.prepare(`
        INSERT INTO session_notes (
          id,
          session_id,
          user_id,
          note,
          created_at,
          updated_at
        )
        VALUES (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?
        )
      `).run(
        crypto.randomUUID(),
        session.id,
        user.user_id,
        note,
        now,
        now
      );
    }

    const saved =
      db.prepare(`
        SELECT *
        FROM session_notes
        WHERE
          session_id = ?
          AND user_id = ?
      `).get(
        session.id,
        user.user_id
      );

    res.json({
      success: true,
      note:
        saved
    });
  }
);
// -------------------------------------------------------------
// 6. TIME CREDIT WALLET
// -------------------------------------------------------------

apiRouter.get(
  '/time-wallet',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    // ---------------------------------------------------------
    // ENSURE WALLET EXISTS
    // ---------------------------------------------------------

    db.prepare(`
      INSERT OR IGNORE INTO time_credit_accounts (
        id,
        user_id,
        balance,
        total_earned,
        total_spent
      )
      VALUES (
        ?,
        ?,
        0,
        0,
        0
      )
    `).run(
      `tc-${user.user_id}`,
      user.user_id
    );

    const wallet =
      db.prepare(`
        SELECT *
        FROM time_credit_accounts
        WHERE user_id = ?
      `).get(
        user.user_id
      ) as any;

    const transactions =
      db.prepare(`
        SELECT *
        FROM credit_transactions
        WHERE user_id = ?
        ORDER BY
          created_at DESC
      `).all(
        user.user_id
      );

    res.json({
      wallet: {
        balance:
          Number(
            wallet?.balance ?? 0
          ),

        total_earned:
          Number(
            wallet?.total_earned ?? 0
          ),

        total_spent:
          Number(
            wallet?.total_spent ?? 0
          )
      },

      transactions
    });
  }
);

// -------------------------------------------------------------
// WALLET TRANSACTIONS
// -------------------------------------------------------------

apiRouter.get(
  '/time-wallet/transactions',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const transactions =
      db.prepare(`
        SELECT *
        FROM credit_transactions
        WHERE user_id = ?
        ORDER BY
          created_at DESC
      `).all(
        user.user_id
      );

    res.json({
      transactions
    });
  }
);

// -------------------------------------------------------------
// 7. RATINGS
// -------------------------------------------------------------

apiRouter.post(
  '/ratings',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const {
      session_id,
      overall_score,
      communication_score,
      knowledge_score,
      punctuality_score,
      comment
    } = req.body;

    if (
      !session_id ||
      overall_score == null
    ) {
      res.status(400).json({
        error:
          'Session ID and overall score are required.'
      });
      return;
    }

    const scores = [
      overall_score,
      communication_score,
      knowledge_score,
      punctuality_score
    ].filter(
      (value) =>
        value !== undefined &&
        value !== null
    );

    for (
      const score of scores
    ) {
      if (
        !Number.isFinite(
          Number(score)
        ) ||
        Number(score) < 1 ||
        Number(score) > 5
      ) {
        res.status(400).json({
          error:
            'Rating scores must be between 1 and 5.'
        });
        return;
      }
    }

    const session =
      getSessionById(
        session_id
      );

    if (!session) {
      res.status(404).json({
        error:
          'Session not found.'
      });
      return;
    }

    if (
      !isSessionParticipant(
        session,
        user.user_id
      )
    ) {
      res.status(403).json({
        error:
          'You cannot rate this session.'
      });
      return;
    }

    if (
      session.status !==
        'VERIFIED' &&
      session.status !==
        'COMPLETED'
    ) {
      res.status(409).json({
        error:
          'Ratings can only be submitted after session completion.'
      });
      return;
    }

    const rateeId =
      session.learner_id ===
      user.user_id
        ? session.knowledge_sharer_id
        : session.learner_id;

    if (
      rateeId ===
      user.user_id
    ) {
      res.status(400).json({
        error:
          'You cannot rate yourself.'
      });
      return;
    }

    // ---------------------------------------------------------
    // PREVENT DUPLICATE RATING
    // ---------------------------------------------------------

    const existing =
      db.prepare(`
        SELECT id
        FROM ratings
        WHERE
          session_id = ?
          AND rater_id = ?
        LIMIT 1
      `).get(
        session_id,
        user.user_id
      );

    if (existing) {
      res.status(409).json({
        error:
          'You have already rated this session.'
      });
      return;
    }

    const ratingId =
      crypto.randomUUID();

    try {
      db.exec(
        'BEGIN IMMEDIATE'
      );

      db.prepare(`
        INSERT INTO ratings (
          id,
          session_id,
          rater_id,
          ratee_id,
          overall_score,
          communication_score,
          knowledge_score,
          punctuality_score,
          comment
        )
        VALUES (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?
        )
      `).run(
        ratingId,
        session_id,
        user.user_id,
        rateeId,
        Number(
          overall_score
        ),
        communication_score != null
          ? Number(
              communication_score
            )
          : null,
        knowledge_score != null
          ? Number(
              knowledge_score
            )
          : null,
        punctuality_score != null
          ? Number(
              punctuality_score
            )
          : null,
        typeof comment === 'string'
          ? comment.trim()
          : ''
      );

      // -------------------------------------------------------
      // UPDATE TRUST SCORE FROM REAL RATINGS
      // -------------------------------------------------------

      const ratingAverage =
        db.prepare(`
          SELECT
            AVG(overall_score) AS avg,
            COUNT(*) AS count
          FROM ratings
          WHERE ratee_id = ?
        `).get(
          rateeId
        ) as any;

      const average =
        Number(
          ratingAverage?.avg ?? 0
        );

      const trustScore =
        average > 0
          ? Math.round(
              average * 20
            )
          : 85;

      const reliability =
        Math.min(
          100,
          Math.round(
            80 +
            (
              Number(
                ratingAverage?.count ?? 0
              ) > 0
                ? average * 4
                : 5
            )
          )
        );

      db.prepare(`
        INSERT INTO trust_scores (
          id,
          user_id,
          score,
          reliability_score,
          verification_level,
          updated_at
        )
        VALUES (
          ?,
          ?,
          ?,
          ?,
          'COMMUNITY_VERIFIED',
          ?
        )
        ON CONFLICT(user_id)
        DO UPDATE SET
          score =
            excluded.score,
          reliability_score =
            excluded.reliability_score,
          updated_at =
            excluded.updated_at
      `).run(
        `ts-${rateeId}`,
        rateeId,
        trustScore,
        reliability,
        new Date().toISOString()
      );

      // -------------------------------------------------------
      // NOTIFICATION
      // -------------------------------------------------------

      db.prepare(`
        INSERT INTO notifications (
          id,
          user_id,
          title,
          message,
          type,
          link
        )
        VALUES (
          ?,
          ?,
          ?,
          ?,
          'RATING_RECEIVED',
          ?
        )
      `).run(
        crypto.randomUUID(),
        rateeId,
        'New Rating Received',
        `You received a ${overall_score}/5 rating for your LearnX session.`,
        `/profile/${rateeId}`
      );

      db.exec('COMMIT');
    } catch (err: any) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // Ignore rollback error.
      }

      res.status(500).json({
        error:
          err?.message ||
          'Unable to submit rating.'
      });
      return;
    }

    res.status(201).json({
      success: true,

      rating_id:
        ratingId
    });
  }
);

// -------------------------------------------------------------
// RECEIVED AND GIVEN RATINGS
// -------------------------------------------------------------

apiRouter.get(
  '/ratings',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const received =
      db.prepare(`
        SELECT
          r.*,
          p.full_name AS rater_name,
          s.skill_id,
          sk.name AS skill_name
        FROM ratings r
        JOIN profiles p
          ON p.user_id =
             r.rater_id
        JOIN sessions s
          ON s.id =
             r.session_id
        JOIN skills sk
          ON sk.id =
             s.skill_id
        WHERE r.ratee_id = ?
        ORDER BY
          r.created_at DESC
      `).all(
        user.user_id
      );

    const given =
      db.prepare(`
        SELECT
          r.*,
          p.full_name AS ratee_name,
          s.skill_id,
          sk.name AS skill_name
        FROM ratings r
        JOIN profiles p
          ON p.user_id =
             r.ratee_id
        JOIN sessions s
          ON s.id =
             r.session_id
        JOIN skills sk
          ON sk.id =
             s.skill_id
        WHERE r.rater_id = ?
        ORDER BY
          r.created_at DESC
      `).all(
        user.user_id
      );

    res.json({
      received,
      given
    });
  }
);

// -------------------------------------------------------------
// 8. LEARNING PROGRESS
// -------------------------------------------------------------

apiRouter.get(
  '/progress',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const progress =
      db.prepare(`
        SELECT
          lp.*,
          s.name AS skill_name,
          s.category AS skill_category
        FROM learning_progress lp
        JOIN skills s
          ON s.id =
             lp.skill_id
        WHERE
          lp.user_id = ?
        ORDER BY
          lp.updated_at DESC
      `).all(
        user.user_id
      );

    // ---------------------------------------------------------
    // REAL COMPLETED SESSIONS
    // ---------------------------------------------------------

    const sessionStats =
      db.prepare(`
        SELECT
          COUNT(*) AS completed_sessions,
          COALESCE(
            SUM(
              verified_duration_seconds
            ),
            0
          ) AS learning_seconds
        FROM sessions
        WHERE
          learner_id = ?
          AND status = 'VERIFIED'
      `).get(
        user.user_id
      ) as any;

    const learningHours =
      Number(
        sessionStats?.learning_seconds ||
        0
      ) / 3600;

    res.json({
      progress,

      summary: {
        completed_sessions:
          Number(
            sessionStats?.completed_sessions ||
            0
          ),

        learning_hours:
          Math.round(
            learningHours * 100
          ) / 100
      }
    });
  }
);

// -------------------------------------------------------------
// SINGLE SKILL PROGRESS
// -------------------------------------------------------------

apiRouter.get(
  '/progress/:skillId',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const progress =
      db.prepare(`
        SELECT
          lp.*,
          s.name AS skill_name,
          s.category,
          s.description
        FROM learning_progress lp
        JOIN skills s
          ON s.id =
             lp.skill_id
        WHERE
          lp.user_id = ?
          AND lp.skill_id = ?
      `).get(
        user.user_id,
        req.params.skillId
      );

    if (!progress) {
      res.status(404).json({
        error:
          'No learning progress found for this skill.'
      });
      return;
    }

    res.json({
      progress
    });
  }
);

// -------------------------------------------------------------
// 9. AI LEARNING PLAN
// -------------------------------------------------------------

apiRouter.post(
  '/ai/learning-plan',
  async (
    req: Request,
    res: Response
  ) => {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const {
      skill,
      skill_id,
      current_level
    } = req.body;

    if (!skill && !skill_id) {
      res.status(400).json({
        error: 'Skill or skill_id is required.'
      });
      return;
    }

    let resolvedSkill = skill;

    if (skill_id && !resolvedSkill) {
      const skillRow = db.prepare(`
        SELECT name
        FROM skills
        WHERE id = ?
      `).get(skill_id) as any;

      resolvedSkill = skillRow?.name;
    }

    if (!resolvedSkill) {
      res.status(404).json({
        error: 'Skill not found.'
      });
      return;
    }

    const plan = generateStructuredLearningPlan(
      resolvedSkill,
      current_level || 'BEGINNER'
    );

    res.json({
      success: true,
      skill: resolvedSkill,
      plan
    });
  }
);
// -------------------------------------------------------------
// MY LEARNING PLANS
// -------------------------------------------------------------

apiRouter.get(
  '/ai/learning-plans',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const plans =
      db.prepare(`
        SELECT
          lp.*,
          s.name AS skill_name
        FROM learning_paths lp
        LEFT JOIN skills s
          ON s.id =
             lp.skill_id
        WHERE
          lp.user_id = ?
        ORDER BY
          lp.created_at DESC
      `).all(
        user.user_id
      );

    const parsed =
      plans.map(
        (plan: any) => {
          let planData =
            null;

          try {
            planData =
              JSON.parse(
                plan.plan_json ||
                  '{}'
              );
          } catch {
            planData = null;
          }

          return {
            ...plan,
            plan:
              planData
          };
        }
      );

    res.json({
      plans:
        parsed
    });
  }
);

// -------------------------------------------------------------
// 10. AI ASSISTANT
// -------------------------------------------------------------

apiRouter.post(
  '/ai/assistant',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const {
      message,
      context
    } = req.body;

    if (
      typeof message !== 'string' ||
      !message.trim()
    ) {
      res.status(400).json({
        error:
          'Message is required.'
      });
      return;
    }

    const lower =
      message
        .trim()
        .toLowerCase();

    let response =
      'I can help you with LearnX learning, skill sharing, sessions, Time Credits, and your learning progress.';

    if (
      lower.includes(
        'time credit'
      ) ||
      lower.includes(
        'credit'
      )
    ) {
      response =
        'Time Credits are earned by completing verified knowledge-sharing sessions. One verified hour of sharing earns one Time Credit. Time Credits are internal LearnX participation units and have no cash value.';
    } else if (
      lower.includes(
        'python'
      )
    ) {
      response =
        'You can search for Python on LearnX and choose a real knowledge sharer who has Python registered as a SHARE skill.';
    } else if (
      lower.includes(
        'session'
      )
    ) {
      response =
        'You can request a session with a knowledge sharer, wait for acceptance, join the session, complete the learning session, and confirm completion with the other participant.';
    } else if (
      lower.includes(
        'learn'
      )
    ) {
      response =
        'LearnX lets you select skills you want to learn, create a learning plan, find knowledge sharers, schedule one-to-one sessions, and track your actual progress.';
    } else if (
      lower.includes(
        'share'
      ) ||
      lower.includes(
        'teach'
      )
    ) {
      response =
        'You can add skills you know as SHARE skills. Other users can then discover you and request a one-to-one knowledge-sharing session.';
    }

    res.json({
      success: true,

      response,

      context:
        context || null
    });
  }
);

// -------------------------------------------------------------
// 11. QUIZZES
// -------------------------------------------------------------

apiRouter.get(
  '/quizzes',
  async (
    req: Request,
    res: Response
  ) => {
    const {
      skill_id
    } = req.query;

    let query = `
      SELECT
        q.*,
        s.name AS skill_name
      FROM quizzes q
      JOIN skills s
        ON s.id =
           q.skill_id
      WHERE
        (
          q.is_active = 1
          OR q.is_active IS NULL
        )
    `;

    const params: any[] = [];

    if (
      typeof skill_id === 'string' &&
      skill_id
    ) {
      query += `
        AND q.skill_id = ?
      `;

      params.push(
        skill_id
      );
    }

    query += `
      ORDER BY
        q.created_at DESC
    `;

    const quizzes =
      db.prepare(query)
        .all(...params);

    res.json({
      quizzes
    });
  }
);

// -------------------------------------------------------------
// GET QUIZ
// -------------------------------------------------------------

apiRouter.get(
  '/quizzes/:id',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    const quiz =
      db.prepare(`
        SELECT
          q.*,
          s.name AS skill_name
        FROM quizzes q
        JOIN skills s
          ON s.id =
             q.skill_id
        WHERE q.id = ?
      `).get(
        req.params.id
      ) as any;

    if (!quiz) {
      res.status(404).json({
        error:
          'Quiz not found.'
      });
      return;
    }

    const questions =
      db.prepare(`
        SELECT
          id,
          quiz_id,
          question_text,
          options_json,
          points,
          topic
        FROM quiz_questions
        WHERE quiz_id = ?
        ORDER BY
          question_order ASC,
          created_at ASC
      `).all(
        quiz.id
      ).map(
        (question: any) => {
          let options = [];

          try {
            options =
              JSON.parse(
                question.options_json ||
                  '[]'
              );
          } catch {
            options = [];
          }

          return {
            id:
              question.id,

            quiz_id:
              question.quiz_id,

            question_text:
              question.question_text,

            options,

            points:
              question.points,

            topic:
              question.topic
          };
        }
      );

    const previousAttempt =
      user
        ? db.prepare(`
            SELECT *
            FROM quiz_attempts
            WHERE
              quiz_id = ?
              AND user_id = ?
            ORDER BY
              created_at DESC
            LIMIT 1
          `).get(
            quiz.id,
            user.user_id
          )
        : null;

    res.json({
      quiz,

      questions,

      previous_attempt:
        previousAttempt
    });
  }
);

// -------------------------------------------------------------
// SUBMIT QUIZ
// -------------------------------------------------------------

apiRouter.post(
  '/quizzes/:id/submit',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const quiz =
      db.prepare(`
        SELECT *
        FROM quizzes
        WHERE id = ?
      `).get(
        req.params.id
      ) as any;

    if (!quiz) {
      res.status(404).json({
        error:
          'Quiz not found.'
      });
      return;
    }

    const {
      answers
    } = req.body;

    if (
      !answers ||
      typeof answers !== 'object'
    ) {
      res.status(400).json({
        error:
          'Answers are required.'
      });
      return;
    }

    const questions =
      db.prepare(`
        SELECT *
        FROM quiz_questions
        WHERE quiz_id = ?
        ORDER BY
          question_order ASC,
          created_at ASC
      `).all(
        quiz.id
      ) as any[];

    if (
      questions.length === 0
    ) {
      res.status(400).json({
        error:
          'This quiz has no questions.'
      });
      return;
    }

    let score = 0;
    let totalPoints = 0;

    const weakTopics =
      new Set<string>();

    const strongTopics =
      new Set<string>();

    const questionResults =
      [];

    // ---------------------------------------------------------
    // SCORE ACTUAL QUESTIONS
    // ---------------------------------------------------------

    for (
      const question of questions
    ) {
      const points =
        Number(
          question.points || 1
        );

      totalPoints +=
        points;

      const submitted =
        answers[
          question.id
        ];

      let correct =
        false;

      // -------------------------------------------------------
      // Support answer stored as:
      // correct_answer
      // OR correct_option
      // -------------------------------------------------------

      const correctAnswer =
        question.correct_answer ??
        question.correct_option;

      if (
        submitted != null &&
        correctAnswer != null &&
        String(
          submitted
        ) === String(
          correctAnswer
        )
      ) {
        correct = true;

        score +=
          points;
      }

      const topic =
        question.topic ||
        'General';

      if (correct) {
        strongTopics.add(
          topic
        );
      } else {
        weakTopics.add(
          topic
        );
      }

      questionResults.push({
        question_id:
          question.id,

        correct,

        topic,

        points
      });
    }

    const percentage =
      totalPoints > 0
        ? Math.round(
            (
              score /
              totalPoints
            ) * 100
          )
        : 0;

    const passPercentage =
      Number(
        quiz.pass_percentage ||
        60
      );

    const passed =
      percentage >=
      passPercentage;

    let demonstratedLevel =
      'BEGINNER';

    if (
      percentage >= 90
    ) {
      demonstratedLevel =
        'ADVANCED';
    } else if (
      percentage >= 75
    ) {
      demonstratedLevel =
        'INTERMEDIATE';
    } else if (
      percentage >= 60
    ) {
      demonstratedLevel =
        'ELEMENTARY';
    }

    // ---------------------------------------------------------
    // SAVE ATTEMPT
    // ---------------------------------------------------------

    const attemptId =
      crypto.randomUUID();

    try {
      db.exec(
        'BEGIN IMMEDIATE'
      );

      db.prepare(`
        INSERT INTO quiz_attempts (
          id,
          quiz_id,
          user_id,
          score,
          percentage,
          passed,
          answers_json,
          weak_topics_json,
          strong_topics_json,
          demonstrated_level
        )
        VALUES (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?
        )
      `).run(
        attemptId,
        quiz.id,
        user.user_id,
        score,
        percentage,
        passed ? 1 : 0,
        JSON.stringify(
          answers
        ),
        JSON.stringify(
          Array.from(
            weakTopics
          )
        ),
        JSON.stringify(
          Array.from(
            strongTopics
          )
        ),
        demonstratedLevel
      );

      // -------------------------------------------------------
      // SKILL ASSESSMENT
      // -------------------------------------------------------

      db.prepare(`
        INSERT INTO skill_assessments (
          id,
          user_id,
          skill_id,
          source,
          level,
          score,
          assessment_reference_id
        )
        VALUES (
          ?,
          ?,
          ?,
          'AI_ASSESSED',
          ?,
          ?,
          ?
        )
      `).run(
        crypto.randomUUID(),
        user.user_id,
        quiz.skill_id,
        demonstratedLevel,
        percentage,
        attemptId
      );

      // -------------------------------------------------------
      // SKILLPROOF
      // -------------------------------------------------------

      if (passed) {
        db.prepare(`
          INSERT INTO skillproof (
            id,
            user_id,
            skill_id,
            proof_level,
            source,
            reference_id,
            verified_at
          )
          VALUES (
            ?,
            ?,
            ?,
            'AI_ASSESSED',
            'QUIZ',
            ?,
            ?
          )
          ON CONFLICT(
            user_id,
            skill_id,
            proof_level
          )
          DO UPDATE SET
            reference_id =
              excluded.reference_id,
            verified_at =
              excluded.verified_at
        `).run(
          crypto.randomUUID(),
          user.user_id,
          quiz.skill_id,
          attemptId,
          new Date().toISOString()
        );
      }

      // -------------------------------------------------------
      // UPDATE LEARNING PROGRESS
      // -------------------------------------------------------

      const existingProgress =
        db.prepare(`
          SELECT *
          FROM learning_progress
          WHERE
            user_id = ?
            AND skill_id = ?
        `).get(
          user.user_id,
          quiz.skill_id
        ) as any;

      const progressIncrease =
        passed
          ? 5
          : 2;

      if (existingProgress) {
        const newProgress =
          Math.min(
            100,
            Number(
              existingProgress.progress_percentage ||
              0
            ) +
              progressIncrease
          );

        db.prepare(`
          UPDATE learning_progress
          SET
            progress_percentage = ?,
            updated_at = ?
          WHERE
            user_id = ?
            AND skill_id = ?
        `).run(
          newProgress,
          new Date().toISOString(),
          user.user_id,
          quiz.skill_id
        );
      } else {
        db.prepare(`
          INSERT INTO learning_progress (
            id,
            user_id,
            skill_id,
            progress_percentage,
            learning_hours
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            0
          )
        `).run(
          crypto.randomUUID(),
          user.user_id,
          quiz.skill_id,
          progressIncrease,
        );
      }

      // -------------------------------------------------------
      // NOTIFICATION
      // -------------------------------------------------------

      db.prepare(`
        INSERT INTO notifications (
          id,
          user_id,
          title,
          message,
          type,
          link
        )
        VALUES (
          ?,
          ?,
          ?,
          ?,
          'QUIZ_RESULT',
          ?
        )
      `).run(
        crypto.randomUUID(),
        user.user_id,
        passed
          ? 'Quiz Passed'
          : 'Quiz Completed',
        `You scored ${percentage}% in the ${quiz.title || 'skill'} quiz.`,
        `/quizzes/${quiz.id}`
      );

      db.exec('COMMIT');
    } catch (err: any) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // Ignore rollback errors.
      }

      res.status(500).json({
        error:
          err?.message ||
          'Unable to submit quiz.'
      });
      return;
    }

    res.json({
      success: true,

      attempt_id:
        attemptId,

      score,

      total_points:
        totalPoints,

      percentage,

      passed,

      demonstrated_level:
        demonstratedLevel,

      weak_topics:
        Array.from(
          weakTopics
        ),

      strong_topics:
        Array.from(
          strongTopics
        ),

      question_results:
        questionResults
    });
  }
);

// -------------------------------------------------------------
// MY QUIZ ATTEMPTS
// -------------------------------------------------------------

apiRouter.get(
  '/v1/me/quiz-attempts',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const attempts =
      db.prepare(`
        SELECT
          qa.*,
          q.title AS quiz_title,
          q.skill_id,
          s.name AS skill_name
        FROM quiz_attempts qa
        JOIN quizzes q
          ON q.id =
             qa.quiz_id
        JOIN skills s
          ON s.id =
             q.skill_id
        WHERE
          qa.user_id = ?
        ORDER BY
          qa.created_at DESC
      `).all(
        user.user_id
      );

    res.json({
      attempts
    });
  }
);

// -------------------------------------------------------------
// MY SKILL ASSESSMENTS
// -------------------------------------------------------------

apiRouter.get(
  '/v1/me/skill-assessments',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const assessments =
      db.prepare(`
        SELECT
          sa.*,
          s.name AS skill_name
        FROM skill_assessments sa
        JOIN skills s
          ON s.id =
             sa.skill_id
        WHERE
          sa.user_id = ?
        ORDER BY
          sa.created_at DESC
      `).all(
        user.user_id
      );

    res.json({
      assessments
    });
  }
);
// -------------------------------------------------------------
// 12. ACHIEVEMENTS
// -------------------------------------------------------------

apiRouter.get(
  '/achievements',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const achievements =
      db.prepare(`
        SELECT *
        FROM achievements
        WHERE user_id = ?
        ORDER BY created_at DESC
      `).all(user.user_id);

    res.json({
      achievements
    });
  }
);

// -------------------------------------------------------------
// 13. SKILLPROOF
// -------------------------------------------------------------

apiRouter.get(
  '/skillproof',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const proofs =
      db.prepare(`
        SELECT
          sp.*,
          s.name AS skill_name,
          s.category AS skill_category
        FROM skillproof sp
        JOIN skills s
          ON s.id = sp.skill_id
        WHERE sp.user_id = ?
        ORDER BY
          sp.verified_at DESC,
          sp.created_at DESC
      `).all(user.user_id);

    res.json({
      skillproof: proofs
    });
  }
);

// -------------------------------------------------------------
// SKILLPROOF BY SKILL
// -------------------------------------------------------------

apiRouter.get(
  '/skillproof/:skillId',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const proofs =
      db.prepare(`
        SELECT
          sp.*,
          s.name AS skill_name,
          s.category AS skill_category
        FROM skillproof sp
        JOIN skills s
          ON s.id = sp.skill_id
        WHERE
          sp.user_id = ?
          AND sp.skill_id = ?
        ORDER BY
          sp.verified_at DESC
      `).all(
        user.user_id,
        req.params.skillId
      );

    res.json({
      skillproof: proofs
    });
  }
);

// -------------------------------------------------------------
// 14. PARTNERS
// -------------------------------------------------------------

apiRouter.get(
  '/partners',
  async (
    req: Request,
    res: Response
  ) => {
    const partners =
      db.prepare(`
        SELECT *
        FROM partners
        WHERE
          is_active = 1
          OR is_active IS NULL
        ORDER BY
          created_at DESC
      `).all();

    res.json({
      partners
    });
  }
);

// -------------------------------------------------------------
// CREATE PARTNER
// ADMIN ONLY
// -------------------------------------------------------------

apiRouter.post(
  '/partners',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    if (user.role !== 'ADMIN') {
      res.status(403).json({
        error: 'Admin access required.'
      });
      return;
    }

    const {
      name,
      description,
      website,
      logo_url,
      contact_email
    } = req.body;

    if (
      typeof name !== 'string' ||
      !name.trim()
    ) {
      res.status(400).json({
        error: 'Partner name is required.'
      });
      return;
    }

    const partnerId =
      crypto.randomUUID();

    db.prepare(`
      INSERT INTO partners (
        id,
        name,
        description,
        website,
        logo_url,
        contact_email,
        is_active
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        1
      )
    `).run(
      partnerId,
      name.trim(),
      description || '',
      website || '',
      logo_url || '',
      contact_email || ''
    );

    res.status(201).json({
      success: true,
      partner_id: partnerId
    });
  }
);

// -------------------------------------------------------------
// 15. COURSES
// -------------------------------------------------------------

apiRouter.get(
  '/courses',
  async (
    req: Request,
    res: Response
  ) => {
    const {
      skill_id,
      partner_id
    } = req.query;

    let query = `
      SELECT
        c.*,
        p.name AS partner_name,
        s.name AS skill_name
      FROM courses c
      LEFT JOIN partners p
        ON p.id = c.partner_id
      LEFT JOIN skills s
        ON s.id = c.skill_id
      WHERE
        (
          c.is_active = 1
          OR c.is_active IS NULL
        )
    `;

    const params: any[] = [];

    if (
      typeof skill_id === 'string' &&
      skill_id
    ) {
      query += `
        AND c.skill_id = ?
      `;

      params.push(skill_id);
    }

    if (
      typeof partner_id === 'string' &&
      partner_id
    ) {
      query += `
        AND c.partner_id = ?
      `;

      params.push(partner_id);
    }

    query += `
      ORDER BY
        c.created_at DESC
    `;

    const courses =
      db.prepare(query).all(
        ...params
      );

    res.json({
      courses
    });
  }
);

// -------------------------------------------------------------
// SINGLE COURSE
// -------------------------------------------------------------

apiRouter.get(
  '/courses/:id',
  async (
    req: Request,
    res: Response
  ) => {
    const course =
      db.prepare(`
        SELECT
          c.*,
          p.name AS partner_name,
          p.logo_url AS partner_logo,
          s.name AS skill_name
        FROM courses c
        LEFT JOIN partners p
          ON p.id = c.partner_id
        LEFT JOIN skills s
          ON s.id = c.skill_id
        WHERE c.id = ?
      `).get(
        req.params.id
      ) as any;

    if (!course) {
      res.status(404).json({
        error: 'Course not found.'
      });
      return;
    }

    res.json({
      course
    });
  }
);

// -------------------------------------------------------------
// CREATE COURSE
// ADMIN ONLY
// -------------------------------------------------------------

apiRouter.post(
  '/courses',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    if (user.role !== 'ADMIN') {
      res.status(403).json({
        error: 'Admin access required.'
      });
      return;
    }

    const {
      partner_id,
      skill_id,
      title,
      description,
      level,
      duration_hours,
      course_url,
      certificate_available,
      credit_cost
    } = req.body;

    if (
      typeof title !== 'string' ||
      !title.trim()
    ) {
      res.status(400).json({
        error: 'Course title is required.'
      });
      return;
    }

    if (
      partner_id
    ) {
      const partner =
        db.prepare(`
          SELECT id
          FROM partners
          WHERE id = ?
        `).get(partner_id);

      if (!partner) {
        res.status(400).json({
          error: 'Partner not found.'
        });
        return;
      }
    }

    if (
      skill_id
    ) {
      const skill =
        db.prepare(`
          SELECT id
          FROM skills
          WHERE id = ?
        `).get(skill_id);

      if (!skill) {
        res.status(400).json({
          error: 'Skill not found.'
        });
        return;
      }
    }

    const courseId =
      crypto.randomUUID();

    db.prepare(`
      INSERT INTO courses (
        id,
        partner_id,
        skill_id,
        title,
        description,
        level,
        duration_hours,
        course_url,
        certificate_available,
        credit_cost,
        is_active
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        1
      )
    `).run(
      courseId,
      partner_id || null,
      skill_id || null,
      title.trim(),
      description || '',
      level || 'BEGINNER',
      Number(duration_hours || 0),
      course_url || '',
      certificate_available ? 1 : 0,
      Math.max(
        0,
        Number(credit_cost || 0)
      )
    );

    res.status(201).json({
      success: true,
      course_id: courseId
    });
  }
);

// -------------------------------------------------------------
// 16. COURSE ENROLLMENT
// -------------------------------------------------------------

apiRouter.post(
  '/courses/:id/enroll',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const course =
      db.prepare(`
        SELECT *
        FROM courses
        WHERE id = ?
      `).get(
        req.params.id
      ) as any;

    if (!course) {
      res.status(404).json({
        error: 'Course not found.'
      });
      return;
    }

    const existing =
      db.prepare(`
        SELECT *
        FROM course_enrollments
        WHERE
          course_id = ?
          AND user_id = ?
      `).get(
        course.id,
        user.user_id
      ) as any;

    if (existing) {
      res.json({
        success: true,
        already_enrolled: true,
        enrollment: existing
      });
      return;
    }

    const creditCost =
      Math.max(
        0,
        Number(
          course.credit_cost || 0
        )
      );

    if (creditCost > 0) {
      const wallet =
        db.prepare(`
          SELECT *
          FROM time_credit_accounts
          WHERE user_id = ?
        `).get(
          user.user_id
        ) as any;

      const balance =
        Number(
          wallet?.balance || 0
        );

      if (
        balance <
        creditCost
      ) {
        res.status(400).json({
          error:
            'Insufficient Time Credits.'
        });
        return;
      }
    }

    const enrollmentId =
      crypto.randomUUID();

    try {
      db.exec(
        'BEGIN IMMEDIATE'
      );

      // -------------------------------------------------------
      // ENSURE WALLET EXISTS
      // -------------------------------------------------------

      db.prepare(`
        INSERT OR IGNORE INTO time_credit_accounts (
          id,
          user_id,
          balance,
          total_earned,
          total_spent
        )
        VALUES (
          ?,
          ?,
          0,
          0,
          0
        )
      `).run(
        `tc-${user.user_id}`,
        user.user_id
      );

      const wallet =
        db.prepare(`
          SELECT balance
          FROM time_credit_accounts
          WHERE user_id = ?
        `).get(
          user.user_id
        ) as any;

      if (
        creditCost >
        Number(
          wallet?.balance || 0
        )
      ) {
        db.exec('ROLLBACK');

        res.status(400).json({
          error:
            'Insufficient Time Credits.'
        });
        return;
      }

      // -------------------------------------------------------
      // SPEND CREDITS ONLY IF COURSE REQUIRES THEM
      // -------------------------------------------------------

      if (
        creditCost > 0
      ) {
        const transactionId =
          crypto.randomUUID();

        db.prepare(`
          UPDATE time_credit_accounts
          SET
            balance =
              balance - ?,
            total_spent =
              total_spent + ?,
            updated_at = ?
          WHERE
            user_id = ?
            AND balance >= ?
        `).run(
          creditCost,
          creditCost,
          new Date().toISOString(),
          user.user_id,
          creditCost
        );

        db.prepare(`
          INSERT INTO credit_transactions (
            id,
            user_id,
            amount,
            transaction_type,
            status,
            description,
            reference_id
          )
          VALUES (
            ?,
            ?,
            ?,
            'COURSE_ENROLLMENT',
            'COMPLETED',
            ?,
            ?
          )
        `).run(
          transactionId,
          user.user_id,
          -creditCost,
          `Course enrollment: ${course.title}`,
          course.id
        );
      }

      db.prepare(`
        INSERT INTO course_enrollments (
          id,
          course_id,
          user_id,
          progress_percentage,
          status,
          enrolled_at
        )
        VALUES (
          ?,
          ?,
          ?,
          0,
          'ENROLLED',
          ?
        )
      `).run(
        enrollmentId,
        course.id,
        user.user_id,
        new Date().toISOString()
      );

      db.prepare(`
        INSERT INTO notifications (
          id,
          user_id,
          title,
          message,
          type,
          link
        )
        VALUES (
          ?,
          ?,
          ?,
          ?,
          'COURSE_ENROLLED',
          ?
        )
      `).run(
        crypto.randomUUID(),
        user.user_id,
        'Course Enrollment Successful',
        `You are enrolled in ${course.title}.`,
        `/courses/${course.id}`
      );

      db.exec('COMMIT');
    } catch (err: any) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // Ignore rollback error.
      }

      res.status(500).json({
        error:
          err?.message ||
          'Unable to enroll in course.'
      });
      return;
    }

    const enrollment =
      db.prepare(`
        SELECT *
        FROM course_enrollments
        WHERE id = ?
      `).get(
        enrollmentId
      );

    res.status(201).json({
      success: true,
      enrollment
    });
  }
);

// -------------------------------------------------------------
// MY COURSES
// -------------------------------------------------------------

apiRouter.get(
  '/my-courses',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const courses =
      db.prepare(`
        SELECT
          ce.*,
          c.title,
          c.description,
          c.level,
          c.duration_hours,
          c.course_url,
          c.certificate_available,
          c.credit_cost,
          p.name AS partner_name,
          s.name AS skill_name
        FROM course_enrollments ce
        JOIN courses c
          ON c.id = ce.course_id
        LEFT JOIN partners p
          ON p.id = c.partner_id
        LEFT JOIN skills s
          ON s.id = c.skill_id
        WHERE
          ce.user_id = ?
        ORDER BY
          ce.enrolled_at DESC
      `).all(
        user.user_id
      );

    res.json({
      courses
    });
  }
);

// -------------------------------------------------------------
// COURSE PROGRESS
// -------------------------------------------------------------

apiRouter.get(
  '/courses/:id/progress',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const enrollment =
      db.prepare(`
        SELECT
          ce.*,
          c.title,
          c.certificate_available,
          c.skill_id
        FROM course_enrollments ce
        JOIN courses c
          ON c.id = ce.course_id
        WHERE
          ce.course_id = ?
          AND ce.user_id = ?
      `).get(
        req.params.id,
        user.user_id
      ) as any;

    if (!enrollment) {
      res.status(404).json({
        error:
          'Course enrollment not found.'
      });
      return;
    }

    res.json({
      enrollment
    });
  }
);

// -------------------------------------------------------------
// UPDATE COURSE PROGRESS
// -------------------------------------------------------------

apiRouter.put(
  '/courses/:id/progress',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const enrollment =
      db.prepare(`
        SELECT
          ce.*,
          c.title,
          c.certificate_available,
          c.skill_id
        FROM course_enrollments ce
        JOIN courses c
          ON c.id = ce.course_id
        WHERE
          ce.course_id = ?
          AND ce.user_id = ?
      `).get(
        req.params.id,
        user.user_id
      ) as any;

    if (!enrollment) {
      res.status(404).json({
        error:
          'Course enrollment not found.'
      });
      return;
    }

    const requestedProgress =
      Number(
        req.body?.progress_percentage
      );

    if (
      !Number.isFinite(
        requestedProgress
      )
    ) {
      res.status(400).json({
        error:
          'progress_percentage is required.'
      });
      return;
    }

    const progress =
      Math.max(
        0,
        Math.min(
          100,
          requestedProgress
        )
      );

    const status =
      progress >= 100
        ? 'COMPLETED'
        : 'IN_PROGRESS';

    db.prepare(`
      UPDATE course_enrollments
      SET
        progress_percentage = ?,
        status = ?,
        completed_at =
          CASE
            WHEN ? >= 100
            THEN ?
            ELSE completed_at
          END
      WHERE
        course_id = ?
        AND user_id = ?
    `).run(
      progress,
      status,
      progress,
      new Date().toISOString(),
      req.params.id,
      user.user_id
    );

    // ---------------------------------------------------------
    // CERTIFICATE
    // ---------------------------------------------------------

    if (
      progress >= 100 &&
      enrollment.certificate_available
    ) {
      const existingCertificate =
        db.prepare(`
          SELECT id
          FROM certificates
          WHERE
            course_id = ?
            AND user_id = ?
        `).get(
          req.params.id,
          user.user_id
        );

      if (!existingCertificate) {
        const certificateId =
          crypto.randomUUID();

        const certificateNumber =
          `LX-${new Date()
            .getFullYear()}-${certificateId
            .replace(/-/g, '')
            .slice(0, 10)
            .toUpperCase()}`;

        db.prepare(`
          INSERT INTO certificates (
            id,
            user_id,
            course_id,
            certificate_number,
            issued_at,
            verification_code
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `).run(
          certificateId,
          user.user_id,
          req.params.id,
          certificateNumber,
          new Date().toISOString(),
          certificateId
        );
      }
    }

    const updated =
      db.prepare(`
        SELECT *
        FROM course_enrollments
        WHERE
          course_id = ?
          AND user_id = ?
      `).get(
        req.params.id,
        user.user_id
      );

    res.json({
      success: true,
      enrollment: updated
    });
  }
);

// -------------------------------------------------------------
// 17. COURSE NOTES
// -------------------------------------------------------------

apiRouter.get(
  '/courses/:id/notes',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const enrollment =
      db.prepare(`
        SELECT id
        FROM course_enrollments
        WHERE
          course_id = ?
          AND user_id = ?
      `).get(
        req.params.id,
        user.user_id
      );

    if (!enrollment) {
      res.status(403).json({
        error:
          'You are not enrolled in this course.'
      });
      return;
    }

    const notes =
      db.prepare(`
        SELECT *
        FROM course_notes
        WHERE
          course_id = ?
          AND user_id = ?
        ORDER BY
          updated_at DESC
      `).all(
        req.params.id,
        user.user_id
      );

    res.json({
      notes
    });
  }
);

// -------------------------------------------------------------
// SAVE COURSE NOTE
// -------------------------------------------------------------

apiRouter.post(
  '/courses/:id/notes',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const enrollment =
      db.prepare(`
        SELECT id
        FROM course_enrollments
        WHERE
          course_id = ?
          AND user_id = ?
      `).get(
        req.params.id,
        user.user_id
      );

    if (!enrollment) {
      res.status(403).json({
        error:
          'You are not enrolled in this course.'
      });
      return;
    }

    const {
      title,
      content
    } = req.body;

    if (
      typeof content !== 'string' ||
      !content.trim()
    ) {
      res.status(400).json({
        error:
          'Note content is required.'
      });
      return;
    }

    const noteId =
      crypto.randomUUID();

    db.prepare(`
      INSERT INTO course_notes (
        id,
        course_id,
        user_id,
        title,
        content
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?
      )
    `).run(
      noteId,
      req.params.id,
      user.user_id,
      title || 'My Note',
      content.trim()
    );

    const note =
      db.prepare(`
        SELECT *
        FROM course_notes
        WHERE id = ?
      `).get(noteId);

    res.status(201).json({
      success: true,
      note
    });
  }
);

// -------------------------------------------------------------
// UPDATE COURSE NOTE
// -------------------------------------------------------------

apiRouter.put(
  '/courses/:id/notes/:noteId',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const note =
      db.prepare(`
        SELECT *
        FROM course_notes
        WHERE
          id = ?
          AND course_id = ?
          AND user_id = ?
      `).get(
        req.params.noteId,
        req.params.id,
        user.user_id
      ) as any;

    if (!note) {
      res.status(404).json({
        error: 'Note not found.'
      });
      return;
    }

    const {
      title,
      content
    } = req.body;

    db.prepare(`
      UPDATE course_notes
      SET
        title = ?,
        content = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      typeof title === 'string'
        ? title
        : note.title,
      typeof content === 'string'
        ? content
        : note.content,
      new Date().toISOString(),
      note.id
    );

    const updated =
      db.prepare(`
        SELECT *
        FROM course_notes
        WHERE id = ?
      `).get(
        note.id
      );

    res.json({
      success: true,
      note: updated
    });
  }
);

// -------------------------------------------------------------
// 18. BOOTCAMPS
// -------------------------------------------------------------

apiRouter.get(
  '/bootcamps',
  async (
    req: Request,
    res: Response
  ) => {
    const bootcamps =
      db.prepare(`
        SELECT
          b.*,
          p.name AS partner_name,
          s.name AS skill_name
        FROM bootcamps b
        LEFT JOIN partners p
          ON p.id = b.partner_id
        LEFT JOIN skills s
          ON s.id = b.skill_id
        WHERE
          (
            b.is_active = 1
            OR b.is_active IS NULL
          )
        ORDER BY
          b.created_at DESC
      `).all();

    res.json({
      bootcamps
    });
  }
);

// -------------------------------------------------------------
// BOOTCAMP DETAILS
// -------------------------------------------------------------

apiRouter.get(
  '/bootcamps/:id',
  async (
    req: Request,
    res: Response
  ) => {
    const bootcamp =
      db.prepare(`
        SELECT
          b.*,
          p.name AS partner_name,
          s.name AS skill_name
        FROM bootcamps b
        LEFT JOIN partners p
          ON p.id = b.partner_id
        LEFT JOIN skills s
          ON s.id = b.skill_id
        WHERE b.id = ?
      `).get(
        req.params.id
      ) as any;

    if (!bootcamp) {
      res.status(404).json({
        error:
          'Bootcamp not found.'
      });
      return;
    }

    res.json({
      bootcamp
    });
  }
);

// -------------------------------------------------------------
// BOOTCAMP ENROLLMENT
// -------------------------------------------------------------

apiRouter.post(
  '/bootcamps/:id/enroll',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const bootcamp =
      db.prepare(`
        SELECT *
        FROM bootcamps
        WHERE id = ?
      `).get(
        req.params.id
      ) as any;

    if (!bootcamp) {
      res.status(404).json({
        error:
          'Bootcamp not found.'
      });
      return;
    }

    const existing =
      db.prepare(`
        SELECT *
        FROM bootcamp_enrollments
        WHERE
          bootcamp_id = ?
          AND user_id = ?
      `).get(
        bootcamp.id,
        user.user_id
      ) as any;

    if (existing) {
      res.json({
        success: true,
        already_enrolled: true,
        enrollment: existing
      });
      return;
    }

    const creditCost =
      Math.max(
        0,
        Number(
          bootcamp.credit_cost || 0
        )
      );

    const enrollmentId =
      crypto.randomUUID();

    try {
      db.exec(
        'BEGIN IMMEDIATE'
      );

      db.prepare(`
        INSERT OR IGNORE INTO time_credit_accounts (
          id,
          user_id,
          balance,
          total_earned,
          total_spent
        )
        VALUES (
          ?,
          ?,
          0,
          0,
          0
        )
      `).run(
        `tc-${user.user_id}`,
        user.user_id
      );

      const wallet =
        db.prepare(`
          SELECT balance
          FROM time_credit_accounts
          WHERE user_id = ?
        `).get(
          user.user_id
        ) as any;

      const balance =
        Number(
          wallet?.balance || 0
        );

      if (
        creditCost >
        balance
      ) {
        db.exec('ROLLBACK');

        res.status(400).json({
          error:
            'Insufficient Time Credits.'
        });
        return;
      }

      if (
        creditCost > 0
      ) {
        db.prepare(`
          UPDATE time_credit_accounts
          SET
            balance =
              balance - ?,
            total_spent =
              total_spent + ?,
            updated_at = ?
          WHERE
            user_id = ?
            AND balance >= ?
        `).run(
          creditCost,
          creditCost,
          new Date().toISOString(),
          user.user_id,
          creditCost
        );

        db.prepare(`
          INSERT INTO credit_transactions (
            id,
            user_id,
            amount,
            transaction_type,
            status,
            description,
            reference_id
          )
          VALUES (
            ?,
            ?,
            ?,
            'BOOTCAMP_ENROLLMENT',
            'COMPLETED',
            ?,
            ?
          )
        `).run(
          crypto.randomUUID(),
          user.user_id,
          -creditCost,
          `Bootcamp enrollment: ${bootcamp.title}`,
          bootcamp.id
        );
      }

      db.prepare(`
        INSERT INTO bootcamp_enrollments (
          id,
          bootcamp_id,
          user_id,
          progress_percentage,
          status,
          enrolled_at
        )
        VALUES (
          ?,
          ?,
          ?,
          0,
          'ENROLLED',
          ?
        )
      `).run(
        enrollmentId,
        bootcamp.id,
        user.user_id,
        new Date().toISOString()
      );

      db.prepare(`
        INSERT INTO notifications (
          id,
          user_id,
          title,
          message,
          type,
          link
        )
        VALUES (
          ?,
          ?,
          ?,
          ?,
          'BOOTCAMP_ENROLLED',
          ?
        )
      `).run(
        crypto.randomUUID(),
        user.user_id,
        'Bootcamp Enrollment Successful',
        `You are enrolled in ${bootcamp.title}.`,
        `/bootcamps/${bootcamp.id}`
      );

      db.exec('COMMIT');
    } catch (err: any) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // Ignore rollback error.
      }

      res.status(500).json({
        error:
          err?.message ||
          'Unable to enroll in bootcamp.'
      });
      return;
    }

    const enrollment =
      db.prepare(`
        SELECT *
        FROM bootcamp_enrollments
        WHERE id = ?
      `).get(
        enrollmentId
      );

    res.status(201).json({
      success: true,
      enrollment
    });
  }
);

// -------------------------------------------------------------
// MY BOOTCAMPS
// -------------------------------------------------------------

apiRouter.get(
  '/my-bootcamps',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const bootcamps =
      db.prepare(`
        SELECT
          be.*,
          b.title,
          b.description,
          b.level,
          b.duration_hours,
          b.start_date,
          b.end_date,
          b.credit_cost,
          p.name AS partner_name,
          s.name AS skill_name
        FROM bootcamp_enrollments be
        JOIN bootcamps b
          ON b.id = be.bootcamp_id
        LEFT JOIN partners p
          ON p.id = b.partner_id
        LEFT JOIN skills s
          ON s.id = b.skill_id
        WHERE
          be.user_id = ?
        ORDER BY
          be.enrolled_at DESC
      `).all(
        user.user_id
      );

    res.json({
      bootcamps
    });
  }
);

// -------------------------------------------------------------
// 19. CERTIFICATES
// -------------------------------------------------------------

apiRouter.get(
  '/certificates',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const certificates =
      db.prepare(`
        SELECT
          c.*,
          co.title AS course_title,
          p.name AS partner_name,
          s.name AS skill_name
        FROM certificates c
        LEFT JOIN courses co
          ON co.id = c.course_id
        LEFT JOIN partners p
          ON p.id = co.partner_id
        LEFT JOIN skills s
          ON s.id = co.skill_id
        WHERE
          c.user_id = ?
        ORDER BY
          c.issued_at DESC
      `).all(
        user.user_id
      );

    res.json({
      certificates
    });
  }
);

// -------------------------------------------------------------
// CERTIFICATE VERIFICATION
// PUBLIC
// -------------------------------------------------------------

apiRouter.get(
  '/certificates/verify/:id',
  async (
    req: Request,
    res: Response
  ) => {
    const certificate =
      db.prepare(`
        SELECT
          c.id,
          c.certificate_number,
          c.issued_at,
          c.verification_code,
          p.full_name AS recipient_name,
          co.title AS course_title,
          s.name AS skill_name,
          partner.name AS partner_name
        FROM certificates c
        JOIN profiles p
          ON p.user_id = c.user_id
        LEFT JOIN courses co
          ON co.id = c.course_id
        LEFT JOIN skills s
          ON s.id = co.skill_id
        LEFT JOIN partners partner
          ON partner.id =
             co.partner_id
        WHERE
          c.id = ?
          OR c.verification_code = ?
          OR c.certificate_number = ?
        LIMIT 1
      `).get(
        req.params.id,
        req.params.id,
        req.params.id
      ) as any;

    if (!certificate) {
      res.status(404).json({
        valid: false,
        error:
          'Certificate not found.'
      });
      return;
    }

    res.json({
      valid: true,
      certificate
    });
  }
);

// -------------------------------------------------------------
// 20. GENERIC USER CERTIFICATE / COURSE CHECK
// -------------------------------------------------------------

apiRouter.get(
  '/v1/courses/:id/enroll',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const enrollment =
      db.prepare(`
        SELECT
          ce.*,
          c.title AS course_title,
          c.certificate_available,
          c.skill_id,
          s.name AS skill_name
        FROM course_enrollments ce
        JOIN courses c
          ON c.id = ce.course_id
        LEFT JOIN skills s
          ON s.id = c.skill_id
        WHERE
          ce.course_id = ?
          AND ce.user_id = ?
      `).get(
        req.params.id,
        user.user_id
      );

    res.json({
      enrolled:
        Boolean(enrollment),
      enrollment:
        enrollment || null
    });
  }
);

// -------------------------------------------------------------
// 21. V1 BOOTCAMP ENROLLMENT STATUS
// -------------------------------------------------------------

apiRouter.get(
  '/v1/bootcamps/:id/enroll',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const enrollment =
      db.prepare(`
        SELECT
          be.*,
          b.title AS bootcamp_title,
          b.skill_id,
          s.name AS skill_name
        FROM bootcamp_enrollments be
        JOIN bootcamps b
          ON b.id = be.bootcamp_id
        LEFT JOIN skills s
          ON s.id = b.skill_id
        WHERE
          be.bootcamp_id = ?
          AND be.user_id = ?
      `).get(
        req.params.id,
        user.user_id
      );

    res.json({
      enrolled:
        Boolean(enrollment),
      enrollment:
        enrollment || null
    });
  }
);
// -------------------------------------------------------------
// 22. NOTIFICATIONS
// -------------------------------------------------------------

apiRouter.get(
  '/notifications',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const notifications =
      db.prepare(`
        SELECT *
        FROM notifications
        WHERE user_id = ?
        ORDER BY
          created_at DESC
      `).all(
        user.user_id
      );

    const unreadCount =
      db.prepare(`
        SELECT COUNT(*) AS count
        FROM notifications
        WHERE
          user_id = ?
          AND (
            is_read = 0
            OR is_read IS NULL
          )
      `).get(
        user.user_id
      ) as any;

    res.json({
      notifications,

      unread_count:
        Number(
          unreadCount?.count || 0
        )
    });
  }
);

// -------------------------------------------------------------
// MARK NOTIFICATION AS READ
// -------------------------------------------------------------

apiRouter.patch(
  '/notifications/:id/read',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const result =
      db.prepare(`
        UPDATE notifications
        SET
          is_read = 1,
          read_at = ?
        WHERE
          id = ?
          AND user_id = ?
      `).run(
        new Date().toISOString(),
        req.params.id,
        user.user_id
      );

    if (
      Number(result.changes) === 0
    ) {
      res.status(404).json({
        error:
          'Notification not found.'
      });
      return;
    }

    res.json({
      success: true
    });
  }
);

// -------------------------------------------------------------
// MARK ALL NOTIFICATIONS AS READ
// -------------------------------------------------------------

apiRouter.patch(
  '/notifications/read-all',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    db.prepare(`
      UPDATE notifications
      SET
        is_read = 1,
        read_at = ?
      WHERE
        user_id = ?
        AND (
          is_read = 0
          OR is_read IS NULL
        )
    `).run(
      new Date().toISOString(),
      user.user_id
    );

    res.json({
      success: true
    });
  }
);

// -------------------------------------------------------------
// 23. REPORTS
// -------------------------------------------------------------

apiRouter.post(
  '/reports',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const {
      reported_user_id,
      session_id,
      category,
      description
    } = req.body;

    if (
      !category ||
      !description
    ) {
      res.status(400).json({
        error:
          'Category and description are required.'
      });
      return;
    }

    if (
      reported_user_id ===
      user.user_id
    ) {
      res.status(400).json({
        error:
          'You cannot report yourself.'
      });
      return;
    }

    if (
      reported_user_id
    ) {
      const reportedUser =
        db.prepare(`
          SELECT user_id
          FROM profiles
          WHERE user_id = ?
        `).get(
          reported_user_id
        );

      if (!reportedUser) {
        res.status(404).json({
          error:
            'Reported user not found.'
        });
        return;
      }
    }

    if (
      session_id
    ) {
      const session =
        getSessionById(
          session_id
        );

      if (!session) {
        res.status(404).json({
          error:
            'Session not found.'
        });
        return;
      }

      if (
        !isSessionParticipant(
          session,
          user.user_id
        )
      ) {
        res.status(403).json({
          error:
            'You cannot report this session.'
        });
        return;
      }
    }

    const reportId =
      crypto.randomUUID();

    db.prepare(`
      INSERT INTO reports (
        id,
        reporter_id,
        reported_user_id,
        session_id,
        category,
        description,
        status
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        'PENDING'
      )
    `).run(
      reportId,
      user.user_id,
      reported_user_id || null,
      session_id || null,
      String(category).trim(),
      String(description).trim()
    );

    res.status(201).json({
      success: true,
      report_id:
        reportId
    });
  }
);

// -------------------------------------------------------------
// MY REPORTS
// -------------------------------------------------------------

apiRouter.get(
  '/reports',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const reports =
      db.prepare(`
        SELECT
          r.*,
          p.full_name AS reported_user_name
        FROM reports r
        LEFT JOIN profiles p
          ON p.user_id =
             r.reported_user_id
        WHERE
          r.reporter_id = ?
        ORDER BY
          r.created_at DESC
      `).all(
        user.user_id
      );

    res.json({
      reports
    });
  }
);

// -------------------------------------------------------------
// 24. BLOCK USER
// -------------------------------------------------------------

apiRouter.post(
  '/blocks',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const {
      blocked_user_id
    } = req.body;

    if (
      !blocked_user_id
    ) {
      res.status(400).json({
        error:
          'blocked_user_id is required.'
      });
      return;
    }

    if (
      blocked_user_id ===
      user.user_id
    ) {
      res.status(400).json({
        error:
          'You cannot block yourself.'
      });
      return;
    }

    const blockedUser =
      db.prepare(`
        SELECT user_id
        FROM profiles
        WHERE user_id = ?
      `).get(
        blocked_user_id
      );

    if (!blockedUser) {
      res.status(404).json({
        error:
          'User not found.'
      });
      return;
    }

    db.prepare(`
      INSERT OR IGNORE INTO blocks (
        id,
        blocker_id,
        blocked_id
      )
      VALUES (
        ?,
        ?,
        ?
      )
    `).run(
      crypto.randomUUID(),
      user.user_id,
      blocked_user_id
    );

    res.status(201).json({
      success: true
    });
  }
);

// -------------------------------------------------------------
// MY BLOCKED USERS
// -------------------------------------------------------------

apiRouter.get(
  '/blocks',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const blocked =
      db.prepare(`
        SELECT
          b.*,
          p.full_name,
          p.profile_photo,
          p.city,
          p.state
        FROM blocks b
        JOIN profiles p
          ON p.user_id =
             b.blocked_id
        WHERE
          b.blocker_id = ?
        ORDER BY
          b.created_at DESC
      `).all(
        user.user_id
      );

    res.json({
      blocked
    });
  }
);

// -------------------------------------------------------------
// UNBLOCK USER
// -------------------------------------------------------------

apiRouter.delete(
  '/blocks/:userId',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    const result =
      db.prepare(`
        DELETE FROM blocks
        WHERE
          blocker_id = ?
          AND blocked_id = ?
      `).run(
        user.user_id,
        req.params.userId
      );

    if (
      Number(result.changes) === 0
    ) {
      res.status(404).json({
        error:
          'Block relationship not found.'
      });
      return;
    }

    res.json({
      success: true
    });
  }
);

// -------------------------------------------------------------
// 25. ADMIN ANALYTICS
// -------------------------------------------------------------

apiRouter.get(
  '/admin/analytics',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    if (
      user.role !==
      'ADMIN'
    ) {
      res.status(403).json({
        error:
          'Admin access required.'
      });
      return;
    }

    // ---------------------------------------------------------
    // USER COUNTS
    // ---------------------------------------------------------

    const totalUsers =
      db.prepare(`
        SELECT COUNT(*) AS count
        FROM profiles
      `).get() as any;

    const activeLearners =
      db.prepare(`
        SELECT COUNT(
          DISTINCT user_id
        ) AS count
        FROM user_skills
        WHERE
          skill_type = 'LEARN'
      `).get() as any;

    const activeSharers =
      db.prepare(`
        SELECT COUNT(
          DISTINCT user_id
        ) AS count
        FROM user_skills
        WHERE
          skill_type = 'SHARE'
      `).get() as any;

    // ---------------------------------------------------------
    // SESSION METRICS
    // ---------------------------------------------------------

    const sessionStats =
      db.prepare(`
        SELECT
          COUNT(*) AS total_sessions,

          SUM(
            CASE
              WHEN status = 'VERIFIED'
              THEN 1
              ELSE 0
            END
          ) AS completed_sessions,

          COALESCE(
            SUM(
              CASE
                WHEN status = 'VERIFIED'
                THEN verified_duration_seconds
                ELSE 0
              END
            ),
            0
          ) AS learning_seconds
        FROM sessions
      `).get() as any;

    // ---------------------------------------------------------
    // CREDITS
    // ---------------------------------------------------------

    const creditStats =
      db.prepare(`
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN amount > 0
                THEN amount
                ELSE 0
              END
            ),
            0
          ) AS earned,

          COALESCE(
            SUM(
              CASE
                WHEN amount < 0
                THEN ABS(amount)
                ELSE 0
              END
            ),
            0
          ) AS spent
        FROM credit_transactions
        WHERE
          status = 'COMPLETED'
      `).get() as any;

    // ---------------------------------------------------------
    // RATINGS
    // ---------------------------------------------------------

    const ratingStats =
      db.prepare(`
        SELECT
          COALESCE(
            AVG(overall_score),
            0
          ) AS average_rating,

          COUNT(*) AS total_ratings
        FROM ratings
      `).get() as any;

    // ---------------------------------------------------------
    // REPORTS
    // ---------------------------------------------------------

    const pendingReports =
      db.prepare(`
        SELECT COUNT(*) AS count
        FROM reports
        WHERE
          status = 'PENDING'
      `).get() as any;

    // ---------------------------------------------------------
    // POPULAR LEARNING SKILLS
    // ---------------------------------------------------------

    const popularSkills =
      db.prepare(`
        SELECT
          s.id,
          s.name,
          s.category,
          COUNT(
            DISTINCT us.user_id
          ) AS learner_count
        FROM user_skills us
        JOIN skills s
          ON s.id = us.skill_id
        WHERE
          us.skill_type = 'LEARN'
        GROUP BY
          s.id,
          s.name,
          s.category
        ORDER BY
          learner_count DESC
        LIMIT 10
      `).all();

    // ---------------------------------------------------------
    // POPULAR SHARING SKILLS
    // ---------------------------------------------------------

    const sharingSkills =
      db.prepare(`
        SELECT
          s.id,
          s.name,
          s.category,
          COUNT(
            DISTINCT us.user_id
          ) AS sharer_count
        FROM user_skills us
        JOIN skills s
          ON s.id = us.skill_id
        WHERE
          us.skill_type = 'SHARE'
        GROUP BY
          s.id,
          s.name,
          s.category
        ORDER BY
          sharer_count DESC
        LIMIT 10
      `).all();

    const learningHours =
      Number(
        sessionStats?.learning_seconds ||
        0
      ) / 3600;

    res.json({
      metrics: {
        total_users:
          Number(
            totalUsers?.count || 0
          ),

        active_learners:
          Number(
            activeLearners?.count || 0
          ),

        active_sharers:
          Number(
            activeSharers?.count || 0
          ),

        total_sessions:
          Number(
            sessionStats?.total_sessions ||
            0
          ),

        completed_sessions:
          Number(
            sessionStats?.completed_sessions ||
            0
          ),

        total_learning_hours:
          Math.round(
            learningHours * 100
          ) / 100,

        credits_earned:
          Number(
            creditStats?.earned || 0
          ),

        credits_spent:
          Number(
            creditStats?.spent || 0
          ),

        average_rating:
          Math.round(
            Number(
              ratingStats?.average_rating ||
              0
            ) * 100
          ) / 100,

        total_ratings:
          Number(
            ratingStats?.total_ratings ||
            0
          ),

        pending_reports:
          Number(
            pendingReports?.count ||
            0
          )
      },

      popular_skills:
        popularSkills,

      popular_sharing_skills:
        sharingSkills
    });
  }
);

// -------------------------------------------------------------
// 26. ADMIN USERS
// -------------------------------------------------------------

apiRouter.get(
  '/admin/users',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    if (
      user.role !==
      'ADMIN'
    ) {
      res.status(403).json({
        error:
          'Admin access required.'
      });
      return;
    }

    const {
      role,
      search,
      limit = '100',
      offset = '0'
    } = req.query;

    let query = `
      SELECT
        p.*,

        COALESCE(
          ts.score,
          85
        ) AS trust_score,

        COALESCE(
          ts.reliability_score,
          0
        ) AS reliability_score,

        COALESCE(
          tca.balance,
          0
        ) AS time_credit_balance

      FROM profiles p

      LEFT JOIN trust_scores ts
        ON ts.user_id =
           p.user_id

      LEFT JOIN time_credit_accounts tca
        ON tca.user_id =
           p.user_id

      WHERE 1 = 1
    `;

    const params: any[] = [];

    if (
      typeof role === 'string' &&
      role
    ) {
      query += `
        AND p.role = ?
      `;

      params.push(
        role
      );
    }

    if (
      typeof search === 'string' &&
      search.trim()
    ) {
      query += `
        AND (
          LOWER(
            p.full_name
          ) LIKE LOWER(?)

          OR LOWER(
            p.email
          ) LIKE LOWER(?)

          OR LOWER(
            p.city
          ) LIKE LOWER(?)
        )
      `;

      const searchValue =
        `%${search.trim()}%`;

      params.push(
        searchValue,
        searchValue,
        searchValue
      );
    }

    const safeLimit =
      Math.min(
        500,
        Math.max(
          1,
          Number(limit) || 100
        )
      );

    const safeOffset =
      Math.max(
        0,
        Number(offset) || 0
      );

    query += `
      ORDER BY
        p.created_at DESC
      LIMIT ?
      OFFSET ?
    `;

    params.push(
      safeLimit,
      safeOffset
    );

    const users =
      db.prepare(query)
        .all(...params);

    res.json({
      users,

      pagination: {
        limit:
          safeLimit,

        offset:
          safeOffset,

        returned:
          users.length
      }
    });
  }
);

// -------------------------------------------------------------
// 27. ADMIN REPORTS
// -------------------------------------------------------------

apiRouter.get(
  '/admin/reports',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    if (
      user.role !==
      'ADMIN'
    ) {
      res.status(403).json({
        error:
          'Admin access required.'
      });
      return;
    }

    const reports =
      db.prepare(`
        SELECT
          r.*,

          reporter.full_name
            AS reporter_name,

          reported.full_name
            AS reported_user_name

        FROM reports r

        JOIN profiles reporter
          ON reporter.user_id =
             r.reporter_id

        LEFT JOIN profiles reported
          ON reported.user_id =
             r.reported_user_id

        ORDER BY
          CASE
            WHEN r.status = 'PENDING'
            THEN 0
            ELSE 1
          END,

          r.created_at DESC
      `).all();

    res.json({
      reports
    });
  }
);

// -------------------------------------------------------------
// UPDATE ADMIN REPORT STATUS
// -------------------------------------------------------------

apiRouter.patch(
  '/admin/reports/:id',
  async (
    req: Request,
    res: Response
  ) => {
    const user =
      await getAuthenticatedUser(req);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized'
      });
      return;
    }

    if (
      user.role !==
      'ADMIN'
    ) {
      res.status(403).json({
        error:
          'Admin access required.'
      });
      return;
    }

    const {
      status,
      admin_notes
    } = req.body;

    const allowedStatuses = [
      'PENDING',
      'REVIEWING',
      'RESOLVED',
      'DISMISSED'
    ];

    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      res.status(400).json({
        error:
          'Invalid report status.'
      });
      return;
    }

    const result =
      db.prepare(`
        UPDATE reports
        SET
          status = ?,
          admin_notes = ?,
          reviewed_by = ?,
          reviewed_at = ?
        WHERE id = ?
      `).run(
        status,
        admin_notes || '',
        user.user_id,
        new Date().toISOString(),
        req.params.id
      );

    if (
      Number(result.changes) === 0
    ) {
      res.status(404).json({
        error:
          'Report not found.'
      });
      return;
    }

    res.json({
      success: true
    });
  }
);

// -------------------------------------------------------------
// 28. HEALTH CHECK
// -------------------------------------------------------------

apiRouter.get(
  '/health',
  async (
    req: Request,
    res: Response
  ) => {
    let database =
      'ok';

    try {
      db.prepare(
        'SELECT 1'
      ).get();
    } catch {
      database =
        'error';
    }

    res.json({
      status:
        database === 'ok'
          ? 'ok'
          : 'degraded',

      service:
        'LearnX Backend',

      database,

      timestamp:
        new Date().toISOString()
    });
  }
);

// -------------------------------------------------------------
// 29. API HEALTH CHECK
// -------------------------------------------------------------

apiRouter.get(
  '/v1/health',
  async (
    req: Request,
    res: Response
  ) => {
    let database =
      'ok';

    try {
      db.prepare(
        'SELECT 1'
      ).get();
    } catch {
      database =
        'error';
    }

    res.json({
      status:
        database === 'ok'
          ? 'ok'
          : 'degraded',

      service:
        'LearnX API',

      version:
        'v1',

      database,

      timestamp:
        new Date().toISOString()
    });
  }
);

// -------------------------------------------------------------
// 30. API 404 HANDLER
// -------------------------------------------------------------

apiRouter.use(
  (req: Request, res: Response) => {
    res.status(404).json({
      error: 'API endpoint not found.',
      path: req.originalUrl,
      method: req.method
    });
  }
);
export default apiRouter;