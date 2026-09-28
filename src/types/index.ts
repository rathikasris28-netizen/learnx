export type UserRole = 'LEARNER' | 'KNOWLEDGE_SHARER' | 'ADMIN' | 'PARTNER';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  mobile?: string;
  age_group?: string;
  city?: string;
  state?: string;
  preferred_language: string;
  education_status?: string;
  profile_photo?: string;
  bio?: string;
  role: UserRole;
  is_email_verified: boolean;
  onboarding_completed: boolean;
  wallet_balance?: number;
  total_earned_credits?: number;
  total_spent_credits?: number;
  availability?: 'ACTIVE' | 'INACTIVE' | 'IN_CLASS';
  available_from?: string;
  available_until?: string;
  trust_score?: number;
  reliability_score?: number;
  learn_skills?: Array<{ id: string; name: string; category: string; skill_level: string }>;
  share_skills?: Array<{ id: string; name: string; category: string; skill_level: string }>;
  unread_notifications_count?: number;
  created_at?: string;
}

export interface Skill {
  id: string;
  name: string;
  category: 'Technical' | 'Non-Technical';
  description: string;
  is_active: number;
  sharers_count?: number;
}

export type SkillLevel = 'BEGINNER' | 'ELEMENTARY' | 'INTERMEDIATE' | 'ADVANCED';

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
  skill_level: SkillLevel;
  availability_status: 'ACTIVE' | 'INACTIVE' | 'IN_CLASS';
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

export type SessionStatus = 'REQUESTED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'IN_PROGRESS' | 'COMPLETED' | 'DISPUTED';

export interface SessionRecord {
  id: string;
  learner_id: string;
  knowledge_sharer_id: string;
  skill_id: string;
  skill_name: string;
  skill_category?: string;
  learner_name: string;
  learner_email?: string;
  learner_photo?: string;
  sharer_name: string;
  sharer_email?: string;
  sharer_photo?: string;
  session_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: SessionStatus;
  learning_goal: string;
  room_id: string;
  meeting_provider?: 'GOOGLE_MEET' | 'BUILTIN';
  meet_link?: string;
  learner_confirmed: number;
  sharer_confirmed: number;
  credit_awarded: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  session_id?: string;
  amount: number;
  transaction_type: 'EARNED' | 'USED' | 'REVERSAL' | 'ADJUSTMENT';
  status: string;
  description: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  is_read: number;
  created_at: string;
}

export interface Quiz {
  id: string;
  skill_id: string;
  skill_name: string;
  title: string;
  description: string;
  time_limit_minutes: number;
  passing_score: number;
  total_questions?: number;
}

export interface QuizQuestion {
  id: string;
  question_text: string;
  options: string[];
  topic?: string;
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  condition_type: string;
  required_count: number;
  unlocked?: boolean;
}
