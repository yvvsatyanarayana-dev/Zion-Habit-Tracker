import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Eye,
  Camera,
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2,
  Clock,
  Lock,
  X,
  Sparkles,
  Video,
  VideoOff,
  Copy,
  Check,
  ChevronDown,
  Search,
  Award,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import {
  VisionSentinelEngine,
  SentinelTelemetry,
  ProofOfWorkReceipt,
} from '../../lib/visionSentinelEngine';
import { generateProofCertificateDataUrl } from '../../lib/proofCertificate';
import { sound } from '../../lib/audio';
import confetti from 'canvas-confetti';

export const AiVisionSentinelModal: React.FC = () => {
  const isOpen = useHabitStore((s) => s.aiVisionSentinelModalOpen);
  const setOpen = useHabitStore((s) => s.setAiVisionSentinelModalOpen);
  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const currentDate = useHabitStore((s) => s.currentDate);
  const toggleCheckin = useHabitStore((s) => s.toggleCheckin);
  const addHabitProof = useHabitStore((s) => s.addHabitProof);
  const awardXp = useHabitStore((s) => s.awardXp);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const engineRef = useRef<VisionSentinelEngine | null>(null);

  const [telemetry, setTelemetry] = useState<SentinelTelemetry>({
    focusState: 'INITIALIZING',
    attentionScore: 95,
    movementVelocity: 12,
    facePresent: true,
    totalSeconds: 0,
    lockedInSeconds: 0,
    driftingSeconds: 0,
    awaySeconds: 0,
    integrityPercentage: 100,
  });

  const [cameraActive, setCameraActive] = useState(false);
  const [isShutterClosed, setIsShutterClosed] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState<string>('');
  const [habitDropdownOpen, setHabitDropdownOpen] = useState(false);
  const [habitSearch, setHabitSearch] = useState('');
  const [issuedReceipt, setIssuedReceipt] = useState<ProofOfWorkReceipt | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const todayStr = currentDate.toISOString().slice(0, 10);
  const activeHabits = habits.filter((h) => !h.archived);
  const selectedHabit = activeHabits.find((h) => h.id === selectedHabitId) || activeHabits[0];

  // Initialize selected habit
  useEffect(() => {
    if (activeHabits.length > 0 && !selectedHabitId) {
      setSelectedHabitId(activeHabits[0].id);
    }
  }, [activeHabits, selectedHabitId]);

  // Comprehensive hardware camera track termination
  const handleClose = () => {
    sound.playClick();
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
            track.enabled = false;
          } catch {}
        });
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch {}
    }

    setCameraActive(false);
    setIsShutterClosed(false);
    setIssuedReceipt(null);
    setOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setHabitDropdownOpen(false);
      }
    };
    if (habitDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [habitDropdownOpen]);

  // Close modal and stop camera on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Start Sentinel on Modal Open
  useEffect(() => {
    if (!isOpen) {
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }
      setCameraActive(false);
      return;
    }

    let isCancelled = false;
    const startSentinel = async () => {
      if (!videoRef.current || isCancelled) return;
      const engine = new VisionSentinelEngine();
      engineRef.current = engine;

      const success = await engine.start(videoRef.current, (newTelem) => {
        if (!isCancelled) {
          setTelemetry({ ...newTelem });
        }
      });

      if (!isCancelled) {
        setCameraActive(success);
      } else {
        engine.stop();
      }
    };

    const timer = setTimeout(() => {
      void startSentinel();
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        try {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((t) => {
            t.stop();
            t.enabled = false;
          });
          videoRef.current.pause();
          videoRef.current.srcObject = null;
        } catch {}
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleToggleShutter = () => {
    if (!engineRef.current) return;
    sound.playClick();
    const isClosed = engineRef.current.toggleShutter();
    setIsShutterClosed(isClosed);
  };

  const handleMintProof = async () => {
    if (!engineRef.current || !selectedHabit) return;

    sound.playCelebration();
    confetti({
      particleCount: 65,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#34d399', '#10b981', '#06b6d4', '#6366f1'],
    });

    const receipt = await engineRef.current.generateProofOfWork(selectedHabit.id, selectedHabit.name);
    setIssuedReceipt(receipt);

    // Capture camera frame if video is active, otherwise generate cryptographic certificate image
    let capturedImage = '';
    if (videoRef.current && cameraActive && !isShutterClosed) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          capturedImage = canvas.toDataURL('image/jpeg', 0.85);
        }
      } catch (err) {
        console.warn('Could not capture frame from video:', err);
      }
    }

    if (!capturedImage) {
      capturedImage = generateProofCertificateDataUrl(
        selectedHabit.name,
        selectedHabit.color,
        receipt.certificateId,
        receipt.integrityScore,
        todayStr
      );
    }

    // Toggle checkin for today if not yet done
    if (!checkins[`${selectedHabit.id}_${todayStr}`]?.completed) {
      void toggleCheckin(selectedHabit.id, todayStr);
    }

    // Save proof to SQLite/localStorage with visual image/certificate data URL
    void addHabitProof({
      habit_id: selectedHabit.id,
      date: todayStr,
      image_data: capturedImage,
      caption: `[AI Verified: ${receipt.integrityScore}% Focus Integrity · ${receipt.certificateId}]`,
    });

    // Award real-time RPG XP based on session duration & focus integrity
    const xpGained = Math.max(30, Math.round(receipt.durationMinutes * 15 * (receipt.integrityScore / 100)));
    void awardXp(xpGained, 'discipline', `AI Sentinel: ${selectedHabit.name}`);
  };

  const handleCopyHash = () => {
    if (!issuedReceipt) return;
    navigator.clipboard.writeText(issuedReceipt.sha256Hash);
    sound.playClick();
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2200);
  };

  const filteredHabits = activeHabits.filter((h) =>
    h.name.toLowerCase().includes(habitSearch.toLowerCase())
  );

  return createPortal(
    <div
      onClick={handleClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-[16px] animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#0c0c0e',
          borderColor: 'rgba(255, 255, 255, 0.08)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(16, 185, 129, 0.06)',
        }}
        className="w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[94vh] transition-all"
      >
        {/* Futuristic Obsidian Header */}
        <div
          style={{
            borderColor: 'rgba(255, 255, 255, 0.07)',
            background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.08) 50%, rgba(20, 20, 24, 0.6) 100%)',
          }}
          className="px-6 py-4 border-b flex items-center justify-between relative"
        >
          <div className="flex items-center gap-3.5">
            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.16)',
                borderColor: 'rgba(52, 211, 153, 0.35)',
                boxShadow: '0 0 20px rgba(52, 211, 153, 0.2)',
              }}
              className="w-10 h-10 rounded-xl border flex items-center justify-center text-emerald-400"
            >
              <Eye size={20} className={cameraActive && !isShutterClosed ? 'animate-pulse' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Local AI Vision Sentinel</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                </h2>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  100% OFFLINE · ZERO-CLOUD
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Hardware-accelerated edge presence verification. No video is ever recorded or transmitted.
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Sentinel & Turn Off Optical Sensor (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Cybernetic Camera HUD Stream Viewfinder */}
          <div className="relative w-full h-64 sm:h-72 rounded-2xl bg-black border border-emerald-500/25 overflow-hidden flex items-center justify-center shadow-[inset_0_0_30px_rgba(0,0,0,0.9)]">
            {/* Real Video Feed */}
            <video
              ref={videoRef}
              muted
              playsInline
              className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
                cameraActive && !isShutterClosed ? 'opacity-85' : 'opacity-0'
              }`}
            />

            {/* Offline Background Grid Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none" />

            {/* Camera Sensor Loading State */}
            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-zinc-500">
                <Camera size={34} className="animate-pulse text-emerald-400/60" />
                <span className="text-xs font-mono tracking-wider text-zinc-400">
                  INITIALIZING OPTICAL SENSOR...
                </span>
              </div>
            )}

            {/* Privacy Shutter Active Overlay */}
            {cameraActive && isShutterClosed && (
              <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-2.5 pointer-events-none">
                <VideoOff size={34} className="text-rose-400/80 animate-pulse" />
                <span className="text-xs font-mono font-bold tracking-wider text-rose-300">
                  OPTICAL SENSOR PAUSED · HARDWARE SHUTTER CLOSED
                </span>
                <span className="text-[11px] text-zinc-500">
                  Telemetry tracking paused. Click shutter button to resume.
                </span>
              </div>
            )}

            {/* Cybernetic HUD Overlay Brackets */}
            <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-emerald-400/70 pointer-events-none" />
            <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-emerald-400/70 pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-emerald-400/70 pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-emerald-400/70 pointer-events-none" />

            {/* Animated Laser Scanning Beam */}
            {cameraActive && !isShutterClosed && (
              <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse pointer-events-none top-1/2 -translate-y-1/2" />
            )}

            {/* Interactive HUD Header Over Video */}
            <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none">
              <div className="flex items-center justify-between">
                {/* Status Indicator */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 font-mono text-xs text-white">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      telemetry.focusState === 'LOCKED_IN'
                        ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]'
                        : telemetry.focusState === 'DRIFTING'
                        ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]'
                        : 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'
                    }`}
                  />
                  <span className="font-bold tracking-wide">
                    STATUS: {telemetry.focusState}
                  </span>
                </div>

                {/* Right controls: Privacy Shutter + Timer */}
                <div className="flex items-center gap-2 pointer-events-auto">
                  <button
                    onClick={handleToggleShutter}
                    className={`px-2.5 py-1.5 rounded-xl backdrop-blur-md border text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                      isShutterClosed
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                        : 'bg-black/75 text-zinc-300 border-white/10 hover:text-white hover:border-emerald-500/40'
                    }`}
                    title={isShutterClosed ? 'Open Shutter' : 'Mute Camera Shutter'}
                  >
                    {isShutterClosed ? <VideoOff size={13} /> : <Video size={13} />}
                    <span className="text-[11px] font-bold">
                      {isShutterClosed ? 'SHUTTER CLOSED' : 'PRIVACY SHUTTER'}
                    </span>
                  </button>

                  <div className="px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 font-mono text-xs text-emerald-400 font-bold">
                    SESSION: {formatTimer(telemetry.totalSeconds)}
                  </div>
                </div>
              </div>

              {/* Center Biometric Reticle */}
              <div className="self-center relative flex items-center justify-center">
                <div className="w-24 h-24 border border-dashed border-emerald-400/35 rounded-2xl flex items-center justify-center">
                  <div
                    className={`w-12 h-12 rounded-full border border-emerald-400/40 flex items-center justify-center transition-all duration-300 ${
                      telemetry.focusState === 'LOCKED_IN'
                        ? 'scale-100 border-emerald-400/60'
                        : 'scale-90 border-amber-400/40'
                    }`}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                        telemetry.focusState === 'LOCKED_IN'
                          ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]'
                          : telemetry.focusState === 'DRIFTING'
                          ? 'bg-amber-400 shadow-[0_0_12px_#fbbf24]'
                          : 'bg-rose-500 shadow-[0_0_12px_#f43f5e]'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Lower HUD Telemetry Strip */}
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300 bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10">
                <span className="flex items-center gap-1.5">
                  <span className="text-zinc-500">ATTENTION:</span>
                  <strong className="text-emerald-400 font-bold">{telemetry.attentionScore}%</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-zinc-500">INTEGRITY:</span>
                  <strong className="text-emerald-400 font-bold">{telemetry.integrityPercentage}%</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-zinc-500">VELOCITY:</span>
                  <strong className="text-zinc-200 font-bold">{telemetry.movementVelocity}px/s</strong>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-zinc-500 text-[10px]">
                  15 FPS · LOCAL WASM
                </span>
              </div>
            </div>
          </div>

          {/* Custom Keystone Habit Selector (High-Tech Obsidian Dropdown) */}
          <div className="space-y-2 relative" ref={dropdownRef}>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
              Bind Session to Keystone Habit
            </label>

            {/* Custom Selector Trigger */}
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setHabitDropdownOpen((prev) => !prev);
              }}
              className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-[#141418] hover:border-emerald-500/40 text-xs text-white flex items-center justify-between transition-all cursor-pointer shadow-sm group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-sm shrink-0">
                  {selectedHabit?.emoji || '🎯'}
                </span>
                <div className="text-left truncate">
                  <div className="font-bold text-white text-sm truncate">
                    {selectedHabit?.name || 'Select Keystone Habit'}
                  </div>
                  <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                    <span className="capitalize">{selectedHabit?.category || 'General'}</span>
                    <span>•</span>
                    <span>Today Check-in: {checkins[`${selectedHabit?.id}_${todayStr}`]?.completed ? '✓ Completed' : 'Pending'}</span>
                  </div>
                </div>
              </div>

              <ChevronDown
                size={16}
                className={`text-zinc-400 group-hover:text-emerald-400 transition-transform duration-200 ${
                  habitDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Popover */}
            {habitDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-white/15 bg-[#17171c] shadow-2xl p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                {/* Search Habit Input */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={habitSearch}
                    onChange={(e) => setHabitSearch(e.target.value)}
                    placeholder="Search keystone habits..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                    autoFocus
                  />
                </div>

                {/* Habit Options List */}
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {filteredHabits.length === 0 ? (
                    <div className="p-3 text-center text-xs text-zinc-500">
                      No matching habits found.
                    </div>
                  ) : (
                    filteredHabits.map((habit) => {
                      const isSelected = habit.id === selectedHabit?.id;
                      return (
                        <button
                          key={habit.id}
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setSelectedHabitId(habit.id);
                            setHabitDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                              : 'hover:bg-white/[0.06] text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="text-sm shrink-0">{habit.emoji || '🎯'}</span>
                            <span className="font-semibold text-xs truncate">{habit.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 capitalize">
                              {habit.category || 'General'}
                            </span>
                          </div>
                          {isSelected && <Check size={14} className="text-emerald-400 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Holographic Cryptographic Proof-of-Work Card */}
          {issuedReceipt && (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.08) 50%, rgba(24, 24, 30, 0.8) 100%)',
                borderColor: 'rgba(52, 211, 153, 0.35)',
                boxShadow: '0 10px 30px -10px rgba(16, 185, 129, 0.25)',
              }}
              className="p-5 rounded-2xl border space-y-3.5 animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <ShieldCheck size={18} className="text-emerald-400" />
                  <span className="tracking-wide">CRYPTOGRAPHIC PROOF-OF-WORK VERIFIED</span>
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-300 px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                  {issuedReceipt.certificateId}
                </span>
              </div>

              {/* Hash with 1-Click Copy Button */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/60 border border-white/10 font-mono">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-zinc-500 block">SHA-256 HASH</span>
                  <p className="text-xs text-zinc-300 font-mono truncate">
                    {issuedReceipt.sha256Hash}
                  </p>
                </div>
                <button
                  onClick={handleCopyHash}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    copiedHash
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10'
                  }`}
                  title="Copy SHA-256 Hash to Clipboard"
                >
                  {copiedHash ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] text-zinc-500 block">HABIT</span>
                  <span className="font-bold text-white truncate block">{issuedReceipt.habitName}</span>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] text-zinc-500 block">INTEGRITY</span>
                  <span className="font-bold text-emerald-400 block">{issuedReceipt.integrityScore}%</span>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] text-zinc-500 block">DURATION</span>
                  <span className="font-bold text-white block">{issuedReceipt.durationMinutes} min</span>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] text-zinc-500 block">VERIFIED AT</span>
                  <span className="font-bold text-zinc-300 block">{issuedReceipt.timestamp}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            backgroundColor: '#0a0a0d',
            borderColor: 'rgba(255, 255, 255, 0.08)',
          }}
          className="px-6 py-4 border-t flex items-center justify-between"
        >
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Lock size={14} className="text-emerald-400 shrink-0" />
            <span className="text-[11px] sm:text-xs">
              100% Client-Side WebAssembly. Zero biometrics leave your machine.
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              Dismiss
            </button>

            <button
              onClick={handleMintProof}
              disabled={telemetry.totalSeconds < 3}
              style={{
                boxShadow: telemetry.totalSeconds >= 3 ? '0 0 20px rgba(16, 185, 129, 0.3)' : 'none',
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Sparkles size={14} />
              <span>Verify & Mint Proof-of-Work</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
