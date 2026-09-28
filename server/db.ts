import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// Ensure data directory exists
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'learnx.db');
export const db = new DatabaseSync(dbPath);

// Initialize relational tables
export function initDatabase() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      mobile TEXT,
      password_hash TEXT,
      age_group TEXT,
      city TEXT,
      state TEXT,
      preferred_language TEXT DEFAULT 'English',
      education_status TEXT,
      profile_photo TEXT,
      bio TEXT,
      role TEXT DEFAULT 'LEARNER',
      is_email_verified INTEGER DEFAULT 0,
      onboarding_completed INTEGER DEFAULT 0,
      terms_accepted_at TEXT,
      learning_goal TEXT,
      target_skill_level TEXT,
      learning_schedule TEXT,
      learning_interests_json TEXT DEFAULT '[]',
      mentor_experience TEXT,
      mentor_languages_json TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_skills (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      skill_type TEXT NOT NULL CHECK(skill_type IN ('LEARN', 'SHARE')),
      skill_level TEXT NOT NULL CHECK(skill_level IN ('BEGINNER', 'ELEMENTARY', 'INTERMEDIATE', 'ADVANCED')),
      experience TEXT,
      languages_json TEXT DEFAULT '[]',
      skill_description TEXT,
      beginner_friendly INTEGER DEFAULT 0,
      skill_proof TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
      UNIQUE(user_id, skill_id, skill_type)
    );

    CREATE TABLE IF NOT EXISTS learning_goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      goal_text TEXT NOT NULL,
      target_date TEXT,
      target_level TEXT DEFAULT 'INTERMEDIATE',
      preferred_schedule TEXT DEFAULT '',
      status TEXT DEFAULT 'IN_PROGRESS',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_availability (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'INACTIVE', 'IN_CLASS')),
      available_from TEXT DEFAULT '17:00:00',
      available_until TEXT DEFAULT '21:00:00',
      days_of_week TEXT DEFAULT '["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]',
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      learner_id TEXT NOT NULL,
      knowledge_sharer_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      session_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 60,
      status TEXT NOT NULL CHECK(status IN ('REQUESTED', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED')),
      learning_goal TEXT NOT NULL,
      room_id TEXT NOT NULL,
      session_stage TEXT NOT NULL DEFAULT 'REQUESTED',
      learner_joined_at TEXT,
      sharer_joined_at TEXT,
      started_at TEXT,
      ended_at TEXT,
      duration_seconds INTEGER DEFAULT 0,
      verified_credits REAL DEFAULT 0,
      verified_at TEXT,
      learner_confirmed INTEGER DEFAULT 0,
      sharer_confirmed INTEGER DEFAULT 0,
      credit_awarded INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (learner_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      FOREIGN KEY (knowledge_sharer_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS time_credit_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      balance INTEGER DEFAULT 0,
      total_earned INTEGER DEFAULT 0,
      total_spent INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS credit_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_id TEXT,
      amount INTEGER NOT NULL,
      transaction_type TEXT NOT NULL CHECK(transaction_type IN ('EARNED', 'USED', 'REVERSAL', 'ADJUSTMENT', 'WELCOME_BONUS')),
      status TEXT DEFAULT 'COMPLETED',
      description TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      rater_id TEXT NOT NULL,
      ratee_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('LEARNER_RATING_SHARER', 'SHARER_RATING_LEARNER')),
      rating_knowledge_or_participation INTEGER NOT NULL,
      rating_communication INTEGER NOT NULL,
      rating_punctuality INTEGER NOT NULL,
      rating_helpfulness_or_effort INTEGER NOT NULL,
      rating_respect INTEGER NOT NULL,
      overall_score REAL NOT NULL,
      feedback TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (rater_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      FOREIGN KEY (ratee_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      UNIQUE(session_id, rater_id)
    );

    CREATE TABLE IF NOT EXISTS trust_scores (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      score INTEGER DEFAULT 85,
      completed_sessions INTEGER DEFAULT 0,
      attendance_rate REAL DEFAULT 100.0,
      reliability_score INTEGER DEFAULT 95,
      rating_avg REAL DEFAULT 5.0,
      verification_level TEXT DEFAULT 'COMMUNITY_VERIFIED',
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS skill_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      verification_level TEXT NOT NULL CHECK(verification_level IN ('SELF_CLAIMED', 'AI_ASSESSED', 'COMMUNITY_VERIFIED', 'INSTITUTION_VERIFIED')),
      verification_source TEXT NOT NULL,
      verification_date TEXT DEFAULT (datetime('now')),
      status TEXT DEFAULT 'ACTIVE',
      evidence_notes TEXT,
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
      UNIQUE(user_id, skill_id)
    );

    CREATE TABLE IF NOT EXISTS learning_paths (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      title TEXT NOT NULL,
      duration_weeks INTEGER DEFAULT 4,
      structured_plan_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS learning_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      progress_percentage REAL DEFAULT 0,
      completed_sessions INTEGER DEFAULT 0,
      total_learning_minutes INTEGER DEFAULT 0,
      weak_topics_json TEXT DEFAULT '[]',
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
      UNIQUE(user_id, skill_id)
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      skill_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      time_limit_minutes INTEGER DEFAULT 15,
      passing_score INTEGER DEFAULT 70,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      question_text TEXT NOT NULL,
      options_json TEXT NOT NULL,
      correct_option_index INTEGER NOT NULL,
      explanation TEXT,
      topic TEXT,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      passed INTEGER NOT NULL,
      weak_topics_json TEXT DEFAULT '[]',
      answers_json TEXT NOT NULL,
      completed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      selected_option_index INTEGER,
      is_correct INTEGER NOT NULL,
      FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS skill_assessments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      latest_attempt_id TEXT,
      demonstrated_level TEXT DEFAULT 'BEGINNER',
      score INTEGER DEFAULT 0,
      percentage REAL DEFAULT 0,
      strong_topics_json TEXT DEFAULT '[]',
      weak_topics_json TEXT DEFAULT '[]',
      assessed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
      UNIQUE(user_id, skill_id)
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      condition_type TEXT NOT NULL,
      required_count INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      achievement_id TEXT NOT NULL,
      awarded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
      UNIQUE(user_id, achievement_id)
    );

    CREATE TABLE IF NOT EXISTS partners (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      organization_name TEXT NOT NULL,
      description TEXT,
      logo_url TEXT,
      website TEXT,
      verified INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      partner_id TEXT,
      partner_name TEXT DEFAULT '',
      name TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      description TEXT NOT NULL,
      duration TEXT NOT NULL,
      schedule TEXT,
      requirements TEXT,
      syllabus_json TEXT DEFAULT '[]',
      learning_outcomes_json TEXT DEFAULT '[]',
      level TEXT DEFAULT 'ALL_LEVELS',
      learning_mode TEXT DEFAULT 'ONLINE',
      certificate_eligibility INTEGER DEFAULT 1,
      is_demo INTEGER DEFAULT 0,
      status TEXT DEFAULT 'ACTIVE',
      external_url TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS course_enrollments (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'ENROLLED',
      progress_percentage REAL DEFAULT 0,
      enrolled_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      UNIQUE(course_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS bootcamps (
      id TEXT PRIMARY KEY,
      partner_id TEXT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      schedule TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      requirements TEXT,
      syllabus_json TEXT DEFAULT '[]',
      learning_outcomes_json TEXT DEFAULT '[]',
      category TEXT DEFAULT 'General',
      duration TEXT DEFAULT '4 Weeks',
      level TEXT DEFAULT 'ALL_LEVELS',
      mode TEXT DEFAULT 'ONLINE',
      provider_name TEXT DEFAULT '',
      certificate_eligibility INTEGER DEFAULT 0,
      time_credit_cost INTEGER DEFAULT 0,
      is_demo INTEGER DEFAULT 0,
      status TEXT DEFAULT 'ACTIVE',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bootcamp_enrollments (
      id TEXT PRIMARY KEY,
      bootcamp_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'REGISTERED',
      attendance_count INTEGER DEFAULT 0,
      assessment_score REAL DEFAULT 0,
      enrolled_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (bootcamp_id) REFERENCES bootcamps(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      UNIQUE(bootcamp_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      certificate_id TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      course_id TEXT,
      bootcamp_id TEXT,
      provider_name TEXT NOT NULL,
      title TEXT NOT NULL,
      issue_date TEXT DEFAULT (datetime('now')),
      verification_url TEXT NOT NULL,
      status TEXT DEFAULT 'VALID',
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL,
      reported_user_id TEXT NOT NULL,
      session_id TEXT,
      report_type TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      admin_notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (reporter_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      FOREIGN KEY (reported_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS blocked_users (
      id TEXT PRIMARY KEY,
      blocker_id TEXT NOT NULL,
      blocked_user_id TEXT NOT NULL,
      reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (blocker_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      FOREIGN KEY (blocked_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      UNIQUE(blocker_id, blocked_user_id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      details_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS learning_notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      skill_id TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      note_type TEXT DEFAULT 'PERSONAL' CHECK(note_type IN ('PERSONAL', 'SESSION', 'LEARNING', 'RESOURCE')),
      visibility TEXT DEFAULT 'PRIVATE' CHECK(visibility IN ('PRIVATE', 'SESSION_ONLY', 'SHARED')),
      attachment_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS session_notes (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      note_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (note_id) REFERENCES learning_notes(id) ON DELETE CASCADE,
      UNIQUE(session_id, note_id)
    );

    CREATE TABLE IF NOT EXISTS session_chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS session_private_notes (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      UNIQUE(session_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS bootcamps (
      id TEXT PRIMARY KEY,
      partner_id TEXT,
      skill_id TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      level TEXT DEFAULT 'BEGINNER' CHECK(level IN ('BEGINNER', 'ELEMENTARY', 'INTERMEDIATE', 'ADVANCED')),
      duration TEXT NOT NULL,
      language TEXT DEFAULT 'English',
      mode TEXT DEFAULT 'ONLINE' CHECK(mode IN ('ONLINE', 'OFFLINE', 'HYBRID')),
      location TEXT,
      meeting_url TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      registration_deadline TEXT NOT NULL,
      capacity INTEGER DEFAULT 50,
      time_credit_cost INTEGER DEFAULT 0,
      status TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED', 'CANCELLED')),
      thumbnail_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS bootcamp_enrollments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      bootcamp_id TEXT NOT NULL,
      status TEXT DEFAULT 'ENROLLED' CHECK(status IN ('ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
      enrolled_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      certificate_id TEXT,
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      FOREIGN KEY (bootcamp_id) REFERENCES bootcamps(id) ON DELETE CASCADE,
      UNIQUE(user_id, bootcamp_id)
    );

    CREATE TABLE IF NOT EXISTS course_enrollments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      status TEXT DEFAULT 'ENROLLED' CHECK(status IN ('ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
      enrolled_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      certificate_id TEXT,
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      UNIQUE(user_id, course_id)
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(verified);
    CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
    CREATE INDEX IF NOT EXISTS idx_bootcamps_status ON bootcamps(status);
    CREATE INDEX IF NOT EXISTS idx_bootcamps_start ON bootcamps(start_date);
    CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON course_enrollments(user_id);
    CREATE INDEX IF NOT EXISTS idx_bootcamp_enrollments_user ON bootcamp_enrollments(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
    CREATE INDEX IF NOT EXISTS idx_learning_notes_user ON learning_notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_learning_notes_skill ON learning_notes(skill_id);
    CREATE INDEX IF NOT EXISTS idx_session_chat_session ON session_chat_messages(session_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_session_private_notes_user ON session_private_notes(user_id, session_id);
  `);

  migrateCreditTransactionTypes();
  db.prepare('UPDATE profiles SET password_hash = NULL WHERE password_hash IS NOT NULL').run();
  try { db.prepare(`ALTER TABLE profiles ADD COLUMN terms_accepted_at TEXT`).run(); } catch {}
  try { db.prepare(`ALTER TABLE profiles ADD COLUMN learning_goal TEXT`).run(); } catch {}
  try { db.prepare(`ALTER TABLE profiles ADD COLUMN target_skill_level TEXT`).run(); } catch {}
  try { db.prepare(`ALTER TABLE profiles ADD COLUMN learning_schedule TEXT`).run(); } catch {}
  try { db.prepare(`ALTER TABLE profiles ADD COLUMN learning_interests_json TEXT DEFAULT '[]'`).run(); } catch {}
  try { db.prepare(`ALTER TABLE profiles ADD COLUMN mentor_experience TEXT`).run(); } catch {}
  try { db.prepare(`ALTER TABLE profiles ADD COLUMN mentor_languages_json TEXT DEFAULT '[]'`).run(); } catch {}
  try { db.prepare(`ALTER TABLE user_skills ADD COLUMN experience TEXT`).run(); } catch {}
  try { db.prepare(`ALTER TABLE user_skills ADD COLUMN languages_json TEXT DEFAULT '[]'`).run(); } catch {}
  try { db.prepare(`ALTER TABLE user_skills ADD COLUMN skill_description TEXT`).run(); } catch {}
  try { db.prepare(`ALTER TABLE user_skills ADD COLUMN beginner_friendly INTEGER DEFAULT 0`).run(); } catch {}
  try { db.prepare(`ALTER TABLE user_skills ADD COLUMN skill_proof TEXT`).run(); } catch {}
  try { db.prepare(`ALTER TABLE learning_goals ADD COLUMN target_level TEXT DEFAULT 'INTERMEDIATE'`).run(); } catch {}
  try { db.prepare(`ALTER TABLE learning_goals ADD COLUMN preferred_schedule TEXT DEFAULT ''`).run(); } catch {}

  // Migrations for session lifecycle and legacy schema compatibility
  try { db.prepare(`ALTER TABLE sessions ADD COLUMN session_stage TEXT NOT NULL DEFAULT 'REQUESTED'`).run(); } catch {}
  try { db.prepare(`ALTER TABLE sessions ADD COLUMN learner_joined_at TEXT`).run(); } catch {}
  try { db.prepare(`ALTER TABLE sessions ADD COLUMN sharer_joined_at TEXT`).run(); } catch {}
  try { db.prepare(`ALTER TABLE sessions ADD COLUMN started_at TEXT`).run(); } catch {}
  try { db.prepare(`ALTER TABLE sessions ADD COLUMN ended_at TEXT`).run(); } catch {}
  try { db.prepare(`ALTER TABLE sessions ADD COLUMN duration_seconds INTEGER DEFAULT 0`).run(); } catch {}
  try { db.prepare(`ALTER TABLE sessions ADD COLUMN verified_credits REAL DEFAULT 0`).run(); } catch {}
  try { db.prepare(`ALTER TABLE sessions ADD COLUMN verified_at TEXT`).run(); } catch {}
  db.prepare(`UPDATE sessions SET session_stage = CASE status WHEN 'REQUESTED' THEN 'REQUESTED' WHEN 'ACCEPTED' THEN 'SCHEDULED' WHEN 'IN_PROGRESS' THEN 'STARTED' WHEN 'COMPLETED' THEN 'VERIFIED' ELSE status END WHERE session_stage = 'REQUESTED' AND status <> 'REQUESTED'`).run();
  try { db.prepare(`ALTER TABLE sessions ADD COLUMN meeting_provider TEXT DEFAULT 'BUILTIN'`).run(); } catch {}
  try { db.prepare(`ALTER TABLE sessions ADD COLUMN meet_link TEXT DEFAULT ''`).run(); } catch {}
  db.prepare(`UPDATE sessions SET meeting_provider = 'BUILTIN', meet_link = '' WHERE meeting_provider <> 'BUILTIN' OR meet_link <> ''`).run();
  db.prepare(`UPDATE sessions SET verified_credits = 1 WHERE status = 'COMPLETED' AND credit_awarded = 1 AND verified_credits = 0`).run();
  try { db.prepare(`ALTER TABLE sessions ADD COLUMN calendar_event_id TEXT DEFAULT ''`).run(); } catch {}
  try { db.prepare(`ALTER TABLE courses ADD COLUMN category TEXT DEFAULT 'General'`).run(); } catch {}
  try { db.prepare(`ALTER TABLE courses ADD COLUMN partner_name TEXT DEFAULT ''`).run(); } catch {}
  try { db.prepare(`ALTER TABLE courses ADD COLUMN external_url TEXT DEFAULT ''`).run(); } catch {}
  try { db.prepare(`ALTER TABLE courses ADD COLUMN level TEXT DEFAULT 'ALL_LEVELS'`).run(); } catch {}
  try { db.prepare(`ALTER TABLE courses ADD COLUMN learning_mode TEXT DEFAULT 'ONLINE'`).run(); } catch {}
  try { db.prepare(`ALTER TABLE courses ADD COLUMN learning_outcomes_json TEXT DEFAULT '[]'`).run(); } catch {}
  try { db.prepare(`ALTER TABLE courses ADD COLUMN is_demo INTEGER DEFAULT 0`).run(); } catch {}
  try { db.prepare(`ALTER TABLE bootcamps ADD COLUMN learning_outcomes_json TEXT DEFAULT '[]'`).run(); } catch {}
  try { db.prepare(`ALTER TABLE bootcamps ADD COLUMN category TEXT DEFAULT 'General'`).run(); } catch {}
  try { db.prepare(`ALTER TABLE bootcamps ADD COLUMN duration TEXT DEFAULT '4 Weeks'`).run(); } catch {}
  try { db.prepare(`ALTER TABLE bootcamps ADD COLUMN level TEXT DEFAULT 'ALL_LEVELS'`).run(); } catch {}
  try { db.prepare(`ALTER TABLE bootcamps ADD COLUMN mode TEXT DEFAULT 'ONLINE'`).run(); } catch {}
  try { db.prepare(`ALTER TABLE bootcamps ADD COLUMN provider_name TEXT DEFAULT ''`).run(); } catch {}
  try { db.prepare(`ALTER TABLE bootcamps ADD COLUMN certificate_eligibility INTEGER DEFAULT 0`).run(); } catch {}
  try { db.prepare(`ALTER TABLE bootcamps ADD COLUMN time_credit_cost INTEGER DEFAULT 0`).run(); } catch {}
  try { db.prepare(`ALTER TABLE bootcamps ADD COLUMN is_demo INTEGER DEFAULT 0`).run(); } catch {}
  try { db.prepare(`ALTER TABLE trust_scores ADD COLUMN rating_avg REAL DEFAULT 5.0`).run(); } catch {}

  // Seed system skills if empty
  const skillCount = (db.prepare('SELECT COUNT(*) as count FROM skills').get() as { count: number }).count;
  if (skillCount === 0) {
    seedInitialSkills();
  }

  // Seed achievements if empty
  const achCount = (db.prepare('SELECT COUNT(*) as count FROM achievements').get() as { count: number }).count;
  if (achCount === 0) {
    seedInitialAchievements();
  }

  // Seed sample quiz if empty
  const quizCount = (db.prepare('SELECT COUNT(*) as count FROM quizzes').get() as { count: number }).count;
  if (quizCount === 0) {
    seedInitialQuizzes();
  }

  seedInitialCourses();
  seedDemoBootcamps();

  // Ensure default Supabase users are registered in local SQLite
  syncInitialSupabaseUsers();
}

function migrateCreditTransactionTypes() {
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'credit_transactions'").get() as { sql: string } | undefined;
  if (schema?.sql && !schema.sql.includes('WELCOME_BONUS')) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(`
        CREATE TABLE credit_transactions_v2 (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          session_id TEXT,
          amount INTEGER NOT NULL,
          transaction_type TEXT NOT NULL CHECK(transaction_type IN ('EARNED', 'USED', 'REVERSAL', 'ADJUSTMENT', 'WELCOME_BONUS')),
          status TEXT DEFAULT 'COMPLETED',
          description TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
        );
        INSERT INTO credit_transactions_v2 SELECT * FROM credit_transactions;
        DROP TABLE credit_transactions;
        ALTER TABLE credit_transactions_v2 RENAME TO credit_transactions;
      `);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_welcome_bonus_once ON credit_transactions(user_id) WHERE transaction_type = 'WELCOME_BONUS'`);
}

function seedInitialSkills() {
  const skills = [
    // Technical skills (12)
    { id: 'sk-py-001', name: 'Python', category: 'Technical', description: 'General-purpose programming, scripting, data manipulation, and software development.' },
    { id: 'sk-java-002', name: 'Java', category: 'Technical', description: 'Enterprise backend development, OOP fundamentals, Spring Boot, and systems.' },
    { id: 'sk-c-003', name: 'C', category: 'Technical', description: 'Low-level systems programming, memory management, and hardware fundamentals.' },
    { id: 'sk-cpp-004', name: 'C++', category: 'Technical', description: 'High-performance computing, game engines, and advanced object-oriented architectures.' },
    { id: 'sk-js-005', name: 'JavaScript', category: 'Technical', description: 'Modern web scripting, asynchronous event loops, DOM, and Node.js environments.' },
    { id: 'sk-web-006', name: 'Web Development', category: 'Technical', description: 'Full-stack web engineering with HTML5, CSS3, React, APIs, and responsive design.' },
    { id: 'sk-ai-007', name: 'Artificial Intelligence', category: 'Technical', description: 'Neural networks, LLM agents, prompt engineering, and intelligent systems.' },
    { id: 'sk-ds-008', name: 'Data Science', category: 'Technical', description: 'Data analytics, Pandas, visualization, statistical modeling, and insights extraction.' },
    { id: 'sk-ml-009', name: 'Machine Learning', category: 'Technical', description: 'Supervised and unsupervised models, scikit-learn, PyTorch, and predictive pipelines.' },
    { id: 'sk-cloud-010', name: 'Cloud Computing', category: 'Technical', description: 'Architecture, serverless functions, Docker, AWS, GCP, and distributed cloud systems.' },
    { id: 'sk-cyber-011', name: 'Cybersecurity', category: 'Technical', description: 'Threat modeling, web security, cryptography, authentication, and ethical penetration.' },
    { id: 'sk-excel-012', name: 'Excel', category: 'Technical', description: 'Advanced formulas, pivot tables, VLOOKUP/XLOOKUP, and financial modeling.' },

    // Non-technical skills (10)
    { id: 'sk-eng-013', name: 'English Speaking', category: 'Non-Technical', description: 'Conversational fluency, accent clarity, professional vocabulary, and idiom usage.' },
    { id: 'sk-tam-014', name: 'Tamil', category: 'Non-Technical', description: 'Spoken Tamil, grammar, cultural contexts, and everyday regional communication.' },
    { id: 'sk-comm-015', name: 'Communication', category: 'Non-Technical', description: 'Active listening, persuasive speaking, clarity, and constructive interpersonal dialogue.' },
    { id: 'sk-pub-016', name: 'Public Speaking', category: 'Non-Technical', description: 'Stage presence, speech structure, storytelling, and managing podium anxiety.' },
    { id: 'sk-lead-017', name: 'Leadership', category: 'Non-Technical', description: 'Team alignment, empathetic delegation, conflict mediation, and vision execution.' },
    { id: 'sk-draw-018', name: 'Drawing', category: 'Non-Technical', description: 'Pencil sketching, perspective fundamentals, shading techniques, and digital art basics.' },
    { id: 'sk-cook-019', name: 'Cooking', category: 'Non-Technical', description: 'Culinary essentials, flavor balancing, ingredient pairing, and traditional recipes.' },
    { id: 'sk-pres-020', name: 'Presentation Skills', category: 'Non-Technical', description: 'Visual slide design, audience engagement, pitch delivery, and pacing techniques.' },
    { id: 'sk-res-021', name: 'Resume Preparation', category: 'Non-Technical', description: 'ATS-optimized formatting, high-impact bullet phrasing, and portfolio integration.' },
    { id: 'sk-int-022', name: 'Interview Preparation', category: 'Non-Technical', description: 'STAR methodology, behavioral questions, salary negotiation, and mock interviews.' }
  ];

  const stmt = db.prepare('INSERT INTO skills (id, name, category, description, is_active) VALUES (?, ?, ?, ?, 1)');
  for (const s of skills) {
    stmt.run(s.id, s.name, s.category, s.description);
  }
}

function seedInitialAchievements() {
  const achievements = [
    { id: 'ach-01', code: 'CONSISTENT_LEARNER', title: 'Consistent Learner', description: 'Completed 3 consecutive learning sessions without cancellation.', icon: 'Zap', condition_type: 'SESSION_STREAK', required_count: 3 },
    { id: 'ach-02', code: 'SKILL_EXPLORER', title: 'Skill Explorer', description: 'Enrolled in skills across both technical and non-technical domains.', icon: 'Compass', condition_type: 'SKILL_DOMAINS', required_count: 2 },
    { id: 'ach-03', code: 'LEARNING_STREAK', title: 'Learning Streak', description: 'Completed sessions or learning modules across 7 distinct days.', icon: 'Flame', condition_type: 'DAY_STREAK', required_count: 7 },
    { id: 'ach-04', code: 'KNOWLEDGE_SHARER', title: 'Knowledge Sharer', description: 'Conducted first verified 1-hour peer knowledge sharing session.', icon: 'HeartHandshake', condition_type: 'SHARED_SESSIONS', required_count: 1 },
    { id: 'ach-05', code: 'TRUSTED_PEER_MENTOR', title: 'Trusted Peer Mentor', description: 'Maintained an average sharer rating of 4.8 or higher over 5 sessions.', icon: 'Award', condition_type: 'HIGH_RATING', required_count: 5 },
    { id: 'ach-06', code: 'SKILL_MASTERY', title: 'Skill Mastery', description: 'Achieved 100% progress and passed the assessment quiz for a skill.', icon: 'Star', condition_type: 'SKILL_COMPLETE', required_count: 1 },
    { id: 'ach-07', code: 'LEARNING_ACHIEVER', title: 'Learning Achiever', description: 'Earned and banked 5 or more Time Credits through knowledge exchange.', icon: 'Coins', condition_type: 'TIME_CREDITS_EARNED', required_count: 5 },
    { id: 'ach-08', code: 'PRACTICE_PRO', title: 'Practice Pro', description: 'Completed 5 skill assessments or practice quizzes with score over 80%.', icon: 'CheckCircle2', condition_type: 'QUIZZES_PASSED', required_count: 5 }
  ];

  const stmt = db.prepare('INSERT INTO achievements (id, code, title, description, icon, condition_type, required_count) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const a of achievements) {
    stmt.run(a.id, a.code, a.title, a.description, a.icon, a.condition_type, a.required_count);
  }
}

function seedInitialQuizzes() {
  const quizzesToSeed = [
    {
      id: 'quiz-py-101',
      skill_id: 'sk-py-001',
      title: 'Python Foundations & Core Logic Assessment',
      description: 'Evaluate core understanding of syntax, loops, data structures, and functional flow in Python.',
      time_limit_minutes: 15,
      passing_score: 70,
      questions: [
        {
          id: 'q-py-1',
          question_text: 'What will be the output of type( [1, 2, (3, 4)] ) in Python?',
          options: ['<class \'tuple\'>', '<class \'list\'>', '<class \'set\'>', '<class \'dict\'>'],
          correct: 1,
          explanation: 'The outermost container is denoted by square brackets [], which instantiates a Python list.',
          topic: 'Data Types'
        },
        {
          id: 'q-py-2',
          question_text: 'Which keyword in Python is used to define an anonymous inline function?',
          options: ['def', 'function', 'lambda', 'inline'],
          correct: 2,
          explanation: 'The `lambda` keyword defines small, anonymous inline functions in Python.',
          topic: 'Functions'
        },
        {
          id: 'q-py-3',
          question_text: 'How does dictionary key lookup achieve O(1) average time complexity in Python?',
          options: ['Binary Search Tree', 'Hash Table implementation', 'Linked List traversal', 'Sorted Array indexing'],
          correct: 1,
          explanation: 'Python dictionaries utilize an underlying dynamic hash table for near-instant O(1) lookups.',
          topic: 'Data Structures'
        },
        {
          id: 'q-py-4',
          question_text: 'What is the purpose of the `__init__` method in Python classes?',
          options: ['Destroy object instances', 'Constructor for instance attribute initialization', 'Convert object to string', 'Copy memory pointers'],
          correct: 1,
          explanation: 'The `__init__` method acts as the class constructor, initializing attributes upon instantiation.',
          topic: 'Object-Oriented Programming'
        }
      ]
    },
    {
      id: 'quiz-java-101',
      skill_id: 'sk-java-002',
      title: 'Java OOP & Enterprise Fundamentals',
      description: 'Test your knowledge of object-oriented principles, exception handling, and memory management in Java.',
      time_limit_minutes: 15,
      passing_score: 70,
      questions: [
        {
          id: 'q-java-1',
          question_text: 'Which principle of OOP ensures internal state is hidden and accessed via methods?',
          options: ['Inheritance', 'Polymorphism', 'Encapsulation', 'Abstraction'],
          correct: 2,
          explanation: 'Encapsulation restricts direct access to object data and bundles methods operating on that data.',
          topic: 'OOP Fundamentals'
        },
        {
          id: 'q-java-2',
          question_text: 'What is the base class of all exceptions in Java?',
          options: ['RuntimeException', 'Throwable', 'Exception', 'Error'],
          correct: 1,
          explanation: '`Throwable` is the superclass of all errors and exceptions in the Java language.',
          topic: 'Exception Handling'
        }
      ]
    },
    {
      id: 'quiz-js-101',
      skill_id: 'sk-js-005',
      title: 'JavaScript Async & Event Loop Assessment',
      description: 'Assess asynchronous programming, promises, closures, and modern ES6+ features in JavaScript.',
      time_limit_minutes: 15,
      passing_score: 70,
      questions: [
        {
          id: 'q-js-1',
          question_text: 'What does the JavaScript Event Loop handle?',
          options: ['CSS Style rendering', 'Executing asynchronous callbacks and microtasks from queues', 'Direct SQL socket connections', 'Garbage collection cycles'],
          correct: 1,
          explanation: 'The Event Loop continuously checks the call stack and dispatches queued callback tasks.',
          topic: 'Asynchronous Programming'
        },
        {
          id: 'q-js-2',
          question_text: 'Which method transforms each element of an array and returns a new array of identical length?',
          options: ['filter()', 'reduce()', 'map()', 'forEach()'],
          correct: 2,
          explanation: '`map()` creates a populated result array by calling a provided callback on every element.',
          topic: 'Array Methods'
        }
      ]
    },
    {
      id: 'quiz-comm-101',
      skill_id: 'sk-comm-015',
      title: 'Professional Communication & Active Listening',
      description: 'Evaluate interpersonal communication skills, clarity, and constructive feedback methodology.',
      time_limit_minutes: 10,
      passing_score: 60,
      questions: [
        {
          id: 'q-comm-1',
          question_text: 'What is the primary objective of active listening in professional discussions?',
          options: ['Preparing your rebuttal while the speaker talks', 'Fully comprehending the speaker\'s message before formulating a response', 'Interrupting to correct minor factual errors', 'Speeding up meeting duration'],
          correct: 1,
          explanation: 'Active listening requires full concentration, understanding, and thoughtful response rather than passive waiting.',
          topic: 'Active Listening'
        }
      ]
    }
  ];

  const quizStmt = db.prepare(`
    INSERT INTO quizzes (id, skill_id, title, description, time_limit_minutes, passing_score)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const qStmt = db.prepare(`
    INSERT INTO quiz_questions (id, quiz_id, question_text, options_json, correct_option_index, explanation, topic)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const qz of quizzesToSeed) {
    quizStmt.run(qz.id, qz.skill_id, qz.title, qz.description, qz.time_limit_minutes, qz.passing_score);
    for (const q of qz.questions) {
      qStmt.run(q.id, qz.id, q.question_text, JSON.stringify(q.options), q.correct, q.explanation, q.topic);
    }
  }
}

function syncInitialSupabaseUsers() {
  // Rathikasri (User from metadata)
  const user1Id = '8ec3a3db-473d-4fc2-a45e-e347758270de';
  const existing1 = db.prepare('SELECT id FROM profiles WHERE user_id = ?').get(user1Id);
  if (!existing1) {
    db.prepare(`
      INSERT INTO profiles (id, user_id, full_name, email, age_group, city, state, preferred_language, education_status, bio, role, is_email_verified, onboarding_completed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
    `).run(
      user1Id,
      user1Id,
      'Rathika Sri S',
      'rathikasris28@gmail.com',
      '18-24',
      'Sathyamangalam',
      'Tamil Nadu',
      'Tamil + English',
      'Software Engineer',
      'Passionate about software architecture, algorithms, and peer-to-peer knowledge sharing.',
      'ADMIN'
    );

    // Initial Time Credit Wallet
    db.prepare('INSERT OR IGNORE INTO time_credit_accounts (id, user_id, balance, total_earned, total_spent) VALUES (?, ?, 0, 0, 0)')
      .run('tc-' + user1Id, user1Id);

    // Availability
    db.prepare('INSERT OR IGNORE INTO user_availability (id, user_id, status, available_from, available_until) VALUES (?, ?, ?, ?, ?)')
      .run('av-' + user1Id, user1Id, 'ACTIVE', '18:00:00', '21:00:00');

    // Trust Score
    db.prepare("INSERT OR IGNORE INTO trust_scores (id, user_id, score, reliability_score, verification_level) VALUES (?, ?, 98, 99, 'COMMUNITY_VERIFIED')")
      .run('ts-' + user1Id, user1Id);

    // Initial Skills for user 1
    db.prepare("INSERT OR IGNORE INTO user_skills (id, user_id, skill_id, skill_type, skill_level) VALUES (?, ?, 'sk-py-001', 'LEARN', 'BEGINNER')")
      .run('us1-1', user1Id);
    db.prepare("INSERT OR IGNORE INTO user_skills (id, user_id, skill_id, skill_type, skill_level) VALUES (?, ?, 'sk-tam-014', 'SHARE', 'ADVANCED')")
      .run('us1-2', user1Id);
    db.prepare("INSERT OR IGNORE INTO user_skills (id, user_id, skill_id, skill_type, skill_level) VALUES (?, ?, 'sk-draw-018', 'SHARE', 'INTERMEDIATE')")
      .run('us1-3', user1Id);
  }

  // Second confirmed Supabase user
  const user2Id = '97456bc6-9390-46cf-8f72-07b7e8c67dfd';
  const existing2 = db.prepare('SELECT id FROM profiles WHERE user_id = ?').get(user2Id);
  if (!existing2) {
    db.prepare(`
      INSERT INTO profiles (id, user_id, full_name, email, age_group, city, state, preferred_language, education_status, bio, role, is_email_verified, onboarding_completed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
    `).run(
      user2Id,
      user2Id,
      'Rathika Sri',
      'srathikasri28@gmail.com',
      '18-24',
      'Sathy',
      'Tamil Nadu',
      'Tamil + English',
      'Student & Developer',
      'Eager to share Python fundamentals and peer-learn Web Development.',
      'KNOWLEDGE_SHARER'
    );

    db.prepare('INSERT OR IGNORE INTO time_credit_accounts (id, user_id, balance, total_earned, total_spent) VALUES (?, ?, 0, 0, 0)')
      .run('tc-' + user2Id, user2Id);

    db.prepare('INSERT OR IGNORE INTO user_availability (id, user_id, status, available_from, available_until) VALUES (?, ?, ?, ?, ?)')
      .run('av-' + user2Id, user2Id, 'ACTIVE', '18:00:00', '21:00:00');

    db.prepare("INSERT OR IGNORE INTO trust_scores (id, user_id, score, reliability_score, verification_level) VALUES (?, ?, 95, 95, 'COMMUNITY_VERIFIED')")
      .run('ts-' + user2Id, user2Id);

    // Initial Skills for user 2 (Shares Python at 6 PM!)
    db.prepare("INSERT OR IGNORE INTO user_skills (id, user_id, skill_id, skill_type, skill_level) VALUES (?, ?, 'sk-py-001', 'SHARE', 'INTERMEDIATE')")
      .run('us2-1', user2Id);
    db.prepare("INSERT OR IGNORE INTO user_skills (id, user_id, skill_id, skill_type, skill_level) VALUES (?, ?, 'sk-comm-015', 'SHARE', 'ADVANCED')")
      .run('us2-2', user2Id);
    db.prepare("INSERT OR IGNORE INTO user_skills (id, user_id, skill_id, skill_type, skill_level) VALUES (?, ?, 'sk-web-006', 'LEARN', 'BEGINNER')")
      .run('us2-3', user2Id);
  }
}

function seedInitialCourses() {
  const sampleCourses = [
    {
      id: 'course-gcp-cloud-01',
      partner_name: 'LearnX Academy',
      name: 'Python for Beginners',
      category: 'Programming',
      description: 'A practical introduction to Python syntax, data structures, functions, and small automation projects.',
      duration: '4 Weeks',
      schedule: 'Self-paced demonstration course',
      requirements: 'No prior programming experience required.',
      syllabus_json: JSON.stringify(['Python setup and syntax', 'Conditions, loops, and collections', 'Functions and modules', 'Guided beginner project']),
      learning_outcomes_json: JSON.stringify(['Write small Python programs', 'Use common built-in data structures', 'Break a problem into functions']),
      level: 'BEGINNER',
      learning_mode: 'ONLINE',
      certificate_eligibility: 1,
      is_demo: 1
    },
    {
      id: 'course-py-algo-02',
      partner_name: 'SkillBridge Learning',
      name: 'Web Development Fundamentals',
      category: 'Web Development',
      description: 'Build a strong foundation in HTML, CSS, responsive layouts, and browser-side JavaScript.',
      duration: '6 Weeks',
      schedule: 'Self-paced demonstration course',
      requirements: 'A computer with a modern web browser.',
      syllabus_json: JSON.stringify(['HTML structure and semantics', 'CSS layout and responsive design', 'JavaScript fundamentals', 'Accessible multi-page project']),
      learning_outcomes_json: JSON.stringify(['Create semantic web pages', 'Style responsive layouts', 'Add basic interactions with JavaScript']),
      level: 'BEGINNER',
      learning_mode: 'ONLINE',
      certificate_eligibility: 1,
      is_demo: 1
    },
    {
      id: 'course-web-react-03',
      partner_name: 'FutureSkills Hub',
      name: 'Introduction to Data Science',
      category: 'Data Science',
      description: 'Explore data cleaning, descriptive statistics, visualization, and a small exploratory analysis.',
      duration: '5 Weeks',
      schedule: 'Self-paced demonstration course',
      requirements: 'Basic spreadsheet familiarity is helpful.',
      syllabus_json: JSON.stringify(['Data questions and datasets', 'Cleaning tabular data', 'Descriptive statistics', 'Visualizing and presenting findings']),
      learning_outcomes_json: JSON.stringify(['Prepare a small dataset', 'Summarize data with basic statistics', 'Communicate findings with charts']),
      level: 'INTERMEDIATE',
      learning_mode: 'ONLINE',
      certificate_eligibility: 1,
      is_demo: 1
    },
    {
      id: 'course-comm-english-04',
      partner_name: 'TechPath Institute',
      name: 'AI & Machine Learning Basics',
      category: 'Artificial Intelligence',
      description: 'A first look at machine learning concepts, data preparation, model evaluation, and responsible AI.',
      duration: '6 Weeks',
      schedule: 'Self-paced demonstration course',
      requirements: 'Comfort with basic algebra and spreadsheets.',
      syllabus_json: JSON.stringify(['AI and machine learning overview', 'Preparing example datasets', 'Training and evaluating a simple model', 'Responsible use and limitations']),
      learning_outcomes_json: JSON.stringify(['Distinguish common learning approaches', 'Describe a model evaluation result', 'Identify limitations in an AI workflow']),
      level: 'INTERMEDIATE',
      learning_mode: 'ONLINE',
      certificate_eligibility: 1,
      is_demo: 1
    }
  ];

  const stmt = db.prepare(`
    INSERT INTO courses (
      id, partner_id, partner_name, name, category, description,
      duration, schedule, requirements, syllabus_json,
      learning_outcomes_json, level, learning_mode, certificate_eligibility,
      is_demo, status, external_url
    ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'ACTIVE', '')
    ON CONFLICT(id) DO UPDATE SET
      partner_id = NULL, partner_name = excluded.partner_name, name = excluded.name,
      category = excluded.category, description = excluded.description, duration = excluded.duration,
      schedule = excluded.schedule, requirements = excluded.requirements, syllabus_json = excluded.syllabus_json,
      learning_outcomes_json = excluded.learning_outcomes_json, level = excluded.level,
      learning_mode = excluded.learning_mode, certificate_eligibility = excluded.certificate_eligibility,
      is_demo = 1, external_url = ''
    WHERE courses.id IN ('course-gcp-cloud-01', 'course-py-algo-02', 'course-web-react-03', 'course-comm-english-04')
  `);

  for (const c of sampleCourses) {
    stmt.run(
      c.id, c.partner_name, c.name, c.category, c.description,
      c.duration, c.schedule, c.requirements, c.syllabus_json,
      c.learning_outcomes_json, c.level, c.learning_mode, c.certificate_eligibility
    );
  }
}

function seedDemoBootcamps() {
  const samples = [
    {
      id: 'bootcamp-demo-web-oct-2026', name: 'Full Stack Web Development Bootcamp',
      category: 'Web Development', duration: '4 Weeks', level: 'BEGINNER_TO_INTERMEDIATE',
      provider: 'LearnX Academy', start: '2026-10-05', end: '2026-11-01',
      description: 'A sample four-week path through frontend fundamentals, APIs, and a guided full-stack project.',
      requirements: 'Basic computer literacy; no professional experience required.',
      syllabus: ['Week 1: HTML, CSS, and accessible page structure', 'Week 2: JavaScript and browser APIs', 'Week 3: HTTP APIs and persistence concepts', 'Week 4: Guided full-stack capstone'],
      outcomes: ['Build a responsive frontend', 'Connect a frontend to an API', 'Explain a simple full-stack architecture']
    },
    {
      id: 'bootcamp-demo-data-nov-2026', name: 'Python & Data Science Bootcamp',
      category: 'Data Science', duration: '4 Weeks', level: 'BEGINNER',
      provider: 'SkillBridge Learning', start: '2026-11-02', end: '2026-11-29',
      description: 'A sample guided program covering Python basics and a small data exploration project.',
      requirements: 'No prior coding experience required.',
      syllabus: ['Week 1: Python foundations', 'Week 2: Collections and tabular data', 'Week 3: Summaries and visualizations', 'Week 4: Guided data story'],
      outcomes: ['Write beginner Python scripts', 'Summarize a small dataset', 'Present a data finding clearly']
    },
    {
      id: 'bootcamp-demo-ai-dec-2026', name: 'AI & Machine Learning Bootcamp',
      category: 'Artificial Intelligence', duration: '4 Weeks', level: 'INTERMEDIATE',
      provider: 'FutureSkills Hub', start: '2026-12-01', end: '2026-12-28',
      description: 'A sample introduction to machine learning workflows and responsible model evaluation.',
      requirements: 'Basic algebra and introductory programming familiarity.',
      syllabus: ['Week 1: Machine learning concepts', 'Week 2: Data preparation', 'Week 3: Model training and evaluation', 'Week 4: Responsible AI review'],
      outcomes: ['Describe a basic ML workflow', 'Read common evaluation measures', 'Identify model limitations']
    },
    {
      id: 'bootcamp-demo-security-jan-2027', name: 'Cybersecurity Fundamentals Bootcamp',
      category: 'Cybersecurity', duration: '4 Weeks', level: 'BEGINNER',
      provider: 'TechPath Institute', start: '2027-01-04', end: '2027-01-31',
      description: 'A sample program on security fundamentals, threat awareness, and safer development habits.',
      requirements: 'No prior security experience required.',
      syllabus: ['Week 1: Security vocabulary and threat models', 'Week 2: Accounts, access, and authentication', 'Week 3: Web safety and common risks', 'Week 4: Defensive checklist project'],
      outcomes: ['Recognize common security risks', 'Apply basic account-safety practices', 'Describe a simple threat model']
    }
  ];
  const insert = db.prepare(`
    INSERT INTO bootcamps (
      id, partner_id, name, description, schedule, start_date, end_date, requirements,
      syllabus_json, learning_outcomes_json, category, duration, level, mode, provider_name,
      certificate_eligibility, time_credit_cost, is_demo, status
    ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ONLINE', ?, 1, 0, 1, 'ACTIVE')
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name, description = excluded.description, schedule = excluded.schedule,
      start_date = excluded.start_date, end_date = excluded.end_date, requirements = excluded.requirements,
      syllabus_json = excluded.syllabus_json, learning_outcomes_json = excluded.learning_outcomes_json,
      category = excluded.category, duration = excluded.duration, level = excluded.level,
      mode = excluded.mode, provider_name = excluded.provider_name,
      certificate_eligibility = excluded.certificate_eligibility, time_credit_cost = 0, is_demo = 1
    WHERE bootcamps.is_demo = 1
  `);
  for (const sample of samples) {
    insert.run(
      sample.id, sample.name, sample.description, 'Four-week demonstration program', sample.start, sample.end,
      sample.requirements, JSON.stringify(sample.syllabus), JSON.stringify(sample.outcomes), sample.category,
      sample.duration, sample.level, sample.provider
    );
  }
}
