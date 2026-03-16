import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { DEFAULT_TAGS, TAG_I18N_KEYS } from '../constants/tasks';
import { tasksAPI, notificationsAPI, eventsAPI } from '../services/api';
import LogoutButton from '../components/LogoutButton';
import { isStoredAdmin } from '../utils/auth';
import { formatDate, formatTime } from '../utils/dateFormat';
import AddTaskModal from '../components/AddTaskModal';

const toDateOnly = (d) => (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 10);
const mapEventForDaily = (e) => {
  const start = new Date(e.startDate);
  const isAllDay = e.isAllDay ?? e.allDay;
  const timeFrom = !isAllDay && e.startDate ? e.startDate.slice(11, 16) : null;
  const timeTo = !isAllDay && e.endDate ? e.endDate.slice(11, 16) : null;
  return {
    id: e.id,
    date: toDateOnly(start),
    time_from: timeFrom,
    time_to: timeTo,
    title: e.title,
    description: e.description || '',
    address: e.location || '',
    platform: e.platform || '',
    location_type: e.locationType || (e.platform ? 'online' : ''),
  };
};

// Recurrence keys for i18n
const RECURRENCE_KEYS = { 0: 'daily.recurrenceNone', 1: 'daily.recurrenceDaily', 2: 'daily.recurrenceWeekly', 3: 'daily.recurrenceMonthly' };
const formatDeadline = (dateVal) => {
  if (!dateVal) return null;
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
  if (Number.isNaN(d.getTime())) return null;
  return `${formatTime(d)} ${formatDate(d)}`;
};
const dateToDatetimeLocal = (dateVal) => {
  if (!dateVal) return '';
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
};
const mapTaskFromApi = (t) => {
  const dateObj = t.date ? new Date(t.date) : null;
  const completedDateObj = t.completedDate ? new Date(t.completedDate) : null;
  return {
    id: t.id,
    text: t.title ?? t.text,
    title: t.title,
    description: t.description,
    date: t.date,
    completed: t.isCompleted ?? t.completed,
    isCompleted: t.isCompleted ?? t.completed,
    dateObj,
    completedDateObj,
    priority: typeof t.priority === 'number' ? t.priority : (t.priority === 'Cao' ? 2 : t.priority === 'Trung bình' ? 1 : 0),
    recurrence: t.recurrence ?? 0,
    reminderTime: t.reminderTime ?? '',
    tags: t.tags ?? [],
    goalMilestoneId: t.goalMilestoneId ?? null,
    goalId: t.goalId ?? null,
  };
};

const DailyPage = () => {
  const { t } = useTranslation();
  const isAdmin = isStoredAdmin();
  const getPriorityLabel = (p) => (p === 2 ? t('daily.priorityHigh') : p === 1 ? t('daily.priorityMedium') : t('daily.priorityLow'));
  const getRecurrenceLabel = (r) => t(RECURRENCE_KEYS[r] ?? 'daily.recurrenceNone');
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [mainGoal, setMainGoal] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [addTaskReturnTo, setAddTaskReturnTo] = useState(null);
  const [addTaskInitialTask, setAddTaskInitialTask] = useState(null);
  const [addTaskGoalContext, setAddTaskGoalContext] = useState(null);
  const location = useLocation();
  const navigateTo = useNavigate();
  const [taskPage, setTaskPage] = useState(1);
  const [taskPageSize] = useState(4);
  const [taskTotalCount, setTaskTotalCount] = useState(0);
  const [taskTotalAll, setTaskTotalAll] = useState(0);   // all tasks (completed + incomplete) for progress
  const [taskCompletedCount, setTaskCompletedCount] = useState(0);
  const [taskStatusFilter, setTaskStatusFilter] = useState('incomplete'); // '' = all, 'completed', 'incomplete' — default: Việc cần làm
  const [taskPriorityFilter, setTaskPriorityFilter] = useState(''); // '' | '0' | '1' | '2'
  const [taskTagFilter, setTaskTagFilter] = useState(''); // '' or tag string
  const [taskSortOrder, setTaskSortOrder] = useState('desc'); // 'desc' | 'asc'
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [taskIdInProgress, setTaskIdInProgress] = useState(null); // task id showing 3s progress before toggle
  const [toggleProgressPercent, setToggleProgressPercent] = useState(0); // 0..100 for inline progress bar
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'task',
      title: t('daily.taskReminder'),
      message: 'Đến hạn nộp báo cáo quý vào lúc 14:00 chiều nay. Đừng quên kiểm tra lại số liệu.',
      time: '15 phút trước',
      unread: true,
      icon: 'assignment_late',
      iconBg: 'bg-blue-100',
      iconColor: 'text-primary'
    },
    {
      id: 2,
      type: 'goal',
      title: t('daily.goalUpdate'),
      message: 'Chúc mừng! Bạn đã hoàn thành 50% tiến độ mục tiêu "Chạy bộ mỗi sáng".',
      time: '2 giờ trước',
      unread: true,
      icon: 'emoji_events',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      id: 3,
      type: 'system',
      title: t('daily.systemUpdate'),
      message: 'Tính năng đồng bộ lịch Google Calendar đã sẵn sàng để sử dụng.',
      time: t('daily.yesterday'),
      unread: false,
      icon: 'settings',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-500'
    }
  ]);

  // Load tasks and main goal on mount and when pagination or filter changes
  useEffect(() => {
    loadData();
  }, [taskPage, taskPageSize, taskStatusFilter, taskPriorityFilter, taskTagFilter, taskSortOrder]);

  // When a task is in "progress" (user checked checkbox): animate bar for 3s then call toggle API and refresh
  useEffect(() => {
    if (taskIdInProgress == null) return;
    const startProgress = requestAnimationFrame(() => setToggleProgressPercent(100));
    const finishTimer = setTimeout(async () => {
      try {
        await tasksAPI.completeTask(taskIdInProgress);
        await loadData();
      } catch (err) {
        console.error('Failed to toggle task:', err);
      } finally {
        setTaskIdInProgress(null);
        setToggleProgressPercent(0);
      }
    }, 3000);
    return () => {
      cancelAnimationFrame(startProgress);
      clearTimeout(finishTimer);
    };
  }, [taskIdInProgress]);

  // Open Add Task modal with pre-fill when navigated from GoalDetailPage (from milestone)
  useEffect(() => {
    const state = location.state;
    if (!state?.openAddTaskFromMilestone || !state?.milestone) return;
    const { id, title, date, goalId } = state.milestone;
    const dueDateLocal = date ? `${String(date).slice(0, 10)}T12:00` : '';

    setAddTaskGoalContext({
      goalMilestoneId: id || null,
      goalId: goalId || null
    });
    setAddTaskReturnTo(state.returnTo || null);
    setAddTaskInitialTask({
      title: title || '',
      date: dueDateLocal
    });
    setAddTaskModalOpen(true);
    navigateTo(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigateTo]);

  // Open Add Task modal in edit mode when navigated from GoalDetailPage (edit task)
  useEffect(() => {
    const state = location.state;
    const task = state?.editTask;
    if (!task?.id) return;

    setAddTaskGoalContext({
      goalMilestoneId: task.goalMilestoneId ?? null,
      goalId: task.goalId ?? null
    });
    setAddTaskReturnTo(state.returnTo || null);
    setAddTaskInitialTask(task);
    setAddTaskModalOpen(true);
    navigateTo(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigateTo]);

  const loadData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Load tasks for today (paged, filtered)
      try {
        const params = { date: today, page: taskPage, pageSize: taskPageSize };
        if (taskStatusFilter === 'completed') params.completed = true;
        else if (taskStatusFilter === 'incomplete') params.completed = false;
        if (taskPriorityFilter !== '') params.priority = parseInt(taskPriorityFilter, 10);
        if (taskTagFilter.trim() !== '') params.tag = taskTagFilter.trim();
        if (taskSortOrder) params.sortOrder = taskSortOrder;
        const tasksData = await tasksAPI.getTasks(params);
        const list = tasksData?.items ?? (Array.isArray(tasksData) ? tasksData : []);
        const total = tasksData?.totalCount ?? list.length;
        setTasks(list.map(mapTaskFromApi));
        setTaskTotalCount(total);

        // Total and completed counts for progress (all tasks = completed + incomplete)
        const [allData, completedData] = await Promise.all([
          tasksAPI.getTasks({ date: today, page: 1, pageSize: 1 }),
          tasksAPI.getTasks({ date: today, page: 1, pageSize: 1, completed: true })
        ]);
        setTaskTotalAll(allData?.totalCount ?? 0);
        setTaskCompletedCount(completedData?.totalCount ?? 0);
      } catch (error) {
        // If it's an auth error, it will be handled by API service
        // Otherwise, just log and continue
        console.error('Failed to load tasks:', error);
        setTasks([]);
        setTaskTotalCount(0);
        setTaskTotalAll(0);
        setTaskCompletedCount(0);
      }
      
      // Load events for today
      try {
        const todayStr = today;
        const eventsData = await eventsAPI.getEvents({ startDate: todayStr, endDate: todayStr });
        const list = Array.isArray(eventsData) ? eventsData : (eventsData?.data ?? eventsData?.Data ?? []);
        setEvents(list.map(mapEventForDaily));
      } catch (err) {
        console.error('Failed to load events for today:', err);
        setEvents([]);
      }
      
      // Main goal is not loaded here - it should only be loaded on the Goals page
      // Keeping mainGoal state null for DailyPage
      setMainGoal(null);
      
      // Load notifications
      try {
        const notificationsData = await notificationsAPI.getNotifications({ limit: 20 });
        setNotifications(Array.isArray(notificationsData) ? notificationsData : (notificationsData?.notifications || []));
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const totalTasks = taskTotalAll; // all tasks (isCompleted=true + isCompleted=false)
  const completedTasks = taskCompletedCount;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleTaskCheckboxChange = (taskId) => {
    setTaskIdInProgress(taskId);
    setToggleProgressPercent(0);
  };

  const handleDeleteTask = async (id) => {
    try {
      await tasksAPI.deleteTask(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleOpenEditTask = (task) => {
    setAddTaskGoalContext({
      goalMilestoneId: task.goalMilestoneId ?? null,
      goalId: task.goalId ?? null
    });
    setAddTaskReturnTo(null);
    setAddTaskInitialTask(task);
    setAddTaskModalOpen(true);
  };

  const handleCloseModal = () => {
    const returnTo = addTaskReturnTo;
    setAddTaskModalOpen(false);
    setAddTaskReturnTo(null);
    setAddTaskInitialTask(null);
    setAddTaskGoalContext(null);
    if (returnTo) navigateTo(returnTo);
  };

  const getTagLabel = (tag) => (TAG_I18N_KEYS[tag] ? t(`daily.${TAG_I18N_KEYS[tag]}`) : tag);

  const getPriorityBadgeClass = (priority) => {
    const p = typeof priority === 'number' ? priority : (priority === 'Cao' ? 2 : priority === 'Trung bình' ? 1 : 0);
    switch (p) {
      case 2:
        return 'bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-300 ring-1 ring-inset ring-red-200 dark:ring-red-800';
      case 1:
        return 'bg-yellow-50 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-300 ring-1 ring-inset ring-yellow-200 dark:ring-yellow-800';
      case 0:
      default:
        return 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300';
    }
  };

  const getPriorityFlagClass = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-500 dark:text-red-400';
      case 'medium':
        return 'text-yellow-500 dark:text-yellow-400';
      default:
        return 'text-gray-400 dark:text-slate-500';
    }
  };

  const today = new Date();
  const dayKeys = ['daySunday', 'dayMonday', 'dayTuesday', 'dayWednesday', 'dayThursday', 'dayFriday', 'daySaturday'];
  const dayName = t(`daily.${dayKeys[today.getDay()]}`);
  const dateStr = `${today.getDate()}/${today.getMonth() + 1}`;

  return (
    <div className="bg-[#f6f7f8] dark:bg-[#101922] text-[#111418] dark:text-slate-100 font-display overflow-x-hidden min-h-screen flex flex-row">
      {/* Sidebar - Desktop */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={t('daily.title')}
          icon="calendar_today"
          actionButton={{
            text: t('daily.addTask'),
            icon: 'add',
            onClick: () => {
              setAddTaskInitialTask(null);
              setAddTaskGoalContext(null);
              setAddTaskReturnTo(null);
              setAddTaskModalOpen(true);
            }
          }}
          notifications={notifications}
          onNotificationsChange={setNotifications}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Main Content Area - min-h-0 lets flex shrink; overflow-y-auto only when content exceeds viewport */}
        <div className="flex-1 flex justify-center min-h-0 py-6 px-4 md:px-8 overflow-y-auto overflow-x-hidden">
          <div className="max-w-[1200px] flex-1 flex flex-col gap-6 w-full">
            {/* Date and Progress Card */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-col gap-2">
                <p className="text-[#111418] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
                  {dayName}, {dateStr}
                </p>
                <p className="text-gray-500 dark:text-slate-400 text-base font-normal leading-normal">
                  {t('daily.greeting')}
                </p>
              </div>
              <div className="flex min-w-[200px] flex-col gap-1 rounded-lg p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-gray-600 dark:text-slate-400 text-sm font-medium leading-normal">{t('daily.progressToday')}</p>
                  <span className="material-symbols-outlined text-[#0bda5b]">trending_up</span>
                </div>
                <div className="flex items-end gap-2">
                  <p className="text-[#111418] dark:text-white text-3xl font-bold leading-tight">{progressPercentage}%</p>
                  <p className="text-gray-500 dark:text-slate-400 text-xs pb-1">{t('daily.completed')}</p>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 mt-2">
                  <div 
                    className="bg-[#1380ec] h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${progressPercentage}%` }}
                    role="progressbar"
                    aria-valuenow={progressPercentage}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label={t('daily.progressLabel', { percent: progressPercentage })}
                  />
                </div>
              </div>
            </div>

            {/* Main Goal Card */}
            {mainGoal && (
              <div className="w-full">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 rounded-xl border border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-lg shadow-blue-50 dark:shadow-none relative overflow-hidden group">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                  <div className="flex flex-col gap-1 z-10 pl-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-primary dark:text-blue-400 text-sm">flag</span>
                      <p className="text-primary dark:text-blue-400 text-xs font-bold uppercase tracking-wider">{t('daily.mainGoal')}</p>
                    </div>
                    <p className={`text-[#111418] dark:text-white text-xl font-bold leading-tight group-hover:text-primary dark:group-hover:text-blue-400 transition-colors ${mainGoal.completed ? 'line-through text-gray-400 dark:text-slate-500' : ''}`}>
                      {mainGoal.text}
                    </p>
                  </div>
                  <label className="relative flex cursor-pointer items-center gap-3 z-10">
                    <span className="text-gray-500 dark:text-slate-400 text-sm hidden sm:block">{t('daily.markComplete')}</span>
                    <div className={`relative flex h-[31px] w-[51px] items-center rounded-full border-none p-0.5 transition-colors ${mainGoal.completed ? 'bg-[#1380ec]' : 'bg-gray-200 dark:bg-slate-600'}`}>
                      <div 
                        className={`h-[27px] w-[27px] rounded-full bg-white dark:bg-slate-200 shadow-md transition-transform ${mainGoal.completed ? 'translate-x-[20px]' : 'translate-x-0'}`}
                      />
                      <input 
                        className="peer sr-only" 
                        type="checkbox"
                        checked={mainGoal.completed || false}
                        onChange={async (e) => {
                          try {
                            // updateMainGoal API endpoint not available in .NET backend
                            // Update local state only for now
                            setMainGoal({ ...mainGoal, completed: e.target.checked });
                          } catch (error) {
                            console.error('Failed to update main goal:', error);
                          }
                        }}
                        aria-label={t('daily.markMainGoalComplete')}
                      />
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Schedule and Tasks Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
              {/* Schedule Section */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[#111418] dark:text-white">schedule</span>
                  <h2 className="text-[#111418] dark:text-white text-xl font-bold">{t('daily.schedule')}</h2>
                </div>
                {events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                    <span className="material-symbols-outlined text-gray-300 dark:text-slate-500 text-5xl mb-3">event_busy</span>
                    <p className="text-gray-500 dark:text-slate-400 text-sm font-medium text-center">{t('daily.noEvents')}</p>
                    <p className="text-gray-400 dark:text-slate-500 text-xs text-center mt-1">{t('daily.addEventFromCalendar')}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {events.map((event, index) => {
                      const currentTime = new Date();
                      const eventTime = event.time_from ? new Date(`${event.date}T${event.time_from}`) : null;
                      const isActive = eventTime && eventTime <= currentTime && (!event.time_to || new Date(`${event.date}T${event.time_to}`) >= currentTime);
                      const isPast = eventTime && eventTime < currentTime && (!isActive);
                      
                      return (
                        <div key={event.id} className="flex gap-4 group">
                    <div className="flex flex-col items-center pt-1 w-12 flex-shrink-0">
                            <span className={`text-sm font-medium ${isActive ? 'text-[#111418] dark:text-white font-bold' : isPast ? 'text-gray-400 dark:text-slate-500' : 'text-gray-500 dark:text-slate-400'}`}>
                              {event.time_from ? event.time_from.substring(0, 5) : t('daily.allDay')}
                            </span>
                            {index < events.length - 1 && (
                      <div className="w-px h-full bg-gray-200 dark:bg-slate-600 mt-2"></div>
                            )}
                    </div>
                    <div className="flex-1 pb-6">
                            <div className={`p-4 rounded-lg border ${
                              isActive 
                                ? 'bg-white dark:bg-slate-800 border-l-4 border-l-primary shadow-md shadow-gray-100 dark:shadow-none' 
                                : isPast
                                ? 'bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700'
                                : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer'
                            }`}>
                        <div className="flex justify-between items-start">
                                <p className={`font-medium ${isActive ? 'text-[#111418] dark:text-white font-bold text-lg' : isPast ? 'text-gray-400 dark:text-slate-500 line-through' : 'text-[#111418] dark:text-slate-200'}`}>
                                  {event.title}
                                </p>
                                {isActive && (
                          <span className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-300 text-xs px-2 py-1 rounded">{t('daily.ongoing')}</span>
                                )}
                              </div>
                              {event.description && (
                                <p className={`text-sm mt-1 ${isPast ? 'text-gray-400 dark:text-slate-500' : 'text-gray-500 dark:text-slate-400'}`}>
                                  {event.description}
                                </p>
                              )}
                              {(event.address || event.platform) && (
                                <div className="flex items-center gap-1 mt-2 text-gray-500 dark:text-slate-400 text-xs">
                                  {event.location_type === 'online' ? (
                                    <>
                                      <span className="material-symbols-outlined text-[14px]">videocam</span>
                                      <span>{event.platform}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                                      <span>{event.address}</span>
                                    </>
                                  )}
                        </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tasks Section */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <div className="flex flex-col gap-2 mb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#111418] dark:text-white">check_circle</span>
                      <h2 className="text-[#111418] dark:text-white text-xl font-bold">{t('daily.tasks')}</h2>
                      <button
                        type="button"
                        onClick={() => {
                          setAddTaskInitialTask(null);
                          setAddTaskGoalContext(null);
                          setAddTaskReturnTo(null);
                          setAddTaskModalOpen(true);
                        }}
                        className="lg:hidden inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/90 px-3 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors"
                        aria-label={t('daily.addTask')}
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        {t('daily.addTask')}
                      </button>
                    </div>
                    {taskTotalCount > 0 && (
                    <div className="flex items-center gap-2 max-lg:hidden">
                      <button
                        type="button"
                        onClick={() => taskPage > 1 && setTaskPage(p => p - 1)}
                        disabled={taskPage <= 1}
                        className={`p-1.5 rounded-md transition-colors ${taskPage <= 1 ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'text-gray-500 dark:text-slate-400 hover:text-[#111418] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                        aria-label={t('daily.prevPage')}
                      >
                        <span className="material-symbols-outlined text-[20px] pt-[5px]">chevron_left</span>
                      </button>
                      <span className="text-sm text-gray-600 dark:text-slate-400 min-w-[80px] text-center">
                        {t('daily.pageOf', { current: taskPage, total: Math.max(1, Math.ceil(taskTotalCount / taskPageSize)) })}
                      </span>
                      <button
                        type="button"
                        onClick={() => taskPage < Math.max(1, Math.ceil(taskTotalCount / taskPageSize)) && setTaskPage(p => p + 1)}
                        disabled={taskPage >= Math.max(1, Math.ceil(taskTotalCount / taskPageSize))}
                        className={`p-1.5 rounded-md transition-colors ${taskPage >= Math.max(1, Math.ceil(taskTotalCount / taskPageSize)) ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'text-gray-500 dark:text-slate-400 hover:text-[#111418] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                        aria-label={t('daily.nextPage')}
                      >
                        <span className="material-symbols-outlined text-[20px] pt-[5px]">chevron_right</span>
                      </button>
                    </div>
                  )}
                    <button
                      type="button"
                      onClick={() => {
                        if (filterExpanded) {
                          setFilterExpanded(false);
                          setTaskStatusFilter('incomplete');
                          setTaskPage(1);
                        } else {
                          setFilterExpanded(true);
                        }
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${filterExpanded ? 'bg-primary text-white shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 hover:bg-primary/5 dark:hover:bg-blue-900/20 border border-gray-200 dark:border-slate-700'}`}
                      aria-label={filterExpanded ? t('daily.closeFilter') : t('daily.openFilter')}
                      aria-expanded={filterExpanded}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {filterExpanded ? 'expand_less' : 'filter_list'}
                      </span>
                      <span className="hidden sm:inline">{filterExpanded ? t('daily.filterCollapse') : t('daily.filter')}</span>
                    </button>
                  </div>
                  {!filterExpanded && (
                    <div className="flex items-center pt-1" role="group" aria-label={t('daily.status')}>
                      <div className="inline-flex p-0.5 rounded-full bg-gray-200 dark:bg-slate-700">
                        <button
                          type="button"
                          onClick={() => { setTaskStatusFilter('incomplete'); setTaskPage(1); }}
                          aria-pressed={taskStatusFilter === 'incomplete'}
                          className={`relative rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${taskStatusFilter === 'incomplete' ? 'text-white' : 'text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white'}`}
                        >
                          {taskStatusFilter === 'incomplete' && (
                            <span className="absolute inset-0 rounded-full bg-primary shadow-sm z-0" aria-hidden="true" />
                          )}
                          <span className="relative z-10">{t('daily.toDo')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setTaskStatusFilter('completed'); setTaskPage(1); }}
                          aria-pressed={taskStatusFilter === 'completed'}
                          className={`relative rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${taskStatusFilter === 'completed' ? 'text-white' : 'text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white'}`}
                        >
                          {taskStatusFilter === 'completed' && (
                            <span className="absolute inset-0 rounded-full bg-primary shadow-sm z-0" aria-hidden="true" />
                          )}
                          <span className="relative z-10">{t('daily.completed')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                  {filterExpanded && (
                  <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-800/80 p-3 overflow-visible">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-200">
                        <span className="material-symbols-outlined text-[18px] text-primary dark:text-blue-400">tune</span>
                        <span>{t('daily.filterSortOptions')}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTaskStatusFilter('');
                          setTaskPriorityFilter('');
                          setTaskTagFilter('');
                          setTaskSortOrder('desc');
                          setTaskPage(1);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200/80 dark:hover:bg-slate-700 transition-colors shrink-0"
                      >
                        <span className="material-symbols-outlined text-[18px]">refresh</span>
                        <span>{t('daily.reset')}</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap items-end gap-3 mt-3">
                      <div className="flex flex-col gap-0.5">
                        <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t('daily.status')}</label>
                        <select
                          value={taskStatusFilter}
                          onChange={(e) => { setTaskStatusFilter(e.target.value); setTaskPage(1); }}
                          className="min-w-[120px] rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-sm text-gray-700 dark:text-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        >
                          <option value="">{t('daily.all')}</option>
                          <option value="completed">{t('daily.completed')}</option>
                          <option value="incomplete">{t('daily.incomplete')}</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t('daily.priority')}</label>
                        <select
                          value={taskPriorityFilter}
                          onChange={(e) => { setTaskPriorityFilter(e.target.value); setTaskPage(1); }}
                          className="min-w-[120px] rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-sm text-gray-700 dark:text-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        >
                          <option value="">{t('daily.all')}</option>
                          <option value="0">{t('daily.priorityLow')}</option>
                          <option value="1">{t('daily.priorityMedium')}</option>
                          <option value="2">{t('daily.priorityHigh')}</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t('daily.label')}</label>
                        <select
                          value={taskTagFilter}
                          onChange={(e) => { setTaskTagFilter(e.target.value); setTaskPage(1); }}
                          className="min-w-[120px] rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-sm text-gray-700 dark:text-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        >
                          <option value="">{t('daily.all')}</option>
                          {DEFAULT_TAGS.map((tag) => (
                            <option key={tag} value={tag}>{getTagLabel(tag)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="h-px w-px bg-gray-300 dark:bg-slate-600 self-stretch hidden sm:block" aria-hidden="true" />
                      <div className="flex flex-col gap-0.5">
                        <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t('daily.sort')}</label>
                        <select
                          value={taskSortOrder}
                          onChange={(e) => { setTaskSortOrder(e.target.value); setTaskPage(1); }}
                          className="min-w-[120px] rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-sm text-gray-700 dark:text-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        >
                          <option value="desc">{t('daily.sortNewestFirst')}</option>
                          <option value="asc">{t('daily.sortOldestFirst')}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  )}
                </div>

                {/* Tasks List */}
                {tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                    <span className="material-symbols-outlined text-gray-300 dark:text-slate-500 text-5xl mb-3">task_alt</span>
                    <p className="text-gray-500 dark:text-slate-400 text-sm font-medium text-center">{t('daily.noTasks')}</p>
                    <p className="text-gray-400 dark:text-slate-500 text-xs text-center mt-1">{t('daily.addTaskToStart')}</p>
                  </div>
                ) : (
                <div className="flex flex-col gap-3">
                  {tasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="group flex flex-col rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden transition-all hover:bg-gray-50 dark:hover:bg-slate-700/50"
                    >
                      <div className="flex items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="relative flex items-center pt-1">
                            <input 
                              checked={task.completed ?? task.isCompleted} 
                              className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 dark:border-slate-600 bg-transparent dark:bg-slate-700/50 checked:border-primary checked:bg-primary transition-all hover:border-primary/50 disabled:opacity-60 disabled:cursor-wait" 
                              type="checkbox"
                              onChange={() => handleTaskCheckboxChange(task.id)}
                              disabled={taskIdInProgress === task.id}
                              aria-label={t('daily.markTaskComplete', { title: task.text || task.title })}
                            />
                          <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity pt-1">
                            <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 flex-1 min-w-0">                          
                          <p className={`text-sm sm:text-base font-medium leading-tight ${(task.completed ?? task.isCompleted) ? 'text-gray-400 dark:text-slate-500 line-through' : 'text-[#111418] dark:text-white'}`}>
                          {task.priority && (
                              <span className={`inline-flex items-center rounded-md px-1.5 sm:px-2 py-0.5 sm:py-1 text-[11px] sm:text-xs font-medium ${getPriorityBadgeClass(task.priority)}`}>
                                {getPriorityLabel(task.priority)}
                              </span>
                            )} 
                            {task.text || task.title}
                          </p>
                          {formatDeadline(task.date) && (
                            <p className={`flex items-center gap-1.5 text-[11px] sm:text-xs ${(() => {
                              if (!(task.completed ?? task.isCompleted) || !task.completedDateObj || !task.dateObj) return 'text-gray-500';
                              const cDay = new Date(task.completedDateObj); cDay.setHours(0, 0, 0, 0);
                              const dDay = new Date(task.dateObj); dDay.setHours(0, 0, 0, 0);
                              return cDay > dDay ? 'text-red-600' : 'text-green-600';
                            })()}`}>
                              <span className="material-symbols-outlined text-[12px] sm:text-[14px]">event</span>
                              <span>{t('daily.dueLabel')} {formatDeadline(task.date)}</span>
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">                            
                              {task.tags && task.tags.map((tag, idx) => (
                              <span key={idx} className="inline-flex items-center rounded-md bg-gray-100 dark:bg-slate-700 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[11px] sm:text-xs font-medium text-gray-600 dark:text-slate-300">
                                {getTagLabel(tag)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="invisible group-hover:visible text-gray-400 dark:text-slate-500 hover:text-primary dark:hover:text-blue-400 transition-colors p-1 rounded"
                          onClick={() => handleOpenEditTask(task)}
                          aria-label={t('daily.editTaskLabel', { title: task.text || task.title })}
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button 
                          type="button"
                          className="invisible group-hover:visible text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 rounded"
                          onClick={() => handleDeleteTask(task.id)}
                          aria-label={t('daily.deleteTaskLabel', { title: task.text || task.title })}
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                      </div>
                      {taskIdInProgress === task.id && (
                        <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-700 rounded-b-lg overflow-hidden" role="progressbar" aria-valuenow={toggleProgressPercent} aria-valuemin={0} aria-valuemax={100} aria-label={t('daily.updating')}>
                          <div
                            className="h-full bg-primary rounded-b-lg transition-[width] duration-[3000ms] ease-linear"
                            style={{ width: `${toggleProgressPercent}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                )}
                {/* Pagination below task list on mobile */}
                {taskTotalCount > 0 && (
                  <div className="flex items-center justify-center gap-2 pt-3 lg:hidden">
                    <button
                      type="button"
                      onClick={() => taskPage > 1 && setTaskPage(p => p - 1)}
                      disabled={taskPage <= 1}
                      className={`p-1.5 rounded-md transition-colors ${taskPage <= 1 ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'text-gray-500 dark:text-slate-400 hover:text-[#111418] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                      aria-label={t('daily.prevPage')}
                    >
                      <span className="material-symbols-outlined text-[20px] pt-[5px]">chevron_left</span>
                    </button>
                    <span className="text-sm text-gray-600 dark:text-slate-400 min-w-[80px] text-center">
                      {t('daily.pageOf', { current: taskPage, total: Math.max(1, Math.ceil(taskTotalCount / taskPageSize)) })}
                    </span>
                    <button
                      type="button"
                      onClick={() => taskPage < Math.max(1, Math.ceil(taskTotalCount / taskPageSize)) && setTaskPage(p => p + 1)}
                      disabled={taskPage >= Math.max(1, Math.ceil(taskTotalCount / taskPageSize))}
                      className={`p-1.5 rounded-md transition-colors ${taskPage >= Math.max(1, Math.ceil(taskTotalCount / taskPageSize)) ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'text-gray-500 dark:text-slate-400 hover:text-[#111418] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                      aria-label={t('daily.nextPage')}
                    >
                      <span className="material-symbols-outlined text-[20px] pt-[5px]">chevron_right</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddTaskModal
        open={addTaskModalOpen}
        onClose={handleCloseModal}
        onSaved={loadData}
        initialTask={addTaskInitialTask}
        goalContext={addTaskGoalContext}
      />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <nav className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 z-[51] transform transition-transform duration-300 lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center gap-3 border-b border-gray-100 dark:border-slate-700">
          <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-xl">calendar_today</span>
          </div>
          <h1 className="text-[#111418] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">PlanDaily</h1>
          <button 
            className="ml-auto p-1 rounded-md text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex flex-col gap-2 p-4 flex-1">
          {isAdmin && (
            <>
              <Link
                to="/admin/dashboard"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-[#111418] dark:hover:text-white font-medium transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined">dashboard</span>
                <span>{t('admin.dashboard')}</span>
              </Link>
              <Link
                to="/admin/users"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-[#111418] dark:hover:text-white font-medium transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined">people</span>
                <span>{t('admin.users')}</span>
              </Link>
              <Link
                to="/admin/logs"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-[#111418] dark:hover:text-white font-medium transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined">description</span>
                <span>{t('admin.logs')}</span>
              </Link>
              <div className="my-2 border-t border-gray-100 dark:border-slate-700" />
            </>
          )}
          <Link 
            to="/daily" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-50 dark:bg-slate-800 text-primary dark:text-blue-300 font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined fill-1">today</span>
            <span>{t('sidebar.dailyPlan')}</span>
          </Link>
          <Link 
            to="/goals" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-[#111418] dark:hover:text-white font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">target</span>
            <span>{t('sidebar.goals')}</span>
          </Link>
          <Link 
            to="/calendar" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-[#111418] dark:hover:text-white font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">calendar_month</span>
            <span>{t('sidebar.calendar')}</span>
          </Link>
          <Link 
            to="/settings" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-[#111418] dark:hover:text-white font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">settings</span>
            <span>{t('sidebar.settings')}</span>
          </Link>
          <div className="mt-auto border-t border-gray-100 dark:border-slate-700 pt-4">
            <LogoutButton labelKey="auth.logout" />
          </div>
        </div>
      </nav>
    </div>
  );
};

export default DailyPage;

