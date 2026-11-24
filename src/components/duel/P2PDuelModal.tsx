import React, { useState, useEffect } from 'react';
import {
  X,
  Swords,
  Copy,
  Check,
  Users,
  Flame,
  Zap,
  Target,
  Trophy,
  ArrowRight,
  Radio,
  Share2,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { p2pDuelManager, type PeerDuelState } from '../../lib/p2pDuelEngine';
import { HabitIconView } from '../../lib/habitIcons';
import { sound } from '../../lib/audio';

const CHEER_OPTIONS = [
  { id: 'flame', icon: Flame, color: 'text-amber-400', label: 'Fire' },
  { id: 'zap', icon: Zap, color: 'text-indigo-400', label: 'Energy' },
  { id: 'target', icon: Target, color: 'text-emerald-400', label: 'Focus' },
  { id: 'trophy', icon: Trophy, color: 'text-yellow-400', label: 'Victory' },
  { id: 'sparkles', icon: Sparkles, color: 'text-purple-400', label: 'Cheer' },
];

const renderCheerIcon = (id: string, size = 12) => {
  switch (id) {
    case 'flame':
    case '🔥':
      return <Flame size={size} className="text-amber-400" />;
    case 'zap':
    case '⚡':
      return <Zap size={size} className="text-indigo-400" />;
    case 'target':
    case '🎯':
      return <Target size={size} className="text-emerald-400" />;
    case 'trophy':
    case '💪':
      return <Trophy size={size} className="text-yellow-400" />;
    case 'sparkles':
    case '👏':
    default:
      return <Sparkles size={size} className="text-purple-400" />;
  }
};

export const P2PDuelModal: React.FC = () => {
  const isOpen = useHabitStore((s) => s.p2pDuelModalOpen);
  const setOpen = useHabitStore((s) => s.setP2PDuelModalOpen);
  const habits = useHabitStore((s) => s.habits);
  const currentUser = useHabitStore((s) => s.currentUser);
  const awardXp = useHabitStore((s) => s.awardXp);

  const activeHabits = habits.filter((h) => !h.archived);
  const myName = currentUser?.name || currentUser?.username || 'Zion Challenger';

  const [duelState, setDuelState] = useState<PeerDuelState>(p2pDuelManager.getState());
  const [activeTab, setActiveTab] = useState<'hub' | 'create' | 'join'>('hub');

  // Creation form state
  const [selectedHabitName, setSelectedHabitName] = useState<string>(
    activeHabits[0]?.name || 'Daily Focus'
  );
  const [targetDays, setTargetDays] = useState<number>(7);
  const [stakeXp, setStakeXp] = useState<number>(100);
  const [isCreating, setIsCreating] = useState(false);

  // Join form state
  const [joinCode, setJoinCode] = useState<string>('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsub = p2pDuelManager.subscribe((st) => {
      setDuelState(st);
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      const code = await p2pDuelManager.createDuel(
        selectedHabitName,
        targetDays,
        stakeXp,
        myName
      );
      sound.playClick();
      setActiveTab('hub');
    } catch (err) {
      console.error('Failed to create duel room:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) return;
    setIsJoining(true);
    setJoinError(null);
    try {
      await p2pDuelManager.joinDuel(joinCode, myName, 0);
      sound.playCelebration();
      setActiveTab('hub');
    } catch (err: any) {
      setJoinError('Could not connect to room. Check code and verify host is online.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCopyCode = () => {
    if (!duelState.roomId) return;
    navigator.clipboard.writeText(duelState.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleIncrementProgress = () => {
    const nextVal = Math.min(duelState.targetDays, duelState.myProgress + 1);
    p2pDuelManager.sendProgressIncrement(nextVal, 50);
    sound.playCelebration();
    awardXp(50, 'discipline', `Duel Progress: ${duelState.habitName}`);

    if (nextVal >= duelState.targetDays) {
      awardXp(duelState.stakeXp, 'discipline', `Won Duel: ${duelState.habitName}!`);
    }
  };

  const handleCheer = (emoji: string) => {
    p2pDuelManager.sendCheer(emoji, myName);
    sound.playClick();
  };

  const myPct = Math.round((duelState.myProgress / Math.max(1, duelState.targetDays)) * 100);
  const peerPct = Math.round((duelState.peerProgress / Math.max(1, duelState.targetDays)) * 100);

  return (
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-[10px] animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--shadow-dropdown)',
        }}
        className="w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors"
      >
        {/* Header */}
        <div
          style={{ borderColor: 'var(--border-subtle)' }}
          className="px-6 py-4.5 border-b flex items-center justify-between gap-3 bg-gradient-to-r from-rose-500/10 via-purple-500/10 to-transparent"
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                backgroundColor: 'rgba(244, 63, 94, 0.15)',
                borderColor: 'rgba(244, 63, 94, 0.35)',
                color: '#f43f5e',
              }}
              className="w-11 h-11 rounded-2xl border flex items-center justify-center shadow-inner"
            >
              <Swords size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }} className="text-base sm:text-lg font-bold">
                  P2P Habit Duels & Accountability Mesh
                </h2>
                <span className="studio-badge-current">
                  SERVERLESS WEBRTC
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)' }} className="text-xs mt-0.5">
                Challenge an accountability partner directly without central accounts or cloud tracking.
              </p>
            </div>
          </div>

          <button
            onClick={() => setOpen(false)}
            style={{ color: 'var(--text-muted)' }}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
          }}
          className="px-6 pt-3 border-b flex items-center gap-5 text-xs font-semibold"
        >
          <button
            onClick={() => setActiveTab('hub')}
            className={`pb-2.5 transition-all cursor-pointer border-b-2 font-bold ${
              activeTab === 'hub'
                ? 'border-[var(--accent-primary)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Active Duel Arena
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 transition-all cursor-pointer border-b-2 font-bold ${
              activeTab === 'create'
                ? 'border-[var(--accent-primary)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Host New Duel
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`pb-2.5 transition-all cursor-pointer border-b-2 font-bold ${
              activeTab === 'join'
                ? 'border-[var(--accent-primary)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Join Room Code
          </button>
        </div>

        {/* Body Content */}
        <div style={{ backgroundColor: 'var(--bg-canvas)' }} className="flex-1 overflow-y-auto p-6">
          {activeTab === 'hub' && (
            duelState.roomId ? (
              /* Active Duel Room View */
              <div className="space-y-5">
                {/* Room Code & Connection Pill */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-subtle)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                  className="flex items-center justify-between p-3.5 rounded-2xl border"
                >
                  <div className="flex items-center gap-2.5">
                    <Radio
                      size={14}
                      className={duelState.connected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}
                    />
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      Room Code:{' '}
                      <span className="font-mono text-indigo-400 tracking-wider font-extrabold text-sm ml-1">
                        {duelState.roomId}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyCode}
                      style={{
                        backgroundColor: 'var(--bg-surface-subtle)',
                        borderColor: 'var(--border-subtle)',
                      }}
                      className="px-2.5 py-1 rounded-lg border text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer font-medium"
                    >
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                    <button
                      onClick={() => p2pDuelManager.disconnect()}
                      className="px-2.5 py-1 rounded-lg border border-rose-500/30 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <LogOut size={12} />
                      <span>Leave</span>
                    </button>
                  </div>
                </div>

                {/* Challenge Goal & Stake Card */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'rgba(99, 102, 241, 0.25)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                  className="p-4 rounded-2xl border flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider block">
                      HABIT CONTRACT
                    </span>
                    <h3 className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                      {duelState.habitName} ({duelState.targetDays} Days Sprint)
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono font-bold text-amber-400 block uppercase tracking-wider">
                      STAKE WAGER
                    </span>
                    <span className="text-sm font-bold text-[var(--text-primary)] font-num">
                      +{duelState.stakeXp} XP
                    </span>
                  </div>
                </div>

                {/* Side-by-Side Competitor Race */}
                <div className="space-y-3.5">
                  {/* You */}
                  <div
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-subtle)',
                      boxShadow: 'var(--shadow-card)',
                    }}
                    className="p-4 rounded-2xl border space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-sm" />
                        <span>You ({myName})</span>
                      </div>
                      <span className="font-num text-emerald-400 font-bold">
                        {duelState.myProgress} / {duelState.targetDays} Days ({myPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--bg-surface-subtle)] overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-all duration-500 rounded-full"
                        style={{ width: `${myPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Peer */}
                  <div
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-subtle)',
                      boxShadow: 'var(--shadow-card)',
                    }}
                    className="p-4 rounded-2xl border space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                        <span
                          className={`w-2.5 h-2.5 rounded-full inline-block shadow-sm ${
                            duelState.connected ? 'bg-indigo-400' : 'bg-amber-400'
                          }`}
                        />
                        <span>{duelState.peerName}</span>
                      </div>
                      <span className="font-num text-indigo-400 font-bold">
                        {duelState.peerProgress} / {duelState.targetDays} Days ({peerPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--bg-surface-subtle)] overflow-hidden">
                      <div
                        className="h-full bg-indigo-400 transition-all duration-500 rounded-full"
                        style={{ width: `${peerPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Live Action Bar */}
                <div
                  style={{ borderColor: 'var(--border-subtle)' }}
                  className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t"
                >
                  {/* Reaction Cheer Pings */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[var(--text-muted)] mr-1 font-mono uppercase tracking-wider text-[10px]">Cheer:</span>
                    {CHEER_OPTIONS.map((item) => {
                      const IconComp = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleCheer(item.id)}
                          style={{
                            backgroundColor: 'var(--bg-surface-elevated)',
                            borderColor: 'var(--border-subtle)',
                          }}
                          className="w-8 h-8 rounded-xl border hover:bg-[var(--bg-surface-subtle)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-xs"
                          title={item.label}
                        >
                          <IconComp size={14} className={item.color} />
                        </button>
                      );
                    })}
                  </div>

                  {/* Duel Check-In Button */}
                  <button
                    onClick={handleIncrementProgress}
                    disabled={duelState.myProgress >= duelState.targetDays}
                    style={{
                      backgroundColor: 'var(--btn-primary-bg)',
                      color: 'var(--btn-primary-text)',
                      boxShadow: 'var(--btn-primary-shadow)',
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:opacity-95 active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Check size={14} strokeWidth={2.5} />
                    <span>Log Today's Duel Check-in (+50 XP)</span>
                  </button>
                </div>

                {/* Recent Cheers Feed */}
                {duelState.recentCheers.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto text-xs py-1">
                    <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] shrink-0 font-bold">
                      Live Feed:
                    </span>
                    {duelState.recentCheers.map((c) => (
                      <span
                        key={c.id}
                        className="px-2.5 py-0.5 rounded-full border border-indigo-500/25 bg-indigo-500/10 text-indigo-300 text-[11px] font-semibold flex items-center gap-1.5 animate-in zoom-in-95 duration-200 shrink-0 font-num"
                      >
                        {renderCheerIcon(c.emoji, 12)}
                        <span>{c.sender} cheered!</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* No Active Duel Selected */
              <div className="py-14 text-center space-y-4">
                <div
                  style={{
                    backgroundColor: 'rgba(244, 63, 94, 0.1)',
                    borderColor: 'rgba(244, 63, 94, 0.25)',
                    color: '#f43f5e',
                  }}
                  className="w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto"
                >
                  <Swords size={28} />
                </div>
                <div>
                  <h3 style={{ color: 'var(--text-primary)' }} className="text-base font-bold">
                    No Active P2P Duel
                  </h3>
                  <p style={{ color: 'var(--text-muted)' }} className="text-xs max-w-sm mx-auto mt-1">
                    Host a duel room or enter a friend's 6-character room code to start an accountability sprint.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('create')}
                    style={{
                      backgroundColor: 'var(--btn-primary-bg)',
                      color: 'var(--btn-primary-text)',
                      boxShadow: 'var(--btn-primary-shadow)',
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-95 cursor-pointer"
                  >
                    Host a Duel Room
                  </button>
                  <button
                    onClick={() => setActiveTab('join')}
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                    className="px-4 py-2 rounded-xl border text-xs font-semibold hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    Enter Room Code
                  </button>
                </div>
              </div>
            )
          )}

          {activeTab === 'create' && (
            /* Host New Duel Form */
            <div className="space-y-4 max-w-md mx-auto py-2">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  1. Choose Habit to Duel On:
                </label>
                <select
                  value={selectedHabitName}
                  onChange={(e) => setSelectedHabitName(e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  className="w-full p-2.5 rounded-xl border text-xs outline-none font-medium"
                >
                  {activeHabits.map((h) => (
                    <option key={h.id} value={h.name}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  2. Challenge Duration:
                </label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {[7, 14, 21, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setTargetDays(d)}
                      style={
                        targetDays === d
                          ? {
                              borderColor: 'var(--accent-primary)',
                              backgroundColor: 'rgba(99, 102, 241, 0.15)',
                              color: 'var(--accent-primary)',
                            }
                          : {
                              borderColor: 'var(--border-subtle)',
                              backgroundColor: 'var(--bg-surface-elevated)',
                              color: 'var(--text-muted)',
                            }
                      }
                      className="p-2 rounded-xl border font-bold cursor-pointer transition-all font-num"
                    >
                      {d} Days
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  3. Stake XP Wager:
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[50, 100, 250].map((xp) => (
                    <button
                      key={xp}
                      type="button"
                      onClick={() => setStakeXp(xp)}
                      style={
                        stakeXp === xp
                          ? {
                              borderColor: '#f59e0b',
                              backgroundColor: 'rgba(245, 158, 11, 0.15)',
                              color: '#f59e0b',
                            }
                          : {
                              borderColor: 'var(--border-subtle)',
                              backgroundColor: 'var(--bg-surface-elevated)',
                              color: 'var(--text-muted)',
                            }
                      }
                      className="p-2 rounded-xl border font-bold cursor-pointer transition-all font-num"
                    >
                      +{xp} XP
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={handleCreateRoom}
                  style={{
                    backgroundColor: 'var(--btn-primary-bg)',
                    color: 'var(--btn-primary-text)',
                    boxShadow: 'var(--btn-primary-shadow)',
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-95 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? 'Generating P2P Room...' : 'Generate 6-Character Duel Room Code'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'join' && (
            /* Join Room Form */
            <div className="space-y-4 max-w-sm mx-auto py-6">
              <div className="text-center space-y-1">
                <h3 style={{ color: 'var(--text-primary)' }} className="text-sm font-bold">
                  Enter Challenger's Room Code
                </h3>
                <p style={{ color: 'var(--text-muted)' }} className="text-xs">
                  Enter the 6-character code shared by your accountability partner.
                </p>
              </div>

              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ZN4892"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  className="w-full text-center tracking-widest font-mono text-lg font-bold p-3 rounded-xl border placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              {joinError && (
                <p className="text-xs text-rose-400 text-center font-medium">
                  {joinError}
                </p>
              )}

              <button
                type="button"
                disabled={!joinCode.trim() || isJoining}
                onClick={handleJoinRoom}
                style={{
                  backgroundColor: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)',
                  boxShadow: 'var(--btn-primary-shadow)',
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-95 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isJoining ? 'Connecting Peer-to-Peer...' : 'Connect to Duel Room'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
