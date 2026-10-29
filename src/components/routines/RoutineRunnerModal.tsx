import React, { useState, useEffect, useRef } from 'react';
import { useHabitStore } from '../../store/useHabitStore';
import { formatLocalDate } from '../../lib/dateUtils';
import { playStepComplete, playTimerChime, sound } from '../../lib/audio';
import { X, Play, Pause, RotateCcw, Plus, CheckCircle2, ChevronRight, ChevronLeft, Sparkles, Flame, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { RoutineStack } from '../../lib/types';

interface RunnerProps {
  activeRoutine: RoutineStack;
}

const RoutineRunnerModalContent: React.FC<RunnerProps> = ({ activeRoutine }) => {
  const closeRoutineRunner = useHabitStore((s) => s.closeRoutineRunner);
  const habits = useHabitStore((s) => s.habits || []);
  const checkins = useHabitStore((s) => s.checkins || {});
  const toggleCheckin = useHabitStore((s) => s.toggleCheckin);
  const currentDate = useHabitStore((s) => s.currentDate || new Date());

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const timerRef = useRef<any>(null);

  const steps = activeRoutine.steps || [];
  const currentStep = steps[currentStepIndex];
  const linkedHabit = currentStep?.habit_id ? habits.find((h) => h.id === currentStep.habit_id) : null;
  const todayStr = formatLocalDate(currentDate);
  const isLinkedHabitDone = linkedHabit ? Boolean(checkins[`${linkedHabit.id}_${todayStr}`]?.completed) : false;

  // Initialize or reset timer when step changes
  useEffect(() => {
    if (!currentStep) return;
    const durSeconds = (currentStep.duration_minutes || 0) * 60;
    setSecondsRemaining(durSeconds);
    setTimerRunning(durSeconds > 0);
  }, [currentStepIndex, activeRoutine]);

  // Timer countdown
  useEffect(() => {
    if (!timerRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setTimerRunning(false);
          playTimerChime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  const totalSteps = steps.length;
  const progressPercent = totalSteps > 0 ? ((currentStepIndex + (isCompleted ? 1 : 0)) / totalSteps) * 100 : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleNextOrComplete = async () => {
    playStepComplete();

    // If step is linked to a habit and not yet completed today, mark it completed!
    if (linkedHabit && !isLinkedHabitDone) {
      await toggleCheckin(linkedHabit.id, todayStr);
    }

    if (currentStepIndex + 1 < totalSteps) {
      setCurrentStepIndex((idx) => idx + 1);
    } else {
      setIsCompleted(true);
      sound.playCelebration();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((idx) => idx - 1);
    }
  };

  const handleAddMinute = () => {
    setSecondsRemaining((prev) => prev + 60);
  };

  const handleResetTimer = () => {
    if (currentStep) {
      setSecondsRemaining((currentStep.duration_minutes || 0) * 60);
      setTimerRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]"
        style={{
          backgroundColor: 'var(--surface-primary, #18181b)',
          borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))',
          color: 'var(--text-primary, #ffffff)',
        }}
      >
        {/* Header bar */}
        <div className="p-4 sm:p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))' }}>
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl sm:text-3xl p-2 rounded-2xl bg-white/5 border border-white/10 shrink-0">
              {activeRoutine.emoji || '⚡'}
            </span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold truncate tracking-tight">{activeRoutine.title}</h2>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted, #a1a1aa)' }}>
                {activeRoutine.description || `${totalSteps} focused steps`}
              </p>
            </div>
          </div>
          <button
            onClick={closeRoutineRunner}
            className="p-2.5 rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-white shrink-0"
            title="Close Flow"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress Tracker Bar */}
        <div className="w-full bg-white/5 h-1.5 overflow-hidden">
          <div
            className="h-full transition-all duration-300 ease-out"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: activeRoutine.color || '#3b82f6',
            }}
          />
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-8 flex-1 overflow-y-auto flex flex-col justify-between space-y-6">
          {isCompleted ? (
            /* Routine Completed View */
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-bounce">
                <Sparkles size={40} />
              </div>
              <h3 className="text-2xl font-black tracking-tight">Routine Mastered!</h3>
              <p className="text-sm max-w-sm" style={{ color: 'var(--text-secondary, #d4d4d8)' }}>
                You completed all {totalSteps} steps in the <strong className="text-white">{activeRoutine.title}</strong> flow. Momentum unlocked!
              </p>
              <button
                onClick={closeRoutineRunner}
                className="mt-4 px-6 py-3.5 rounded-2xl font-bold bg-emerald-500 hover:bg-emerald-600 text-black shadow-lg transition-transform active:scale-95 text-sm"
              >
                Done & Return to Studio
              </button>
            </div>
          ) : (
            /* Active Step View */
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <span style={{ color: 'var(--text-muted, #a1a1aa)' }}>
                    Step {currentStepIndex + 1} of {totalSteps}
                  </span>
                  {linkedHabit && (
                    <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20 font-medium">
                      <Flame size={13} />
                      Stacks with Habit: {linkedHabit.name}
                    </span>
                  )}
                </div>

                {/* Step Headline & Notes */}
                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                    {currentStep?.notes || (linkedHabit ? linkedHabit.name : `Step #${currentStepIndex + 1}`)}
                  </h3>
                  {linkedHabit && currentStep?.notes && (
                    <p className="text-sm" style={{ color: 'var(--text-secondary, #d4d4d8)' }}>
                      Linked Habit: {linkedHabit.emoji} {linkedHabit.name}
                    </p>
                  )}
                </div>

                {/* Focus Timer Display */}
                {(currentStep?.duration_minutes || 0) > 0 ? (
                  <div className="my-6 p-6 rounded-3xl bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center space-y-4">
                    <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white">
                      {formatTime(secondsRemaining)}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setTimerRunning(!timerRunning)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm shadow-md transition-all active:scale-95 ${
                          timerRunning
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-white text-black hover:bg-zinc-200'
                        }`}
                      >
                        {timerRunning ? <Pause size={16} /> : <Play size={16} />}
                        {timerRunning ? 'Pause' : 'Start Timer'}
                      </button>
                      <button
                        onClick={handleAddMinute}
                        className="px-3.5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold border border-white/10 flex items-center gap-1 active:scale-95"
                        title="Add 1 minute"
                      >
                        <Plus size={14} /> 1m
                      </button>
                      <button
                        onClick={handleResetTimer}
                        className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 active:scale-95"
                        title="Reset timer"
                      >
                        <RotateCcw size={15} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="my-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3 text-xs text-muted-foreground">
                    <Clock size={16} className="text-zinc-400" />
                    <span>Instant habit action — complete at your own pace and proceed.</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t flex items-center justify-between gap-3" style={{ borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))' }}>
                <button
                  onClick={handlePrev}
                  disabled={currentStepIndex === 0}
                  className="px-4 py-3 rounded-2xl border text-sm font-semibold flex items-center gap-1 disabled:opacity-30 disabled:pointer-events-none hover:bg-white/5 active:scale-95"
                  style={{ borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))' }}
                >
                  <ChevronLeft size={16} />
                  Back
                </button>

                <div className="flex items-center gap-2">
                  {currentStepIndex + 1 < totalSteps && (
                    <button
                      onClick={() => setCurrentStepIndex((i) => i + 1)}
                      className="px-3.5 py-3 rounded-2xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 active:scale-95"
                    >
                      Skip
                    </button>
                  )}

                  <button
                    onClick={handleNextOrComplete}
                    className="px-5 sm:px-6 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg flex items-center gap-2 hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition-all"
                  >
                    <CheckCircle2 size={18} />
                    {currentStepIndex + 1 === totalSteps ? 'Finish Routine' : 'Complete & Next'}
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const RoutineRunnerModal: React.FC = () => {
  const activeRoutine = useHabitStore((s) => s.activeRoutineRunner);
  if (!activeRoutine) return null;

  return <RoutineRunnerModalContent activeRoutine={activeRoutine} />;
};
