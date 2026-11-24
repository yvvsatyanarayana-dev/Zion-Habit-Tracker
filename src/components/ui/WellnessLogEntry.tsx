import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Heart,
  Zap,
  Save,
  Loader2,
  BatteryLow,
  BatteryMedium,
  Battery,
  BatteryCharging,
  Frown,
  Meh,
  Smile,
  SmilePlus,
  Laugh,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { formatLocalDate } from '../../lib/dateUtils';
import { clsx } from 'clsx';

interface WellnessLogEntryProps {
  isOpen: boolean;
  onClose: () => void;
  date?: Date; // defaults to today
}

const ENERGY_LABELS = ['Drained', 'Low', 'Okay', 'Good', 'Energized'];
const MOOD_LABELS = ['Awful', 'Bad', 'Neutral', 'Good', 'Great'];
const ENERGY_ICONS = [BatteryLow, BatteryMedium, Battery, BatteryCharging, Zap];
const MOOD_ICONS = [Frown, Meh, Smile, SmilePlus, Laugh];

export const WellnessLogEntry: React.FC<WellnessLogEntryProps> = ({ isOpen, onClose, date }) => {
  const { wellnessLogs, upsertWellnessLog, currentUser, currentDate } = useHabitStore();
  const effectiveDate = date || currentDate;
  const [energy, setEnergy] = useState(3);
  const [mood, setMood] = useState(3);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const dateStr = formatLocalDate(effectiveDate);
  const existingLog = wellnessLogs[dateStr];

  // Load existing log on open
  React.useEffect(() => {
    if (existingLog) {
      setEnergy(existingLog.energy);
      setMood(existingLog.mood);
      setNote(existingLog.note || '');
    } else {
      setEnergy(3);
      setMood(3);
      setNote('');
    }
  }, [isOpen, existingLog, dateStr]);

  const handleSave = async () => {
    if (!currentUser) {
      onClose();
      return;
    }

    setSaving(true);
    const logId = existingLog?.id || `wl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await upsertWellnessLog({
      id: logId,
      date: dateStr,
      energy,
      mood,
      note: note.trim(),
    });

    setSaving(false);
    onClose();
  };

  const handleQuickSelect = (type: 'energy' | 'mood', value: number) => {
    if (type === 'energy') setEnergy(value);
    else setMood(value);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-[12px]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col"
          style={{
            backgroundColor: 'var(--bg-surface-elevated, #131316)',
            borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))',
            boxShadow: 'var(--shadow-dropdown, 0 20px 48px rgba(0,0,0,0.85))',
            color: 'var(--text-primary, #f4f4f6)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-4 sm:p-5 border-b"
            style={{
              borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))',
              backgroundColor: 'var(--bg-surface, #0e0e11)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 text-pink-400">
                <Heart className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary, #f4f4f6)' }}>
                  Daily Check-in
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary, #9898a4)' }}>
                  {dateStr === formatLocalDate(currentDate) ? 'How are you feeling today?' : `Reflection for ${dateStr}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-5 space-y-5">
            {/* Energy Selector */}
            <div>
              <label
                className="text-xs font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5"
                style={{ color: 'var(--text-secondary, #9898a4)' }}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Energy Level
              </label>
              <div className="flex items-center justify-between gap-1.5">
                {ENERGY_LABELS.map((label, index) => {
                  const value = index + 1;
                  const isSelected = energy === value;
                  const Icon = ENERGY_ICONS[index];
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleQuickSelect('energy', value)}
                      className={clsx(
                        'flex-1 flex flex-col items-center gap-1 p-2 sm:p-2.5 rounded-xl border transition-all',
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-md shadow-amber-950/40'
                          : 'hover:bg-white/[0.04] text-zinc-400'
                      )}
                      style={{
                        backgroundColor: isSelected ? undefined : 'var(--bg-surface-card, #17171a)',
                        borderColor: isSelected ? undefined : 'var(--border-subtle, rgba(255,255,255,0.065))',
                      }}
                      aria-pressed={isSelected}
                      aria-label={`Energy: ${label}`}
                    >
                      <Icon className={clsx('w-5 h-5', isSelected ? 'text-amber-400' : 'text-zinc-400')} />
                      <span className="text-[10px] font-semibold">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mood Selector */}
            <div>
              <label
                className="text-xs font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5"
                style={{ color: 'var(--text-secondary, #9898a4)' }}
              >
                <Heart className="w-3.5 h-3.5 text-pink-400" />
                Mood & Outlook
              </label>
              <div className="flex items-center justify-between gap-1.5">
                {MOOD_LABELS.map((label, index) => {
                  const value = index + 1;
                  const isSelected = mood === value;
                  const Icon = MOOD_ICONS[index];
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleQuickSelect('mood', value)}
                      className={clsx(
                        'flex-1 flex flex-col items-center gap-1 p-2 sm:p-2.5 rounded-xl border transition-all',
                        isSelected
                          ? 'bg-pink-500/20 border-pink-500/40 text-pink-300 shadow-md shadow-pink-950/40'
                          : 'hover:bg-white/[0.04] text-zinc-400'
                      )}
                      style={{
                        backgroundColor: isSelected ? undefined : 'var(--bg-surface-card, #17171a)',
                        borderColor: isSelected ? undefined : 'var(--border-subtle, rgba(255,255,255,0.065))',
                      }}
                      aria-pressed={isSelected}
                      aria-label={`Mood: ${label}`}
                    >
                      <Icon className={clsx('w-5 h-5', isSelected ? 'text-pink-400' : 'text-zinc-400')} />
                      <span className="text-[10px] font-semibold">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Note */}
            <div>
              <label
                className="block text-xs font-bold uppercase tracking-wider mb-2"
                style={{ color: 'var(--text-secondary, #9898a4)' }}
              >
                Reflection Note (optional)
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="What went well today? Any breakthrough or obstacle?"
                rows={3}
                className="w-full rounded-xl p-3 text-sm border focus:outline-none transition-colors resize-none"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle, #1c1c20)',
                  borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))',
                  color: 'var(--text-primary, #f4f4f6)',
                }}
                maxLength={500}
              />
              <p className="text-[11px] text-right mt-1" style={{ color: 'var(--text-muted, #5e5e6c)' }}>
                {note.length}/500
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs tracking-wide transition-all shadow-lg flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--btn-primary-bg, #ffffff)',
                color: 'var(--btn-primary-text, #09090b)',
                boxShadow: 'var(--btn-primary-shadow, 0 0 20px rgba(255,255,255,0.22))',
              }}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Daily Reflection</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Quick inline wellness entry for daily habits page
export const QuickWellnessEntry: React.FC<{ date?: Date; compact?: boolean }> = ({
  date,
  compact = false
}) => {
  const { wellnessLogs, upsertWellnessLog, currentUser, currentDate } = useHabitStore();
  const effectiveDate = date || currentDate;
  const [energy, setEnergy] = useState(3);
  const [mood, setMood] = useState(3);
  const [expanded, setExpanded] = useState(false);

  const dateStr = formatLocalDate(effectiveDate);
  const existingLog = wellnessLogs[dateStr];

  React.useEffect(() => {
    if (existingLog) {
      setEnergy(existingLog.energy);
      setMood(existingLog.mood);
    }
  }, [existingLog]);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;

    const logId = existingLog?.id || `wl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await upsertWellnessLog({
      id: logId,
      date: dateStr,
      energy,
      mood,
      note: '',
    });
    setExpanded(false);
  };

  if (compact && !expanded && !existingLog) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full py-2.5 px-4 rounded-xl border transition-colors flex items-center justify-center gap-2.5"
        style={{
          backgroundColor: 'rgba(236, 72, 153, 0.08)',
          borderColor: 'rgba(236, 72, 153, 0.2)',
          color: 'var(--text-primary, #f4f4f6)',
        }}
      >
        <Zap className="w-4 h-4 text-amber-400" />
        <Heart className="w-4 h-4 text-pink-400" />
        <span className="text-xs font-semibold">Log Energy & Mood</span>
        <span className="text-[11px] text-pink-300/70">• 5 seconds</span>
      </button>
    );
  }

  return (
    <div
      className="w-full rounded-2xl border p-4 space-y-3.5 animate-in fade-in"
      style={{
        backgroundColor: 'var(--bg-surface-card, #17171a)',
        borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, #9898a4)' }}>
          Quick Wellness Check-in
        </span>
        <button
          onClick={() => setExpanded(false)}
          className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs w-14 font-medium" style={{ color: 'var(--text-muted, #5e5e6c)' }}>Energy</span>
        <div className="flex-1 flex gap-1">
          {[1,2,3,4,5].map(v => {
            const Icon = ENERGY_ICONS[v - 1];
            return (
              <button
                key={v}
                onClick={() => setEnergy(v)}
                className={clsx(
                  'flex-1 h-8 rounded-lg font-medium text-xs transition-all flex items-center justify-center border',
                  energy === v
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-white/[0.03] border-white/5 text-zinc-400 hover:bg-white/[0.06]'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs w-14 font-medium" style={{ color: 'var(--text-muted, #5e5e6c)' }}>Mood</span>
        <div className="flex-1 flex gap-1">
          {[1,2,3,4,5].map(v => {
            const Icon = MOOD_ICONS[v - 1];
            return (
              <button
                key={v}
                onClick={() => setMood(v)}
                className={clsx(
                  'flex-1 h-8 rounded-lg font-medium text-xs transition-all flex items-center justify-center border',
                  mood === v
                    ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                    : 'bg-white/[0.03] border-white/5 text-zinc-400 hover:bg-white/[0.06]'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full py-2 rounded-xl text-xs font-bold tracking-wide transition-all"
        style={{
          backgroundColor: 'var(--btn-primary-bg, #ffffff)',
          color: 'var(--btn-primary-text, #09090b)',
        }}
      >
        Save Reflection
      </button>
    </div>
  );
};
