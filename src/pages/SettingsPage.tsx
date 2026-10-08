import React, { useState, useRef } from 'react';
import { Header } from '../components/ui/Header';
import { Card } from '../components/ui/Card';
import { ToggleSwitch } from '../components/ui/ToggleSwitch';
import { useHabitStore } from '../store/useHabitStore';
import {
  Download,
  Upload,
  RotateCcw,
  Bell,
  Calendar,
  Sparkles,
  Shield,
  Palette,
  Sun,
  Moon,
  Check,
  Table,
  LayoutGrid,
  FolderOpen,
  Monitor,
} from 'lucide-react';
import type { WeekStartDay, ClockFormat, DensityMode } from '../lib/types';
import { exportCSVHistory, exportCSVMatrix, exportJSONBackup } from '../lib/exportUtils';
import { sound } from '../lib/audio';

export const SettingsPage: React.FC = () => {
  const settings = useHabitStore((s) => s.settings);
  const updateSetting = useHabitStore((s) => s.updateSetting);
  const importData = useHabitStore((s) => s.importData);
  const resetAllData = useHabitStore((s) => s.resetAllData);
  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const allCheckinsList = useHabitStore((s) => s.allCheckinsList);
  const currentDate = useHabitStore((s) => s.currentDate);

  const [notificationStatus, setNotificationStatus] = useState<string>('');
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTheme = settings.theme || 'dark';

  const handleExportJSON = () => {
    exportJSONBackup(habits, checkins, allCheckinsList, settings, currentDate);
  };

  const handleExportCSV = () => {
    exportCSVHistory(habits, checkins, allCheckinsList, settings, currentDate);
  };

  const handleExportMatrix = () => {
    exportCSVMatrix(habits, checkins, allCheckinsList, settings, currentDate);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const success = await importData(content);
        if (success) {
          alert('Data imported successfully!');
        } else {
          alert('Failed to import data. Please ensure it is a valid Habit Tracker JSON backup.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleTestNotification = async () => {
    if (window.api) {
      const sent = await window.api.notify(
        'Habit Tracker Reminder',
        'Time to close your daily activity rings! Keep the momentum going.'
      );
      setNotificationStatus(sent ? 'Desktop notification sent successfully!' : 'Desktop notifications not enabled.');
    } else {
      setNotificationStatus('Desktop notifications require Electron app.');
    }
    setTimeout(() => setNotificationStatus(''), 4000);
  };

  const handleToggleStartup = async (checked: boolean) => {
    await updateSetting('launch_on_startup', checked);
    if (window.api?.os) {
      await window.api.os.setLaunchOnStartup(checked);
    }
    setNotificationStatus(checked ? 'Configured to launch on Windows startup' : 'Removed from Windows startup');
    setTimeout(() => setNotificationStatus(''), 4000);
  };

  const handleToggleTray = async (checked: boolean) => {
    await updateSetting('minimize_to_tray', checked);
    setNotificationStatus(checked ? 'Minimize to System Tray enabled' : 'Minimize to System Tray disabled');
    setTimeout(() => setNotificationStatus(''), 4000);
  };

  const handleOpenDataFolder = async () => {
    if (window.api?.os) {
      await window.api.os.openDataFolder();
      setNotificationStatus('Opened application data directory in Windows Explorer');
    } else {
      setNotificationStatus('Local directory access is available in the desktop application.');
    }
    setTimeout(() => setNotificationStatus(''), 4000);
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto pb-16 space-y-6 animate-in fade-in duration-200">
      <Header title="Settings" />

      {/* SECTION: VISUAL THEME & AESTHETICS (Studio Dark / Crisp Slate Light) */}
      <Card className="space-y-4">
        <div
          style={{ borderColor: 'var(--border-subtle)' }}
          className="flex items-center gap-2 border-b pb-3"
        >
          <Palette size={18} style={{ color: 'var(--accent-primary)' }} />
          <div>
            <h2
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
              className="text-[16px] font-bold"
            >
              Visual Theme & Atmosphere
            </h2>
            <p style={{ color: 'var(--text-secondary)' }} className="text-[12px] font-normal">
              Switch between Minimalist Studio Dark and Crisp Slate Light aesthetic
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Dark Mode Tile */}
          <button
            type="button"
            onClick={() => updateSetting('theme', 'dark')}
            style={{
              backgroundColor: currentTheme === 'dark' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-surface)',
              borderColor: currentTheme === 'dark' ? 'var(--accent-primary)' : 'var(--border-subtle)',
              boxShadow: currentTheme === 'dark' ? '0 0 20px rgba(99, 102, 241, 0.2)' : 'none',
            }}
            className="p-4 rounded-[14px] border text-left transition-all cursor-pointer flex items-start justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div
                  style={{
                    backgroundColor: '#16161a',
                    borderColor: 'rgba(255, 255, 255, 0.12)',
                    color: '#f4f4f6',
                  }}
                  className="w-8 h-8 rounded-[8px] flex items-center justify-center border"
                >
                  <Moon size={16} />
                </div>
                <div>
                  <span
                    style={{ color: 'var(--text-primary)' }}
                    className="text-[14px] font-bold block"
                  >
                    Studio Dark (Default)
                  </span>
                  <span style={{ color: 'var(--text-muted)' }} className="text-[11.5px]">
                    Deep Canvas (#0e0e11) · Raycast/Linear aesthetic
                  </span>
                </div>
              </div>

              {/* Swatch chips */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="w-5 h-5 rounded-full bg-[#0e0e11] border border-white/10" title="Canvas #0e0e11" />
                <span className="w-5 h-5 rounded-full bg-[#16161a] border border-white/10" title="Surface #16161a" />
                <span className="w-5 h-5 rounded-full bg-[#1c1c22] border border-white/10" title="Cards #1c1c22" />
                <span className="w-5 h-5 rounded-full bg-[#6366f1] border border-white/20" title="Accent Violet #6366f1" />
                <span className="w-5 h-5 rounded-full bg-[#10b981]" title="Emerald #10b981" />
              </div>
            </div>

            {currentTheme === 'dark' && (
              <div
                style={{ backgroundColor: 'var(--accent-primary)' }}
                className="w-5 h-5 rounded-full flex items-center justify-center text-white"
              >
                <Check size={12} strokeWidth={3} />
              </div>
            )}
          </button>

          {/* Light Mode Tile */}
          <button
            type="button"
            onClick={() => updateSetting('theme', 'light')}
            style={{
              backgroundColor: currentTheme === 'light' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-surface)',
              borderColor: currentTheme === 'light' ? 'var(--accent-primary)' : 'var(--border-subtle)',
              boxShadow: currentTheme === 'light' ? '0 0 20px rgba(99, 102, 241, 0.15)' : 'none',
            }}
            className="p-4 rounded-[14px] border text-left transition-all cursor-pointer flex items-start justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    color: '#0f172a',
                  }}
                  className="w-8 h-8 rounded-[8px] flex items-center justify-center border"
                >
                  <Sun size={16} />
                </div>
                <div>
                  <span
                    style={{ color: 'var(--text-primary)' }}
                    className="text-[14px] font-bold block"
                  >
                    Crisp Slate Light
                  </span>
                  <span style={{ color: 'var(--text-muted)' }} className="text-[11.5px]">
                    Clean Canvas (#f8fafc) · Crisp daylight workspace
                  </span>
                </div>
              </div>

              {/* Swatch chips */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="w-5 h-5 rounded-full bg-[#f8fafc] border border-slate-300" title="Canvas #f8fafc" />
                <span className="w-5 h-5 rounded-full bg-[#ffffff] border border-slate-300" title="Surface #ffffff" />
                <span className="w-5 h-5 rounded-full bg-[#f1f5f9] border border-slate-300" title="Cards #f1f5f9" />
                <span className="w-5 h-5 rounded-full bg-[#6366f1] border border-slate-300" title="Accent Violet #6366f1" />
                <span className="w-5 h-5 rounded-full bg-[#10b981]" title="Emerald #10b981" />
              </div>
            </div>

            {currentTheme === 'light' && (
              <div
                style={{ backgroundColor: 'var(--accent-primary)' }}
                className="w-5 h-5 rounded-full flex items-center justify-center text-white"
              >
                <Check size={12} strokeWidth={3} />
              </div>
            )}
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION: GENERAL & DISPLAY */}
        <Card className="space-y-6">
          <div
            style={{ borderColor: 'var(--border-subtle)' }}
            className="flex items-center gap-2 border-b pb-3"
          >
            <Calendar size={18} style={{ color: 'var(--accent-primary)' }} />
            <h2
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
              className="text-[16px] font-bold"
            >
              Display & Calendar
            </h2>
          </div>

          {/* Week Start Day */}
          <div className="flex items-center justify-between">
            <div>
              <span style={{ color: 'var(--text-primary)' }} className="text-[14px] font-semibold block">
                Week Start Day
              </span>
              <span style={{ color: 'var(--text-secondary)' }} className="text-[12px]">
                First column day in grids and weekly cards
              </span>
            </div>
            <div className="flex items-center p-0.5 rounded-[5px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              {(['mon', 'sun', 'thu'] as const).map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => updateSetting('week_start_day', day as WeekStartDay)}
                  className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold transition-all cursor-pointer ${
                    settings.week_start_day === day
                      ? 'bg-[var(--bg-surface-elevated)] text-[var(--accent-primary)] shadow-sm font-bold border border-[var(--border-subtle)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {day === 'mon' ? 'Monday' : day === 'sun' ? 'Sunday' : 'Thursday'}
                </button>
              ))}
            </div>
          </div>

          {/* Clock Format */}
          <div className="flex items-center justify-between">
            <div>
              <span style={{ color: 'var(--text-primary)' }} className="text-[14px] font-semibold block">
                Clock Format
              </span>
              <span style={{ color: 'var(--text-secondary)' }} className="text-[12px]">
                Sidebar live time format
              </span>
            </div>
            <div className="flex items-center p-0.5 rounded-[5px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              {(['12h', '24h'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => updateSetting('clock_format', fmt as ClockFormat)}
                  className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold transition-all cursor-pointer ${
                    settings.clock_format === fmt
                      ? 'bg-[var(--bg-surface-elevated)] text-[var(--accent-primary)] shadow-sm font-bold border border-[var(--border-subtle)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {fmt === '12h' ? '12-Hour' : '24-Hour'}
                </button>
              ))}
            </div>
          </div>

          {/* Density */}
          <div className="flex items-center justify-between">
            <div>
              <span style={{ color: 'var(--text-primary)' }} className="text-[14px] font-semibold block">
                Layout Density
              </span>
              <span style={{ color: 'var(--text-secondary)' }} className="text-[12px]">
                Table row height spacing in daily grid
              </span>
            </div>
            <div className="flex items-center p-0.5 rounded-[5px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              {(['comfortable', 'compact'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updateSetting('density', mode as DensityMode)}
                  className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold transition-all cursor-pointer capitalize ${
                    settings.density === mode
                      ? 'bg-[var(--bg-surface-elevated)] text-[var(--accent-primary)] shadow-sm font-bold border border-[var(--border-subtle)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Show Habit Icons */}
          <div className="flex items-center justify-between">
            <div>
              <span style={{ color: 'var(--text-primary)' }} className="text-[14px] font-semibold block">
                Show Habit Icons
              </span>
              <span style={{ color: 'var(--text-secondary)' }} className="text-[12px]">
                Display custom Lucide studio icons next to habit names
              </span>
            </div>
            <ToggleSwitch
              checked={settings.show_emoji}
              onChange={(checked) => updateSetting('show_emoji', checked)}
              ariaLabel="Toggle show habit icons"
            />
          </div>

          {/* Reduce Motion */}
          <div className="flex items-center justify-between">
            <div>
              <span style={{ color: 'var(--text-primary)' }} className="text-[14px] font-semibold block">
                Reduce Motion
              </span>
              <span style={{ color: 'var(--text-secondary)' }} className="text-[12px]">
                Disable spring animations and scale effects
              </span>
            </div>
            <ToggleSwitch
              checked={settings.reduce_motion}
              onChange={(checked) => updateSetting('reduce_motion', checked)}
              ariaLabel="Toggle reduce motion"
            />
          </div>

          {/* Audio Chimes & Sound Effects */}
          <div className="flex items-center justify-between">
            <div>
              <span style={{ color: 'var(--text-primary)' }} className="text-[14px] font-semibold block">
                Audio Delight & Haptic Feedback
              </span>
              <span style={{ color: 'var(--text-secondary)' }} className="text-[12px]">
                Satisfying chime audio on check-ins, steppers, and streak celebrations
              </span>
            </div>
            <ToggleSwitch
              checked={settings.sound_enabled !== false}
              onChange={(checked) => {
                updateSetting('sound_enabled', checked);
                sound.setEnabled(checked);
                if (checked) sound.playCheckin();
              }}
              ariaLabel="Toggle audio effects"
            />
          </div>
        </Card>

        {/* SECTION: TRACKING & STREAKS */}
        <Card className="space-y-6">
          <div
            style={{ borderColor: 'var(--border-subtle)' }}
            className="flex items-center gap-2 border-b pb-3"
          >
            <Sparkles size={18} className="text-[#f59e0b]" />
            <h2
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
              className="text-[16px] font-bold"
            >
              Tracking & Consistency Rules
            </h2>
          </div>

          {/* Streak Threshold */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: 'var(--text-primary)' }} className="text-[14px] font-semibold">
                Streak Day Threshold
              </span>
              <span className="font-num text-[14px] font-bold text-[#f59e0b]">
                {settings.streak_threshold}%
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)' }} className="text-[12px] mb-3">
              Percentage of scheduled habits required to keep your streak burning
            </p>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={settings.streak_threshold}
              onChange={(e) => updateSetting('streak_threshold', Number(e.target.value))}
              className="w-full accent-[#f59e0b] cursor-pointer"
            />
          </div>

          {/* Allow Editing Future Days */}
          <div className="flex items-center justify-between">
            <div>
              <span style={{ color: 'var(--text-primary)' }} className="text-[14px] font-semibold block">
                Allow Future Day Edits
              </span>
              <span style={{ color: 'var(--text-secondary)' }} className="text-[12px]">
                Enable checking boxes for upcoming dates
              </span>
            </div>
            <ToggleSwitch
              checked={settings.allow_future_edits}
              onChange={(checked) => updateSetting('allow_future_edits', checked)}
              ariaLabel="Toggle allow future day edits"
            />
          </div>

        </Card>

        {/* SECTION: OPERATING SYSTEM & DESKTOP INTEGRATION */}
        <Card className="space-y-6 lg:col-span-2">
          <div
            style={{ borderColor: 'var(--border-subtle)' }}
            className="flex items-center gap-2 border-b pb-3"
          >
            <Monitor size={18} style={{ color: 'var(--accent-primary)' }} />
            <div>
              <h2
                style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
                className="text-[16px] font-bold"
              >
                Operating System & Native Desktop Integration
              </h2>
              <p style={{ color: 'var(--text-secondary)' }} className="text-[12px] font-normal">
                Windows startup, background system tray, native OS notifications, and local storage
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Launch on Windows Startup */}
            <div className="flex items-center justify-between p-3.5 rounded-[12px] border" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
              <div className="pr-3">
                <span style={{ color: 'var(--text-primary)' }} className="text-[14px] font-semibold block">
                  Launch on Windows Startup
                </span>
                <span style={{ color: 'var(--text-secondary)' }} className="text-[12px]">
                  Automatically start Habit Tracker in background when signing in
                </span>
              </div>
              <ToggleSwitch
                checked={settings.launch_on_startup}
                onChange={handleToggleStartup}
                ariaLabel="Toggle launch on startup"
              />
            </div>

            {/* Minimize to System Tray */}
            <div className="flex items-center justify-between p-3.5 rounded-[12px] border" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
              <div className="pr-3">
                <span style={{ color: 'var(--text-primary)' }} className="text-[14px] font-semibold block">
                  Minimize to System Tray
                </span>
                <span style={{ color: 'var(--text-secondary)' }} className="text-[12px]">
                  Keep app active in Windows tray when closed so daily reminders fire
                </span>
              </div>
              <ToggleSwitch
                checked={settings.minimize_to_tray}
                onChange={handleToggleTray}
                ariaLabel="Toggle minimize to system tray"
              />
            </div>

            {/* Scheduled Daily Reminder */}
            <div className="flex items-center justify-between p-3.5 rounded-[12px] border" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
              <div className="pr-3">
                <span style={{ color: 'var(--text-primary)' }} className="text-[14px] font-semibold block">
                  Daily Desktop Reminder
                </span>
                <span style={{ color: 'var(--text-secondary)' }} className="text-[12px]">
                  Sends a native OS notification at your chosen hour
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={settings.reminder_time}
                  onChange={(e) => updateSetting('reminder_time', e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  className="text-[13px] font-num font-bold px-2.5 py-1.5 rounded-[10px] outline-none border cursor-pointer"
                />
                <button
                  type="button"
                  onClick={handleTestNotification}
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  className="px-3 py-1.5 rounded-[10px] text-[12px] font-semibold flex items-center gap-1.5 transition-colors border hover:bg-[var(--bg-surface-hover)] cursor-pointer"
                  title="Send test desktop notification"
                >
                  <Bell size={13} style={{ color: 'var(--accent-primary)' }} />
                  <span>Test</span>
                </button>
              </div>
            </div>

            {/* Local Database Location */}
            <div className="flex items-center justify-between p-3.5 rounded-[12px] border" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
              <div className="pr-3">
                <span style={{ color: 'var(--text-primary)' }} className="text-[14px] font-semibold block">
                  Local SQLite Data Location
                </span>
                <span style={{ color: 'var(--text-secondary)' }} className="text-[12px]">
                  Access your offline database files in Windows File Explorer
                </span>
              </div>
              <button
                type="button"
                onClick={handleOpenDataFolder}
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                className="px-3 py-1.5 rounded-[10px] text-[12px] font-semibold flex items-center gap-1.5 transition-colors border hover:bg-[var(--bg-surface-hover)] cursor-pointer whitespace-nowrap"
              >
                <FolderOpen size={13} style={{ color: 'var(--accent-primary)' }} />
                <span>Open Folder</span>
              </button>
            </div>
          </div>

          {notificationStatus && (
            <div className="px-3.5 py-2 rounded-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[12.5px] font-semibold animate-in fade-in duration-150">
              {notificationStatus}
            </div>
          )}
        </Card>

        {/* SECTION: DATA MANAGEMENT & BACKUP */}
        <Card className="space-y-6 lg:col-span-2">
          <div
            style={{ borderColor: 'var(--border-subtle)' }}
            className="flex items-center gap-2 border-b pb-3"
          >
            <Shield size={18} style={{ color: 'var(--accent-primary)' }} />
            <h2
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
              className="text-[16px] font-bold"
            >
              Data Management & Backup
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
            {/* Export JSON */}
            <button
              type="button"
              onClick={handleExportJSON}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
              className="p-4 rounded-[14px] border flex flex-col items-center justify-center text-center gap-2 transition-colors hover:bg-[var(--bg-surface-hover)] cursor-pointer group"
            >
              <Download size={22} style={{ color: 'var(--accent-primary)' }} className="group-hover:scale-110 transition-transform" />
              <span style={{ color: 'var(--text-primary)' }} className="text-[13.5px] font-bold">
                Export Backup (JSON)
              </span>
              <span style={{ color: 'var(--text-secondary)' }} className="text-[11px]">
                Full history and settings
              </span>
            </button>

            {/* Export Activity Ledger CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
              className="p-4 rounded-[14px] border flex flex-col items-center justify-center text-center gap-2 transition-colors hover:bg-[var(--bg-surface-hover)] cursor-pointer group"
            >
              <Table size={22} className="text-emerald-400 group-hover:scale-110 transition-transform" />
              <span style={{ color: 'var(--text-primary)' }} className="text-[13.5px] font-bold">
                Activity Ledger (CSV)
              </span>
              <span style={{ color: 'var(--text-secondary)' }} className="text-[11px]">
                Daily history with streaks & goals
              </span>
            </button>

            {/* Export Habit Matrix CSV */}
            <button
              type="button"
              onClick={handleExportMatrix}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
              className="p-4 rounded-[14px] border flex flex-col items-center justify-center text-center gap-2 transition-colors hover:bg-[var(--bg-surface-hover)] cursor-pointer group"
            >
              <LayoutGrid size={22} className="text-teal-400 group-hover:scale-110 transition-transform" />
              <span style={{ color: 'var(--text-primary)' }} className="text-[13.5px] font-bold">
                Habit Matrix (CSV)
              </span>
              <span style={{ color: 'var(--text-secondary)' }} className="text-[11px]">
                Pivot table with habit columns
              </span>
            </button>

            {/* Import JSON */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
              className="p-4 rounded-[14px] border flex flex-col items-center justify-center text-center gap-2 transition-colors hover:bg-[var(--bg-surface-hover)] cursor-pointer group"
            >
              <Upload size={22} className="text-[#f59e0b] group-hover:scale-110 transition-transform" />
              <span style={{ color: 'var(--text-primary)' }} className="text-[13.5px] font-bold">
                Import Backup
              </span>
              <span style={{ color: 'var(--text-secondary)' }} className="text-[11px]">
                Restore from JSON file
              </span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />

            {/* Reset All Data */}
            <button
              type="button"
              onClick={() => setResetModalOpen(true)}
              style={{
                backgroundColor: 'rgba(244, 63, 94, 0.08)',
                borderColor: 'rgba(244, 63, 94, 0.25)',
              }}
              className="p-4 rounded-[14px] border flex flex-col items-center justify-center text-center gap-2 transition-colors hover:bg-[rgba(244,63,94,0.16)] cursor-pointer group"
            >
              <RotateCcw size={22} style={{ color: 'var(--status-danger)' }} className="group-hover:rotate-180 transition-transform duration-300" />
              <span style={{ color: 'var(--status-danger)' }} className="text-[13.5px] font-bold">
                Reset All Data
              </span>
              <span style={{ color: 'var(--text-secondary)' }} className="text-[11px]">
                Permanently clear database
              </span>
            </button>
          </div>
        </Card>
      </div>

      {/* Reset Confirmation Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-[8px] animate-in fade-in duration-200">
          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--shadow-dropdown)',
            }}
            className="border max-w-md w-full rounded-[20px] p-6 text-center"
          >
            <div
              style={{
                backgroundColor: 'rgba(244, 63, 94, 0.12)',
                color: 'var(--status-danger)',
              }}
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <RotateCcw size={24} />
            </div>
            <h3
              style={{ color: 'var(--text-primary)' }}
              className="text-[19px] font-bold"
            >
              Reset All Habit Data?
            </h3>
            <p style={{ color: 'var(--text-secondary)' }} className="text-[13px] mt-2 mb-6">
              This action will erase all habits, daily check-ins, streaks, and custom settings. This cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                className="px-5 py-2.5 rounded-[10px] border text-[13px] font-semibold transition-colors hover:bg-[var(--bg-surface-hover)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await resetAllData();
                  setResetModalOpen(false);
                }}
                style={{
                  backgroundColor: 'var(--status-danger)',
                }}
                className="px-5 py-2.5 rounded-[10px] text-white text-[13px] font-bold transition-all hover:brightness-110 cursor-pointer"
              >
                Yes, Erase Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
