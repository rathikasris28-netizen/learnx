import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AccessToken } from 'livekit-server-sdk';
import { GoogleGenAI } from '@google/genai';
import cors from 'cors';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is required in environment variables.');

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL || process.env.VITE_LIVEKIT_URL;
if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
  console.warn('LiveKit is not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET and LIVEKIT_URL.');
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.AI_API_KEY || ''
});

function hashPassword(password: string) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function isHashedPassword(value: string) {
  return /^[a-f0-9]{64}$/i.test(value || '');
}

function sanitizeUser(user: any) {
  if (!user) return null;
  const { password: _password, ...safe } = user;
  return safe;
}

const defaultSkills: Array<[string, string, string]> = [
  ('AI', 'Technical', 'Artificial Intelligence'),
  ('Career Skill', 'Professional', 'Career and workplace skills'),
  ('Deep Learning', 'Technical', 'Deep learning and neural networks'),
  ('Drawing', 'Creative', 'Drawing and sketching'),
  ('Video Editing', 'Creative', 'Video editing'),
  ('Painting', 'Creative', 'Painting and visual art'),
  ('Python', 'Technical', 'Python programming'),
  ('Java', 'Technical', 'Java programming'),
  ('JavaScript', 'Technical', 'JavaScript programming'),
  ('Web Development', 'Technical', 'Frontend and web development'),
  ('Data Science', 'Technical', 'Data science and analytics'),
  ('Machine Learning', 'Technical', 'Machine learning'),
  ('UI/UX Design', 'Creative', 'User interface and user experience design'),
  ('Cybersecurity', 'Technical', 'Cybersecurity fundamentals'),
  ('Cloud Computing', 'Technical', 'Cloud computing'),
  ('English Communication', 'Communication', 'English communication'),
  ('Public Speaking', 'Communication', 'Public speaking'),
  ('Leadership', 'Professional', 'Leadership skills'),
  ('Resume Writing', 'Career', 'Resume and CV preparation'),
  ('Interview Skills', 'Career', 'Interview preparation')
];

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS skills (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) UNIQUE NOT NULL,
      category VARCHAR(100) NOT NULL DEFAULT 'Technical',
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS user_skill_preferences (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL CHECK (type IN ('LEARN', 'SHARE')),
      level VARCHAR(50) NOT NULL DEFAULT 'Intermediate',
      UNIQUE(user_id, skill_id, type)
    );

    CREATE INDEX IF NOT EXISTS idx_user_skill_preferences_user
      ON user_skill_preferences(user_id);

    CREATE TABLE IF NOT EXISTS learnx_sessions (
      id SERIAL PRIMARY KEY,
      learner_id INTEGER NOT NULL,
      mentor_id INTEGER NOT NULL,
      skill_id UUID NOT NULL REFERENCES skills(id),
      scheduled_at TIMESTAMPTZ NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
      learner_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
      mentor_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
      credits_processed BOOLEAN NOT NULL DEFAULT FALSE,
      room_name VARCHAR(255) UNIQUE NOT NULL,
      message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_learnx_sessions_learner
      ON learnx_sessions(learner_id);
    CREATE INDEX IF NOT EXISTS idx_learnx_sessions_mentor
      ON learnx_sessions(mentor_id);

    CREATE TABLE IF NOT EXISTS learnx_session_notes (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES learnx_sessions(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL,
      content TEXT,
      file_name VARCHAR(255),
      file_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS learnx_credit_transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      type VARCHAR(50) NOT NULL,
      description TEXT,
      session_id INTEGER REFERENCES learnx_sessions(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, session_id, type)
    );

    CREATE TABLE IF NOT EXISTS learnx_course_enrollments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      course_id UUID NOT NULL,
      enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS learnx_lesson_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      course_id UUID NOT NULL,
      lesson_index INTEGER NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT TRUE,
      completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, course_id, lesson_index)
    );

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS terms_version TEXT;
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0;
  `);

  for (const [name, category, description] of defaultSkills) {
    const existing = await pool.query(
      `SELECT id FROM skills WHERE name = $1 LIMIT 1`,
      [name]
    );
    if (existing.rowCount) {
      await pool.query(
        `UPDATE skills
         SET category = $2, description = $3
         WHERE id = $1`,
        [existing.rows[0].id, category, description]
      );
    } else {
      await pool.query(
        `INSERT INTO skills (name, category, description)
         VALUES ($1, $2, $3)`,
        [name, category, description]
      );
    }
  }

  // Give the two existing demo users their requested real DB skill preferences.
  const demoPreferences = [
    ['rathikasris28@gmail.com', 'Drawing', 'SHARE', 'Advanced'],
    ['rathikasris28@gmail.com', 'Video Editing', 'SHARE', 'Advanced'],
    ['rathikasris28@gmail.com', 'Painting', 'SHARE', 'Intermediate'],
    ['rathikasris28@gmail.com', 'Artificial Intelligence', 'LEARN', 'Intermediate'],
    ['rathikasris28@gmail.com', 'Career Skills', 'LEARN', 'Intermediate'],
    ['rathikasris28@gmail.com', 'Deep Learning', 'LEARN', 'Intermediate'],
    ['r31668797@gmail.com', 'Drawing', 'LEARN', 'Beginner'],
    ['r31668797@gmail.com', 'Video Editing', 'LEARN', 'Beginner'],
    ['r31668797@gmail.com', 'Painting', 'LEARN', 'Beginner'],
    ['r31668797@gmail.com', 'Artificial Intelligence', 'SHARE', 'Intermediate'],
    ['r31668797@gmail.com', 'Career Skills', 'SHARE', 'Intermediate'],
    ['r31668797@gmail.com', 'Deep Learning', 'SHARE', 'Intermediate']
  ];

  for (const [email, skillName, type, level] of demoPreferences) {
    await pool.query(
      `INSERT INTO user_skill_preferences (user_id, skill_id, type, level)
       SELECT u.id, s.id, $3, $4
       FROM users u CROSS JOIN skills s
       WHERE LOWER(u.email)=LOWER($1) AND s.name=$2
       ON CONFLICT (user_id, skill_id, type)
       DO UPDATE SET level=EXCLUDED.level`,
      [email, skillName, type, level]
    );
  }

  console.log('Database initialized successfully.');
}

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      database: 'connected',
      service: 'LearnX backend'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected'
    });
  }
});
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const result = await pool.query(
      `SELECT id,name,email,password,role,city,state,language,education_status,credits,
              avatar_url,terms_accepted,terms_accepted_at,terms_version,created_at
       FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1`,
      [String(email).trim()]
    );

    if (!result.rows.length) return res.status(401).json({ error: 'Invalid email or password' });

    const user = result.rows[0];
    const valid = isHashedPassword(user.password)
      ? user.password === hashPassword(String(password))
      : user.password === String(password);

    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    // Upgrade legacy plaintext demo passwords after successful login.
    if (!isHashedPassword(user.password)) {
      await pool.query(`UPDATE users SET password=$1 WHERE id=$2`, [hashPassword(String(password)), user.id]);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      name, email, password, role, city, state, language,
      education_status, terms_accepted, learn_skills = [], share_skills = []
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password and role are required.' });
    }
    if (!terms_accepted) {
      return res.status(400).json({ error: 'You must accept the LearnX Terms & Conditions to create an account.' });
    }
    if (!['LEARNER', 'KNOWLEDGE_SHARER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const credits = role === 'LEARNER' ? 5 : 0;
    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO users
       (name,email,password,role,city,state,language,education_status,credits,terms_accepted,terms_accepted_at,terms_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,NOW(),'1.0')
       RETURNING id,name,email,role,city,state,language,education_status,credits,
                 avatar_url,terms_accepted,terms_accepted_at,terms_version,created_at`,
      [name, String(email).trim(), hashPassword(String(password)), role, city || null, state || null,
       language || 'English', education_status || null, credits]
    );

    const user = userResult.rows[0];

    if (role === 'LEARNER' && credits === 5) {
      await client.query(
        `INSERT INTO learnx_credit_transactions
         (user_id,amount,type,description)
         VALUES ($1,5,'WELCOME','Welcome Time Credits')
         ON CONFLICT DO NOTHING`,
        [user.id]
      );
    }

    for (const item of [...learn_skills.map((x: any) => ({ x, type: 'LEARN' })),
                         ...share_skills.map((x: any) => ({ x, type: 'SHARE' }))]) {
      const skillName = typeof item.x === 'string' ? item.x : item.x?.name;
      const level = typeof item.x === 'object' && item.x?.level ? item.x.level : 'Intermediate';
      if (!skillName) continue;

      const skillResult = await client.query(
        `INSERT INTO skills (name,category,description)
         VALUES ($1,'Technical','')
         ON CONFLICT(name) DO UPDATE SET name=EXCLUDED.name
         RETURNING id`,
        [skillName.trim()]
      );

      await client.query(
        `INSERT INTO user_skill_preferences(user_id,skill_id,type,level)
         VALUES($1,$2,$3,$4)
         ON CONFLICT(user_id,skill_id,type) DO UPDATE SET level=EXCLUDED.level`,
        [user.id, skillResult.rows[0].id, item.type, level]
      );
    }

    await client.query('COMMIT');

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Registration error:', err);
    if (err?.code === '23505') return res.status(409).json({ error: 'An account with this email already exists.' });
    res.status(500).json({ error: 'Registration failed.' });
  } finally {
    client.release();
  }
});

app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
  try {
    const userResult = await pool.query(`SELECT * FROM users WHERE id=$1 LIMIT 1`, [req.user.id]);
    if (!userResult.rows.length) return res.status(404).json({ error: 'User not found' });

    const skillResult = await pool.query(
      `SELECT s.id,s.name,s.category,s.description,usp.type,usp.level
       FROM user_skill_preferences usp
       JOIN skills s ON s.id=usp.skill_id
       WHERE usp.user_id=$1 ORDER BY s.name`,
      [req.user.id]
    );

    res.json({ user: sanitizeUser(userResult.rows[0]), skills: skillResult.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/skills', async (_req, res) => {
  try {
    const result = await pool.query(`SELECT id,name,category,description FROM skills ORDER BY name`);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/matching', authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(
      `SELECT
         u.id,u.name,u.email,u.role,u.city,u.state,u.language,u.education_status,u.credits,u.avatar_url,
         COUNT(DISTINCT wanted.skill_id) AS matched_skills,
         COALESCE(ARRAY_AGG(DISTINCT shared.name) FILTER (WHERE shared.name IS NOT NULL), '{}') AS skills
       FROM users u
       JOIN user_skill_preferences shared_pref
         ON shared_pref.user_id=u.id AND shared_pref.type='SHARE'
       JOIN skills shared ON shared.id=shared_pref.skill_id
       JOIN user_skill_preferences wanted
         ON wanted.user_id=$1 AND wanted.type='LEARN' AND wanted.skill_id=shared_pref.skill_id
       WHERE u.role='KNOWLEDGE_SHARER' AND u.id<>$1
       GROUP BY u.id
       ORDER BY matched_skills DESC, u.name`,
      [req.user.id]
    );

    res.json(result.rows.map((m: any) => ({
      ...m,
      matched_skills: Number(m.matched_skills || 0),
      matchScore: Math.min(100, 70 + Number(m.matched_skills || 0) * 10),
      skills: (m.skills || []).map((name: string) => ({ name, type: 'SHARE', level: 'Intermediate' }))
    })));
  } catch (err: any) {
    console.error('Matching error:', err);
    res.status(500).json({ error: 'Unable to load matching results.' });
  }
});

app.get('/api/sessions', authenticateToken, async (req: any, res) => {
  const result = await pool.query(
    `SELECT s.*, l.name AS learner_name, m.name AS mentor_name, sk.name AS skill_name
     FROM learnx_sessions s
     LEFT JOIN users l ON l.id=s.learner_id
     LEFT JOIN users m ON m.id=s.mentor_id
     LEFT JOIN skills sk ON sk.id=s.skill_id
     WHERE s.learner_id=$1 OR s.mentor_id=$1
     ORDER BY s.scheduled_at DESC`,
    [req.user.id]
  );
  res.json(result.rows);
});

app.post('/api/sessions', authenticateToken, async (req: any, res) => {
  try {
    const { mentor_id, skill_id, scheduled_at, message } = req.body;
    if (!mentor_id || !skill_id || !scheduled_at) {
      return res.status(400).json({ error: 'mentor_id, skill_id and scheduled_at are required.' });
    }

    const mentor = await pool.query(
      `SELECT u.id FROM users u
       JOIN user_skill_preferences usp ON usp.user_id=u.id AND usp.type='SHARE'
       WHERE u.id=$1 AND u.role='KNOWLEDGE_SHARER' AND usp.skill_id=$2 LIMIT 1`,
      [Number(mentor_id), skill_id]
    );
    if (!mentor.rows.length) return res.status(400).json({ error: 'Mentor does not share this skill.' });

    const roomName = `learnx-${crypto.randomUUID()}`;
    const result = await pool.query(
      `INSERT INTO learnx_sessions
       (learner_id,mentor_id,skill_id,scheduled_at,status,room_name,message)
       VALUES($1,$2,$3,$4,'PENDING',$5,$6)
       RETURNING *`,
      [req.user.id, Number(mentor_id), skill_id, scheduled_at, roomName, message || null]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Create session error:', err);
    res.status(500).json({ error: 'Unable to create session.' });
  }
});

async function updateSessionStatus(req: any, res: any, status: string) {
  try {
    const result = await pool.query(
      `UPDATE learnx_sessions
       SET status=$1,updated_at=NOW()
       WHERE id=$2 AND mentor_id=$3
       RETURNING *`,
      [status, Number(req.params.id), req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Session not found or unauthorized.' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Unable to update session.' });
  }
}

app.post('/api/sessions/:id/accept', authenticateToken, (req, res) => updateSessionStatus(req, res, 'ACCEPTED'));
app.post('/api/sessions/:id/reject', authenticateToken, (req, res) => updateSessionStatus(req, res, 'REJECTED'));

app.post('/api/sessions/:id/complete', authenticateToken, async (req: any, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sessionResult = await client.query(
      `SELECT * FROM learnx_sessions WHERE id=$1 FOR UPDATE`,
      [Number(req.params.id)]
    );
    if (!sessionResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Session not found.' });
    }

    const session = sessionResult.rows[0];
    if (![session.learner_id, session.mentor_id].includes(req.user.id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    const updateField = req.user.id === session.learner_id ? 'learner_confirmed' : 'mentor_confirmed';
    await client.query(
      `UPDATE learnx_sessions SET ${updateField}=TRUE,updated_at=NOW() WHERE id=$1`,
      [session.id]
    );

    const updated = await client.query(`SELECT * FROM learnx_sessions WHERE id=$1`, [session.id]);
    const current = updated.rows[0];

    if (current.learner_confirmed && current.mentor_confirmed && !current.credits_processed) {
      await client.query(
        `UPDATE learnx_sessions
         SET status='COMPLETED',credits_processed=TRUE,updated_at=NOW()
         WHERE id=$1`,
        [session.id]
      );

      await client.query(
        `UPDATE users SET credits=COALESCE(credits,0)+1 WHERE id=$1`,
        [session.mentor_id]
      );

      await client.query(
        `INSERT INTO learnx_credit_transactions
         (user_id,amount,type,description,session_id)
         VALUES($1,1,'EARNED','Earned from verified learning session',$2)
         ON CONFLICT(user_id,session_id,type) DO NOTHING`,
        [session.mentor_id, session.id]
      );
    }

    await client.query('COMMIT');
    const finalResult = await pool.query(
      `SELECT s.*, l.name AS learner_name, m.name AS mentor_name, sk.name AS skill_name
       FROM learnx_sessions s
       LEFT JOIN users l ON l.id=s.learner_id
       LEFT JOIN users m ON m.id=s.mentor_id
       LEFT JOIN skills sk ON sk.id=s.skill_id
       WHERE s.id=$1`,
      [session.id]
    );
    res.json(finalResult.rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Complete session error:', err);
    res.status(500).json({ error: 'Unable to complete session.' });
  } finally {
    client.release();
  }
});

app.get('/api/sessions/:id/notes', authenticateToken, async (req: any, res) => {
  const sessionId = Number(req.params.id);
  const access = await pool.query(
    `SELECT id FROM learnx_sessions WHERE id=$1 AND (learner_id=$2 OR mentor_id=$2)`,
    [sessionId, req.user.id]
  );
  if (!access.rows.length) return res.status(403).json({ error: 'Unauthorized' });

  const result = await pool.query(
    `SELECT content,file_name,file_url,created_at FROM learnx_session_notes
     WHERE session_id=$1 ORDER BY created_at ASC`,
    [sessionId]
  );
  res.json({
    content: result.rows.map((r: any) => r.content || '').filter(Boolean).join('\n\n') ||
      '# Session Notes & Shared Materials\n\n- Add notes during the session.',
    uploadedFiles: result.rows.filter((r: any) => r.file_name && r.file_url)
      .map((r: any) => ({ name: r.file_name, url: r.file_url }))
  });
});

app.post('/api/sessions/:id/notes', authenticateToken, async (req: any, res) => {
  const sessionId = Number(req.params.id);
  const access = await pool.query(
    `SELECT id FROM learnx_sessions WHERE id=$1 AND (learner_id=$2 OR mentor_id=$2)`,
    [sessionId, req.user.id]
  );
  if (!access.rows.length) return res.status(403).json({ error: 'Unauthorized' });

  const { content, file_name, file_url } = req.body;
  await pool.query(
    `INSERT INTO learnx_session_notes(session_id,user_id,content,file_name,file_url)
     VALUES($1,$2,$3,$4,$5)`,
    [sessionId, req.user.id, content || null, file_name || null, file_url || null]
  );
  res.json({ success: true });
});

app.get('/api/livekit/token', authenticateToken, async (req: any, res) => {
  try {
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      return res.status(503).json({ error: 'LiveKit is not configured on the backend.' });
    }

    const roomName = String(req.query.room || '');
    if (!roomName) return res.status(400).json({ error: 'Room name is required.' });

    const session = await pool.query(
      `SELECT id FROM learnx_sessions
       WHERE room_name=$1 AND (learner_id=$2 OR mentor_id=$2) AND status IN ('ACCEPTED','IN_PROGRESS','COMPLETED')
       LIMIT 1`,
      [roomName, req.user.id]
    );
    if (!session.rows.length) return res.status(403).json({ error: 'You are not authorized for this session room.' });

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: `user-${req.user.id}`
    });
    at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
    const token = await at.toJwt();
    res.json({ token, wsUrl: LIVEKIT_URL });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const memoryCourses = [
  {
    id: 1,
    title: 'Python Programming Fundamentals',
    category: 'Programming',
    description: 'Master Python programming from scratch with hands-on examples, data structures, and algorithms.',
    difficulty: 'Beginner',
    duration: '4 Weeks',
    instructor: 'Rathika Sri',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
    skills: ['Python'],
    lessons: [
      { title: 'Module 1: Introduction to Python & Syntax', duration: '45m' },
      { title: 'Module 2: Variables, Types & Operators', duration: '50m' },
      { title: 'Module 3: Conditionals & Loops', duration: '60m' },
      { title: 'Module 4: Functions & Modules', duration: '55m' },
      { title: 'Module 5: Capstone Mini Project', duration: '90m' }
    ]
  },
  {
    id: 2,
    title: 'UI/UX Design Masterclass',
    category: 'Design',
    description: 'Learn wireframing, prototyping, user research, and modern design principles in Figma.',
    difficulty: 'Intermediate',
    duration: '6 Weeks',
    instructor: 'Rathika Sri',
    thumbnail: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&w=800&q=80',
    skills: ['UI/UX'],
    lessons: [
      { title: 'Module 1: Design Thinking & Empathy Maps', duration: '40m' },
      { title: 'Module 2: Wireframing & Information Architecture', duration: '50m' },
      { title: 'Module 3: High Fidelity UI & Typography', duration: '60m' },
      { title: 'Module 4: Interactive Prototyping in Figma', duration: '75m' }
    ]
  },
  {
    id: 3,
    title: 'English Communication & Public Speaking',
    category: 'Communication',
    description: 'Build unstoppable confidence in professional speaking, active listening, and presentations.',
    difficulty: 'Beginner',
    duration: '3 Weeks',
    instructor: 'Rathika Sri',
    thumbnail: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80',
    skills: ['English', 'Communication'],
    lessons: [
      { title: 'Module 1: Overcoming Stage Fear', duration: '30m' },
      { title: 'Module 2: Vocal Tonality & Body Language', duration: '45m' },
      { title: 'Module 3: Persuasive Storytelling', duration: '50m' }
    ]
  },
  {
    id: 4,
    title: 'Introduction to Artificial Intelligence',
    category: 'Artificial Intelligence',
    description: 'Explore prompt engineering, RAG, and modern LLM integrations with hands-on projects.',
    difficulty: 'Beginner',
    duration: '5 Weeks',
    instructor: 'Rathika Sri',
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=800&q=80',
    skills: ['Artificial Intelligence'],
    lessons: [
      { title: 'Module 1: History of AI & Neural Networks', duration: '45m' },
      { title: 'Module 2: Prompt Engineering Best Practices', duration: '50m' },
      { title: 'Module 3: Building AI Agents', duration: '75m' }
    ]
  },
  {
    id: 5,
    title: 'Data Science & Pandas Masterclass',
    category: 'Data Science',
    description: 'Clean, analyze, and visualize complex datasets using Python, Pandas, and Matplotlib.',
    difficulty: 'Intermediate',
    duration: '6 Weeks',
    instructor: 'Rathika Sri',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    skills: ['Python', 'SQL'],
    lessons: [
      { title: 'Module 1: NumPy & Data Arrays', duration: '50m' },
      { title: 'Module 2: Pandas DataFrames & Cleaning', duration: '60m' },
      { title: 'Module 3: Data Visualization with Seaborn', duration: '65m' }
    ]
  },
  {
    id: 6,
    title: 'Web Development Fundamentals',
    category: 'Web Development',
    description: 'Master HTML, CSS, JavaScript, and React end-to-end to build modern web applications.',
    difficulty: 'Beginner',
    duration: '8 Weeks',
    instructor: 'Rathika Sri',
    thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
    skills: ['React', 'JavaScript'],
    lessons: [
      { title: 'Module 1: HTML5 & Semantic Web', duration: '45m' },
      { title: 'Module 2: CSS Flexbox & Tailwind CSS', duration: '60m' },
      { title: 'Module 3: JavaScript ES6 & DOM Manipulation', duration: '75m' },
      { title: 'Module 4: React Components & Hooks', duration: '90m' }
    ]
  }
];

const memoryBootcamps = [
  { id: 1, title: 'Full-Stack Web Dev Bootcamp', description: 'React, Node, PostgreSQL', category: 'Technical', start_date: '2026-10-15', end_date: '2026-12-15', mentor_id: 1, lessons: [{ week: 1, topic: 'HTML/JS' }], participants_count: 42 }
];

const memoryQuizzes = [
  {
    id: 1,
    title: 'Python Comprehensive Master Quiz (Beginner to Advanced)',
    category: 'Technical',
    difficulty: 'All Levels',
    questions: Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      question: `Python Question ${i + 1}: What is the output or behavior of Python construct #${i + 1}?`,
      options: ['Option A (Correct)', 'Option B', 'Option C', 'Option D'],
      correct: 0,
      explanation: `Detailed explanation for Python concept #${i + 1}.`
    }))
  },
  {
    id: 2,
    title: 'JavaScript & React Full Stack Quiz (Beginner to Advanced)',
    category: 'Technical',
    difficulty: 'All Levels',
    questions: Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      question: `JS/React Question ${i + 1}: Regarding modern JavaScript closures, hooks, or async operations #${i + 1}?`,
      options: ['Option A (Correct)', 'Option B', 'Option C', 'Option D'],
      correct: 0,
      explanation: `Detailed explanation for JavaScript/React concept #${i + 1}.`
    }))
  },
  {
    id: 3,
    title: 'AI, Machine Learning & Deep Learning Quiz (Beginner to Advanced)',
    category: 'Technical',
    difficulty: 'All Levels',
    questions: Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      question: `AI/ML Question ${i + 1}: Regarding neural networks, gradients, or transformer attention #${i + 1}?`,
      options: ['Option A (Correct)', 'Option B', 'Option C', 'Option D'],
      correct: 0,
      explanation: `Detailed explanation for AI/ML concept #${i + 1}.`
    }))
  },
  {
    id: 4,
    title: 'Drawing, Painting & Visual Arts Quiz (Beginner to Advanced)',
    category: 'Non-Technical',
    difficulty: 'All Levels',
    questions: Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      question: `Art Question ${i + 1}: Regarding color harmony, perspective, or brush techniques #${i + 1}?`,
      options: ['Option A (Correct)', 'Option B', 'Option C', 'Option D'],
      correct: 0,
      explanation: `Detailed explanation for art and painting concept #${i + 1}.`
    }))
  },
  {
    id: 5,
    title: 'English Communication & Public Speaking Quiz (Beginner to Advanced)',
    category: 'Non-Technical',
    difficulty: 'All Levels',
    questions: Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      question: `Communication Question ${i + 1}: Regarding vocal tonality, active listening, or persuasive structure #${i + 1}?`,
      options: ['Option A (Correct)', 'Option B', 'Option C', 'Option D'],
      correct: 0,
      explanation: `Detailed explanation for communication concept #${i + 1}.`
    }))
  }
];

app.get('/api/courses', async (_req, res) => {
  res.json(memoryCourses);
});

app.post('/api/courses/:id/enroll', authenticateToken, async (req: any, res) => {
  try {
    const courseId = req.params.id;
    await pool.query(
      `INSERT INTO learnx_course_enrollments(user_id,course_id)
       VALUES($1,$2) ON CONFLICT(user_id,course_id) DO NOTHING`,
      [req.user.id, courseId]
    );
    res.json({ success: true, message: 'Enrolled successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Unable to enroll in course.' });
  }
});

app.get('/api/courses/enrollments', authenticateToken, async (req: any, res) => {
  try {
    const enrollments = await pool.query(
      `SELECT course_id,enrolled_at FROM learnx_course_enrollments WHERE user_id=$1`,
      [req.user.id]
    );
    const progress = await pool.query(
      `SELECT course_id,lesson_index,completed FROM learnx_lesson_progress WHERE user_id=$1`,
      [req.user.id]
    );

    const result = enrollments.rows.map((e: any) => {
      const course = memoryCourses.find((c: any) => String(c.id) === String(e.course_id));
      const totalLessons = course?.lessons?.length || 1;
      const completedLessons = progress.rows.filter(
        (p: any) => String(p.course_id) === String(e.course_id) && p.completed
      ).length;
      return {
        course_id: e.course_id,
        enrolled_at: e.enrolled_at,
        progress: Math.min(100, Math.round((completedLessons / totalLessons) * 100)),
        completed_lessons: completedLessons,
        total_lessons: totalLessons
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Unable to load enrollments.' });
  }
});

app.post('/api/courses/:courseId/lessons/:lessonIndex/complete', authenticateToken, async (req: any, res) => {
  try {
    await pool.query(
      `INSERT INTO learnx_lesson_progress(user_id,course_id,lesson_index,completed)
       VALUES($1,$2,$3,TRUE)
       ON CONFLICT(user_id,course_id,lesson_index)
       DO UPDATE SET completed=TRUE,completed_at=NOW()`,
      [req.user.id, req.params.courseId, Number(req.params.lessonIndex)]
    );
    res.json({ success: true, message: 'Lesson completed' });
  } catch (err: any) {
    res.status(500).json({ error: 'Unable to save lesson progress.' });
  }
});

app.get('/api/bootcamps', async (_req, res) => res.json(memoryBootcamps));
app.post('/api/bootcamps/:id/join', authenticateToken, async (_req, res) =>
  res.json({ success: true, message: 'Joined bootcamp' })
);

app.get('/api/quizzes', async (_req, res) => {
  res.json(memoryQuizzes.map((q: any) => ({
    id: q.id, title: q.title, category: q.category, difficulty: q.difficulty
  })));
});

app.get('/api/quizzes/:id', async (req, res) => {
  const quiz = memoryQuizzes.find((q: any) => q.id === Number(req.params.id));
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  res.json(quiz);
});

app.post('/api/quizzes/:id/submit', authenticateToken, async (req: any, res) => {
  const quiz = memoryQuizzes.find((q: any) => q.id === Number(req.params.id));
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  const answers = req.body.answers || [];
  let score = 0;
  quiz.questions.forEach((q: any, idx: number) => {
    if (answers[idx] === q.correct) score++;
  });

  const percentage = Math.round((score / quiz.questions.length) * 100);
  res.json({ score, total: quiz.questions.length, percentage, questions: quiz.questions });
});

app.get('/api/credits', authenticateToken, async (req: any, res) => {
  try {
    const userResult = await pool.query(`SELECT credits FROM users WHERE id=$1`, [req.user.id]);
    if (!userResult.rows.length) return res.status(404).json({ error: 'User not found' });

    const txResult = await pool.query(
      `SELECT id,amount,type,description,created_at FROM learnx_credit_transactions
       WHERE user_id=$1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ credits: userResult.rows[0].credits || 0, transactions: txResult.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Unable to load credits.' });
  }
});

app.post('/api/ai/recommend', authenticateToken, async (req: any, res) => {
  try {
    if (!process.env.GEMINI_API_KEY && !process.env.AI_API_KEY) {
      return res.json({ recommendation: 'Keep practicing and exploring new mentors to accelerate your growth!' });
    }
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: req.body.prompt || 'Give me personalized learning advice.'
    });
    res.json({ recommendation: response.text });
  } catch {
    res.json({ recommendation: 'Keep practicing and exploring new mentors to accelerate your growth!' });
  }
});

await initDB();

if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);
} else {
 const distPath = path.resolve(import.meta.dirname, "dist");
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`LearnX server running on port ${PORT}`);
});
