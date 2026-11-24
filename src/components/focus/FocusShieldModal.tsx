import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldAlert,
  ShieldCheck,
  Plus,
  X,
  Award,
  Clock,
  Coffee,
  Globe,
  Share2,
  ChevronDown,
  ChevronUp,
  Zap,
  CheckCheck,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { sound } from '../../lib/audio';

// Internal domain and keyword rules - never exposed in UI text
const SOCIAL_DOMAINS = [
  'youtube.com',
  'twitter.com',
  'x.com',
  'reddit.com',
  'instagram.com',
  'tiktok.com',
  'twitch.tv',
  'netflix.com',
  'facebook.com',
  '9gag.com',
  'pinterest.com',
  'snapchat.com',
  'linkedin.com',
  'threads.net',
  'discord.com',
  'tumblr.com',
  'vimeo.com',
  'dailymotion.com',
];

const SOCIAL_KEYWORDS = [
  'youtube',
  'twitter',
  'reddit',
  'twitch',
  'netflix',
  'instagram',
  'tiktok',
  'facebook',
  'snapchat',
  'threads',
  'discord',
  '9gag',
  'pinterest',
  'linkedin',
  'tumblr',
  'vimeo',
];

const ADULT_DOMAINS = [
  'pornhub.com',
  'xvideos.com',
  'xnxx.com',
  'redtube.com',
  'xhamster.com',
  'youporn.com',
  'onlyfans.com',
  'fansly.com',
  'chaturbate.com',
  'stripchat.com',
  'cam4.com',
  'bongacams.com',
  'spankbang.com',
  'tube8.com',
  'beeg.com',
  'brazzers.com',
  'eporner.com',
  'tnaflix.com',
  'porn.com',
  'erome.com',
];

const ADULT_KEYWORDS = [
  'pornhub',
  'xvideos',
  'xnxx',
  'redtube',
  'xhamster',
  'youporn',
  'onlyfans',
  'fansly',
  'chaturbate',
  'stripchat',
  'bongacams',
  'spankbang',
  'brazzers',
  'eporner',
  'erome',
  'cam4',
  'tnaflix',
];

export const FocusShieldModal: React.FC = () => {
  const isOpen = useHabitStore((s) => s.focusShieldModalOpen);
  const setIsOpen = useHabitStore((s) => s.setFocusShieldModalOpen);

  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<'gentle' | 'strict'>('gentle');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [blockedDomains, setBlockedDomains] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [stats, setStats] = useState({ todayDeflections: 0, totalDeflections: 0 });
  const [cooldownRemaining, setCooldownRemaining] = useState<number | null>(null);

  // Dedicated independent boolean states for both shields
  const [socialShield, setSocialShield] = useState(true);
  const [adultShield, setAdultShield] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCustomRules, setShowCustomRules] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (window.api?.focusShield) {
      void window.api.focusShield.getConfig().then((cfg) => {
        if (cfg) {
          setEnabled(cfg.enabled ?? true);
          setMode(cfg.mode || 'gentle');
          if (cfg.blockedKeywords) setKeywords(cfg.blockedKeywords);
          if (cfg.blockedDomains) setBlockedDomains(cfg.blockedDomains);

          // Determine independent shield states
          const hasSocial =
            cfg.socialShieldEnabled !== undefined
              ? Boolean(cfg.socialShieldEnabled)
              : (cfg.blockedDomains || []).some((d: string) => SOCIAL_DOMAINS.includes(d));

          const hasAdult =
            cfg.adultShieldEnabled !== undefined
              ? Boolean(cfg.adultShieldEnabled)
              : (cfg.blockedDomains || []).some((d: string) => ADULT_DOMAINS.includes(d));

          setSocialShield(hasSocial);
          setAdultShield(hasAdult);

          if (cfg.emergencyCooldownUntil && cfg.emergencyCooldownUntil > Date.now()) {
            setCooldownRemaining(Math.round((cfg.emergencyCooldownUntil - Date.now()) / 1000));
          }
        }
      });

      void window.api.focusShield.getStats().then((st) => {
        if (st) setStats(st);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!cooldownRemaining || cooldownRemaining <= 0) return;
    const id = setInterval(() => {
      setCooldownRemaining((prev) => (prev && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownRemaining]);

  if (!isOpen) return null;

  // Filter out system domain/keyword rules from user-visible custom chips
  const customKeywords = keywords.filter(
    (kw) => !ADULT_KEYWORDS.includes(kw.toLowerCase()) && !SOCIAL_KEYWORDS.includes(kw.toLowerCase())
  );
  const customDomains = blockedDomains.filter(
    (dm) => !ADULT_DOMAINS.includes(dm.toLowerCase()) && !SOCIAL_DOMAINS.includes(dm.toLowerCase())
  );

  const handleToggleEnabled = async () => {
    const next = !enabled;
    setEnabled(next);
    sound.playClick();
    if (window.api?.focusShield) {
      await window.api.focusShield.updateConfig({ enabled: next });
    }
  };

  const handleToggleMode = async (newMode: 'gentle' | 'strict') => {
    setMode(newMode);
    sound.playClick();
    if (window.api?.focusShield) {
      await window.api.focusShield.updateConfig({ mode: newMode });
    }
  };

  // Unified Shield State Synchronizer - allows enabling BOTH, either, or neither
  const updateShields = async (nextSocial: boolean, nextAdult: boolean) => {
    setSocialShield(nextSocial);
    setAdultShield(nextAdult);
    setIsProcessing(true);
    sound.playClick();

    try {
      const userCustomKeywords = keywords.filter(
        (kw) => !ADULT_KEYWORDS.includes(kw.toLowerCase()) && !SOCIAL_KEYWORDS.includes(kw.toLowerCase())
      );
      const userCustomDomains = blockedDomains.filter(
        (dm) => !ADULT_DOMAINS.includes(dm.toLowerCase()) && !SOCIAL_DOMAINS.includes(dm.toLowerCase())
      );

      const nextKeywords = [
        ...userCustomKeywords,
        ...(nextSocial ? SOCIAL_KEYWORDS : []),
        ...(nextAdult ? ADULT_KEYWORDS : []),
      ];

      const nextDomains = [
        ...userCustomDomains,
        ...(nextSocial ? SOCIAL_DOMAINS : []),
        ...(nextAdult ? ADULT_DOMAINS : []),
      ];

      setKeywords(nextKeywords);
      setBlockedDomains(nextDomains);

      if (window.api?.focusShield) {
        await window.api.focusShield.updateConfig({
          socialShieldEnabled: nextSocial,
          adultShieldEnabled: nextAdult,
          blockedDomains: nextDomains,
          blockedKeywords: nextKeywords,
          webShieldEnabled: nextSocial || nextAdult,
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Custom Keyword Add/Remove
  const handleAddCustomKeyword = async () => {
    const trimmed = newKeyword.trim().toLowerCase();
    if (!trimmed || keywords.includes(trimmed)) return;

    const next = [...keywords, trimmed];
    setKeywords(next);
    setNewKeyword('');
    sound.playClick();
    if (window.api?.focusShield) {
      await window.api.focusShield.updateConfig({ blockedKeywords: next });
    }
  };

  const handleRemoveCustomKeyword = async (target: string) => {
    const next = keywords.filter((k) => k !== target);
    setKeywords(next);
    sound.playClick();
    if (window.api?.focusShield) {
      await window.api.focusShield.updateConfig({ blockedKeywords: next });
    }
  };

  // Custom Domain Add/Remove
  const handleAddCustomDomain = async () => {
    const raw = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!raw || blockedDomains.includes(raw)) return;

    const next = [...blockedDomains, raw];
    setBlockedDomains(next);
    setNewDomain('');
    sound.playClick();
    if (window.api?.focusShield) {
      await window.api.focusShield.updateConfig({
        blockedDomains: next,
        webShieldEnabled: true,
      });
    }
  };

  const handleRemoveCustomDomain = async (target: string) => {
    const next = blockedDomains.filter((d) => d !== target);
    setBlockedDomains(next);
    sound.playClick();
    if (window.api?.focusShield) {
      await window.api.focusShield.updateConfig({
        blockedDomains: next,
      });
    }
  };

  const handleRequestBypass = async () => {
    sound.playClick();
    setCooldownRemaining(300); // 5 minutes
    if (window.api?.focusShield) {
      await window.api.focusShield.requestBypass(5);
    }
  };

  const bothActive = socialShield && adultShield;
  const neitherActive = !socialShield && !adultShield;

  return createPortal(
    <div
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(16px)',
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in"
      onClick={() => setIsOpen(false)}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-subtle)',
          boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        }}
        className="w-full max-w-xl rounded-2xl border p-6 space-y-5 relative max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                borderColor: 'rgba(99, 102, 241, 0.25)',
                color: 'var(--accent-primary)',
              }}
              className="w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-inner"
            >
              <ShieldCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-black tracking-tight">
                  Focus Shield Firewall
                </h2>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                    enabled
                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25'
                      : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${enabled ? 'bg-indigo-400 animate-pulse' : 'bg-zinc-500'}`} />
                  {enabled ? 'GUARD ACTIVE' : 'DISARMED'}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-0.5">
                Real-time OS-level DNS loopback and active process interception to eliminate digital distractions.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            style={{ color: 'var(--text-muted)' }}
            className="p-1.5 rounded-xl hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Gamified Stats Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
            className="p-3 rounded-xl border text-center"
          >
            <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Intercepted Today
            </div>
            <div style={{ color: 'var(--accent-primary)' }} className="text-xl font-black font-mono mt-1">
              {stats.todayDeflections}
            </div>
          </div>

          <div
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
            className="p-3 rounded-xl border text-center"
          >
            <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              All-Time Deflected
            </div>
            <div style={{ color: 'var(--text-primary)' }} className="text-xl font-black font-mono mt-1">
              {stats.totalDeflections}
            </div>
          </div>

          <div
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
            className="p-3 rounded-xl border text-center"
          >
            <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Discipline XP
            </div>
            <div className="text-xl font-black font-mono mt-1 text-amber-400 flex items-center justify-center gap-1">
              <Award size={16} />
              <span>+{stats.totalDeflections * 15}</span>
            </div>
          </div>
        </div>

        {/* Master Firewall Status & Intensity Controls */}
        <div
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          className="p-4 rounded-xl border space-y-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <div style={{ color: 'var(--text-primary)' }} className="text-xs font-bold">
                Firewall Protection Engine
              </div>
              <div style={{ color: 'var(--text-muted)' }} className="text-[11px]">
                Monitors foreground desktop applications and browser window titles.
              </div>
            </div>

            <button
              onClick={handleToggleEnabled}
              style={{
                backgroundColor: enabled ? 'var(--accent-primary)' : 'var(--bg-surface-subtle)',
                color: enabled ? '#ffffff' : 'var(--text-secondary)',
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              {enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
            <div>
              <div style={{ color: 'var(--text-primary)' }} className="text-xs font-bold">
                Interception Intensity
              </div>
              <div style={{ color: 'var(--text-muted)' }} className="text-[11px]">
                Gentle nudge notification or strict full-screen barrier.
              </div>
            </div>

            <div
              style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)' }}
              className="p-1 rounded-xl border flex items-center gap-1 text-xs font-semibold"
            >
              <button
                onClick={() => handleToggleMode('gentle')}
                style={
                  mode === 'gentle'
                    ? { backgroundColor: 'var(--accent-primary)', color: '#ffffff' }
                    : { color: 'var(--text-secondary)' }
                }
                className="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
              >
                Gentle Nudge
              </button>
              <button
                onClick={() => handleToggleMode('strict')}
                style={
                  mode === 'strict'
                    ? { backgroundColor: 'var(--accent-primary)', color: '#ffffff' }
                    : { color: 'var(--text-secondary)' }
                }
                className="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
              >
                Strict Guard
              </button>
            </div>
          </div>
        </div>

        {/* PRIMARY CONTROLS: Dual-Shield Firewall (Both Can Be Enabled Simultaneously) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-xs font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <span>Dual-Shield Protection Modules</span>
                <span
                  className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    bothActive
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : neitherActive
                      ? 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
                      : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                  }`}
                >
                  {bothActive
                    ? '🔥 FULL FORTRESS: BOTH SHIELDS ACTIVE'
                    : socialShield
                    ? '1 of 2 Active: Social Media'
                    : adultShield
                    ? '1 of 2 Active: 18+ Content'
                    : 'All Web Shields Disarmed'}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)' }} className="text-[11px] mt-0.5">
                Enable either or both shields at the same time for total digital isolation.
              </p>
            </div>

            {/* Quick 1-Click Master Actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => updateShields(true, true)}
                disabled={isProcessing || bothActive}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                  bothActive
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 opacity-70'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500/40'
                }`}
              >
                <Zap size={11} />
                <span>Enable Both</span>
              </button>

              <button
                type="button"
                onClick={() => updateShields(false, false)}
                disabled={isProcessing || neitherActive}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] hover:text-rose-400 hover:border-rose-500/30 transition-all cursor-pointer disabled:opacity-40"
              >
                Disable All
              </button>
            </div>
          </div>

          {/* Module 1: Social Media Shield */}
          <div
            onClick={() => !isProcessing && updateShields(!socialShield, adultShield)}
            style={{
              backgroundColor: socialShield ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-surface)',
              borderColor: socialShield ? 'rgba(99, 102, 241, 0.35)' : 'var(--border-subtle)',
            }}
            className="p-4 rounded-xl border flex items-center justify-between gap-4 transition-all shadow-sm cursor-pointer hover:border-indigo-500/40 group select-none"
          >
            <div className="flex items-start gap-3">
              <div
                style={{
                  backgroundColor: socialShield ? 'rgba(99, 102, 241, 0.16)' : 'var(--bg-surface-subtle)',
                  color: socialShield ? '#818cf8' : 'var(--text-muted)',
                }}
                className="w-10 h-10 rounded-xl border border-current/20 flex items-center justify-center shrink-0 mt-0.5"
              >
                <Share2 size={20} />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ color: 'var(--text-primary)' }} className="text-xs font-bold">
                    Social Media & Feeds Shield
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      socialShield
                        ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                        : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
                    }`}
                  >
                    {socialShield ? 'PROTECTED (ON)' : 'OFF'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)' }} className="text-[11px] mt-0.5 leading-relaxed">
                  Real-time OS DNS loopback & window interception for social platforms, endless scroll feeds, and video feeds.
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    OS-LEVEL DNS
                  </span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    WINDOW HOOK
                  </span>
                </div>
              </div>
            </div>

            {/* High-Tech Switch Slider */}
            <div className="shrink-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                role="switch"
                aria-checked={socialShield}
                disabled={isProcessing}
                onClick={() => updateShields(!socialShield, adultShield)}
                style={{
                  backgroundColor: socialShield ? '#6366f1' : 'rgba(255, 255, 255, 0.1)',
                }}
                className="w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out relative cursor-pointer focus:outline-none disabled:opacity-50"
              >
                <span
                  style={{
                    backgroundColor: '#ffffff',
                    transform: socialShield ? 'translateX(24px)' : 'translateX(0px)',
                  }}
                  className="w-5 h-5 rounded-full block transition-transform duration-200 ease-in-out shadow-md"
                />
              </button>
            </div>
          </div>

          {/* Module 2: 18+ Adult Content Shield */}
          <div
            onClick={() => !isProcessing && updateShields(socialShield, !adultShield)}
            style={{
              backgroundColor: adultShield ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.06)',
              borderColor: adultShield ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.25)',
            }}
            className="p-4 rounded-xl border flex items-center justify-between gap-4 transition-all shadow-sm cursor-pointer hover:border-emerald-500/40 group select-none"
          >
            <div className="flex items-start gap-3">
              <div
                style={{
                  backgroundColor: adultShield ? 'rgba(16, 185, 129, 0.16)' : 'rgba(244, 63, 94, 0.15)',
                  color: adultShield ? '#10b981' : '#f43f5e',
                }}
                className="w-10 h-10 rounded-xl border border-current/20 flex items-center justify-center shrink-0 mt-0.5"
              >
                <ShieldAlert size={20} />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ color: 'var(--text-primary)' }} className="text-xs font-bold">
                    18+ Adult Content Shield
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      adultShield
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {adultShield ? '18+ BLOCKED (ON)' : 'OFF'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)' }} className="text-[11px] mt-0.5 leading-relaxed">
                  Zero-tolerance system-level DNS loopback firewall that blocks adult content and explicit streaming platforms.
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    KERNEL & OS DNS LOOPBACK
                  </span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ZERO EXPOSURE
                  </span>
                </div>
              </div>
            </div>

            {/* High-Tech Switch Slider */}
            <div className="shrink-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                role="switch"
                aria-checked={adultShield}
                disabled={isProcessing}
                onClick={() => updateShields(socialShield, !adultShield)}
                style={{
                  backgroundColor: adultShield ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                }}
                className="w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out relative cursor-pointer focus:outline-none disabled:opacity-50"
              >
                <span
                  style={{
                    backgroundColor: '#ffffff',
                    transform: adultShield ? 'translateX(24px)' : 'translateX(0px)',
                  }}
                  className="w-5 h-5 rounded-full block transition-transform duration-200 ease-in-out shadow-md"
                />
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Advanced Custom Rules (Zero hardcoded site names) */}
        <div className="pt-2 border-t border-[var(--border-subtle)] space-y-3">
          <button
            type="button"
            onClick={() => setShowCustomRules(!showCustomRules)}
            className="w-full flex items-center justify-between text-xs font-semibold py-1 cursor-pointer transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span className="flex items-center gap-1.5">
              <span>Custom Blocking Rules</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                {customKeywords.length + customDomains.length}
              </span>
            </span>
            {showCustomRules ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {showCustomRules && (
            <div className="space-y-4 pt-1 animate-fade-in">
              {/* Custom Keyword Section */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>
                  Add Custom Distraction Keyword or Process Name
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomKeyword()}
                    placeholder="e.g. distraction-name, custom-game..."
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                    className="flex-1 px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-indigo-500/60 font-mono"
                  />
                  <button
                    onClick={handleAddCustomKeyword}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm shrink-0"
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </div>

                {customKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                    {customKeywords.map((kw) => (
                      <span
                        key={kw}
                        style={{
                          backgroundColor: 'var(--bg-surface-subtle)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-secondary)',
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono group hover:border-rose-500/40"
                      >
                        <span>{kw}</span>
                        <button
                          onClick={() => handleRemoveCustomKeyword(kw)}
                          className="text-zinc-500 hover:text-rose-400 cursor-pointer"
                          title="Remove custom rule"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10.5px] italic text-zinc-500 pl-1">
                    No custom keywords added. System modules handle all core distractions automatically.
                  </p>
                )}
              </div>

              {/* Custom Domain Section */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>
                  Add Custom Domain to Intercept
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomDomain()}
                    placeholder="e.g. example.com..."
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                    className="flex-1 px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-indigo-500/60 font-mono"
                  />
                  <button
                    onClick={handleAddCustomDomain}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm shrink-0"
                  >
                    <Plus size={14} />
                    <span>Block</span>
                  </button>
                </div>

                {customDomains.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                    {customDomains.map((dm) => (
                      <span
                        key={dm}
                        style={{
                          backgroundColor: 'var(--bg-surface-subtle)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-secondary)',
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono group hover:border-indigo-500/40"
                      >
                        <Globe size={11} className="text-indigo-400" />
                        <span>{dm}</span>
                        <button
                          onClick={() => handleRemoveCustomDomain(dm)}
                          className="text-zinc-500 hover:text-rose-400 cursor-pointer ml-0.5"
                          title="Remove custom domain"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10.5px] italic text-zinc-500 pl-1">
                    No custom domains added. System modules handle all core distractions automatically.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Emergency 5-Minute Bypass */}
        <div
          style={{ borderColor: 'var(--border-subtle)' }}
          className="pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        >
          <div style={{ color: 'var(--text-muted)' }} className="flex items-center gap-1.5">
            <Coffee size={14} className="text-amber-400" />
            <span>Need a quick breather without trigger warnings?</span>
          </div>

          {cooldownRemaining ? (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold flex items-center gap-1.5">
              <Clock size={13} className="animate-spin" />
              <span>
                Pause Active: {Math.floor(cooldownRemaining / 60)}m {cooldownRemaining % 60}s
              </span>
            </div>
          ) : (
            <button
              onClick={handleRequestBypass}
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
              className="px-3.5 py-1.5 rounded-xl border font-semibold hover:text-[var(--text-primary)] hover:border-[var(--border-medium)] transition-colors cursor-pointer shrink-0"
            >
              5-Minute Break Pass
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
