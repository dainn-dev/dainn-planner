import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { DEFAULT_TAGS } from '../constants/tasks';
import { tasksAPI, notificationsAPI } from '../services/api';

// Map backend DailyTaskDto to frontend task shape (id, text, completed, priority display)
const RECURRENCE_TO_LABEL = { 0: 'Không', 1: 'Mỗi ngày', 2: 'Mỗi tuần', 3: 'Mỗi tháng' };
const formatDeadline = (dateVal) => {
  if (!dateVal) return null;
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
  if (Number.isNaN(d.getTime())) return null;
  const hour12 = d.getHours() % 12 || 12;
  const ampm = d.getHours() < 12 ? 'AM' : 'PM';
  const timeStr = `${hour12}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${timeStr} ${day}/${month}/${year}`;
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
const mapTaskFromApi = (t) => ({
  id: t.id,
  text: t.title ?? t.text,
  title: t.title,
  description: t.description,
  date: t.date,
  completed: t.isCompleted ?? t.completed,
  isCompleted: t.isCompleted ?? t.completed,
  priority: typeof t.priority === 'number' ? (t.priority === 2 ? 'Cao' : t.priority === 1 ? 'Trung bình' : 'Thấp') : t.priority,
  recurrence: t.recurrence ?? 0,
  recurrenceLabel: RECURRENCE_TO_LABEL[t.recurrence] ?? 'Không',
  reminderTime: t.reminderTime ?? '',
  tags: t.tags ?? [],
});

const DailyPage = () => {
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [mainGoal, setMainGoal] = useState(null);
  const [newTask, setNewTask] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskForm, setTaskForm] = useState({
    name: '',
    description: '',
    dueDate: '',
    reminderTime: '',
    repeat: 'none',
    priority: 'low', // 'low' | 'medium' | 'high' -> API: 0, 1, 2
    tags: []
  });
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const [taskPage, setTaskPage] = useState(1);
  const [taskPageSize] = useState(10);
  const [taskTotalCount, setTaskTotalCount] = useState(0);
  const [taskTotalAll, setTaskTotalAll] = useState(0);   // all tasks (completed + incomplete) for progress
  const [taskCompletedCount, setTaskCompletedCount] = useState(0);
  const [taskFilter, setTaskFilter] = useState('daily'); // 'daily' = incomplete, 'completed' = completed
  const [taskIdInProgress, setTaskIdInProgress] = useState(null); // task id showing 3s progress before toggle
  const [toggleProgressPercent, setToggleProgressPercent] = useState(0); // 0..100 for inline progress bar
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'task',
      title: 'Nhắc nhở nhiệm vụ',
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
      title: 'Cập nhật mục tiêu',
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
      title: 'Cập nhật hệ thống',
      message: 'Tính năng đồng bộ lịch Google Calendar đã sẵn sàng để sử dụng.',
      time: 'Hôm qua',
      unread: false,
      icon: 'settings',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-500'
    }
  ]);

  // Load tasks and main goal on mount and when pagination or filter changes
  useEffect(() => {
    loadData();
  }, [taskPage, taskPageSize, taskFilter]);

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

  const loadData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Load tasks for today (paged, filtered)
      try {
        const completedParam = taskFilter === 'completed' ? true : false;
        const tasksData = await tasksAPI.getTasks({ date: today, page: taskPage, pageSize: taskPageSize, completed: completedParam });
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
      
      // Events are not loaded here - they should only be loaded on the Calendar page
      // Keeping events state empty for DailyPage
      setEvents([]);
      
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

  const handleTaskToggle = async (id) => {
    try {
      await tasksAPI.completeTask(id);
      const wasCompleted = tasks.find(t => t.id === id)?.completed ?? tasks.find(t => t.id === id)?.isCompleted;
      setTasks(tasks.map(task =>
        task.id === id ? { ...task, completed: !task.completed, isCompleted: !(task.completed ?? task.isCompleted) } : task
      ));
      setTaskCompletedCount(prev => wasCompleted ? Math.max(0, prev - 1) : prev + 1);
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

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

  const handleTagToggle = (tag) => {
    setTaskForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.name.trim()) return;
    const datePayload = taskForm.dueDate
      ? new Date(taskForm.dueDate).toISOString()
      : new Date().toISOString();
    const priorityMap = { low: 0, medium: 1, high: 2 };
    const priorityInt = priorityMap[taskForm.priority] ?? 0;
    const recurrenceMap = { none: 0, daily: 1, weekly: 2, monthly: 3 };
    const recurrence = recurrenceMap[taskForm.repeat] ?? 0;
    const payload = {
      title: taskForm.name.trim(),
      description: taskForm.description || undefined,
      date: datePayload,
      priority: priorityInt,
      recurrence,
      reminderTime: taskForm.reminderTime || undefined,
      tags: taskForm.tags,
    };
    try {
      if (editingTaskId) {
        await tasksAPI.updateTask(editingTaskId, payload);
        setEditingTaskId(null);
        await loadData();
      } else {
        await tasksAPI.createTask(payload);
        await loadData();
      }
      setTaskForm({
        name: '',
        description: '',
        dueDate: '',
        reminderTime: '',
        repeat: 'none',
        priority: 'low',
        tags: []
      });
      setAddTaskModalOpen(false);
    } catch (error) {
      console.error(editingTaskId ? 'Failed to update task:' : 'Failed to create task:', error);
    }
  };

  const handleOpenEditTask = (task) => {
    const recurrenceToOption = { 0: 'none', 1: 'daily', 2: 'weekly', 3: 'monthly' };
    const priorityLabelToOption = { 'Cao': 'high', 'Trung bình': 'medium', 'Thấp': 'low' };
    setEditingTaskId(task.id);
    setTaskForm({
      name: task.text || task.title || '',
      description: task.description ?? '',
      dueDate: dateToDatetimeLocal(task.date),
      reminderTime: task.reminderTime ?? '',
      repeat: recurrenceToOption[task.recurrence] ?? 'none',
      priority: priorityLabelToOption[task.priority] ?? 'low',
      tags: task.tags ? [...task.tags] : [],
    });
    setAddTaskModalOpen(true);
  };

  const handleCloseModal = () => {
    setAddTaskModalOpen(false);
    setEditingTaskId(null);
    setTaskForm({
      name: '',
      description: '',
      dueDate: '',
      reminderTime: '',
      repeat: 'none',
      priority: 'low',
      tags: []
    });
    setShowNewTagInput(false);
    setNewTagValue('');
  };

  const handleAddNewTag = () => {
    if (newTagValue.trim()) {
      handleTagToggle(newTagValue.trim());
      setNewTagValue('');
      setShowNewTagInput(false);
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'Cao':
        return 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-200';
      case 'Trung bình':
        return 'bg-yellow-50 text-yellow-600 ring-1 ring-inset ring-yellow-200';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getPriorityFlagClass = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      default:
        return 'text-gray-400';
    }
  };

  const today = new Date();
  const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = dayNames[today.getDay()];
  const dateStr = `${today.getDate()}/${today.getMonth() + 1}`;

  return (
    <div className="bg-[#f6f7f8] text-[#111418] font-display overflow-x-hidden min-h-screen flex flex-row">
      {/* Sidebar - Desktop */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          title="Kế hoạch hôm nay"
          icon="calendar_today"
          actionButton={{
            text: 'Thêm nhiệm vụ',
            icon: 'add',
            onClick: () => setAddTaskModalOpen(true)
          }}
          notifications={notifications}
          onNotificationsChange={setNotifications}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex justify-center py-6 px-4 md:px-8 overflow-y-auto">
          <div className="max-w-[1200px] flex-1 flex flex-col gap-6 w-full">
            {/* Date and Progress Card */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-col gap-2">
                <p className="text-[#111418] text-4xl font-black leading-tight tracking-[-0.033em]">
                  {dayName}, {dateStr}
                </p>
                <p className="text-gray-500 text-base font-normal leading-normal">
                  Xin chào, hãy bắt đầu ngày mới hiệu quả.
                </p>
              </div>
              <div className="flex min-w-[200px] flex-col gap-1 rounded-lg p-4 bg-white border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-gray-600 text-sm font-medium leading-normal">Tiến độ hôm nay</p>
                  <span className="material-symbols-outlined text-[#0bda5b]">trending_up</span>
                </div>
                <div className="flex items-end gap-2">
                  <p className="text-[#111418] text-3xl font-bold leading-tight">{progressPercentage}%</p>
                  <p className="text-gray-500 text-xs pb-1">hoàn thành</p>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                  <div 
                    className="bg-[#1380ec] h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${progressPercentage}%` }}
                    role="progressbar"
                    aria-valuenow={progressPercentage}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label={`Tiến độ: ${progressPercentage}%`}
                  />
                </div>
              </div>
            </div>

            {/* Main Goal Card */}
            {mainGoal && (
              <div className="w-full">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 rounded-xl border border-blue-100 bg-white p-5 shadow-lg shadow-blue-50 relative overflow-hidden group">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                  <div className="flex flex-col gap-1 z-10 pl-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-primary text-sm">flag</span>
                      <p className="text-primary text-xs font-bold uppercase tracking-wider">Mục tiêu chính</p>
                    </div>
                    <p className={`text-[#111418] text-xl font-bold leading-tight group-hover:text-primary transition-colors ${mainGoal.completed ? 'line-through text-gray-400' : ''}`}>
                      {mainGoal.text}
                    </p>
                  </div>
                  <label className="relative flex cursor-pointer items-center gap-3 z-10">
                    <span className="text-gray-500 text-sm hidden sm:block">Đánh dấu hoàn thành</span>
                    <div className={`relative flex h-[31px] w-[51px] items-center rounded-full border-none p-0.5 transition-colors ${mainGoal.completed ? 'bg-[#1380ec]' : 'bg-gray-200'}`}>
                      <div 
                        className={`h-[27px] w-[27px] rounded-full bg-white shadow-md transition-transform ${mainGoal.completed ? 'translate-x-[20px]' : 'translate-x-0'}`}
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
                        aria-label="Đánh dấu mục tiêu chính hoàn thành"
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
                  <span className="material-symbols-outlined text-[#111418]">schedule</span>
                  <h2 className="text-[#111418] text-xl font-bold">Lịch trình</h2>
                </div>
                {events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 bg-white rounded-lg border border-gray-200">
                    <span className="material-symbols-outlined text-gray-300 text-5xl mb-3">event_busy</span>
                    <p className="text-gray-500 text-sm font-medium text-center">Chưa có sự kiện nào trong ngày</p>
                    <p className="text-gray-400 text-xs text-center mt-1">Thêm sự kiện mới từ trang Lịch biểu</p>
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
                            <span className={`text-sm font-medium ${isActive ? 'text-[#111418] font-bold' : isPast ? 'text-gray-400' : 'text-gray-500'}`}>
                              {event.time_from ? event.time_from.substring(0, 5) : 'Cả ngày'}
                            </span>
                            {index < events.length - 1 && (
                      <div className="w-px h-full bg-gray-200 mt-2"></div>
                            )}
                    </div>
                    <div className="flex-1 pb-6">
                            <div className={`p-4 rounded-lg border ${
                              isActive 
                                ? 'bg-white border-l-4 border-l-primary shadow-md shadow-gray-100' 
                                : isPast
                                ? 'bg-gray-50 border border-gray-200'
                                : 'bg-white border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer'
                            }`}>
                        <div className="flex justify-between items-start">
                                <p className={`font-medium ${isActive ? 'text-[#111418] font-bold text-lg' : isPast ? 'text-gray-400 line-through' : 'text-[#111418]'}`}>
                                  {event.title}
                                </p>
                                {isActive && (
                          <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded">Đang diễn ra</span>
                                )}
                              </div>
                              {event.description && (
                                <p className={`text-sm mt-1 ${isPast ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {event.description}
                                </p>
                              )}
                              {(event.address || event.platform) && (
                                <div className="flex items-center gap-1 mt-2 text-gray-500 text-xs">
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
                      <span className="material-symbols-outlined text-[#111418]">check_circle</span>
                      <h2 className="text-[#111418] text-xl font-bold">Nhiệm vụ</h2>
                      <button
                        type="button"
                        onClick={() => { setTaskForm(prev => ({ ...prev, name: '' })); setEditingTaskId(null); setAddTaskModalOpen(true); }}
                        className="lg:hidden inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/90 px-3 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors"
                        aria-label="Thêm nhiệm vụ"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Thêm nhiệm vụ
                      </button>
                    </div>
                    {taskTotalCount > 0 && (
                    <div className="flex items-center gap-2 max-lg:hidden">
                      <button
                        type="button"
                        onClick={() => taskPage > 1 && setTaskPage(p => p - 1)}
                        disabled={taskPage <= 1}
                        className={`p-1.5 rounded-md transition-colors ${taskPage <= 1 ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'text-gray-500 hover:text-[#111418] hover:bg-gray-100'}`}
                        aria-label="Trang trước"
                      >
                        <span className="material-symbols-outlined text-[20px] pt-[5px]">chevron_left</span>
                      </button>
                      <span className="text-sm text-gray-600 min-w-[80px] text-center">
                        Trang {taskPage} / {Math.max(1, Math.ceil(taskTotalCount / taskPageSize))}
                      </span>
                      <button
                        type="button"
                        onClick={() => taskPage < Math.max(1, Math.ceil(taskTotalCount / taskPageSize)) && setTaskPage(p => p + 1)}
                        disabled={taskPage >= Math.max(1, Math.ceil(taskTotalCount / taskPageSize))}
                        className={`p-1.5 rounded-md transition-colors ${taskPage >= Math.max(1, Math.ceil(taskTotalCount / taskPageSize)) ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'text-gray-500 hover:text-[#111418] hover:bg-gray-100'}`}
                        aria-label="Trang sau"
                      >
                        <span className="material-symbols-outlined text-[20px] pt-[5px]">chevron_right</span>
                      </button>
                    </div>
                  )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setTaskFilter('daily'); setTaskPage(1); }}
                      className={`text-sm font-medium px-3 py-1.5 rounded transition-colors ${taskFilter === 'daily' ? 'text-white bg-primary shadow-sm shadow-primary/30' : 'text-gray-600 hover:text-[#111418] bg-gray-100 hover:bg-gray-200'}`}
                    >
                      Hàng ngày
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTaskFilter('completed'); setTaskPage(1); }}
                      className={`text-sm font-medium px-3 py-1.5 rounded transition-colors ${taskFilter === 'completed' ? 'text-white bg-primary shadow-sm shadow-primary/30' : 'text-gray-600 hover:text-[#111418] bg-gray-100 hover:bg-gray-200'}`}
                    >
                      Hoàn thành
                    </button>
                  </div>
                </div>

                {/* Tasks List */}
                {tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 bg-white rounded-lg border border-gray-200">
                    <span className="material-symbols-outlined text-gray-300 text-5xl mb-3">task_alt</span>
                    <p className="text-gray-500 text-sm font-medium text-center">Chưa có nhiệm vụ nào</p>
                    <p className="text-gray-400 text-xs text-center mt-1">Thêm nhiệm vụ mới để bắt đầu ngày làm việc</p>
                  </div>
                ) : (
                <div className="flex flex-col gap-3">
                  {tasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="group flex flex-col rounded-lg border border-gray-200 bg-white overflow-hidden transition-all hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between gap-4 p-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="relative flex items-center pt-1">
                            <input 
                              checked={task.completed ?? task.isCompleted} 
                              className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 bg-transparent checked:border-primary checked:bg-primary transition-all hover:border-primary/50 disabled:opacity-60 disabled:cursor-wait" 
                              type="checkbox"
                              onChange={() => handleTaskCheckboxChange(task.id)}
                              disabled={taskIdInProgress === task.id}
                              aria-label={`Đánh dấu hoàn thành: ${task.text || task.title}`}
                            />
                          <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity pt-1">
                            <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 flex-1">                          
                          <p className={`text-base font-medium leading-tight ${(task.completed ?? task.isCompleted) ? 'text-gray-400 line-through' : 'text-[#111418]'}`}>
                          {task.priority && (
                              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getPriorityBadgeClass(task.priority)}`}>
                                {task.priority}
                              </span>
                            )} 
                            {task.text || task.title}
                          </p>
                          {formatDeadline(task.date) && (
                            <p className="flex items-center gap-1.5 text-xs text-gray-500">
                              <span className="material-symbols-outlined text-[14px]">event</span>
                              <span>Đến hạn: {formatDeadline(task.date)}</span>
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">                            
                              {task.tags && task.tags.map((tag, idx) => (
                              <span key={idx} className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="invisible group-hover:visible text-gray-400 hover:text-primary transition-colors p-1 rounded"
                          onClick={() => handleOpenEditTask(task)}
                          aria-label={`Chỉnh sửa nhiệm vụ: ${task.text || task.title}`}
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button 
                          type="button"
                          className="invisible group-hover:visible text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                          onClick={() => handleDeleteTask(task.id)}
                          aria-label={`Xóa nhiệm vụ: ${task.text || task.title}`}
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                      </div>
                      {taskIdInProgress === task.id && (
                        <div className="h-1.5 w-full bg-gray-100 rounded-b-lg overflow-hidden" role="progressbar" aria-valuenow={toggleProgressPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Đang cập nhật">
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
                      className={`p-1.5 rounded-md transition-colors ${taskPage <= 1 ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'text-gray-500 hover:text-[#111418] hover:bg-gray-100'}`}
                      aria-label="Trang trước"
                    >
                      <span className="material-symbols-outlined text-[20px] pt-[5px]">chevron_left</span>
                    </button>
                    <span className="text-sm text-gray-600 min-w-[80px] text-center">
                      Trang {taskPage} / {Math.max(1, Math.ceil(taskTotalCount / taskPageSize))}
                    </span>
                    <button
                      type="button"
                      onClick={() => taskPage < Math.max(1, Math.ceil(taskTotalCount / taskPageSize)) && setTaskPage(p => p + 1)}
                      disabled={taskPage >= Math.max(1, Math.ceil(taskTotalCount / taskPageSize))}
                      className={`p-1.5 rounded-md transition-colors ${taskPage >= Math.max(1, Math.ceil(taskTotalCount / taskPageSize)) ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'text-gray-500 hover:text-[#111418] hover:bg-gray-100'}`}
                      aria-label="Trang sau"
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

      {/* Add Task Modal */}
      {addTaskModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/10 backdrop-blur-sm transition-all duration-300"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-[580px] flex flex-col bg-surface-light rounded-2xl shadow-float border border-white/50 overflow-hidden max-h-[90vh] animate-fadeInScale ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-8 pt-8 pb-4 bg-surface-light shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                  {editingTaskId ? 'Chỉnh sửa nhiệm vụ' : 'Thêm Nhiệm Vụ'}
                </h2>
                <p className="text-sm text-gray-500 mt-1 font-normal">
                  {editingTaskId ? 'Cập nhật thông tin nhiệm vụ.' : 'Tạo một mục tiêu mới cho kế hoạch của bạn.'}
                </p>
              </div>
              <button 
                aria-label="Đóng"
                className="group p-2 -mr-2 -mt-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
                onClick={handleCloseModal}
              >
                <span className="material-symbols-outlined text-gray-400 group-hover:text-gray-600 text-[24px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="px-8 py-2 overflow-y-auto flex flex-col gap-6 custom-scrollbar bg-surface-light">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tên nhiệm vụ
                  </label>
                  <div className="relative group">
                    <input
                      autoFocus
                      className="form-input w-full rounded-lg border-gray-200 bg-white text-gray-900 px-4 py-3 text-base focus:border-gray-400 focus:bg-white focus:ring-0 placeholder:text-gray-400 transition-all font-medium shadow-sm hover:border-gray-300"
                      placeholder="Nhập tên nhiệm vụ..."
                      type="text"
                      value={taskForm.name}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Mô tả
                  </label>
                  <div className="relative group">
                    <textarea
                      className="form-input w-full rounded-lg border-gray-200 bg-white text-gray-900 px-4 py-3 text-sm focus:border-gray-400 focus:bg-white focus:ring-0 placeholder:text-gray-400 transition-all resize-none min-h-[90px] leading-relaxed shadow-sm hover:border-gray-300"
                      placeholder="Thêm chi tiết về nhiệm vụ này..."
                      value={taskForm.description}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-col gap-2 flex-[2] min-w-0">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ngày đến hạn</label>
                    <div className="relative group">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[18px] pointer-events-none">event</span>
                      <input
                        className="form-input w-full rounded-lg border-gray-200 bg-white text-gray-900 pl-10 pr-4 py-2.5 text-sm focus:border-gray-400 focus:bg-white focus:ring-0 transition-all cursor-pointer hover:bg-gray-50 shadow-sm"
                        type="datetime-local"
                        value={taskForm.dueDate}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                        aria-label="Ngày và giờ đến hạn"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-[1] min-w-0">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Giờ nhắc</label>
                    <div className="relative group">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[18px] pointer-events-none">schedule</span>
                      <input
                        className="form-input w-full rounded-lg border-gray-200 bg-white text-gray-900 pl-10 pr-4 py-2.5 text-sm focus:border-gray-400 focus:bg-white focus:ring-0 transition-all cursor-pointer hover:bg-gray-50 shadow-sm"
                        type="time"
                        value={taskForm.reminderTime}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, reminderTime: e.target.value }))}
                        aria-label="Giờ nhắc"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Lặp lại
                    </label>
                    <div className="relative group">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[18px] pointer-events-none">repeat</span>
                      <select
                        className="form-input w-full rounded-lg border-gray-200 bg-white text-gray-900 pl-10 pr-4 py-2.5 text-sm focus:border-gray-400 focus:bg-white focus:ring-0 transition-all cursor-pointer hover:bg-gray-50 shadow-sm appearance-none"
                        value={taskForm.repeat}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, repeat: e.target.value }))}
                        aria-label="Lặp lại"
                      >
                        <option value="none">Không</option>
                        <option value="daily">Mỗi ngày</option>
                        <option value="weekly">Mỗi tuần</option>
                        <option value="monthly">Mỗi tháng</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Độ ưu tiên
                    </label>
                    <div className="relative group">
                      <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] pointer-events-none ${getPriorityFlagClass(taskForm.priority)}`}>flag</span>
                      <select
                        className="form-input w-full rounded-lg border-gray-200 bg-white text-gray-900 pl-10 pr-4 py-2.5 text-sm focus:border-gray-400 focus:bg-white focus:ring-0 transition-all cursor-pointer hover:bg-gray-50 shadow-sm appearance-none"
                        value={taskForm.priority}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                        aria-label="Độ ưu tiên"
                      >
                        <option value="low">Thấp</option>
                        <option value="medium">Trung bình</option>
                        <option value="high">Cao</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 pt-2 pb-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      Thẻ
                    </label>
                  </div>
                  {/* Selected Tags Display */}
                  {taskForm.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      {taskForm.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-full shadow-sm"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleTagToggle(tag)}
                            className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                            aria-label={`Xóa thẻ ${tag}`}
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={`group flex items-center gap-1.5 px-3.5 py-1.5 border rounded-full transition-all duration-200 shadow-sm ${
                          taskForm.tags.includes(tag)
                            ? 'bg-primary border-primary text-white hover:bg-primary-hover'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                        onClick={() => handleTagToggle(tag)}
                      >
                        <span className="text-xs font-medium">{tag}</span>
                        {taskForm.tags.includes(tag) && (
                          <span className="material-symbols-outlined text-[14px] ml-0.5">close</span>
                        )}
                      </button>
                    ))}
                    {showNewTagInput ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newTagValue}
                          onChange={(e) => setNewTagValue(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddNewTag();
                            }
                          }}
                          placeholder="Tên thẻ mới..."
                          autoFocus
                          className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={handleAddNewTag}
                          className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white hover:bg-primary-hover transition-colors"
                          aria-label="Xác nhận thêm thẻ"
                        >
                          <span className="material-symbols-outlined text-[16px]">check</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewTagInput(false);
                            setNewTagValue('');
                          }}
                          className="flex items-center justify-center w-7 h-7 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
                          aria-label="Hủy"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="group flex items-center justify-center w-8 h-8 rounded-full border border-dashed border-gray-300 text-gray-400 hover:text-gray-900 hover:border-gray-400 hover:bg-gray-50 transition-all"
                        onClick={() => setShowNewTagInput(true)}
                        aria-label="Thêm thẻ mới"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="px-8 py-6 bg-surface-light flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-lg text-gray-500 font-medium hover:text-gray-900 hover:bg-gray-100 transition-colors text-sm"
                  onClick={handleCloseModal}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover transition-all shadow-minimal active:scale-[0.98] text-sm tracking-wide"
                >
                  {editingTaskId ? 'Cập nhật' : 'Tạo nhiệm vụ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <nav className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center gap-3 border-b border-gray-100">
          <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-xl">calendar_today</span>
          </div>
          <h1 className="text-[#111418] text-lg font-bold leading-tight tracking-[-0.015em]">PlanDaily</h1>
          <button 
            className="ml-auto p-1 rounded-md text-gray-600 hover:bg-gray-100"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex flex-col gap-2 p-4 flex-1">
          <Link 
            to="/daily" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-50 text-primary font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined fill-1">today</span>
            <span>Kế hoạch hôm nay</span>
          </Link>
          <Link 
            to="/goals" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-[#111418] font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">target</span>
            <span>Quản lý mục tiêu</span>
          </Link>
          <Link 
            to="/calendar" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-[#111418] font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">calendar_month</span>
            <span>Lịch biểu</span>
          </Link>
          <Link 
            to="/settings" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-[#111418] font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">settings</span>
            <span>Thiết lập</span>
          </Link>
          <div className="mt-auto border-t border-gray-100 pt-4">
            <button 
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-[#111418] font-medium transition-colors w-full"
              onClick={() => {
                window.location.href = '/login';
              }}
            >
              <span className="material-symbols-outlined">logout</span>
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default DailyPage;

