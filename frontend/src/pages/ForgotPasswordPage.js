import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import ErrorMessage from '../components/ErrorMessage';
import SuccessMessage from '../components/SuccessMessage';
import { validateEmail } from '../utils/formValidation';
import { authAPI } from '../services/api';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const response = await authAPI.forgotPassword(email);
      if (response.success) {
        setSuccessMessage(response.message || 'Email đặt lại mật khẩu đã được gửi! Vui lòng kiểm tra hộp thư của bạn.');
      }
    } catch (err) {
      setError(err.message || 'Không thể gửi email. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="font-display bg-background-forgot text-primary-forgot antialiased selection:bg-primary-forgot selection:text-white min-h-screen">
      <div className="relative flex h-screen min-h-screen w-full flex-col overflow-hidden">
        <PublicHeader />
        <main className="flex-1 flex items-center justify-center p-4 md:p-6 relative">
          <div className="layout-content-container flex flex-col w-full max-w-[440px] z-0">
            <div className="bg-surface-light rounded-2xl shadow-float border border-white/50 p-8 md:p-10">
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-2 text-text-subtle hover:text-primary-forgot mb-8 transition-colors text-sm font-medium group"
              >
                <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform duration-200">arrow_back</span>
                <span>Quay lại</span>
              </button>
              <div className="flex flex-col gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-10 rounded-xl bg-gray-50 text-primary-forgot border border-gray-100 shadow-sm">
                    <span className="material-symbols-outlined text-xl">lock_reset</span>
                  </div>
                  <h1 className="text-primary-forgot text-2xl font-bold tracking-tight">Quên mật khẩu?</h1>
                </div>
                <p className="text-text-subtle text-sm leading-relaxed">
                  Đừng lo lắng. Nhập địa chỉ email liên kết với tài khoản của bạn để nhận hướng dẫn đặt lại mật khẩu.
                </p>
              </div>
              <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                {successMessage && <SuccessMessage message={successMessage} />}
                {error && <ErrorMessage message={error} />}
                
                <div className="flex flex-col gap-2">
                  <label className="text-primary-forgot text-sm font-semibold" htmlFor="email-input">Email</label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-forgot transition-colors">
                      <span className="material-symbols-outlined text-[20px]">mail</span>
                    </div>
                    <input
                      className={`form-input flex w-full rounded-lg text-primary-forgot placeholder:text-gray-400 focus:outline-0 focus:ring-2 focus:ring-primary-forgot/10 focus:border-primary-forgot border bg-white h-11 pl-10 pr-4 text-sm font-normal transition-all shadow-sm ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-200'}`}
                      id="email-input"
                      placeholder="nhapemail@vidu.com"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError('');
                      }}
                      required
                      aria-invalid={error ? 'true' : 'false'}
                      aria-describedby={error ? 'email-error' : undefined}
                    />
                  </div>
                  {error && !successMessage && (
                    <p id="email-error" className="text-xs text-red-500 mt-1" role="alert">
                      {error}
                    </p>
                  )}
                </div>
                <button
                  className="group flex w-full cursor-pointer items-center justify-center rounded-lg h-11 px-5 bg-primary-forgot hover:bg-primary-forgot-hover text-white text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={isSubmitting || !!successMessage}
                >
                  <span>{isSubmitting ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}</span>
                  {!isSubmitting && (
                    <span className="material-symbols-outlined ml-2 text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  )}
                </button>
              </form>
              <div className="flex flex-col items-center mt-8 pt-6 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-text-subtle text-sm">
                    Bạn nhớ ra mật khẩu rồi?{' '}
                    <Link to="/login" className="text-accent-forgot hover:text-indigo-700 font-semibold transition-colors">
                      Đăng nhập ngay
                    </Link>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-8 mt-8 text-gray-400 text-xs font-medium">
              <Link to="/term" className="hover:text-primary-forgot transition-colors">
                Điều khoản
              </Link>
              <Link to="/conditions" className="hover:text-primary-forgot transition-colors">
                Quyền riêng tư
              </Link>
              <Link to="/contact" className="hover:text-primary-forgot transition-colors">
                Trợ giúp
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

