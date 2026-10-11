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
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import appLogo from '../../assets/icon.png';
import type { TabType } from '../../lib/types';

interface NavTab {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

const mobileTabs: NavTab[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'habits', label: 'Habits', icon: CheckSquare },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'streaks', label: 'Streaks', icon: Flame },
  { id: 'profile', label: 'Profile', icon: UserRound },
];

export const MobileHeader: React.FC = () => {
  const activeTab = useHabitStore((state) => state.activeTab);
  const setTab = useHabitStore((state) => state.setTab);
  const openHabitModal = useHabitStore((state) => state.openHabitModal);
  const setCommandPaletteOpen = useHabitStore((state) => state.setCommandPaletteOpen);
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
      case 'analytics':
        return 'Analytics';
      case 'streaks':
        return 'Achievements';
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

        {/* Right: Actions - HIDDEN on login and user creation pages */}
        {!isAuthPage && (
          <div className="mobile-header-right">
            <button
              type="button"
              className="mobile-header-icon-btn"
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="Search"
              title="Search (Ctrl+K)"
            >
              <Search size={17} strokeWidth={1.8} />
            </button>

            <button
              type="button"
              className={`mobile-header-icon-btn${activeTab === 'settings' ? ' is-active' : ''}`}
              onClick={() => setTab('settings')}
              aria-label="Settings"
              title="Settings"
            >
              <Settings size={17} strokeWidth={1.8} />
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
          </div>
        )}
      </div>
    </header>
  );
};

export const MobileNavigation: React.FC = () => {
  const activeTab = useHabitStore((state) => state.activeTab);
  const setTab = useHabitStore((state) => state.setTab);

  return (
    <nav className="mobile-navigation" aria-label="Bottom Navigation">
      {mobileTabs.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            className={`mobile-nav-item${isActive ? ' is-active' : ''}`}
            onClick={() => setTab(id)}
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
  );
};
