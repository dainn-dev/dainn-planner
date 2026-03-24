import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ServerCrash, RefreshCw } from 'lucide-react';
import { checkApiHealth } from '../services/api';

const RETRY_INTERVAL = 30;

export default function MaintenancePage({ onRecovered }) {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(false);
  const [countdown, setCountdown] = useState(RETRY_INTERVAL);

  const retry = useCallback(async () => {
    setChecking(true);
    setCountdown(RETRY_INTERVAL);
    const ok = await checkApiHealth();
    setChecking(false);
    if (ok) onRecovered?.();
  }, [onRecovered]);

  // Auto-retry countdown
  useEffect(() => {
    if (checking) return;
    if (countdown <= 0) {
      retry();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, checking, retry]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background-dark px-4">
      <div className="text-center max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <ServerCrash className="w-10 h-10 text-primary" />
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-text-main dark:text-white mb-3">
          {t('maintenance.title')}
        </h1>
        <p className="text-text-muted dark:text-gray-400 text-sm mb-8 leading-relaxed">
          {t('maintenance.description')}
        </p>

        <button
          onClick={retry}
          disabled={checking}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium
            hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? t('maintenance.checking') : t('maintenance.retry')}
        </button>

        {!checking && (
          <p className="mt-4 text-xs text-text-muted dark:text-gray-500">
            {t('maintenance.autoRetry', { seconds: countdown })}
          </p>
        )}
      </div>
    </div>
  );
}
