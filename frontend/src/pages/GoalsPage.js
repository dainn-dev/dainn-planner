import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { validateTitle, validateCategory, validateDate } from '../utils/formValidation';
import { goalsAPI, notificationsAPI } from '../services/api';

const categoryToIcon = {
  'Kỹ năng': 'code',
  'Tài chính': 'savings',
  'Sức khỏe': 'fitness_center',
  'Học tập': 'school',
  'Công việc': 'work',
  'Gia đình': 'home',
  'Du lịch': 'flight',
};

const mapGoalFromApi = (g) => {
  const statusLower = (g.status || '').toLowerCase();
  const isCompleted = statusLower === 'completed' || statusLower === 'done';
  const dueDate = g.targetDate
    ? new Date(g.targetDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : (g.dueDate || '');
  return {
    id: g.id,
    title: g.title,
    category: g.category || '',
    dueDate,
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
  time: n.createdAt ? new Date(n.createdAt).toLocaleString('vi-VN') : '',
  unread: !n.isRead,
  icon: n.icon || 'notifications',
  iconBg: 'bg-blue-100',
  iconColor: n.iconColor || 'text-primary',
});

const GoalsPage = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
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

  const loadData = async () => {
    try {
      setGoalsLoading(true);
      const [goalsData, notificationsData] = await Promise.all([
        goalsAPI.getGoals(),
        notificationsAPI.getNotifications({ limit: 20 }),
      ]);
      setGoals(Array.isArray(goalsData) ? goalsData.map(mapGoalFromApi) : []);
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
  const averageProgress = goals.length > 0 
    ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
    : 0;

  const handleDeleteClick = (goal) => {
    setGoalToDelete(goal);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (goalToDelete) {
      try {
        await goalsAPI.deleteGoal(goalToDelete.id);
        setGoals(goals.filter(g => g.id !== goalToDelete.id));
      } catch (error) {
        console.error('Failed to delete goal:', error);
      }
      setDeleteModalOpen(false);
      setGoalToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setGoalToDelete(null);
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();

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

    try {
      const targetDate = goalForm.dueDate ? new Date(goalForm.dueDate).toISOString() : null;
      const created = await goalsAPI.createGoal({
        title: goalForm.title.trim(),
        description: '',
        category: goalForm.category.trim(),
        targetDate,
        startDate: null,
      });
      setGoals([...goals, mapGoalFromApi(created)]);
      setGoalForm({ title: '', category: '', dueDate: '', icon: 'flag' });
      setGoalFormErrors({});
      setAddGoalModalOpen(false);
    } catch (error) {
      console.error('Failed to create goal:', error);
      setGoalFormErrors({ submit: error.message || 'Không thể tạo mục tiêu.' });
    }
  };

  const handleCloseAddModal = () => {
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
    // Clear error when user starts typing
    if (goalFormErrors[field]) {
      setGoalFormErrors(prev => ({ ...prev, [field]: null }));
    }
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

  const iconOptions = [
    { value: 'flag', label: 'Mục tiêu' },
    { value: 'code', label: 'Kỹ năng' },
    { value: 'savings', label: 'Tài chính' },
    { value: 'fitness_center', label: 'Sức khỏe' },
    { value: 'school', label: 'Học tập' },
    { value: 'work', label: 'Công việc' },
    { value: 'home', label: 'Gia đình' },
    { value: 'flight', label: 'Du lịch' }
  ];

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background-subtle text-zinc-900 antialiased selection:bg-zinc-200">
      {/* Sidebar - Desktop */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-background-subtle">
        <Header 
          title="Quản lý mục tiêu"
          icon="target"
          actionButton={{
            text: 'Thêm mục tiêu',
            icon: 'add',
            onClick: () => setAddGoalModalOpen(true)
          }}
          notifications={notifications}
          onNotificationsChange={setNotifications}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          <div className="w-full max-w-[1024px] mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-10 flex flex-col gap-6 md:gap-10">
          {/* Header Section */}
          <div className="flex flex-col gap-1.5 md:gap-2">
            <h2 className="text-zinc-900 text-2xl md:text-3xl font-light tracking-tight">Mục tiêu dài hạn</h2>
            <p className="text-secondary text-sm font-normal leading-relaxed max-w-lg">
              Theo dõi tiến độ, duy trì động lực và biến ước mơ thành hiện thực.
            </p>
          </div>

          {/* Stats Cards - inline on mobile (icon + label + number), stacked on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            <div className="flex flex-row sm:flex-col sm:justify-between items-center justify-between sm:justify-start gap-2 sm:gap-0 min-h-0 sm:min-h-[100px] md:h-32 p-4 md:p-6 bg-background-light border border-border-light rounded-xl md:rounded-lg shadow-sm transition-colors hover:border-zinc-300 active:scale-[0.99]">
              <span className="material-symbols-outlined text-zinc-400 text-[20px] select-none shrink-0 order-first" aria-hidden>bolt</span>
              <p className="text-secondary text-sm font-medium min-w-0 flex-1 sm:flex-none text-center sm:text-left truncate">Đang thực hiện</p>
              <p className="text-zinc-900 text-2xl sm:text-3xl md:text-4xl font-light tracking-tight shrink-0 order-last sm:mt-1">{activeGoals}</p>
            </div>
            <div className="flex flex-row sm:flex-col sm:justify-between items-center justify-between sm:justify-start gap-2 sm:gap-0 min-h-0 sm:min-h-[100px] md:h-32 p-4 md:p-6 bg-background-light border border-border-light rounded-xl md:rounded-lg shadow-sm transition-colors hover:border-zinc-300 active:scale-[0.99]">
              <span className="material-symbols-outlined text-zinc-400 text-[20px] select-none shrink-0 order-first" aria-hidden>check</span>
              <p className="text-secondary text-sm font-medium min-w-0 flex-1 sm:flex-none text-center sm:text-left truncate">Đã hoàn thành</p>
              <p className="text-zinc-900 text-2xl sm:text-3xl md:text-4xl font-light tracking-tight shrink-0 order-last sm:mt-1">{completedGoals}</p>
            </div>
            <div className="flex flex-row sm:flex-col sm:justify-between items-center justify-between sm:justify-start gap-2 sm:gap-0 min-h-0 sm:min-h-[100px] md:h-32 p-4 md:p-6 bg-background-light border border-border-light rounded-xl md:rounded-lg shadow-sm transition-colors hover:border-zinc-300 active:scale-[0.99]">
              <span className="material-symbols-outlined text-zinc-400 text-[20px] select-none shrink-0 order-first" aria-hidden>trending_up</span>
              <p className="text-secondary text-sm font-medium min-w-0 flex-1 sm:flex-none text-center sm:text-left truncate">Tiến độ TB</p>
              <p className="text-zinc-900 text-2xl sm:text-3xl md:text-4xl font-light tracking-tight shrink-0 order-last sm:mt-1">{averageProgress}%</p>
            </div>
          </div>

          {/* Goals List */}
          <div className="flex flex-col gap-4 md:gap-6">
            <div className="flex items-center justify-between border-b border-border-light pb-3 md:pb-4">
              <h3 className="text-zinc-900 text-base md:text-lg font-medium tracking-tight">Danh sách mục tiêu</h3>
              <button type="button" className="min-h-[44px] min-w-[44px] flex items-center justify-center py-2 px-3 -mr-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 uppercase tracking-wider transition-colors rounded-lg hover:bg-zinc-100 active:bg-zinc-200">
                Xem tất cả
              </button>
            </div>
            {goalsLoading ? (
              <p className="text-zinc-500 text-sm py-4">Đang tải...</p>
            ) : (
            goals.map((goal) => (
              <div 
                key={goal.id} 
                className="group flex flex-col sm:flex-row sm:items-center gap-4 md:gap-5 bg-background-light p-4 md:p-5 rounded-xl md:rounded-lg border border-border-light transition-all hover:border-zinc-400 hover:shadow-sm active:scale-[0.99] cursor-pointer touch-manipulation"
                onClick={() => navigate(`/goals/${goal.id}`)}
              >
                <div className="flex items-start sm:items-center gap-4 md:gap-5 flex-1 min-w-0">
                  <div className="flex items-center justify-center rounded-xl md:rounded-lg bg-zinc-50 text-zinc-900 border border-zinc-100 shrink-0 size-11 md:size-12">
                    <span className="material-symbols-outlined text-[20px] md:text-[22px]">{goal.icon}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <p className="text-zinc-900 text-sm font-semibold leading-snug truncate">{goal.title}</p>
                    <p className="text-zinc-500 text-xs font-normal leading-normal">{goal.category} • {goal.dueDate}</p>
                  </div>
                </div>
                <div className="flex flex-row sm:flex-col sm:items-end items-center gap-3 sm:gap-2 w-full sm:w-auto sm:min-w-[180px]">
                  <div className="flex flex-col sm:items-end gap-2 flex-1 w-full sm:w-auto min-w-0">
                    <div className="flex justify-between w-full sm:justify-end gap-2">
                      <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">Tiến độ</span>
                      <span className="text-[10px] font-bold text-zinc-900">{goal.progress}%</span>
                    </div>
                    <div className="w-full h-2 md:h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-zinc-800 transition-all duration-300" 
                        style={{ width: `${goal.progress}%` }}
                        role="progressbar"
                        aria-valuenow={goal.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Tiến độ: ${goal.progress}%`}
                      />
                    </div>
                  </div>
                  <button 
                    type="button"
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center p-2.5 sm:p-2 text-zinc-300 hover:text-zinc-600 transition-colors rounded-full hover:bg-zinc-100 active:bg-red-50 touch-manipulation shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(goal);
                    }}
                    aria-label={`Xóa mục tiêu: ${goal.title}`}
                  >
                    <span className="material-symbols-outlined text-red-500 text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            ))
            )}
          </div>
        </div>
        </div>
      </main>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-background-light border-r border-border-light z-50 transform transition-transform duration-300 md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col gap-6 p-6 h-full">
          <div className="flex gap-4 items-center mb-2">
            <div 
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 shrink-0 border border-border-light" 
              style={{
                backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAeUugiOR9hYhFecZqd2aBpjIbdYsVoQq-XRu0C7PjvvOD29ciS31QptfxtKfHZIJDslvVk4Dff5PMdP6GEuDvf29g3r_QnSpLSB70DQQ4FlklSEYK0xk1xgMvlIYQO1IRTDB-9LcphvvK3Dw3eJgkT-b-nlCmftrboabZa7C8wgKcsxcbwXnHEcB_ZgObEhP8T5Qkcds0cSn44kJCK3t6LYfG1p-LKpu_i3OYi4Edr0dz03d1P7bUFNTK9aXNa0IbKXmDF05WYxfMB")'
              }}
              aria-label="User avatar"
            />
            <div className="flex flex-col overflow-hidden">
              <h1 className="text-zinc-900 text-sm font-semibold tracking-wide uppercase">Quản lý mục tiêu</h1>
              <p className="text-secondary text-xs font-normal">Kế hoạch cá nhân</p>
            </div>
            <button 
              className="ml-auto p-1 rounded-md text-zinc-600 hover:bg-zinc-100"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <nav className="flex flex-col gap-1">
            <Link 
              to="/daily" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-50 transition-colors group"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="material-symbols-outlined text-zinc-400 group-hover:text-zinc-900 transition-colors" style={{ fontSize: '20px' }}>today</span>
              <p className="text-zinc-500 group-hover:text-zinc-900 text-sm font-medium transition-colors">Kế hoạch hôm nay</p>
            </Link>
            <Link 
              to="/goals" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-zinc-100 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="material-symbols-outlined text-zinc-900" style={{ fontSize: '20px' }}>track_changes</span>
              <p className="text-zinc-900 text-sm font-medium">Quản lý mục tiêu</p>
            </Link>
            <Link 
              to="/calendar" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-50 transition-colors group"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="material-symbols-outlined text-zinc-400 group-hover:text-zinc-900 transition-colors" style={{ fontSize: '20px' }}>calendar_month</span>
              <p className="text-zinc-500 group-hover:text-zinc-900 text-sm font-medium transition-colors">Lịch biểu</p>
            </Link>
            <Link 
              to="/settings" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-50 transition-colors group"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="material-symbols-outlined text-zinc-400 group-hover:text-zinc-900 transition-colors" style={{ fontSize: '20px' }}>settings</span>
              <p className="text-zinc-500 group-hover:text-zinc-900 text-sm font-medium transition-colors">Thiết lập</p>
            </Link>
          </nav>
          <div className="mt-auto flex flex-col gap-2">
            <button 
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-50 transition-colors text-left w-full group"
              onClick={() => {
                window.location.href = '/login';
              }}
            >
              <span className="material-symbols-outlined text-zinc-400 group-hover:text-zinc-900 transition-colors" style={{ fontSize: '20px' }}>logout</span>
              <p className="text-zinc-500 group-hover:text-zinc-900 text-sm font-medium transition-colors">Đăng xuất</p>
            </button>
          </div>
        </div>
      </aside>

      {/* Add Goal Modal */}
      {addGoalModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-zinc-900/20 backdrop-blur-sm transition-all duration-300"
          onClick={handleCloseAddModal}
        >
          <div
            className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-zinc-100"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleAddGoal}>
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900" id="add-goal-title">Thêm Mục Tiêu Mới</h3>
                    <p className="text-sm text-zinc-500 mt-1">Tạo một mục tiêu dài hạn mới để theo dõi.</p>
                  </div>
                  <button
                    type="button"
                    className="p-2 -mr-2 -mt-2 rounded-full hover:bg-zinc-100 transition-colors focus:outline-none"
                    onClick={handleCloseAddModal}
                    aria-label="Đóng"
                  >
                    <span className="material-symbols-outlined text-zinc-400 hover:text-zinc-600 text-[24px]">close</span>
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      Tên mục tiêu
                    </label>
                    <input
                      autoFocus
                      className={`w-full rounded-lg bg-white text-zinc-900 px-4 py-2.5 text-sm focus:bg-white focus:ring-0 placeholder:text-zinc-400 transition-all font-medium shadow-sm hover:border-zinc-300 ${
                        goalFormErrors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-zinc-200 focus:border-zinc-400'
                      }`}
                      placeholder="Nhập tên mục tiêu..."
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
                      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Danh mục</label>
                      <input
                        className={`w-full rounded-lg bg-white text-zinc-900 px-4 py-2.5 text-sm focus:bg-white focus:ring-0 placeholder:text-zinc-400 transition-all font-medium shadow-sm hover:border-zinc-300 ${
                          goalFormErrors.category ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-zinc-200 focus:border-zinc-400'
                        }`}
                        placeholder="Ví dụ: Kỹ năng"
                        type="text"
                        value={goalForm.category}
                        onChange={(e) => handleGoalFormChange('category', e.target.value)}
                        onBlur={(e) => handleGoalFormBlur('category', e.target.value)}
                        required
                        aria-invalid={goalFormErrors.category ? 'true' : 'false'}
                        aria-describedby={goalFormErrors.category ? 'category-error' : undefined}
                      />
                      {goalFormErrors.category && (
                        <p id="category-error" className="text-xs text-red-500 mt-1" role="alert">
                          {goalFormErrors.category}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ngày đến hạn</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-zinc-400 text-[18px] pointer-events-none">event</span>
                        <input
                          className={`w-full rounded-lg bg-white text-zinc-900 pl-10 pr-4 py-2.5 text-sm focus:bg-white focus:ring-0 transition-all cursor-pointer hover:bg-zinc-50 shadow-sm ${
                            goalFormErrors.dueDate ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-zinc-200 focus:border-zinc-400'
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
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Biểu tượng</label>
                    <div className="flex flex-wrap gap-2">
                      {iconOptions.map((icon) => (
                        <button
                          key={icon.value}
                          type="button"
                          className={`flex items-center justify-center gap-2 min-h-[44px] px-3 py-2 rounded-lg border transition-all touch-manipulation ${
                            goalForm.icon === icon.value
                              ? 'bg-zinc-900 border-zinc-900 text-white'
                              : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                          }`}
                          onClick={() => setGoalForm(prev => ({ ...prev, icon: icon.value }))}
                        >
                          <span className="material-symbols-outlined text-lg">{icon.value}</span>
                          <span className="text-xs font-medium">{icon.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-zinc-50/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-zinc-100 gap-3 sm:gap-0">
                <button
                  type="submit"
                  className="inline-flex w-full justify-center items-center min-h-[48px] rounded-xl sm:rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 sm:ml-3 sm:w-auto transition-colors touch-manipulation"
                >
                  Tạo mục tiêu
                </button>
                <button
                  type="button"
                  className="inline-flex w-full justify-center items-center min-h-[48px] rounded-xl sm:rounded-lg bg-white px-4 py-3 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 sm:mt-0 sm:w-auto transition-colors touch-manipulation"
                  onClick={handleCloseAddModal}
                >
                  Hủy
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
            onClick={handleCancelDelete}
          />
          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-zinc-100">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-50 sm:mx-0 sm:h-10 sm:w-10">
                      <span className="material-symbols-outlined text-red-600" style={{ fontSize: '24px' }}>delete</span>
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                      <h3 className="text-base font-semibold leading-6 text-zinc-900" id="modal-title">Xóa mục tiêu</h3>
                      <div className="mt-2">
                        <p className="text-sm text-zinc-500">Bạn có chắc chắn muốn xóa mục tiêu này không?</p>
                        <div className="mt-4 flex items-center gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-zinc-200 shadow-sm text-zinc-900">
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{goalToDelete.icon}</span>
                          </div>
                          <div className="flex flex-col text-left">
                            <p className="text-sm font-semibold text-zinc-900">{goalToDelete.title}</p>
                            <p className="text-xs text-zinc-500">{goalToDelete.category} • {goalToDelete.dueDate}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-zinc-50/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-zinc-100 gap-3 sm:gap-0">
                  <button 
                    className="inline-flex w-full justify-center items-center min-h-[48px] rounded-xl sm:rounded-lg bg-red-600 px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto transition-colors touch-manipulation" 
                    type="button"
                    onClick={handleConfirmDelete}
                  >
                    Xóa
                  </button>
                  <button 
                    className="inline-flex w-full justify-center items-center min-h-[48px] rounded-xl sm:rounded-lg bg-white px-3 py-3 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 sm:w-auto transition-colors touch-manipulation" 
                    type="button"
                    onClick={handleCancelDelete}
                  >
                    Hủy
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

