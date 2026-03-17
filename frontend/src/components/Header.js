import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAvatarFullUrl, notificationsAPI } from '../services/api';

const Header = ({ 
  title, 
  icon = 'calendar_today',
  actionButton = null, // { text, onClick, icon }
  customContent = null, // For pages that need custom content like CalendarPage
  notifications = [],
  onNotificationsChange,
  onToggleSidebar
}) => {
  const { t } = useTranslation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const getNotificationDisplay = (notification) => {
    if (notification?.type === 'GoalMilestoneCompleted') {
      try {
        const payload = notification?.message ? JSON.parse(notification.message) : null;
        const milestone = payload?.milestone ?? '';
        const goal = payload?.goal ?? '';
        return {
          title: t('notifications.milestoneCompletedTitle'),
          message: t('notifications.milestoneCompleted', { milestone, goal }),
        };
      } catch {
        return {
          title: t('notifications.milestoneCompletedTitle'),
          message: notification.message,
        };
      }
    }
    if (notification?.type === 'GoalCompleted') {
      try {
        const payload = notification?.message ? JSON.parse(notification.message) : null;
        const goal = payload?.goal ?? '';
        return {
          title: t('notifications.goalCompletedTitle'),
          message: t('notifications.goalCompleted', { goal }),
        };
      } catch {
        return {
          title: t('notifications.goalCompletedTitle'),
          message: notification.message,
        };
      }
    }
    return { title: notification.title, message: notification.message };
  };

  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();

  const avatarUrl = getAvatarFullUrl(storedUser?.avatarUrl ?? storedUser?.avatar);
  const showAvatarFallback = !avatarUrl || avatarError;

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      if (onNotificationsChange) {
        onNotificationsChange(notifications.map(notif => ({ ...notif, unread: false })));
      }
    } catch (_) {
      // keep state on error
    }
  };

  const handleDeleteAllNotifications = async () => {
    try {
      await notificationsAPI.deleteAll();
      if (onNotificationsChange) {
        onNotificationsChange([]);
      }
    } catch (_) {
      // keep state on error
    }
  };

  const handleNotificationClick = async (notificationId) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      if (onNotificationsChange) {
        onNotificationsChange(notifications.map(n =>
          n.id === notificationId ? { ...n, unread: false } : n
        ));
      }
    } catch (_) {
      // keep state on error
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-20">
      <div className="flex items-center justify-between px-6 py-3 w-full">
        <div className="flex items-center gap-4 text-[#111418] dark:text-white">
          <button 
            className="lg:hidden p-1 -ml-1 rounded-md text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
            onClick={onToggleSidebar}
            aria-label={t('common.toggleMenu')}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          {customContent || (
            <h2 className="text-[#111418] dark:text-white text-sm sm:text-base md:text-lg font-bold leading-tight tracking-[-0.015em] truncate max-w-[60vw] sm:max-w-none">{title}</h2>
          )}
        </div>
        <div className="flex items-center gap-4">
          {actionButton && (
            <button 
              className="hidden sm:flex h-10 cursor-pointer items-center justify-center rounded-lg bg-[#1380ec] px-4 text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-blue-600 transition-colors"
              onClick={actionButton.onClick}
            >
              {actionButton.icon && <span className="mr-2 material-symbols-outlined text-sm">{actionButton.icon}</span>}
              <span className="truncate">{actionButton.text}</span>
            </button>
          )}

          <div className="relative group">
            <button
              className="flex size-10 cursor-pointer items-center justify-center rounded-lg bg-blue-50 dark:bg-slate-800 text-primary dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-slate-700 transition-colors relative"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label={t('common.notifications')}
              aria-expanded={notificationsOpen}
            >
              <span className="material-symbols-outlined">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-2.5 right-2.5 size-2 bg-red-500 rounded-full border border-white dark:border-slate-900"></span>
              )}
            </button>
            {notificationsOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setNotificationsOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden origin-top-right z-50">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
                    <h3 className="font-bold text-[#111418] dark:text-white text-sm">{t('common.notifications')}</h3>
                    <div className="flex items-center gap-3">
                      <button
                        className="text-[11px] font-medium text-primary dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 transition-colors"
                        onClick={handleMarkAllAsRead}
                      >
                        {t('common.markAllRead')}
                      </button>
                      <button
                        className="text-[11px] font-medium text-gray-400 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        onClick={handleDeleteAllNotifications}
                      >
                        {t('common.deleteAll')}
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 dark:text-slate-400 text-sm">
                        {t('common.noNotifications')}
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        (() => {
                          const display = getNotificationDisplay(notification);
                          return (
                        <div
                          key={notification.id}
                          className={`relative flex gap-3 p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer border-b border-gray-50 dark:border-slate-700/50 ${notification.unread ? 'bg-blue-50/40 dark:bg-blue-900/20' : ''}`}
                          onClick={() => handleNotificationClick(notification.id)}
                        >
                          <div className={`size-9 rounded-full ${notification.iconBg} flex items-center justify-center ${notification.iconColor} shrink-0 mt-0.5`}>
                            <span className="material-symbols-outlined text-lg">{notification.icon}</span>
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-start">
                              <p className={`text-sm leading-tight ${notification.unread ? 'font-semibold' : 'font-medium'} text-[#111418] dark:text-slate-200`}>
                                {display.title}
                              </p>
                              {notification.unread && (
                                <span className="size-2 bg-primary rounded-full mt-1"></span>
                              )}
                            </div>
                            <p className={`text-xs leading-relaxed ${notification.unread ? 'text-gray-600 dark:text-slate-400' : 'text-gray-500 dark:text-slate-500'} line-clamp-2`}>
                              {display.message}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-slate-500 font-medium pt-0.5">{notification.time}</p>
                          </div>
                        </div>
                          );
                        })()
                      ))
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <Link 
                      to="#"
                      className="block p-3 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-300 hover:bg-gray-50 dark:hover:bg-slate-700 border-t border-gray-100 dark:border-slate-700 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        setNotificationsOpen(false);
                      }}
                    >
                      {t('common.viewAllNotifications')}
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>

          <div 
            className="rounded-full size-10 cursor-pointer ring-2 ring-transparent hover:ring-primary transition-all flex items-center justify-center bg-gray-200 dark:bg-slate-700 shrink-0 overflow-hidden" 
            role="button"
            aria-label={t('common.userProfile')}
            tabIndex={0}
          >
            {showAvatarFallback ? (
              <span className="material-symbols-outlined text-gray-500 dark:text-slate-400 text-2xl" aria-hidden>person</span>
            ) : (
              <img
                src={avatarUrl}
                alt=""
                className="w-full h-full rounded-full object-cover"
                onError={() => setAvatarError(true)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
