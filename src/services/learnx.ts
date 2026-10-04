import { supabase } from '../lib/supabase';

export const learnxApi = {
  // Dashboard & Credits
  async getDashboardSummary() {
    const { data, error } = await supabase.rpc('get_my_dashboard_summary');
    if (error) throw error;
    return data;
  },

  async getCreditBalance() {
    const { data, error } = await supabase.rpc('get_my_credit_balance');
    if (error) throw error;
    return data;
  },

  async ensureWallet() {
    const { data, error } = await supabase.rpc('ensure_time_credit_wallet');
    if (error) throw error;
    return data;
  },

  // Profile & Onboarding
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  async completeOnboarding(profileData: any, learnSkills: any[], shareSkills: any[]) {
    const { data, error } = await supabase.rpc('complete_onboarding', {
      p_profile: profileData,
      p_learn_skills: learnSkills,
      p_share_skills: shareSkills,
    });
    if (error) throw error;
    return data;
  },

  // Skills
  async getSkills() {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  },

  // Learning Requests
  async createLearningRequest(params: {
    skill_id: string;
    skill_level: string;
    preferred_language: string;
    learning_goal: string;
    preferred_date?: string;
    preferred_start_time?: string;
    preferred_end_time?: string;
  }) {
    const { data, error } = await supabase.rpc('create_learning_request', {
      p_skill_id: params.skill_id,
      p_skill_level: params.skill_level,
      p_preferred_language: params.preferred_language,
      p_learning_goal: params.learning_goal,
      p_preferred_date: params.preferred_date || null,
      p_preferred_start_time: params.preferred_start_time || null,
      p_preferred_end_time: params.preferred_end_time || null,
    });
    if (error) throw error;
    return data;
  },

  async getMyLearningRequests() {
    const { data, error } = await supabase
      .from('learning_requests')
      .select('*, skills(name, category)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Matches
  async findMatches(learningRequestId: string, limit = 10) {
    const { data, error } = await supabase.rpc('find_learning_matches', {
      p_learning_request_id: learningRequestId,
      p_limit: limit,
    });
    if (error) throw error;
    return data || [];
  },

  async acceptMatch(matchId: string, startTime: string, endTime: string) {
    const { data, error } = await supabase.rpc('accept_learning_match', {
      p_match_id: matchId,
      p_start_time: startTime,
      p_end_time: endTime,
    });
    if (error) throw error;
    return data;
  },

  // Sessions
  async getMySessions() {
    const { data, error } = await supabase
      .from('sessions')
      .select('*, skills(name)')
      .order('scheduled_start', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getSession(sessionId: string) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*, skills(name)')
      .eq('id', sessionId)
      .single();
    if (error) throw error;
    return data;
  },

  async startSession(sessionId: string, meetingRoomId: string) {
    const { data, error } = await supabase.rpc('start_learning_session', {
      p_session_id: sessionId,
      p_meeting_room_id: meetingRoomId,
    });
    if (error) throw error;
    return data;
  },

  async cancelSession(sessionId: string) {
    const { data, error } = await supabase.rpc('cancel_learning_session', {
      p_session_id: sessionId,
    });
    if (error) throw error;
    return data;
  },

  async completeSession(sessionId: string) {
    const { data, error } = await supabase.rpc('complete_learning_session', {
      p_session_id: sessionId,
    });
    if (error) throw error;
    return data;
  },

  async updateSessionNotes(sessionId: string, notes: string) {
    const { data, error } = await supabase
      .from('sessions')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', sessionId);
    if (error) throw error;
    return data;
  },

  async submitReview(sessionId: string, rating: number, reviewText: string) {
    const { data, error } = await supabase.rpc('submit_session_review', {
      p_session_id: sessionId,
      p_rating: rating,
      p_review_text: reviewText,
    });
    if (error) throw error;
    return data;
  },

  // Notifications
  async getNotifications() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async markNotificationRead(notificationId: string) {
    const { data, error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notificationId,
    });
    if (error) throw error;
    return data;
  },

  async markAllNotificationsRead() {
    const { data, error } = await supabase.rpc('mark_all_notifications_read');
    if (error) throw error;
    return data;
  },

  // Quizzes
  async getQuizzes() {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('is_active', true);
    if (error) throw error;
    return data || [];
  },

  async submitQuizAttempt(quizId: string, answers: Record<string, any>, timeTakenSeconds: number) {
    const { data, error } = await supabase.rpc('submit_quiz_attempt', {
      p_quiz_id: quizId,
      p_answers: answers,
      p_time_taken_seconds: timeTakenSeconds,
    });
    if (error) throw error;
    return data;
  },

  // Safety & Admin
  async blockUser(blockedUserId: string, reason: string) {
    const { data, error } = await supabase.rpc('block_user', {
      p_blocked_user_id: blockedUserId,
      p_reason: reason,
    });
    if (error) throw error;
    return data;
  },

  async reportUser(reportedUserId: string, reportType: string, description: string, sessionId?: string) {
    const { data, error } = await supabase.rpc('report_user', {
      p_reported_user_id: reportedUserId,
      p_report_type: reportType,
      p_description: description,
      p_session_id: sessionId || null,
    });
    if (error) throw error;
    return data;
  },

  async isAdmin() {
    const { data, error } = await supabase.rpc('is_admin');
    if (error) throw error;
    return !!data;
  },

  async getAdminStats() {
    const [usersRes, sessionsRes, reportsRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('sessions').select('*', { count: 'exact', head: true }),
      supabase.from('user_reports').select('*', { count: 'exact', head: true }),
    ]);
    return {
      totalUsers: usersRes.count || 0,
      totalSessions: sessionsRes.count || 0,
      totalReports: reportsRes.count || 0,
    };
  }
};
