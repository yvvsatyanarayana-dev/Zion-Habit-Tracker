import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            backgroundColor: 'var(--bg-canvas, #09090b)',
            color: 'var(--text-primary, #ffffff)',
          }}
          className="h-full w-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center select-none"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/5">
            <AlertTriangle size={28} />
          </div>
          <h2 className="text-xl font-bold tracking-tight mb-2">
            {this.props.fallbackTitle || 'Something went wrong rendering this view'}
          </h2>
          <p className="text-sm text-[var(--text-muted)] max-w-md mb-4 leading-relaxed font-mono text-xs">
            {this.state.error?.message || 'An unexpected runtime error occurred.'}
          </p>
          {this.state.error?.stack && (
            <pre className="text-[10px] text-left p-3 rounded-xl bg-black/60 border border-white/10 text-red-300 max-w-xl max-h-36 overflow-auto font-mono mb-6 w-full select-text">
              {this.state.error.stack}
            </pre>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs font-semibold hover:border-[var(--border-medium)] transition-all cursor-pointer"
            >
              Try Again
            </button>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-lg bg-[var(--text-primary)] text-[var(--bg-canvas)] text-xs font-semibold hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw size={14} />
              Reload Studio
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('ht_current_user_id');
                window.location.reload();
              }}
              className="px-4 py-2 rounded-lg bg-red-600/20 border border-red-500/30 text-red-300 text-xs font-semibold hover:bg-red-600/30 transition-all cursor-pointer"
              title="Sign out and return to login screen"
            >
              Sign Out & Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
