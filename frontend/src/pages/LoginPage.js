import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicHeader from '../components/PublicHeader';
import PasswordInput from '../components/PasswordInput';
import ErrorMessage from '../components/ErrorMessage';
import { validateEmail, validatePassword } from '../utils/formValidation';
import { authAPI, userAPI } from '../services/api';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
const FACEBOOK_APP_ID = process.env.REACT_APP_FACEBOOK_APP_ID || '';

const LoginPage = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const navigate = useNavigate();
  const googleTokenClientRef = useRef(null);
  const pendingGoogleCallbackRef = useRef(null);
  const googleFallbackTimerRef = useRef(null);

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        
        if (user && user.role === 'Admin') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate('/daily', { replace: true });
        }
      } catch (error) {
        navigate('/daily', { replace: true });
      }
    }
  }, [navigate]);

  // Load Google Identity Services and init token client
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || typeof window === 'undefined') return;
    const initClient = () => {
      if (!window.google?.accounts?.oauth2) return;
      googleTokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        callback: (res) => {
          const fn = pendingGoogleCallbackRef.current;
          if (fn && res?.access_token) fn(res.access_token);
        },
      });
    };
    if (window.google?.accounts?.oauth2) {
      initClient();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = initClient;
    document.head.appendChild(script);
    return () => {};
  }, []);

  // Load Facebook SDK
  useEffect(() => {
    if (!FACEBOOK_APP_ID || typeof window === 'undefined') return;
    if (window.FB) return;
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: FACEBOOK_APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v18.0',
      });
    };
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  const redirectAfterSocialLogin = (response) => {
    try {
      userAPI.getSettings().catch(() => {});
    } catch (_) {}
    const user = response?.user || (() => {
      try {
        return JSON.parse(localStorage.getItem('user') || '{}');
      } catch {
        return {};
      }
    })();
    if (user?.role === 'Admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/daily');
    }
  };

  const handleGoogleClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      setErrors((prev) => ({ ...prev, submit: t('auth.socialNotConfigured') }));
      return;
    }
    const client = googleTokenClientRef.current;
    if (!client) {
      setErrors((prev) => ({ ...prev, submit: t('auth.socialNotReady') }));
      return;
    }
    setErrors((prev => ({ ...prev, submit: null })));
    setIsSocialLoading(true);
    pendingGoogleCallbackRef.current = async (accessToken) => {
      if (googleFallbackTimerRef.current) {
        clearTimeout(googleFallbackTimerRef.current);
        googleFallbackTimerRef.current = null;
      }
      try {
        const response = await authAPI.socialLogin('Google', accessToken);
        if (response?.token || response?.user) {
          redirectAfterSocialLogin(response);
        } else {
          setErrors((prev) => ({ ...prev, submit: response?.message || t('auth.loginFail') }));
        }
      } catch (err) {
        setErrors((prev) => ({ ...prev, submit: err?.message || t('auth.loginFail') }));
      } finally {
        setIsSocialLoading(false);
        pendingGoogleCallbackRef.current = null;
      }
    };
    client.requestAccessToken();
    googleFallbackTimerRef.current = setTimeout(() => {
      googleFallbackTimerRef.current = null;
      if (pendingGoogleCallbackRef.current) {
        pendingGoogleCallbackRef.current = null;
        setIsSocialLoading(false);
      }
    }, 90000);
  };

  const handleFacebookClick = () => {
    if (!FACEBOOK_APP_ID) {
      setErrors((prev) => ({ ...prev, submit: t('auth.socialNotConfigured') }));
      return;
    }
    if (!window.FB) {
      setErrors((prev) => ({ ...prev, submit: t('auth.socialNotReady') }));
      return;
    }
    setErrors((prev) => ({ ...prev, submit: null }));
    setIsSocialLoading(true);
    window.FB.login(
      async (response) => {
        try {
          if (response.authResponse?.accessToken) {
            const res = await authAPI.socialLogin('Facebook', response.authResponse.accessToken);
            if (res?.token || res?.user) {
              redirectAfterSocialLogin(res);
            } else {
              setErrors((prev) => ({ ...prev, submit: res?.message || t('auth.loginFail') }));
            }
          } else if (response.status === 'unknown' || !response.authResponse) {
            setErrors((prev) => ({ ...prev, submit: t('auth.socialCancelled') }));
          } else {
            setErrors((prev) => ({ ...prev, submit: t('auth.loginFail') }));
          }
        } catch (err) {
          setErrors((prev) => ({ ...prev, submit: err?.message || t('auth.loginFail') }));
        } finally {
          setIsSocialLoading(false);
        }
      },
      { scope: 'email,public_profile' }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    
    if (emailError || passwordError) {
      setErrors({
        email: emailError,
        password: passwordError,
      });
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const response = await authAPI.login(email, password);

      if (response.requiresTwoFactor) {
        setShow2FAModal(true);
        setTwoFactorCode('');
        setTwoFactorError('');
        setErrors({});
        return;
      }

      if (response.token || response.success) {
        try {
          await userAPI.getSettings();
        } catch (_) {}

        const user = response.user || JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'Admin') {
          navigate('/admin/dashboard');
        } else if (user.role === 'User' || !user.role) {
          navigate('/daily');
        } else {
          navigate('/daily');
        }
      } else {
        setErrors({ submit: response.message || t('auth.loginFail') });
      }
    } catch (error) {
      setErrors({ submit: error.message || t('auth.loginFail') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const close2FAModal = () => {
    setShow2FAModal(false);
    setTwoFactorCode('');
    setTwoFactorError('');
  };

  const handle2FAVerify = async (e) => {
    e.preventDefault();
    setTwoFactorError('');
    if (!twoFactorCode.trim()) {
      setTwoFactorError(t('auth.twoFactorInvalidCode'));
      return;
    }
    setIsVerifying(true);
    try {
      const response = await authAPI.verify2FA(email, twoFactorCode.trim());
      if (response.token || response.user) {
        try {
          await userAPI.getSettings();
        } catch (_) {}
        const user = response.user || JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'Admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/daily');
        }
      } else {
        setTwoFactorError(response.message || t('auth.twoFactorInvalidCode'));
      }
    } catch (error) {
      setTwoFactorError(error.message || t('auth.twoFactorInvalidCode'));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="font-display bg-background-light-gray text-text-main min-h-screen flex flex-col overflow-x-hidden antialiased selection:bg-gray-200">
      <PublicHeader />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[420px] flex flex-col gap-8 bg-surface-light md:p-10 p-6 rounded-2xl shadow-soft border border-white">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-text-main">{t('auth.loginTitle')}</h1>
            <p className="text-text-muted text-sm font-normal">
              {t('auth.loginSubtitle')}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="btn-social group disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleGoogleClick}
              disabled={isSocialLoading}
            >
              <svg className="size-5 mr-3 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#4285F4"></path>
                <path d="M12.2401 24.0008C15.4766 24.0008 18.2059 22.9382 20.1945 21.1039L16.3275 18.1055C15.2517 18.8375 13.8627 19.252 12.2445 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.3003H1.5166V17.3912C3.55371 21.4434 7.7029 24.0008 12.2401 24.0008Z" fill="#34A853"></path>
                <path d="M5.50253 14.3003C5.00236 12.8199 5.00236 11.1799 5.50253 9.69951V6.60861H1.51649C-0.18551 10.0056 -0.18551 13.9945 1.51649 17.3915L5.50253 14.3003Z" fill="#FBBC05"></path>
                <path d="M12.2401 4.74966C13.9509 4.7232 15.6044 5.36697 16.8434 6.54867L20.2695 3.12262C18.1001 1.0855 15.2208 -0.034466 12.2401 0.000808666C7.7029 0.000808666 3.55371 2.55822 1.5166 6.60861L5.50264 9.69951C6.45064 6.85993 9.10947 4.74966 12.2401 4.74966Z" fill="#EA4335"></path>
              </svg>
              <span className="text-sm">{t('auth.continueWithGoogle')}</span>
            </button>
            <button
              type="button"
              className="btn-social group disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleFacebookClick}
              disabled={isSocialLoading}
            >
              <svg className="size-5 text-[#1877F2] mr-3 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 12.073C24 5.406 18.627 0 12 0C5.373 0 0 5.406 0 12.073C0 18.101 4.437 23.088 10.125 23.982V15.556H7.078V12.073H10.125V9.428C10.125 6.422 11.916 4.764 14.656 4.764C15.968 4.764 17.344 5 17.344 5V7.952H15.83C14.34 7.952 13.875 8.877 13.875 10.024V12.074H17.203L16.67 15.557H13.875V23.983C19.563 23.088 24 18.101 24 12.073Z"></path>
              </svg>
              <span className="text-sm">{t('auth.continueWithFacebook')}</span>
            </button>
          </div>
          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-border-light"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase tracking-wide font-medium">{t('auth.or')}</span>
            <div className="flex-grow border-t border-border-light"></div>
          </div>
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label className="text-text-main text-sm font-semibold" htmlFor="email">{t('auth.email')}</label>
              <div className="relative group">
                <input
                  className={`input-minimal ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                  id="email"
                  placeholder={t('auth.emailPlaceholder')}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) {
                      setErrors(prev => ({ ...prev, email: null }));
                    }
                  }}
                  required
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400 group-focus-within:text-primary-dark transition-colors">
                  <span className="material-symbols-outlined text-[20px]">mail</span>
                </div>
              </div>
              {errors.email && (
                <p id="email-error" className="text-xs text-red-500 mt-1" role="alert">
                  {errors.email}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-text-main text-sm font-semibold" htmlFor="password">{t('auth.password')}</label>
                <Link to="/forgot-password" className="text-xs font-medium text-text-muted hover:text-primary-dark transition-colors">
                  {t('auth.forgotPassword')}
                </Link>
              </div>
              <PasswordInput
                id="password"
                name="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) {
                    setErrors(prev => ({ ...prev, password: null }));
                  }
                }}
                placeholder={t('auth.passwordPlaceholder')}
                required
                error={errors.password}
              />
            </div>
            {errors.submit && <ErrorMessage message={errors.submit} />}
            <button 
              className="btn-primary mt-2 disabled:opacity-50 disabled:cursor-not-allowed" 
              type="submit"
              disabled={isSubmitting}
            >
              <span>{isSubmitting ? t('common.processing') : t('auth.login')}</span>
            </button>
          </form>
          <div className="text-center">
            <p className="text-text-muted text-sm">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="text-primary-dark font-semibold hover:underline decoration-2 underline-offset-2 transition-all">
                {t('auth.registerNow')}
              </Link>
            </p>
          </div>
        </div>
      </main>

      {show2FAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="2fa-modal-title">
          <div className="w-full max-w-sm bg-surface-light rounded-2xl shadow-soft border border-white p-6 flex flex-col gap-4">
            <h2 id="2fa-modal-title" className="text-lg font-semibold text-text-main">
              {t('auth.twoFactorRequired')}
            </h2>
            <p className="text-text-muted text-sm">
              {t('auth.twoFactorEnterCode')}
            </p>
            <form onSubmit={handle2FAVerify} className="flex flex-col gap-3">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={t('auth.twoFactorPlaceholder')}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                className="input-minimal text-center text-lg tracking-[0.5em]"
                maxLength={8}
                aria-invalid={!!twoFactorError}
                aria-describedby={twoFactorError ? '2fa-error' : undefined}
              />
              {twoFactorError && (
                <p id="2fa-error" className="text-xs text-red-500" role="alert">
                  {twoFactorError}
                </p>
              )}
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={close2FAModal}
                  className="flex-1 btn-secondary"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifying ? t('common.processing') : t('auth.twoFactorVerify')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;

