import { db } from './db.ts';

// Safe AI caller with graceful diagnostic fallback
export async function parseNaturalLanguageSearch(query: string): Promise<{
  skill_name?: string;
  level?: string;
  language?: string;
  preferred_time?: string;
  goal?: string;
}> {
  const qLower = query.toLowerCase();

  // Extract skills from registered catalog
  const skills = db.prepare('SELECT name FROM skills WHERE is_active = 1').all() as { name: string }[];
  let matchedSkill: string | undefined;
  for (const s of skills) {
    if (qLower.includes(s.name.toLowerCase())) {
      matchedSkill = s.name;
      break;
    }
  }

  // Extract level
  let level: string | undefined;
  if (qLower.includes('beginner') || qLower.includes('basic') || qLower.includes('starter') || qLower.includes('intro')) {
    level = 'BEGINNER';
  } else if (qLower.includes('intermediate') || qLower.includes('medium')) {
    level = 'INTERMEDIATE';
  } else if (qLower.includes('advanced') || qLower.includes('expert') || qLower.includes('master')) {
    level = 'ADVANCED';
  } else if (qLower.includes('elementary')) {
    level = 'ELEMENTARY';
  }

  // Extract language
  let language: string | undefined;
  if (qLower.includes('tamil')) {
    language = 'Tamil';
  } else if (qLower.includes('english')) {
    language = 'English';
  } else if (qLower.includes('hindi')) {
    language = 'Hindi';
  }

  // Extract time like '6 pm', '18:00', '7:00 pm'
  let preferred_time: string | undefined;
  const timeMatch = query.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)?/);
  if (timeMatch && (qLower.includes('pm') || qLower.includes('am') || qLower.includes('at') || qLower.includes('clock'))) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? timeMatch[2] : '00';
    const ampm = timeMatch[3]?.toLowerCase();
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    preferred_time = `${hour.toString().padStart(2, '0')}:${minute}:00`;
  }

  return {
    skill_name: matchedSkill,
    level,
    language,
    preferred_time,
    goal: query
  };
}

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

export function computeMatches(params: {
  learner_id: string;
  skill_id?: string;
  skill_name?: string;
  level?: string;
  language?: string;
  time?: string;
}): MatchCandidate[] {
  // Query all knowledge sharers from real database who share this skill
  let query = `
    SELECT 
      p.user_id,
      p.full_name,
      p.profile_photo,
      p.city,
      p.state,
      p.preferred_language,
      p.bio,
      s.id as skill_id,
      s.name as skill_name,
      us.skill_level,
      COALESCE(ua.status, 'INACTIVE') as availability_status,
      COALESCE(ua.available_from, '18:00:00') as available_from,
      COALESCE(ua.available_until, '21:00:00') as available_until,
      COALESCE(ts.score, 85) as trust_score,
      COALESCE(ts.reliability_score, 90) as reliability_score,
      COALESCE(sv.verification_level, 'COMMUNITY_VERIFIED') as verification_level,
      COALESCE((SELECT AVG(overall_score) FROM ratings WHERE ratee_id = p.user_id), 5.0) as rating_avg,
      COALESCE((SELECT COUNT(*) FROM ratings WHERE ratee_id = p.user_id), 0) as rating_count
    FROM user_skills us
    JOIN profiles p ON us.user_id = p.user_id
    JOIN skills s ON us.skill_id = s.id
    LEFT JOIN user_availability ua ON p.user_id = ua.user_id
    LEFT JOIN trust_scores ts ON p.user_id = ts.user_id
    LEFT JOIN skill_verifications sv ON (sv.user_id = p.user_id AND sv.skill_id = s.id)
    WHERE us.skill_type = 'SHARE'
      AND p.user_id != ?
  `;

  const queryParams: any[] = [params.learner_id];

  if (params.skill_id) {
    query += ` AND s.id = ?`;
    queryParams.push(params.skill_id);
  } else if (params.skill_name) {
    query += ` AND LOWER(s.name) = LOWER(?)`;
    queryParams.push(params.skill_name);
  }

  const candidates = db.prepare(query).all(...queryParams) as any[];

  return candidates.map((c) => {
    let score = 70; // baseline for sharing the requested skill

    // Availability factor (Active sharers prioritized)
    if (c.availability_status === 'ACTIVE') score += 12;
    else if (c.availability_status === 'IN_CLASS') score -= 5;
    else score -= 10;

    // Time alignment factor
    if (params.time) {
      if (params.time >= c.available_from && params.time <= c.available_until) {
        score += 8;
      }
    }

    // Language alignment
    if (params.language) {
      if (c.preferred_language?.toLowerCase().includes(params.language.toLowerCase())) {
        score += 6;
      }
    }

    // Skill level compatibility:
    // If learner is BEGINNER, an INTERMEDIATE or ADVANCED sharer is ideal.
    if (params.level) {
      if (params.level === 'BEGINNER' && (c.skill_level === 'INTERMEDIATE' || c.skill_level === 'ADVANCED')) {
        score += 4;
      } else if (params.level === c.skill_level) {
        score += 3;
      }
    }

    // Reliability & Trust scores
    const trustBonus = Math.min(5, Math.max(0, ((c.trust_score - 80) / 20) * 5));
    score += trustBonus;

    // Clamp score between 60 and 99%
    const finalPercentage = Math.min(99, Math.max(60, Math.round(score)));

    // Generate human-readable rationale
    const reasons: string[] = [];
    reasons.push(`Shares ${c.skill_name} (${c.skill_level})`);
    if (c.availability_status === 'ACTIVE') {
      reasons.push(`Currently Active (${c.available_from.slice(0, 5)} - ${c.available_until.slice(0, 5)})`);
    }
    if (c.preferred_language) {
      reasons.push(`Speaks ${c.preferred_language}`);
    }
    if (c.rating_avg >= 4.5) {
      reasons.push(`${Number(c.rating_avg).toFixed(1)}/5.0 Rating`);
    }
    reasons.push(`${c.trust_score}% Trust Score`);

    return {
      user_id: c.user_id,
      full_name: c.full_name,
      profile_photo: c.profile_photo,
      city: c.city,
      state: c.state,
      preferred_language: c.preferred_language,
      bio: c.bio,
      skill_id: c.skill_id,
      skill_name: c.skill_name,
      skill_level: c.skill_level,
      availability_status: c.availability_status,
      available_from: c.available_from,
      available_until: c.available_until,
      trust_score: c.trust_score,
      reliability_score: c.reliability_score,
      verification_level: c.verification_level,
      rating_avg: Number(c.rating_avg),
      rating_count: c.rating_count,
      match_percentage: finalPercentage,
      why_recommended: `${finalPercentage}% Match: ${reasons.join(' · ')}`
    };
  }).sort((a, b) => b.match_percentage - a.match_percentage);
}

// Generate structured 4-week learning plan
export function generateStructuredLearningPlan(skillName: string, level: string = 'BEGINNER') {
  return [
    {
      week: 1,
      title: `${skillName} Foundations & Environment Setup`,
      focus: 'Core syntax, conceptual models, and introductory hands-on practice.',
      activities: [
        { id: 'w1-a1', title: 'Setup development tooling and runtime environment', completed: false },
        { id: 'w1-a2', title: 'Understand foundational principles and basic primitives', completed: false },
        { id: 'w1-a3', title: 'Execute first working exercise with input/output validation', completed: false },
        { id: 'w1-a4', title: 'Peer review with a verified knowledge sharer', completed: false }
      ]
    },
    {
      week: 2,
      title: 'Control Flow, Idioms & Structured Problem Solving',
      focus: 'Branching logic, loops, iterative structures, and data handling.',
      activities: [
        { id: 'w2-a1', title: 'Implement conditional flow controls and validations', completed: false },
        { id: 'w2-a2', title: 'Build structured iterations and handle edge cases', completed: false },
        { id: 'w2-a3', title: 'Solve 3 real-world computational challenges', completed: false },
        { id: 'w2-a4', title: 'Live 1-on-1 scheduled practice session', completed: false }
      ]
    },
    {
      week: 3,
      title: 'Modular Architecture & Data Structures',
      focus: 'Functions, collections, state management, and separation of concerns.',
      activities: [
        { id: 'w3-a1', title: 'Decompose monolithic code into modular reusable blocks', completed: false },
        { id: 'w3-a2', title: 'Work with compound collections and lookup optimizations', completed: false },
        { id: 'w3-a3', title: 'Take mid-way SkillProof diagnostic quiz', completed: false }
      ]
    },
    {
      week: 4,
      title: 'Capstone Mini-Project & Peer Demonstration',
      focus: 'End-to-end implementation, documentation, and live walkthrough.',
      activities: [
        { id: 'w4-a1', title: 'Design specifications for the capstone scenario', completed: false },
        { id: 'w4-a2', title: 'Construct full functional solution with error bounds', completed: false },
        { id: 'w4-a3', title: 'Demonstrate project in LiveKit room to earn verified badge', completed: false }
      ]
    }
  ];
}
