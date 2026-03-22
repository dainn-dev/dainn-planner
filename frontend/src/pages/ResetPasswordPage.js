import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicHeader from '../components/PublicHeader';
import PasswordInput from '../components/PasswordInput';
import ErrorMessage from '../components/ErrorMessage';
import SuccessMessage from '../components/SuccessMessage';
import { validatePassword, validateConfirmPassword } from '../utils/formValidation';
import { authAPI } from '../services/api';
import { useRecaptchaV2 } from '../hooks/useRecaptchaV2';

const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const { recaptchaToken, recaptchaContainerRef, resetRecaptcha } = useRecaptchaV2();
  const recaptchaSiteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

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

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 12.5;
    if (/[^a-zA-Z\d]/.test(password)) strength += 12.5;
    
    setPasswordStrength(Math.min(strength, 100));
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength < 25) return { labelKey: 'auth.passwordStrengthWeak', color: 'bg-red-500' };
    if (passwordStrength < 50) return { labelKey: 'auth.passwordStrengthMedium', color: 'bg-yellow-500' };
    if (passwordStrength < 75) return { labelKey: 'auth.passwordStrengthGood', color: 'bg-blue-500' };
    return { labelKey: 'auth.passwordStrengthStrong', color: 'bg-green-500' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const passwordError = validatePassword(formData.password);
    const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword);

    if (recaptchaSiteKey && !recaptchaToken) {
      setErrors((prev) => ({ ...prev, submit: t('settings.supportErrorMissingCaptcha') }));
      return;
    }
    
    if (passwordError || confirmPasswordError) {
      setErrors({
        password: passwordError,
        confirmPassword: confirmPasswordError,
      });
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      if (!token) {
        setErrors({ submit: t('auth.invalidToken') });
        return;
      }

      if (!email) {
        setErrors({ submit: t('auth.invalidEmail') });
        return;
      }

      const response = await authAPI.resetPassword(
        email,
        token,
        formData.password,
        formData.confirmPassword,
        recaptchaSiteKey ? recaptchaToken : undefined
      );
      if (response.success) {
        setSuccessMessage(response.message || t('auth.resetSuccess'));
        resetRecaptcha();
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      }
    } catch (error) {
      if (error.errors) {
        setErrors(error.errors);
      } else {
        setErrors({ submit: error.message || t('auth.resetFail') });
      }
      resetRecaptcha();
    } finally {
      setIsSubmitting(false);
    }
  };

  const strengthInfo = getPasswordStrengthLabel();

  return (
    <div className="font-display bg-background-reset min-h-screen flex flex-col text-text-main-reset selection:bg-surface-reset selection:text-primary-reset">
      <PublicHeader />
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-10 w-full">
        <div className="w-full max-w-[440px] flex flex-col gap-10">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-surface-reset border border-border-reset flex items-center justify-center mb-4 text-text-main-reset shadow-sm">
              <span className="material-symbols-outlined text-[30px]">lock_reset</span>
            </div>
            <h1 className="text-[#111418] text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-[-0.033em]">{t('auth.resetTitle')}</h1>
            <p className="text-text-secondary-reset text-[15px] font-normal leading-relaxed max-w-[360px]">
              {t('auth.resetSubtitle')}
            </p>
          </div>
          <form className="flex flex-col gap-6 w-full" onSubmit={handleSubmit}>
            {successMessage && <SuccessMessage message={successMessage} />}
            {errors.submit && <ErrorMessage message={errors.submit} />}
            
            <div className="flex flex-col gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-main-reset ml-0.5">{t('auth.newPassword')}</label>
                <div className="relative">
                  <PasswordInput
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={(e) => {
                      handleChange(e);
                      calculatePasswordStrength(e.target.value);
                    }}
                    placeholder={t('auth.newPasswordPlaceholder')}
                    required
                    className="w-full h-[52px] pl-4 pr-12 rounded-lg bg-white border border-border-reset text-text-main-reset text-sm placeholder:text-gray-400 focus:outline-none focus:border-primary-reset focus:ring-1 focus:ring-primary-reset transition-all shadow-sm hover:border-gray-300"
                    error={errors.password}
                  />
                </div>
                {formData.password && (
                  <div className="flex items-center gap-2 mt-2 px-1">
                    <div className="flex-1 h-1 rounded-full bg-surface-reset overflow-hidden">
                      <div
                        className={`h-full ${strengthInfo.color} rounded-full transition-all duration-300`}
                        style={{ width: `${passwordStrength}%` }}
                        role="progressbar"
                        aria-valuenow={passwordStrength}
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-label={`${t('auth.passwordStrengthLabel')}: ${t(strengthInfo.labelKey)}`}
                      ></div>
                    </div>
                    <span className="text-xs font-medium text-text-main-reset">{t(strengthInfo.labelKey)}</span>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-main-reset ml-0.5">{t('auth.confirmPassword')}</label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  required
                  className="w-full h-[52px] pl-4 pr-12 rounded-lg bg-white border border-border-reset text-text-main-reset text-sm placeholder:text-gray-400 focus:outline-none focus:border-primary-reset focus:ring-1 focus:ring-primary-reset transition-all shadow-sm hover:border-gray-300"
                  error={errors.confirmPassword}
                />
              </div>
            </div>
            {recaptchaSiteKey && (
              <div ref={recaptchaContainerRef} className="flex justify-start" />
            )}
            <div className="flex flex-col gap-4 mt-2">
              <button
                className="flex w-full items-center justify-center rounded-lg h-[52px] px-6 bg-primary-reset hover:bg-primary-reset-hover text-white text-[15px] font-semibold tracking-wide transition-all shadow-sm hover:shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={isSubmitting || !!successMessage || (!!recaptchaSiteKey && !recaptchaToken)}
              >
                {isSubmitting ? t('common.processing') : t('auth.resetTitle')}
              </button>
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm font-medium text-text-secondary-reset hover:text-text-main-reset transition-colors py-2 group"
              >
                <span className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-x-1">arrow_back</span>
                <span>{t('auth.backToLogin')}</span>
              </Link>
            </div>
          </form>
        </div>
      </main>
      <div className="h-8 w-full"></div>
    </div>
  );
};

export default ResetPasswordPage;

