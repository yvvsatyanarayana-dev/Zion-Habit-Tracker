import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import {
  BookOpen,
  Search,
  CheckCircle2,
  Flame,
  Target,
  Trophy,
  Zap,
  Calendar,
  Layers,
  Settings,
  Shield,
  Download,
  Keyboard,
  Clock,
  Sparkles,
  HelpCircle,
  ChevronDown,
  User,
  Sliders,
  Activity,
  Award,
  X,
} from 'lucide-react';


export const InstructionsPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Keyboard Shortcuts reference table
  const shortcutsList = [
    { key: 'Ctrl + K', label: 'Open Command Palette & Omnibar search', category: 'Global' },
    { key: 'N', label: 'Create New Habit dialog', category: 'Actions' },
    { key: 'T', label: 'Jump to Today’s date', category: 'Navigation' },
    { key: 'W', label: 'Open Weekly Review & Consistency Grade', category: 'Review' },
    { key: 'Ctrl + 1', label: 'Go to Dashboard', category: 'Navigation' },
    { key: 'Ctrl + 2', label: 'Go to Daily Habits Matrix', category: 'Navigation' },
    { key: 'Ctrl + 3', label: 'Go to Analytics & Trends', category: 'Navigation' },
    { key: 'Ctrl + 4', label: 'Go to Streaks & Medals', category: 'Navigation' },
    { key: 'Ctrl + 5', label: 'Go to User Profile', category: 'Navigation' },
    { key: 'Ctrl + 6', label: 'Go to User Guide (this page)', category: 'Navigation' },
    { key: 'Ctrl + 7', label: 'Open Settings', category: 'Navigation' },
    { key: 'Ctrl + B', label: 'Collapse / Expand Sidebar', category: 'View' },
    { key: 'Esc', label: 'Close open modal, dropdown or palette', category: 'Global' },
  ];

  // FAQ Accordion Data
  const faqs = [
    {
      q: 'Where is all my habit and check-in data stored?',
      a: '100% offline on your device. Zion uses a local SQLite database with zero cloud telemetry, ensuring complete privacy and fast performance. Your personal data never leaves your computer.',
    },
    {
      q: 'Can I set habits that only run on specific days (like Mon/Wed/Fri)?',
      a: 'Yes. In the habit creation dialog, you can toggle individual weekdays (Mon, Tue, Wed, Thu, Fri, Sat, Sun). Habits only trigger check-in requirements on their designated schedule days and will never penalize your streak on rest days.',
    },
    {
      q: 'How does the streak calculation work?',
      a: 'A day counts toward your streak if your completion percentage meets or exceeds your Streak Threshold (default 50%, customizable in Settings). If you have 4 habits scheduled and complete 2, your streak keeps burning.',
    },
    {
      q: 'How do I backup or move my data to another computer?',
      a: 'Go to Settings or click Export in the top TitleBar. Download a full JSON backup. On your new device, you can import this JSON backup with one click to restore all habits and check-in history.',
    },
    {
      q: 'How do I toggle between Dark and Light mode?',
      a: 'Click the Sun/Moon toggle icon in the top right of the TitleBar, or press Ctrl+K and type "theme". Zion supports sleek Obsidian Black and crisp Studio White themes.',
    },
    {
      q: 'Can multiple people use Zion on the same computer?',
      a: 'Yes. Zion includes multi-profile support. Go to User Profile to create another profile or switch between profiles with separate passwords and habit trackers.',
    },
  ];

  const toggleFaq = (idx: number) => {
    setExpandedFaq(expandedFaq === idx ? null : idx);
  };

  return (
    <div className="w-full max-w-[1300px] mx-auto pb-16 space-y-6 animate-in fade-in duration-200 select-none">
      {/* ── CLEAN READING HEADER (NO HABIT / DATE CONTROLS) ── */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[6px] bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)]">
            <BookOpen size={16} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              User Guide & Documentation
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Complete reference manual and instruction guide for Zion
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-[4px] text-[10.5px] font-semibold bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
            Reference Manual
          </span>
        </div>
      </div>

      {/* ── HERO BANNER: PURE READING OVERVIEW ── */}
      <Card className="!p-6 sm:!p-7 relative overflow-hidden border">
        {/* Subtle Ambient Glow Backdrop */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-60 h-60 rounded-full bg-gradient-to-tr from-emerald-500/10 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[5px] text-[11px] font-bold bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
            <span>Zion Knowledge Base</span>
            <span className="text-[var(--text-dim)]">·</span>
            <span className="text-[var(--text-secondary)]">Official Manual</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            How to Use Zion
          </h2>

          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            Zion is an open-source habit engineering application designed for compound daily consistency,
            activity rings, streak momentum, and 100% offline local privacy. Read through the topics below to understand every feature and workflow.
          </p>
        </div>

        {/* Dedicated Modern Search & Navigation Section */}
        <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] space-y-3">
          {/* Top Row: Search Bar + 2 Square Boxes with 10px Radius (All Guides & Quick Start) */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Prominent Search Bar */}
            <div className="relative flex-1 min-w-[280px]">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guides, features, shortcuts, streaks, or FAQs..."
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: searchQuery ? 'var(--border-medium)' : 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                className="w-full h-9.5 pl-10 pr-20 rounded-[10px] border text-xs sm:text-[13px] outline-none focus:border-[var(--border-strong)] focus:ring-1 focus:ring-white/10 transition-all placeholder-[var(--text-muted)] shadow-sm"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[11px] bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X size={11} />
                  <span>Clear</span>
                </button>
              ) : (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-mono text-[var(--text-dim)] border border-[var(--border-subtle)] px-1.5 py-0.5 rounded-[6px] bg-[var(--bg-surface-elevated)] pointer-events-none">
                  <span>Filter</span>
                </div>
              )}
            </div>

            {/* Two Primary Guide Boxes beside Search: All Guides & Quick Start (10px Radius) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                style={{
                  backgroundColor:
                    activeCategory === 'all' ? 'var(--btn-primary-bg)' : 'var(--bg-surface)',
                  color:
                    activeCategory === 'all' ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                  borderColor:
                    activeCategory === 'all' ? 'transparent' : 'var(--border-subtle)',
                }}
                className={`h-9.5 px-3.5 rounded-[10px] text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:text-[var(--text-primary)] hover:border-[var(--border-medium)] active:scale-[0.98] ${
                  activeCategory === 'all' ? 'font-bold' : ''
                }`}
              >
                <BookOpen size={13} strokeWidth={2.2} />
                <span>All Guides</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('start')}
                style={{
                  backgroundColor:
                    activeCategory === 'start' ? 'var(--btn-primary-bg)' : 'var(--bg-surface)',
                  color:
                    activeCategory === 'start' ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                  borderColor:
                    activeCategory === 'start' ? 'transparent' : 'var(--border-subtle)',
                }}
                className={`h-9.5 px-3.5 rounded-[10px] text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:text-[var(--text-primary)] hover:border-[var(--border-medium)] active:scale-[0.98] ${
                  activeCategory === 'start' ? 'font-bold' : ''
                }`}
              >
                <Zap size={13} strokeWidth={2.4} />
                <span>Quick Start</span>
              </button>
            </div>
          </div>

          {/* Row 2: Topic Category Boxes with 10px Radius */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-0.5">
            {[
              { id: 'habits', label: 'Habits & Routine', icon: Layers },
              { id: 'rings', label: 'Activity Rings', icon: Target },
              { id: 'analytics', label: 'Streaks & Medals', icon: Trophy },
              { id: 'tools', label: 'Focus & Tools', icon: Sliders },
              { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
              { id: 'faq', label: 'FAQ & Privacy', icon: HelpCircle },
            ].map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    backgroundColor: isActive ? 'var(--btn-primary-bg)' : 'var(--bg-surface)',
                    color: isActive ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                    borderColor: isActive ? 'transparent' : 'var(--border-subtle)',
                  }}
                  className={`h-8.5 px-3 rounded-[10px] text-[11.5px] font-semibold border flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-xs hover:text-[var(--text-primary)] hover:border-[var(--border-medium)] active:scale-[0.98] ${
                    isActive ? 'font-bold shadow-sm' : ''
                  }`}
                >
                  <Icon size={12} strokeWidth={2} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── SECTION 1: 3-MINUTE QUICK START ── */}
      {(activeCategory === 'all' || activeCategory === 'start') && (
        <Card className="!p-6 space-y-5 border">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Zap size={15} />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Quick Start Walkthrough
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Get up and running with your daily consistency routine in 4 simple steps
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase tracking-wider">
              Overview
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 1 */}
            <div
              style={{ backgroundColor: 'var(--bg-surface)' }}
              className="p-4 rounded-[8px] border border-[var(--border-subtle)] space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-bold font-num text-[var(--text-primary)]">
                  1
                </span>
                <User size={15} className="text-indigo-400" />
              </div>
              <h3 className="text-xs font-bold text-[var(--text-primary)]">Set Your Identity</h3>
              <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                In <strong>User Profile</strong> (<kbd className="font-mono text-[10px] px-1 rounded bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">Ctrl+5</kbd>), configure your name, avatar accent color, and daily focus motto to personalize your workspace.
              </p>
            </div>

            {/* Step 2 */}
            <div
              style={{ backgroundColor: 'var(--bg-surface)' }}
              className="p-4 rounded-[8px] border border-[var(--border-subtle)] space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-bold font-num text-[var(--text-primary)]">
                  2
                </span>
                <CheckCircle2 size={15} className="text-emerald-400" />
              </div>
              <h3 className="text-xs font-bold text-[var(--text-primary)]">Create Habits</h3>
              <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                Press <kbd className="font-mono text-[10px] px-1 rounded bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">N</kbd> or click <strong>+ Add Habit</strong>. Give it a name, pick an icon or emoji, select target schedule days, and set a monthly commitment goal.
              </p>
            </div>

            {/* Step 3 */}
            <div
              style={{ backgroundColor: 'var(--bg-surface)' }}
              className="p-4 rounded-[8px] border border-[var(--border-subtle)] space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-bold font-num text-[var(--text-primary)]">
                  3
                </span>
                <Calendar size={15} className="text-amber-400" />
              </div>
              <h3 className="text-xs font-bold text-[var(--text-primary)]">Daily Check-ins</h3>
              <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                On the <strong>Dashboard</strong> or <strong>Daily Habits</strong> grid, click the circle checkmark to complete your habit. Add optional reflection notes to record weights, pages read, or thoughts.
              </p>
            </div>

            {/* Step 4 */}
            <div
              style={{ backgroundColor: 'var(--bg-surface)' }}
              className="p-4 rounded-[8px] border border-[var(--border-subtle)] space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-bold font-num text-[var(--text-primary)]">
                  4
                </span>
                <Trophy size={15} className="text-rose-400" />
              </div>
              <h3 className="text-xs font-bold text-[var(--text-primary)]">Ignite Streaks</h3>
              <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                Close your 3 Activity Rings each day to build consecutive streaks. Unlock Bronze, Silver, Gold, Platinum and Diamond medals in the <strong>Streaks & Medals</strong> tab.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── SECTION 2: HABIT CREATION & MANAGEMENT ── */}
      {(activeCategory === 'all' || activeCategory === 'habits') && (
        <Card className="!p-6 space-y-5 border">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Layers size={15} />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Habits & Routine Architecture
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  How to create, customize, schedule, and reorder routines
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Feature 1: Flexible Day Picker */}
            <div
              style={{ backgroundColor: 'var(--bg-surface)' }}
              className="p-4 rounded-[8px] border border-[var(--border-subtle)] space-y-2.5"
            >
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-indigo-400" />
                <h3 className="text-xs font-bold text-[var(--text-primary)]">Flexible Day Picker</h3>
              </div>
              <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                Not all habits are daily. Select target weekdays (e.g. Gym on Mon/Wed/Fri, Meal Prep on Sundays).
                Zion dynamically schedules days and will never penalize your streak on scheduled rest days.
              </p>
              <div className="p-2 rounded-[5px] bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[10.5px] text-[var(--text-muted)] flex items-center gap-1.5">
                <Sparkles size={11} className="text-amber-400 flex-shrink-0" />
                <span>Tip: Use custom days for balanced work and recovery cycles.</span>
              </div>
            </div>

            {/* Feature 2: Visual Icons & Curated Palettes */}
            <div
              style={{ backgroundColor: 'var(--bg-surface)' }}
              className="p-4 rounded-[8px] border border-[var(--border-subtle)] space-y-2.5"
            >
              <div className="flex items-center gap-2">
                <Sliders size={15} className="text-emerald-400" />
                <h3 className="text-xs font-bold text-[var(--text-primary)]">Visual Color Coding</h3>
              </div>
              <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                Assign studio colors (Violet, Emerald, Amber, Rose, Cyan) or custom emojis to distinct routines.
                Categorizing your habits visually makes your daily progress ring and monthly matrix instantly readable.
              </p>
              <div className="p-2 rounded-[5px] bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[10.5px] text-[var(--text-muted)] flex items-center gap-1.5">
                <Sparkles size={11} className="text-emerald-400 flex-shrink-0" />
                <span>Tip: Group fitness in Rose and deep work in Indigo.</span>
              </div>
            </div>

            {/* Feature 3: Editing, Archiving & Instant Presets */}
            <div
              style={{ backgroundColor: 'var(--bg-surface)' }}
              className="p-4 rounded-[8px] border border-[var(--border-subtle)] space-y-2.5"
            >
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-cyan-400" />
                <h3 className="text-xs font-bold text-[var(--text-primary)]">1-Click Quick Presets</h3>
              </div>
              <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                At the bottom of the Daily Habits page, tap 1-click preset chips like <em>Hydration (2L)</em>, <em>Reading (20m)</em>, or <em>Workout</em> to instantly add pre-calibrated habits without typing.
              </p>
              <div className="p-2 rounded-[5px] bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[10.5px] text-[var(--text-muted)] flex items-center gap-1.5">
                <Sparkles size={11} className="text-cyan-400 flex-shrink-0" />
                <span>Tip: Click any habit row in the table to edit it anytime.</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── SECTION 3: THE 3 ACTIVITY RINGS EXPLAINED ── */}
      {(activeCategory === 'all' || activeCategory === 'rings') && (
        <Card className="!p-6 space-y-5 border">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <Target size={15} />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  The 3 Concentric Activity Rings
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Premium concentric activity rings for multi-dimensional progress tracking
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Outer Ring */}
            <div
              style={{ backgroundColor: 'var(--bg-surface)' }}
              className="p-4 rounded-[8px] border border-[var(--border-subtle)] space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Outer Ring</span>
                </span>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">Today’s Target</span>
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Daily Scheduled Progress</h3>
              <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                Calculates the percentage of habits scheduled for today that you have completed.
                When you finish all scheduled habits, the outer ring closes 100% and triggers celebration fireworks.
              </p>
            </div>

            {/* Middle Ring */}
            <div
              style={{ backgroundColor: 'var(--bg-surface)' }}
              className="p-4 rounded-[8px] border border-[var(--border-subtle)] space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span>Middle Ring</span>
                </span>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">Monthly Target</span>
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Month Consistency Goal</h3>
              <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                Measures total completed check-ins this calendar month against your monthly targets.
                Keeps your long-term consistency grounded and protects you from losing vision after a single off-day.
              </p>
            </div>

            {/* Inner Ring */}
            <div
              style={{ backgroundColor: 'var(--bg-surface)' }}
              className="p-4 rounded-[8px] border border-[var(--border-subtle)] space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span>Inner Ring</span>
                </span>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">Streak Power</span>
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Active Streak Health</h3>
              <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                Measures your current burning streak velocity. As your unbroken chain of daily discipline
                extends across days and weeks, the inner ring closes and fuels your streak multiplier.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── SECTION 4: PRODUCTIVITY TOOLS & POMODORO ── */}
      {(activeCategory === 'all' || activeCategory === 'tools') && (
        <Card className="!p-6 space-y-5 border">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Clock size={15} />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Superpower Tools & Utilities
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Integrated Pomodoro timer, command palette, and desktop integration
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tool 1: Focus Timer */}
            <div
              style={{ backgroundColor: 'var(--bg-surface)' }}
              className="p-4 rounded-[8px] border border-[var(--border-subtle)] space-y-2.5"
            >
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-amber-400" />
                <h3 className="text-xs font-bold text-[var(--text-primary)]">Pomodoro Focus Timer</h3>
              </div>
              <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                Located on the <strong>Dashboard</strong>. Run 25-minute deep work intervals with sound chimes and pause controls to focus on execution without task switching.
              </p>
            </div>

            {/* Tool 2: Omnibar & Command Palette */}
            <div
              style={{ backgroundColor: 'var(--bg-surface)' }}
              className="p-4 rounded-[8px] border border-[var(--border-subtle)] space-y-2.5"
            >
              <div className="flex items-center gap-2">
                <Search size={15} className="text-cyan-400" />
                <h3 className="text-xs font-bold text-[var(--text-primary)]">Command Palette (Ctrl+K)</h3>
              </div>
              <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                Press <kbd className="font-mono text-[10px] px-1 rounded bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">Ctrl+K</kbd> anywhere in Zion to quickly jump to any tab, search your habits, create new routines, or trigger app actions at lightning speed.
              </p>
            </div>

            {/* Tool 3: 4 Formats of Data Export */}
            <div
              style={{ backgroundColor: 'var(--bg-surface)' }}
              className="p-4 rounded-[8px] border border-[var(--border-subtle)] space-y-2.5"
            >
              <div className="flex items-center gap-2">
                <Download size={15} className="text-emerald-400" />
                <h3 className="text-xs font-bold text-[var(--text-primary)]">Data Export & Ledger</h3>
              </div>
              <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                Click <strong>Export</strong> in the top title bar to generate <em>JSON Backups</em>, <em>CSV Activity Ledgers</em>, <em>Habit Spreadsheets</em>, or formatted <em>Markdown Activity Reports</em>.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── SECTION 5: KEYBOARD SHORTCUTS CHEAT SHEET ── */}
      {(activeCategory === 'all' || activeCategory === 'shortcuts') && (
        <Card className="!p-6 space-y-5 border">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Keyboard size={15} />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Keyboard Shortcuts Cheatsheet
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Navigate Zion entirely with high-speed keyboard hotkeys
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
              12 Global Shortcuts
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shortcutsList.map((sc, i) => (
              <div
                key={i}
                style={{ backgroundColor: 'var(--bg-surface)' }}
                className="p-3 rounded-[6px] border border-[var(--border-subtle)] flex items-center justify-between gap-3 hover:border-[var(--border-medium)] transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[var(--text-primary)] truncate">{sc.label}</div>
                  <span className="text-[10px] text-[var(--text-dim)] uppercase font-semibold tracking-wider">
                    {sc.category}
                  </span>
                </div>
                <kbd
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-subtle)',
                  }}
                  className="px-2 py-1 rounded-[4px] border font-mono text-[11px] font-bold text-[var(--text-primary)] shadow-sm whitespace-nowrap"
                >
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── SECTION 6: FAQ ACCORDIONS & PRIVACY ── */}
      {(activeCategory === 'all' || activeCategory === 'faq') && (
        <Card className="!p-6 space-y-5 border">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <HelpCircle size={15} />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Frequently Asked Questions & Local Privacy
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Everything you need to know about Zion’s offline architecture and mechanics
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {faqs.map((faq, idx) => {
              const isExpanded = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  style={{ backgroundColor: 'var(--bg-surface)' }}
                  className="rounded-[6px] border border-[var(--border-subtle)] overflow-hidden transition-colors hover:border-[var(--border-medium)]"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-3.5 text-left flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
                      <span>{faq.q}</span>
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-[var(--text-muted)] transition-transform duration-200 flex-shrink-0 ${
                        isExpanded ? 'rotate-180 text-[var(--text-primary)]' : ''
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 pt-1 text-[11.5px] text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-subtle)] animate-in fade-in duration-150">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── FOOTER REFERENCE ── */}
      <div className="text-center pt-2">
        <p className="text-xs text-[var(--text-muted)]">
          Zion Studio Manual · Press{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-secondary)]">
            Ctrl+6
          </kbd>{' '}
          to return to this guide anytime.
        </p>
      </div>
    </div>
  );
};
