import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { db } from './db.ts';
import { supabaseAdmin, supabaseAnon } from './supabase.ts';
import { createLiveKitToken, LIVEKIT_URL } from './livekit.ts';
import { parseNaturalLanguageSearch, computeMatches, generateStructuredLearningPlan } from './ai.ts';

export const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (_req: Request, res: Response) => {
  try {
    const skillCount = (db.prepare('SELECT COUNT(*) as count FROM skills').get() as any)?.count ?? 0;
    res.json({ status: 'healthy', database: 'connected', skill_count: skillCount, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// V1 Skills alias
apiRouter.get('/v1/skills', (req: Request, res: Response) => {
  const { limit = '100', category, search } = req.query;
  let query = 'SELECT * FROM skills WHERE is_active = 1';
  const params: any[] = [];

  if (category && category !== 'All') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY name ASC LIMIT ?';
  params.push(Number(limit));

  const skills = db.prepare(query).all(...params);
  res.json({ success: true, skills });
});


// In-memory SSE clients for real-time multi-device sync
const sseClients = new Set<(event: string, data: any) => void>();

export function broadcastEvent(event: string, data: any) {
  for (const client of sseClients) {
    try {
      client(event, data);
    } catch {
      // client disconnected
    }
  }
}

// SSE stream endpoint
apiRouter.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sseClients.add(sendEvent);
  sendEvent('connected', { time: new Date().toISOString() });

  req.on('close', () => {
    sseClients.delete(sendEvent);
  });
});

// Real-time sync polling endpoint (fallback if SSE not supported)
apiRouter.get('/sync/events', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = user.user_id;
  const pendingRequests = db.prepare(`
    SELECT s.*, p.full_name as other_party_name, sk.name as skill_name
    FROM sessions s
    JOIN profiles p ON (p.user_id = CASE WHEN s.learner_id = ? THEN s.knowledge_sharer_id ELSE s.learner_id END)
    JOIN skills sk ON s.skill_id = sk.id
    WHERE (s.learner_id = ? OR s.knowledge_sharer_id = ?)
      AND s.updated_at > datetime('now', '-1 minute')
    ORDER BY s.updated_at DESC
  `).all(userId, userId, userId);

  const notifications = db.prepare(`
    SELECT * FROM notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC LIMIT 10
  `).all(userId);

  res.json({
    success: true,
    sessions: pendingRequests,
    notifications,
    timestamp: Date.now()
  });
});

// Helper: Extract current authenticated user
async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
    return null;
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  try {
    const { data, error } = await supabaseAnon.auth.getUser(token);

    if (error || !data.user) {
      return null;
    }

    const userId = data.user.id;

    const profile = db
      .prepare(`SELECT * FROM profiles WHERE user_id = ?`)
      .get(userId) as any;

    return profile || null;
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// 1. AUTHENTICATION & PROFILE
// -------------------------------------------------------------

type RegistrationRole = 'LEARNER' | 'KNOWLEDGE_SHARER';

/**
 * Register a new LearnX account.
 *
 * Authentication rules:
 * - Learner receives exactly one +5 welcome bonus.
 * - Knowledge Sharer receives 0 welcome credits.
 * - A real Supabase access token is returned when automatic sign-in succeeds.
 * - If automatic sign-in fails, registration still succeeds but requires_login=true.
 * - No fake/local session token is ever generated.
 */
async function registerAccount(
  req: Request,
  res: Response,
  fixedRole?: RegistrationRole
) {
  const {
    full_name,
    email,
    password,
    age_group,
    city,
    state,
    preferred_language,
    education_status,
    profile_photo,
    terms_accepted,
    role: requestedRole,
  } = req.body ?? {};

  const role: RegistrationRole | null = fixedRole ?? (
    requestedRole === 'LEARNER'
      ? 'LEARNER'
      : requestedRole === 'MENTOR' || requestedRole === 'KNOWLEDGE_SHARER'
        ? 'KNOWLEDGE_SHARER'
        : null
  );

  const cleanEmail =
    typeof email === 'string' ? email.trim().toLowerCase() : '';

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
    '55+',
  ];

  const allowedLanguages = [
    'English',
    'Tamil',
    'Hindi',
    'Telugu',
    'Malayalam',
    'Kannada',
    'Other',
  ];

  const allowedEducationStatuses = [
    'School Student',
    'College Student',
    'Graduate',
    'Working Professional',
    'Self-Employed',
    'Job Seeker',
    'Other',
  ];

  try {
    if (!role) {
      res.status(400).json({
        error: 'Choose Learner or Knowledge Sharer registration.',
      });
      return;
    }

    if (
      typeof full_name !== 'string' ||
      !full_name.trim() ||
      typeof email !== 'string' ||
      !email.trim() ||
      typeof age_group !== 'string' ||
      typeof city !== 'string' ||
      !city.trim() ||
      typeof state !== 'string' ||
      !state.trim() ||
      typeof preferred_language !== 'string' ||
      typeof education_status !== 'string'
    ) {
      res.status(400).json({
        error:
          'Full name, email, age group, city, state, preferred language, and education/work status are required.',
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400).json({ error: 'Enter a valid email address.' });
      return;
    }

    if (!passwordValid) {
      res.status(400).json({
        error:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      });
      return;
    }

    if (
      !allowedAgeGroups.includes(age_group) ||
      !allowedLanguages.includes(preferred_language) ||
      !allowedEducationStatuses.includes(education_status)
    ) {
      res.status(400).json({
        error:
          'Choose a valid age group, preferred language, and education/work status.',
      });
      return;
    }

    if (terms_accepted !== true) {
      res.status(400).json({
        error: 'Accept the Terms & Conditions and Privacy Policy to register.',
      });
      return;
    }

    // Check the local LearnX profile first.
    const existingProfile = db
      .prepare('SELECT id FROM profiles WHERE email = ?')
      .get(cleanEmail) as any;

    if (existingProfile) {
      res.status(409).json({
        error: 'An account with this email already exists.',
      });
      return;
    }

    // Create the real Supabase Auth account.
    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        app_metadata: {
          learnx_role: role,
        },
        user_metadata: {
          full_name: full_name.trim(),
          age_group,
          city: city.trim(),
          state: state.trim(),
          preferred_language,
          education_status,
        },
      });

    if (createError || !created.user) {
      const duplicateEmail = /already|registered|exists/i.test(
        createError?.message || ''
      );

      res.status(duplicateEmail ? 409 : 400).json({
        error: duplicateEmail
          ? 'An account with this email already exists.'
          : createError?.message || 'Supabase account creation failed.',
      });
      return;
    }

    const supabaseUserId = created.user.id;
    const acceptedAt = new Date().toISOString();
    let welcomeBonus = 0;

    try {
      db.exec('BEGIN IMMEDIATE');

      // Create LearnX profile.
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)
      `).run(
        supabaseUserId,
        supabaseUserId,
        full_name.trim(),
        cleanEmail,
        age_group,
        city.trim(),
        state.trim(),
        preferred_language,
        education_status,
        typeof profile_photo === 'string' ? profile_photo.trim() : '',
        role,
        acceptedAt
      );

      // Every account gets exactly one wallet.
      db.prepare(`
        INSERT OR IGNORE INTO time_credit_accounts
          (id, user_id, balance, total_earned, total_spent)
        VALUES (?, ?, 0, 0, 0)
      `).run(`tc-${supabaseUserId}`, supabaseUserId);

      // ONLY a new Learner receives the +5 welcome bonus.
      // The deterministic transaction ID makes this operation idempotent.
      if (role === 'LEARNER') {
        const welcomeTransactionId = `welcome-${supabaseUserId}`;

        const bonus = db
          .prepare(`
            INSERT OR IGNORE INTO credit_transactions
              (id, user_id, amount, transaction_type, status, description)
            VALUES (?, ?, 5, 'WELCOME_BONUS', 'COMPLETED', 'New Learner Welcome Bonus')
          `)
          .run(welcomeTransactionId, supabaseUserId);

        if (Number(bonus.changes) === 1) {
          db.prepare(`
            UPDATE time_credit_accounts
            SET
              balance = balance + 5,
              total_earned = total_earned + 5,
              updated_at = ?
            WHERE user_id = ?
          `).run(acceptedAt, supabaseUserId);

          welcomeBonus = 5;
        }
      }

      // Default availability. This is reference/default state only;
      // no fake sessions or activity are created.
      db.prepare(`
        INSERT OR IGNORE INTO user_availability
          (id, user_id, status, available_from, available_until)
        VALUES (?, ?, 'ACTIVE', '18:00:00', '21:00:00')
      `).run(`av-${supabaseUserId}`, supabaseUserId);

      // Initial trust/reliability record. It does not represent a rating
      // or completed session and does not create activity history.
      db.prepare(`
        INSERT OR IGNORE INTO trust_scores
          (id, user_id, score, reliability_score, verification_level)
        VALUES (?, ?, 85, 90, 'COMMUNITY_VERIFIED')
      `).run(`ts-${supabaseUserId}`, supabaseUserId);

      db.prepare(`
        INSERT INTO notifications
          (id, user_id, title, message, type, link)
        VALUES (?, ?, ?, ?, 'SYSTEM', '/onboarding')
      `).run(
        crypto.randomUUID(),
        supabaseUserId,
        'Welcome to LearnX!',
        'Complete your onboarding to personalize your experience.'
      );

      db.prepare(`
        INSERT INTO audit_logs
          (id, actor_id, action, target_type, target_id, details_json)
        VALUES (?, ?, 'USER_REGISTER', 'USER', ?, ?)
      `).run(
        crypto.randomUUID(),
        supabaseUserId,
        supabaseUserId,
        JSON.stringify({ email: cleanEmail, role })
      );

      db.exec('COMMIT');
    } catch (databaseError) {
      db.exec('ROLLBACK');

      // Keep Supabase and the LearnX local database consistent.
      await supabaseAdmin.auth.admin.deleteUser(supabaseUserId).catch(() => {});

      throw databaseError;
    }

    // Automatically sign in with Supabase so the frontend receives
    // a REAL access token immediately after registration.
    let accessToken: string | null = null;

    try {
      const signedIn = await supabaseAnon.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!signedIn.error && signedIn.data.session?.access_token) {
        accessToken = signedIn.data.session.access_token;
      }
    } catch {
      accessToken = null;
    }

    const profile = db
      .prepare('SELECT * FROM profiles WHERE user_id = ?')
      .get(supabaseUserId) as any;

    const wallet = db
      .prepare('SELECT * FROM time_credit_accounts WHERE user_id = ?')
      .get(supabaseUserId) as any;

    const authenticated = Boolean(accessToken);

    res.status(201).json({
      success: true,
      message: authenticated
        ? 'Registration successful.'
        : 'Registration successful. Please log in to continue.',
      user_id: supabaseUserId,
      role,
      welcome_bonus: welcomeBonus,
      balance: wallet?.balance ?? 0,
      email_confirmed: true,
      authenticated,
      requires_login: !authenticated,
      token: accessToken,
      user: {
        id: profile.user_id,
        user_id: profile.user_id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        is_email_verified: true,
        onboarding_completed: false,
        preferred_language: profile.preferred_language,
        city: profile.city,
        state: profile.state,
        profile_photo: profile.profile_photo,
        wallet_balance: wallet?.balance ?? 0,
        total_earned_credits: wallet?.total_earned ?? 0,
        total_spent_credits: wallet?.total_spent ?? 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      error: err?.message || 'Failed to complete registration.',
    });
  }
}

apiRouter.post('/auth/register', async (req: Request, res: Response) =>
  registerAccount(req, res)
);

apiRouter.post('/auth/register/learner', async (req: Request, res: Response) =>
  registerAccount(req, res, 'LEARNER')
);

apiRouter.post('/auth/register/mentor', async (req: Request, res: Response) =>
  registerAccount(req, res, 'KNOWLEDGE_SHARER')
);

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    let authData: any;
    try {
      const authRes = await supabaseAnon.auth.signInWithPassword({
        email: cleanEmail,
        password
      });
      if (authRes.error || !authRes.data.session) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }
      authData = authRes.data;
    } catch {
      res.status(503).json({ error: 'Authentication service is unavailable.' });
      return;
    }

    let profile = db.prepare('SELECT * FROM profiles WHERE email = ?').get(cleanEmail) as any;
    if (!profile && authData.user) {
      const u = authData.user;
      const meta = u.user_metadata || {};
      const requestedRole = u.app_metadata?.learnx_role;
      const profileRole = requestedRole === 'KNOWLEDGE_SHARER' ? 'KNOWLEDGE_SHARER' : 'LEARNER';
      db.prepare(`
        INSERT INTO profiles (
          id, user_id, full_name, email, age_group, city, state, preferred_language, role, is_email_verified, onboarding_completed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        u.id,
        u.id,
        meta.full_name || cleanEmail.split('@')[0],
        cleanEmail,
        meta.age_group || '18-24',
        meta.city || '',
        meta.state || '',
        meta.preferred_language || 'English',
        cleanEmail === 'rathikasris28@gmail.com' ? 'ADMIN' : profileRole,
        u.confirmed_at ? 1 : 0
      );
      profile = db.prepare(`SELECT * FROM profiles WHERE user_id = ?`).get(u.id);
    }
    if (!profile) {
      res.status(401).json({ error: 'Account profile is unavailable.' });
      return;
    }

    // Ensure wallet exists
    db.prepare(`INSERT OR IGNORE INTO time_credit_accounts (id, user_id, balance, total_earned, total_spent) VALUES (?, ?, 0, 0, 0)`)
      .run('tc-' + profile.user_id, profile.user_id);

    const wallet = db.prepare(`SELECT * FROM time_credit_accounts WHERE user_id = ?`).get(profile.user_id) as any;
    const availability = db.prepare(`SELECT * FROM user_availability WHERE user_id = ?`).get(profile.user_id) as any;

    res.json({
      success: true,
      user: {
        id: profile.user_id,
        user_id: profile.user_id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        is_email_verified: profile.is_email_verified === 1,
        onboarding_completed: profile.onboarding_completed === 1,
        total_earned_credits: wallet?.total_earned ?? 0,
        total_spent_credits: wallet?.total_spent ?? 0,
        preferred_language: profile.preferred_language,
        city: profile.city,
        state: profile.state,
        profile_photo: profile.profile_photo,
        bio: profile.bio,
        wallet_balance: wallet?.balance ?? 0,
        availability: availability?.status ?? 'ACTIVE'
      },
      authenticated: true,
      token: authData.session.access_token
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

apiRouter.post('/auth/verify-email', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { user_id, email } = req.body;
  if ((user_id && user_id !== user.user_id) || (email && email.toLowerCase() !== user.email.toLowerCase())) {
    res.status(403).json({ error: 'You can only verify your own account.' });
    return;
  }
  db.prepare('UPDATE profiles SET is_email_verified = 1 WHERE user_id = ?').run(user.user_id);
  res.json({ success: true, message: 'Email verified successfully.' });
});

apiRouter.post('/auth/resend-verification', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required.' });
    return;
  }
  try {
    await supabaseAnon.auth.resend({
      type: 'signup',
      email: email.toLowerCase()
    });
  } catch {
    // handled
  }
  res.json({ success: true, message: 'Verification link resent to your email address.' });
});

apiRouter.get('/auth/me', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'This endpoint requires a valid Bearer token' });
    return;
  }

  const wallet = db.prepare(`SELECT * FROM time_credit_accounts WHERE user_id = ?`).get(user.user_id) as any;
  const availability = db.prepare(`SELECT * FROM user_availability WHERE user_id = ?`).get(user.user_id) as any;
  const learnSkills = db.prepare(`
    SELECT s.id, s.name, s.category, us.skill_level
    FROM user_skills us JOIN skills s ON us.skill_id = s.id
    WHERE us.user_id = ? AND us.skill_type = 'LEARN'
  `).all(user.user_id);
  const shareSkills = db.prepare(`
    SELECT s.id, s.name, s.category, us.skill_level
    FROM user_skills us JOIN skills s ON us.skill_id = s.id
    WHERE us.user_id = ? AND us.skill_type = 'SHARE'
  `).all(user.user_id);

  const unreadNotifs = (db.prepare(`SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`).get(user.user_id) as any)?.count ?? 0;

  res.json({
    user: {
      ...user,
      is_email_verified: user.is_email_verified === 1,
      onboarding_completed: user.onboarding_completed === 1,
      wallet_balance: wallet?.balance ?? 0,
      total_earned_credits: wallet?.total_earned ?? 0,
      total_spent_credits: wallet?.total_spent ?? 0,
      availability: availability?.status ?? 'ACTIVE',
      available_from: availability?.available_from ?? '18:00:00',
      available_until: availability?.available_until ?? '21:00:00',
      learn_skills: learnSkills,
      share_skills: shareSkills,
      unread_notifications_count: unreadNotifs
    }
  });
});

// Update Profile
apiRouter.put('/profile', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { full_name, mobile, city, state, preferred_language, education_status, bio, profile_photo } = req.body;

  db.prepare(`
    UPDATE profiles SET
      full_name = COALESCE(?, full_name),
      mobile = COALESCE(?, mobile),
      city = COALESCE(?, city),
      state = COALESCE(?, state),
      preferred_language = COALESCE(?, preferred_language),
      education_status = COALESCE(?, education_status),
      bio = COALESCE(?, bio),
      profile_photo = COALESCE(?, profile_photo),
      updated_at = datetime('now')
    WHERE user_id = ?
  `).run(full_name, mobile, city, state, preferred_language, education_status, bio, profile_photo, user.user_id);

  res.json({ success: true, message: 'Profile updated successfully.' });
});

// View Public Profile
apiRouter.get('/profile/:id', (req: Request, res: Response) => {
  const profileId = req.params.id;
  const profile = db.prepare(`
    SELECT user_id, full_name, email, city, state, preferred_language, education_status, profile_photo, bio, role, created_at
    FROM profiles WHERE user_id = ?
  `).get(profileId) as any;

  if (!profile) {
    res.status(404).json({ error: 'User profile not found.' });
    return;
  }

  const learnSkills = db.prepare(`
    SELECT s.id, s.name, s.category, us.skill_level
    FROM user_skills us JOIN skills s ON us.skill_id = s.id
    WHERE us.user_id = ? AND us.skill_type = 'LEARN'
  `).all(profileId);

  const shareSkills = db.prepare(`
    SELECT s.id, s.name, s.category, us.skill_level
    FROM user_skills us JOIN skills s ON us.skill_id = s.id
    WHERE us.user_id = ? AND us.skill_type = 'SHARE'
  `).all(profileId);

  const trustScore = db.prepare(`SELECT * FROM trust_scores WHERE user_id = ?`).get(profileId) as any;
  const availability = db.prepare(`SELECT * FROM user_availability WHERE user_id = ?`).get(profileId) as any;
  const ratings = db.prepare(`
    SELECT r.*, p.full_name as rater_name
    FROM ratings r JOIN profiles p ON r.rater_id = p.user_id
    WHERE r.ratee_id = ? ORDER BY r.created_at DESC LIMIT 10
  `).all(profileId);

  const avgRating = (db.prepare(`SELECT AVG(overall_score) as avg, COUNT(*) as count FROM ratings WHERE ratee_id = ?`).get(profileId) as any);

  res.json({
    profile: {
      ...profile,
      learn_skills: learnSkills,
      share_skills: shareSkills,
      trust_score: trustScore?.score ?? 85,
      reliability_score: trustScore?.reliability_score ?? 90,
      verification_level: trustScore?.verification_level ?? 'COMMUNITY_VERIFIED',
      availability_status: availability?.status ?? 'ACTIVE',
      available_from: availability?.available_from ?? '18:00:00',
      available_until: availability?.available_until ?? '21:00:00',
      rating_avg: avgRating?.avg ? Number(avgRating.avg).toFixed(1) : '5.0',
      rating_count: avgRating?.count ?? 0,
      recent_reviews: ratings
    }
  });
});

// -------------------------------------------------------------
// 2. ONBOARDING
// -------------------------------------------------------------

apiRouter.post('/onboarding', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const {
    learn_skills, share_skills, availability, bio, learning_goal, target_skill_level,
    learning_schedule, learning_interests, preferred_language, mentor_experience, mentor_languages
  } = req.body;
  const isMentor = user.role === 'KNOWLEDGE_SHARER';

  if (!isMentor && (!Array.isArray(learn_skills) || learn_skills.length === 0 || typeof learning_goal !== 'string' || !learning_goal.trim())) {
    res.status(400).json({ error: 'Select at least one learning skill and provide a learning goal.' });
    return;
  }
  if (isMentor && (!Array.isArray(share_skills) || share_skills.length === 0)) {
    res.status(400).json({ error: 'Select at least one skill you can share.' });
    return;
  }

  // Insert learning skills
  if (!isMentor && Array.isArray(learn_skills)) {
    const insertLearn = db.prepare("INSERT OR REPLACE INTO user_skills (id, user_id, skill_id, skill_type, skill_level) VALUES (?, ?, ?, 'LEARN', ?)");
    for (const ls of learn_skills) {
      if (ls.skill_id && ls.level) {
        insertLearn.run(crypto.randomUUID(), user.user_id, ls.skill_id, ls.level);
        // Also ensure learning progress record exists
        db.prepare(`INSERT OR IGNORE INTO learning_progress (id, user_id, skill_id, progress_percentage) VALUES (?, ?, ?, 0)`)
          .run(crypto.randomUUID(), user.user_id, ls.skill_id);
        db.prepare(`
          INSERT INTO learning_goals (id, user_id, skill_id, goal_text, target_level, preferred_schedule)
          SELECT ?, ?, ?, ?, ?, ?
          WHERE NOT EXISTS (SELECT 1 FROM learning_goals WHERE user_id = ? AND skill_id = ? AND goal_text = ?)
        `).run(
          crypto.randomUUID(), user.user_id, ls.skill_id, learning_goal.trim(), target_skill_level || 'INTERMEDIATE',
          learning_schedule || '', user.user_id, ls.skill_id, learning_goal.trim()
        );
      }
    }
  }

  // Insert sharing skills
  if (isMentor && Array.isArray(share_skills)) {
    const insertShare = db.prepare(`
      INSERT INTO user_skills (id, user_id, skill_id, skill_type, skill_level, experience, languages_json, skill_description, beginner_friendly, skill_proof)
      VALUES (?, ?, ?, 'SHARE', ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, skill_id, skill_type) DO UPDATE SET
        skill_level = excluded.skill_level, experience = excluded.experience, languages_json = excluded.languages_json,
        skill_description = excluded.skill_description, beginner_friendly = excluded.beginner_friendly, skill_proof = excluded.skill_proof
    `);
    for (const ss of share_skills) {
      const skillExists = ss.skill_id && db.prepare('SELECT id FROM skills WHERE id = ? AND is_active = 1').get(ss.skill_id);
      if (skillExists && ['BEGINNER', 'ELEMENTARY', 'INTERMEDIATE', 'ADVANCED'].includes(ss.level)
        && typeof ss.experience === 'string' && ss.experience.trim()
        && typeof ss.description === 'string' && ss.description.trim()
        && Array.isArray(ss.languages) && ss.languages.length > 0) {
        insertShare.run(
          crypto.randomUUID(), user.user_id, ss.skill_id, ss.level, ss.experience.trim(),
          JSON.stringify(ss.languages), ss.description.trim(), ss.beginner_friendly ? 1 : 0,
          typeof ss.skill_proof === 'string' ? ss.skill_proof.trim() : ''
        );
      } else {
        res.status(400).json({ error: 'Complete each mentor skill’s level, experience, language, and description.' });
        return;
      }
    }
  }

  // Update availability
  if (availability) {
    db.prepare(`
      INSERT INTO user_availability (id, user_id, status, available_from, available_until)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        status = excluded.status,
        available_from = excluded.available_from,
        available_until = excluded.available_until,
        updated_at = datetime('now')
    `).run(
      crypto.randomUUID(),
      user.user_id,
      availability.status || 'ACTIVE',
      availability.available_from || '18:00:00',
      availability.available_until || '21:00:00'
    );
  }

  // Mark onboarding complete
  db.prepare(`
    UPDATE profiles SET onboarding_completed = 1, bio = COALESCE(?, bio),
      learning_goal = CASE WHEN role = 'LEARNER' THEN ? ELSE learning_goal END,
      target_skill_level = CASE WHEN role = 'LEARNER' THEN ? ELSE target_skill_level END,
      learning_schedule = CASE WHEN role = 'LEARNER' THEN ? ELSE learning_schedule END,
      learning_interests_json = CASE WHEN role = 'LEARNER' THEN ? ELSE learning_interests_json END,
      preferred_language = COALESCE(?, preferred_language),
      mentor_experience = CASE WHEN role = 'KNOWLEDGE_SHARER' THEN ? ELSE mentor_experience END,
      mentor_languages_json = CASE WHEN role = 'KNOWLEDGE_SHARER' THEN ? ELSE mentor_languages_json END
    WHERE user_id = ?
  `).run(
    bio || null,
    typeof learning_goal === 'string' ? learning_goal.trim() : null,
    target_skill_level || null,
    learning_schedule || null,
    JSON.stringify(Array.isArray(learning_interests) ? learning_interests : typeof learning_interests === 'string' ? learning_interests.split(',').map((item: string) => item.trim()).filter(Boolean) : []),
    preferred_language || null,
    typeof mentor_experience === 'string' ? mentor_experience.trim() : null,
    JSON.stringify(Array.isArray(mentor_languages) ? mentor_languages : []),
    user.user_id
  );

  res.json({ success: true, message: 'Onboarding completed successfully!' });
});

// -------------------------------------------------------------
// 3. SKILL CATALOG & NATURAL LANGUAGE SEARCH
// -------------------------------------------------------------

apiRouter.get('/skills', (req: Request, res: Response) => {
  const { category, search } = req.query;
  let query = 'SELECT * FROM skills WHERE is_active = 1';
  const params: any[] = [];

  if (category && category !== 'All') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY name ASC';
  const skills = db.prepare(query).all(...params);

  // Add counts of active sharers
  const skillsWithCounts = skills.map((s: any) => {
    const sharersCount = (db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count FROM user_skills WHERE skill_id = ? AND skill_type = 'SHARE'
    `).get(s.id) as any)?.count ?? 0;
    return { ...s, sharers_count: sharersCount };
  });

  res.json({ skills: skillsWithCounts });
});

apiRouter.get('/skills/:id', (req: Request, res: Response) => {
  const skill = db.prepare(`SELECT * FROM skills WHERE id = ?`).get(req.params.id) as any;
  if (!skill) {
    res.status(404).json({ error: 'Skill not found' });
    return;
  }

  // Find active sharers for this skill
  const sharers = db.prepare(`
    SELECT p.user_id, p.full_name, p.profile_photo, p.city, p.state, p.preferred_language, us.skill_level,
           COALESCE(ua.status, 'INACTIVE') as availability_status,
           COALESCE(ua.available_from, '18:00:00') as available_from,
           COALESCE(ua.available_until, '21:00:00') as available_until,
           COALESCE(ts.score, 85) as trust_score
    FROM user_skills us
    JOIN profiles p ON us.user_id = p.user_id
    LEFT JOIN user_availability ua ON p.user_id = ua.user_id
    LEFT JOIN trust_scores ts ON p.user_id = ts.user_id
    WHERE us.skill_id = ? AND us.skill_type = 'SHARE'
  `).all(skill.id);

  // Find quizzes available for this skill
  const quizzes = db.prepare(`SELECT * FROM quizzes WHERE skill_id = ?`).all(skill.id);

  res.json({ skill, sharers, quizzes });
});

// Natural Language AI Search
apiRouter.post('/search/nl', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  const currentUserId = user ? user.user_id : 'anonymous';

  const { query } = req.body;

  if (!query || typeof query !== 'string') {
    res.status(400).json({ error: 'Search query is required' });
    return;
  }

  const parsed = await parseNaturalLanguageSearch(query);
  const matches = computeMatches({
    learner_id: currentUserId,
    skill_name: parsed.skill_name,
    level: parsed.level,
    language: parsed.language,
    time: parsed.preferred_time
  });

  res.json({
    parsed_parameters: parsed,
    total_results: matches.length,
    results: matches
  });
});

// AI Matching Recommendations
apiRouter.get('/matching', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  const currentUserId = user ? user.user_id : 'anonymous';
  const { skill_id, skill_name, level, language, time } = req.query;

  const matches = computeMatches({
    learner_id: currentUserId,
    skill_id: skill_id as string,
    skill_name: skill_name as string,
    level: level as string,
    language: language as string,
    time: time as string
  });

  res.json({
    total: matches.length,
    matches
  });
});

// -------------------------------------------------------------
// 4. AVAILABILITY SYSTEM
// -------------------------------------------------------------

apiRouter.get('/availability', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const availability = db.prepare(`SELECT * FROM user_availability WHERE user_id = ?`).get(user.user_id);
  res.json({ availability: availability || { status: 'ACTIVE', available_from: '18:00:00', available_until: '21:00:00' } });
});

apiRouter.post('/availability', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { status, available_from, available_until, days_of_week } = req.body;
  if (!status || !['ACTIVE', 'INACTIVE', 'IN_CLASS'].includes(status)) {
    res.status(400).json({ error: 'Status must be ACTIVE, INACTIVE, or IN_CLASS' });
    return;
  }

  db.prepare(`
    INSERT INTO user_availability (id, user_id, status, available_from, available_until, days_of_week)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      status = excluded.status,
      available_from = excluded.available_from,
      available_until = excluded.available_until,
      days_of_week = excluded.days_of_week,
      updated_at = datetime('now')
  `).run(
    crypto.randomUUID(),
    user.user_id,
    status,
    available_from || '18:00:00',
    available_until || '21:00:00',
    days_of_week ? JSON.stringify(days_of_week) : '["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]'
  );

  broadcastEvent('availability_updated', { user_id: user.user_id, status });
  res.json({ success: true, message: 'Availability schedule saved.' });
});

// -------------------------------------------------------------
// 5. SESSION BOOKING & LIFECYCLE
// -------------------------------------------------------------

apiRouter.get('/sessions', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const sessions = db.prepare(`
    SELECT s.*,
           sk.name as skill_name,
           sk.category as skill_category,
           l.full_name as learner_name,
           l.profile_photo as learner_photo,
           l.email as learner_email,
           ks.full_name as sharer_name,
           ks.profile_photo as sharer_photo,
           ks.email as sharer_email
    FROM sessions s
    JOIN skills sk ON s.skill_id = sk.id
    JOIN profiles l ON s.learner_id = l.user_id
    JOIN profiles ks ON s.knowledge_sharer_id = ks.user_id
    WHERE s.learner_id = ? OR s.knowledge_sharer_id = ?
    ORDER BY s.session_date DESC, s.start_time DESC
  `).all(user.user_id, user.user_id);

  res.json({ sessions });
});

apiRouter.get('/sessions/:id', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const session = db.prepare(`
    SELECT s.*,
           sk.name as skill_name,
           sk.category as skill_category,
           l.full_name as learner_name,
           l.profile_photo as learner_photo,
           l.email as learner_email,
           ks.full_name as sharer_name,
           ks.profile_photo as sharer_photo,
           ks.email as sharer_email
    FROM sessions s
    JOIN skills sk ON s.skill_id = sk.id
    JOIN profiles l ON s.learner_id = l.user_id
    JOIN profiles ks ON s.knowledge_sharer_id = ks.user_id
    WHERE s.id = ? AND (s.learner_id = ? OR s.knowledge_sharer_id = ? OR ? = 'ADMIN')
  `).get(req.params.id, user.user_id, user.user_id, user.role);

  if (!session) {
    res.status(404).json({ error: 'Session not found or access denied.' });
    return;
  }

  res.json({ session });
});

// Book / Request a Session
apiRouter.post('/sessions/request', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { knowledge_sharer_id, skill_id, session_date, start_time, end_time, learning_goal } = req.body;

  if (!knowledge_sharer_id || !skill_id || !session_date || !start_time || !learning_goal) {
    res.status(400).json({ error: 'Missing required session parameters.' });
    return;
  }

  if (knowledge_sharer_id === user.user_id) {
    res.status(400).json({ error: 'You cannot book a session with yourself.' });
    return;
  }

  // Prevent double booking for knowledge sharer at that date and time
  const conflict = db.prepare(`
    SELECT id FROM sessions
    WHERE knowledge_sharer_id = ?
      AND session_date = ?
      AND start_time = ?
      AND status IN ('ACCEPTED', 'IN_PROGRESS')
  `).get(knowledge_sharer_id, session_date, start_time);

  if (conflict) {
    res.status(409).json({ error: 'Knowledge sharer is already scheduled for that time slot.' });
    return;
  }

  const sessionId = crypto.randomUUID();
  const roomId = `learnx-session-${sessionId}`;

  db.prepare(`
    INSERT INTO sessions (
      id, learner_id, knowledge_sharer_id, skill_id, session_date, start_time, end_time,
      duration_minutes, status, learning_goal, room_id, meeting_provider, meet_link, session_stage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 60, 'REQUESTED', ?, ?, 'BUILTIN', '', 'REQUESTED')
  `).run(
    sessionId,
    user.user_id,
    knowledge_sharer_id,
    skill_id,
    session_date,
    start_time,
    end_time || '19:00:00',
    learning_goal,
    roomId
  );

  // Send real notification to Knowledge Sharer
  const skill = db.prepare(`SELECT name FROM skills WHERE id = ?`).get(skill_id) as any;
  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, link)
    VALUES (?, ?, ?, ?, 'SESSION_REQUEST', ?)
  `).run(
    crypto.randomUUID(),
    knowledge_sharer_id,
    'New Learning Request!',
    `${user.full_name} has requested a 1-on-1 LearnX session for ${skill?.name || 'a skill'} on ${session_date} at ${start_time}.`,
    `/sessions`
  );

  // Broadcast event across devices
  broadcastEvent('session_created', { sessionId, learnerId: user.user_id, sharerId: knowledge_sharer_id });

  res.status(201).json({
    success: true,
    message: 'Session request sent successfully! Awaiting knowledge sharer confirmation.',
    session_id: sessionId,
    room_id: roomId,
    meeting_provider: 'BUILTIN'
  });
});

// Sharer accepts request
apiRouter.post('/sessions/:id/accept', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const session = db.prepare(`SELECT * FROM sessions WHERE id = ? AND knowledge_sharer_id = ?`).get(req.params.id, user.user_id) as any;
  if (!session) {
    res.status(404).json({ error: 'Session request not found.' });
    return;
  }

  db.prepare("UPDATE sessions SET status = 'ACCEPTED', session_stage = 'SCHEDULED', updated_at = datetime('now') WHERE id = ?").run(session.id);

  // Notify learner
  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, link)
    VALUES (?, ?, 'Session Accepted!', ?, 'SESSION_ACCEPTED', ?)
  `).run(
    crypto.randomUUID(),
    session.learner_id,
    `${user.full_name} accepted your session on ${session.session_date} at ${session.start_time}.`,
    `/session-room/${session.id}`
  );

  broadcastEvent('session_updated', { sessionId: session.id, status: 'ACCEPTED' });
  res.json({ success: true, message: 'Session accepted and scheduled.' });
});

// Sharer rejects request
apiRouter.post('/sessions/:id/reject', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const session = db.prepare(`SELECT * FROM sessions WHERE id = ? AND knowledge_sharer_id = ?`).get(req.params.id, user.user_id) as any;
  if (!session) {
    res.status(404).json({ error: 'Session request not found.' });
    return;
  }

  db.prepare("UPDATE sessions SET status = 'REJECTED', session_stage = 'REJECTED', updated_at = datetime('now') WHERE id = ?").run(session.id);

  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, link)
    VALUES (?, ?, 'Session Request Declined', 'Your session request was declined by the knowledge sharer.', '/discover')
  `).run(crypto.randomUUID(), session.learner_id);

  broadcastEvent('session_updated', { sessionId: session.id, status: 'REJECTED' });
  res.json({ success: true, message: 'Session declined.' });
});

// Cancel session
apiRouter.post('/sessions/:id/cancel', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const session = db.prepare(`SELECT * FROM sessions WHERE id = ? AND (learner_id = ? OR knowledge_sharer_id = ?)`).get(req.params.id, user.user_id, user.user_id) as any;
  if (!session) {
    res.status(404).json({ error: 'Session not found.' });
    return;
  }

  db.prepare("UPDATE sessions SET status = 'CANCELLED', session_stage = 'CANCELLED', updated_at = datetime('now') WHERE id = ?").run(session.id);

  const otherId = session.learner_id === user.user_id ? session.knowledge_sharer_id : session.learner_id;
  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, link)
    VALUES (?, ?, 'Session Cancelled', ?, '/sessions')
  `).run(
    crypto.randomUUID(),
    otherId,
    `The session on ${session.session_date} was cancelled by ${user.full_name}.`
  );

  broadcastEvent('session_updated', { sessionId: session.id, status: 'CANCELLED' });
  res.json({ success: true, message: 'Session cancelled.' });
});

// Join the internal room. The session ID, not a client-provided room, determines the LiveKit room.
apiRouter.post('/sessions/:id/join', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const session = db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(req.params.id) as any;
  if (!session) {
    res.status(404).json({ error: 'Session not found.' });
    return;
  }

  const isLearner = session.learner_id === user.user_id;
  const isSharer = session.knowledge_sharer_id === user.user_id;
  if (!isLearner && !isSharer) {
    res.status(403).json({ error: 'Not authorized for this session.' });
    return;
  }

  if (!['ACCEPTED', 'IN_PROGRESS'].includes(session.status) || session.ended_at) {
    res.status(409).json({ error: 'This session is not open for joining.' });
    return;
  }

  try {
    const roomName = `learnx-session-${session.id}`;
    const token = await createLiveKitToken({
      roomName,
      participantIdentity: user.user_id,
      participantName: user.full_name
    });

    res.json({
      token,
      livekit_url: LIVEKIT_URL,
      room_name: roomName,
      session
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Unable to join the LearnX session room.' });
  }
});

apiRouter.post('/sessions/:id/connected', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id) as any;
  if (!session) {
    res.status(404).json({ error: 'Session not found.' });
    return;
  }
  const isLearner = session.learner_id === user.user_id;
  if (!isLearner && session.knowledge_sharer_id !== user.user_id) {
    res.status(403).json({ error: 'Not authorized for this session.' });
    return;
  }
  if (!['ACCEPTED', 'IN_PROGRESS'].includes(session.status) || session.ended_at) {
    res.status(409).json({ error: 'This session is not open for participant connections.' });
    return;
  }

  const connectedAt = new Date().toISOString();
  const joinedField = isLearner ? 'learner_joined_at' : 'sharer_joined_at';
  db.prepare(`UPDATE sessions SET ${joinedField} = COALESCE(${joinedField}, ?), updated_at = ? WHERE id = ?`)
    .run(connectedAt, connectedAt, session.id);
  const connectedSession = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id) as any;
  if (connectedSession.learner_joined_at && connectedSession.sharer_joined_at && !connectedSession.started_at) {
    db.prepare(`
      UPDATE sessions
      SET status = 'IN_PROGRESS', session_stage = 'STARTED', started_at = ?, updated_at = ?
      WHERE id = ? AND started_at IS NULL
    `).run(connectedAt, connectedAt, session.id);
    db.prepare("UPDATE user_availability SET status = 'IN_CLASS', updated_at = datetime('now') WHERE user_id = ?")
      .run(session.knowledge_sharer_id);
    broadcastEvent('session_updated', { sessionId: session.id, status: 'IN_PROGRESS', session_stage: 'STARTED' });
  }
  res.json({ success: true, session: db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id) });
});

// -------------------------------------------------------------
// 7. SESSION COMPLETION & TIME CREDIT TRANSACTION
// -------------------------------------------------------------

apiRouter.post('/sessions/:id/end', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const session = db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(req.params.id) as any;

  if (!session) {
    res.status(404).json({ error: 'Session not found.' });
    return;
  }

  if (session.learner_id !== user.user_id && session.knowledge_sharer_id !== user.user_id) {
    res.status(403).json({ error: 'Not authorized for this session.' });
    return;
  }

  if (!session.started_at || !['STARTED', 'COMPLETED'].includes(session.session_stage)) {
    res.status(409).json({ error: 'The session has not started.' });
    return;
  }

  if (!session.ended_at) {
    const endedAt = new Date().toISOString();
    db.prepare(`
      UPDATE sessions SET ended_at = ?, session_stage = 'COMPLETED', updated_at = ?
      WHERE id = ? AND ended_at IS NULL
    `).run(endedAt, endedAt, session.id);
    broadcastEvent('session_updated', { sessionId: session.id, session_stage: 'COMPLETED' });
  }

  res.json({ success: true, ended_at: session.ended_at || new Date().toISOString() });
});

apiRouter.post('/sessions/:id/confirm-completion', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id) as any;
  if (!session) {
    res.status(404).json({ error: 'Session not found.' });
    return;
  }
  if (session.learner_id !== user.user_id && session.knowledge_sharer_id !== user.user_id) {
    res.status(403).json({ error: 'Not authorized for this session.' });
    return;
  }
  if (!session.ended_at || !session.started_at) {
    res.status(409).json({ error: 'End the session after both participants have joined before confirming completion.' });
    return;
  }
  const confirmationField = session.learner_id === user.user_id ? 'learner_confirmed' : 'sharer_confirmed';
  db.exec('BEGIN IMMEDIATE');
  try {
    const currentSession = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id) as any;
    if (currentSession.session_stage === 'VERIFIED') {
      db.exec('COMMIT');
      res.json({ success: true, completed: true, credits_awarded: currentSession.verified_credits || 0 });
      return;
    }

    db.prepare(`UPDATE sessions SET ${confirmationField} = 1, updated_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), session.id);
    const confirmedSession = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id) as any;
    if (!confirmedSession.learner_confirmed || !confirmedSession.sharer_confirmed) {
      db.exec('COMMIT');
      broadcastEvent('session_confirmed_one_side', { sessionId: session.id, confirmedBy: user.user_id });
      res.json({ success: true, completed: false, message: 'Confirmation received. Waiting for the other participant.' });
      return;
    }

    const startedMilliseconds = Date.parse(confirmedSession.started_at);
    const endedMilliseconds = Date.parse(confirmedSession.ended_at);
    const durationSeconds = Math.max(0, Math.floor((endedMilliseconds - startedMilliseconds) / 1000));
    const credits = Math.round((durationSeconds / 3600) * 100) / 100;
    const durationMinutes = Math.floor(durationSeconds / 60);
    const verifiedAt = new Date().toISOString();

    db.prepare(`UPDATE sessions SET session_stage = 'VERIFICATION_PENDING' WHERE id = ?`).run(session.id);
    db.prepare(`
      UPDATE sessions SET status = 'COMPLETED', session_stage = 'VERIFIED',
        duration_seconds = ?, verified_credits = ?, verified_at = ?, credit_awarded = ?, updated_at = ?
      WHERE id = ? AND session_stage = 'VERIFICATION_PENDING'
    `).run(durationSeconds, credits, verifiedAt, credits > 0 ? 1 : 0, verifiedAt, session.id);

    if (credits > 0) {
      db.prepare(`
        INSERT INTO credit_transactions (id, user_id, session_id, amount, transaction_type, status, description)
        VALUES (?, ?, ?, ?, 'EARNED', 'COMPLETED', ?)
      `).run(
        crypto.randomUUID(), session.knowledge_sharer_id, session.id, credits,
        `${credits} Time Credits earned for ${durationSeconds} verified sharing seconds (Session #${session.id.slice(0, 8)})`
      );
      db.prepare(`
        UPDATE time_credit_accounts SET balance = balance + ?, total_earned = total_earned + ?, updated_at = ?
        WHERE user_id = ?
      `).run(credits, credits, verifiedAt, session.knowledge_sharer_id);
      db.prepare(`
        INSERT INTO learning_progress (id, user_id, skill_id, progress_percentage, completed_sessions, total_learning_minutes)
        VALUES (?, ?, ?, 25.0, 1, ?)
        ON CONFLICT(user_id, skill_id) DO UPDATE SET
          completed_sessions = completed_sessions + 1,
          total_learning_minutes = total_learning_minutes + ?,
          progress_percentage = MIN(100.0, progress_percentage + 25.0),
          updated_at = ?
      `).run(crypto.randomUUID(), session.learner_id, session.skill_id, durationMinutes, durationMinutes, verifiedAt);
    }

    db.prepare("UPDATE user_availability SET status = 'ACTIVE', updated_at = ? WHERE user_id = ?")
      .run(verifiedAt, session.knowledge_sharer_id);
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, link)
      VALUES (?, ?, ?, ?, 'SESSION_COMPLETED', '/ratings')
    `).run(crypto.randomUUID(), session.learner_id, 'Session Verified', 'Your session completion has been verified.');
    if (credits > 0) {
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, link)
        VALUES (?, ?, ?, ?, 'CREDIT_EARNED', '/time-wallet')
      `).run(crypto.randomUUID(), session.knowledge_sharer_id, 'Time Credits Awarded', `You earned ${credits} Time Credits for sharing your knowledge.`, '/time-wallet');
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  const verifiedSession = db.prepare('SELECT duration_seconds, verified_credits FROM sessions WHERE id = ?').get(session.id) as any;
  broadcastEvent('session_completed', { sessionId: session.id, sharerId: session.knowledge_sharer_id, creditsAwarded: verifiedSession.verified_credits });
  res.json({ success: true, completed: true, credits_awarded: verifiedSession.verified_credits, duration_seconds: verifiedSession.duration_seconds });
});

apiRouter.get('/sessions/:id/chat', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const session = db.prepare('SELECT learner_id, knowledge_sharer_id FROM sessions WHERE id = ?').get(req.params.id) as any;
  if (!session || (session.learner_id !== user.user_id && session.knowledge_sharer_id !== user.user_id)) {
    res.status(404).json({ error: 'Session not found or access denied.' });
    return;
  }
  const messages = db.prepare(`
    SELECT m.id, m.user_id, p.full_name AS sender_name, m.message, m.created_at
    FROM session_chat_messages m JOIN profiles p ON p.user_id = m.user_id
    WHERE m.session_id = ? ORDER BY m.created_at DESC LIMIT 100
  `).all(req.params.id).reverse();
  res.json({ messages });
});

apiRouter.post('/sessions/:id/chat', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const session = db.prepare('SELECT learner_id, knowledge_sharer_id FROM sessions WHERE id = ?').get(req.params.id) as any;
  if (!session || (session.learner_id !== user.user_id && session.knowledge_sharer_id !== user.user_id)) {
    res.status(404).json({ error: 'Session not found or access denied.' });
    return;
  }
  const message = typeof req.body.message === 'string' ? req.body.message.trim().slice(0, 4000) : '';
  if (!message) {
    res.status(400).json({ error: 'Message cannot be empty.' });
    return;
  }
  db.prepare('INSERT INTO session_chat_messages (id, session_id, user_id, message) VALUES (?, ?, ?, ?)')
    .run(crypto.randomUUID(), req.params.id, user.user_id, message);
  broadcastEvent('session_chat_updated', { sessionId: req.params.id });
  res.status(201).json({ success: true });
});

apiRouter.get('/sessions/:id/notes', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const session = db.prepare('SELECT learner_id, knowledge_sharer_id FROM sessions WHERE id = ?').get(req.params.id) as any;
  if (!session || (session.learner_id !== user.user_id && session.knowledge_sharer_id !== user.user_id)) {
    res.status(404).json({ error: 'Session not found or access denied.' });
    return;
  }
  const note = db.prepare('SELECT content, updated_at FROM session_private_notes WHERE session_id = ? AND user_id = ?')
    .get(req.params.id, user.user_id) as any;
  res.json({ note: note || { content: '', updated_at: null } });
});

apiRouter.put('/sessions/:id/notes', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const session = db.prepare('SELECT learner_id, knowledge_sharer_id FROM sessions WHERE id = ?').get(req.params.id) as any;
  if (!session || (session.learner_id !== user.user_id && session.knowledge_sharer_id !== user.user_id)) {
    res.status(404).json({ error: 'Session not found or access denied.' });
    return;
  }
  if (typeof req.body.content !== 'string' || req.body.content.length > 20000) {
    res.status(400).json({ error: 'Notes must be text up to 20,000 characters.' });
    return;
  }
  db.prepare(`
    INSERT INTO session_private_notes (id, session_id, user_id, content, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(session_id, user_id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at
  `).run(crypto.randomUUID(), req.params.id, user.user_id, req.body.content, new Date().toISOString());
  res.json({ success: true });
});

// -------------------------------------------------------------
// 8. TIME WALLET & LEDGER
// -------------------------------------------------------------

apiRouter.get('/time-wallet', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const wallet = db.prepare(`SELECT * FROM time_credit_accounts WHERE user_id = ?`).get(user.user_id) as any;
  const transactions = db.prepare(`
    SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC
  `).all(user.user_id);

  res.json({
    balance: wallet?.balance ?? 0,
    total_earned: wallet?.total_earned ?? 0,
    total_spent: wallet?.total_spent ?? 0,
    transactions
  });
});

// -------------------------------------------------------------
// 9. RATINGS & REVIEWS
// -------------------------------------------------------------

apiRouter.post('/ratings', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { session_id, rating_1, rating_2, rating_3, rating_4, rating_5, feedback } = req.body;
  if (!session_id || !rating_1 || !rating_2 || !rating_3 || !rating_4 || !rating_5) {
    res.status(400).json({ error: 'All rating categories are required.' });
    return;
  }

  const session = db.prepare(`SELECT * FROM sessions WHERE id = ? AND status = 'COMPLETED'`).get(session_id) as any;
  if (!session) {
    res.status(400).json({ error: 'Ratings can only be submitted for completed sessions.' });
    return;
  }

  const isLearner = session.learner_id === user.user_id;
  const isSharer = session.knowledge_sharer_id === user.user_id;

  if (!isLearner && !isSharer) {
    res.status(403).json({ error: 'Not authorized.' });
    return;
  }

  const role = isLearner ? 'LEARNER_RATING_SHARER' : 'SHARER_RATING_LEARNER';
  const rateeId = isLearner ? session.knowledge_sharer_id : session.learner_id;

  const existing = db.prepare(`SELECT id FROM ratings WHERE session_id = ? AND rater_id = ?`).get(session_id, user.user_id);
  if (existing) {
    res.status(409).json({ error: 'You have already submitted a rating for this session.' });
    return;
  }

  const overall = (rating_1 + rating_2 + rating_3 + rating_4 + rating_5) / 5.0;

  db.prepare(`
    INSERT INTO ratings (
      id, session_id, rater_id, ratee_id, role,
      rating_knowledge_or_participation, rating_communication, rating_punctuality,
      rating_helpfulness_or_effort, rating_respect, overall_score, feedback
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    session_id,
    user.user_id,
    rateeId,
    role,
    rating_1,
    rating_2,
    rating_3,
    rating_4,
    rating_5,
    overall,
    feedback || ''
  );

  // Update ratee trust score
  const avgData = db.prepare(`SELECT AVG(overall_score) as avg, COUNT(*) as count FROM ratings WHERE ratee_id = ?`).get(rateeId) as any;
  const newAvg = avgData?.avg ?? 5.0;
  const newTrust = Math.min(100, Math.round(75 + (newAvg / 5.0) * 25));
  db.prepare("UPDATE trust_scores SET score = ?, rating_avg = ?, updated_at = datetime('now') WHERE user_id = ?")
    .run(newTrust, newAvg, rateeId);

  res.status(201).json({ success: true, message: 'Rating submitted successfully.' });
});

apiRouter.get('/ratings', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const received = db.prepare(`
    SELECT r.*, p.full_name as other_party_name, sk.name as skill_name, s.session_date
    FROM ratings r
    JOIN profiles p ON r.rater_id = p.user_id
    JOIN sessions s ON r.session_id = s.id
    JOIN skills sk ON s.skill_id = sk.id
    WHERE r.ratee_id = ?
    ORDER BY r.created_at DESC
  `).all(user.user_id);

  const given = db.prepare(`
    SELECT r.*, p.full_name as other_party_name, sk.name as skill_name, s.session_date
    FROM ratings r
    JOIN profiles p ON r.ratee_id = p.user_id
    JOIN sessions s ON r.session_id = s.id
    JOIN skills sk ON s.skill_id = sk.id
    WHERE r.rater_id = ?
    ORDER BY r.created_at DESC
  `).all(user.user_id);

  res.json({ received, given });
});

// -------------------------------------------------------------
// 10. LEARNING PROGRESS & AI LEARNING PLANS
// -------------------------------------------------------------

apiRouter.get('/progress', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const progress = db.prepare(`
    SELECT lp.*, s.name as skill_name, s.category as skill_category
    FROM learning_progress lp
    JOIN skills s ON lp.skill_id = s.id
    WHERE lp.user_id = ?
  `).all(user.user_id);

  const completedSessions = (db.prepare(`SELECT COUNT(*) as count FROM sessions WHERE learner_id = ? AND status = 'COMPLETED'`).get(user.user_id) as any)?.count ?? 0;
  const learningMinutes = (db.prepare(`SELECT SUM(duration_minutes) as sum FROM sessions WHERE learner_id = ? AND status = 'COMPLETED'`).get(user.user_id) as any)?.sum ?? 0;

  res.json({
    progress,
    total_completed_sessions: completedSessions,
    total_learning_hours: (learningMinutes / 60).toFixed(1)
  });
});

apiRouter.post('/ai/learning-plan', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { skill_id, skill_name, level } = req.body;
  let targetSkill = skill_name;

  if (skill_id && !targetSkill) {
    const s = db.prepare(`SELECT name FROM skills WHERE id = ?`).get(skill_id) as any;
    targetSkill = s?.name || 'Python';
  }

  const plan = generateStructuredLearningPlan(targetSkill || 'Programming', level || 'BEGINNER');
  const planId = crypto.randomUUID();

  if (skill_id) {
    db.prepare(`
      INSERT INTO learning_paths (id, user_id, skill_id, title, duration_weeks, structured_plan_json)
      VALUES (?, ?, ?, ?, 4, ?)
      ON CONFLICT(id) DO UPDATE SET structured_plan_json = excluded.structured_plan_json
    `).run(planId, user.user_id, skill_id, `4-Week ${targetSkill} Mastery Blueprint`, JSON.stringify(plan));
  }

  res.json({
    id: planId,
    skill_name: targetSkill,
    title: `4-Week ${targetSkill} Mastery Blueprint`,
    weeks: plan
  });
});

// -------------------------------------------------------------
// 11. AI LEARNING ASSISTANT
// -------------------------------------------------------------

apiRouter.post('/ai/assistant', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  const { message, topic, skill } = req.body;

  if (!message) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  const topicName = skill || topic || 'General Learning';
  const msgLower = message.toLowerCase();

  let responseText = '';
  if (msgLower.includes('explain') || msgLower.includes('what is') || msgLower.includes('how to')) {
    responseText = `Here is a clear architectural explanation for **${topicName}**:\n\n1. **Core Concept**: It serves as a foundational building block for solving problems with predictable state transitions.\n2. **Practical Analogy**: Think of it as a contract between your input values and the expected output pipeline.\n3. **Key Pattern**: Keep operations idempotent, minimize mutable side effects, and break logic down into single-responsibility functions.\n\nWould you like me to walk through a code example or generate practice exercises?`;
  } else if (msgLower.includes('example') || msgLower.includes('code') || msgLower.includes('practice')) {
    responseText = `Here is an idiomatic example in **${topicName}**:\n\n\`\`\`${topicName.toLowerCase().includes('python') ? 'python' : 'javascript'}\n# Real-world data transformation\ndef process_items(items):\n    return [item.strip().title() for item in items if len(item) > 0]\n\n# Execution\ninputs = ["python", "learning", "exchange"]\nprint(process_items(inputs))\n# Output: ['Python', 'Learning', 'Exchange']\n\`\`\`\n\nTry implementing this with error boundary handling for null values!`;
  } else if (msgLower.includes('quiz') || msgLower.includes('test')) {
    responseText = `Here is a quick revision check for **${topicName}**:\n\n**Question**: When passing arguments by reference versus by value, what determines if mutations persist in the outer scope?\n\nA) The return statement\nB) Whether the data type is mutable (e.g. lists/objects) or immutable (e.g. strings/integers)\nC) The execution time\n\nWhat is your answer?`;
  } else {
    responseText = `I'm your **LearnX AI Learning Mentor**. I can help you break down concepts in **${topicName}**, generate custom code walkthroughs, design week-by-week practice drills, and prepare you for peer sessions. What specific challenge are you working on today?`;
  }

  res.json({
    reply: responseText,
    timestamp: new Date().toISOString()
  });
});

// -------------------------------------------------------------
// 12. QUIZZES & ASSESSMENTS
// -------------------------------------------------------------

apiRouter.get('/quizzes', (req: Request, res: Response) => {
  const quizzes = db.prepare(`
    SELECT q.*, s.name as skill_name, s.category as skill_category,
           (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as total_questions
    FROM quizzes q
    JOIN skills s ON q.skill_id = s.id
  `).all();

  res.json({ quizzes });
});

apiRouter.get('/quizzes/:id', (req: Request, res: Response) => {
  const quiz = db.prepare(`
    SELECT q.*, s.name as skill_name FROM quizzes q JOIN skills s ON q.skill_id = s.id WHERE q.id = ?
  `).get(req.params.id) as any;

  if (!quiz) {
    res.status(404).json({ error: 'Quiz not found' });
    return;
  }

  // Hide correct_option_index from client for fairness
  const questions = db.prepare(`
    SELECT id, question_text, options_json, topic FROM quiz_questions WHERE quiz_id = ?
  `).all(quiz.id).map((q: any) => ({
    id: q.id,
    question_text: q.question_text,
    options: JSON.parse(q.options_json),
    topic: q.topic
  }));

  res.json({ quiz, questions });
});

apiRouter.post('/quizzes/:id/submit', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { answers } = req.body; // map of { [question_id]: selected_index }
  const quizId = req.params.id;
  const quiz = db.prepare(`SELECT * FROM quizzes WHERE id = ?`).get(quizId) as any;
  if (!quiz) {
    res.status(404).json({ error: 'Quiz not found' });
    return;
  }

  const questions = db.prepare(`SELECT * FROM quiz_questions WHERE quiz_id = ?`).all(quizId) as any[];

  if (questions.length === 0) {
    res.status(404).json({ error: 'Quiz questions not found' });
    return;
  }

  let correctCount = 0;
  const strongTopics: string[] = [];
  const weakTopics: string[] = [];

  const attemptId = crypto.randomUUID();

  const insertAnsStmt = db.prepare(`
    INSERT INTO quiz_attempt_answers (id, attempt_id, question_id, selected_option_index, is_correct)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const q of questions) {
    const selected = answers ? answers[q.id] : undefined;
    const isCorrect = selected === q.correct_option_index ? 1 : 0;
    if (isCorrect === 1) {
      correctCount++;
      if (q.topic && !strongTopics.includes(q.topic)) strongTopics.push(q.topic);
    } else {
      if (q.topic && !weakTopics.includes(q.topic)) weakTopics.push(q.topic);
    }

    insertAnsStmt.run(crypto.randomUUID(), attemptId, q.id, selected !== undefined ? selected : null, isCorrect);
  }

  const percentage = Math.round((correctCount / questions.length) * 100);
  const passingScore = quiz.passing_score || 70;
  const passed = percentage >= passingScore ? 1 : 0;

  // Demonstrated level mapping
  let demonstratedLevel = 'BEGINNER';
  if (percentage >= 80) demonstratedLevel = 'ADVANCED';
  else if (percentage >= 60) demonstratedLevel = 'INTERMEDIATE';
  else if (percentage >= 40) demonstratedLevel = 'ELEMENTARY';

  db.prepare(`
    INSERT INTO quiz_attempts (id, quiz_id, user_id, score, total_questions, passed, weak_topics_json, answers_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    attemptId,
    quizId,
    user.user_id,
    percentage,
    questions.length,
    passed,
    JSON.stringify(weakTopics),
    JSON.stringify(answers || {})
  );

  // Update skill_assessments
  if (quiz?.skill_id) {
    db.prepare(`
      INSERT INTO skill_assessments (id, user_id, skill_id, latest_attempt_id, demonstrated_level, score, percentage, strong_topics_json, weak_topics_json, assessed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, skill_id) DO UPDATE SET
        latest_attempt_id = excluded.latest_attempt_id,
        demonstrated_level = excluded.demonstrated_level,
        score = excluded.score,
        percentage = excluded.percentage,
        strong_topics_json = excluded.strong_topics_json,
        weak_topics_json = excluded.weak_topics_json,
        assessed_at = datetime('now')
    `).run(
      crypto.randomUUID(),
      user.user_id,
      quiz.skill_id,
      attemptId,
      demonstratedLevel,
      percentage,
      percentage,
      JSON.stringify(strongTopics),
      JSON.stringify(weakTopics)
    );

    // Update learning progress
    db.prepare(`
      INSERT INTO learning_progress (id, user_id, skill_id, progress_percentage, weak_topics_json)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, skill_id) DO UPDATE SET
        progress_percentage = MAX(progress_percentage, excluded.progress_percentage),
        weak_topics_json = excluded.weak_topics_json,
        updated_at = datetime('now')
    `).run(crypto.randomUUID(), user.user_id, quiz.skill_id, Math.max(percentage, 50.0), JSON.stringify(weakTopics));

    // If passed, update SkillProof to AI_ASSESSED
    if (passed === 1) {
      db.prepare(`
        INSERT INTO skill_verifications (id, user_id, skill_id, verification_type, status, issuer, verification_date)
        VALUES (?, ?, ?, 'AI_ASSESSED', 'VERIFIED', 'LearnX AI Assessment Engine', datetime('now'))
        ON CONFLICT(user_id, skill_id) DO UPDATE SET
          verification_type = 'AI_ASSESSED',
          status = 'VERIFIED',
          verification_date = datetime('now')
      `).run(crypto.randomUUID(), user.user_id, quiz.skill_id);
    }
  }

  // Create Notification
  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, link)
    VALUES (?, ?, ?, ?, 'ASSESSMENT_COMPLETED', '/quizzes')
  `).run(
    crypto.randomUUID(),
    user.user_id,
    passed === 1 ? 'Assessment Passed Successfully!' : 'Assessment Completed',
    `You scored ${percentage}% (${demonstratedLevel} level) on ${quiz.title}.`
  );

  res.json({
    attempt_id: attemptId,
    score: percentage,
    percentage,
    passed: passed === 1,
    demonstrated_level: demonstratedLevel,
    correct_count: correctCount,
    total_questions: questions.length,
    strong_topics: strongTopics,
    weak_topics: weakTopics,
    message: passed === 1 ? `Assessment Passed! Demonstrated Level: ${demonstratedLevel}.` : 'Assessment completed. Review weak topics and practice with a peer sharer.'
  });
});

apiRouter.get('/v1/me/quiz-attempts', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const attempts = db.prepare(`
    SELECT qa.*, q.title as quiz_title, s.name as skill_name
    FROM quiz_attempts qa
    JOIN quizzes q ON qa.quiz_id = q.id
    JOIN skills s ON q.skill_id = s.id
    WHERE qa.user_id = ?
    ORDER BY qa.completed_at DESC
  `).all(user.user_id);

  res.json({ success: true, attempts });
});

apiRouter.get('/v1/me/skill-assessments', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const assessments = db.prepare(`
    SELECT sa.*, s.name as skill_name, s.category as skill_category
    FROM skill_assessments sa
    JOIN skills s ON sa.skill_id = s.id
    WHERE sa.user_id = ?
    ORDER BY sa.assessed_at DESC
  `).all(user.user_id);

  res.json({ success: true, assessments });
});

// -------------------------------------------------------------
// 13. ACHIEVEMENTS & SKILLPROOF
// -------------------------------------------------------------

apiRouter.get('/achievements', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  const allAchievements = db.prepare(`SELECT * FROM achievements`).all() as any[];

  let unlockedIds: string[] = [];
  if (user) {
    unlockedIds = db.prepare(`SELECT achievement_id FROM user_achievements WHERE user_id = ?`).all(user.user_id).map((r: any) => r.achievement_id);
  }

  const result = allAchievements.map((a) => ({
    ...a,
    unlocked: unlockedIds.includes(a.id)
  }));

  res.json({ achievements: result });
});

apiRouter.get('/skillproof', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const proofs = db.prepare(`
    SELECT sv.*, s.name as skill_name, s.category as skill_category
    FROM skill_verifications sv
    JOIN skills s ON sv.skill_id = s.id
    WHERE sv.user_id = ?
  `).all(user.user_id);

  res.json({ proofs });
});

// -------------------------------------------------------------
// 14. PARTNERS, COURSES, BOOTCAMPS & CERTIFICATES
// -------------------------------------------------------------

apiRouter.get('/partners', (req: Request, res: Response) => {
  const partners = db.prepare(`SELECT * FROM partners ORDER BY created_at DESC`).all();
  res.json({ partners });
});

apiRouter.post('/partners', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { organization_name, description, logo_url, website } = req.body;
  if (!organization_name) {
    res.status(400).json({ error: 'Organization name is required.' });
    return;
  }

  const partnerId = `ptn-${crypto.randomUUID().slice(0, 8)}`;
  db.prepare(`
    INSERT INTO partners (id, user_id, organization_name, description, logo_url, website, verified)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(partnerId, user.user_id, organization_name, description || '', logo_url || '', website || '');

  res.status(201).json({
    success: true,
    message: 'Institutional partner registered successfully!',
    partner: { id: partnerId, organization_name }
  });
});

apiRouter.get('/courses', (req: Request, res: Response) => {
  const courses = db.prepare(`
    SELECT c.*,
      COALESCE((SELECT p.verified FROM partners p WHERE p.id = c.partner_id OR p.user_id = c.partner_id LIMIT 1), 0) AS partner_verified
    FROM courses c WHERE c.status = 'ACTIVE' ORDER BY c.created_at DESC
  `).all();
  res.json({ courses });
});

apiRouter.get('/courses/:id', (req: Request, res: Response) => {
  const course = db.prepare(`
    SELECT c.*,
      COALESCE((SELECT p.verified FROM partners p WHERE p.id = c.partner_id OR p.user_id = c.partner_id LIMIT 1), 0) AS partner_verified
    FROM courses c WHERE c.id = ? AND c.status = 'ACTIVE'
  `).get(req.params.id);
  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }
  res.json({ course });
});

apiRouter.get('/bootcamps', (_req: Request, res: Response) => {
  const bootcamps = db.prepare(`
    SELECT b.*, b.name AS title,
      COALESCE(NULLIF(b.provider_name, ''), (SELECT p.organization_name FROM partners p WHERE p.id = b.partner_id OR p.user_id = b.partner_id LIMIT 1), '') AS provider_name,
      COALESCE((SELECT p.verified FROM partners p WHERE p.id = b.partner_id OR p.user_id = b.partner_id LIMIT 1), 0) AS partner_verified
    FROM bootcamps b ORDER BY b.start_date ASC
  `).all();
  res.json({ bootcamps });
});

apiRouter.get('/bootcamps/:id', (req: Request, res: Response) => {
  const bootcamp = db.prepare(`
    SELECT b.*, b.name AS title,
      COALESCE(NULLIF(b.provider_name, ''), (SELECT p.organization_name FROM partners p WHERE p.id = b.partner_id OR p.user_id = b.partner_id LIMIT 1), '') AS provider_name,
      COALESCE((SELECT p.verified FROM partners p WHERE p.id = b.partner_id OR p.user_id = b.partner_id LIMIT 1), 0) AS partner_verified
    FROM bootcamps b WHERE b.id = ?
  `).get(req.params.id);
  if (!bootcamp) {
    res.status(404).json({ error: 'Bootcamp not found.' });
    return;
  }
  res.json({ bootcamp });
});

// Add a Partner Course
apiRouter.post('/courses', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const {
    name,
    partner_name,
    category,
    description,
    duration,
    schedule,
    requirements,
    syllabus,
    learning_outcomes,
    level,
    learning_mode,
    certificate_eligibility,
    external_url
  } = req.body;

  if (!name || !description || !duration) {
    res.status(400).json({ error: 'Course name, description, and duration are required.' });
    return;
  }

  const courseId = `course-${crypto.randomUUID().slice(0, 8)}`;
  let syllabusJson = '[]';
  if (Array.isArray(syllabus)) {
    syllabusJson = JSON.stringify(syllabus);
  } else if (typeof syllabus === 'string') {
    const list = syllabus.split('\n').map((s: string) => s.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean);
    syllabusJson = JSON.stringify(list.length > 0 ? list : [syllabus.trim()]);
  }
  const learningOutcomesJson = Array.isArray(learning_outcomes) ? JSON.stringify(learning_outcomes) : '[]';

  db.prepare(`
    INSERT INTO courses (
      id, partner_id, partner_name, name, category, description,
      duration, schedule, requirements, syllabus_json,
      learning_outcomes_json, level, learning_mode, certificate_eligibility, status, external_url, is_demo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, 0)
  `).run(
    courseId,
    user.user_id,
    partner_name?.trim() || user.full_name || 'Academic Partner',
    name.trim(),
    category?.trim() || 'General',
    description.trim(),
    duration.trim(),
    schedule?.trim() || 'Flexible Self-Paced Schedule',
    requirements?.trim() || 'Open to all interested learners',
    syllabusJson,
    learningOutcomesJson,
    level?.trim() || 'ALL_LEVELS',
    learning_mode?.trim() || 'ONLINE',
    certificate_eligibility !== false ? 1 : 0,
    external_url?.trim() || ''
  );

  const newCourse = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);

  // Notify user
  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, link)
    VALUES (?, ?, 'Partner Course Published!', ?, 'COURSE_PUBLISHED', '/courses')
  `).run(
    crypto.randomUUID(),
    user.user_id,
    `Your partner course "${name}" has been published to the LearnX catalog.`
  );

  res.status(201).json({
    success: true,
    message: 'Partner course added successfully!',
    course: newCourse
  });
});

// Enroll in a Course
apiRouter.post('/courses/:id/enroll', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id) as any;
  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  const existing = db.prepare('SELECT * FROM course_enrollments WHERE course_id = ? AND user_id = ?').get(course.id, user.user_id);
  if (existing) {
    res.json({ success: true, message: 'Already enrolled in this course.' });
    return;
  }

  const enrollmentId = `enr-${crypto.randomUUID().slice(0, 8)}`;
  db.prepare(`
    INSERT INTO course_enrollments (id, course_id, user_id, status, progress_percentage)
    VALUES (?, ?, ?, 'ENROLLED', 0)
  `).run(enrollmentId, course.id, user.user_id);

  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, link)
    VALUES (?, ?, 'Enrolled in Partner Course!', ?, 'COURSE_ENROLLED', '/courses')
  `).run(
    crypto.randomUUID(),
    user.user_id,
    `You are now enrolled in "${course.name}". You can track your progress anytime.`
  );

  res.status(201).json({ success: true, message: `Successfully enrolled in ${course.name}!` });
});

// User's enrolled courses
apiRouter.get('/my-courses', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const enrollments = db.prepare(`
    SELECT ce.*, c.name, c.partner_name, c.category, c.duration, c.schedule, c.certificate_eligibility, c.description, c.syllabus_json, c.level, c.learning_mode, c.is_demo
    FROM course_enrollments ce
    JOIN courses c ON ce.course_id = c.id
    WHERE ce.user_id = ?
    ORDER BY ce.enrolled_at DESC
  `).all(user.user_id);

  res.json({ enrollments });
});

// Update course progress
apiRouter.post('/courses/:id/progress', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { progress } = req.body;
  const newProgress = Math.min(100, Math.max(0, Number(progress) || 0));
  const status = newProgress >= 100 ? 'COMPLETED' : 'IN_PROGRESS';
  const completedAt = newProgress >= 100 ? new Date().toISOString() : null;

  db.prepare(`
    UPDATE course_enrollments
    SET progress_percentage = ?, status = ?, completed_at = COALESCE(?, completed_at)
    WHERE course_id = ? AND user_id = ?
  `).run(newProgress, status, completedAt, req.params.id, user.user_id);

  // If 100% completed, auto-issue certificate if eligible
  if (newProgress >= 100) {
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id) as any;
    if (course && course.certificate_eligibility && !course.is_demo) {
      const existingCert = db.prepare('SELECT * FROM certificates WHERE user_id = ? AND course_id = ?').get(user.user_id, course.id);
      if (!existingCert) {
        const certId = `CERT-LX-${Math.floor(100000 + Math.random() * 900000)}`;
        db.prepare(`
          INSERT INTO certificates (id, certificate_id, user_id, course_id, provider_name, title, verification_url)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          crypto.randomUUID(),
          certId,
          user.user_id,
          course.id,
          course.partner_name || 'LearnX Academic Partner',
          `${course.name} Completion Certificate`,
          `/certificates/verify/${certId}`
        );

        db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, link)
          VALUES (?, ?, 'Certificate Issued!', ?, 'CERTIFICATE_EARNED', '/certificates')
        `).run(
          crypto.randomUUID(),
          user.user_id,
          `Congratulations! You completed ${course.name} and earned Certificate #${certId}.`
        );
      }
    }
  }

  res.json({ success: true, progress: newProgress, status });
});

// -------------------------------------------------------------
// LEARNING NOTES API
// -------------------------------------------------------------

apiRouter.get('/v1/notes', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const notes = db.prepare(`
    SELECT n.*, s.name as skill_name 
    FROM learning_notes n 
    LEFT JOIN skills s ON n.skill_id = s.id 
    WHERE n.user_id = ? OR n.visibility = 'SHARED'
    ORDER BY n.created_at DESC
  `).all(user.user_id);
  res.json({ success: true, notes });
});

apiRouter.post('/v1/notes', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { title, content, note_type, visibility, skill_id, attachment_url } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: 'Title and content are required.' });
    return;
  }
  const noteId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO learning_notes (id, user_id, skill_id, title, content, note_type, visibility, attachment_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    noteId,
    user.user_id,
    skill_id || null,
    title,
    content,
    note_type || 'PERSONAL',
    visibility || 'PRIVATE',
    attachment_url || null
  );

  const note = db.prepare('SELECT * FROM learning_notes WHERE id = ?').get(noteId);
  res.status(201).json({ success: true, note });
});

apiRouter.get('/v1/notes/:id', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const note = db.prepare('SELECT * FROM learning_notes WHERE id = ?').get(req.params.id) as any;
  if (!note) {
    res.status(404).json({ error: 'Note not found.' });
    return;
  }
  if (note.user_id !== user.user_id && note.visibility === 'PRIVATE') {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }
  res.json({ success: true, note });
});

apiRouter.put('/v1/notes/:id', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const note = db.prepare('SELECT * FROM learning_notes WHERE id = ?').get(req.params.id) as any;
  if (!note) {
    res.status(404).json({ error: 'Note not found.' });
    return;
  }
  if (note.user_id !== user.user_id) {
    res.status(403).json({ error: 'You can only edit your own notes.' });
    return;
  }

  const { title, content, note_type, visibility, skill_id, attachment_url } = req.body;
  db.prepare(`
    UPDATE learning_notes 
    SET title = COALESCE(?, title),
        content = COALESCE(?, content),
        note_type = COALESCE(?, note_type),
        visibility = COALESCE(?, visibility),
        skill_id = COALESCE(?, skill_id),
        attachment_url = COALESCE(?, attachment_url),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(title, content, note_type, visibility, skill_id, attachment_url, req.params.id);

  const updated = db.prepare('SELECT * FROM learning_notes WHERE id = ?').get(req.params.id);
  res.json({ success: true, note: updated });
});

apiRouter.delete('/v1/notes/:id', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const note = db.prepare('SELECT * FROM learning_notes WHERE id = ?').get(req.params.id) as any;
  if (!note) {
    res.status(404).json({ error: 'Note not found.' });
    return;
  }
  if (note.user_id !== user.user_id) {
    res.status(403).json({ error: 'You can only delete your own notes.' });
    return;
  }

  db.prepare('DELETE FROM learning_notes WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Note deleted.' });
});

// User enrollments & certificates APIs
apiRouter.get('/v1/me/enrollments', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const courses = db.prepare(`
    SELECT ce.*, c.name as course_name, c.duration, c.description, c.status as course_status
    FROM course_enrollments ce
    JOIN courses c ON ce.course_id = c.id
    WHERE ce.user_id = ?
  `).all(user.user_id);

  const bootcamps = db.prepare(`
    SELECT be.*, b.title as bootcamp_title, b.duration, b.description, b.start_date, b.end_date
    FROM bootcamp_enrollments be
    JOIN bootcamps b ON be.bootcamp_id = b.id
    WHERE be.user_id = ?
  `).all(user.user_id);

  res.json({ success: true, courses, bootcamps });
});

apiRouter.get('/v1/me/certificates', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const certificates = db.prepare('SELECT * FROM certificates WHERE user_id = ? ORDER BY issue_date DESC').all(user.user_id);
  res.json({ success: true, certificates });
});

apiRouter.post('/v1/courses/:id/enroll', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const courseId = req.params.id;
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId) as any;
  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM course_enrollments WHERE user_id = ? AND course_id = ?').get(user.user_id, courseId);
  if (existing) {
    res.status(400).json({ error: 'Already enrolled in this course.' });
    return;
  }

  // Check Time Credit cost (default 0 or stored)
  const creditCost = course.time_credit_cost || 0;
  if (creditCost > 0) {
    const wallet = db.prepare('SELECT * FROM time_credit_accounts WHERE user_id = ?').get(user.user_id) as any;
    const currentBalance = wallet?.balance ?? 0;
    if (currentBalance < creditCost) {
      res.status(400).json({ error: `Insufficient Time Credits. Course requires ${creditCost} TC, you have ${currentBalance} TC.` });
      return;
    }
  }

  // Atomic transaction
  try {
    if (creditCost > 0) {
      db.prepare('UPDATE time_credit_accounts SET balance = balance - ?, total_spent = total_spent + ? WHERE user_id = ?')
        .run(creditCost, creditCost, user.user_id);

      db.prepare(`
        INSERT INTO credit_transactions (id, user_id, amount, transaction_type, description)
        VALUES (?, ?, ?, 'USED', ?)
      `).run(crypto.randomUUID(), user.user_id, -creditCost, `Enrollment in course: ${course.name}`);
    }

    const enrollmentId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO course_enrollments (id, user_id, course_id, status)
      VALUES (?, ?, ?, 'ENROLLED')
    `).run(enrollmentId, user.user_id, courseId);

    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, link)
      VALUES (?, ?, 'Enrollment Confirmed', ?, 'ENROLLMENT_CONFIRMED', '/learning-path')
    `).run(crypto.randomUUID(), user.user_id, `Successfully enrolled in ${course.name}.`);

    res.status(201).json({ success: true, message: 'Successfully enrolled in course.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Enrollment failed.' });
  }
});

apiRouter.post('/v1/bootcamps/:id/enroll', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const bootcampId = req.params.id;
  const bootcamp = db.prepare('SELECT * FROM bootcamps WHERE id = ?').get(bootcampId) as any;
  if (!bootcamp) {
    res.status(404).json({ error: 'Bootcamp not found.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM bootcamp_enrollments WHERE user_id = ? AND bootcamp_id = ?').get(user.user_id, bootcampId);
  if (existing) {
    res.status(400).json({ error: 'Already enrolled in this bootcamp.' });
    return;
  }

  const creditCost = bootcamp.time_credit_cost || 0;
  if (creditCost > 0) {
    const wallet = db.prepare('SELECT * FROM time_credit_accounts WHERE user_id = ?').get(user.user_id) as any;
    const currentBalance = wallet?.balance ?? 0;
    if (currentBalance < creditCost) {
      res.status(400).json({ error: `Insufficient Time Credits. Bootcamp requires ${creditCost} TC, you have ${currentBalance} TC.` });
      return;
    }
  }

  try {
    if (creditCost > 0) {
      db.prepare('UPDATE time_credit_accounts SET balance = balance - ?, total_spent = total_spent + ? WHERE user_id = ?')
        .run(creditCost, creditCost, user.user_id);

      db.prepare(`
        INSERT INTO credit_transactions (id, user_id, amount, transaction_type, description)
        VALUES (?, ?, ?, 'USED', ?)
      `).run(crypto.randomUUID(), user.user_id, -creditCost, `Enrollment in bootcamp: ${bootcamp.title}`);
    }

    const enrollmentId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO bootcamp_enrollments (id, user_id, bootcamp_id, status)
      VALUES (?, ?, ?, 'ENROLLED')
    `).run(enrollmentId, user.user_id, bootcampId);

    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, link)
      VALUES (?, ?, 'Bootcamp Enrollment Confirmed', ?, 'ENROLLMENT_CONFIRMED', '/learning-path')
    `).run(crypto.randomUUID(), user.user_id, `Successfully registered for bootcamp ${bootcamp.title}.`);

    res.status(201).json({ success: true, message: 'Successfully enrolled in bootcamp.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Bootcamp enrollment failed.' });
  }
});



apiRouter.get('/certificates', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const certificates = db.prepare(`SELECT * FROM certificates WHERE user_id = ?`).all(user.user_id);
  res.json({ certificates });
});

apiRouter.get('/certificates/verify/:id', (req: Request, res: Response) => {
  const cert = db.prepare(`
    SELECT c.*, p.full_name as recipient_name, p.email as recipient_email
    FROM certificates c
    JOIN profiles p ON c.user_id = p.user_id
    WHERE c.certificate_id = ? OR c.id = ?
  `).get(req.params.id, req.params.id);

  if (!cert) {
    res.status(404).json({ error: 'Certificate record not found or invalid.' });
    return;
  }

  res.json({ certificate: cert });
});

// -------------------------------------------------------------
// 15. NOTIFICATIONS
// -------------------------------------------------------------

apiRouter.get('/notifications', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const notifications = db.prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`).all(user.user_id);
  res.json({ notifications });
});

apiRouter.post('/notifications/:id/read', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`).run(req.params.id, user.user_id);
  res.json({ success: true });
});

apiRouter.post('/notifications/read-all', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).run(user.user_id);
  res.json({ success: true });
});

// -------------------------------------------------------------
// 16. REPORTS & BLOCKING
// -------------------------------------------------------------

apiRouter.post('/reports', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { reported_user_id, session_id, report_type, description } = req.body;
  if (!reported_user_id || !report_type || !description) {
    res.status(400).json({ error: 'Reported user, category, and description are required.' });
    return;
  }

  const reportId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO reports (id, reporter_id, reported_user_id, session_id, report_type, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(reportId, user.user_id, reported_user_id, session_id || null, report_type, description);

  res.status(201).json({ success: true, message: 'Report submitted for administrative review.' });
});

apiRouter.post('/blocks', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { blocked_user_id, reason } = req.body;
  if (!blocked_user_id) {
    res.status(400).json({ error: 'User to block is required.' });
    return;
  }

  db.prepare(`INSERT OR IGNORE INTO blocked_users (id, blocker_id, blocked_user_id, reason) VALUES (?, ?, ?, ?)`)
    .run(crypto.randomUUID(), user.user_id, blocked_user_id, reason || '');

  res.json({ success: true, message: 'User blocked.' });
});

// -------------------------------------------------------------
// 17. ADMIN DASHBOARD & ANALYTICS
// -------------------------------------------------------------

apiRouter.get('/admin/analytics', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required.' });
    return;
  }

  const totalUsers = (db.prepare(`SELECT COUNT(*) as count FROM profiles`).get() as any)?.count ?? 0;
  const activeLearners = (db.prepare(`SELECT COUNT(DISTINCT user_id) as count FROM user_skills WHERE skill_type = 'LEARN'`).get() as any)?.count ?? 0;
  const activeSharers = (db.prepare(`SELECT COUNT(DISTINCT user_id) as count FROM user_skills WHERE skill_type = 'SHARE'`).get() as any)?.count ?? 0;
  const totalSessions = (db.prepare(`SELECT COUNT(*) as count FROM sessions`).get() as any)?.count ?? 0;
  const completedSessions = (db.prepare(`SELECT COUNT(*) as count FROM sessions WHERE status = 'COMPLETED'`).get() as any)?.count ?? 0;
  const creditsExchanged = (db.prepare(`SELECT SUM(amount) as sum FROM credit_transactions WHERE transaction_type = 'EARNED'`).get() as any)?.sum ?? 0;
  const avgRating = (db.prepare(`SELECT AVG(overall_score) as avg FROM ratings`).get() as any)?.avg ?? 5.0;
  const pendingReports = (db.prepare(`SELECT COUNT(*) as count FROM reports WHERE status = 'PENDING'`).get() as any)?.count ?? 0;

  const popularSkills = db.prepare(`
    SELECT s.name, COUNT(us.id) as learner_count
    FROM skills s
    JOIN user_skills us ON s.id = us.skill_id
    WHERE us.skill_type = 'LEARN'
    GROUP BY s.id
    ORDER BY learner_count DESC
    LIMIT 5
  `).all();

  res.json({
    metrics: {
      total_users: totalUsers,
      active_learners: activeLearners,
      active_sharers: activeSharers,
      total_sessions: totalSessions,
      completed_sessions: completedSessions,
      total_learning_hours: completedSessions,
      credits_exchanged: creditsExchanged,
      average_rating: Number(avgRating).toFixed(1),
      pending_reports: pendingReports
    },
    popular_skills: popularSkills
  });
});

apiRouter.get('/admin/users', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required.' });
    return;
  }

  const users = db.prepare(`
    SELECT p.*,
           COALESCE(ts.score, 85) as trust_score,
           COALESCE(tca.balance, 0) as wallet_balance
    FROM profiles p
    LEFT JOIN trust_scores ts ON p.user_id = ts.user_id
    LEFT JOIN time_credit_accounts tca ON p.user_id = tca.user_id
    ORDER BY p.created_at DESC
  `).all();

  res.json({ users });
});