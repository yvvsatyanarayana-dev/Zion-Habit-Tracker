# Zion Habit Tracker

<div align="center">

<img src="src/assets/logo.png" alt="Zion Logo" width="96" height="96" />

### The Studio-Grade, Offline-First Personal Habit Engineering System

*Crafted for student developers, software engineers, and ambitious creators who demand peak productivity without compromise.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Android-black?style=for-the-badge&logo=electron)](https://github.com)
[![100% Free Lifetime](https://img.shields.io/badge/Cost-100%25%20Free%20Lifetime-10b981?style=for-the-badge)](https://github.com)
[![Offline First](https://img.shields.io/badge/Privacy-100%25%20Offline%20SQLite-6366f1?style=for-the-badge)](https://github.com)
[![React 19](https://img.shields.io/badge/React-19.3.0-61dafb?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)

<br /><br />

<p align="center">
  <img src="assets/scrn1.png" alt="Zion Habit Tracker Live Dashboard" width="95%" style="border-radius: 12px; box-shadow: 0 16px 40px rgba(0,0,0,0.6);" />
</p>

</div>

---

## Overview & Mission

**Zion** is a production-grade desktop application engineered for compound daily consistency, habit engineering, and distraction-free self-improvement. 

Most modern habit trackers trap your data behind monthly subscriptions, force cloud synchronizations, or clutter your workflow with social feeds and ads. **Zion is fundamentally different**:
- **100% Open-Source & Lifetime Free**: Built with passion for student developers, engineers, and self-starters who want to build unbreakable habits without paying a dime.
- **100% Offline & Private**: Powered by local SQLite. Your habits, goals, reflections, and check-in history never leave your machine. Zero cloud telemetry.
- **Studio Design Aesthetics**: Obsidian black and clean studio white themes, fluid micro-interactions, responsive concentric activity rings, and spreadsheet-grade keyboard controls.

---

## 📸 Visual Walkthrough & Screenshots

### 1. Interactive Dashboard & Concentric Activity Rings
Monitor daily execution across multi-dimensional activity rings, 7-day consistency momentum, monthly target pace, and visual heat circles.

<p align="center">
  <img src="assets/scrn1.png" alt="Interactive Dashboard & Activity Rings" width="95%" style="border-radius: 10px;" />
</p>

---

### 2. Master Habits Grid (Sheets-Precision)
Switch between **7-Day Weekly Focus** and **Month Matrix**. Features pinned sticky columns, custom goal steppers, 1-click check-ins, drag-and-drop reordering, and zero-arrow internal scrolling.

<p align="center">
  <img src="assets/scrn2.png" alt="Daily Habits Grid Matrix" width="95%" style="border-radius: 10px;" />
</p>

---

### 3. Deep Analytics & 365-Day Consistency Heatmap
Inspect your full-year consistency heatmap, 14-day momentum trajectory sparklines, weekday performance distribution, and launch in-depth Weekly Reviews with letter grades (A+ to F).

<p align="center">
  <img src="assets/scrn3.png" alt="Deep Analytics & 365-Day Heatmap" width="95%" style="border-radius: 10px;" />
</p>

---

### 4. Streaks & Achievement Medals Ledger
Gamify your habit consistency with intelligent streak calculations and collectible milestone badges (7-Day Ignition, 30-Day Builder, 100-Day Master, 365-Day Legend, Perfect Week, and Perfect Month).

<p align="center">
  <img src="assets/scrn4.png" alt="Streaks & Achievement Medals" width="95%" style="border-radius: 10px;" />
</p>

---

### 5. User Profile, Mastery Progression & Multi-Profile Security
Track your overall Habit Consistency XP, inspect all-time best streaks, manage security settings, and seamlessly switch between multiple profiles on the same device.

<p align="center">
  <img src="assets/scrn5.png" alt="User Profile and Multi-Profile System" width="95%" style="border-radius: 10px;" />
</p>

---

## Core Features Breakdown

### 🎯 1. Concentric Activity Rings
- Three dynamic SVG concentric progress rings rendered with real-time gradient precision:
  - **Outer Coral Ring (`#FA114F`)**: Today's Scheduled Execution (habits completed vs. scheduled today).
  - **Middle Lime Ring (`#A6FF00`)**: Weekly Momentum (7-day compound completion rate).
  - **Inner Cyan Ring (`#00D9FF`)**: Monthly Target Progress (cumulative monthly goals achievement).
- Interactive hover tooltips displaying exact percentages and progress metrics.
- Fluid celebration animations and confetti bursts upon hitting 100% ring closure.

### 📊 2. Master Habits Grid (Sheets-Precision)
- **Dual View Engine**: Switch seamlessly between **7-Day Weekly Focus** and the **Full Month Matrix**.
- **Sticky Column Architecture**: Habit names, targets, and streaks stay pinned on the left while days scroll horizontally.
- **Clean Internal Scrolling**: Table rows scroll smoothly inside the habit card with pinned headers and footers, keeping the main window firmly anchored.
- **Custom Goal Stepper**: Studio-themed inline target adjusters (`+`/`-`) with no ugly default browser inputs.
- **Drag-and-Drop Reordering**: Intuitive handle grips to organize habits in your preferred order of execution.
- **Optimistic UI Engine**: Sub-50ms instant checkbox updates with background database reconciliation.

### ⚡ 3. Daily Routine Sidecar
- Always-accessible sidebar routine widget showcasing your active daily checklist.
- Visual micro-progress bar and real-time counter (`X of Y done`) pinned directly in the application titlebar beside the Zion name.
- One-click check-ins without leaving whichever tab or analytics view you are currently browsing.

### 📈 4. Deep Analytics & 365-Day Heatmap
- **Annual Consistency Heatmap**: 52-week activity grid visualizing your daily habit intensity across all 365 days of the year.
- **14-Day Momentum Trajectory**: Custom SVG sparkline trend graphs tracking individual habit momentum over the last two weeks.
- **Weekday Performance Distribution**: Granular breakdown of which days of the week you perform best (Monday through Sunday).
- **Diagnostics & Rankings**: Automatic discovery of your top-performing habits alongside habits requiring immediate attention.
- **Month-over-Month Comparison**: Percentage growth trajectory compared directly against the previous month.

### 🔥 5. Streaks & Milestone Medals
- **Intelligent Streak Engine**: Streaks calculate against your customizable daily threshold (default 50%), ensuring rest days don't unfairly penalize your momentum.
- **Milestone Medals**: Unlockable achievement badges with progress percentages:
  - **7-Day Ignition**: Ignite your initial habit momentum.
  - **30-Day Builder**: Solidify neural habit pathways over a full month.
  - **100-Day Master**: Triple-digit consistency mastery.
  - **365-Day Legend**: An entire year of unbroken discipline.
  - **Perfect Week & Perfect Month**: 100% completion across all scheduled commitments.
- **Audio Feedback**: Subtle, studio-quality completion chimes and milestone fanfare.

### ⌘ 6. Command Palette & Omnibar (`Ctrl + K`)
- High-velocity keyboard workflow inspired by modern IDEs.
- Instant search across all habits, system actions, view toggling, and documentation.
- Quick navigation shortcuts to hop between Dashboard, Habits Matrix, Analytics, Streaks, Profile, and Settings in milliseconds.

### 👥 7. Multi-Profile Support
- Built-in profile manager allowing multiple users to track habits on the same machine.
- Great for students sharing devices, or for separating **Work / Engineering Habits** from **Personal / Health Habits**.
- Password protection support for individual profile privacy.

### 🛡️ 8. Data Ownership, Backup & Export
- **One-Click JSON Backup**: Export your complete database to JSON anytime. Restore on any machine with zero friction.
- **Spreadsheet CSV Export**: Export check-in history directly to CSV compatible with Google Sheets, Excel, or Python data science notebooks.
- **Safe Reset & Archive**: Archive habits you're not currently practicing without destroying your historical data.

---

## Keyboard Shortcuts

Zion is designed from the ground up for developer ergonomics. You can navigate, toggle, and manage habits completely keyboard-driven:

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| `Ctrl + K` / `Cmd + K` | Open Omnibar Command Palette | Global |
| `N` | Open "Create New Habit" Dialog | Global |
| `T` | Jump instantly to Today's date column | Daily Habits Matrix |
| `W` | Open Weekly Review & Consistency Report | Global |
| `Space` | Toggle habit checkbox in active grid cell | Daily Habits Matrix |
| `Arrow Keys` | Navigate between habit cells and dates | Daily Habits Matrix |
| `Ctrl + 1` | Switch to **Dashboard** | Navigation |
| `Ctrl + 2` | Switch to **Daily Habits Matrix** | Navigation |
| `Ctrl + 3` | Switch to **Analytics & Heatmap** | Navigation |
| `Ctrl + 4` | Switch to **Streaks & Medals** | Navigation |
| `Ctrl + 5` | Switch to **User Profile** | Navigation |
| `Ctrl + 6` | Switch to **Documentation Guide** | Navigation |
| `Ctrl + 7` | Switch to **Settings** | Navigation |
| `Ctrl + B` | Toggle / Collapse Sidebar | Navigation |
| `Esc` | Close any open modal, dialog, or palette | Global |

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Desktop Runtime** | [Electron 44](https://www.electronjs.org/) (Secure `contextIsolation`, typed IPC preload bridge) |
| **Frontend UI** | [React 19](https://react.dev/), [TypeScript 7](https://www.typescriptlang.org/), [Vite 8](https://vitejs.dev/) |
| **Styling & Design System** | Tailwind CSS v4, CSS Custom Variables, Modern Glassmorphism & Studio Palettes |
| **State Management** | [Zustand 5](https://github.com/pmndrs/zustand) with reactive persistent subscriptions |
| **Database** | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (Zero-latency local embedded SQL) |
| **Date Calculations** | [date-fns 4](https://date-fns.org/) for leap-year-safe calendar and timezone computations |
| **Icons & Visuals** | [Lucide React](https://lucide.dev/), Canvas Confetti, Custom SVG Math Engines |
| **Packaging** | [electron-builder](https://www.electron.build/) (Windows NSIS `.exe`, Linux `.AppImage`) |

---

## Project Structure

```text
zion-habit-tracker/
├── assets/                    # Application icons & preview screenshots
│   ├── scrn1.png              # Interactive Dashboard preview
│   ├── scrn2.png              # Master Habits Grid preview
│   ├── scrn3.png              # Analytics & Heatmap preview
│   ├── scrn4.png              # Streaks & Medals preview
│   └── scrn5.png              # User Profile preview
├── electron/                  # Electron Main Process & Native Bridges
│   ├── main.ts                # Main application window, lifecycle & IPC handlers
│   └── preload.ts             # Context-isolated secure API bridge
├── src/                       # React 19 Frontend Application
│   ├── assets/                # App icons, visual media & 96x96 logo
│   ├── components/            # Reusable UI component modules
│   │   ├── analytics/         # Heatmap, sparklines, weekday distribution
│   │   ├── dashboard/         # Activity rings, top cards, progress summaries
│   │   ├── habits/            # Master grid, sticky headers, cell checkboxes
│   │   ├── streaks/           # Milestone badges, leaderboards, streak cards
│   │   └── ui/                # TitleBar, Sidebar, Modals, Card primitives
│   ├── db/                    # Local SQLite schema, migrations & DAO operations
│   ├── hooks/                 # Custom React hooks (keyboard shortcuts, resize)
│   ├── lib/                   # Audio synthesis, date helpers, habit icon registry
│   ├── pages/                 # Full view pages (Dashboard, Habits, Analytics, etc.)
│   ├── store/                 # Zustand global habit, profile, and settings stores
│   └── styles/                # CSS variable tokens, scrollbars, studio themes
├── release/                   # Packaged desktop distribution binaries
├── package.json               # Project manifest, dependencies, and build scripts
├── tsconfig.json              # TypeScript compilation rules
├── vite.config.ts             # Vite bundling and optimization pipeline
└── README.md                  # Project documentation
```

---

## Getting Started

### Prerequisites
- **Node.js**: `v22.12.0` or higher
- **npm**: `v9.0.0` or higher
- **Git**

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yvvsatyanarayana-dev/Zion-Habit-Tracker.git
   cd Zion-Habit-Tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

### Development Mode

Start the Vite development server and launch the Electron application concurrently with hot module replacement:

```bash
npm run dev
```

### Android

The Android app uses the existing React interface inside a Capacitor WebView and stores app data locally on the device. Install Android Studio with the Android SDK and JDK 17 or newer, then connect a device with USB debugging enabled or start an emulator.

```bash
npm run android:sync
npm run android:open
```

In Android Studio, build or run the `android` project on your device or emulator. To launch directly on a connected device from the command line, use:

```bash
npm run android:run
```

To build a debug APK from the command line on Windows:

```powershell
npm run android:sync
cd android
.\gradlew.bat assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. On macOS or Linux, use `./gradlew assembleDebug` instead. Run `npm run android:sync` again after changing web code so the Android project gets the latest build.

#### Build an APK with GitHub Actions

The `Build Android APK` workflow builds a debug APK on a GitHub-hosted runner, so Android Studio, the JDK, and the Android SDK do not need to be installed locally. Push the repository to GitHub and open the **Actions** tab. The workflow runs on pushes and pull requests; you can also start it manually with **Run workflow**. When it completes, open the run and download the `Zion-Habit-Tracker-Android` artifact from its summary. It contains `Zion-Habit-Tracker.apk`, a debug build for testing rather than a signed Play Store release, and is retained for 14 days.

### Running Unit Tests

Run the Vitest test suite:

```bash
npm test
```

### Production Build & Packaging

1. **Compile the production bundle**:
   ```bash
   npm run build
   ```

2. **Package standalone installers** (`.exe` for Windows, `.AppImage` for Linux):
   ```bash
   npm run dist
   ```
   The standalone setup executables will be generated in the `/release` folder.

---

## Open-Source & Lifetime Free Guarantee

Zion was created by **Satyanarayana** with a single guiding philosophy:

> *"True personal productivity tools should belong to the user. Every student, developer, and builder deserves access to first-class habit engineering software without recurring subscriptions, telemetry tracking, or artificial feature gating."*

Zion is **free for life** and released under the permissive **MIT License**. You are welcome to use it, inspect the code, customize it, contribute to it, or build upon it.

---

## Contributing

Contributions are warmly welcomed! If you have suggestions for new features, performance optimizations, or bug fixes:

1. **Fork the Repository**
2. **Create a Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Commit your Changes**: `git commit -m 'feat: Add amazing new feature'`
4. **Push to the Branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

---

## License

Distributed under the **MIT License**. See `LICENSE` for full details.

```text
MIT License

Copyright (c) 2026 Satyanarayana

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

<div align="center">

**Built with precision & passion by Satyanarayana.**  
*Empowering daily consistency, one habit at a time.*

</div>
