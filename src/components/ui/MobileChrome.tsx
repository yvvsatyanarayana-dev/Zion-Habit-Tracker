import React from 'react';
import {
  BarChart3,
  CheckSquare,
  LayoutDashboard,
  Moon,
  Sun,
  Flame,
  MoreHorizontal,
  Settings,
  UserRound,
  BookOpen,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import appLogo from '../../assets/icon.png';
import type { TabType } from '../../lib/types';

const mobileTabs: { id: TabType; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'habits', label: 'Habits', icon: CheckSquare },
  { id: 'analytics', label: 'Insights', icon: BarChart3 },
  { id: 'streaks', label: 'Streaks', icon: Flame },
];

export const MobileHeader: React.FC = () => {
  const theme = useHabitStore((state) => state.settings.theme || 'dark');
  const toggleTheme = useHabitStore((state) => state.toggleTheme);

  return (
    <header className="mobile-header">
      <div className="mobile-brand">
        <img src={appLogo} alt="" />
        <span>Zion</span>
      </div>
      <div className="mobile-header-actions">
        <button
          type="button"
          className="mobile-icon-button"
          onClick={() => toggleTheme()}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
        </button>
      </div>
    </header>
  );
};

export const MobileNavigation: React.FC = () => {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const activeTab = useHabitStore((state) => state.activeTab);
  const setTab = useHabitStore((state) => state.setTab);

  return (
    <>
      {moreOpen && (
        <div className="mobile-more-menu">
          {[
            { id: 'profile' as const, label: 'User Profile', icon: UserRound },
            { id: 'guide' as const, label: 'User Guide', icon: BookOpen },
            { id: 'settings' as const, label: 'Settings', icon: Settings },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className="mobile-more-item"
              onClick={() => {
                setTab(id);
                setMoreOpen(false);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
      <nav className="mobile-navigation" aria-label="Main Navigation">
        {mobileTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`mobile-navigation-item${activeTab === id ? ' active' : ''}`}
            onClick={() => {
              setTab(id);
              setMoreOpen(false);
            }}
            aria-current={activeTab === id ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={activeTab === id ? 2.4 : 1.8} />
            <span>{label}</span>
          </button>
        ))}
        <button
          type="button"
          className={`mobile-navigation-item${moreOpen || ['profile', 'guide', 'settings'].includes(activeTab) ? ' active' : ''}`}
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
        >
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </nav>
    </>
  );
};
