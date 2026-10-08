import React, { useState, useEffect } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import appLogo from '../assets/icon.png';
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  UserPlus,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AtSign,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const loginUser = useHabitStore((s) => s.loginUser);
  const setAuthScreen = useHabitStore((s) => s.setAuthScreen);
  const usersList = useHabitStore((s) => s.usersList);
  const prefilledIdentifier = useHabitStore((s) => s.prefilledAuthIdentifier);
  const authMessage = useHabitStore((s) => s.authMessage);

  const [identifier, setIdentifier] = useState(prefilledIdentifier || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (prefilledIdentifier) {
      setIdentifier(prefilledIdentifier);
    } else if (usersList.length > 0 && !identifier) {
      setIdentifier(usersList[0].username || usersList[0].email);
    }
  }, [prefilledIdentifier, usersList]);

  // Find matched profile to show avatar preview
  const matchedUser = usersList.find(
    (u) =>
      u.username.toLowerCase() === identifier.trim().toLowerCase().replace(/^@/, '') ||
      u.email.toLowerCase() === identifier.trim().toLowerCase()
  );

  const getInitials = (nameStr?: string) => {
    if (!nameStr) return 'U';
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError('Please enter your username or email.');
      return;
    }

    setIsSubmitting(true);
    const result = await loginUser(identifier.trim(), password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Failed to log in.');
    }
  };

  return (
    <div
      style={{ backgroundColor: 'var(--bg-canvas)' }}
      className="h-full w-full flex flex-col justify-center items-center px-4 py-2 select-none relative overflow-hidden"
    >
      {/* Background Studio Glow Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[radial-gradient(circle,rgba(99,102,241,0.12)_0%,transparent_70%)] blur-3xl" />
        <div className="absolute -bottom-[20%] right-[10%] w-[450px] h-[350px] bg-[radial-gradient(circle,rgba(16,185,129,0.08)_0%,transparent_70%)] blur-3xl" />
      </div>

      <div className="w-full max-w-[420px] relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Brand Emblem / User Avatar */}
        <div className="flex flex-col items-center text-center mb-4">
          <div className="relative mb-2 group">
            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-strong)',
                boxShadow: 'var(--shadow-card)',
              }}
              className="w-14 h-14 rounded-2xl border flex items-center justify-center text-[var(--text-primary)] text-xl font-black transition-all duration-300 ring-1 ring-white/10"
            >
              {matchedUser ? (
                <span>{getInitials(matchedUser.name)}</span>
              ) : (
                <img
                  src={appLogo}
                  alt="Zion"
                  className="w-8 h-8 object-contain filter drop-shadow select-none pointer-events-none"
                />
              )}
            </div>
            <div
              style={{
                backgroundColor: 'var(--text-primary)',
                color: 'var(--bg-canvas)',
              }}
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[var(--bg-canvas)] flex items-center justify-center shadow-md font-bold"
            >
              <Sparkles size={10} strokeWidth={2.5} />
            </div>
          </div>

          <div className="flex items-center gap-1.5 justify-center">
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              {matchedUser ? `Welcome, ${matchedUser.name}` : 'Sign In to Zion'}
            </h1>
          </div>
          <p className="text-[11.5px] text-[var(--text-secondary)] mt-0.5">
            {matchedUser
              ? `@${matchedUser.username} · Enter your password to continue`
              : 'Access your habits, streaks, and progress ledger'}
          </p>
        </div>

        {/* Studio Card Form */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-medium)',
            boxShadow: 'var(--shadow-dropdown)',
          }}
          className="rounded-[10px] border p-5 sm:p-6 backdrop-blur-xl"
        >
          {/* Notification banner after registration */}
          {authMessage && (
            <div className="mb-4 p-3 rounded-[6px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 size={15} className="flex-shrink-0" />
              <span>{authMessage}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username / Email */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Username or Email
              </label>
              <div className="relative">
                <AtSign size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. alex or alex@example.com"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-[5px] border outline-none focus:border-[var(--accent-primary)] transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Password
                </label>
                <span className="text-[10.5px] text-[var(--text-dim)]">
                  (Optional if none set)
                </span>
              </div>
              <div className="relative">
                <Lock size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  className="w-full pl-8 pr-8 py-2 text-xs rounded-[5px] border outline-none focus:border-[var(--accent-primary)] transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ color: 'var(--text-muted)' }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                backgroundColor: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)',
                boxShadow: 'var(--btn-primary-shadow)',
              }}
              className="w-full mt-2 h-9 rounded-[5px] text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Signing In...' : 'Sign In to Zion'}</span>
              <ArrowRight size={14} />
            </button>
          </form>

          {/* Quick profile switchers if multiple accounts exist */}
          {usersList.length > 1 && (
            <div className="mt-4 pt-3.5 border-t border-[var(--border-subtle)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] block mb-2">
                Available Profiles
              </span>
              <div className="flex flex-wrap gap-1.5">
                {usersList.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setIdentifier(u.username || u.email);
                      setPassword('');
                      setError(null);
                    }}
                    style={{
                      backgroundColor:
                        matchedUser?.id === u.id ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                      borderColor:
                        matchedUser?.id === u.id ? 'var(--text-primary)' : 'var(--border-subtle)',
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-[4px] border text-[11px] font-medium transition-colors cursor-pointer hover:border-[var(--border-medium)]"
                  >
                    <span
                      style={{
                        backgroundColor: u.avatarColor || '#ffffff',
                        color: (u.avatarColor?.toLowerCase() === '#ffffff' || u.avatarColor?.toLowerCase() === '#fff' || u.avatarColor === 'white') ? '#09090b' : '#ffffff',
                      }}
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold border border-white/10"
                    >
                      {getInitials(u.name)[0]}
                    </span>
                    <span className="text-[var(--text-secondary)]">{u.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Privacy info */}
          <div className="mt-4 pt-3.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>Offline SQLite encryption</span>
            </span>

            <button
              type="button"
              onClick={() => setAuthScreen('register')}
              className="text-[var(--accent-primary)] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <UserPlus size={12} />
              <span>New Profile</span>
            </button>
          </div>
        </div>

        {/* Create Profile link footer */}
        <div className="mt-3 text-center">
          <p className="text-[11.5px] text-[var(--text-secondary)]">
            Don&apos;t have a profile?{' '}
            <button
              type="button"
              onClick={() => setAuthScreen('register')}
              className="font-bold text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors underline cursor-pointer"
            >
              Create Zion Profile
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
