import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import './index.css';
import App from './App';

// Apply dark mode from stored user settings before first paint
try {
  const raw = typeof window !== 'undefined' && localStorage.getItem('user_settings');
  const stored = raw ? JSON.parse(raw) : {};
  if (stored.darkMode === true) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
} catch (e) {
  document.documentElement.classList.remove('dark');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

