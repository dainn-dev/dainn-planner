import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LogoutButton from './LogoutButton';
import { USER_SETTINGS_STORAGE_KEY } from '../services/api';

const MobileSidebarDrawer = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const location = useLocation();

  const getUser = () => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const [showMyCvInMenu, setShowMyCvInMenu] = useState(false);

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        setShowMyCvInMenu(parsed?.showMyCvInMenu === true);
      } catch {
        setShowMyCvInMenu(false);
      }
    };
    read();
    window.addEventListener('userSettingsUpdated', read);
    return () => window.removeEventListener('userSettingsUpdated', read);
  }, []);

  const user = getUser();
  const isAdmin = user?.role === 'Admin';
  const isCvStaff = user?.role === 'platform_admin' || isAdmin;

  const isActive = (path) => {
    if (path === '/settings') return location.pathname.startsWith('/settings');
    if (path === '/admin/users') return location.pathname.startsWith('/admin/users');
    if (path === '/admin/logs') return location.pathname.startsWith('/admin/logs');
    if (path === '/admin/dashboard') return location.pathname === '/admin/dashboard';
    if (path === '/admin/cv-sites') return location.pathname === '/admin/cv-sites';
    return location.pathname === path;
  };

  const linkClass = (path) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
      isActive(path)
        ? 'bg-blue-50 dark:bg-slate-800 text-primary dark:text-blue-300'
        : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-[#111418] dark:hover:text-white'
    }`;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={onClose}
        />
      )}
      <nav
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 z-[51] transform transition-transform duration-300 lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 flex items-center gap-3 border-b border-gray-100 dark:border-slate-700">
          <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-xl">calendar_today</span>
          </div>
          <h1 className="text-[#111418] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">PlanDaily</h1>
          <button
            className="ml-auto p-1 rounded-md text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-2 p-4 flex-1 overflow-y-auto h-[calc(100%-80px)]">
          {isCvStaff && !isAdmin && (
            <>
              <Link to="/admin/cv-sites" className={linkClass('/admin/cv-sites')} onClick={onClose}>
                <span className="material-symbols-outlined">language</span>
                <span>{t('sidebar.cvSites')}</span>
              </Link>
              <div className="my-2 border-t border-gray-100 dark:border-slate-700" />
            </>
          )}

          {isAdmin && (
            <>
              <Link to="/admin/dashboard" className={linkClass('/admin/dashboard')} onClick={onClose}>
                <span className="material-symbols-outlined">dashboard</span>
                <span>{t('admin.dashboard')}</span>
              </Link>
              <Link to="/admin/users" className={linkClass('/admin/users')} onClick={onClose}>
                <span className="material-symbols-outlined">people</span>
                <span>{t('admin.users')}</span>
              </Link>
              <Link to="/admin/cv-sites" className={linkClass('/admin/cv-sites')} onClick={onClose}>
                <span className="material-symbols-outlined">language</span>
                <span>{t('sidebar.cvSites')}</span>
              </Link>
              <Link to="/admin/logs" className={linkClass('/admin/logs')} onClick={onClose}>
                <span className="material-symbols-outlined">description</span>
                <span>{t('admin.logs')}</span>
              </Link>
              <div className="my-2 border-t border-gray-100 dark:border-slate-700" />
            </>
          )}

          <Link to="/dashboard" className={linkClass('/dashboard')} onClick={onClose}>
            <span className="material-symbols-outlined">bar_chart</span>
            <span>{t('sidebar.userDashboard')}</span>
          </Link>
          <Link to="/calendar" className={linkClass('/calendar')} onClick={onClose}>
            <span className="material-symbols-outlined">calendar_month</span>
            <span>{t('sidebar.calendar')}</span>
          </Link>
          
          <Link to="/goals" className={linkClass('/goals')} onClick={onClose}>
            <span className="material-symbols-outlined">target</span>
            <span>{t('sidebar.goals')}</span>
          </Link>
          {showMyCvInMenu && (
            <Link to="/cv" className={linkClass('/cv')} onClick={onClose}>
              <span className="material-symbols-outlined">badge</span>
              <span>{t('sidebar.myCv')}</span>
            </Link>
          )}
          <Link to="/settings" className={linkClass('/settings')} onClick={onClose}>
            <span className="material-symbols-outlined">settings</span>
            <span>{t('sidebar.settings')}</span>
          </Link>

          <div className="mt-auto border-t border-gray-100 dark:border-slate-700 pt-4">
            <LogoutButton labelKey="auth.logout" />
          </div>
        </div>
      </nav>
    </>
  );
};

export default MobileSidebarDrawer;
