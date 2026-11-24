import React, { useEffect, useState } from 'react';
import { ShieldCheck, X, ArrowRight } from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { sound } from '../../lib/audio';

interface ViolationPayload {
  processName: string;
  windowTitle: string;
  matchedRule: string;
  timestamp: number;
  activeBlockTitle?: string;
  stats?: { todayDeflections: number; totalDeflections: number };
}

export const FocusShieldBanner: React.FC = () => {
  const [activeViolation, setActiveViolation] = useState<ViolationPayload | null>(null);
  const setFocusShieldModalOpen = useHabitStore((s) => s.setFocusShieldModalOpen);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.api?.focusShield?.onViolation) return;

    const unsub = window.api.focusShield.onViolation((violation) => {
      const isAdultRule = /porn|xvideo|xnxx|redtube|xhamster|onlyfans|fansly|chaturbate|stripchat|bongacam|spankbang|brazzer|eporner|erome/i.test(
        violation.matchedRule || ''
      );
      const displayRule = isAdultRule ? 'Restricted 18+ Content' : violation.matchedRule;

      setActiveViolation({ ...violation, matchedRule: displayRule });
      sound.playShieldAlert();

      // Award +15 XP to Discipline branch
      useHabitStore.getState().awardXp(15, 'discipline', `Focus Shield: Deflected ${displayRule}`);

      // Auto dismiss after 6 seconds
      const timer = setTimeout(() => {
        setActiveViolation((current) => (current?.timestamp === violation.timestamp ? null : current));
      }, 6000);

      return () => clearTimeout(timer);
    });

    return () => unsub();
  }, []);

  if (!activeViolation) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-fade-in pointer-events-auto">
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-subtle)',
          boxShadow: '0 20px 48px -8px rgba(0, 0, 0, 0.7), 0 0 0 1px var(--border-subtle)',
        }}
        className="p-4 rounded-2xl border flex items-start gap-3 relative overflow-hidden backdrop-blur-xl"
      >
        {/* Subtle accent hairline */}
        <div
          style={{ backgroundColor: 'var(--accent-primary)' }}
          className="absolute top-0 left-0 right-0 h-[2px] opacity-70"
        />

        {/* Icon tile matching app theme */}
        <div
          style={{
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            borderColor: 'rgba(99, 102, 241, 0.25)',
            color: 'var(--accent-primary)',
          }}
          className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-inner"
        >
          <ShieldCheck size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <span
                style={{ color: 'var(--accent-primary)' }}
                className="text-[10px] font-mono font-bold uppercase tracking-wider"
              >
                Focus Shield Deflected
              </span>
              <span
                style={{
                  backgroundColor: 'rgba(99, 102, 241, 0.12)',
                  color: 'var(--accent-primary)',
                }}
                className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold"
              >
                +15 XP
              </span>
            </div>
            <button
              onClick={() => setActiveViolation(null)}
              style={{ color: 'var(--text-muted)' }}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer p-0.5"
            >
              <X size={13} />
            </button>
          </div>

          <h4 style={{ color: 'var(--text-primary)' }} className="text-xs font-bold mt-1 truncate">
            Intercepted: {activeViolation.matchedRule}
          </h4>

          <p style={{ color: 'var(--text-muted)' }} className="text-[11px] mt-0.5 line-clamp-1 leading-relaxed">
            {activeViolation.activeBlockTitle
              ? `Active routine: "${activeViolation.activeBlockTitle}". Stay in flow!`
              : 'Distraction neutralized. Keep crushing your focus streak.'}
          </p>

          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={() => {
                setActiveViolation(null);
                setFocusShieldModalOpen(true);
              }}
              style={{ color: 'var(--accent-primary)' }}
              className="text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors hover:underline"
            >
              <span>Shield Settings</span>
              <ArrowRight size={11} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
