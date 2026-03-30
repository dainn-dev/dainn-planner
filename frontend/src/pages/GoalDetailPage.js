import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import MobileSidebarDrawer from '../components/MobileSidebarDrawer';
import AddTaskModal from '../components/AddTaskModal';
import ModalMutationProgressBar from '../components/ModalMutationProgressBar';
import { goalsAPI, notificationsAPI, tasksAPI } from '../services/api';
import { formatDate } from '../utils/dateFormat';

const localeToDateLocale = (locale) => (locale === 'en' ? 'en-US' : 'vi-VN');

const categoryToIcon = {
  'Kỹ năng': 'code',
  'Tài chính': 'savings',
  'Sức khỏe': 'fitness_center',
  'Học tập': 'school',
  'Công việc': 'work',
  'Gia đình': 'home',
  'Du lịch': 'flight',
};

const mapGoalDetailFromApi = (g, locale = 'vi') => {
  const dateLocale = localeToDateLocale(locale);
  const dueDate = g.targetDate
    ? new Date(g.targetDate).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';
  const milestones = (g.milestones || []).map(m => {
    const targetDateObj = m.targetDate ? new Date(m.targetDate) : null;
    const completedDateObj = m.completedDate ? new Date(m.completedDate) : null;
    return {
      id: m.id,
      title: m.title,
      completed: m.isCompleted ?? m.completed,
      date: targetDateObj ? targetDateObj.toLocaleDateString(dateLocale) : '',
      targetDateObj,
      completedDateObj,
    };
  });
  const tasks = (g.tasks || []).map(t => ({
    id: t.id,
    text: t.title,
    completed: t.isCompleted ?? t.completed,
    date: t.dueDate ? new Date(t.dueDate).toLocaleDateString(dateLocale) : '',
  }));
  const completedM = milestones.filter(m => m.completed).length;
  const totalM = milestones.length;
  const progress = totalM > 0 ? Math.round((completedM / totalM) * 100) : (typeof g.progress === 'number' ? Math.round(g.progress) : 0);
  return {
    id: g.id,
    title: g.title,
    category: g.category || '',
    dueDate,
    progress,
    icon: categoryToIcon[g.category] || 'flag',
    status: (g.status || '').toLowerCase() === 'completed' ? 'completed' : 'active',
    description: g.description || '',
    milestones,
    tasks,
  };
};

/** Format vi-VN date string (d/m/yyyy) to yyyy-mm-dd for input[type="date"], or return '' if invalid/empty */
const toDateInputValue = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.trim().split('/').filter(Boolean);
  if (parts.length !== 3) return '';
  const [d, m, y] = parts.map((p) => parseInt(p, 10));
  if (Number.isNaN(d) || Number.isNaN(m) || Number.isNaN(y)) return '';
  const month = String(m).padStart(2, '0');
  const day = String(d).padStart(2, '0');
  const year = String(y);
  if (year.length !== 4) return '';
  return `${year}-${month}-${day}`;
};

/** Parse vi-VN (d/m/yyyy) or yyyy-mm-dd to Date; return null if invalid */
const parseGoalDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  const iso = toDateInputValue(trimmed);
  if (iso) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
};

const mapNotificationFromApi = (n, locale = 'vi') => {
  const dateLocale = localeToDateLocale(locale);
  return {
    id: n.id,
    type: n.type || 'system',
    title: n.title,
    message: n.message,
    time: n.createdAt ? new Date(n.createdAt).toLocaleString(dateLocale) : '',
    unread: !n.isRead,
    icon: n.icon || 'notifications',
    iconBg: 'bg-blue-100',
    iconColor: n.iconColor || 'text-primary',
  };
};

const GoalDetailPage = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedGoal, setEditedGoal] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [saveError, setSaveError] = useState(null);
  const [goalTasks, setGoalTasks] = useState([]);
  const [togglingTaskId, setTogglingTaskId] = useState(null);
  const [togglingMilestoneId, setTogglingMilestoneId] = useState(null);
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dropTargetMilestoneId, setDropTargetMilestoneId] = useState(null);
  const [movingTaskId, setMovingTaskId] = useState(null);
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [addTaskInitialTask, setAddTaskInitialTask] = useState(null);
  const [addTaskGoalContext, setAddTaskGoalContext] = useState(null);
  const [milestoneToDelete, setMilestoneToDelete] = useState(null);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [milestoneDeleteSubmitting, setMilestoneDeleteSubmitting] = useState(false);

  const handleMoveTaskToMilestone = async (taskId, targetMilestoneId) => {
    if (!id || !taskId || !targetMilestoneId) return;
    setMovingTaskId(taskId);
    try {
      await tasksAPI.updateTask(taskId, { goalMilestoneId: targetMilestoneId });
      const items = await loadGoalTasks(id);
      setGoalTasks(items ?? []);
    } catch (err) {
      console.error('Failed to move task:', err);
    } finally {
      setMovingTaskId(null);
    }
  };

  const handleToggleGoalTask = async (taskId) => {
    if (togglingTaskId) return;
    setTogglingTaskId(taskId);
    try {
      await tasksAPI.completeTask(taskId);
      const items = await loadGoalTasks(id);
      setGoalTasks(items ?? []);
    } catch (err) {
      console.error('Failed to toggle task:', err);
    } finally {
      setTogglingTaskId(null);
    }
  };

  const handleDeleteGoalTask = async (taskId) => {
    if (!window.confirm(t('goals.confirmDeleteTask'))) return;
    if (togglingTaskId === taskId) return;
    if (deletingTaskId) return;
    setDeletingTaskId(taskId);
    try {
      await tasksAPI.deleteTask(taskId);
      const items = await loadGoalTasks(id);
      setGoalTasks(items ?? []);
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      setDeletingTaskId(null);
    }
  };

  const loadGoalTasks = React.useCallback(async (goalId) => {
    if (!goalId) return;
    try {
      const res = await tasksAPI.getTasks({ goalId, pageSize: 100 });
      return res?.items ?? [];
    } catch (err) {
      console.error('Failed to load goal tasks:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) {
        navigate('/goals');
        return;
      }
      try {
        setLoading(true);
        const [goalData, notificationsData] = await Promise.all([
          goalsAPI.getGoal(id),
          notificationsAPI.getNotifications({ limit: 20 }),
        ]);
        if (cancelled) return;
        const lang = i18n.language || 'vi';
        const mapped = mapGoalDetailFromApi(goalData, lang);
        setGoal(mapped);
        setEditedGoal({ ...mapped });
        const notifList = Array.isArray(notificationsData) ? notificationsData : (notificationsData?.notifications || []);
        setNotifications(notifList.map((n) => mapNotificationFromApi(n, lang)));
        const items = await loadGoalTasks(id);
        if (!cancelled) setGoalTasks(items);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load goal:', error);
          navigate('/goals');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id, navigate, i18n.language, loadGoalTasks]);

  const handleEdit = () => {
    if (isSavingGoal) return;
    setSaveError(null);
    setIsEditing(true);
    setEditedGoal({ ...goal });
  };

  const handleCancel = () => {
    if (isSavingGoal) return;
    setIsEditing(false);
    setEditedGoal({ ...goal });
  };

  const isGuid = (id) => {
    if (id == null) return false;
    const s = typeof id === 'string' ? id : String(id);
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  };

  const handleSave = async () => {
    if (isSavingGoal) return;
    setSaveError(null);
    setIsSavingGoal(true);
    try {
      const parsedDue = parseGoalDate(editedGoal.dueDate);
      const targetDate = parsedDue ? parsedDue.toISOString() : null;
      const milestones = (editedGoal.milestones || []).map((m) => {
        const parsedMilestoneDate = parseGoalDate(m.date);
        return {
          id: isGuid(m.id) ? m.id : null,
          title: m.title ?? '',
          description: null,
          targetDate: parsedMilestoneDate ? parsedMilestoneDate.toISOString() : null,
          isCompleted: !!m.completed,
        };
      });
      const res = await goalsAPI.updateGoal(goal.id, {
        title: editedGoal.title,
        description: editedGoal.description,
        category: editedGoal.category,
        targetDate,
        status: editedGoal.status === 'completed' ? 'Completed' : 'Active',
        milestones,
      });
      const updatedGoalData = res?.data ?? res;
      if (updatedGoalData && typeof updatedGoalData === 'object') {
        const mapped = mapGoalDetailFromApi(updatedGoalData, i18n.language || 'vi');
        setGoal(mapped);
        setEditedGoal({ ...mapped });
      } else {
        setGoal(editedGoal);
      }
      setIsEditing(false);
      await refetchNotifications();
    } catch (error) {
      console.error('Failed to update goal:', error);
      setSaveError(error?.message || t('goals.saveError'));
    } finally {
      setIsSavingGoal(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setEditedGoal(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMilestoneToggle = (milestoneId) => {
    setEditedGoal(prev => {
      const updatedMilestones = prev.milestones.map(m => 
        m.id === milestoneId ? { ...m, completed: !m.completed } : m
      );
      // Calculate progress based on completed milestones
      const completedCount = updatedMilestones.filter(m => m.completed).length;
      const totalCount = updatedMilestones.length;
      const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      
      return {
        ...prev,
        milestones: updatedMilestones,
        progress: newProgress
      };
    });
  };

  const refetchNotifications = async () => {
    try {
      const notificationsData = await notificationsAPI.getNotifications({ limit: 20 });
      const notifList = Array.isArray(notificationsData) ? notificationsData : (notificationsData?.notifications || []);
      setNotifications(notifList.map((n) => mapNotificationFromApi(n, i18n.language || 'vi')));
    } catch (_) {
      // ignore
    }
  };

  const handleMilestoneToggleView = async (milestoneId) => {
    if (togglingMilestoneId || !id) return;
    setTogglingMilestoneId(milestoneId);
    try {
      await goalsAPI.toggleMilestone(id, milestoneId);
      const goalData = await goalsAPI.getGoal(id);
      const mapped = mapGoalDetailFromApi(goalData?.data ?? goalData, i18n.language || 'vi');
      setGoal(mapped);
      await refetchNotifications();
    } catch (err) {
      console.error('Failed to toggle milestone:', err);
    } finally {
      setTogglingMilestoneId(null);
    }
  };

  const handleAddMilestone = () => {
    const dateLocale = localeToDateLocale(i18n.language || 'vi');
    const newMilestone = {
      id: Date.now(),
      title: t('goals.newMilestoneTitle'),
      completed: false,
      date: new Date().toLocaleDateString(dateLocale)
    };
    setEditedGoal(prev => {
      const updatedMilestones = [...prev.milestones, newMilestone];
      // Recalculate progress with new milestone (new one is not completed, so progress may decrease)
      const completedCount = updatedMilestones.filter(m => m.completed).length;
      const totalCount = updatedMilestones.length;
      const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      
      return {
        ...prev,
        milestones: updatedMilestones,
        progress: newProgress
      };
    });
  };

  const handleDeleteMilestone = (milestoneId) => {
    setEditedGoal(prev => {
      const updatedMilestones = prev.milestones.filter(m => m.id !== milestoneId);
      // Recalculate progress after deletion
      const completedCount = updatedMilestones.filter(m => m.completed).length;
      const totalCount = updatedMilestones.length;
      const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      
      return {
        ...prev,
        milestones: updatedMilestones,
        progress: newProgress
      };
    });
  };

  const iconOptions = [
    { value: 'flag', label: t('goals.categoryGoal') },
    { value: 'code', label: t('goals.categorySkill') },
    { value: 'savings', label: t('goals.categoryFinance') },
    { value: 'fitness_center', label: t('goals.categoryHealth') },
    { value: 'school', label: t('goals.categoryLearning') },
    { value: 'work', label: t('goals.categoryWork') },
    { value: 'home', label: t('goals.categoryFamily') },
    { value: 'flight', label: t('goals.categoryTravel') }
  ];

  if (loading || !goal) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f6f7f8] dark:bg-[#101922]">
        <p className="text-gray-500 dark:text-slate-400">{t('common.loading')}</p>
      </div>
    );
  }

  // Tiến độ tổng thể: luôn tính từ số mốc hoàn thành / tổng số mốc
  const displayMilestones = isEditing && editedGoal ? (editedGoal.milestones ?? []) : (goal.milestones ?? []);
  const totalMilestones = displayMilestones.length;
  const completedMilestones = displayMilestones.filter(m => m.completed).length;
  const overallProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return (
    <div className="bg-[#f6f7f8] dark:bg-[#101922] text-[#111418] dark:text-slate-100 font-display overflow-hidden h-screen flex flex-row">
      {/* Sidebar - Desktop */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <Header 
          title={goal ? `${t('goals.manageGoalsSlash')}${goal.title}` : t('goals.detailTitle')}
          icon="info"
          notifications={notifications}
          onNotificationsChange={setNotifications}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Main Content Area - mobile-friendly padding and spacing */}
        <div className="flex-1 min-h-0 flex justify-center py-4 sm:py-6 px-3 sm:px-4 md:px-8 overflow-y-auto">
          <div className="max-w-[1024px] flex-1 flex flex-col gap-5 sm:gap-8 w-full min-h-0">
          {/* Back Button - larger touch target on mobile */}
          <button
            type="button"
            onClick={() => navigate('/goals')}
            className="flex items-center gap-2 min-h-[44px] py-2 -ml-1 pl-1 pr-3 text-gray-500 dark:text-slate-400 hover:text-[#111418] dark:hover:text-white active:bg-gray-100 dark:active:bg-slate-800 rounded-lg transition-colors text-sm font-medium self-start touch-manipulation"
            aria-label={t('goals.backToGoals')}
          >
            <span className="material-symbols-outlined text-xl sm:text-lg">arrow_back</span>
            <span className="sm:hidden">{t('goals.backShort')}</span>
            <span className="hidden sm:inline">{t('goals.backToGoals')}</span>
          </button>

          {/* Goal Header */}
          <div className="relative flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl sm:rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <ModalMutationProgressBar active={isSavingGoal} label={t('common.saving')} />
            {/* Mobile: icon inline with title + actions */}
            <div className="flex sm:hidden items-center gap-3 w-full min-w-0">
              <div className="flex items-center justify-center rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600 size-12 shrink-0">
                <span className="material-symbols-outlined text-2xl">{isEditing ? editedGoal.icon : goal.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    type="text"
                    value={editedGoal.title}
                    disabled={isSavingGoal}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    className="w-full text-xl font-semibold text-gray-900 dark:text-white bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:border-gray-400 dark:focus:border-primary focus:ring-0 shadow-sm touch-manipulation disabled:opacity-60"
                  />
                ) : (
                  <h2 className="text-xl font-semibold text-[#111418] dark:text-white break-words line-clamp-2">{goal.title}</h2>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-1">
                {isEditing ? (
                  <>
                    <button onClick={handleSave} type="button" disabled={isSavingGoal} className="min-h-[40px] px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg touch-manipulation disabled:opacity-70 disabled:cursor-not-allowed" aria-label={t('common.save')}>{isSavingGoal ? t('common.processing') : t('common.save')}</button>
                    <button onClick={handleCancel} type="button" disabled={isSavingGoal} className="min-h-[40px] px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm font-medium rounded-lg border border-gray-200 dark:border-slate-600 touch-manipulation disabled:opacity-50" aria-label={t('common.cancel')}>{t('common.cancel')}</button>
                  </>
                ) : (
                  <button onClick={handleEdit} type="button" className="min-h-[40px] min-w-[40px] p-2 text-gray-500 hover:text-primary rounded-lg hover:bg-primary/10 touch-manipulation flex items-center justify-center" aria-label={t('goals.editGoalAria')}>
                    <span className="material-symbols-outlined text-[22px]">edit</span>
                  </button>
                )}
              </div>
            </div>
            {/* Desktop: icon column */}
            <div className="hidden sm:flex flex-col items-center gap-3 shrink-0">
              <div className="flex items-center justify-center rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600 size-16">
                <span className="material-symbols-outlined text-4xl">{isEditing ? editedGoal.icon : goal.icon}</span>
              </div>
              {isEditing && (
                <div className="flex flex-wrap gap-2 justify-center w-full max-w-[200px] overflow-x-auto pb-1">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon.value}
                      type="button"
                      disabled={isSavingGoal}
                      onClick={() => handleFieldChange('icon', icon.value)}
                      className={`flex items-center justify-center min-w-[44px] min-h-[44px] size-10 rounded-lg border transition-all touch-manipulation shrink-0 disabled:opacity-50 ${
                        (isEditing ? editedGoal.icon : goal.icon) === icon.value
                          ? 'bg-primary border-primary text-white'
                          : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-600 active:bg-gray-100 dark:active:bg-slate-500'
                      }`}
                      title={icon.label}
                      aria-label={icon.label}
                    >
                      <span className="material-symbols-outlined text-xl">{icon.value}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {/* Desktop: title row + actions */}
              <div className="hidden sm:flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-2">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editedGoal.title}
                        disabled={isSavingGoal}
                        onChange={(e) => handleFieldChange('title', e.target.value)}
                        className="w-full text-2xl font-semibold text-gray-900 dark:text-white bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-3 min-h-[48px] focus:outline-none focus:border-gray-400 dark:focus:border-primary focus:ring-0 shadow-sm hover:border-gray-300 dark:hover:border-slate-500 transition-all touch-manipulation disabled:opacity-60"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={editedGoal.category}
                          disabled={isSavingGoal}
                          onChange={(e) => handleFieldChange('category', e.target.value)}
                          className="w-full text-sm text-gray-600 dark:text-slate-200 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-3 min-h-[44px] focus:outline-none focus:border-gray-400 dark:focus:border-primary focus:ring-0 shadow-sm hover:border-gray-300 dark:hover:border-slate-500 transition-all touch-manipulation disabled:opacity-60"
                          placeholder={t('goals.category')}
                        />
                        <input
                          type="date"
                          value={toDateInputValue(editedGoal.dueDate)}
                          disabled={isSavingGoal}
                          onChange={(e) => {
                            const date = new Date(e.target.value);
                            const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                            handleFieldChange('dueDate', formattedDate);
                          }}
                          className="w-full text-sm text-gray-600 dark:text-slate-200 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-3 min-h-[44px] focus:outline-none focus:border-gray-400 dark:focus:border-primary focus:ring-0 shadow-sm hover:border-gray-300 dark:hover:border-slate-500 transition-all touch-manipulation disabled:opacity-60"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <h2 className="text-2xl font-semibold text-[#111418] dark:text-white mb-1 break-words">{goal.title}</h2>
                      <p className="text-gray-500 dark:text-slate-400 text-sm break-words">{goal.category} </p> 
                      <p className="text-gray-500 dark:text-slate-400 text-sm break-words">{t('goals.dueLabel')} {goal.dueDate}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-row items-center gap-2 shrink-0">
                  {saveError && (
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg border border-red-100 dark:border-red-800" role="alert">
                      {saveError}
                    </p>
                  )}
                  {isEditing ? (
                    <div className="flex gap-2">
                      <button onClick={handleSave} type="button" disabled={isSavingGoal} className="min-h-[44px] px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors touch-manipulation disabled:opacity-70 disabled:cursor-not-allowed" aria-label={t('goals.saveAria')}>{isSavingGoal ? t('common.processing') : t('common.save')}</button>
                      <button onClick={handleCancel} type="button" disabled={isSavingGoal} className="min-h-[44px] px-4 py-2.5 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm font-medium rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors touch-manipulation disabled:opacity-50" aria-label={t('goals.cancelEditAria')}>{t('common.cancel')}</button>
                    </div>
                  ) : (
                    <button onClick={handleEdit} type="button" className="min-h-[44px] min-w-[44px] p-2.5 text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-300 rounded-lg hover:bg-primary/10 dark:hover:bg-blue-500/20 touch-manipulation flex items-center justify-center" aria-label={t('goals.editGoalAria')}>
                      <span className="material-symbols-outlined text-[22px]">edit</span>
                    </button>
                  )}
                </div>
              </div>
              {/* Mobile: category, date (and when editing: title row already above, so show category/date + icon picker) */}
              <div className="sm:hidden space-y-3 mt-1">
                {saveError && (
                  <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg border border-red-100 dark:border-red-800" role="alert">
                    {saveError}
                  </p>
                )}
                {isEditing && (
                  <div className="flex flex-wrap gap-1.5 justify-start w-full overflow-x-auto pb-1">
                    {iconOptions.map((icon) => (
                      <button
                        key={icon.value}
                        type="button"
                        disabled={isSavingGoal}
                        onClick={() => handleFieldChange('icon', icon.value)}
                        className={`flex items-center justify-center min-w-[32px] min-h-[32px] size-8 rounded-md border transition-all touch-manipulation shrink-0 disabled:opacity-50 ${
                          (isEditing ? editedGoal.icon : goal.icon) === icon.value
                            ? 'bg-primary border-primary text-white'
                            : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300'
                        }`}
                        title={icon.label}
                        aria-label={icon.label}
                      >
                        <span className="material-symbols-outlined text-base">{icon.value}</span>
                      </button>
                    ))}
                  </div>
                )}
                {isEditing ? (
                  <div className="grid grid-cols-1 gap-3">
                    <input
                      type="text"
                      value={editedGoal.category}
                      disabled={isSavingGoal}
                      onChange={(e) => handleFieldChange('category', e.target.value)}
                      className="w-full text-sm text-gray-600 dark:text-slate-200 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-3 min-h-[44px] focus:outline-none focus:border-gray-400 dark:focus:border-primary focus:ring-0 touch-manipulation disabled:opacity-60"
                      placeholder={t('goals.category')}
                    />
                    <input
                      type="date"
                      value={toDateInputValue(editedGoal.dueDate)}
                      disabled={isSavingGoal}
                      onChange={(e) => {
                        const date = new Date(e.target.value);
                        const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                        handleFieldChange('dueDate', formattedDate);
                      }}
                      className="w-full text-sm text-gray-600 dark:text-slate-200 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-3 min-h-[44px] focus:outline-none focus:border-gray-400 dark:focus:border-primary focus:ring-0 touch-manipulation disabled:opacity-60"
                    />
                  </div>
                ) : (
                  <>
                    <p className="text-gray-500 dark:text-slate-400 text-sm break-words">{goal.category}</p>
                    <p className="text-gray-500 dark:text-slate-400 text-sm break-words">{t('goals.dueLabel')} {goal.dueDate}</p>
                  </>
                )}
              </div>
              {isEditing ? (
                <textarea
                  value={editedGoal.description}
                  disabled={isSavingGoal}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  className="w-full mt-3 text-sm text-gray-900 dark:text-slate-200 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-3 min-h-[90px] focus:outline-none focus:border-gray-400 dark:focus:border-primary focus:ring-0 resize-none leading-relaxed shadow-sm hover:border-gray-300 dark:hover:border-slate-500 transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500 touch-manipulation disabled:opacity-60"
                  placeholder={t('goals.descriptionPlaceholder')}
                />
              ) : (
                <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed mt-3 break-words">{goal.description}</p>
              )}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t('goals.overallProgress')}</span>
                <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                  <div className="flex-1 min-w-0 h-2.5 sm:h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden max-w-[200px] sm:max-w-[192px]">
                    <div 
                      className="h-full rounded-full bg-primary transition-all duration-300" 
                      style={{ width: `${overallProgress}%` }}
                      role="progressbar"
                      aria-valuenow={overallProgress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={t('goals.progressLabelAria', { percent: overallProgress })}
                    />
                  </div>
                  <span className="text-sm font-bold text-[#111418] dark:text-white shrink-0">{overallProgress}%</span>
                  {isEditing && (
                    <span className="hidden sm:inline text-xs text-gray-400 dark:text-slate-500">{t('goals.auto')}</span>
                  )}
                  {totalMilestones > 0 && (
                    <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0">{t('goals.milestonesCount', { completed: completedMilestones, total: totalMilestones })}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Milestones Section */}
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base sm:text-lg font-medium text-[#111418] dark:text-white">{t('goals.milestones')}</h3>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleAddMilestone}
                  className="flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl sm:rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 active:bg-gray-100 dark:active:bg-slate-600 transition-colors shadow-sm touch-manipulation w-full sm:w-auto"
                >
                  <span className="material-symbols-outlined text-xl">add</span>
                  <span>{t('goals.addMilestone')}</span>
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:gap-3">
              {(isEditing ? editedGoal.milestones : goal.milestones).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 border-dashed rounded-lg text-center">
                  <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-slate-500 mb-2">flag</span>
                  <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">{t('goals.noMilestones')}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{t('goals.addMilestonesHint')}</p>
                </div>
              ) : (isEditing ? editedGoal.milestones : goal.milestones).map((milestone, index) => {
                const currentMilestone = milestone;
                return (
                  <div
                    key={milestone.id}
                    className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl sm:rounded-lg hover:border-gray-300 dark:hover:border-slate-600 transition-colors shadow-sm"
                  >
                    <div className="flex flex-col items-center shrink-0">
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => handleMilestoneToggle(milestone.id)}
                          className={`min-w-[44px] min-h-[44px] size-8 sm:size-8 rounded-full flex items-center justify-center border-2 transition-colors touch-manipulation ${
                            currentMilestone.completed 
                              ? 'bg-primary border-primary text-white hover:bg-primary/90 active:bg-primary/80' 
                              : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-400 hover:border-gray-400 dark:hover:border-slate-500 active:bg-gray-50 dark:active:bg-slate-600'
                          }`}
                          aria-label={currentMilestone.completed ? t('goals.markIncompleteAria') : t('goals.markCompleteAria')}
                        >
                          {currentMilestone.completed ? (
                            <span className="material-symbols-outlined text-sm">check</span>
                          ) : (
                            <span className="text-xs font-bold">{index + 1}</span>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMilestoneToggleView(milestone.id)}
                          disabled={!!togglingMilestoneId}
                          className={`min-w-[44px] min-h-[44px] size-8 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors touch-manipulation disabled:opacity-50 ${
                            milestone.completed
                              ? 'bg-primary border-primary text-white hover:bg-primary/90 active:bg-primary/80'
                              : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-400 hover:border-primary hover:text-primary dark:hover:text-blue-300 hover:bg-primary/5 dark:hover:bg-blue-500/20 active:bg-primary/10 dark:active:bg-blue-500/30'
                          }`}
                          aria-label={milestone.completed ? t('goals.markIncompleteAria') : t('goals.markCompleteAria')}
                          title={milestone.completed ? t('goals.markIncomplete') : t('goals.markComplete')}
                        >
                          {milestone.completed ? (
                            <span className="material-symbols-outlined text-sm">check</span>
                          ) : (
                            <span className="text-xs font-bold">{index + 1}</span>
                          )}
                        </button>
                      )}
                       {index < (isEditing ? editedGoal.milestones : goal.milestones).length - 1 && (
                         <div className={`w-0.5 h-6 sm:h-8 mt-2 ${
                           currentMilestone.completed ? 'bg-primary' : 'bg-gray-200 dark:bg-slate-600'
                         }`} />
                       )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-row items-center justify-between gap-2 sm:gap-4 min-w-0">
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={currentMilestone.title}
                                onChange={(e) => {
                                  setEditedGoal(prev => ({
                                    ...prev,
                                    milestones: prev.milestones.map(m => 
                                      m.id === milestone.id ? { ...m, title: e.target.value } : m
                                    )
                                  }));
                                }}
                                className="w-full text-sm font-medium text-gray-900 dark:text-slate-200 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-3 min-h-[44px] focus:outline-none focus:border-gray-400 dark:focus:border-primary focus:ring-0 shadow-sm hover:border-gray-300 dark:hover:border-slate-500 transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500 touch-manipulation"
                                placeholder={t('goals.milestones')}
                              />
                              <input
                                type="date"
                                value={toDateInputValue(currentMilestone.date)}
                                onChange={(e) => {
                                  const date = new Date(e.target.value);
                                  const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                                  setEditedGoal(prev => ({
                                    ...prev,
                                    milestones: prev.milestones.map(m => 
                                      m.id === milestone.id ? { ...m, date: formattedDate } : m
                                    )
                                  }));
                                }}
                                className="w-full text-sm text-gray-600 dark:text-slate-200 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-3 min-h-[44px] focus:outline-none focus:border-gray-400 dark:focus:border-primary focus:ring-0 shadow-sm hover:border-gray-300 dark:hover:border-slate-500 transition-all touch-manipulation"
                              />
                            </div>
                          ) : (
                            <div className="min-w-0">
                              <p className={`text-sm font-medium break-words ${milestone.completed ? 'text-gray-500 dark:text-slate-500 line-through' : 'text-[#111418] dark:text-white'}`}>
                                {milestone.title}
                              </p>
                              <p className={`text-xs mt-1 ${(() => {
                                if (!milestone.completed || !milestone.completedDateObj || !milestone.targetDateObj) return 'text-gray-500 dark:text-slate-500';
                                const cDay = new Date(milestone.completedDateObj); cDay.setHours(0, 0, 0, 0);
                                const tDay = new Date(milestone.targetDateObj); tDay.setHours(0, 0, 0, 0);
                                return cDay > tDay ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
                              })()}`}>{milestone.date}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                          {!isEditing && !milestone.completed && (
                            <button
                              type="button"
                              onClick={() => {
                                const isoDate = toDateInputValue(milestone.date) || new Date().toISOString().slice(0, 10);
                                setAddTaskGoalContext({
                                  goalMilestoneId: milestone.id,
                                  goalId: goal.id,
                                });
                                setAddTaskInitialTask({
                                  title: milestone.title,
                                  date: `${isoDate}T12:00`,
                                });
                                setAddTaskModalOpen(true);
                              }}
                              className="min-h-[44px] min-w-[44px] p-2 text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-300 hover:bg-gray-100 dark:hover:bg-slate-700 active:bg-gray-200 dark:active:bg-slate-600 rounded-lg transition-colors touch-manipulation flex items-center justify-center"
                              aria-label={t('goals.addTaskFromMilestoneAria', { title: milestone.title })}
                              title={t('goals.addTask')}
                            >
                              <span className="material-symbols-outlined text-xl">task_alt</span>
                            </button>
                          )}
                          {!isEditing && milestone.completed && (
                            <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded border border-green-100 dark:border-green-800 whitespace-nowrap">{t('goals.completed')}</span>
                          )}
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => setMilestoneToDelete(milestone)}
                              className="min-h-[44px] min-w-[44px] p-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 active:bg-red-100 dark:active:bg-red-900/50 rounded-lg transition-colors touch-manipulation flex items-center justify-center"
                              aria-label={t('goals.deleteMilestoneAria', { title: milestone.title })}
                            >
                              <span className="material-symbols-outlined text-xl">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                      {!isEditing && (() => {
                        const milestoneIdStr = milestone.id != null ? String(milestone.id) : '';
                        const tasksForMilestone = goalTasks.filter(t => t.goalMilestoneId != null && String(t.goalMilestoneId) === milestoneIdStr);
                        const formatTaskDate = (d) => {
                          if (!d) return '';
                          return formatDate(typeof d === 'string' ? new Date(d) : d);
                        };
                        const isDropTarget = dropTargetMilestoneId != null && String(dropTargetMilestoneId) === milestoneIdStr;
                        return (
                          <div
                            className={`mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 rounded-lg transition-colors min-h-[44px] ${isDropTarget ? 'bg-primary/5 dark:bg-blue-500/10 border-2 border-dashed border-primary' : ''}`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              setDropTargetMilestoneId(milestone.id);
                            }}
                            onDragLeave={(e) => {
                              if (!e.currentTarget.contains(e.relatedTarget)) setDropTargetMilestoneId(null);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              setDropTargetMilestoneId(null);
                              try {
                                const data = JSON.parse(e.dataTransfer.getData('application/json') || '{}');
                                const { taskId: droppedTaskId, sourceMilestoneId } = data;
                                if (droppedTaskId && sourceMilestoneId !== milestoneIdStr) {
                                  handleMoveTaskToMilestone(droppedTaskId, milestone.id);
                                }
                              } catch (_) {}
                            }}
                          >
                            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t('goals.taskList')}</p>
                            {tasksForMilestone.length === 0 ? (
                              <p className="text-xs text-gray-400 dark:text-slate-500 py-2">{isDropTarget ? t('goals.dropTaskHere') : t('goals.noTasksInMilestone')}</p>
                            ) : (
                              <ul className="space-y-2">
                                {tasksForMilestone.map((task) => (
                                  <li
                                    key={task.id}
                                    draggable={togglingTaskId !== task.id && deletingTaskId !== task.id}
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, sourceMilestoneId: milestoneIdStr }));
                                      e.dataTransfer.effectAllowed = 'move';
                                      setDraggingTaskId(task.id);
                                    }}
                                    onDragEnd={() => setDraggingTaskId(null)}
                                    className={`flex items-center gap-2 text-sm min-w-0 rounded-lg transition-opacity ${draggingTaskId === task.id ? 'opacity-50' : ''} ${movingTaskId === task.id ? 'opacity-70' : ''}`}
                                  >
                                    <span className="shrink-0 cursor-grab active:cursor-grabbing text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 touch-none" title={t('goals.dragToMove')} aria-hidden>
                                      <span className="material-symbols-outlined text-lg">drag_indicator</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleGoalTask(task.id)}
                                      disabled={!!togglingTaskId}
                                      className={`shrink-0 min-h-[40px] min-w-[40px] p-1.5 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 touch-manipulation ${task.isCompleted ? 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700' : 'text-gray-600 dark:text-slate-300 hover:text-primary dark:hover:text-blue-300 hover:bg-primary/10 dark:hover:bg-blue-500/20'}`}
                                      aria-label={task.isCompleted ? t('goals.markIncompleteAria') : t('goals.markCompleteAria')}
                                    >
                                      <span className="material-symbols-outlined text-lg">
                                        {task.isCompleted ? 'check_circle' : 'radio_button_unchecked'}
                                      </span>
                                    </button>
                                    <span className={`flex-1 min-w-0 truncate ${task.isCompleted ? 'text-gray-500 dark:text-slate-500 line-through' : 'text-gray-900 dark:text-slate-200'}`}>
                                      {task.title}
                                    </span>
                                    {task.date && (
                                      <span className={`text-xs shrink-0 hidden sm:inline ${(() => {
                                        if (!task.isCompleted || !task.completedDate || !task.date) return 'text-gray-400 dark:text-slate-500';
                                        const cDay = new Date(task.completedDate); cDay.setHours(0, 0, 0, 0);
                                        const dDay = new Date(task.date); dDay.setHours(0, 0, 0, 0);
                                        return cDay > dDay ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
                                      })()}`}>{formatTaskDate(task.date)}</span>
                                    )}
                                    {!task.isCompleted && (
                                      <div className="flex items-center gap-0.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (togglingTaskId === task.id || deletingTaskId === task.id) return;
                                            setAddTaskGoalContext({
                                              goalMilestoneId: milestone.id,
                                              goalId: goal.id,
                                            });
                                            setAddTaskInitialTask(task);
                                            setAddTaskModalOpen(true);
                                          }}
                                          disabled={togglingTaskId === task.id || deletingTaskId === task.id}
                                          className="min-h-[40px] min-w-[40px] p-2 text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-300 hover:bg-gray-100 dark:hover:bg-slate-700 active:bg-gray-200 dark:active:bg-slate-600 rounded-lg transition-colors touch-manipulation flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                                          aria-label={t('goals.editTaskAria', { title: task.title })}
                                          title={t('goals.edit')}
                                        >
                                          <span className="material-symbols-outlined text-lg">edit</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteGoalTask(task.id)}
                                          disabled={!!deletingTaskId || togglingTaskId === task.id}
                                          className="min-h-[40px] min-w-[40px] p-2 text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 active:bg-red-100 dark:active:bg-red-900/50 rounded-lg transition-colors touch-manipulation flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                                          aria-label={t('goals.deleteTaskAria', { title: task.title })}
                                          title={t('common.delete')}
                                        >
                                          <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                      </div>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
      </div>

      {milestoneToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60"
          onClick={() => { if (!milestoneDeleteSubmitting) setMilestoneToDelete(null); }}
        >
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-gray-200 dark:border-slate-700 p-5 pt-6"
            onClick={(e) => e.stopPropagation()}
          >
            <ModalMutationProgressBar active={milestoneDeleteSubmitting} label={t('common.processing')} />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('goals.confirmDeleteMilestoneTitle', { title: milestoneToDelete.title })}
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
              {t('goals.confirmDeleteMilestoneBody')}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mb-4">
              {t('goals.confirmDeleteMilestoneTasksWarning')}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={milestoneDeleteSubmitting}
                onClick={() => setMilestoneToDelete(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={milestoneDeleteSubmitting}
                onClick={async () => {
                  const m = milestoneToDelete;
                  if (!m || milestoneDeleteSubmitting) return;
                  setMilestoneDeleteSubmitting(true);
                  handleDeleteMilestone(m.id);
                  try {
                    const milestoneIdStr = String(m.id);
                    const tasksForMilestone = goalTasks.filter(
                      (t) => t.goalMilestoneId != null && String(t.goalMilestoneId) === milestoneIdStr
                    );
                    await Promise.all(
                      tasksForMilestone.map((t) => tasksAPI.deleteTask(t.id))
                    );
                    const items = await loadGoalTasks(id);
                    setGoalTasks(items ?? []);
                  } catch (err) {
                    console.error('Failed to delete tasks for milestone:', err);
                  } finally {
                    setMilestoneDeleteSubmitting(false);
                    setMilestoneToDelete(null);
                  }
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {milestoneDeleteSubmitting ? t('common.processing') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      <AddTaskModal
        open={addTaskModalOpen}
        onClose={() => {
          setAddTaskModalOpen(false);
          setAddTaskInitialTask(null);
          setAddTaskGoalContext(null);
        }}
        onSaved={async () => {
          try {
            const [goalData, items] = await Promise.all([
              goalsAPI.getGoal(id),
              loadGoalTasks(id),
            ]);
            const mapped = mapGoalDetailFromApi(goalData?.data ?? goalData, i18n.language || 'vi');
            setGoal(mapped);
            setGoalTasks(items ?? []);
          } catch (err) {
            console.error('Failed to refresh goal after saving task:', err);
          } finally {
            setAddTaskModalOpen(false);
            setAddTaskInitialTask(null);
            setAddTaskGoalContext(null);
          }
        }}
        initialTask={addTaskInitialTask}
        goalContext={addTaskGoalContext}
      />

      <MobileSidebarDrawer isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </div>
  );
};

export default GoalDetailPage;

