import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import MobileSidebarDrawer from '../components/MobileSidebarDrawer';
import { validateTitle, validateCategory, validateDate } from '../utils/formValidation';
import { goalsAPI, notificationsAPI, tasksAPI } from '../services/api';
import { formatDate, formatDateTime } from '../utils/dateFormat';
import { getGoalTimeCompletionPercent } from '../utils/goalProgress';
import { USER_SETTINGS_STORAGE_KEY } from '../services/api';
import ModalMutationProgressBar from '../components/ModalMutationProgressBar';

const categoryToIcon = {
  'Kỹ năng': 'code',
  'Tài chính': 'savings',
  'Sức khỏe': 'fitness_center',
  'Giải trí': 'theater_comedy',
  'Học tập': 'school',
  'Công việc': 'work',
  'Gia đình': 'home',
  'Du lịch': 'flight',
  'Mục tiêu': 'flag',
};

/** Map API category label (Vietnamese) to i18n key for localized display */
const CATEGORY_I18N_KEYS = {
  'Mục tiêu': 'categoryGoal',
  'Kỹ năng': 'categorySkill',
  'Tài chính': 'categoryFinance',
  'Sức khỏe': 'categoryHealth',
  'Học tập': 'categoryLearning',
  'Công việc': 'categoryWork',
  'Gia đình': 'categoryFamily',
  'Du lịch': 'categoryTravel',
  'Giải trí': 'categoryEntertainment',
};

const getCategoryLabel = (category, t) => {
  const key = CATEGORY_I18N_KEYS[category];
  return key ? t(`goals.${key}`) : (category || '');
};

const mapGoalFromApi = (g, formatDateFn) => {
  const statusLower = (g.status || '').toLowerCase();
  const isCompleted = statusLower === 'completed' || statusLower === 'done';
  const dueDate = g.targetDate
    ? formatDateFn(g.targetDate)
    : (g.dueDate || '');
  return {
    id: g.id,
    title: g.title,
    category: g.category || '',
    dueDate,
    targetDate: g.targetDate ?? null,
    startDate: g.startDate ?? null,
    progress: typeof g.progress === 'number' ? Math.round(g.progress) : (g.progress ?? 0),
    icon: categoryToIcon[g.category] || 'flag',
    status: isCompleted ? 'completed' : 'active',
  };
};

const mapNotificationFromApi = (n) => ({
  id: n.id,
  type: n.type || 'system',
  title: n.title,
  message: n.message,
  time: n.createdAt ? formatDateTime(n.createdAt) : '',
  unread: !n.isRead,
  icon: n.icon || 'notifications',
  iconBg: 'bg-blue-100',
  iconColor: n.iconColor || 'text-primary',
});

const LIST_FILTER_ALL = 'all';
const LIST_FILTER_ACTIVE = 'active';
const LIST_FILTER_COMPLETED = 'completed';

/** Read plans.trackingMethod from user_settings: 'time' | 'tasks'. */
const getPlansTrackingMethod = () => {
  try {
    const raw = typeof window !== 'undefined' && localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    if (!raw) return 'tasks';
    const settings = JSON.parse(raw);
    const value = settings?.plans?.trackingMethod ?? settings?.Plans?.trackingMethod ?? 'tasks';
    return value === 'time' ? 'time' : 'tasks';
  } catch {
    return 'tasks';
  }
};

const GoalsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [listFilter, setListFilter] = useState(LIST_FILTER_ALL); // all | active | completed
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addGoalModalOpen, setAddGoalModalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({
    title: '',
    category: '',
    dueDate: '',
    icon: 'flag'
  });
  const [goalFormErrors, setGoalFormErrors] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [copyingGoalId, setCopyingGoalId] = useState(null);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [goalToCopy, setGoalToCopy] = useState(null);
  const [copyTitle, setCopyTitle] = useState('');
  const [copyTitleError, setCopyTitleError] = useState('');
  const [copyToastVisible, setCopyToastVisible] = useState(false);
  const [goalFormSubmitting, setGoalFormSubmitting] = useState(false);
  const [deleteGoalSubmitting, setDeleteGoalSubmitting] = useState(false);

  const handleCopyGoal = async (goal, overrideTitle) => {
    if (copyingGoalId) return;
    setCopyingGoalId(goal.id);
    try {
      const full = await goalsAPI.getGoal(goal.id);
      const data = full?.data ?? full;
      const targetDate = data.targetDate ? new Date(data.targetDate).toISOString() : null;
      const created = await goalsAPI.createGoal({
        title: overrideTitle || `${data.title || goal.title} (Copy)`,
        description: data.description || '',
        category: data.category || goal.category || '',
        targetDate,
        startDate: null,
      });
      const newGoal = created?.data ?? created;
      const newId = newGoal?.id ?? newGoal?.Id;
      const milestones = data.milestones || [];
      const milestoneIdMap = new Map();
      for (const m of milestones) {
        const createdMilestone = await goalsAPI.createMilestone(newId, {
          title: m.title || '',
          targetDate: m.targetDate ?? null,
        });
        const newMilestone = createdMilestone?.data ?? createdMilestone;
        const origId = m.id ?? m.Id;
        const newMilestoneId = newMilestone?.id ?? newMilestone?.Id;
        if (origId != null && newMilestoneId != null) {
          milestoneIdMap.set(String(origId), String(newMilestoneId));
        }
      }

      // Copy tasks that belong to this goal and are attached to a milestone
      try {
        const taskResult = await tasksAPI.getTasks({ goalId: goal.id, pageSize: 200 });
        const tasks = taskResult?.items ?? taskResult ?? [];
        for (const task of tasks) {
          const origMilestoneId = task.goalMilestoneId ?? task.GoalMilestoneId;
          if (!origMilestoneId) continue;
          const mappedMilestoneId = milestoneIdMap.get(String(origMilestoneId));
          if (!mappedMilestoneId) continue;

          await tasksAPI.createTask({
            title: task.title,
            description: task.description ?? '',
            dueDate: task.dueDate ?? null,
            priority: task.priority ?? 0,
            goalId: newId,
            goalMilestoneId: mappedMilestoneId,
          });
        }
      } catch (err) {
        console.error('Failed to copy goal tasks:', err);
      }

      // Show toast on success
      setCopyToastVisible(true);
      setTimeout(() => setCopyToastVisible(false), 3000);
      setGoals((prev) => [...prev, mapGoalFromApi(newGoal, formatDate)]);
    } catch (err) {
      console.error('Failed to copy goal:', err);
    } finally {
      setCopyingGoalId(null);
    }
  };

  const handleOpenCopyModal = (goal) => {
    setGoalToCopy(goal);
    setCopyTitle(`${goal.title} (Copy)`);
    setCopyTitleError('');
    setCopyModalOpen(true);
  };

  const handleCloseCopyModal = () => {
    if (copyingGoalId) return;
    setCopyModalOpen(false);
    setGoalToCopy(null);
    setCopyTitle('');
    setCopyTitleError('');
  };

  const handleConfirmCopy = async (e) => {
    e.preventDefault();
    if (!goalToCopy) return;
    const error = validateTitle(copyTitle);
    if (error) {
      setCopyTitleError(error);
      return;
    }
    await handleCopyGoal(goalToCopy, copyTitle.trim());
    handleCloseCopyModal();
  };

  const loadData = async () => {
    try {
      setGoalsLoading(true);
      const [goalsData, notificationsData] = await Promise.all([
        goalsAPI.getGoals(),
        notificationsAPI.getNotifications({ limit: 20 }),
      ]);
      setGoals(Array.isArray(goalsData) ? goalsData.map((g) => mapGoalFromApi(g, formatDate)) : []);
      const notifList = Array.isArray(notificationsData) ? notificationsData : (notificationsData?.notifications || []);
      setNotifications(notifList.map(mapNotificationFromApi));
    } catch (error) {
      console.error('Failed to load goals or notifications:', error);
      setGoals([]);
    } finally {
      setGoalsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeGoals = goals.filter(g => g.status === 'active').length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const trackingMethod = getPlansTrackingMethod();
  const getGoalDisplayProgress = (g) =>
    trackingMethod === 'time'
      ? getGoalTimeCompletionPercent(g.targetDate, g.startDate)
      : g.progress;
  const averageProgress = goals.length > 0
    ? Math.round(goals.reduce((sum, g) => sum + getGoalDisplayProgress(g), 0) / goals.length)
    : 0;

  const filteredGoals =
    listFilter === LIST_FILTER_ACTIVE
      ? goals.filter(g => g.status === 'active')
      : listFilter === LIST_FILTER_COMPLETED
        ? goals.filter(g => g.status === 'completed')
        : goals;

  const handleDeleteClick = (goal) => {
    setGoalToDelete(goal);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!goalToDelete || deleteGoalSubmitting) return;
    setDeleteGoalSubmitting(true);
    try {
      await goalsAPI.deleteGoal(goalToDelete.id);
      setGoals((prev) => prev.filter((g) => g.id !== goalToDelete.id));
    } catch (error) {
      console.error('Failed to delete goal:', error);
    } finally {
      setDeleteGoalSubmitting(false);
      setDeleteModalOpen(false);
      setGoalToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    if (deleteGoalSubmitting) return;
    setDeleteModalOpen(false);
    setGoalToDelete(null);
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (goalFormSubmitting) return;

    const errors = {};
    errors.title = validateTitle(goalForm.title, true, 255);
    errors.category = validateCategory(goalForm.category, true);
    if (goalForm.dueDate) {
      errors.dueDate = validateDate(goalForm.dueDate, false, new Date().toISOString().split('T')[0]);
    }

    const hasErrors = Object.values(errors).some(error => error !== null);
    if (hasErrors) {
      setGoalFormErrors(errors);
      return;
    }

    setGoalFormSubmitting(true);
    try {
      const targetDate = goalForm.dueDate ? new Date(goalForm.dueDate).toISOString() : null;
      const created = await goalsAPI.createGoal({
        title: goalForm.title.trim(),
        description: '',
        category: goalForm.category.trim(),
        targetDate,
        startDate: null,
      });
      setGoals((prev) => [...prev, mapGoalFromApi(created, formatDate)]);
      setGoalForm({ title: '', category: '', dueDate: '', icon: 'flag' });
      setGoalFormErrors({});
      setAddGoalModalOpen(false);
    } catch (error) {
      console.error('Failed to create goal:', error);
      setGoalFormErrors({ submit: error.message || t('goals.createGoalFail') });
    } finally {
      setGoalFormSubmitting(false);
    }
  };

  const handleCloseAddModal = () => {
    if (goalFormSubmitting) return;
    setAddGoalModalOpen(false);
    setGoalForm({
      title: '',
      category: '',
      dueDate: '',
      icon: 'flag'
    });
    setGoalFormErrors({});
  };

  const handleGoalFormChange = (field, value) => {
    setGoalForm(prev => ({ ...prev, [field]: value }));
    if (goalFormErrors[field]) {
      setGoalFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleCategorySelect = (option) => {
    setGoalForm(prev => ({ ...prev, category: option.apiCategory, icon: option.value }));
    if (goalFormErrors.category) setGoalFormErrors(prev => ({ ...prev, category: null }));
  };

  const handleGoalFormBlur = (field, value) => {
    let error = null;
    switch (field) {
      case 'title':
        error = validateTitle(value, true, 255);
        break;
      case 'category':
        error = validateCategory(value, true);
        break;
      case 'dueDate':
        if (value) {
          error = validateDate(value, false, new Date().toISOString().split('T')[0]);
        }
        break;
      default:
        break;
    }
    setGoalFormErrors(prev => ({ ...prev, [field]: error }));
  };

  const categoryOptions = [
    { value: 'flag', apiCategory: 'Mục tiêu', labelKey: 'categoryGoal' },
    { value: 'code', apiCategory: 'Kỹ năng', labelKey: 'categorySkill' },
    { value: 'savings', apiCategory: 'Tài chính', labelKey: 'categoryFinance' },
    { value: 'fitness_center', apiCategory: 'Sức khỏe', labelKey: 'categoryHealth' },
    { value: 'school', apiCategory: 'Học tập', labelKey: 'categoryLearning' },
    { value: 'work', apiCategory: 'Công việc', labelKey: 'categoryWork' },
    { value: 'home', apiCategory: 'Gia đình', labelKey: 'categoryFamily' },
    { value: 'flight', apiCategory: 'Du lịch', labelKey: 'categoryTravel' },
    { value: 'theater_comedy', apiCategory: 'Giải trí', labelKey: 'categoryEntertainment' },
  ];

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background-subtle dark:bg-[#101922] text-zinc-900 dark:text-slate-100 antialiased selection:bg-zinc-200 dark:selection:bg-slate-600">
      {/* Sidebar - Desktop */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-background-subtle dark:bg-[#101922]">
        <Header
          title={t('goals.title')}
          icon="target"
          actionButton={{
            text: t('goals.addGoal'),
            icon: 'add',
            onClick: () => {
              setGoalFormErrors(prev => ({ ...prev, submit: null }));
              setAddGoalModalOpen(true);
            }
          }}
          notifications={notifications}
          onNotificationsChange={setNotifications}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          <div className="w-full max-w-[1024px] mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-10 flex flex-col gap-6 md:gap-10">
            {/* Header Section */}
            <div className="flex flex-col gap-1.5 md:gap-2">
              <h1 className="text-[#111418] dark:text-white text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-[-0.033em]">{t('goals.longTermGoals')}</h1>
              <p className="text-secondary dark:text-slate-400 text-sm font-normal leading-relaxed max-w-lg">
                {t('goals.tagline')}
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1 sm:gap-2 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm font-medium">{t('goals.active')}</p>
                <div className="flex items-end gap-2">
                  <p className="text-[#111418] dark:text-white text-lg sm:text-xl md:text-2xl font-bold leading-none">{activeGoals}</p>
                </div>
              </div>
              <div className="flex flex-col gap-1 sm:gap-2 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm font-medium">{t('goals.completed')}</p>
                <div className="flex items-end gap-2">
                  <p className="text-[#111418] dark:text-white text-lg sm:text-xl md:text-2xl font-bold leading-none">{completedGoals}</p>
                </div>
              </div>
              <div className="flex flex-col gap-1 sm:gap-2 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm font-medium">{t('goals.avgProgress')}</p>
                <div className="flex items-end gap-2">
                  <p className="text-[#111418] dark:text-white text-lg sm:text-xl md:text-2xl font-bold leading-none">{averageProgress}%</p>
                  <p className="text-gray-500 dark:text-slate-400 text-xs pb-0.5">
                    {trackingMethod === 'time' ? t('daily.progressByTime') : t('daily.progressByTasks')}
                  </p>
                </div>
              </div>
            </div>

            {/* Goals List */}
            <div className="flex flex-col gap-4 md:gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border-light dark:border-slate-700 pb-3 md:pb-4">
                <h3 className="text-zinc-900 dark:text-white text-base md:text-lg font-medium tracking-tight">{t('goals.goalList')}</h3>
                {/* Filter tabs */}
                <div className="flex rounded-lg bg-zinc-100 dark:bg-slate-800 p-1 gap-0.5" role="tablist" aria-label={t('goals.filterGoals')}>
                  {[
                    { value: LIST_FILTER_ALL, labelKey: 'filterAll', count: goals.length },
                    { value: LIST_FILTER_ACTIVE, labelKey: 'active', count: activeGoals },
                    { value: LIST_FILTER_COMPLETED, labelKey: 'completed', count: completedGoals },
                  ].map(({ value, labelKey, count }) => (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={listFilter === value}
                      aria-label={t('goals.filterTabLabel', { label: t(`goals.${labelKey}`), count })}
                      className={`min-h-[40px] px-3 py-2 rounded-md text-sm font-medium transition-colors touch-manipulation ${listFilter === value
                          ? 'bg-white dark:bg-slate-700 text-zinc-900 dark:text-white shadow-sm'
                          : 'text-zinc-600 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-slate-700'
                        }`}
                      onClick={() => setListFilter(value)}
                    >
                      {t(`goals.${labelKey}`)}
                      <span className="ml-1.5 text-xs opacity-80">({count})</span>
                    </button>
                  ))}
                </div>
              </div>
              {goalsLoading ? (
                <div className="flex flex-col gap-4" aria-busy="true" aria-label={t('goals.loadingGoals')}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm animate-pulse">
                      <div className="size-11 md:size-12 rounded-xl bg-zinc-200 dark:bg-slate-600 shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-4 bg-zinc-200 dark:bg-slate-600 rounded w-3/4 max-w-[200px]" />
                        <div className="h-3 bg-zinc-100 dark:bg-slate-700 rounded w-1/2 max-w-[140px]" />
                      </div>
                      <div className="w-24 h-2 rounded-full bg-zinc-200 dark:bg-slate-600 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : filteredGoals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm text-center">
                  <span className="material-symbols-outlined text-5xl text-zinc-300 dark:text-slate-500 mb-3" aria-hidden>flag</span>
                  <p className="text-zinc-600 dark:text-slate-300 font-medium mb-1">
                    {goals.length === 0 ? t('goals.noGoals') : t('goals.noGoalsMatch')}
                  </p>
                  <p className="text-zinc-500 dark:text-slate-400 text-sm mb-4 max-w-xs">
                    {goals.length === 0 ? t('goals.createFirstGoal') : t('goals.tryChangeFilter')}
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-4 list-none p-0 m-0">
                  {filteredGoals.map((goal) => (
                    <li key={goal.id}>
                      <div
                        className="group flex flex-col sm:flex-row sm:items-center gap-4 md:gap-5 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer touch-manipulation active:scale-[0.995]"
                        onClick={() => navigate(`/goals/${goal.id}`)}
                      >
                        <div className="flex items-start sm:items-center gap-4 md:gap-5 flex-1 min-w-0">
                          <div className="flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-slate-700 text-zinc-700 dark:text-slate-200 border border-zinc-100 dark:border-slate-600 shrink-0 size-11 md:size-12 group-hover:bg-zinc-50 dark:group-hover:bg-slate-600">
                            <span className="material-symbols-outlined text-[20px] md:text-[22px]">{goal.icon}</span>
                          </div>
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-zinc-900 dark:text-white text-sm font-semibold leading-snug truncate">{goal.title}</p>
                              <span
                                className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${goal.status === 'completed'
                                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                  }`}
                              >
                                {goal.status === 'completed' ? t('goals.completed') : t('goals.progress')}
                              </span>
                            </div>
                            <p className="text-zinc-500 dark:text-slate-400 text-xs leading-normal">{getCategoryLabel(goal.category, t)}</p>
                            <p className="text-zinc-500 dark:text-slate-400 text-xs leading-normal">{goal.dueDate && `${goal.dueDate}`}</p>
                          </div>
                        </div>
                        <div className="flex flex-row sm:flex-col sm:items-end items-center gap-3 sm:gap-2 w-full sm:w-auto sm:min-w-[180px]">
                          <div className="flex flex-col sm:items-end gap-2 flex-1 w-full sm:w-auto min-w-0">
                            <div className="flex justify-between w-full sm:justify-end gap-2">
                              <span className="text-[10px] uppercase font-semibold text-zinc-400 dark:text-slate-500 tracking-wider">{t('goals.progress')}</span>
                              <span className="text-[10px] font-bold text-zinc-900 dark:text-white">{Math.round(getGoalDisplayProgress(goal))}%</span>
                            </div>
                            <div className="w-full h-2 md:h-1.5 rounded-full bg-zinc-100 dark:bg-slate-700 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${getGoalDisplayProgress(goal) >= 100 ? 'bg-emerald-500' : getGoalDisplayProgress(goal) >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                                  }`}
                                style={{ width: `${Math.min(getGoalDisplayProgress(goal), 100)}%` }}
                                role="progressbar"
                                aria-valuenow={Math.round(getGoalDisplayProgress(goal))}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={t('goals.progressLabel', { percent: Math.round(getGoalDisplayProgress(goal)) })}
                              />
                            </div>
                          </div>
                          <div className="flex flex-row items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              className="flex min-h-[44px] min-w-[44px] items-center justify-center p-2.5 rounded-lg text-zinc-400 dark:text-slate-400 hover:text-primary dark:hover:text-blue-300 hover:bg-primary/10 dark:hover:bg-blue-900/20 transition-colors touch-manipulation disabled:opacity-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCopyModal(goal);
                              }}
                              disabled={copyingGoalId === goal.id}
                              aria-label={t('goals.copyGoalAria')}
                              title={t('goals.copyGoal')}
                            >
                              <span className="material-symbols-outlined text-[20px]">{copyingGoalId === goal.id ? 'hourglass_empty' : 'content_copy'}</span>
                            </button>
                            <button
                              type="button"
                              className="flex min-h-[44px] min-w-[44px] items-center justify-center p-2.5 rounded-lg text-zinc-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors touch-manipulation"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(goal);
                              }}
                              aria-label={t('goals.deleteGoalLabel', { title: goal.title })}
                              title={t('goals.deleteGoal')}
                            >
                              <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Mobile: floating add goal button (bottom-right) */}
        <button
          type="button"
          onClick={() => {
            setGoalFormErrors((prev) => ({ ...prev, submit: null }));
            setAddGoalModalOpen(true);
          }}
          className="md:hidden fixed bottom-6 right-6 z-40 flex size-14 min-h-[56px] min-w-[56px] items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40 hover:bg-primary/90 active:scale-95 transition-all touch-manipulation"
          aria-label={t('goals.addGoal')}
        >
          <span className="material-symbols-outlined text-[28px]">add</span>
        </button>
      </main>

      {/* Copy success toast */}
      {copyToastVisible && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="flex items-center gap-3 rounded-lg bg-zinc-900 text-white dark:bg-slate-900/95 px-4 py-3 shadow-lg shadow-black/40 border border-zinc-800 dark:border-slate-700 max-w-xs">
            <span className="material-symbols-outlined text-[20px] text-emerald-400">check_circle</span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{t('goals.copyGoal')}</span>
              <span className="text-xs text-zinc-300 dark:text-slate-300">{t('goals.copyGoalSuccess', 'Goal copied successfully')}</span>
            </div>
          </div>
        </div>
      )}

      <MobileSidebarDrawer isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Add Goal Modal */}
      {addGoalModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-zinc-900/20 backdrop-blur-sm transition-all duration-300"
          onClick={() => { if (!goalFormSubmitting) handleCloseAddModal(); }}
        >
          <div
            className="relative transform overflow-hidden rounded-xl bg-white dark:bg-slate-800 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-zinc-100 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <ModalMutationProgressBar active={goalFormSubmitting} label={t('common.saving')} />
            <form onSubmit={handleAddGoal} aria-busy={goalFormSubmitting}>
              <div className="bg-white dark:bg-slate-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white" id="add-goal-title">{t('goals.addGoalModalTitle')}</h3>
                    <p className="text-sm text-zinc-500 dark:text-slate-400 mt-1">{t('goals.addGoalModalDesc')}</p>
                  </div>
                  <button
                    type="button"
                    disabled={goalFormSubmitting}
                    className="p-2 -mr-2 -mt-2 rounded-full hover:bg-zinc-100 dark:hover:bg-slate-700 transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none"
                    onClick={handleCloseAddModal}
                    aria-label={t('common.close')}
                  >
                    <span className="material-symbols-outlined text-zinc-400 dark:text-slate-400 hover:text-zinc-600 dark:hover:text-white text-[24px]">close</span>
                  </button>
                </div>
                <div className={`space-y-4 ${goalFormSubmitting ? 'pointer-events-none opacity-70' : ''}`}>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('goals.goalName')}
                    </label>
                    <input
                      autoFocus
                      disabled={goalFormSubmitting}
                      className={`w-full rounded-lg bg-white dark:bg-slate-700 text-zinc-900 dark:text-slate-100 px-4 py-2.5 text-sm focus:bg-white dark:focus:bg-slate-700 focus:ring-0 placeholder:text-zinc-400 dark:placeholder:text-slate-500 transition-all font-medium shadow-sm hover:border-zinc-300 dark:hover:border-slate-600 border disabled:opacity-60 disabled:cursor-not-allowed ${goalFormErrors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-zinc-200 dark:border-slate-600 focus:border-zinc-400 dark:focus:border-primary'
                        }`}
                      placeholder={t('goals.goalNamePlaceholder')}
                      type="text"
                      value={goalForm.title}
                      onChange={(e) => handleGoalFormChange('title', e.target.value)}
                      onBlur={(e) => handleGoalFormBlur('title', e.target.value)}
                      required
                      aria-invalid={goalFormErrors.title ? 'true' : 'false'}
                      aria-describedby={goalFormErrors.title ? 'title-error' : undefined}
                    />
                    {goalFormErrors.title && (
                      <p id="title-error" className="text-xs text-red-500 mt-1" role="alert">
                        {goalFormErrors.title}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-zinc-500 dark:text-slate-400 uppercase tracking-wider" htmlFor="add-goal-category">{t('goals.category')}</label>
                      <select
                        id="add-goal-category"
                        disabled={goalFormSubmitting}
                        className={`w-full rounded-lg bg-white dark:bg-slate-700 text-zinc-900 dark:text-slate-100 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-primary/30 focus:border-blue-400 border transition-all font-medium cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${goalFormErrors.category ? 'border-red-500' : 'border-zinc-200 dark:border-slate-600 hover:border-zinc-300 dark:hover:border-slate-500'
                          }`}
                        value={goalForm.category || ''}
                        onChange={(e) => {
                          const option = categoryOptions.find(o => o.apiCategory === e.target.value);
                          if (option) handleCategorySelect(option);
                        }}
                        required
                        aria-invalid={goalFormErrors.category ? 'true' : 'false'}
                        aria-describedby={goalFormErrors.category ? 'category-error' : undefined}
                      >
                        <option value="">{t('goals.selectCategory')}</option>
                        {categoryOptions.map((opt) => (
                          <option key={opt.value} value={opt.apiCategory}>{t(`goals.${opt.labelKey}`)}</option>
                        ))}
                      </select>
                      {goalFormErrors.category && (
                        <p id="category-error" className="text-xs text-red-500 mt-1" role="alert">
                          {goalFormErrors.category}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-zinc-500 dark:text-slate-400 uppercase tracking-wider" htmlFor="add-goal-due">{t('goals.dueDate')}</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-zinc-400 dark:text-slate-500 text-[18px] pointer-events-none">event</span>
                        <input
                          id="add-goal-due"
                          disabled={goalFormSubmitting}
                          className={`w-full rounded-lg bg-white dark:bg-slate-700 text-zinc-900 dark:text-slate-100 pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-primary/30 focus:border-blue-400 border transition-all cursor-pointer hover:bg-zinc-50 dark:hover:bg-slate-600 disabled:opacity-60 disabled:cursor-not-allowed ${goalFormErrors.dueDate ? 'border-red-500' : 'border-zinc-200 dark:border-slate-600 hover:border-zinc-300'
                            }`}
                          type="date"
                          value={goalForm.dueDate}
                          onChange={(e) => handleGoalFormChange('dueDate', e.target.value)}
                          onBlur={(e) => handleGoalFormBlur('dueDate', e.target.value)}
                          aria-invalid={goalFormErrors.dueDate ? 'true' : 'false'}
                          aria-describedby={goalFormErrors.dueDate ? 'dueDate-error' : undefined}
                        />
                      </div>
                      {goalFormErrors.dueDate && (
                        <p id="dueDate-error" className="text-xs text-red-500 mt-1" role="alert">
                          {goalFormErrors.dueDate}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {goalFormErrors.submit && (
                <p className="px-4 sm:px-6 pt-2 text-sm text-red-600" role="alert">
                  {goalFormErrors.submit}
                </p>
              )}
              <div className="bg-zinc-50/50 dark:bg-slate-800/50 px-4 py-3 flex flex-row-reverse gap-3 sm:px-6 border-t border-zinc-100 dark:border-slate-700">
                <button
                  type="submit"
                  disabled={goalFormSubmitting}
                  className="inline-flex flex-1 justify-center items-center min-h-[48px] rounded-xl sm:rounded-lg bg-zinc-900 dark:bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 dark:hover:bg-blue-600 transition-colors touch-manipulation disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {goalFormSubmitting ? t('common.saving') : t('goals.createGoal')}
                </button>
                <button
                  type="button"
                  disabled={goalFormSubmitting}
                  className="inline-flex flex-1 justify-center items-center min-h-[48px] rounded-xl sm:rounded-lg bg-white dark:bg-slate-700 px-4 py-3 text-sm font-medium text-zinc-900 dark:text-slate-100 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-slate-600 hover:bg-zinc-50 dark:hover:bg-slate-600 transition-colors touch-manipulation disabled:opacity-50 disabled:pointer-events-none"
                  onClick={handleCloseAddModal}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Copy / Rename Goal Modal */}
      {copyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-zinc-900/20 backdrop-blur-sm transition-all duration-300"
          onClick={() => { if (!copyingGoalId) handleCloseCopyModal(); }}
        >
          <div
            className="relative transform overflow-hidden rounded-xl bg-white dark:bg-slate-800 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-zinc-100 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <ModalMutationProgressBar active={!!copyingGoalId} label={t('common.processing')} />
            <form onSubmit={handleConfirmCopy} aria-busy={!!copyingGoalId}>
              <div className="bg-white dark:bg-slate-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      {t('goals.copyGoal')}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-slate-400 mt-1">
                      {t('goals.copyGoalModalDesc', { title: goalToCopy?.title })}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!!copyingGoalId}
                    className="p-2 -mr-2 -mt-2 rounded-full hover:bg-zinc-100 dark:hover:bg-slate-700 transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none"
                    onClick={handleCloseCopyModal}
                    aria-label={t('common.close')}
                  >
                    <span className="material-symbols-outlined text-zinc-400 dark:text-slate-400 hover:text-zinc-600 dark:hover:text-white text-[24px]">
                      close
                    </span>
                  </button>
                </div>
                <div className={`space-y-4 ${copyingGoalId ? 'pointer-events-none opacity-70' : ''}`}>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('goals.goalName')}
                    </label>
                    <input
                      autoFocus
                      disabled={!!copyingGoalId}
                      className={`w-full rounded-lg bg-white dark:bg-slate-700 text-zinc-900 dark:text-slate-100 px-4 py-2.5 text-sm focus:bg-white dark:focus:bg-slate-700 focus:ring-0 placeholder:text-zinc-400 dark:placeholder:text-slate-500 transition-all font-medium shadow-sm hover:border-zinc-300 dark:hover:border-slate-600 border disabled:opacity-60 disabled:cursor-not-allowed ${
                        copyTitleError
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                          : 'border-zinc-200 dark:border-slate-600 focus:border-zinc-400 dark:focus:border-primary'
                      }`}
                      placeholder={t('goals.goalNamePlaceholder')}
                      type="text"
                      value={copyTitle}
                      onChange={(e) => {
                        setCopyTitle(e.target.value);
                        if (copyTitleError) setCopyTitleError('');
                      }}
                    />
                    {copyTitleError && (
                      <p className="text-xs text-red-500 mt-1" role="alert">
                        {copyTitleError}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-zinc-50/50 dark:bg-slate-800/50 px-4 py-3 flex flex-row-reverse gap-3 sm:px-6 border-t border-zinc-100 dark:border-slate-700">
                <button
                  type="submit"
                  className="inline-flex flex-1 justify-center items-center min-h-[48px] rounded-xl sm:rounded-lg bg-zinc-900 dark:bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 dark:hover:bg-blue-600 transition-colors touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={!!copyingGoalId}
                >
                  {copyingGoalId ? t('common.processing') : t('goals.copyGoal')}
                </button>
                  <button
                    type="button"
                    disabled={!!copyingGoalId}
                    className="inline-flex flex-1 justify-center items-center min-h-[48px] rounded-xl sm:rounded-lg bg-white dark:bg-slate-700 px-4 py-3 text-sm font-medium text-zinc-900 dark:text-slate-100 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-slate-600 hover:bg-zinc-50 dark:hover:bg-slate-600 transition-colors touch-manipulation disabled:opacity-50 disabled:pointer-events-none"
                    onClick={handleCloseCopyModal}
                  >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && goalToDelete && (
        <div
          aria-labelledby="modal-title"
          aria-modal="true"
          className="relative z-50"
          role="dialog"
        >
          <div
            className="fixed inset-0 bg-zinc-900/20 backdrop-blur-sm transition-opacity"
            onClick={() => { if (!deleteGoalSubmitting) handleCancelDelete(); }}
          />
          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-xl bg-white dark:bg-slate-800 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-zinc-100 dark:border-slate-700">
                <ModalMutationProgressBar active={deleteGoalSubmitting} label={t('common.processing')} />
                <div className="bg-white dark:bg-slate-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30 sm:mx-0 sm:h-10 sm:w-10">
                      <span className="material-symbols-outlined text-red-600 dark:text-red-400" style={{ fontSize: '24px' }}>delete</span>
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                      <h3 className="text-base font-semibold leading-6 text-zinc-900 dark:text-white" id="modal-title">{t('goals.deleteModalTitle')}</h3>
                      <div className="mt-2">
                        <p className="text-sm text-zinc-500 dark:text-slate-400">{t('goals.deleteModalConfirm')}</p>
                        <div className="mt-4 flex items-center gap-4 rounded-lg border border-zinc-100 dark:border-slate-600 bg-zinc-50 dark:bg-slate-700 p-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-600 border border-zinc-200 dark:border-slate-500 shadow-sm text-zinc-900 dark:text-white">
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{goalToDelete.icon}</span>
                          </div>
                          <div className="flex flex-col text-left">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">{goalToDelete.title}</p>
                            <p className="text-xs text-zinc-500 dark:text-slate-400">{getCategoryLabel(goalToDelete.category, t)} • {goalToDelete.dueDate}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-zinc-50/50 dark:bg-slate-800/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-zinc-100 dark:border-slate-700 gap-3 sm:gap-0">
                  <button
                    className="inline-flex w-full justify-center items-center min-h-[48px] rounded-xl sm:rounded-lg bg-red-600 px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto transition-colors touch-manipulation disabled:opacity-70 disabled:cursor-not-allowed"
                    type="button"
                    disabled={deleteGoalSubmitting}
                    onClick={handleConfirmDelete}
                  >
                    {deleteGoalSubmitting ? t('common.processing') : t('goals.delete')}
                  </button>
                  <button
                    className="inline-flex w-full justify-center items-center min-h-[48px] rounded-xl sm:rounded-lg bg-white dark:bg-slate-700 px-3 py-3 text-sm font-medium text-zinc-900 dark:text-slate-100 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-slate-600 hover:bg-zinc-50 dark:hover:bg-slate-600 sm:w-auto transition-colors touch-manipulation disabled:opacity-50"
                    type="button"
                    disabled={deleteGoalSubmitting}
                    onClick={handleCancelDelete}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsPage;

