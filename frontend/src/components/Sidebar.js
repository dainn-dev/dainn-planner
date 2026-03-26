import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LogoutButton from './LogoutButton';
import { USER_SETTINGS_STORAGE_KEY } from '../services/api';

const Sidebar = ({ className = '' }) => {
  const { t } = useTranslation();
  const location = useLocation();

  // Get user from localStorage
  const getUser = () => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  };

  const [showMyCvInMenu, setShowMyCvInMenu] = useState(false);

  useEffect(() => {
    const readMenuPref = () => {
      try {
        const raw = localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        setShowMyCvInMenu(parsed?.showMyCvInMenu === true);
      } catch {
        setShowMyCvInMenu(false);
      }
    };

    readMenuPref();
    const onUpdated = () => readMenuPref();
    window.addEventListener('userSettingsUpdated', onUpdated);
    return () => window.removeEventListener('userSettingsUpdated', onUpdated);
  }, []);

  const user = getUser();
  const isAdmin = user?.role === 'Admin';
  const isCvStaff = user?.role === 'platform_admin' || isAdmin;

  const cvPlatformMenuItems = [
    { path: '/admin/cv-sites', labelKey: 'sidebar.cvSites', icon: 'language', fillWhenActive: false },
  ];

  // Base menu items for all users
  const baseMenuItems = [
    { path: '/dashboard', labelKey: 'sidebar.userDashboard', icon: 'bar_chart', fillWhenActive: false },
    { path: '/daily', labelKey: 'sidebar.dailyPlan', icon: 'today', fillWhenActive: true },
    { path: '/goals', labelKey: 'sidebar.goals', icon: 'target', fillWhenActive: false },
    { path: '/calendar', labelKey: 'sidebar.calendar', icon: 'calendar_month', fillWhenActive: false },
    ...(showMyCvInMenu ? [{ path: '/cv', labelKey: 'sidebar.myCv', icon: 'badge', fillWhenActive: false }] : []),
    { path: '/settings', labelKey: 'sidebar.settings', icon: 'settings', fillWhenActive: false },
  ];

  // Admin menu items
  const adminMenuItems = [
    { path: '/admin/dashboard', labelKey: 'sidebar.dashboard', icon: 'dashboard', fillWhenActive: false },
    { path: '/admin/users', labelKey: 'sidebar.users', icon: 'people', fillWhenActive: false },
    ...(isCvStaff ? [{ path: '/admin/cv-sites', labelKey: 'sidebar.cvSites', icon: 'language', fillWhenActive: false }] : []),
    { path: '/admin/logs', labelKey: 'sidebar.logs', icon: 'description', fillWhenActive: false },
  ];

  const isActive = (path) => {
    if (path === '/settings') {
      return location.pathname.startsWith('/settings');
    }
    if (path === '/admin/dashboard') {
      return location.pathname === '/admin/dashboard';
    }
    if (path === '/admin/users') {
      return location.pathname.startsWith('/admin/users');
    }
    if (path === '/admin/logs') {
      return location.pathname.startsWith('/admin/logs');
    }
    if (path === '/admin/cv-sites') {
      return location.pathname === '/admin/cv-sites';
    }
    return location.pathname === path;
  };

  return (
    <nav className={`hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 h-screen sticky top-0 left-0 shrink-0 ${className}`}>
      <div className="px-6 py-4 flex items-center gap-3 border-b border-gray-100 dark:border-slate-700">
        <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
          <span className="material-symbols-outlined text-xl">calendar_today</span>
        </div>
        <h1 className="text-[#111418] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">PlanDaily</h1>
      </div>
      <div className="flex flex-col gap-2 p-4 flex-1">
        {isCvStaff && !isAdmin && (
          <>
            {cvPlatformMenuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-blue-50 dark:bg-slate-800 text-primary dark:text-blue-300'
                    : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-[#111418] dark:hover:text-white'
                }`}
              >
                <span className={`material-symbols-outlined ${isActive(item.path) && item.fillWhenActive ? 'fill-1' : ''}`}>
                  {item.icon}
                </span>
                <span>{t(item.labelKey)}</span>
              </Link>
            ))}
            <div className="my-2 border-t border-gray-100 dark:border-slate-700" />
          </>
        )}
        {isAdmin && (
          <>
            {adminMenuItems.map((item) => (
              <Link 
                key={item.path}
                to={item.path} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-blue-50 dark:bg-slate-800 text-primary dark:text-blue-300'
                    : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-[#111418] dark:hover:text-white'
                }`}
              >
                <span className={`material-symbols-outlined ${isActive(item.path) && item.fillWhenActive ? 'fill-1' : ''}`}>
                  {item.icon}
                </span>
                <span>{t(item.labelKey)}</span>
              </Link>
            ))}
            <div className="my-2 border-t border-gray-100 dark:border-slate-700"></div>
          </>
        )}
        {baseMenuItems.map((item) => (
          <Link 
            key={item.path}
            to={item.path} 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
              isActive(item.path)
                ? 'bg-blue-50 dark:bg-slate-800 text-primary dark:text-blue-300'
                : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-[#111418] dark:hover:text-white'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive(item.path) && item.fillWhenActive ? 'fill-1' : ''}`}>
              {item.icon}
            </span>
            <span>{t(item.labelKey)}</span>
          </Link>
        ))}
        <div className="mt-auto border-t border-gray-100 dark:border-slate-700 pt-4">
          <LogoutButton labelKey="sidebar.logout" />
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;

