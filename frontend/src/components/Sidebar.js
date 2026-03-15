import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LogoutButton from './LogoutButton';

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

  const user = getUser();
  const isAdmin = user?.role === 'Admin';

  // Base menu items for all users
  const baseMenuItems = [
    { path: '/daily', labelKey: 'sidebar.dailyPlan', icon: 'today', fillWhenActive: true },
    { path: '/goals', labelKey: 'sidebar.goals', icon: 'target', fillWhenActive: false },
    { path: '/calendar', labelKey: 'sidebar.calendar', icon: 'calendar_month', fillWhenActive: false },
    { path: '/settings', labelKey: 'sidebar.settings', icon: 'settings', fillWhenActive: false },
  ];

  // Admin menu items
  const adminMenuItems = [
    { path: '/admin/dashboard', labelKey: 'sidebar.dashboard', icon: 'dashboard', fillWhenActive: false },
    { path: '/admin/users', labelKey: 'sidebar.users', icon: 'people', fillWhenActive: false },
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
    return location.pathname === path;
  };

  return (
    <nav className={`hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0 left-0 shrink-0 ${className}`}>
      <div className="p-6 flex items-center gap-3 border-b border-gray-100">
        <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
          <span className="material-symbols-outlined text-xl">calendar_today</span>
        </div>
        <h1 className="text-[#111418] text-lg font-bold leading-tight tracking-[-0.015em]">PlanDaily</h1>
      </div>
      <div className="flex flex-col gap-2 p-4 flex-1">
        {isAdmin && (
          <>
            {adminMenuItems.map((item) => (
              <Link 
                key={item.path}
                to={item.path} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-blue-50 text-primary'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-[#111418]'
                }`}
              >
                <span className={`material-symbols-outlined ${isActive(item.path) && item.fillWhenActive ? 'fill-1' : ''}`}>
                  {item.icon}
                </span>
                <span>{t(item.labelKey)}</span>
              </Link>
            ))}
            <div className="my-2 border-t border-gray-100"></div>
          </>
        )}
        {baseMenuItems.map((item) => (
          <Link 
            key={item.path}
            to={item.path} 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
              isActive(item.path)
                ? 'bg-blue-50 text-primary'
                : 'text-gray-600 hover:bg-gray-50 hover:text-[#111418]'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive(item.path) && item.fillWhenActive ? 'fill-1' : ''}`}>
              {item.icon}
            </span>
            <span>{t(item.labelKey)}</span>
          </Link>
        ))}
        <div className="mt-auto border-t border-gray-100 pt-4">
          <LogoutButton labelKey="sidebar.logout" />
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;

