// Initial state values for settings
export const INITIAL_PROFILE_FORM = {
  fullname: 'Nguyễn Văn A',
  email: 'nguyenvana@email.com',
  job: '',
  location: 'Hà Nội, Việt Nam',
  bio: '',
};

export const INITIAL_SETTINGS = {
  darkMode: false,
  weekStartDay: 'monday',
  publicProfile: false,
};

export const INITIAL_GENERAL_SETTINGS = {
  language: 'vi',
  timezone: '(GMT+07:00) Bangkok, Hanoi, Jakarta',
  dateFormat: '31/12/2024 (DD/MM/YYYY)',
  timeFormat: '24',
  weekStartDay: 'monday',
};

export const INITIAL_PLANS_SETTINGS = {
  defaultDuration: '30 phút',
  autoMoveIncomplete: true,
  trackingMethod: 'tasks',
  goalVision: 'Trở thành một chuyên gia thiết kế sản phẩm và đạt được sự cân bằng giữa công việc và cuộc sống.',
  googleCalendarConnected: false,
  todoistConnected: true,
};

export const INITIAL_NOTIFICATION_SETTINGS = {
  emailWeeklySummary: true,
  emailTaskReminders: true,
  emailPromotions: false,
  inAppNewActivities: true,
  inAppGoalAchievements: true,
  emailFrequency: 'Tổng hợp hàng ngày',
  notificationSound: 'Mặc định (Ping)',
};

export const INITIAL_SECURITY_SETTINGS = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  twoFactorAuth: false,
  devices: [],
};

export const INITIAL_LOGS_SETTINGS = {
  logLevel: 'info',
  logRetentionDays: '30',
  enableActivityLogs: true,
  enableErrorLogs: true,
  enableAccessLogs: false,
  autoExportLogs: false,
  exportFrequency: 'weekly',
  logFormat: 'json',
  maxLogFileSize: '10',
  compressOldLogs: true,
  sendLogsToEmail: false,
  emailForLogs: '',
};

// Settings menu items
export const SETTINGS_MENU_ITEMS = [
  { id: 'profile', label: 'Hồ sơ', icon: 'person' },
  { id: 'general', label: 'Tùy chọn chung', icon: 'tune' },
  { id: 'plans', label: 'Kế hoạch & Mục tiêu', icon: 'calendar_month' },
  { id: 'notifications', label: 'Thông báo', icon: 'notifications' },
  { id: 'security', label: 'Bảo mật', icon: 'lock' },
  { id: 'support', label: 'Hỗ trợ', icon: 'support_agent' },
  { id: 'logs', label: 'Nhật ký', icon: 'description' },
];

// Route mapping for settings tabs
export const SETTINGS_ROUTES = {
  '/settings': 'profile',
  '/settings/general': 'general',
  '/settings/goals': 'plans',
  '/settings/notification': 'notifications',
  '/settings/security': 'security',
  '/settings/support': 'support',
  '/settings/logs': 'logs',
};

