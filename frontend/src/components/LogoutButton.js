import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../services/api';

/**
 * Shared logout button: calls authAPI.logout() then navigates to /login.
 * Use in Sidebar and mobile drawer to avoid duplicate logic.
 */
const LogoutButton = ({
  className = 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-[#111418] dark:hover:text-white font-medium transition-colors w-full touch-manipulation min-h-[44px]',
  iconClassName = '',
  textClassName = '',
  labelKey = 'sidebar.logout',
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    (async () => {
      try {
        await authAPI.logout();
      } catch (err) {
        console.error('Logout error:', err);
      }
      navigate('/login');
    })();
  };

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
    >
      <span className={`material-symbols-outlined ${iconClassName}`.trim()}>logout</span>
      <span className={textClassName}>{t(labelKey)}</span>
    </button>
  );
};

export default LogoutButton;
