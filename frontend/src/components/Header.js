import React from 'react';
import { Link } from 'react-router-dom';

const Header = ({ 
  title, 
  icon = 'calendar_today',
  actionButton = null, // { text, onClick, icon }
  customContent = null, // For pages that need custom content like CalendarPage
  notifications = [],
  onNotificationsChange,
  onToggleSidebar
}) => {
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  
  const unreadCount = notifications.filter(n => n.unread).length;

  const handleMarkAllAsRead = () => {
    if (onNotificationsChange) {
      onNotificationsChange(notifications.map(notif => ({ ...notif, unread: false })));
    }
  };

  const handleDeleteAllNotifications = () => {
    if (onNotificationsChange) {
      onNotificationsChange([]);
    }
  };

  const handleNotificationClick = (notificationId) => {
    if (onNotificationsChange) {
      onNotificationsChange(notifications.map(n => 
        n.id === notificationId ? { ...n, unread: false } : n
      ));
    }
  };

  return (
    <div className="w-full bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="flex items-center justify-between px-6 py-3 w-full">
        <div className="flex items-center gap-4 text-[#111418]">
          <button 
            className="lg:hidden p-1 -ml-1 rounded-md text-gray-600 hover:bg-gray-100"
            onClick={onToggleSidebar}
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="lg:hidden flex items-center gap-2">
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-xl">{icon}</span>
            </div>
          </div>
          {customContent || (
            <h2 className="text-[#111418] text-lg font-bold leading-tight tracking-[-0.015em]">{title}</h2>
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
          
          {/* Notifications Dropdown */}
          <div className="relative group">
            <button
              className="flex size-10 cursor-pointer items-center justify-center rounded-lg bg-blue-50 text-primary hover:bg-blue-100 transition-colors relative"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
            >
              <span className="material-symbols-outlined">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-2.5 right-2.5 size-2 bg-red-500 rounded-full border border-white"></span>
              )}
            </button>
            {notificationsOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setNotificationsOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden origin-top-right z-50">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
                    <h3 className="font-bold text-[#111418] text-sm">Thông báo</h3>
                    <div className="flex items-center gap-3">
                      <button
                        className="text-[11px] font-medium text-primary hover:text-blue-700 transition-colors"
                        onClick={handleMarkAllAsRead}
                      >
                        Đánh dấu đã đọc
                      </button>
                      <button
                        className="text-[11px] font-medium text-gray-400 hover:text-red-500 transition-colors"
                        onClick={handleDeleteAllNotifications}
                      >
                        Xóa tất cả
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 text-sm">
                        Không có thông báo nào
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`relative flex gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50 ${notification.unread ? 'bg-blue-50/40' : ''}`}
                          onClick={() => handleNotificationClick(notification.id)}
                        >
                          <div className={`size-9 rounded-full ${notification.iconBg} flex items-center justify-center ${notification.iconColor} shrink-0 mt-0.5`}>
                            <span className="material-symbols-outlined text-lg">{notification.icon}</span>
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-start">
                              <p className={`text-sm leading-tight ${notification.unread ? 'font-semibold' : 'font-medium'} text-[#111418]`}>
                                {notification.title}
                              </p>
                              {notification.unread && (
                                <span className="size-2 bg-primary rounded-full mt-1"></span>
                              )}
                            </div>
                            <p className={`text-xs leading-relaxed ${notification.unread ? 'text-gray-600' : 'text-gray-500'} line-clamp-2`}>
                              {notification.message}
                            </p>
                            <p className="text-[11px] text-gray-400 font-medium pt-0.5">{notification.time}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <Link 
                      to="#"
                      className="block p-3 text-center text-xs font-semibold text-gray-500 hover:text-primary hover:bg-gray-50 border-t border-gray-100 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        setNotificationsOpen(false);
                      }}
                    >
                      Xem tất cả thông báo
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>

          <div 
            className="bg-center bg-no-repeat bg-cover rounded-full size-10 cursor-pointer ring-2 ring-transparent hover:ring-primary transition-all" 
            style={{
              backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBr3X7Z7D9oVzqv59WsWDkRyy7yyUi86zJzG0vYqzFaaGh60Qw5psjFjeEh7oCRNQMb9pV2RNcGZ7LdYuSCCXKNFvIuW_u3KWXWL45QWH4DESIVyRG1t2l4Li_LiWgFjDjzgpaGbmp6v-bJBrouwxbq731SsEPCb6dMx0HOmrZjFpR4YJZ2PZr9ckec2y5gpszHLn_zL10DWuQkfb2ocg5mZ2rT7WUFuO8euRXp4-mErpqaeriYEsTgIevz0gS-hwFDr7N3T-y6mNpV")'
            }}
            role="button"
            aria-label="User profile"
            tabIndex={0}
          />
        </div>
      </div>
    </div>
  );
};

export default Header;
