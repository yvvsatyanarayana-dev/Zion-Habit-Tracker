import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Zap, Save, Loader2 } from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import type { WellnessLog } from '../../lib/types';
import { formatLocalDate } from '../../lib/dateUtils';
import { clsx } from 'clsx';

interface WellnessLogEntryProps {
  isOpen: boolean;
  onClose: () => void;
  date?: Date; // defaults to today
}

const ENERGY_LABELS = ['Drained', 'Low', 'Okay', 'Good', 'Energized'];
const MOOD_LABELS = ['Awful', 'Bad', 'Neutral', 'Good', 'Great'];
const ENERGY_EMOJIS = ['🪫', '🔋', '🔋', '⚡', '⚡⚡'];
const MOOD_EMOJIS = ['😞', '😕', '😐', '😊', '😄'];

export const WellnessLogEntry: React.FC<WellnessLogEntryProps> = ({ isOpen, onClose, date = new Date() }) => {
  const { wellnessLogs, upsertWellnessLog, currentUser } = useHabitStore();
  const [energy, setEnergy] = useState(3);
  const [mood, setMood] = useState(3);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [showNote, setShowNote] = useState(false);

  const dateStr = formatLocalDate(date);
  const existingLog = wellnessLogs[dateStr];

  // Load existing log on open
  React.useEffect(() => {
    if (existingLog) {
      setEnergy(existingLog.energy);
      setMood(existingLog.mood);
      setNote(existingLog.note || '');
    } else {
      // Reset to defaults
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Daily Check-in</h2>
                <p className="text-sm text-muted-foreground">
                  {dateStr === formatLocalDate(new Date()) ? 'How are you feeling today?' : `How were you feeling on ${dateStr}?`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="p-4 space-y-6">
            {/* Energy Selector */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                Energy Level
              </label>
              <div className="flex items-center justify-between gap-2">
                {ENERGY_LABELS.map((label, index) => {
                  const value = index + 1;
                  const isSelected = energy === value;
                  return (
                    <button
                      key={value}
                      onClick={() => handleQuickSelect('energy', value)}
                      className={clsx(
                        'flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all',
                        isSelected
                          ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-white shadow-lg shadow-yellow-500/25'
                          : 'bg-muted/50 hover:bg-muted border border-border/50'
                      )}
                      aria-pressed={isSelected}
                      aria-label={`Energy: ${label}`}
                    >
                      <motion.span
                        initial={{ scale: 0.8 }}
                        animate={{ scale: isSelected ? 1.2 : 1 }}
                        className="text-3xl"
                      >
                        {ENERGY_EMOJIS[index]}
                      </motion.span>
                      <span className={clsx(
                        'text-xs font-medium',
                        isSelected ? 'text-white' : 'text-muted-foreground'
                      )}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mood Selector */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-400" />
                Mood
              </label>
              <div className="flex items-center justify-between gap-2">
                {MOOD_LABELS.map((label, index) => {
                  const value = index + 1;
                  const isSelected = mood === value;
                  return (
                    <button
                      key={value}
                      onClick={() => handleQuickSelect('mood', value)}
                      className={clsx(
                        'flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all',
                        isSelected
                          ? 'bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/25'
                          : 'bg-muted/50 hover:bg-muted border border-border/50'
                      )}
                      aria-pressed={isSelected}
                      aria-label={`Mood: ${label}`}
                    >
                      <motion.span
                        initial={{ scale: 0.8 }}
                        animate={{ scale: isSelected ? 1.2 : 1 }}
                        className="text-3xl"
                      >
                        {MOOD_EMOJIS[index]}
                      </motion.span>
                      <span className={clsx(
                        'text-xs font-medium',
                        isSelected ? 'text-white' : 'text-muted-foreground'
                      )}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Note */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Note (optional)
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Anything noteworthy? (win, struggle, observation...)"
                rows={3}
                className="w-full bg-input border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right mt-1">
                {note.length}/500
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Check-in
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
  date = new Date(),
  compact = false
}) => {
  const { wellnessLogs, upsertWellnessLog, currentUser } = useHabitStore();
  const [energy, setEnergy] = useState(3);
  const [mood, setMood] = useState(3);
  const [expanded, setExpanded] = useState(false);

  const dateStr = formatLocalDate(date);
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
        className="w-full py-3 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl hover:border-pink-500/30 transition-colors flex items-center justify-center gap-3"
      >
        <Zap className="w-5 h-5 text-yellow-400" />
        <Heart className="w-5 h-5 text-pink-400" />
        <span className="text-sm font-medium text-foreground">Log Energy & Mood</span>
        <span className="text-xs text-muted-foreground">Takes 5 seconds</span>
      </button>
    );
  }

  return (
    <div className="w-full bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">Quick Check-in</span>
        <button
          onClick={() => setExpanded(false)}
          className="p-1 hover:bg-accent rounded transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex gap-2">
        <span className="text-sm text-muted-foreground w-20">Energy</span>
        <div className="flex-1 flex gap-1">
          {[1,2,3,4,5].map(v => (
            <button
              key={v}
              onClick={() => setEnergy(v)}
              className={clsx(
                'flex-1 h-8 rounded-lg font-medium text-xs transition-all',
                energy === v
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                  : 'bg-muted hover:bg-muted/50'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <span className="text-sm text-muted-foreground w-20">Mood</span>
        <div className="flex-1 flex gap-1">
          {[1,2,3,4,5].map(v => (
            <button
              key={v}
              onClick={() => setMood(v)}
              className={clsx(
                'flex-1 h-8 rounded-lg font-medium text-xs transition-all',
                mood === v
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                  : 'bg-muted hover:bg-muted/50'
              )}
            >
              {MOOD_EMOJIS[v-1]}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
      >
        Save
      </button>
    </div>
  );
};