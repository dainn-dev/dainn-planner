import { useState, useLayoutEffect, useRef, useId } from 'react';

/**
 * Google reCAPTCHA v2 (checkbox), same load/render/cleanup pattern as ContactPage.
 * @param {{ enabled?: boolean }} options When false, widget is reset and token cleared.
 */
export function useRecaptchaV2({ enabled = true } = {}) {
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const recaptchaContainerRef = useRef(null);
  const recaptchaWidgetIdRef = useRef(null);
  const safeId = useId().replace(/:/g, '_');

  useLayoutEffect(() => {
    if (!enabled) {
      setRecaptchaToken('');
      if (recaptchaWidgetIdRef.current != null && typeof window !== 'undefined' && window.grecaptcha?.reset) {
        try {
          window.grecaptcha.reset(recaptchaWidgetIdRef.current);
        } catch (_) {}
      }
      recaptchaWidgetIdRef.current = null;
      return undefined;
    }

    const siteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
    if (!siteKey || !recaptchaContainerRef.current) return undefined;

    const cbName = `__recaptchaV2_${safeId}`;
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
          try {
            window.grecaptcha.reset(recaptchaWidgetIdRef.current);
          } catch (_) {}
        }
        recaptchaWidgetIdRef.current = null;
      };
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?onload=${cbName}&render=explicit`;
    script.async = true;
    script.defer = true;
    window[cbName] = onload;
    script.onload = () => {
      if (window.grecaptcha && window.grecaptcha.render) onload();
    };
    document.head.appendChild(script);
    return () => {
      delete window[cbName];
      if (recaptchaWidgetIdRef.current != null && window.grecaptcha?.reset) {
        try {
          window.grecaptcha.reset(recaptchaWidgetIdRef.current);
        } catch (_) {}
      }
      recaptchaWidgetIdRef.current = null;
    };
  }, [enabled, safeId]);

  const resetRecaptcha = () => {
    setRecaptchaToken('');
    if (typeof window !== 'undefined' && window.grecaptcha && recaptchaWidgetIdRef.current != null) {
      try {
        window.grecaptcha.reset(recaptchaWidgetIdRef.current);
      } catch (_) {}
    }
  };

  return { recaptchaToken, setRecaptchaToken, recaptchaContainerRef, resetRecaptcha };
}
