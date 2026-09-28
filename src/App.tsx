import React, { lazy, Suspense, useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegistrationPage } from './pages/RegistrationPage';
import { TermsPage, PrivacyPage } from './pages/LegalPages';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { SessionsPage } from './pages/SessionsPage';
import { TimeWalletPage } from './pages/TimeWalletPage';
import { AssistantPage } from './pages/AssistantPage';
import { QuizzesPage } from './pages/QuizzesPage';
import { QuizDetailPage } from './pages/QuizDetailPage';
import { RatingsPage } from './pages/RatingsPage';
import { AchievementsPage } from './pages/AchievementsPage';
import { LearningPlanPage } from './pages/LearningPlanPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { CourseDetailPage, CoursesPage } from './pages/CoursesPage';
import { NotesPage } from './pages/NotesPage';
import { BootcampDetailPage, BootcampsPage } from './pages/BootcampsPage';

const SessionRoomPage = lazy(() => import('./pages/InternalSessionRoomPage').then((module) => ({ default: module.InternalSessionRoomPage })));

function MainRouter() {
  const { user, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path.split('?')[0]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-slate-500 text-xs">
        Initializing LearnX platform...
      </div>
    );
  }

  // Route matching
  let pageContent: React.ReactNode = null;

  if (currentPath === '/' || currentPath === '') {
    pageContent = user ? <DashboardPage navigate={navigate} /> : <LandingPage navigate={navigate} />;
  } else if (currentPath === '/login') {
    pageContent = <LoginPage navigate={navigate} />;
  } else if (currentPath === '/register') {
    pageContent = user ? <DashboardPage navigate={navigate} /> : <RegistrationPage navigate={navigate} />;
  } else if (currentPath === '/register/learner') {
    pageContent = user ? <DashboardPage navigate={navigate} /> : <RegistrationPage role="LEARNER" navigate={navigate} />;
  } else if (currentPath === '/register/mentor') {
    pageContent = user ? <DashboardPage navigate={navigate} /> : <RegistrationPage role="KNOWLEDGE_SHARER" navigate={navigate} />;
  } else if (currentPath === '/terms') {
    pageContent = <TermsPage navigate={navigate} />;
  } else if (currentPath === '/privacy') {
    pageContent = <PrivacyPage navigate={navigate} />;
  } else if (currentPath === '/verify-email') {
    pageContent = <VerifyEmailPage navigate={navigate} />;
  } else if (currentPath === '/forgot-password') {
    pageContent = <ForgotPasswordPage navigate={navigate} />;
  } else if (currentPath === '/onboarding') {
    pageContent = user ? <OnboardingPage navigate={navigate} /> : <LoginPage navigate={navigate} />;
  } else if (currentPath === '/dashboard') {
    pageContent = user ? <DashboardPage navigate={navigate} /> : <LoginPage navigate={navigate} />;
  } else if (currentPath === '/discover' || currentPath === '/learn' || currentPath === '/skills') {
    pageContent = <DiscoverPage navigate={navigate} />;
  } else if (currentPath === '/recommendations') {
    pageContent = <RecommendationsPage navigate={navigate} />;
  } else if (currentPath === '/sessions') {
    pageContent = user ? <SessionsPage navigate={navigate} /> : <LoginPage navigate={navigate} />;
  } else if (currentPath.startsWith('/session-room/')) {
    const sessionId = currentPath.replace('/session-room/', '');
    pageContent = user ? (
      <Suspense fallback={<div className="flex min-h-[70vh] items-center justify-center text-sm text-slate-400">Loading session room...</div>}>
        <SessionRoomPage sessionId={sessionId} navigate={navigate} />
      </Suspense>
    ) : <LoginPage navigate={navigate} />;
  } else if (currentPath === '/time-wallet') {
    pageContent = user ? <TimeWalletPage navigate={navigate} /> : <LoginPage navigate={navigate} />;
  } else if (currentPath === '/assistant') {
    pageContent = user ? <AssistantPage navigate={navigate} /> : <LoginPage navigate={navigate} />;
  } else if (currentPath === '/quizzes') {
    pageContent = <QuizzesPage navigate={navigate} />;
  } else if (currentPath.startsWith('/quizzes/')) {
    const quizId = currentPath.replace('/quizzes/', '');
    pageContent = user ? <QuizDetailPage quizId={quizId} navigate={navigate} /> : <LoginPage navigate={navigate} />;
  } else if (currentPath === '/ratings') {
    pageContent = user ? <RatingsPage navigate={navigate} /> : <LoginPage navigate={navigate} />;
  } else if (currentPath === '/achievements') {
    pageContent = <AchievementsPage navigate={navigate} />;
  } else if (currentPath.startsWith('/courses/')) {
    const courseId = currentPath.replace('/courses/', '');
    pageContent = <CourseDetailPage courseId={courseId} navigate={navigate} />;
  } else if (currentPath === '/courses' || currentPath === '/partner-courses') {
    pageContent = <CoursesPage navigate={navigate} />;
  } else if (currentPath.startsWith('/bootcamps/')) {
    const bootcampId = currentPath.replace('/bootcamps/', '');
    pageContent = <BootcampDetailPage bootcampId={bootcampId} navigate={navigate} />;
  } else if (currentPath === '/bootcamps') {
    pageContent = <BootcampsPage navigate={navigate} />;
  } else if (currentPath === '/notes') {
    pageContent = user ? <NotesPage navigate={navigate} /> : <LoginPage navigate={navigate} />;
  } else if (currentPath === '/learning-path' || currentPath === '/my-learning') {
    pageContent = user ? <LearningPlanPage navigate={navigate} /> : <LoginPage navigate={navigate} />;
  } else if (currentPath === '/profile' || currentPath.startsWith('/profile/')) {
    pageContent = user ? <ProfilePage navigate={navigate} /> : <LoginPage navigate={navigate} />;
  } else if (currentPath.startsWith('/admin')) {
    pageContent = user ? <AdminDashboardPage navigate={navigate} /> : <LoginPage navigate={navigate} />;
  } else {
    pageContent = <LandingPage navigate={navigate} />;
  }

  const isRoom = currentPath.startsWith('/session-room/');
  const showSidebar = user && !isRoom && currentPath !== '/' && currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/onboarding';

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f17] text-slate-100 font-['Plus_Jakarta_Sans'] selection:bg-cyan-500 selection:text-white">
      <Navbar currentPath={currentPath} navigate={navigate} />
      <div className="flex-1 flex">
        {showSidebar && <Sidebar currentPath={currentPath} navigate={navigate} />}
        <main className="flex-1 min-w-0">{pageContent}</main>
      </div>
      {!isRoom && <Footer navigate={navigate} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}
