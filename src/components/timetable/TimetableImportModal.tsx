import React, { useState } from 'react';
import {
  X,
  Upload,
  FileCode,
  Sparkles,
  Check,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import {
  parseTimetableMarkdown,
  extractTextFromPdf,
  calculateBlockDurationMinutes,
  formatTimeRange12h,
} from '../../lib/timetableParser';
import type { TimetableSchedule } from '../../lib/types';
import { TimetableIcon } from './TimetableIcon';

export const TimetableImportModal: React.FC = () => {
  const isOpen = useHabitStore((s) => s.timetableImportModalOpen);
  const setOpen = useHabitStore((s) => s.setTimetableImportModalOpen);

  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'guide'>('upload');
  const [pastedText, setPastedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewSchedules, setPreviewSchedules] = useState<TimetableSchedule[]>([]);

  if (!isOpen) return null;

  const GENERIC_EXAMPLE_MD = `# Daily Routine Schedule

## Monday to Friday
| Time | Activity |
|---|---|
| 07:00 – 08:00 AM | Morning Routine & Breakfast |
| 08:30 – 11:30 AM | Deep Focus Work |
| 11:30 – 12:00 PM | Rest & Refreshment Break |
| 12:00 – 01:00 PM | Lunch & Recharge |
| 02:00 – 05:00 PM | Tasks & Collaborative Work |
| 05:30 – 06:30 PM | Exercise & Fitness |
| 07:30 – 08:30 PM | Dinner & Personal Time |
| 10:30 PM – 06:30 AM | Sleep (8 hours) |
`;

  const handleLoadExample = () => {
    setPastedText(GENERIC_EXAMPLE_MD);
    handleProcessText(GENERIC_EXAMPLE_MD);
    setActiveTab('paste');
  };

  const handleProcessText = (content: string) => {
    try {
      setErrorMsg(null);
      const result = parseTimetableMarkdown(content);
      if (result.schedules.length === 0 || result.schedules.every((s) => s.blocks.length === 0)) {
        setErrorMsg('No valid timetable blocks detected. Please ensure format includes times (e.g., 7:45 – 9:45 AM).');
        setPreviewSchedules([]);
        return;
      }
      setPreviewSchedules(result.schedules);
    } catch (err: any) {
      setErrorMsg(`Parsing error: ${err?.message || 'Could not parse text'}`);
      setPreviewSchedules([]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const text = await extractTextFromPdf(file);
        handleProcessText(text);
      } else {
        const text = await file.text();
        handleProcessText(text);
      }
    } catch (err: any) {
      setErrorMsg(`Failed to read file: ${err?.message || 'Unsupported format'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (previewSchedules.length === 0) return;
    setIsProcessing(true);

    try {
      const saveSchedule = useHabitStore.getState().saveTimetableSchedule;
      for (const s of previewSchedules) {
        await saveSchedule(s);
      }
      setOpen(false);
      setPreviewSchedules([]);
    } catch (err: any) {
      setErrorMsg(`Failed to save schedules: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-[10px] animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--shadow-dropdown)',
        }}
        className="w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[88vh] transition-colors"
      >
        {/* Modal Header */}
        <div
          style={{ borderColor: 'var(--border-subtle)' }}
          className="px-6 py-4 border-b flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                borderColor: 'rgba(99, 102, 241, 0.25)',
                color: 'var(--accent-primary)',
              }}
              className="w-9 h-9 rounded-xl border flex items-center justify-center"
            >
              <Upload size={18} />
            </div>
            <div>
              <h2 style={{ color: 'var(--text-primary)' }} className="text-base font-bold tracking-tight flex items-center gap-2">
                Import Timetable & Daily Schedule
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  MD & PDF
                </span>
              </h2>
              <p style={{ color: 'var(--text-muted)' }} className="text-xs">
                Parse full-time study routines, tables, and 24-hour schedules with real-time tracking
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{ color: 'var(--text-muted)' }}
            className="w-8 h-8 rounded-lg hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selection */}
        <div
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-card)',
          }}
          className="px-6 pt-3 pb-1 flex items-center gap-2 border-b"
        >
          <button
            onClick={() => setActiveTab('upload')}
            style={{
              backgroundColor: activeTab === 'upload' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'upload' ? '#ffffff' : 'var(--text-secondary)',
            }}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Upload size={13} />
            <span>Upload File (.md, .pdf, .txt)</span>
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            style={{
              backgroundColor: activeTab === 'paste' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'paste' ? '#ffffff' : 'var(--text-secondary)',
            }}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileCode size={13} />
            <span>Paste Markdown / Text</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            style={{
              backgroundColor: activeTab === 'guide' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'guide' ? '#ffffff' : 'var(--text-secondary)',
            }}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Sparkles size={13} />
            <span>Format Guide</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <label
                style={{
                  backgroundColor: 'var(--bg-surface-card)',
                  borderColor: 'var(--border-subtle)',
                }}
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed hover:border-[var(--accent-primary)] rounded-2xl transition-all cursor-pointer group"
              >
                <div
                  style={{
                    backgroundColor: 'rgba(99, 102, 241, 0.12)',
                    borderColor: 'rgba(99, 102, 241, 0.25)',
                    color: 'var(--accent-primary)',
                  }}
                  className="w-12 h-12 rounded-2xl border flex items-center justify-center mb-3 group-hover:scale-105 transition-transform"
                >
                  <Upload size={22} />
                </div>
                <span style={{ color: 'var(--text-primary)' }} className="text-sm font-bold mb-1">
                  Choose or drag a Timetable file here
                </span>
                <span style={{ color: 'var(--text-muted)' }} className="text-xs text-center max-w-sm">
                  Supports Markdown (<code className="text-indigo-400">.md</code>), PDF (
                  <code className="text-indigo-400">.pdf</code>), and text (<code className="text-indigo-400">.txt</code>)
                </span>
                <input
                  type="file"
                  accept=".md,.pdf,.txt,text/markdown,application/pdf,text/plain"
                  onChange={(e) => void handleFileUpload(e)}
                  className="hidden"
                />
              </label>

              {isProcessing && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs font-mono text-indigo-400">
                  <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span>Parsing timetable blocks and extracting schedule structure...</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-3">
              <textarea
                value={pastedText}
                onChange={(e) => {
                  setPastedText(e.target.value);
                  handleProcessText(e.target.value);
                }}
                placeholder="Paste Markdown table or schedule text here... (e.g. | 9:00 – 11:30 AM | Deep Focus Work |)"
                rows={7}
                style={{
                  backgroundColor: 'var(--bg-surface-card)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                className="w-full p-3.5 rounded-xl border text-xs font-mono placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] custom-scrollbar resize-none"
              />
              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>Auto-parses headers, tables, time ranges, and overnight sleep</span>
                <button
                  type="button"
                  onClick={() => handleProcessText(pastedText)}
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-subtle)',
                  }}
                  className="px-3 py-1 rounded-md border font-medium cursor-pointer"
                >
                  Reparse
                </button>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-3">
              <div
                style={{
                  backgroundColor: 'var(--bg-surface-card)',
                  borderColor: 'var(--border-subtle)',
                }}
                className="p-4 rounded-xl border space-y-3"
              >
                <div>
                  <h4 style={{ color: 'var(--text-primary)' }} className="text-sm font-bold mb-1">
                    Universal Timetable Parser Syntax
                  </h4>
                  <p style={{ color: 'var(--text-secondary)' }} className="text-xs leading-relaxed">
                    The real-time parser automatically detects timetable blocks from standard Markdown tables, bulleted lists, and PDF documents.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-black/30 font-mono text-[11px] text-zinc-300 space-y-1.5 border border-white/5">
                  <div className="text-indigo-400 font-bold"># Markdown Table Format</div>
                  <div>## Monday to Saturday</div>
                  <div>| Time | Activity |</div>
                  <div>|---|---|</div>
                  <div>| 07:00 – 08:00 AM | Morning Routine |</div>
                  <div>| 08:30 – 11:30 AM | Deep Focus Work |</div>
                  <div>| 10:30 PM – 06:30 AM | Sleep (8 hours) |</div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span style={{ color: 'var(--text-muted)' }} className="text-xs">
                    Need a starter template? Load a clean example to customize:
                  </span>
                  <button
                    type="button"
                    onClick={handleLoadExample}
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: '#ffffff',
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <span>Load Example Format</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Parsed Preview Area */}
          {previewSchedules.length > 0 && (
            <div
              style={{ borderColor: 'var(--border-subtle)' }}
              className="space-y-3 pt-3 border-t"
            >
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--text-primary)' }} className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-400" />
                  Detected Schedules ({previewSchedules.length})
                </span>
                <span style={{ color: 'var(--text-muted)' }} className="text-xs font-mono">
                  {previewSchedules.reduce((acc, s) => acc + s.blocks.length, 0)} total time blocks
                </span>
              </div>

              <div className="space-y-3">
                {previewSchedules.map((schedule, sIdx) => (
                  <div
                    key={schedule.id || sIdx}
                    style={{
                      backgroundColor: 'var(--bg-surface-card)',
                      borderColor: 'var(--border-subtle)',
                    }}
                    className="p-3.5 rounded-xl border space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span style={{ color: 'var(--text-primary)' }} className="text-sm font-bold">
                          {schedule.title}
                        </span>
                        <span
                          style={{
                            backgroundColor: 'var(--bg-surface-subtle)',
                            color: 'var(--text-secondary)',
                          }}
                          className="text-[10px] font-mono px-2 py-0.5 rounded"
                        >
                          {schedule.daysOfWeek.length === 7
                            ? 'Everyday'
                            : schedule.daysOfWeek.includes(0) && schedule.daysOfWeek.length === 1
                            ? 'Sunday'
                            : 'Mon – Sat'}
                        </span>
                      </div>
                      <span style={{ color: 'var(--text-muted)' }} className="text-[11px] font-mono">
                        {schedule.blocks.length} blocks
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {schedule.blocks.map((block) => (
                        <div
                          key={block.id}
                          style={{
                            backgroundColor: 'var(--bg-surface-elevated)',
                            borderColor: 'var(--border-subtle)',
                          }}
                          className="px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <TimetableIcon
                              icon={block.icon || block.emoji}
                              category={block.category}
                              color={block.color}
                              size={14}
                            />
                            <div className="min-w-0">
                              <div style={{ color: 'var(--text-primary)' }} className="font-semibold truncate text-[11.5px]">
                                {block.title}
                              </div>
                              <div style={{ color: 'var(--text-muted)' }} className="text-[10px] font-mono">
                                {formatTimeRange12h(block.startTime, block.endTime)} ({calculateBlockDurationMinutes(block.startTime, block.endTime)}m)
                              </div>
                            </div>
                          </div>
                          <span
                            style={{
                              backgroundColor: `${block.color}1c`,
                              borderColor: `${block.color}3c`,
                              color: block.color,
                            }}
                            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 uppercase"
                          >
                            {block.category}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-card)',
          }}
          className="px-6 py-3.5 border-t flex items-center justify-between"
        >
          <button
            onClick={() => setOpen(false)}
            style={{ color: 'var(--text-muted)' }}
            className="px-4 py-2 rounded-xl text-xs font-semibold hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleConfirmImport()}
            disabled={previewSchedules.length === 0 || isProcessing}
            style={
              previewSchedules.length > 0 && !isProcessing
                ? {
                    backgroundColor: 'var(--btn-primary-bg)',
                    color: 'var(--btn-primary-text)',
                    boxShadow: 'var(--btn-primary-shadow)',
                  }
                : {
                    backgroundColor: 'var(--bg-surface-subtle)',
                    color: 'var(--text-muted)',
                  }
            }
            className="px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:cursor-not-allowed"
          >
            <Check size={14} />
            <span>Confirm & Import ({previewSchedules.reduce((acc, s) => acc + s.blocks.length, 0)} Blocks)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
