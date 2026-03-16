import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicHeader from '../components/PublicHeader';
import ContactFooter from '../components/ContactFooter';
import ErrorMessage from '../components/ErrorMessage';
import SuccessMessage from '../components/SuccessMessage';
import { validateEmail, validateName, validateMessage } from '../utils/formValidation';
import { contactAPI } from '../services/api';

const ContactPage = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const recaptchaContainerRef = useRef(null);
  const recaptchaWidgetIdRef = useRef(null);

  useEffect(() => {
    const siteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
    if (!siteKey || !recaptchaContainerRef.current) return;
    const onload = () => {
      if (!window.grecaptcha || !recaptchaContainerRef.current) return;
      try {
        const widgetId = window.grecaptcha.render(recaptchaContainerRef.current, {
          sitekey: siteKey,
          callback: (token) => setRecaptchaToken(token),
          'expired-callback': () => setRecaptchaToken(''),
        });
        recaptchaWidgetIdRef.current = widgetId;
      } catch (_) {}
    };
    if (window.grecaptcha && window.grecaptcha.render) {
      onload();
      return () => {
        if (recaptchaWidgetIdRef.current != null && window.grecaptcha?.reset) {
          try { window.grecaptcha.reset(recaptchaWidgetIdRef.current); } catch (_) {}
        }
        recaptchaWidgetIdRef.current = null;
      };
    }
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?onload=__recaptchaContactOnload&render=explicit';
    script.async = true;
    script.defer = true;
    window.__recaptchaContactOnload = onload;
    script.onload = () => { if (window.grecaptcha && window.grecaptcha.render) onload(); };
    document.head.appendChild(script);
    return () => {
      delete window.__recaptchaContactOnload;
      if (recaptchaWidgetIdRef.current != null && window.grecaptcha?.reset) {
        try { window.grecaptcha.reset(recaptchaWidgetIdRef.current); } catch (_) {}
      }
      recaptchaWidgetIdRef.current = null;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const nameError = validateName(formData.name);
    const emailError = validateEmail(formData.email);
    const messageError = validateMessage(formData.message);
    
    if (!recaptchaToken && process.env.REACT_APP_RECAPTCHA_SITE_KEY) {
      setErrors(prev => ({ ...prev, submit: t('settings.supportErrorMissingCaptcha') }));
      return;
    }

    if (nameError || emailError || messageError) {
      setErrors({
        name: nameError,
        email: emailError,
        message: messageError,
      });
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const payload = { ...formData, recaptchaToken: recaptchaToken || undefined, source: 'contact' };
      const response = await contactAPI.submitContact(payload);
      const ok = response?.success ?? response?.Success ?? false;
      if (ok) {
        setSuccessMessage(response?.message || response?.Message || t('contact.successMessage'));
        setFormData({ name: '', email: '', message: '' });
        setRecaptchaToken('');
        if (window.grecaptcha && recaptchaWidgetIdRef.current != null) {
          try { window.grecaptcha.reset(recaptchaWidgetIdRef.current); } catch (_) {}
        }
      } else {
        setErrors({ submit: response?.message || response?.Message || t('contact.failMessage') });
      }
    } catch (error) {
      if (error.errors) {
        setErrors(error.errors);
      } else {
        setErrors({ submit: error.message || t('contact.failMessage') });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-light text-text-main overflow-x-hidden font-display">
      <PublicHeader />
      <main className="flex-grow flex flex-col items-center justify-center py-12 px-4 md:px-8">
        <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          <div className="flex flex-col justify-center space-y-8">
            <div className="space-y-4">
              <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-primary text-xs font-bold uppercase tracking-wider border border-blue-100">
                {t('contact.support')}
              </span>
              <h1 className="text-[#111418] text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-[-0.033em]">
                {t('contact.heroTitle')}
              </h1>
              <p className="text-text-muted text-lg font-normal leading-relaxed max-w-md">
                {t('contact.subtitle')}
              </p>
            </div>
              <div className="flex flex-col gap-6 p-6 rounded-2xl bg-white border border-border-light shadow-xl shadow-slate-200/60">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-primary shrink-0">
                  <span className="material-symbols-outlined">mail</span>
                </div>
                <div>
                  <h3 className="text-slate-900 font-bold text-base">{t('contact.emailSupport')}</h3>
                  <p className="text-text-muted text-sm mb-1">{t('contact.responseTime')}</p>
                  <a className="text-primary hover:text-blue-600 font-medium transition-colors" href="mailto:support@dailyplanner.com">
                    support@dailyplanner.com
                  </a>
                </div>
              </div>
              <div className="w-full h-px bg-slate-100"></div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-primary shrink-0">
                  <span className="material-symbols-outlined">location_on</span>
                </div>
                <div>
                  <h3 className="text-slate-900 font-bold text-base">{t('contact.headquarters')}</h3>
                  <p className="text-text-muted text-sm">{t('contact.address')}</p>
                </div>
              </div>
              <div className="w-full h-px bg-slate-100"></div>
              <div className="flex gap-4 pt-2">
                <a className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-primary hover:bg-blue-50 transition-all" href="#">
                  <span className="material-symbols-outlined text-xl">public</span>
                </a>
                <a className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-primary hover:bg-blue-50 transition-all" href="#">
                  <span className="material-symbols-outlined text-xl">share</span>
                </a>
              </div>
            </div>
            <div className="flex gap-2 items-center text-text-muted text-sm">
              <span className="material-symbols-outlined text-lg">help</span>
              <p>
                {t('contact.needQuickAnswer')}{' '}
                <Link to="/contact" className="text-slate-800 hover:text-primary font-medium hover:underline decoration-primary underline-offset-4">
                  {t('contact.viewHelpCenter')}
                </Link>
              </p>
            </div>
          </div>
          <div className="flex flex-col bg-white p-8 rounded-3xl border border-border-light shadow-2xl shadow-slate-200/50">
            <h3 className="text-slate-900 text-xl font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">send</span>
              {t('contact.send')}
            </h3>
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              {successMessage && <SuccessMessage message={successMessage} />}
              {errors.submit && <ErrorMessage message={errors.submit} />}
              
              <label className="flex flex-col gap-2">
                <span className="text-slate-700 text-sm font-bold">{t('contact.fullName')}</span>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <span className="material-symbols-outlined text-xl">person</span>
                  </div>
                  <input
                    className={`w-full rounded-lg bg-slate-50 border text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-1 pl-10 pr-4 py-3 text-base transition-all ${errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-primary focus:ring-primary'}`}
                    placeholder={t('contact.namePlaceholder')}
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    aria-invalid={errors.name ? 'true' : 'false'}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                  />
                </div>
                {errors.name && (
                  <p id="name-error" className="text-xs text-red-500 mt-1" role="alert">
                    {errors.name}
                  </p>
                )}
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-slate-700 text-sm font-bold">{t('contact.emailLabel')}</span>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <span className="material-symbols-outlined text-xl">alternate_email</span>
                  </div>
                  <input
                    className={`w-full rounded-lg bg-slate-50 border text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-1 pl-10 pr-4 py-3 text-base transition-all ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-primary focus:ring-primary'}`}
                    placeholder={t('contact.emailPlaceholder')}
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    aria-invalid={errors.email ? 'true' : 'false'}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                  />
                </div>
                {errors.email && (
                  <p id="email-error" className="text-xs text-red-500 mt-1" role="alert">
                    {errors.email}
                  </p>
                )}
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-slate-700 text-sm font-bold">{t('contact.messageLabel')}</span>
                <textarea
                  className={`w-full rounded-lg bg-slate-50 border text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-1 px-4 py-3 min-h-[160px] text-base resize-none transition-all ${errors.message ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-primary focus:ring-primary'}`}
                  placeholder={t('contact.messagePlaceholder')}
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  aria-invalid={errors.message ? 'true' : 'false'}
                  aria-describedby={errors.message ? 'message-error' : undefined}
                ></textarea>
                {errors.message && (
                  <p id="message-error" className="text-xs text-red-500 mt-1" role="alert">
                    {errors.message}
                  </p>
                )}
              </label>
              {process.env.REACT_APP_RECAPTCHA_SITE_KEY && (
                <div ref={recaptchaContainerRef} className="flex justify-start" />
              )}
              <button
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-blue-600 text-white text-base font-bold h-12 transition-all shadow-lg shadow-blue-200 hover:shadow-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={isSubmitting || !!successMessage || (!!process.env.REACT_APP_RECAPTCHA_SITE_KEY && !recaptchaToken)}
              >
                <span>{isSubmitting ? t('contact.sending') : t('contact.send')}</span>
                {!isSubmitting && (
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                )}
              </button>
              <p className="text-center text-xs text-slate-500 mt-2">
                {t('contact.agreeWithPrivacy')}{' '}
                <a className="text-slate-700 font-medium hover:text-primary underline decoration-dashed" href="#">
                  {t('legal.privacy')}
                </a>
              </p>
            </form>
          </div>
        </div>
      </main>
      <ContactFooter />
    </div>
  );
};

export default ContactPage;

