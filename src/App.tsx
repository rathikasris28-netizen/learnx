import React, { useState, useEffect } from 'react';
import AuthModal from './components/AuthModal';
import Navbar from './components/Navbar';
import LearnerDashboard from './components/LearnerDashboard';
import MentorDashboard from './components/MentorDashboard';
import ExploreSharers from './components/ExploreSharers';
import LiveSessionRoom from './components/LiveSessionRoom';
import CoursesView from './components/CoursesView';
import BootcampsView from './components/BootcampsView';
import QuizzesView from './components/QuizzesView';
import WalletView from './components/WalletView';
import SessionsView from './components/SessionsView';
import TermsView from './components/TermsView';
import Footer from './components/Footer';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('learnx_token'));
  const [user, setUser] = useState<any | null>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [bootcamps, setBootcamps] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [credits, setCredits] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAppData = async (currentToken: string) => {
    try {
      const [meRes, skillsRes, sessionsRes, coursesRes, bootcampsRes, quizzesRes, creditsRes] = await Promise.all([
        fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${currentToken}` } }),
        fetch('/api/skills'),
        fetch('/api/sessions', { headers: { 'Authorization': `Bearer ${currentToken}` } }),
        fetch('/api/courses'),
        fetch('/api/bootcamps'),
        fetch('/api/quizzes'),
        fetch('/api/credits', { headers: { 'Authorization': `Bearer ${currentToken}` } })
      ]);

      const meData = await meRes.json();
      const skillsData = await skillsRes.json();
      const sessionsData = await sessionsRes.json();
      const coursesData = await coursesRes.json();
      const bootcampsData = await bootcampsRes.json();
      const quizzesData = await quizzesRes.json();
      const creditsData = await creditsRes.json();

      if (meRes.ok) setUser(meData.user);
      if (Array.isArray(skillsData)) setSkills(skillsData);
      if (Array.isArray(sessionsData)) setSessions(sessionsData);
      if (Array.isArray(coursesData)) setCourses(coursesData);
      if (Array.isArray(bootcampsData)) setBootcamps(bootcampsData);
      if (Array.isArray(quizzesData)) setQuizzes(quizzesData);
      if (creditsRes.ok) setCredits(creditsData.credits);
    } catch (err) {
      console.error('Failed to load app data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadAppData(token);
    } else {
      fetch('/api/skills')
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setSkills(data); })
        .catch(() => {});
      setLoading(false);
    }
  }, [token]);

  const handleLogin = (newToken: string, newUser: any) => {
    localStorage.setItem('learnx_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setCredits(newUser.credits || 0);
    setActiveTab('dashboard');
    loadAppData(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('learnx_token');
    setToken(null);
    setUser(null);
    setActiveSession(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium">Loading LearnX...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <AuthModal onLogin={handleLogin} skills={skills} />;
  }

  if (activeSession) {
    return (
      <LiveSessionRoom
        session={activeSession}
        user={user}
        onLeave={() => setActiveSession(null)}
        onRefreshSessions={() => loadAppData(token)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        credits={credits}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {activeTab === 'dashboard' && (
          user.role === 'KNOWLEDGE_SHARER' ? (
            <MentorDashboard
              user={user}
              sessions={sessions}
              credits={credits}
              setActiveTab={setActiveTab}
              onJoinSession={(session) => setActiveSession(session)}
              onRefreshSessions={() => loadAppData(token)}
            />
          ) : (
            <LearnerDashboard
              user={user}
              skills={skills}
              sessions={sessions}
              courses={courses}
              bootcamps={bootcamps}
              quizzes={quizzes}
              credits={credits}
              setActiveTab={setActiveTab}
              onJoinSession={(session) => setActiveSession(session)}
            />
          )
        )}

        {activeTab === 'explore' && (
          <ExploreSharers
            onRefreshSessions={() => loadAppData(token)}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'sessions' && (
          <SessionsView
            sessions={sessions}
            user={user}
            onJoinSession={(session) => setActiveSession(session)}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'courses' && <CoursesView user={user} />}
        {activeTab === 'bootcamps' && <BootcampsView user={user} />}
        {activeTab === 'quizzes' && <QuizzesView user={user} />}
        {activeTab === 'wallet' && <WalletView credits={credits} />}
        {activeTab === 'terms' && <TermsView onBack={() => setActiveTab('dashboard')} />}
      </main>

      <Footer setActiveTab={setActiveTab} />
    </div>
  );
}
