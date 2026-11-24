import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  Mic,
  Check,
  Sparkles,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import type { Habit } from '../../lib/types';

interface ProofUploadModalProps {
  habit: Habit;
  dateStr: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ProofUploadModal: React.FC<ProofUploadModalProps> = ({
  habit,
  dateStr,
  isOpen,
  onClose,
}) => {
  const addHabitProof = useHabitStore((s) => s.addHabitProof);
  const awardXp = useHabitStore((s) => s.awardXp);

  const [imageData, setImageData] = useState<string | null>(null);
  const [caption, setCaption] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageData(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProof = async () => {
    if (!imageData) return;
    setIsSubmitting(true);
    try {
      await addHabitProof({
        habit_id: habit.id,
        date: dateStr,
        image_data: imageData,
        caption: caption.trim(),
      });
      awardXp(75, 'discipline', `Proof Journal: ${habit.name}`);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-[10px] animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--shadow-dropdown)',
        }}
        className="w-full max-w-lg rounded-3xl border p-6 space-y-4 shadow-2xl overflow-hidden transition-colors"
      >
        {/* Header */}
        <div
          style={{ borderColor: 'var(--border-subtle)' }}
          className="flex items-center justify-between pb-3.5 border-b"
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                borderColor: 'rgba(245, 158, 11, 0.35)',
                color: '#f59e0b',
              }}
              className="w-10 h-10 rounded-2xl border flex items-center justify-center shadow-inner"
            >
              <Camera size={19} />
            </div>
            <div>
              <h3 style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }} className="text-sm font-bold">
                Attach Proof & Identity Journal
              </h3>
              <p style={{ color: 'var(--text-muted)' }} className="text-xs">
                {habit.name} · {dateStr}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ color: 'var(--text-muted)' }}
            className="p-1.5 rounded-lg hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Image Preview / Picker */}
        <div className="space-y-3">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {imageData ? (
            <div
              style={{ borderColor: 'var(--border-subtle)' }}
              className="relative rounded-2xl overflow-hidden border max-h-64 bg-black/50 flex items-center justify-center shadow-inner"
            >
              <img src={imageData} alt="Proof" className="max-h-64 w-auto object-contain" />
              <button
                type="button"
                onClick={() => setImageData(null)}
                className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/70 text-rose-400 hover:text-rose-300 backdrop-blur-xs cursor-pointer shadow-md"
                title="Remove image"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-card)',
              }}
              className="p-8 rounded-2xl border border-dashed flex flex-col items-center justify-center text-center cursor-pointer hover:border-[var(--accent-primary)] hover:bg-[var(--bg-surface-subtle)] transition-all group"
            >
              <div
                style={{
                  backgroundColor: 'rgba(99, 102, 241, 0.12)',
                  borderColor: 'rgba(99, 102, 241, 0.25)',
                  color: 'var(--accent-primary)',
                }}
                className="w-12 h-12 rounded-2xl border flex items-center justify-center group-hover:scale-105 transition-transform mb-2 shadow-inner"
              >
                <Upload size={22} />
              </div>
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Click to attach workout, sketch, or page photo
              </span>
              <span className="text-[11px] text-[var(--text-muted)] mt-1">
                PNG, JPG, or WebP proof stored 100% locally in your offline SQLite database
              </span>
            </div>
          )}

          {/* Caption Input */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Micro-Reflection / Caption (Optional):
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Day 24 completed with 15 reps, feeling energized!"
              style={{
                backgroundColor: 'var(--bg-surface-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border text-xs placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] font-medium"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{ borderColor: 'var(--border-subtle)' }}
          className="flex items-center justify-between pt-3 border-t"
        >
          <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-mono font-bold">
            <Sparkles size={13} />
            <span>+75 XP for Proof Upload</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
              className="px-3.5 py-1.5 rounded-xl border text-xs hover:text-[var(--text-primary)] cursor-pointer font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!imageData || isSubmitting}
              onClick={handleSaveProof}
              style={{
                backgroundColor: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)',
                boxShadow: 'var(--btn-primary-shadow)',
              }}
              className="px-4 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-95 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <Check size={14} strokeWidth={2.5} />
              <span>{isSubmitting ? 'Saving...' : 'Save to Time Capsule'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
