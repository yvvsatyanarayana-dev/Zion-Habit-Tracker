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

      // Ctrl+1 through Ctrl+8 tab navigation
      if ((e.ctrlKey || e.metaKey) && ['1', '2', '3', '4', '5', '6', '7', '8'].includes(e.key)) {
        e.preventDefault();
        const tabList = ['dashboard', 'habits', 'timetable', 'analytics', 'streaks', 'profile', 'guide', 'settings'] as const;
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
        if (useHabitStore.getState().timetableImportModalOpen) {
          useHabitStore.getState().setTimetableImportModalOpen(false);
          return;
        }
        if (useHabitStore.getState().timetableBlockModalOpen) {
          useHabitStore.getState().setTimetableBlockModalOpen(false);
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
        if (useHabitStore.getState().ghostDebriefOpen) {
          useHabitStore.getState().setGhostDebriefOpen(false);
          return;
        }
        if (useHabitStore.getState().hardcoreLockdownModalOpen) {
          useHabitStore.getState().setHardcoreLockdownModalOpen(false);
          return;
        }
        if (useHabitStore.getState().titanBossArenaModalOpen) {
          useHabitStore.getState().setTitanBossArenaModalOpen(false);
          return;
        }
        if (useHabitStore.getState().aiVisionSentinelModalOpen) {
          useHabitStore.getState().setAiVisionSentinelModalOpen(false);
          return;
        }
      }

      // Ctrl+Shift+G: Run The Ghost Protocol Debrief
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        useHabitStore.getState().setGhostDebriefOpen(true);
        return;
      }

      // Ctrl+Shift+L: Hardcore Dopamine Vault Lockdown
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        useHabitStore.getState().setHardcoreLockdownModalOpen(true);
        return;
      }

      // Ctrl+Shift+B: Titan Boss Arena
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        useHabitStore.getState().setTitanBossArenaModalOpen(true);
        return;
      }

      // Ctrl+Shift+V: Local AI Vision Sentinel
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        useHabitStore.getState().setAiVisionSentinelModalOpen(true);
        return;
      }

      // Ctrl+Shift+P: Jump to Executive Protocols Deck on Dashboard
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        useHabitStore.getState().setTab('dashboard');
        setTimeout(() => {
          const el = document.getElementById('protocols-deck');
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
        return;
      }

      // Ctrl+Shift+C: Neural Circadian Forecast & Burnout Predictor
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        useHabitStore.getState().setCircadianModalOpen(true);
        return;
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
