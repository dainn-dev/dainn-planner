import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicHeader from '../components/PublicHeader';
import { authAPI } from '../services/api';

const VerifyEmailPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token || !email) {
      setStatus('error');
      setMessage(t('auth.verifyEmailInvalidLink'));
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await authAPI.confirmEmail(email, token);
        if (cancelled) return;
        setStatus('success');
        setMessage(response.message || t('auth.verifyEmailSuccess'));
      } catch (error) {
        if (cancelled) return;
        setStatus('error');
        setMessage(error.message || t('auth.verifyEmailFail'));
      }
    })();
    return () => { cancelled = true; };
  }, [token, email, t]);

  return (
    <div className="font-display bg-background-reset min-h-screen flex flex-col text-text-main-reset selection:bg-surface-reset selection:text-primary-reset">
      <PublicHeader />
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-10 w-full">
        <div className="w-full max-w-[440px] flex flex-col gap-8 items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-reset border border-border-reset flex items-center justify-center text-text-main-reset shadow-sm">
            <span className="material-symbols-outlined text-[30px]">
              {status === 'loading' ? 'hourglass_top' : status === 'success' ? 'mark_email_read' : 'error'}
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-[#111418] text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-[-0.033em]">
              {status === 'loading'
                ? t('auth.verifyEmailLoading')
                : status === 'success'
                  ? t('auth.verifyEmailSuccessTitle')
                  : t('auth.verifyEmailFailTitle')}
            </h1>
            <p className="text-text-secondary-reset text-[15px] leading-relaxed max-w-[360px]">
              {message}
            </p>
          </div>

          {status === 'success' && (
            <Link
              to="/login"
              className="flex items-center justify-center rounded-lg h-[48px] px-8 bg-primary-reset hover:bg-primary-reset-hover text-white text-[15px] font-semibold tracking-wide transition-all shadow-sm hover:shadow-md active:scale-[0.99]"
            >
              {t('auth.goToLogin')}
            </Link>
          )}

          {status === 'error' && (
            <div className="flex flex-col gap-3 items-center">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm font-medium text-text-secondary-reset hover:text-text-main-reset transition-colors py-2 group"
              >
                <span className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-x-1">arrow_back</span>
                <span>{t('auth.backToLogin')}</span>
              </Link>
            </div>
          )}
        </div>
      </main>
      <div className="h-8 w-full"></div>
    </div>
  );
};

export default VerifyEmailPage;
