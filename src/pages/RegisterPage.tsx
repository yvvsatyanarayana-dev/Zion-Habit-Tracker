import React, { useState } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import appLogo from '../assets/icon.png';
import {
  Sparkles,
  User,
  AtSign,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Check,
  AlertCircle,
} from 'lucide-react';

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

export const RegisterPage: React.FC = () => {
  const registerUser = useHabitStore((s) => s.registerUser);
  const setAuthScreen = useHabitStore((s) => s.setAuthScreen);
  const usersList = useHabitStore((s) => s.usersList);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('Small daily habits compound into massive achievements.');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!username.trim()) {
      setError('Please choose a username handle.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password && password.length < 4) {
      setError('Password should be at least 4 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const result = await registerUser({
      name: name.trim(),
      username: username.trim(),
      email: email.trim(),
      avatarColor,
      bio: bio.trim(),
      password,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Failed to create profile.');
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

      <div className="w-full max-w-[460px] relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Brand Emblem with Official Zion App Icon */}
        <div className="flex flex-col items-center text-center mb-3">
          <div className="relative mb-2 group">
            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-strong)',
                boxShadow: 'var(--shadow-card)',
              }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center p-2.5 border ring-1 ring-white/10 transition-shadow duration-300 relative overflow-hidden"
            >
              <img
                src={appLogo}
                alt="Zion"
                className="w-full h-full object-contain filter drop-shadow-md select-none pointer-events-none"
              />
            </div>
            <div
              style={{
                backgroundColor: 'var(--text-primary)',
                color: 'var(--bg-canvas)',
              }}
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[var(--bg-canvas)] flex items-center justify-center shadow-md font-bold"
              title="Zion Studio"
            >
              <Sparkles size={10} strokeWidth={2.5} />
            </div>
          </div>

          <div className="flex items-center gap-1.5 justify-center">
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Zion
            </h1>
          </div>
          <p className="text-[11.5px] text-[var(--text-secondary)] mt-0.5">
            Create your personal habit profile to get started
          </p>
        </div>

        {/* Studio Card Form */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-medium)',
            boxShadow: 'var(--shadow-dropdown)',
          }}
          className="rounded-[10px] border p-4 sm:p-5 backdrop-blur-xl"
        >
          {error && (
            <div className="mb-3 p-2.5 rounded-[6px] bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Full Name & Username in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!username && e.target.value) {
                        setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                      }
                    }}
                    placeholder="e.g. Alex Morgan"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[5px] border outline-none focus:border-[var(--accent-primary)] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Handle / Username
                </label>
                <div className="relative">
                  <AtSign size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                    placeholder="e.g. alex"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[5px] border outline-none focus:border-[var(--accent-primary)] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Email Address & Profile Color in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[5px] border outline-none focus:border-[var(--accent-primary)] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Profile Color
                </label>
                <div
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                  className="h-[30px] flex items-center justify-between px-2 rounded-[5px] border"
                >
                  {AVATAR_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setAvatarColor(col)}
                      style={{ backgroundColor: col }}
                      className={`w-4.5 h-4.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        avatarColor === col
                          ? 'scale-115 ring-2 ring-white/70 shadow-sm'
                          : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                    >
                      {avatarColor === col && (
                        <Check
                          size={9}
                          strokeWidth={3}
                          className={col === '#ffffff' ? 'text-black' : 'text-white'}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bio / Daily Motto */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Daily Focus / Motto
              </label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Your personal rule or daily motto..."
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                className="w-full px-3 py-1.5 text-xs rounded-[5px] border outline-none focus:border-[var(--accent-primary)] transition-colors"
              />
            </div>

            {/* Passwords in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[5px] border outline-none focus:border-[var(--accent-primary)] transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[5px] border outline-none focus:border-[var(--accent-primary)] transition-colors font-mono"
                  />
                </div>
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
              className="w-full mt-1.5 h-8.5 rounded-[5px] text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Creating Profile...' : 'Create Zion Profile'}</span>
              <ArrowRight size={14} />
            </button>
          </form>

          {/* Privacy note */}
          <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>Offline & securely stored on device</span>
            </span>

            {usersList.length > 0 && (
              <button
                type="button"
                onClick={() => setAuthScreen('login')}
                className="text-[var(--accent-primary)] hover:underline font-semibold cursor-pointer"
              >
                Log In instead
              </button>
            )}
          </div>
        </div>

        {/* Existing Users footer switch */}
        {usersList.length > 0 && (
          <div className="mt-2.5 text-center">
            <p className="text-[11.5px] text-[var(--text-secondary)]">
              Already have a profile?{' '}
              <button
                type="button"
                onClick={() => setAuthScreen('login')}
                className="font-bold text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors underline cursor-pointer"
              >
                Sign In to Zion
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
