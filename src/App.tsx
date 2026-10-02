import React, { useEffect, useState } from 'react';

import { AuthProvider, useAuth } from './context/AuthContext';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegistrationPage } from './pages/RegistrationPage';
import {
  TermsPage,
  PrivacyPage,
} from './pages/LegalPages';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { OnboardingPage } from './components/Register';
import { DashboardPage } from './pages/DashboardPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { SessionsPage } from './pages/SessionsPage';
import { InternalSessionRoomPage } from './pages/InternalSessionRoomPage';
import {
  CoursesPage,
  CourseDetailPage,
} from './pages/CoursesPage';
import {
  BootcampsPage,
  BootcampDetailPage,
} from './pages/BootcampsPage';
import { NotesPage } from './pages/NotesPage';
import { AssistantPage } from './pages/AssistantPage';
import { QuizzesPage } from './pages/QuizzesPage';
import { QuizDetailPage } from './pages/QuizDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { TimeWalletPage } from './pages/TimeWalletPage';
import { LearningPlanPage } from './pages/LearningPlanPage';
import { AchievementsPage } from './pages/AchievementsPage';
import { RatingsPage } from './pages/RatingsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

function AppContent() {
  const { user, loading } = useAuth();

  const [currentPath, setCurrentPath] = useState(
    window.location.pathname || '/'
  );

  const navigate = (path: string) => {
    if (path === currentPath) {
      return;
    }

    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(
        window.location.pathname || '/'
      );
    };

    window.addEventListener(
      'popstate',
      handlePopState
    );

    return () => {
      window.removeEventListener(
        'popstate',
        handlePopState
      );
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#2F3338] border-t-[#4169E1]" />

          <p className="text-sm text-slate-400">
            Loading LearnX...
          </p>
        </div>
      </div>
    );
  }

  const publicPaths = [
    '/',
    '/login',
    '/register',
    '/register/learner',
    '/register/mentor',
    '/verify-email',
    '/forgot-password',
    '/reset-password',
    '/terms',
    '/privacy',
  ];

  const isPublicPath =
    publicPaths.includes(currentPath) ||
    currentPath.startsWith('/courses') ||
    currentPath.startsWith('/bootcamps');

  if (!user && !isPublicPath) {
    navigate('/login');
    return null;
  }

  if (
    user &&
    !user.onboarding_completed &&
    currentPath !== '/onboarding' &&
    currentPath !== '/logout'
  ) {
    navigate('/onboarding');
    return null;
  }

  const renderPage = () => {
    if (currentPath === '/') {
      return (
        <LandingPage
          navigate={navigate}
        />
      );
    }

    if (currentPath === '/login') {
      return (
        <LoginPage
          navigate={navigate}
        />
      );
    }

    if (currentPath === '/register') {
      return (
        <RegistrationPage
          navigate={navigate}
        />
      );
    }

    if (currentPath === '/register/learner') {
      return (
        <RegistrationPage
          role="LEARNER"
          navigate={navigate}
        />
      );
    }

   if (currentPath === '/register/mentor') {
  return (
    <RegistrationPage
      role="MENTOR"
      navigate={navigate}
    />
  );
}

    if (currentPath === '/verify-email') {
      return (
        <VerifyEmailPage
          navigate={navigate}
        />
      );
    }

    if (currentPath === '/forgot-password') {
      return (
        <ForgotPasswordPage
          navigate={navigate}
        />
      );
    }

    if (currentPath === '/reset-password') {
      return (
        <ResetPasswordPage
          navigate={navigate}
        />
      );
    }

    if (currentPath === '/terms') {
      return (
        <TermsPage
          navigate={navigate}
        />
      );
    }

    if (currentPath === '/privacy') {
      return (
        <PrivacyPage
          navigate={navigate}
        />
      );
    }

    if (currentPath === '/onboarding') {
      return (
        <OnboardingPage
          navigate={navigate}
        />
      );
    }

    if (currentPath === '/dashboard') {
      return (
        <DashboardPage
          navigate={navigate}
        />
      );
    }

    if (currentPath === '/discover') {
      return (
        <DiscoverPage
          navigate={navigate}
        />
      );
    }

    if (currentPath === '/recommendations') {
      return (
        <RecommendationsPage
          navigate={navigate}
        />
      );
    }

    if (currentPath === '/sessions') {
      return (
        <SessionsPage
          navigate={navigate}
        />
      );
    }

    const sessionMatch = currentPath.match(
      /^\/sessions\/([^/]+)$/
    );

    if (sessionMatch) {
      return (
        <InternalSessionRoomPage
          sessionId={sessionMatch[1]}
          navigate={navigate}
        />
      );
    }

    if (currentPath === '/courses') {
      return (
        <CoursesPage
          navigate={navigate}
        />
      );
    }

    const courseMatch = currentPath.match(
      /^\/courses\/([^/]+)$/
    );

    if (courseMatch) {
      return (
        <CourseDetailPage
          courseId={courseMatch[1]}
          navigate={navigate}
        />
      );
    }

    if (currentPath === '/bootcamps') {
      return (
        <BootcampsPage
          navigate={navigate}
        />
      );
    }

    const bootcampMatch = currentPath.match(
      /^\/bootcamps\/([^/]+)$/
    );

    if (bootcampMatch) {
      return (
        <BootcampDetailPage
          bootcampId={bootcampMatch[1]}
          navigate={navigate}
        />
      );
    }

 if (currentPath === '/notes') {
  return <NotesPage />;
}
    if (currentPath === '/assistant') {
      return (
        <AssistantPage
          navigate={navigate}
        />
      );
    }

    if (currentPath === '/quizzes') {
      return (
        <QuizzesPage
          navigate={navigate}
        />
      );
    }

    const quizMatch = currentPath.match(
      /^\/quizzes\/([^/]+)$/
    );

    if (quizMatch) {
      return (
        <QuizDetailPage
          quizId={quizMatch[1]}
          navigate={navigate}
        />
      );
    }

    if (currentPath === '/profile') {
      return (
        <ProfilePage
          navigate={navigate}
        />
      );
    }

    if (currentPath === '/time-wallet') {
      return (
        <TimeWalletPage
          navigate={navigate}
        />
      );
    }

    if (currentPath === '/learning-path') {
      return (
        <LearningPlanPage
          navigate={navigate}
        />
      );
    }

    if (currentPath === '/achievements') {
      return (
        <AchievementsPage
          navigate={navigate}
        />
      );
    }

    if (currentPath === '/ratings') {
      return (
        <RatingsPage
          navigate={navigate}
        />
      );
    }

    if (
      currentPath === '/admin' ||
      currentPath.startsWith('/admin/')
    ) {
      if (user?.role !== 'ADMIN') {
        navigate('/dashboard');
        return null;
      }

      return (
        <AdminDashboardPage
          navigate={navigate}
        />
      );
    }

    if (currentPath === '/skills') {
      return (
        <DiscoverPage
          navigate={navigate}
        />
      );
    }

    if (currentPath === '/notifications') {
      return (
        <DashboardPage
          navigate={navigate}
        />
      );
    }

    if (currentPath === '/certificates') {
      return (
        <AchievementsPage
          navigate={navigate}
        />
      );
    }

    return (
      <DashboardPage
        navigate={navigate}
      />
    );
  };

  const showAppShell =
    !!user &&
    currentPath !== '/' &&
    currentPath !== '/login' &&
    currentPath !== '/register' &&
    currentPath !== '/register/learner' &&
    currentPath !== '/register/mentor' &&
    currentPath !== '/verify-email' &&
    currentPath !== '/forgot-password' &&
    currentPath !== '/reset-password';

  return (
    <div className="min-h-screen bg-[#0B0F14] text-white">
      {showAppShell && (
        <Navbar
          currentPath={currentPath}
          navigate={navigate}
        />
      )}

      <div className="flex min-h-[calc(100vh-4rem)]">
        {showAppShell && (
          <Sidebar
            currentPath={currentPath}
            navigate={navigate}
          />
        )}

        <main className="min-w-0 flex-1">
          {renderPage()}
        </main>
      </div>

      {showAppShell && (
        <Footer
          navigate={navigate}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}