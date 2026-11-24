import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldAlert,
  Skull,
  Lock,
  Unlock,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  RefreshCw,
  X,
  Volume2,
  Globe,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { sound } from '../../lib/audio';

const STOIC_PLEDGES = [
  'I choose discipline over comfort. Focus is my highest virtue.',
  'You have power over your mind, not outside events. Realize this, and you will find strength.',
  'No man is free who is not master of himself.',
  'Waste no more time arguing what a good man should be. Be one.',
  'First say to yourself what you would be, and then do what you have to do.',
];

export const HardcoreLockdownModal: React.FC = () => {
  const isOpen = useHabitStore((s) => s.hardcoreLockdownModalOpen);
  const setOpen = useHabitStore((s) => s.setHardcoreLockdownModalOpen);
  const setFocusShieldModalOpen = useHabitStore((s) => s.setFocusShieldModalOpen);
  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const currentDate = useHabitStore((s) => s.currentDate);
  const toggleCheckin = useHabitStore((s) => s.toggleCheckin);
  const logFocusSession = useHabitStore((s) => s.logFocusSession);
  const awardXp = useHabitStore((s) => s.awardXp);

  const [lockdownActive, setLockdownActive] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [selectedMins, setSelectedMins] = useState(25);
  const [killedList, setKilledList] = useState<Array<{ process: string; time: string }>>([]);

  // Emergency Bailout State
  const [bailoutMode, setBailoutMode] = useState(false);
  const [stoicQuote, setStoicQuote] = useState(STOIC_PLEDGES[0]);
  const [userInput, setUserInput] = useState('');
  const [bailoutError, setBailoutError] = useState('');

  // Update quote whenever entering bailout mode
  const handleOpenBailout = () => {
    const randomQuote = STOIC_PLEDGES[Math.floor(Math.random() * STOIC_PLEDGES.length)];
    setStoicQuote(randomQuote);
    setUserInput('');
    setBailoutError('');
    setBailoutMode(true);
  };

  // Today string
  const todayStr = currentDate.toISOString().slice(0, 10);
  const activeHabits = habits.filter((h) => !h.archived);

  // Sync initial lockdown status from Electron backend
  useEffect(() => {
    if (typeof window !== 'undefined' && window.api?.focusShield?.getLockdownStatus) {
      window.api.focusShield.getLockdownStatus().then((status) => {
        if (status.isLocked) {
          setLockdownActive(true);
          setRemainingSeconds(Math.ceil(status.remainingMs / 1000));
        }
      }).catch(() => {});
    }

    // Subscribe to killed events
    if (typeof window !== 'undefined' && window.api?.focusShield?.onProcessKilled) {
      const unsub = window.api.focusShield.onProcessKilled((data) => {
        sound.playShieldAlert();
        setKilledList((prev) => [
          {
            process: data.processName,
            time: new Date().toLocaleTimeString(),
          },
          ...prev.slice(0, 9),
        ]);
      });
      return () => unsub();
    }
  }, []);

  // Timer Countdown
  useEffect(() => {
    if (!lockdownActive) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setLockdownActive(false);
          sound.playCelebration();
          void logFocusSession({
            habit_name: 'Hardcore Dopamine Vault Lockdown',
            duration_minutes: selectedMins,
            soundscape: 'none',
          });
          void awardXp(selectedMins * 20, 'discipline', 'Hardcore Lockdown Victory');
          if (window.api?.focusShield?.stopLockdown) {
            void window.api.focusShield.stopLockdown();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockdownActive]);

  if (!isOpen) return null;

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStartLockdown = async () => {
    sound.playClick();
    setRemainingSeconds(selectedMins * 60);
    setLockdownActive(true);
    setBailoutMode(false);
    setUserInput('');
    if (window.api?.focusShield?.startLockdown) {
      await window.api.focusShield.startLockdown(selectedMins);
    }
  };

  const handleVerifyBailout = async () => {
    if (userInput.trim() === stoicQuote.trim()) {
      sound.playClick();
      setLockdownActive(false);
      setBailoutMode(false);
      setUserInput('');
      if (window.api?.focusShield?.stopLockdown) {
        await window.api.focusShield.stopLockdown();
      }
      setOpen(false);
    } else {
      sound.playShieldAlert();
      setBailoutError('Text does not match exactly. Discipline requires absolute precision.');
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-[16px] animate-fade-in select-none"
    >
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: lockdownActive ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-subtle)',
          boxShadow: lockdownActive
            ? '0 0 60px rgba(239, 68, 68, 0.25), 0 25px 50px -12px rgba(0, 0, 0, 0.8)'
            : 'var(--shadow-dropdown)',
        }}
        className="w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all duration-300"
      >
        {/* Header */}
        <div
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: lockdownActive
              ? 'rgba(239, 68, 68, 0.08)'
              : 'rgba(99, 102, 241, 0.05)',
          }}
          className="px-6 py-4.5 border-b flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                backgroundColor: lockdownActive
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(99, 102, 241, 0.15)',
                borderColor: lockdownActive
                  ? 'rgba(239, 68, 68, 0.4)'
                  : 'rgba(99, 102, 241, 0.35)',
                color: lockdownActive ? '#ef4444' : 'var(--accent-primary)',
              }}
              className="w-10 h-10 rounded-xl border flex items-center justify-center shadow-inner"
            >
              {lockdownActive ? <Skull size={20} className="animate-pulse" /> : <Lock size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 style={{ color: 'var(--text-primary)' }} className="text-base font-bold tracking-tight">
                  Hardcore Dopamine Vault
                </h2>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    lockdownActive
                      ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                      : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                  }`}
                >
                  {lockdownActive ? 'LOCKDOWN ACTIVE' : 'STANDBY'}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)' }} className="text-xs">
                {lockdownActive
                  ? 'All blacklisted gaming, social & streaming apps will be forcefully killed on launch.'
                  : 'Zero-distraction kiosk mode. Disconnects you from hyper-stimulating apps.'}
              </p>
            </div>
          </div>

          {!lockdownActive && (
            <button
              onClick={() => setOpen(false)}
              style={{ color: 'var(--text-muted)' }}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Active Countdown Display */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              borderColor: lockdownActive ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-subtle)',
            }}
            className="p-6 rounded-2xl border text-center relative overflow-hidden"
          >
            {lockdownActive && (
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-red-500/5 pointer-events-none" />
            )}
            <div className="text-[11px] font-mono font-bold tracking-widest text-[var(--text-muted)] uppercase mb-1">
              {lockdownActive ? 'Focus Sprint In Progress' : 'Select Lockdown Duration'}
            </div>
            <div
              className={`text-5xl font-black font-num tracking-tight ${
                lockdownActive ? 'text-red-400 drop-shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'text-[var(--text-primary)]'
              }`}
            >
              {formatTimer(remainingSeconds)}
            </div>

            {/* Duration Selector when Standby */}
            {!lockdownActive && (
              <div className="flex items-center justify-center gap-3 mt-4">
                {[15, 25, 45, 90].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => {
                      sound.playClick();
                      setSelectedMins(mins);
                      setRemainingSeconds(mins * 60);
                    }}
                    style={{
                      backgroundColor:
                        selectedMins === mins
                          ? 'var(--accent-primary)'
                          : 'var(--bg-surface-elevated)',
                      borderColor:
                        selectedMins === mins
                          ? 'transparent'
                          : 'var(--border-subtle)',
                      color: selectedMins === mins ? '#ffffff' : 'var(--text-secondary)',
                    }}
                    className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all hover:scale-105"
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Process Killer Log */}
          {killedList.length > 0 && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                borderColor: 'rgba(239, 68, 68, 0.25)',
              }}
              className="p-4 rounded-xl border space-y-2"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                <Skull size={14} />
                <span>Terminated Distractions ({killedList.length})</span>
              </div>
              <div className="space-y-1.5 max-h-24 overflow-y-auto font-mono text-[11px]">
                {killedList.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-red-300/90">
                    <span>⚡ KILLED: {item.process}</span>
                    <span className="text-red-400/60">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick link to Web Shield DNS Rules */}
          {!lockdownActive && (
            <div className="flex items-center justify-between p-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-2.5">
                <Globe size={16} className="text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white">Monk Mode Web Shield</div>
                  <div className="text-[11px] text-zinc-400">Block social media websites & route distractions to Stoic quotes</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setOpen(false);
                  setFocusShieldModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
              >
                Configure Web Shield
              </button>
            </div>
          )}

          {/* Today Keystone Habits Checklist */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)]">
              <span>Keystone Habits For This Session</span>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                {activeHabits.filter((h) => checkins[`${h.id}_${todayStr}`]?.completed).length}/
                {activeHabits.length} Complete
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {activeHabits.map((habit) => {
                const isDone = Boolean(checkins[`${habit.id}_${todayStr}`]?.completed);
                return (
                  <button
                    key={habit.id}
                    onClick={() => {
                      sound.playClick();
                      void toggleCheckin(habit.id, todayStr);
                    }}
                    style={{
                      backgroundColor: isDone
                        ? 'rgba(16, 185, 129, 0.08)'
                        : 'var(--bg-surface-subtle)',
                      borderColor: isDone
                        ? 'rgba(16, 185, 129, 0.3)'
                        : 'var(--border-subtle)',
                    }}
                    className="p-2.5 rounded-xl border flex items-center justify-between text-left transition-all hover:border-[var(--border-medium)] cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <div
                        style={{
                          backgroundColor: `${habit.color}25`,
                          color: habit.color,
                        }}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
                      >
                        {habit.emoji || '🎯'}
                      </div>
                      <span
                        className={`text-xs font-medium truncate ${
                          isDone
                            ? 'line-through text-[var(--text-muted)]'
                            : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {habit.name}
                      </span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-[var(--border-medium)] group-hover:border-emerald-400'
                      }`}
                    >
                      {isDone && <CheckCircle2 size={13} className="stroke-[2.5]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Emergency Bailout Section */}
          {lockdownActive && (
            <div className="pt-2 border-t border-[var(--border-subtle)] space-y-3">
              {!bailoutMode ? (
                <button
                  onClick={handleOpenBailout}
                  className="w-full py-2 rounded-xl text-xs font-semibold text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle size={14} />
                  <span>Request Emergency Bailout</span>
                </button>
              ) : (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                  }}
                  className="p-4 rounded-2xl border space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-400">
                      Stoic Bailout Pledge
                    </span>
                    <button
                      onClick={() => setBailoutMode(false)}
                      className="text-xs text-[var(--text-muted)] hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] italic select-text">
                    "{stoicQuote}"
                  </p>
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => {
                      setUserInput(e.target.value);
                      setBailoutError('');
                    }}
                    placeholder="Type the pledge above to unlock..."
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-red-500/30 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-red-500"
                  />
                  {bailoutError && (
                    <p className="text-[11px] text-red-400">{bailoutError}</p>
                  )}
                  <button
                    onClick={handleVerifyBailout}
                    className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-red-600/30"
                  >
                    Confirm Emergency Bailout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!lockdownActive && (
          <div
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              borderColor: 'var(--border-subtle)',
            }}
            className="px-6 py-4 border-t flex items-center justify-between"
          >
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <ShieldAlert size={14} className="text-amber-400" />
              <span>Strict kiosk mode will terminate non-work apps.</span>
            </div>

            <button
              onClick={handleStartLockdown}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-600/25 transition-all cursor-pointer hover:scale-105 flex items-center gap-2"
            >
              <Skull size={14} />
              <span>Initiate Hardcore Lockdown ({selectedMins}m)</span>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
