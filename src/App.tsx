import React, { useEffect } from 'react';
import { TitleBar } from './components/ui/TitleBar';
import { Sidebar } from './components/ui/Sidebar';
import { HabitModal } from './components/ui/HabitModal';
import { CommandPalette } from './components/ui/CommandPalette';
import { ReflectionModal } from './components/ui/ReflectionModal';
import { WeeklyReviewModal } from './components/ui/WeeklyReviewModal';
import { DashboardPage } from './pages/DashboardPage';
import { DailyHabitsPage } from './pages/DailyHabitsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { StreaksPage } from './pages/StreaksPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { InstructionsPage } from './pages/InstructionsPage';
import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { useHabitStore } from './store/useHabitStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { MobileHeader, MobileNavigation } from './components/ui/MobileChrome';

export const App: React.FC = () => {
  const init = useHabitStore((s) => s.init);
  const activeTab = useHabitStore((s) => s.activeTab);
  const authScreen = useHabitStore((s) => s.authScreen);
  const reduceMotion = useHabitStore((s) => s.settings.reduce_motion);
  const isLoading = useHabitStore((s) => s.isLoading);
  const setSidebarCollapsed = useHabitStore((s) => s.setSidebarCollapsed);

  // Initialize store from SQLite/localStorage on launch
  useEffect(() => {
    init();
  }, [init]);

  // Global keyboard shortcuts (Ctrl+K, T, N, etc.)
  useKeyboardShortcuts();

  const mainRef = React.useRef<HTMLElement>(null);

  // Reset page scroll to top whenever switching tabs
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    const raf = requestAnimationFrame(() => {
      if (mainRef.current) {
        mainRef.current.scrollTop = 0;
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [activeTab]);

  // Responsive auto-collapse when window is resized below 1100px
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1100) {
        setSidebarCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarCollapsed]);

  // Initial loading spinner
  if (isLoading) {
    return (
      <div
        style={{ backgroundColor: 'var(--bg-canvas)' }}
        className="mobile-app h-screen w-screen flex flex-col select-none overflow-hidden"
      >
        <MobileHeader />
        <TitleBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  // 1. User Creation Page (First create user creating page)
  if (authScreen === 'register') {
    return (
      <div
        style={{ backgroundColor: 'var(--bg-canvas)' }}
        className="mobile-app h-screen w-screen flex flex-col select-none overflow-hidden"
      >
        <MobileHeader />
        <TitleBar />
        <div className="flex-1 overflow-hidden">
          <RegisterPage />
        </div>
      </div>
    );
  }

  // 2. Login Page (Once user created, login page opens)
  if (authScreen === 'login') {
    return (
      <div
        style={{ backgroundColor: 'var(--bg-canvas)' }}
        className="mobile-app h-screen w-screen flex flex-col select-none overflow-hidden"
      >
        <MobileHeader />
        <TitleBar />
        <div className="flex-1 overflow-hidden">
          <LoginPage />
        </div>
      </div>
    );
  }

  // 3. Main App with User Profile Page
  return (
    <div
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
      className={`mobile-app h-screen w-screen flex flex-col select-none overflow-hidden ${
        reduceMotion ? 'reduce-motion' : ''
      }`}
    >
      <MobileHeader />
      {/* Frameless Custom Title Bar */}
      <TitleBar />

      {/* Main App Layout: Sidebar + Page Content */}
      <div className="mobile-app-body flex-1 flex overflow-hidden">
        <Sidebar />

        <main
          ref={mainRef}
          className={`mobile-main flex-1 px-4 py-2.5 sm:px-6 sm:py-3 ${
            activeTab === 'habits'
              ? 'overflow-hidden flex flex-col min-h-0'
              : 'overflow-y-auto custom-scrollbar'
          }`}
        >
          <ErrorBoundary>
            {activeTab === 'dashboard' && <DashboardPage />}
            {activeTab === 'habits' && <DailyHabitsPage />}
            {activeTab === 'analytics' && <AnalyticsPage />}
            {activeTab === 'streaks' && <StreaksPage />}
            {activeTab === 'settings' && <SettingsPage />}
            {activeTab === 'profile' && <ProfilePage />}
            {activeTab === 'guide' && <InstructionsPage />}
          </ErrorBoundary>
        </main>
      </div>
      <MobileNavigation />

      {/* Modals & Overlays */}
      <HabitModal />
      <CommandPalette />
      <ReflectionModal />
      <WeeklyReviewModal />
    </div>
  );
};
