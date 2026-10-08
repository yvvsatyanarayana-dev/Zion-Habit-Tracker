import { useEffect } from 'react';
import { useHabitStore } from '../store/useHabitStore';

export function useKeyboardShortcuts() {
  const setCommandPaletteOpen = useHabitStore((s) => s.setCommandPaletteOpen);
  const commandPaletteOpen = useHabitStore((s) => s.commandPaletteOpen);
  const habitModalOpen = useHabitStore((s) => s.habitModalOpen);
  const closeHabitModal = useHabitStore((s) => s.closeHabitModal);
  const openHabitModal = useHabitStore((s) => s.openHabitModal);
  const jumpToToday = useHabitStore((s) => s.jumpToToday);
  const setTab = useHabitStore((s) => s.setTab);
  const toggleSidebar = useHabitStore((s) => s.toggleSidebar);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing into an input, textarea or contentEditable
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
        return;
      }

      // Ctrl+1 through Ctrl+7 tab navigation
      if ((e.ctrlKey || e.metaKey) && ['1', '2', '3', '4', '5', '6', '7'].includes(e.key)) {
        e.preventDefault();
        const tabList = ['dashboard', 'habits', 'analytics', 'streaks', 'profile', 'guide', 'settings'] as const;
        const idx = parseInt(e.key, 10) - 1;
        if (tabList[idx]) {
          setTab(tabList[idx]);
        }
        return;
      }

      // Ctrl+B sidebar toggle
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // Escape closes modals
      if (e.key === 'Escape') {
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
          return;
        }
        if (habitModalOpen) {
          closeHabitModal();
          return;
        }
        if (useHabitStore.getState().weeklyReviewOpen) {
          useHabitStore.getState().setWeeklyReviewOpen(false);
          return;
        }
        if (useHabitStore.getState().reflectionModal) {
          useHabitStore.getState().closeReflectionModal();
          return;
        }
      }

      if (isInput) return;

      // Jump to today with 't' or 'T'
      if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        jumpToToday();
        return;
      }

      // Add habit shortcut: 'n' or 'N'
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openHabitModal();
        return;
      }

      // Open Weekly Review shortcut: 'w' or 'W'
      if (e.key.toLowerCase() === 'w') {
        e.preventDefault();
        useHabitStore.getState().setWeeklyReviewOpen(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    commandPaletteOpen,
    habitModalOpen,
    setCommandPaletteOpen,
    closeHabitModal,
    openHabitModal,
    jumpToToday,
    setTab,
    toggleSidebar,
  ]);
}
