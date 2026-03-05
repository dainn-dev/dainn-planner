import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import PasswordInput from '../components/PasswordInput';
import ErrorMessage from '../components/ErrorMessage';
import SuccessMessage from '../components/SuccessMessage';
import { validateEmail, validatePassword, validateConfirmPassword, validateName } from '../utils/formValidation';
import { authAPI } from '../services/api';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: false
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const nameError = validateName(formData.fullname);
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);
    const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword);
    
    const newErrors = {
      fullname: nameError,
      email: emailError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
    };

    if (!formData.terms) {
      newErrors.terms = 'Bạn phải đồng ý với điều khoản và chính sách bảo mật';
    }

    if (Object.values(newErrors).some(error => error !== null)) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    setSuccessMessage('');

    try {
      const response = await authAPI.register(formData);
      if (response.success) {
        setSuccessMessage('Đăng ký thành công! Đang chuyển hướng...');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      }
    } catch (error) {
      // Handle validation errors from API
      if (error.errors) {
        setErrors(error.errors);
      } else {
        setErrors({ submit: error.message || 'Đăng ký thất bại. Vui lòng thử lại.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-subtle-bg font-display text-primary-register antialiased selection:bg-primary-register selection:text-white min-h-screen">
      <PublicHeader />
      <div className="flex min-h-screen w-full flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-[480px]">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-register text-white mb-4 shadow-soft-register">
              <span className="material-symbols-outlined text-2xl">event_note</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-primary-register">Personal Planner</h2>
            <p className="text-secondary-text text-sm mt-2">
              Lập kế hoạch chi tiết cho mục tiêu của bạn.
            </p>
          </div>
          <div className="bg-card-bg shadow-soft-register rounded-2xl p-8 border border-accent-border">
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-primary-register">Tạo tài khoản mới</h1>
              <p className="text-secondary-text text-sm mt-1">Nhập thông tin của bạn để bắt đầu.</p>
            </div>
            <form className="space-y-5" onSubmit={handleSubmit}>
              {successMessage && <SuccessMessage message={successMessage} />}
              {errors.submit && <ErrorMessage message={errors.submit} />}
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary-text" htmlFor="fullname">
                  Họ và tên
                </label>
                <input
                  className={`block w-full rounded-lg border-accent-border bg-subtle-bg px-3 py-2.5 text-sm text-primary-register placeholder-slate-400 focus:border-highlight focus:bg-white focus:ring-1 focus:ring-highlight transition-all duration-200 shadow-sm ${errors.fullname ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                  id="fullname"
                  name="fullname"
                  placeholder="Nguyễn Văn A"
                  type="text"
                  value={formData.fullname}
                  onChange={handleChange}
                  required
                  aria-invalid={errors.fullname ? 'true' : 'false'}
                  aria-describedby={errors.fullname ? 'fullname-error' : undefined}
                />
                {errors.fullname && (
                  <p id="fullname-error" className="text-xs text-red-500 mt-1" role="alert">
                    {errors.fullname}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary-text" htmlFor="email">
                  Email
                </label>
                <input
                  className={`block w-full rounded-lg border-accent-border bg-subtle-bg px-3 py-2.5 text-sm text-primary-register placeholder-slate-400 focus:border-highlight focus:bg-white focus:ring-1 focus:ring-highlight transition-all duration-200 shadow-sm ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                  id="email"
                  name="email"
                  placeholder="name@example.com"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
                {errors.email && (
                  <p id="email-error" className="text-xs text-red-500 mt-1" role="alert">
                    {errors.email}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary-text" htmlFor="password">
                  Mật khẩu
                </label>
                <PasswordInput
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="block w-full rounded-lg border-accent-border bg-subtle-bg px-3 py-2.5 text-sm text-primary-register placeholder-slate-400 focus:border-highlight focus:bg-white focus:ring-1 focus:ring-highlight transition-all duration-200 shadow-sm"
                  error={errors.password}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary-text" htmlFor="confirm_password">
                  Xác nhận mật khẩu
                </label>
                <PasswordInput
                  id="confirm_password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="block w-full rounded-lg border-accent-border bg-subtle-bg px-3 py-2.5 text-sm text-primary-register placeholder-slate-400 focus:border-highlight focus:bg-white focus:ring-1 focus:ring-highlight transition-all duration-200 shadow-sm"
                  error={errors.confirmPassword}
                />
              </div>
              <div className="flex items-start gap-3 py-1">
                <div className="flex h-5 items-center">
                  <input
                    className={`h-4 w-4 rounded border-slate-300 bg-white text-primary-register focus:ring-offset-0 focus:ring-highlight transition-colors cursor-pointer ${errors.terms ? 'border-red-500' : ''}`}
                    id="terms"
                    name="terms"
                    type="checkbox"
                    checked={formData.terms}
                    onChange={handleChange}
                    required
                    aria-invalid={errors.terms ? 'true' : 'false'}
                    aria-describedby={errors.terms ? 'terms-error' : undefined}
                  />
                </div>
                <label className="text-sm text-secondary-text leading-tight" htmlFor="terms">
                  Tôi đồng ý với{' '}
                  <Link to="/term" className="font-medium text-primary-register hover:underline underline-offset-2 decoration-slate-300 hover:decoration-primary-register transition-all">
                    Điều khoản
                  </Link>{' '}
                  và{' '}
                  <Link to="/conditions" className="font-medium text-primary-register hover:underline underline-offset-2 decoration-slate-300 hover:decoration-primary-register transition-all">
                    Chính sách bảo mật
                  </Link>
                  .
                </label>
              </div>
              {errors.terms && (
                <p id="terms-error" className="text-xs text-red-500 mt-1" role="alert">
                  {errors.terms}
                </p>
              )}
              <div className="pt-2">
                <button
                  className="flex w-full items-center justify-center rounded-lg bg-primary-register px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-register-hover focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Đang xử lý...' : 'Đăng ký'}
                </button>
              </div>
              <div className="flex justify-center gap-1.5 text-sm pt-2">
                <p className="text-secondary-text">Đã có tài khoản?</p>
                <Link to="/login" className="font-medium text-highlight hover:text-highlight-hover hover:underline transition-colors">
                  Đăng nhập
                </Link>
              </div>
            </form>
          </div>
          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400">© 2024 Personal Planner. Minimalist Design.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

