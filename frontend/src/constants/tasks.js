// Default task tags (stored values; use TAG_I18N_KEYS + t('daily.tagX') for display)
export const DEFAULT_TAGS = ['Công việc', 'Cá nhân', 'Mua sắm'];

/** Map stored tag value to i18n key (daily.tagWork, etc.) for localized display */
export const TAG_I18N_KEYS = {
  'Công việc': 'tagWork',
  'Cá nhân': 'tagPersonal',
  'Mua sắm': 'tagShopping',
};

// Task priority levels
export const PRIORITY_LEVELS = {
  HIGH: 'Cao',
  MEDIUM: 'Trung bình',
  LOW: 'Thấp',
};

// Task status
export const TASK_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
};

