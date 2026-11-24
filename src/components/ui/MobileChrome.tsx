import React from 'react';
import {
  BarChart3,
  CheckSquare,
  LayoutDashboard,
  Flame,
  UserRound,
  Search,
  Settings,
  Plus,
  CalendarClock,
  Menu,
  X,
  Headphones,
  Timer,
  Zap,
  ShieldCheck,
  Lock,
  Eye,
  Swords,
  Award,
  Clock,
  Smile,
  Compass,
  Sparkles,
  TrendingUp,
  Ghost,
  Sun,
  LogOut,
  ChevronRight,
  ShieldAlert,
  Smartphone,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import appLogo from '../../assets/icon.png';
import type { TabType } from '../../lib/types';
import { calculateLevelFromXp, getRankTitle } from '../../lib/levelingSystem';

interface NavTab {
  id: TabType | 'hub';
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

const mobileTabs: NavTab[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'habits', label: 'Habits', icon: CheckSquare },
  { id: 'timetable', label: 'Timetable', icon: CalendarClock },
  { id: 'analytics', label: 'Stats', icon: BarChart3 },
  { id: 'hub', label: 'Hub', icon: Menu },
];

export const MobileHeader: React.FC = () => {
  const activeTab = useHabitStore((state) => state.activeTab);
  const setTab = useHabitStore((state) => state.setTab);
  const openHabitModal = useHabitStore((state) => state.openHabitModal);
  const setCommandPaletteOpen = useHabitStore((state) => state.setCommandPaletteOpen);
  const setMobileMenuOpen = useHabitStore((state) => state.setMobileMenuOpen);
  const mobileMenuOpen = useHabitStore((state) => state.mobileMenuOpen);
  const setZenStudioOpen = useHabitStore((state) => state.setZenStudioModalOpen);
  const authScreen = useHabitStore((state) => state.authScreen);

  const isAuthPage = authScreen === 'login' || authScreen === 'register';

  const getPageTitle = () => {
    if (authScreen === 'login') return 'Sign In';
    if (authScreen === 'register') return 'Create Account';

    switch (activeTab) {
      case 'dashboard':
        return 'Today';
      case 'habits':
        return 'Daily Matrix';
      case 'timetable':
        return 'Timetable';
      case 'analytics':
        return 'Analytics';
      case 'streaks':
        return 'Streaks';
      case 'profile':
        return 'Account';
      case 'settings':
        return 'Settings';
      case 'guide':
        return 'Guide';
      default:
        return 'Zion';
    }
  };

  return (
    <header className="mobile-header">
      <div className="mobile-header-inner">
        {/* Left: Brand Identity / View Title */}
        <div
          className="mobile-header-left"
          onClick={() => {
            if (!isAuthPage) setTab('dashboard');
          }}
        >
          <img src={appLogo} alt="Zion" className="mobile-header-logo" />
          <div className="mobile-header-title-wrap">
            <span className="mobile-header-title">{getPageTitle()}</span>
            <span className="mobile-header-brand">Zion</span>
          </div>
        </div>

        {/* Right: Actions */}
        {!isAuthPage && (
          <div className="mobile-header-right">
            <button
              type="button"
              className="mobile-header-icon-btn"
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="Search"
              title="Search (Ctrl+K)"
            >
              <Search size={16} strokeWidth={1.8} />
            </button>

            <button
              type="button"
              className="mobile-header-icon-btn"
              onClick={() => setZenStudioOpen(true)}
              aria-label="Zen Ambient Audio"
              title="Zen Studio (Ambient Sounds)"
            >
              <Headphones size={16} strokeWidth={1.8} className="text-indigo-400" />
            </button>

            <button
              type="button"
              className="mobile-header-add-btn"
              onClick={() => openHabitModal()}
              aria-label="New habit"
              title="Add Habit"
            >
              <Plus size={16} strokeWidth={2.4} />
            </button>

            <button
              type="button"
              className={`mobile-header-icon-btn${mobileMenuOpen ? ' is-active' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Open Studio Menu"
              title="All Features & Protocols"
            >
              {mobileMenuOpen ? <X size={17} strokeWidth={2} /> : <Menu size={17} strokeWidth={1.8} />}
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export const MobileNavigation: React.FC = () => {
  const activeTab = useHabitStore((state) => state.activeTab);
  const setTab = useHabitStore((state) => state.setTab);
  const setMobileMenuOpen = useHabitStore((state) => state.setMobileMenuOpen);
  const mobileMenuOpen = useHabitStore((state) => state.mobileMenuOpen);

  const isHubActive =
    mobileMenuOpen || ['streaks', 'profile', 'settings', 'guide'].includes(activeTab);

  return (
    <>
      <nav className="mobile-navigation" aria-label="Bottom Navigation">
        {mobileTabs.map(({ id, label, icon: Icon }) => {
          const isHub = id === 'hub';
          const isActive = isHub ? isHubActive : activeTab === id;

          return (
            <button
              key={id}
              type="button"
              className={`mobile-nav-item${isActive ? ' is-active' : ''}`}
              onClick={() => {
                if (isHub) {
                  setMobileMenuOpen(!mobileMenuOpen);
                } else {
                  setMobileMenuOpen(false);
                  setTab(id as TabType);
                }
              }}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="mobile-nav-icon">
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.7} />
              </span>
              <span className="mobile-nav-label">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Full Feature Mobile Studio Drawer */}
      {mobileMenuOpen && <MobileHubDrawer />}
    </>
  );
};

export const MobileHubDrawer: React.FC = () => {
  const currentUser = useHabitStore((state) => state.currentUser);
  const setTab = useHabitStore((state) => state.setTab);
  const setMobileMenuOpen = useHabitStore((state) => state.setMobileMenuOpen);
  const setAuthScreen = useHabitStore((state) => state.setAuthScreen);
  const logoutUser = useHabitStore((state) => state.logoutUser);
  const activeTab = useHabitStore((state) => state.activeTab);
  const habits = useHabitStore((state) => state.habits);
  const allCheckinsList = useHabitStore((state) => state.allCheckinsList);
  const rpgProfile = useHabitStore((state) => state.rpgProfile);

  // Modals launchers
  const setFocusStudioOpen = useHabitStore((state) => state.setFocusStudioOpen);
  const setZenStudioOpen = useHabitStore((state) => state.setZenStudioModalOpen);
  const setRoutineManagerOpen = useHabitStore((state) => state.setRoutineManagerOpen);
  const setFocusShieldModalOpen = useHabitStore((state) => state.setFocusShieldModalOpen);
  const setHardcoreLockdownOpen = useHabitStore((state) => state.setHardcoreLockdownModalOpen);
  const setAiVisionSentinelOpen = useHabitStore((state) => state.setAiVisionSentinelModalOpen);
  const setRpgSkillTreeOpen = useHabitStore((state) => state.setRpgSkillTreeModalOpen);
  const setTitanBossArenaOpen = useHabitStore((state) => state.setTitanBossArenaModalOpen);
  const setP2PDuelOpen = useHabitStore((state) => state.setP2PDuelModalOpen);
  const setTimeCapsuleOpen = useHabitStore((state) => state.setTimeCapsuleModalOpen);
  const setGhostDebriefOpen = useHabitStore((state) => state.setGhostDebriefOpen);
  const setCircadianModalOpen = useHabitStore((state) => state.setCircadianModalOpen);
  const setWellnessModalOpen = useHabitStore((state) => state.setWellnessModalOpen);
  const setAndroidWidgetStudioOpen = useHabitStore((state) => state.setAndroidWidgetStudioOpen);

  const totalCompletions = allCheckinsList.filter((c) => c.completed).length;
  const levelInfo = calculateLevelFromXp(rpgProfile?.totalXp || totalCompletions * 25);
  const level = levelInfo.level;
  const title = getRankTitle(level);

  const handleNav = (tab: TabType) => {
    setTab(tab);
    setMobileMenuOpen(false);
  };

  const handleAction = (callback: () => void) => {
    callback();
    setMobileMenuOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Blurred Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Drawer Surface */}
      <div
        style={{
          backgroundColor: '#09090b',
          borderColor: 'rgba(255, 255, 255, 0.12)',
        }}
        className="relative z-10 w-full max-h-[85vh] rounded-t-3xl border-t border-x flex flex-col overflow-hidden animate-slide-up shadow-2xl"
      >
        {/* Drag Handle & Top Bar */}
        <div className="pt-3 pb-2 px-5 flex items-center justify-between border-b border-white/5">
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto" />
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="absolute right-4 top-3 p-1.5 rounded-full text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Hub Content */}
        <div className="overflow-y-auto p-4 space-y-4 pb-8 custom-scrollbar">
          {/* User Profile Card */}
          <div
            onClick={() => handleNav('profile')}
            className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                style={{
                  backgroundColor: currentUser?.avatarColor || '#6366f1',
                }}
                className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-md text-base shrink-0"
              >
                {currentUser?.name?.[0]?.toUpperCase() || 'Z'}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm text-white truncate flex items-center gap-2">
                  <span>{currentUser?.name || 'Zion Pioneer'}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                    Lv. {level}
                  </span>
                </div>
                <div className="text-xs text-zinc-400 truncate">
                  {title} • {totalCompletions} Check-ins
                </div>
              </div>
            </div>
            <ChevronRight size={16} className="text-zinc-500 shrink-0" />
          </div>

          {/* Core Views Section */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 px-1">
              Main Views
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleNav('dashboard')}
                className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-white/10 border-white/20 text-white font-bold'
                    : 'bg-white/[0.02] border-white/5 text-zinc-300 hover:bg-white/[0.05]'
                }`}
              >
                <LayoutDashboard size={16} className="text-sky-400 shrink-0" />
                <span className="text-xs">Today Home</span>
              </button>

              <button
                onClick={() => handleNav('habits')}
                className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                  activeTab === 'habits'
                    ? 'bg-white/10 border-white/20 text-white font-bold'
                    : 'bg-white/[0.02] border-white/5 text-zinc-300 hover:bg-white/[0.05]'
                }`}
              >
                <CheckSquare size={16} className="text-emerald-400 shrink-0" />
                <span className="text-xs">Habits Matrix</span>
              </button>

              <button
                onClick={() => handleNav('timetable')}
                className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                  activeTab === 'timetable'
                    ? 'bg-white/10 border-white/20 text-white font-bold'
                    : 'bg-white/[0.02] border-white/5 text-zinc-300 hover:bg-white/[0.05]'
                }`}
              >
                <CalendarClock size={16} className="text-indigo-400 shrink-0" />
                <span className="text-xs">Timetable</span>
              </button>

              <button
                onClick={() => handleNav('analytics')}
                className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-white/10 border-white/20 text-white font-bold'
                    : 'bg-white/[0.02] border-white/5 text-zinc-300 hover:bg-white/[0.05]'
                }`}
              >
                <BarChart3 size={16} className="text-amber-400 shrink-0" />
                <span className="text-xs">Analytics</span>
              </button>

              <button
                onClick={() => handleNav('streaks')}
                className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                  activeTab === 'streaks'
                    ? 'bg-white/10 border-white/20 text-white font-bold'
                    : 'bg-white/[0.02] border-white/5 text-zinc-300 hover:bg-white/[0.05]'
                }`}
              >
                <Flame size={16} className="text-orange-400 shrink-0" />
                <span className="text-xs">Streaks & Badges</span>
              </button>

              <button
                onClick={() => handleNav('settings')}
                className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-white/10 border-white/20 text-white font-bold'
                    : 'bg-white/[0.02] border-white/5 text-zinc-300 hover:bg-white/[0.05]'
                }`}
              >
                <Settings size={16} className="text-purple-400 shrink-0" />
                <span className="text-xs">Settings</span>
              </button>
            </div>
          </div>

          {/* Studios & Advanced Protocols */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 px-1">
              Focus Studios & Protocols
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAction(() => setAndroidWidgetStudioOpen(true))}
                className="p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] hover:bg-emerald-500/[0.12] flex items-center gap-2.5 text-left transition-colors cursor-pointer col-span-2 shadow-sm"
              >
                <Smartphone size={17} className="text-emerald-400 shrink-0" />
                <div className="min-w-0 flex-1 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Android Home Screen Widgets</span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                        WIDGETS
                      </span>
                    </div>
                    <div className="text-[10.5px] text-zinc-400">1-Tap Pin, Live Checklists & Focus HUD</div>
                  </div>
                  <ChevronRight size={14} className="text-zinc-500 shrink-0" />
                </div>
              </button>

              <button
                onClick={() => handleAction(() => setFocusStudioOpen(true))}
                className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] flex items-center gap-2.5 text-left transition-colors cursor-pointer"
              >
                <Timer size={16} className="text-indigo-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">Focus Studio</div>
                  <div className="text-[10px] text-zinc-400">Pomodoro & Timer</div>
                </div>
              </button>

              <button
                onClick={() => handleAction(() => setZenStudioOpen(true))}
                className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] flex items-center gap-2.5 text-left transition-colors cursor-pointer"
              >
                <Headphones size={16} className="text-cyan-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">Zen Studio</div>
                  <div className="text-[10px] text-zinc-400">Ambient Sounds</div>
                </div>
              </button>

              <button
                onClick={() => handleAction(() => setRoutineManagerOpen(true))}
                className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] flex items-center gap-2.5 text-left transition-colors cursor-pointer"
              >
                <Zap size={16} className="text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">Routines</div>
                  <div className="text-[10px] text-zinc-400">Step Flows</div>
                </div>
              </button>

              <button
                onClick={() => handleAction(() => setFocusShieldModalOpen(true))}
                className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] flex items-center gap-2.5 text-left transition-colors cursor-pointer"
              >
                <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">Focus Shield</div>
                  <div className="text-[10px] text-zinc-400">Distraction Blocker</div>
                </div>
              </button>

              <button
                onClick={() => handleAction(() => setRpgSkillTreeOpen(true))}
                className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] flex items-center gap-2.5 text-left transition-colors cursor-pointer"
              >
                <Sparkles size={16} className="text-yellow-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">RPG Skill Tree</div>
                  <div className="text-[10px] text-zinc-400">Mastery & Perks</div>
                </div>
              </button>

              <button
                onClick={() => handleAction(() => setTitanBossArenaOpen(true))}
                className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] flex items-center gap-2.5 text-left transition-colors cursor-pointer"
              >
                <Swords size={16} className="text-rose-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">Boss Arena</div>
                  <div className="text-[10px] text-zinc-400">Habit Raids</div>
                </div>
              </button>

              <button
                onClick={() => handleAction(() => setHardcoreLockdownOpen(true))}
                className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] flex items-center gap-2.5 text-left transition-colors cursor-pointer"
              >
                <Lock size={16} className="text-red-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">Lockdown</div>
                  <div className="text-[10px] text-zinc-400">Deep Discipline</div>
                </div>
              </button>

              <button
                onClick={() => handleAction(() => setAiVisionSentinelOpen(true))}
                className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] flex items-center gap-2.5 text-left transition-colors cursor-pointer"
              >
                <Eye size={16} className="text-teal-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">AI Vision</div>
                  <div className="text-[10px] text-zinc-400">Posture Sentinel</div>
                </div>
              </button>

              <button
                onClick={() => handleAction(() => setP2PDuelOpen(true))}
                className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] flex items-center gap-2.5 text-left transition-colors cursor-pointer"
              >
                <Swords size={16} className="text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">P2P Duel</div>
                  <div className="text-[10px] text-zinc-400">Habit Battles</div>
                </div>
              </button>

              <button
                onClick={() => handleAction(() => setTimeCapsuleOpen(true))}
                className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] flex items-center gap-2.5 text-left transition-colors cursor-pointer"
              >
                <Clock size={16} className="text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">Time Capsule</div>
                  <div className="text-[10px] text-zinc-400">Verifiable Proof</div>
                </div>
              </button>

              <button
                onClick={() => handleAction(() => setCircadianModalOpen(true))}
                className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] flex items-center gap-2.5 text-left transition-colors cursor-pointer"
              >
                <Sun size={16} className="text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">Circadian Forecast</div>
                  <div className="text-[10px] text-zinc-400">Energy Peaks</div>
                </div>
              </button>

              <button
                onClick={() => handleAction(() => setGhostDebriefOpen(true))}
                className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] flex items-center gap-2.5 text-left transition-colors cursor-pointer"
              >
                <Ghost size={16} className="text-purple-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">Ghost Debrief</div>
                  <div className="text-[10px] text-zinc-400">AI Pace Analysis</div>
                </div>
              </button>
            </div>
          </div>

          {/* Quick Actions & Utilities */}
          <div className="pt-2 flex items-center gap-2 border-t border-white/10">
            <button
              onClick={() => handleAction(() => setWellnessModalOpen(true))}
              className="flex-1 py-2.5 px-3 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-semibold text-zinc-300 flex items-center justify-center gap-1.5 hover:bg-white/10"
            >
              <Smile size={14} className="text-pink-400" />
              <span>Log Mood & Energy</span>
            </button>

            <button
              onClick={() => handleNav('guide')}
              className="py-2.5 px-3 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-semibold text-zinc-300 flex items-center justify-center gap-1.5 hover:bg-white/10"
            >
              <Compass size={14} />
              <span>Guide</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
