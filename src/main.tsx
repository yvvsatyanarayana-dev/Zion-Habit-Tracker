import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import './styles/index.css';

// Safety net: catch unhandled errors that could cause blank screen
window.addEventListener('error', (event) => {
  console.error('[GLOBAL ERROR]', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[UNHANDLED REJECTION]', event.reason);
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary fallbackTitle="Zion App Startup Error">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
