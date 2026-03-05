import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import PasswordInput from '../components/PasswordInput';
import ErrorMessage from '../components/ErrorMessage';
import { validateEmail, validatePassword } from '../utils/formValidation';
import { authAPI } from '../services/api';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

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
      
      // Check if login was successful
      if (response.token || response.success) {
        // Get user from response or localStorage
        const user = response.user || JSON.parse(localStorage.getItem('user') || '{}');
        
        // Redirect based on user role
        if (user.role === 'Admin') {
          navigate('/admin/dashboard');
        } else if (user.role === 'User' || !user.role) {
          navigate('/daily');
        } else {
          // Default redirect for other roles
          navigate('/daily');
        }
      } else {
        setErrors({ submit: response.message || 'Đăng nhập thất bại. Vui lòng thử lại.' });
      }
    } catch (error) {
      setErrors({ submit: error.message || 'Đăng nhập thất bại. Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="font-display bg-background-light-gray text-text-main min-h-screen flex flex-col overflow-x-hidden antialiased selection:bg-gray-200">
      <PublicHeader />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[420px] flex flex-col gap-8 bg-surface-light md:p-10 p-6 rounded-2xl shadow-soft border border-white">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-text-main">Đăng nhập</h1>
            <p className="text-text-muted text-sm font-normal">
              Chào mừng trở lại! Tiếp tục hành trình của bạn.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button className="btn-social group">
              <svg className="size-5 mr-3 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#4285F4"></path>
                <path d="M12.2401 24.0008C15.4766 24.0008 18.2059 22.9382 20.1945 21.1039L16.3275 18.1055C15.2517 18.8375 13.8627 19.252 12.2445 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.3003H1.5166V17.3912C3.55371 21.4434 7.7029 24.0008 12.2401 24.0008Z" fill="#34A853"></path>
                <path d="M5.50253 14.3003C5.00236 12.8199 5.00236 11.1799 5.50253 9.69951V6.60861H1.51649C-0.18551 10.0056 -0.18551 13.9945 1.51649 17.3915L5.50253 14.3003Z" fill="#FBBC05"></path>
                <path d="M12.2401 4.74966C13.9509 4.7232 15.6044 5.36697 16.8434 6.54867L20.2695 3.12262C18.1001 1.0855 15.2208 -0.034466 12.2401 0.000808666C7.7029 0.000808666 3.55371 2.55822 1.5166 6.60861L5.50264 9.69951C6.45064 6.85993 9.10947 4.74966 12.2401 4.74966Z" fill="#EA4335"></path>
              </svg>
              <span className="text-sm">Tiếp tục với Google</span>
            </button>
            <button className="btn-social group">
              <svg className="size-5 text-[#1877F2] mr-3 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 12.073C24 5.406 18.627 0 12 0C5.373 0 0 5.406 0 12.073C0 18.101 4.437 23.088 10.125 23.982V15.556H7.078V12.073H10.125V9.428C10.125 6.422 11.916 4.764 14.656 4.764C15.968 4.764 17.344 5 17.344 5V7.952H15.83C14.34 7.952 13.875 8.877 13.875 10.024V12.074H17.203L16.67 15.557H13.875V23.983C19.563 23.088 24 18.101 24 12.073Z"></path>
              </svg>
              <span className="text-sm">Tiếp tục với Facebook</span>
            </button>
          </div>
          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-border-light"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase tracking-wide font-medium">Hoặc</span>
            <div className="flex-grow border-t border-border-light"></div>
          </div>
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label className="text-text-main text-sm font-semibold" htmlFor="email">Email</label>
              <div className="relative group">
                <input
                  className={`input-minimal ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                  id="email"
                  placeholder="name@example.com"
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
                <label className="text-text-main text-sm font-semibold" htmlFor="password">Mật khẩu</label>
                <Link to="/forgot-password" className="text-xs font-medium text-text-muted hover:text-primary-dark transition-colors">
                  Quên mật khẩu?
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
                placeholder="Nhập mật khẩu"
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
              <span>{isSubmitting ? 'Đang xử lý...' : 'Đăng nhập'}</span>
            </button>
          </form>
          <div className="text-center">
            <p className="text-text-muted text-sm">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="text-primary-dark font-semibold hover:underline decoration-2 underline-offset-2 transition-all">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;

