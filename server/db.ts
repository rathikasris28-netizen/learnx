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
      transaction_type TEXT NOT NULL CHECK(transaction_type IN ('EARNED', 'USED', 'REVERSAL', 'ADJUSTMENT')),
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
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      duration TEXT NOT NULL,
      schedule TEXT,
      requirements TEXT,
      syllabus_json TEXT DEFAULT '[]',
      certificate_eligibility INTEGER DEFAULT 1,
      status TEXT DEFAULT 'ACTIVE',
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
  `);

  // Migrations for Google Meet & Partner Courses
  try { db.prepare(`ALTER TABLE sessions ADD COLUMN meeting_provider TEXT DEFAULT 'BUILTIN'`).run(); } catch {}
  try { db.prepare(`ALTER TABLE sessions ADD COLUMN meet_link TEXT DEFAULT ''`).run(); } catch {}
  try { db.prepare(`ALTER TABLE sessions ADD COLUMN calendar_event_id TEXT DEFAULT ''`).run(); } catch {}
  try { db.prepare(`ALTER TABLE courses ADD COLUMN category TEXT DEFAULT 'General'`).run(); } catch {}
  try { db.prepare(`ALTER TABLE courses ADD COLUMN partner_name TEXT DEFAULT ''`).run(); } catch {}
  try { db.prepare(`ALTER TABLE courses ADD COLUMN external_url TEXT DEFAULT ''`).run(); } catch {}
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

  // Seed initial partner courses if empty
  const courseCount = (db.prepare('SELECT COUNT(*) as count FROM courses').get() as { count: number }).count;
  if (courseCount === 0) {
    seedInitialCourses();
  }

  // Ensure default Supabase users are registered in local SQLite
  syncInitialSupabaseUsers();
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
      partner_id: 'partner-gcp',
      partner_name: 'Google Cloud Academy Partner',
      name: 'Google Cloud Foundations & Vertex AI Architecture',
      category: 'Cloud & AI',
      description: 'Comprehensive industry program covering Cloud Run, BigQuery, IAM policies, and generative AI deployments on Vertex AI.',
      duration: '4 Weeks (16 Hours)',
      schedule: 'Tuesdays & Thursdays, 7:00 PM - 9:00 PM IST',
      requirements: 'Basic understanding of HTTP APIs and basic programming.',
      syllabus_json: JSON.stringify([
        'Module 1: Cloud Architecture, Compute Engine & Serverless Cloud Run',
        'Module 2: Cloud Storage, Firestore & Scalable Relational Cloud SQL',
        'Module 3: Vertex AI Studio, Gemini Pro Embeddings & RAG Pipelines',
        'Module 4: Enterprise Identity, IAM RBAC & Production Deployment'
      ]),
      certificate_eligibility: 1,
      status: 'ACTIVE',
      external_url: 'https://cloud.google.com/training'
    },
    {
      id: 'course-py-algo-02',
      partner_id: 'partner-iitm',
      partner_name: 'IIT Madras Open Learning Initiative',
      name: 'Mastering Python Algorithms & Data Structures',
      category: 'Software Engineering',
      description: 'Rigorous computer science curriculum focusing on algorithmic time complexity, trees, graphs, dynamic programming, and systems thinking.',
      duration: '6 Weeks (24 Hours)',
      schedule: 'Mondays & Wednesdays, 6:30 PM - 8:30 PM IST',
      requirements: 'Introductory Python syntax knowledge.',
      syllabus_json: JSON.stringify([
        'Module 1: Asymptotic Analysis, Big-O Notation & Memory Footprint',
        'Module 2: Advanced Lists, Queues, Hash Tables & In-Memory Indexing',
        'Module 3: Recursion, Divide & Conquer, Merge/Quick Sort Optimizations',
        'Module 4: Binary Trees, Heaps & Graph Traversal (BFS / DFS / Dijkstra)',
        'Module 5: Dynamic Programming, Memoization & Greedy Paradigms',
        'Module 6: Capstone: Building High-Throughput Matching Engines'
      ]),
      certificate_eligibility: 1,
      status: 'ACTIVE',
      external_url: 'https://nptel.ac.in'
    },
    {
      id: 'course-web-react-03',
      partner_id: 'partner-dlai',
      partner_name: 'DeepLearning.AI Student Chapter',
      name: 'Building Full-Stack AI Web Apps with React & Node.js',
      category: 'Web Development',
      description: 'Hands-on practical full-stack track covering modern TypeScript, Tailwind CSS, WebRTC video integration, and server-side AI endpoints.',
      duration: '5 Weeks (20 Hours)',
      schedule: 'Saturdays & Sundays, 10:00 AM - 12:00 PM IST',
      requirements: 'Familiarity with HTML, CSS, and modern JavaScript syntax.',
      syllabus_json: JSON.stringify([
        'Module 1: React 18 Concurrent Rendering, Custom Hooks & State Stores',
        'Module 2: Server-Side REST APIs with Express, TypeScript & SQLite Persistence',
        'Module 3: WebRTC Video Streaming & Real-Time Protocol Integrations',
        'Module 4: Integrating AI Models, Streaming Prompts & Token Security',
        'Module 5: Capstone: Deploying a Resilient Multi-User Platform'
      ]),
      certificate_eligibility: 1,
      status: 'ACTIVE',
      external_url: 'https://deeplearning.ai'
    },
    {
      id: 'course-comm-english-04',
      partner_id: 'partner-tnsdc',
      partner_name: 'Tamil Nadu Skill Development Corp (TNSDC)',
      name: 'Professional English Communication & Global Workplace Fluency',
      category: 'Communication',
      description: 'Interactive workplace communication, tech interview English, executive presence, concise email phrasing, and cross-cultural collaboration.',
      duration: '4 Weeks (16 Hours)',
      schedule: 'Fridays & Saturdays, 6:00 PM - 8:00 PM IST',
      requirements: 'Open to all learners desiring English fluency.',
      syllabus_json: JSON.stringify([
        'Module 1: Overcoming Hesitation & Accent Neutralization Essentials',
        'Module 2: Technical Explanation: Articulating Complex Ideas Simply',
        'Module 3: Mock Client Pitches, Active Listening & Standup Etiquette',
        'Module 4: The STAR Method for Behavioral Interviews & Salary Negotiation'
      ]),
      certificate_eligibility: 1,
      status: 'ACTIVE',
      external_url: 'https://naanmudhalvan.tn.gov.in'
    }
  ];

  const stmt = db.prepare(`
    INSERT INTO courses (
      id, partner_id, partner_name, name, category, description,
      duration, schedule, requirements, syllabus_json,
      certificate_eligibility, status, external_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const c of sampleCourses) {
    stmt.run(
      c.id, c.partner_id, c.partner_name, c.name, c.category, c.description,
      c.duration, c.schedule, c.requirements, c.syllabus_json,
      c.certificate_eligibility, c.status, c.external_url
    );
  }
}
