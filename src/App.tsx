import React, { useEffect, Suspense, lazy } from 'react';
import { TitleBar } from './components/ui/TitleBar';
import { Sidebar } from './components/ui/Sidebar';
import { HabitModal } from './components/ui/HabitModal';
import { CommandPalette } from './components/ui/CommandPalette';
import { ReflectionModal } from './components/ui/ReflectionModal';
import { WeeklyReviewModal } from './components/ui/WeeklyReviewModal';
import { DashboardPage } from './pages/DashboardPage';
import { DailyHabitsPage } from './pages/DailyHabitsPage';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { useHabitStore } from './store/useHabitStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useMidnightRollover } from './hooks/useLiveClock';
import { MobileHeader, MobileNavigation } from './components/ui/MobileChrome';
import { UpdateReceiverToast } from './components/ui/UpdateReceiverToast';
import { LiveHabitTimerBar } from './components/focus/LiveHabitTimerBar';
import { WellnessLogEntry } from './components/ui/WellnessLogEntry';
import { FocusShieldBanner } from './components/focus/FocusShieldBanner';

// High-Performance Lazy Loaded Route Pages (Substantially reduces initial bundle & RAM)
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const StreaksPage = lazy(() => import('./pages/StreaksPage').then((m) => ({ default: m.StreaksPage })));
const TimetablePage = lazy(() => import('./pages/TimetablePage').then((m) => ({ default: m.TimetablePage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const InstructionsPage = lazy(() => import('./pages/InstructionsPage').then((m) => ({ default: m.InstructionsPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));

// On-Demand Lazy Loaded Modal Components (Loaded only when user opens them)
const RoutineRunnerModal = lazy(() => import('./components/routines/RoutineRunnerModal').then((m) => ({ default: m.RoutineRunnerModal })));
const RoutineManagerModal = lazy(() => import('./components/routines/RoutineManagerModal').then((m) => ({ default: m.RoutineManagerModal })));
const FocusStudioModal = lazy(() => import('./components/focus/FocusStudioModal').then((m) => ({ default: m.FocusStudioModal })));
const ShareCardModal = lazy(() => import('./components/ui/ShareCardModal').then((m) => ({ default: m.ShareCardModal })));
const TimetableImportModal = lazy(() => import('./components/timetable/TimetableImportModal').then((m) => ({ default: m.TimetableImportModal })));
const TimetableBlockModal = lazy(() => import('./components/timetable/TimetableBlockModal').then((m) => ({ default: m.TimetableBlockModal })));
const RpgSkillTreeModal = lazy(() => import('./components/rpg/RpgSkillTreeModal').then((m) => ({ default: m.RpgSkillTreeModal })));
const ZenStudioModal = lazy(() => import('./components/focus/ZenStudioModal').then((m) => ({ default: m.ZenStudioModal })));
const FocusShieldModal = lazy(() => import('./components/focus/FocusShieldModal').then((m) => ({ default: m.FocusShieldModal })));
const HabitSynergyGraphModal = lazy(() => import('./components/synergy/HabitSynergyGraphModal').then((m) => ({ default: m.HabitSynergyGraphModal })));
const TimeCapsuleModal = lazy(() => import('./components/proof/TimeCapsuleModal').then((m) => ({ default: m.TimeCapsuleModal })));
const P2PDuelModal = lazy(() => import('./components/duel/P2PDuelModal').then((m) => ({ default: m.P2PDuelModal })));
const GhostDebriefModal = lazy(() => import('./components/analytics/GhostDebriefModal').then((m) => ({ default: m.GhostDebriefModal })));
const HardcoreLockdownModal = lazy(() => import('./components/focus/HardcoreLockdownModal').then((m) => ({ default: m.HardcoreLockdownModal })));
const TitanBossArenaModal = lazy(() => import('./components/rpg/TitanBossArenaModal').then((m) => ({ default: m.TitanBossArenaModal })));
const AiVisionSentinelModal = lazy(() => import('./components/focus/AiVisionSentinelModal').then((m) => ({ default: m.AiVisionSentinelModal })));
const CircadianForecastModal = lazy(() => import('./components/analytics/CircadianForecastModal').then((m) => ({ default: m.CircadianForecastModal })));
const AndroidWidgetStudioModal = lazy(() => import('./components/widgets/AndroidWidgetStudioModal').then((m) => ({ default: m.AndroidWidgetStudioModal })));

const PageLoadingFallback: React.FC = () => (
  <div className="flex-1 min-h-[300px] h-full flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent animate-spin" />
  </div>
);

import {
  DAILY_REMINDER_STOP_ACTION,
  dismissAndroidReminder,
  isAndroidApp,
  syncAndroidDailyReminder,
} from './lib/reminders';
import { LocalNotifications } from '@capacitor/local-notifications';

export const App: React.FC = () => {
  useMidnightRollover();
  const init = useHabitStore((s) => s.init);
  const activeTab = useHabitStore((s) => s.activeTab);
  const authScreen = useHabitStore((s) => s.authScreen);
  const reduceMotion = useHabitStore((s) => s.settings.reduce_motion);
  const isLoading = useHabitStore((s) => s.isLoading);
  const setSidebarCollapsed = useHabitStore((s) => s.setSidebarCollapsed);
  const wellnessModalOpen = useHabitStore((s) => s.wellnessModalOpen);
  const setWellnessModalOpen = useHabitStore((s) => s.setWellnessModalOpen);
  const currentDate = useHabitStore((s) => s.currentDate);

  // Modal open states for on-demand lazy mounting (zero DOM/listener footprint when closed)
  const routineRunnerActive = Boolean(useHabitStore((s) => s.activeRoutineRunner));
  const routineManagerOpen = useHabitStore((s) => s.routineManagerOpen);
  const focusStudioOpen = useHabitStore((s) => s.focusStudioOpen);
  const shareCardOpen = useHabitStore((s) => s.shareCardOpen);
  const timetableImportModalOpen = useHabitStore((s) => s.timetableImportModalOpen);
  const timetableBlockModalOpen = useHabitStore((s) => s.timetableBlockModalOpen);
  const rpgSkillTreeModalOpen = useHabitStore((s) => s.rpgSkillTreeModalOpen);
  const zenStudioModalOpen = useHabitStore((s) => s.zenStudioModalOpen);
  const focusShieldModalOpen = useHabitStore((s) => s.focusShieldModalOpen);
  const synergyGraphModalOpen = useHabitStore((s) => s.synergyGraphModalOpen);
  const timeCapsuleModalOpen = useHabitStore((s) => s.timeCapsuleModalOpen);
  const p2pDuelModalOpen = useHabitStore((s) => s.p2pDuelModalOpen);
  const ghostDebriefOpen = useHabitStore((s) => s.ghostDebriefOpen);
  const hardcoreLockdownModalOpen = useHabitStore((s) => s.hardcoreLockdownModalOpen);
  const titanBossArenaModalOpen = useHabitStore((s) => s.titanBossArenaModalOpen);
  const aiVisionSentinelModalOpen = useHabitStore((s) => s.aiVisionSentinelModalOpen);
  const circadianModalOpen = useHabitStore((s) => s.circadianModalOpen);
  const setCircadianModalOpen = useHabitStore((s) => s.setCircadianModalOpen);
  const androidWidgetStudioOpen = useHabitStore((s) => s.androidWidgetStudioOpen);
  const setAndroidWidgetStudioOpen = useHabitStore((s) => s.setAndroidWidgetStudioOpen);

  // Initialize store from SQLite/localStorage on launch
  useEffect(() => {
    void init().then(async () => {
      const reminderTime = useHabitStore.getState().settings.reminder_time;
      await syncAndroidDailyReminder(reminderTime);
    }).catch((error: unknown) => {
      console.error('Failed to initialize daily reminders:', error);
    });
  }, [init]);

  useEffect(() => {
    if (!isAndroidApp()) return;
    let cancelled = false;
    const setupNotificationActions = async () => {
      const listener = await LocalNotifications.addListener(
        'localNotificationActionPerformed',
        async ({ actionId, notification }) => {
          if (actionId === DAILY_REMINDER_STOP_ACTION) {
            try {
              await dismissAndroidReminder(notification.id);
            } catch (error) {
              console.error('Failed to dismiss Android reminder notification:', error);
            }
          }
        }
      );
      if (cancelled) {
        await listener.remove();
      }
    };

    void setupNotificationActions().catch((error: unknown) => {
      console.error('Failed to register daily reminder actions:', error);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Global keyboard shortcuts (Ctrl+K, T, N, etc.)
  useKeyboardShortcuts();

  // Listen to remote actions from Electron Always-On-Top Desktop Timer Widget
  useEffect(() => {
    if (typeof window === 'undefined' || !window.api?.desktopTimer?.onRemoteAction) return;
    return window.api.desktopTimer.onRemoteAction((action) => {
      const store = useHabitStore.getState();
      if (action === 'pause') store.pauseHabitTimer();
      else if (action === 'resume') store.resumeHabitTimer();
      else if (action === 'toggle-play' as any) {
        if (store.activeHabitTimer?.startedAtMs) {
          store.pauseHabitTimer();
        } else if (store.activeHabitTimer) {
          store.resumeHabitTimer();
        }
      }
      else if (action === 'finish') void store.stopAndLogHabitTimer(true);
      else if (action === 'discard') store.discardHabitTimer();
      else if (action === 'add-5m') store.extendHabitTimer(5);
    });
  }, []);

  // Listen to OS-level tray and hotkey navigation / timetable actions
  useEffect(() => {
    if (typeof window === 'undefined' || !window.api) return;
    const unsubs: Array<() => void> = [];

    if (window.api.navigation?.onNavigate) {
      unsubs.push(
        window.api.navigation.onNavigate((tab: string) => {
          useHabitStore.getState().setTab(tab as any);
        })
      );
    }

    if (window.api.timetableLive?.onStartActiveFocus) {
      unsubs.push(
        window.api.timetableLive.onStartActiveFocus(() => {
          const store = useHabitStore.getState();
          const todayWday = new Date().getDay();
          const sched =
            store.timetableSchedules.find((s) => s.isActive && s.daysOfWeek.includes(todayWday)) ||
            store.timetableSchedules[0];
          if (!sched) {
            store.setFocusStudioOpen(true);
            return;
          }
          const now = new Date();
          const curMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
          let targetBlock = null;
          for (const b of sched.blocks) {
            const [sH, sM] = b.startTime.split(':').map(Number);
            const [eH, eM] = b.endTime.split(':').map(Number);
            const sMins = sH * 60 + sM;
            const eMins = eH * 60 + eM;
            const isOvernight = eMins <= sMins;
            const isNow = !isOvernight
              ? curMin >= sMins && curMin < eMins
              : curMin >= sMins || curMin < eMins;
            if (isNow) {
              targetBlock = b;
              break;
            }
          }
          if (!targetBlock && sched.blocks.length > 0) {
            targetBlock = sched.blocks[0];
          }
          if (targetBlock) {
            store.startTimetableBlockTimer(targetBlock);
          }
          store.setFocusStudioOpen(true);
        })
      );
    }

    if (window.api.timetableLive?.onToggleActiveBlock) {
      unsubs.push(
        window.api.timetableLive.onToggleActiveBlock(() => {
          const store = useHabitStore.getState();
          const todayWday = new Date().getDay();
          const sched =
            store.timetableSchedules.find((s) => s.isActive && s.daysOfWeek.includes(todayWday)) ||
            store.timetableSchedules[0];
          if (!sched) return;
          const now = new Date();
          const curMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
          for (const b of sched.blocks) {
            const [sH, sM] = b.startTime.split(':').map(Number);
            const [eH, eM] = b.endTime.split(':').map(Number);
            const sMins = sH * 60 + sM;
            const eMins = eH * 60 + eM;
            const isOvernight = eMins <= sMins;
            const isNow = !isOvernight
              ? curMin >= sMins && curMin < eMins
              : curMin >= sMins || curMin < eMins;
            if (isNow) {
              const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
              void store.toggleTimetableExecution(todayStr, b.id);
              break;
            }
          }
        })
      );
    }

    if (window.api.timetableLive?.onOpenZen) {
      unsubs.push(
        window.api.timetableLive.onOpenZen(() => {
          useHabitStore.getState().setZenStudioModalOpen(true);
        })
      );
    }

    return () => {
      for (const u of unsubs) u();
    };
  }, []);

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

  // Responsive auto-collapse & resize transition freeze (prevents shape flickering)
  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    const handleResize = () => {
      // 1. Immediately freeze transitions to prevent shapes from flickering / fighting layout
      if (!document.body.classList.contains('is-resizing')) {
        document.body.classList.add('is-resizing');
      }

      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        document.body.classList.remove('is-resizing');
      }, 120);

      // 2. Responsive collapse only when crossing below 1100px (guarded to avoid render churn)
      if (window.innerWidth < 1100) {
        const store = useHabitStore.getState();
        if (!store.sidebarCollapsed) {
          store.setSidebarCollapsed(true);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimer) clearTimeout(resizeTimer);
      document.body.classList.remove('is-resizing');
    };
  }, []);

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
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <Suspense fallback={<PageLoadingFallback />}>
            <RegisterPage />
          </Suspense>
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
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <Suspense fallback={<PageLoadingFallback />}>
            <LoginPage />
          </Suspense>
        </div>
      </div>
    );
  }

  // 3. Main App with User Profile Page
  const isAndroid = isAndroidApp();

  return (
    <div
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
      className={`mobile-app h-screen w-screen flex flex-col select-none overflow-hidden ${
        reduceMotion ? 'reduce-motion' : ''
      } ${isAndroid ? 'is-android' : ''}`}
    >
      <MobileHeader />
      {/* Frameless Custom Title Bar */}
      <TitleBar />

      {/* Main App Layout: Sidebar + Page Content */}
      <div className="mobile-app-body flex-1 flex overflow-hidden min-w-0 max-w-full">
        <Sidebar />

        <main
          ref={mainRef}
          className={`mobile-main flex-1 min-w-0 max-w-full px-4 py-2.5 sm:px-6 sm:py-3 overflow-x-hidden ${
            activeTab === 'habits'
              ? 'overflow-hidden flex flex-col min-h-0'
              : 'overflow-y-auto custom-scrollbar'
          }`}
        >
          <ErrorBoundary>
            <Suspense fallback={<PageLoadingFallback />}>
              {activeTab === 'dashboard' && <DashboardPage />}
              {activeTab === 'habits' && <DailyHabitsPage />}
              {activeTab === 'timetable' && <TimetablePage />}
              {activeTab === 'analytics' && <AnalyticsPage />}
              {activeTab === 'streaks' && <StreaksPage />}
              {activeTab === 'settings' && <SettingsPage />}
              {activeTab === 'profile' && <ProfilePage />}
              {activeTab === 'guide' && <InstructionsPage />}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <MobileNavigation />

      {/* Modals & Overlays (Mounted on-demand with lazy bundle loading) */}
      <ErrorBoundary fallbackTitle="Overlay Component Error">
        <HabitModal />
        <CommandPalette />
        <ReflectionModal />
        <WeeklyReviewModal />
        <LiveHabitTimerBar />
        <FocusShieldBanner />
        <WellnessLogEntry
          isOpen={wellnessModalOpen}
          onClose={() => setWellnessModalOpen(false)}
          date={currentDate}
        />
        <UpdateReceiverToast />

        <Suspense fallback={null}>
          {routineRunnerActive && <RoutineRunnerModal />}
          {routineManagerOpen && <RoutineManagerModal />}
          {focusStudioOpen && <FocusStudioModal />}
          {shareCardOpen && <ShareCardModal />}
          {timetableImportModalOpen && <TimetableImportModal />}
          {timetableBlockModalOpen && <TimetableBlockModal />}
          {rpgSkillTreeModalOpen && <RpgSkillTreeModal />}
          {zenStudioModalOpen && <ZenStudioModal />}
          {focusShieldModalOpen && <FocusShieldModal />}
          {synergyGraphModalOpen && <HabitSynergyGraphModal />}
          {timeCapsuleModalOpen && <TimeCapsuleModal />}
          {p2pDuelModalOpen && <P2PDuelModal />}
          {ghostDebriefOpen && <GhostDebriefModal />}
          {hardcoreLockdownModalOpen && <HardcoreLockdownModal />}
          {titanBossArenaModalOpen && <TitanBossArenaModal />}
          {aiVisionSentinelModalOpen && <AiVisionSentinelModal />}
          {circadianModalOpen && (
            <CircadianForecastModal
              isOpen={circadianModalOpen}
              onClose={() => setCircadianModalOpen(false)}
            />
          )}
          {androidWidgetStudioOpen && (
            <AndroidWidgetStudioModal
              isOpen={androidWidgetStudioOpen}
              onClose={() => setAndroidWidgetStudioOpen(false)}
            />
          )}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};
