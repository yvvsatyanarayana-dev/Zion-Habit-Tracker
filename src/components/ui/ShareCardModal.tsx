import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Download, Share2, Check } from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { computeActivityRings, computeHabitsMonthlyProgress, computeStreakStats } from '../../lib/statsUtils';
import { computeMasteryInfo } from '../../lib/masteryUtils';
import { formatLocalDate } from '../../lib/dateUtils';
import { APP_VERSION } from '../../lib/constants';

export const ShareCardModal: React.FC = () => {
  const isOpen = useHabitStore((s) => s.shareCardOpen);
  if (!isOpen) return null;
  return <ShareCardModalInner />;
};

const ShareCardModalInner: React.FC = () => {
  const setShareCardOpen = useHabitStore((s) => s.setShareCardOpen);
  const currentUser = useHabitStore((s) => s.currentUser);
  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const allCheckinsList = useHabitStore((s) => s.allCheckinsList);
  const focusSessions = useHabitStore((s) => s.focusSessions);
  const wellnessLogs = useHabitStore((s) => s.wellnessLogs);
  const currentDate = useHabitStore((s) => s.currentDate);
  const selectedYear = useHabitStore((s) => s.selectedYear);
  const selectedMonth = useHabitStore((s) => s.selectedMonth);
  const streakThreshold = useHabitStore((s) => s.settings?.streak_threshold ?? 50);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const stats = useMemo(() => {
    const rings = computeActivityRings(habits, checkins, selectedYear, selectedMonth, currentDate);
    const streaks = computeStreakStats(habits, allCheckinsList, streakThreshold, currentDate);
    const mastery = computeMasteryInfo({
      allCheckinsList,
      focusSessions,
      bestStreak: streaks.longestStreak,
      wellnessLogs,
    });
    const topHabits = computeHabitsMonthlyProgress(habits, checkins, selectedYear, selectedMonth)
      .slice()
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 3);
    const totalFocusMins = focusSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

    return { rings, streaks, mastery, topHabits, totalFocusMins };
  }, [habits, checkins, allCheckinsList, focusSessions, wellnessLogs, currentDate, selectedYear, selectedMonth, streakThreshold]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1200;
    const H = 675;
    canvas.width = W;
    canvas.height = H;

    // Background obsidian gradient
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#09090b');
    bgGrad.addColorStop(0.55, '#111118');
    bgGrad.addColorStop(1, '#0c1021');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Subtle glow accents
    const glow1 = ctx.createRadialGradient(220, 120, 20, 220, 120, 420);
    glow1.addColorStop(0, 'rgba(99, 102, 241, 0.22)');
    glow1.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, W, H);

    const glow2 = ctx.createRadialGradient(1020, 560, 20, 1020, 560, 380);
    glow2.addColorStop(0, 'rgba(16, 185, 129, 0.16)');
    glow2.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, W, H);

    // Outer frame border
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(28, 28, W - 56, H - 56, 28);
    ctx.stroke();

    // Brand Header
    ctx.fillStyle = '#818cf8';
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.fillText('ZION HABIT STUDIO', 68, 86);

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '16px system-ui, -apple-system, sans-serif';
    ctx.fillText(`v${APP_VERSION} · ${formatLocalDate(currentDate)}`, 68, 112);

    // User + Rank pill
    const displayName = currentUser?.name || currentUser?.username || 'Zion Builder';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
    ctx.fillText(displayName, 68, 182);

    ctx.fillStyle = stats.mastery.rankColor;
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      `Level ${stats.mastery.level} · ${stats.mastery.rank} (${stats.mastery.xp.toLocaleString()} XP)`,
      68,
      218
    );

    // 4 KPI Cards
    const kpis = [
      { label: 'CURRENT STREAK', value: `${stats.streaks.currentStreak}d`, color: '#f59e0b' },
      { label: 'BEST STREAK', value: `${stats.streaks.longestStreak}d`, color: '#10b981' },
      { label: 'MONTHLY RATE', value: `${Math.round(stats.rings.month.rate * 100)}%`, color: '#6366f1' },
      { label: 'FOCUS LOGGED', value: `${stats.totalFocusMins}m`, color: '#ec4899' },
    ];

    kpis.forEach((kpi, idx) => {
      const cardW = 250;
      const cardH = 128;
      const x = 68 + idx * (cardW + 22);
      const y = 264;

      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.strokeStyle = 'rgba(255,255,255,0.09)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, cardH, 18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText(kpi.label, x + 22, y + 38);

      ctx.fillStyle = kpi.color;
      ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
      ctx.fillText(kpi.value, x + 22, y + 96);
    });

    // Top Habits Section
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    ctx.fillText('TOP CONSISTENCY HABITS THIS MONTH', 68, 444);

    if (stats.topHabits.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '18px system-ui, -apple-system, sans-serif';
      ctx.fillText('Start checking off daily habits to feature your top performers here.', 68, 490);
    } else {
      stats.topHabits.forEach((item, idx) => {
        const rowY = 470 + idx * 46;
        const pct = Math.round(item.rate * 100);

        ctx.fillStyle = item.habit.color || '#6366f1';
        ctx.beginPath();
        ctx.arc(78, rowY + 8, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f4f4f5';
        ctx.font = '600 19px system-ui, -apple-system, sans-serif';
        ctx.fillText(item.habit.name, 98, rowY + 14);

        // Bar background
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        ctx.roundRect(540, rowY - 2, 480, 16, 8);
        ctx.fill();

        // Bar fill
        ctx.fillStyle = item.habit.color || '#6366f1';
        ctx.beginPath();
        ctx.roundRect(540, rowY - 2, Math.max(12, Math.round(480 * item.rate)), 16, 8);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
        ctx.fillText(`${pct}%`, 1044, rowY + 13);
      });
    }

    // Footer
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillText('100% Offline-First · Engineered with Zion Habit Tracker', 68, 622);
  }, [currentDate, currentUser, stats]);

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const fileName = `zion-progress-${formatLocalDate(currentDate)}.png`;

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      // Try Web Share API first on mobile/Android if supported
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'My Zion Habit Progress',
            });
            setStatusMsg('Shared successfully!');
            return;
          } catch {
            // Fall through to anchor download
          }
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMsg('Saved PNG progress card!');
    }, 'image/png');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={() => setShareCardOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        className="w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col"
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5">
            <Share2 size={18} className="text-indigo-400" />
            <h2 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Export Studio Progress Card
            </h2>
          </div>
          <button
            onClick={() => setShareCardOpen(false)}
            className="p-2 rounded-lg hover:bg-white/5 cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
            <canvas ref={canvasRef} className="w-full h-auto block" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {statusMsg ? (
                <span className="text-emerald-400 font-semibold inline-flex items-center gap-1.5">
                  <Check size={14} />
                  {statusMsg}
                </span>
              ) : (
                'High-resolution 1200×675 PNG generated offline on your device.'
              )}
            </div>

            <button
              onClick={() => void handleDownload()}
              style={{ backgroundColor: 'var(--accent-primary)' }}
              className="px-4 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>Download / Share PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
