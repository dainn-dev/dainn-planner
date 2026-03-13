import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const PublicHeader = () => {
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isLoginPage = location.pathname === '/login';
  const isRegisterPage = location.pathname === '/register';

  const currentLang = (i18n.language || 'vi').startsWith('vi') ? 'vi' : 'en';
  const handleLanguageChange = (e) => {
    const locale = e.target.value;
    i18n.changeLanguage(locale);
    localStorage.setItem('app_lang', locale);
  };

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-b-gray-200 bg-white/90 backdrop-blur-md px-6 py-4 md:px-10">
        <Link to="/" className="flex items-center gap-3 text-gray-900">
          <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-xl">calendar_today</span>
          </div>
          <h2 className="text-gray-900 text-lg font-bold leading-tight tracking-tight">PlanDaily</h2>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex flex-1 justify-end gap-8">
          <nav className="flex items-center gap-8">
            <Link 
              to="/" 
              className="text-gray-600 hover:text-primary text-sm font-medium transition-colors"
            >
              {t('header.home')}
            </Link>
            <a 
              href="/#features" 
              className="text-gray-600 hover:text-primary text-sm font-medium transition-colors"
            >
              {t('header.features')}
            </a>
            <Link 
              to="/contact" 
              className="text-gray-600 hover:text-primary text-sm font-medium transition-colors"
            >
              {t('header.contact')}
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <select
              value={currentLang}
              onChange={handleLanguageChange}
              className="h-10 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
              aria-label={t('settings.language')}
            >
              <option value="vi">{t('settings.languageVi')}</option>
              <option value="en">{t('settings.languageEn')}</option>
            </select>
            {!isLoginPage && (
              <Link 
                to="/login" 
                className="flex h-10 px-5 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-all"
              >
                <span>{t('header.login')}</span>
              </Link>
            )}
            {!isRegisterPage && (
              <Link 
                to="/register" 
                className="flex h-10 px-5 items-center justify-center rounded-lg bg-primary text-white text-sm font-semibold hover:bg-blue-600 transition-all shadow-sm shadow-blue-200"
              >
                <span>{t('header.registerFree')}</span>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-gray-900"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={t('common.toggleMenu')}
          aria-expanded={mobileMenuOpen}
        >
          <span className="material-symbols-outlined">
            {mobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[73px] z-40 bg-white border-t border-gray-200 overflow-y-auto">
          <nav className="flex flex-col p-4 gap-2">
            <Link 
              to="/" 
              className="px-4 py-3 text-gray-900 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('header.home')}
            </Link>
            <a 
              href="/#features" 
              className="px-4 py-3 text-gray-900 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('header.features')}
            </a>
            <Link 
              to="/contact" 
              className="px-4 py-3 text-gray-900 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('header.contact')}
            </Link>
            <div className="flex items-center gap-2 px-4 py-3">
              <span className="text-sm font-medium text-gray-500">{t('settings.language')}</span>
              <select
                value={currentLang}
                onChange={handleLanguageChange}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                aria-label={t('settings.language')}
              >
                <option value="vi">{t('settings.languageVi')}</option>
                <option value="en">{t('settings.languageEn')}</option>
              </select>
            </div>
            <div className="border-t border-gray-200 my-2"></div>
            {!isLoginPage && (
              <Link 
                to="/login" 
                className="px-4 py-3 text-center bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('header.login')}
              </Link>
            )}
            {!isRegisterPage && (
              <Link 
                to="/register" 
                className="px-4 py-3 text-center bg-primary text-white text-sm font-semibold hover:bg-blue-600 rounded-lg transition-all shadow-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('header.registerFree')}
              </Link>
            )}
          </nav>
        </div>
      )}
    </>
  );
};

export default PublicHeader;

