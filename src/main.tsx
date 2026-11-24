import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { DesktopTimerWidget } from './components/focus/DesktopTimerWidget';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import './styles/index.css';

// Safety net: catch unhandled errors that could cause blank screen
window.addEventListener('error', (event) => {
  console.error('[GLOBAL ERROR]', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[UNHANDLED REJECTION]', event.reason);
});

const isTimerWidget =
  typeof window !== 'undefined' && window.location.search.includes('widget=timer');

if (isTimerWidget && typeof document !== 'undefined') {
  document.documentElement.classList.add('timer-widget-mode');
  document.documentElement.style.background = 'transparent';
  document.documentElement.style.backgroundColor = 'transparent';
  document.body.style.background = 'transparent';
  document.body.style.backgroundColor = 'transparent';
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary fallbackTitle="Zion App Startup Error">
      {isTimerWidget ? <DesktopTimerWidget /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>
);
