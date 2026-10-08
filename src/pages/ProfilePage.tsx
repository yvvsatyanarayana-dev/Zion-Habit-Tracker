import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Header } from '../components/ui/Header';
import { useHabitStore } from '../store/useHabitStore';
import { computeStreakStats } from '../lib/statsUtils';
import {
  User,
  AtSign,
  Mail,
  Flame,
  Award,
  CheckCircle2,
  Calendar,
  LogOut,
  Edit3,
  Check,
  ShieldCheck,
  Sparkles,
  Trophy,
  Zap,
  KeyRound,
  UserPlus,
} from 'lucide-react';
import { format } from 'date-fns';

const AVATAR_COLORS = [
  '#ffffff', // Pure White
  '#27272a', // Obsidian Dark
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#f59e0b', // Amber
];

const isLightColor = (hex?: string) => {
  if (!hex) return false;
  const h = hex.toLowerCase().trim();
  return h === '#ffffff' || h === '#fff' || h === 'white';
};

export const ProfilePage: React.FC = () => {
  const currentUser = useHabitStore((s) => s.currentUser);
  const usersList = useHabitStore((s) => s.usersList);
  const updateProfile = useHabitStore((s) => s.updateProfile);
  const logoutUser = useHabitStore((s) => s.logoutUser);
  const switchUser = useHabitStore((s) => s.switchUser);
  const setAuthScreen = useHabitStore((s) => s.setAuthScreen);

  const habits = useHabitStore((s) => s.habits);
  const allCheckinsList = useHabitStore((s) => s.allCheckinsList);
  const streakThreshold = useHabitStore((s) => s.settings.streak_threshold);
  const currentDate = useHabitStore((s) => s.currentDate);

  const stats = computeStreakStats(
    habits,
    allCheckinsList,
    streakThreshold,
    currentDate
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editUsername, setEditUsername] = useState(currentUser?.username || '');
  const [editEmail, setEditEmail] = useState(currentUser?.email || '');
  const [editBio, setEditBio] = useState(currentUser?.bio || '');
  const [editColor, setEditColor] = useState(currentUser?.avatarColor || AVATAR_COLORS[0]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Security password state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const getInitials = (nameStr?: string) => {
    if (!nameStr) return 'U';
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    await updateProfile({
      name: editName.trim(),
      username: editUsername.trim().toLowerCase().replace(/^@/, ''),
      email: editEmail.trim(),
      bio: editBio.trim(),
      avatarColor: editColor,
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsEditing(false);
    }, 1200);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newPassword) return;

    await updateProfile({
      password: newPassword,
    });

    setPasswordSuccess(true);
    setNewPassword('');
    setTimeout(() => {
      setPasswordSuccess(false);
      setIsChangingPassword(false);
    }, 1500);
  };

  // Calculate consistency level based on total check-ins
  const level = Math.max(1, Math.floor(stats.totalCheckinsCount / 10) + 1);
  const nextLevelTarget = level * 10;
  const levelProgress = Math.min(100, Math.round(((stats.totalCheckinsCount % 10) / 10) * 100));

  const memberSinceStr = currentUser?.created_at
    ? format(new Date(currentUser.created_at), 'MMMM yyyy')
    : 'Recent Member';

  return (
    <div className="w-full max-w-[1300px] mx-auto pb-16 space-y-6 animate-in fade-in duration-200">
      <Header title="User Profile" />

      {/* ── TOP HERO CARD: IDENTITY & AVATAR ── */}
      <Card className="!p-6 relative overflow-hidden border">
        {/* Glow backdrop */}
        <div
          style={{
            background: `radial-gradient(circle at 10% 20%, ${
              currentUser?.avatarColor || '#6366f1'
            }22 0%, transparent 60%)`,
          }}
          className="absolute inset-0 pointer-events-none"
        />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Left: Avatar & Identity Details */}
          <div className="flex items-center gap-5">
            {/* 3D Round Avatar Disk */}
            <div className="relative flex-shrink-0">
              <div
                style={{
                  backgroundColor: currentUser?.avatarColor || '#ffffff',
                  color: isLightColor(currentUser?.avatarColor) ? '#09090b' : '#ffffff',
                  boxShadow: isLightColor(currentUser?.avatarColor)
                    ? '0 0 24px rgba(255, 255, 255, 0.25)'
                    : `0 0 30px ${currentUser?.avatarColor || '#6366f1'}40`,
                }}
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black ring-2 ring-white/15 border border-white/20 select-none shadow-xl"
              >
                {getInitials(currentUser?.name)}
              </div>
              <div
                style={{
                  backgroundColor: 'var(--text-primary)',
                  color: 'var(--bg-canvas)',
                }}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-[var(--bg-surface-elevated)] flex items-center justify-center shadow-md font-bold"
              >
                <Sparkles size={11} strokeWidth={2.6} />
              </div>
            </div>

            {/* Names & Handle */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  {currentUser?.name || 'Studio User'}
                </h2>
                <span className="px-2 py-0.5 rounded-[4px] text-[10.5px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center gap-1">
                  <Trophy size={11} />
                  <span>Level {level} Builder</span>
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-1 flex-wrap">
                <span className="text-[var(--text-secondary)] font-medium">
                  @{currentUser?.username || 'user'}
                </span>
                <span>•</span>
                <span>{currentUser?.email || 'user@example.com'}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-[var(--text-dim)]">
                  <Calendar size={12} />
                  <span>Member since {memberSinceStr}</span>
                </span>
              </div>

              {/* Personal motto */}
              <p className="text-xs text-[var(--text-secondary)] mt-2.5 max-w-xl leading-relaxed italic">
                &ldquo;{currentUser?.bio || 'Building consistent daily habits with Studio.'}&rdquo;
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            <button
              onClick={() => {
                setIsEditing(!isEditing);
                setEditName(currentUser?.name || '');
                setEditUsername(currentUser?.username || '');
                setEditEmail(currentUser?.email || '');
                setEditBio(currentUser?.bio || '');
                setEditColor(currentUser?.avatarColor || AVATAR_COLORS[0]);
              }}
              style={{
                backgroundColor: isEditing ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
              className="flex-1 md:flex-initial h-8 px-3 rounded-[5px] border text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--border-medium)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit3 size={13} />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
            </button>

            <button
              onClick={logoutUser}
              className="flex-1 md:flex-initial h-8 px-3 rounded-[5px] bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Sign out of current profile"
            >
              <LogOut size={13} />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* ── EXPANDABLE EDIT PROFILE FORM ── */}
        {isEditing && (
          <form
            onSubmit={handleSaveProfile}
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
            className="mt-6 pt-5 border-t rounded-[8px] p-4 space-y-4 animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                <Edit3 size={13} className="text-[var(--accent-primary)]" />
                <span>Edit Profile Details</span>
              </span>
              {saveSuccess && (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={13} /> Changes Saved!
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-[5px] border outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Handle (@username)
                </label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-[5px] border outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-[5px] border outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
            </div>

            {/* Profile color & motto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                  Avatar Accent Color
                </label>
                <div className="flex items-center gap-2">
                  {AVATAR_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setEditColor(col)}
                      style={{ backgroundColor: col }}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform cursor-pointer border border-white/15 ${
                        editColor === col ? 'scale-115 ring-2 ring-white/70 ring-offset-2 ring-offset-[var(--bg-surface)]' : 'hover:scale-105'
                      }`}
                    >
                      {editColor === col && (
                        <Check
                          size={11}
                          strokeWidth={3}
                          className={isLightColor(col) ? 'text-black' : 'text-white'}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Personal Motto / Rule
                </label>
                <input
                  type="text"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-[5px] border outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-xs rounded-[5px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  backgroundColor: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)',
                  boxShadow: 'var(--btn-primary-shadow)',
                }}
                className="px-4 py-1.5 text-xs font-bold rounded-[5px] hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Card>

      {/* ── CONSISTENCY RANK & PROGRESS TRACK ── */}
      <Card className="!p-5 border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Mastery Progression
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                Level {level}
              </span>
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)] mt-0.5">
              Habit Consistency XP
            </h3>
          </div>

          <div className="text-right">
            <span className="font-num text-xs font-bold text-[var(--text-primary)]">
              {stats.totalCheckinsCount} / {nextLevelTarget} check-ins
            </span>
            <span className="text-[11px] text-[var(--text-muted)] block">
              {nextLevelTarget - stats.totalCheckinsCount} more to Level {level + 1}
            </span>
          </div>
        </div>

        {/* Progress track */}
        <div className="w-full h-2.5 rounded-full bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] overflow-hidden">
          <div
            style={{ width: `${Math.max(levelProgress, 4)}%` }}
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500"
          />
        </div>
      </Card>

      {/* ── METRIC STATS 4-GRID ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 1. Current Streak */}
        <Card className="!p-4 border flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wider">Current Streak</span>
            <Flame size={16} className="text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-black font-num text-amber-400 leading-tight">
              {stats.currentStreak} <span className="text-xs font-medium text-[var(--text-muted)]">days</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Active daily momentum
            </p>
          </div>
        </Card>

        {/* 2. Best Streak */}
        <Card className="!p-4 border flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wider">All-Time Best</span>
            <Zap size={16} className="text-indigo-400" />
          </div>
          <div>
            <div className="text-2xl font-black font-num text-[var(--text-primary)] leading-tight">
              {stats.longestStreak} <span className="text-xs font-medium text-[var(--text-muted)]">days</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Longest unbroken run
            </p>
          </div>
        </Card>

        {/* 3. Total Check-ins */}
        <Card className="!p-4 border flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wider">Total Check-ins</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-black font-num text-[var(--text-primary)] leading-tight">
              {stats.totalCheckinsCount}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Verified logged activities
            </p>
          </div>
        </Card>

        {/* 4. Perfect Days */}
        <Card className="!p-4 border flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wider">Perfect Days</span>
            <Award size={16} className="text-yellow-400" />
          </div>
          <div>
            <div className="text-2xl font-black font-num text-[var(--text-primary)] leading-tight">
              {stats.perfectDaysCount}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              100% completion days
            </p>
          </div>
        </Card>
      </div>

      {/* ── SECURITY & MULTI-ACCOUNT MANAGEMENT ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Security / Password */}
        <Card className="!p-5 space-y-4 border">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <KeyRound size={16} className="text-[var(--accent-primary)]" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Security & Access</h3>
            </div>
            <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
              <ShieldCheck size={12} /> Local SQLite Encrypted
            </span>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Your profile and check-ins remain exclusively on this device. You can update your access password anytime.
          </p>

          {!isChangingPassword ? (
            <button
              onClick={() => setIsChangingPassword(true)}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
              className="h-8 px-3 rounded-[5px] border text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--border-medium)] transition-colors cursor-pointer"
            >
              Update Password
            </button>
          ) : (
            <form onSubmit={handleSavePassword} className="space-y-3 pt-1">
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password..."
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-[5px] border outline-none focus:border-[var(--accent-primary)] font-mono"
                />
              </div>

              {passwordSuccess && (
                <span className="text-xs font-bold text-emerald-400 block">
                  Password updated successfully!
                </span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  style={{
                    backgroundColor: 'var(--btn-primary-bg)',
                    color: 'var(--btn-primary-text)',
                    boxShadow: 'var(--btn-primary-shadow)',
                  }}
                  className="h-7 px-3 rounded-[5px] text-xs font-bold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Save New Password
                </button>
                <button
                  type="button"
                  onClick={() => setIsChangingPassword(false)}
                  className="h-7 px-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </Card>

        {/* Multi-Profile Switcher */}
        <Card className="!p-5 space-y-4 border">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <User size={16} className="text-[var(--accent-primary)]" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Profiles on this Device</h3>
            </div>
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              {usersList.length} Profile{usersList.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-2">
            {usersList.map((u) => {
              const isCurrent = u.id === currentUser?.id;
              return (
                <div
                  key={u.id}
                  style={{
                    backgroundColor: isCurrent ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                    borderColor: isCurrent ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  }}
                  className="flex items-center justify-between p-2.5 rounded-[6px] border transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      style={{
                        backgroundColor: u.avatarColor || '#ffffff',
                        color: isLightColor(u.avatarColor) ? '#09090b' : '#ffffff',
                      }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold border border-white/15"
                    >
                      {getInitials(u.name)[0]}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <span>{u.name}</span>
                        {isCurrent && (
                          <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-1 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)]">@{u.username}</span>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => switchUser(u.id)}
                      className="text-xs font-bold text-[var(--accent-primary)] hover:underline cursor-pointer"
                    >
                      Switch
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={() => setAuthScreen('register')}
              className="text-xs font-bold text-[var(--accent-primary)] hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus size={13} />
              <span>Create Another Profile</span>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
