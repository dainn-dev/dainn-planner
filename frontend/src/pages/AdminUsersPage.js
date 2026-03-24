import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { adminAPI } from '../services/api';
import LogoutButton from '../components/LogoutButton';
import { isStoredAdmin } from '../utils/auth';
import { formatDate } from '../utils/dateFormat';

const mapUserFromApi = (u) => ({
  id: u.id,
  name: u.fullName ?? u.name,
  email: u.email,
  avatar: u.avatarUrl ?? u.avatar,
  role: (u.roles && u.roles[0]) ? u.roles[0] : 'User',
  status: u.emailConfirmed ? 'Active' : 'Pending',
  joinedDate: u.createdAt ? formatDate(u.createdAt) : '',
});

const AdminUsersPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAdmin = isStoredAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState('newest');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'User',
    emailConfirmed: true,
  });
  const [filters, setFilters] = useState({
    status: '',
    role: '',
    dateRange: ''
  });
  const [notifications, setNotifications] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [userStatsLoading, setUserStatsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const searchDebounceRef = useRef(null);

  const isAllSelected = users.length > 0 && users.every((u) => selectedUserIds.includes(u.id));
  const handleSelectAll = (e) => {
    const ids = users.map((u) => u.id);
    if (e.target.checked) {
      setSelectedUserIds((prev) => [...new Set([...prev, ...ids])]);
    } else {
      setSelectedUserIds((prev) => prev.filter((id) => !ids.includes(id)));
    }
  };
  const handleSelectOne = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const loadUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const params = {
        page,
        pageSize,
        ...(searchDebounced.trim() && { search: searchDebounced.trim() }),
        ...(filters.status && { status: filters.status }),
        ...(filters.role && { role: filters.role }),
        ...(filters.dateRange && { dateRange: filters.dateRange }),
        ...(selectedSort && { sort: selectedSort }),
      };
      const data = await adminAPI.getUsers(params);
      const items = data?.items ?? (Array.isArray(data) ? data : []);
      const total = data?.totalCount ?? items.length;
      setUsers(items.map(mapUserFromApi));
      setTotalCount(total);
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
      setTotalCount(0);
    } finally {
      setUsersLoading(false);
    }
  }, [page, pageSize, searchDebounced, filters.status, filters.role, filters.dateRange, selectedSort]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchDebounced(searchQuery);
      setPage(1);
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    const load = async () => {
      try {
        setUserStatsLoading(true);
        const data = await adminAPI.getUserStats();
        setUserStats(data);
      } catch (error) {
        console.error('Failed to load user stats:', error);
        setUserStats(null);
      } finally {
        setUserStatsLoading(false);
      }
    };
    load();
  }, []);

  const formatPercent = (value) => {
    if (value == null) return '—';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value}%`;
  };

  const getPercentBadgeClass = (value) => {
    if (value == null) return 'text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700';
    if (value > 0) return 'text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/40';
    if (value < 0) return 'text-orange-600 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/40';
    return 'text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800';
      case 'Pending':
        return 'bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-100 dark:border-orange-800';
      case 'Inactive':
        return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600';
      case 'Banned':
        return 'bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-100 dark:border-red-800';
      default:
        return 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600';
    }
  };

  const getStatusDot = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-500';
      case 'Pending':
        return 'bg-orange-500';
      case 'Inactive':
        return 'bg-slate-500';
      case 'Banned':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (userToDelete) {
      try {
        await adminAPI.deleteUser(userToDelete.id);
        setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
        setTotalCount((c) => Math.max(0, c - 1));
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
      setDeleteModalOpen(false);
      setUserToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setUserToDelete(null);
  };

  const handleExportClick = () => {
    setExportError('');
    setExportModalOpen(true);
  };

  const handleExportCancel = () => {
    setExportModalOpen(false);
    setExportError('');
  };

  const handleExport = async (format) => {
    const formatKey = format.toLowerCase();
    if (formatKey !== 'csv' && formatKey !== 'excel' && formatKey !== 'pdf') return;
    setExporting(true);
    setExportError('');
    try {
      const params = {
        format: formatKey,
        ...(searchDebounced.trim() && { search: searchDebounced.trim() }),
        ...(filters.status && { status: filters.status }),
        ...(filters.role && { role: filters.role }),
        ...(filters.dateRange && { dateRange: filters.dateRange }),
        ...(selectedSort && { sort: selectedSort }),
      };
      await adminAPI.exportUsers(params);
      setExportModalOpen(false);
    } catch (err) {
      setExportError(err.message || t('admin.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const handleCreateUserClick = () => {
    setCreateError('');
    setCreateForm({
      fullName: '',
      email: '',
      password: '',
      role: 'User',
      emailConfirmed: true,
    });
    setCreateModalOpen(true);
  };

  const handleCreateUserCancel = () => {
    if (creatingUser) return;
    setCreateModalOpen(false);
    setCreateError('');
  };

  const handleCreateUserSubmit = async () => {
    if (creatingUser) return;
    if (!createForm.fullName.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      setCreateError(t('admin.createUserRequiredFields'));
      return;
    }
    if (createForm.password.trim().length < 6) {
      setCreateError(t('admin.passwordMinLength'));
      return;
    }

    try {
      setCreatingUser(true);
      setCreateError('');
      const response = await adminAPI.createUser({
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
        emailConfirmed: createForm.emailConfirmed,
      });
      const created = response?.data;
      if (created) {
        setUsers((prev) => [mapUserFromApi(created), ...prev]);
        setTotalCount((c) => c + 1);
      } else {
        await loadUsers();
      }
      setCreateModalOpen(false);
    } catch (error) {
      setCreateError(error.message || t('admin.createUserFailed'));
    } finally {
      setCreatingUser(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      role: '',
      dateRange: ''
    });
  };

  const handleApplyFilters = () => {
    setFilterOpen(false);
    setPage(1);
  };

  const handleSortChange = (sortOption) => {
    setSelectedSort(sortOption);
    setSortOpen(false);
    setPage(1);
  };

  const getSortLabel = (sortOption) => {
    switch (sortOption) {
      case 'newest':
        return t('admin.sortNewestFirst');
      case 'oldest':
        return t('admin.sortOldestFirst');
      case 'name-asc':
        return t('admin.nameAZ');
      case 'name-desc':
        return t('admin.nameZA');
      default:
        return t('admin.sortNewestFirst');
    }
  };

  const hasActiveFilters = filters.status || filters.role || filters.dateRange;

  return (
    <div className="bg-[#f6f7f8] dark:bg-[#101922] text-[#111418] dark:text-slate-100 font-display overflow-x-hidden min-h-screen flex flex-row">
      {/* Sidebar - Desktop */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={t('admin.userManagement')}
          icon="group"
          actionButton={{
            text: t('admin.addNewUser'),
            icon: 'add',
            onClick: handleCreateUserClick
          }}
          notifications={notifications}
          onNotificationsChange={setNotifications}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex justify-center py-4 sm:py-6 px-4 md:px-8 overflow-y-auto">
          <div className="max-w-[1200px] flex-1 flex flex-col gap-4 sm:gap-6 w-full">
            {/* Breadcrumb */}
            <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
              <Link to="/admin/dashboard" className="text-gray-500 dark:text-slate-400 font-medium hover:text-primary dark:hover:text-blue-300 transition-colors">
                {t('admin.admin')}
              </Link>
              <span className="text-gray-500 dark:text-slate-400 font-medium">/</span>
              <span className="text-[#111418] dark:text-white font-semibold">{t('admin.userManagement')}</span>
            </div>

            {/* Page Heading */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-[#111418] dark:text-white text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-[-0.033em]">{t('admin.userManagement')}</h1>
                <p className="text-gray-500 dark:text-slate-400 text-sm sm:text-base font-normal">{t('admin.userManagementSubtitle')}</p>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <button 
                  onClick={handleExportClick}
                  className="flex items-center justify-center rounded-lg h-9 sm:h-10 px-3 sm:px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-[#111418] dark:text-slate-200 text-xs sm:text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-primary dark:hover:text-blue-300 transition-colors gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                  <span className="hidden sm:inline">{t('admin.export')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCreateUserClick}
                  className="flex sm:hidden items-center justify-center rounded-lg h-9 px-3 bg-[#1380ec] text-white text-xs font-bold hover:bg-blue-600 transition-colors gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  <span>{t('admin.addNewUser')}</span>
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {userStatsLoading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-1 sm:gap-2 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm animate-pulse">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-slate-600 rounded" />
                    <div className="flex items-end gap-2">
                      <div className="h-8 w-16 bg-gray-200 dark:bg-slate-600 rounded" />
                      <div className="h-5 w-10 bg-gray-100 dark:bg-slate-700 rounded mb-1" />
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex flex-col gap-1 sm:gap-2 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm font-medium">{t('admin.totalUsers')}</p>
                    <div className="flex items-end gap-2">
                      <p className="text-[#111418] dark:text-white text-lg sm:text-xl md:text-2xl font-bold leading-none">
                        {userStats ? userStats.totalUsers.toLocaleString() : '0'}
                      </p>
                      <span className={`px-1 sm:px-1.5 rounded text-[10px] sm:text-xs font-bold mb-1 ${getPercentBadgeClass(userStats?.percentChangeTotal)}`}>
                        {formatPercent(userStats?.percentChangeTotal)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 sm:gap-2 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm font-medium">{t('admin.activeUsers')}</p>
                    <div className="flex items-end gap-2">
                      <p className="text-[#111418] dark:text-white text-lg sm:text-xl md:text-2xl font-bold leading-none">
                        {userStats ? userStats.activeUsers.toLocaleString() : '0'}
                      </p>
                      <span className={`px-1 sm:px-1.5 rounded text-[10px] sm:text-xs font-bold mb-1 ${getPercentBadgeClass(userStats?.percentChangeActive)}`}>
                        {formatPercent(userStats?.percentChangeActive)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 sm:gap-2 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm font-medium">{t('admin.pendingApproval')}</p>
                    <div className="flex items-end gap-2">
                      <p className="text-[#111418] dark:text-white text-lg sm:text-xl md:text-2xl font-bold leading-none">
                        {userStats ? userStats.pendingUsers.toLocaleString() : '0'}
                      </p>
                      <span className={`px-1 sm:px-1.5 rounded text-[10px] sm:text-xs font-bold mb-1 ${getPercentBadgeClass(userStats?.percentChangePending)}`}>
                        {formatPercent(userStats?.percentChangePending)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 sm:gap-2 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm font-medium">{t('admin.bannedUsers')}</p>
                    <div className="flex items-end gap-2">
                      <p className="text-[#111418] dark:text-white text-lg sm:text-xl md:text-2xl font-bold leading-none">
                        {userStats ? userStats.bannedUsers.toLocaleString() : '0'}
                      </p>
                      <span className={`px-1 sm:px-1.5 rounded text-[10px] sm:text-xs font-bold mb-1 ${getPercentBadgeClass(userStats?.percentChangeBanned)}`}>
                        {formatPercent(userStats?.percentChangeBanned)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Filter and Search Controls */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm items-center">
              <div className="relative w-full sm:w-72 md:hidden">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 text-[20px]">search</span>
                <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-700 text-[#111418] dark:text-slate-200 text-xs sm:text-sm rounded-lg pl-10 pr-4 py-2 border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-700 transition-all"
                placeholder={t('admin.searchUsersPlaceholder')}
                type="text"
              />
              </div>
              <div className="flex w-full sm:w-auto gap-3 items-center">
                <div className="relative">
                  <button 
                    onClick={() => setFilterOpen(!filterOpen)}
                    className={`flex items-center gap-2 text-xs sm:text-sm font-medium text-[#111418] dark:text-slate-200 bg-white dark:bg-slate-800 border px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm ${
                      hasActiveFilters ? 'border-primary dark:border-blue-500 bg-primary/5 dark:bg-blue-900/20' : 'border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] text-gray-500 dark:text-slate-400">filter_list</span>
                    <span>{t('admin.filter')}</span>
                    {hasActiveFilters && (
                      <span className="size-2 bg-primary rounded-full"></span>
                    )}
                  </button>
                  {filterOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setFilterOpen(false)}
                      />
                      <div className="absolute left-0 top-full mt-2 w-80 min-w-[280px] bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden z-50">
                        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-[#111418] dark:text-white text-sm">{t('admin.filterUsers')}</h3>
                            <button
                              onClick={() => setFilterOpen(false)}
                              className="p-1 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-md"
                            >
                              <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                          </div>
                        </div>
                        <div className="p-4 space-y-4">
                          {/* Status Filter */}
                          <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                              {t('admin.status')}
                            </label>
                            <select
                              value={filters.status}
                              onChange={(e) => handleFilterChange('status', e.target.value)}
                              className="w-full text-sm text-[#111418] dark:text-slate-200 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">{t('admin.allStatus')}</option>
                              <option value="Active">{t('admin.statusActive')}</option>
                              <option value="Pending">{t('admin.statusPending')}</option>
                              <option value="Inactive">{t('admin.statusInactive')}</option>
                              <option value="Banned">{t('admin.statusBanned')}</option>
                            </select>
                          </div>
                          {/* Role Filter */}
                          <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                              {t('admin.role')}
                            </label>
                            <select
                              value={filters.role}
                              onChange={(e) => handleFilterChange('role', e.target.value)}
                              className="w-full text-sm text-[#111418] dark:text-slate-200 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">{t('admin.allRoles')}</option>
                              <option value="Admin">{t('admin.roleAdmin')}</option>
                              <option value="User">{t('admin.roleUser')}</option>
                            </select>
                          </div>
                          {/* Date Range Filter */}
                          <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                              {t('admin.joinedDate')}
                            </label>
                            <select
                              value={filters.dateRange}
                              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                              className="w-full text-sm text-[#111418] dark:text-slate-200 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">{t('admin.allTime')}</option>
                              <option value="today">{t('admin.today')}</option>
                              <option value="week">{t('admin.thisWeek')}</option>
                              <option value="month">{t('admin.thisMonth')}</option>
                              <option value="quarter">{t('admin.thisQuarter')}</option>
                              <option value="year">{t('admin.thisYear')}</option>
                            </select>
                          </div>
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between gap-3">
                          <button
                            onClick={handleClearFilters}
                            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-[#111418] dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            {t('admin.clear')}
                          </button>
                          <button
                            onClick={handleApplyFilters}
                            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            {t('admin.applyFilters')}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setSortOpen(!sortOpen)}
                    className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[#111418] dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px] text-gray-500 dark:text-slate-400">sort</span>
                    <span>{t('daily.sort')}: {getSortLabel(selectedSort)}</span>
                  </button>
                  {sortOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setSortOpen(false)}
                      />
                      <div className="absolute left-0 top-full mt-2 w-64 min-w-[240px] bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden z-50">
                        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-[#111418] dark:text-white text-sm">{t('admin.sortUsers')}</h3>
                            <button
                              onClick={() => setSortOpen(false)}
                              className="p-1 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-md"
                            >
                              <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                          </div>
                        </div>
                        <div className="p-2">
                          <button
                            onClick={() => handleSortChange('newest')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              selectedSort === 'newest'
                                ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-300'
                                : 'text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {selectedSort === 'newest' ? 'radio_button_checked' : 'radio_button_unchecked'}
                            </span>
                            <span>{t('admin.sortNewestFirst')}</span>
                          </button>
                          <button
                            onClick={() => handleSortChange('oldest')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              selectedSort === 'oldest'
                                ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-300'
                                : 'text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {selectedSort === 'oldest' ? 'radio_button_checked' : 'radio_button_unchecked'}
                            </span>
                            <span>{t('admin.sortOldestFirst')}</span>
                          </button>
                          <button
                            onClick={() => handleSortChange('name-asc')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              selectedSort === 'name-asc'
                                ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-300'
                                : 'text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {selectedSort === 'name-asc' ? 'radio_button_checked' : 'radio_button_unchecked'}
                            </span>
                            <span>{t('admin.nameAZ')}</span>
                          </button>
                          <button
                            onClick={() => handleSortChange('name-desc')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              selectedSort === 'name-desc'
                                ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-300'
                                : 'text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {selectedSort === 'name-desc' ? 'radio_button_checked' : 'radio_button_unchecked'}
                            </span>
                            <span>{t('admin.nameZA')}</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="hidden sm:flex flex-1 justify-end text-gray-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                {t('admin.showingOf', { from: totalCount === 0 ? 0 : (page - 1) * pageSize + 1, to: Math.min(page * pageSize, totalCount), total: totalCount })}
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm text-gray-600 dark:text-slate-300">
                  <thead className="bg-gray-50 dark:bg-slate-700/50 text-[10px] sm:text-xs uppercase text-gray-500 dark:text-slate-400 font-semibold border-b border-gray-200 dark:border-slate-700">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 w-10" scope="col">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                          disabled={users.length === 0}
                          className="rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-primary focus:ring-primary"
                          aria-label={t('admin.selectAllUsers')}
                        />
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4" scope="col">{t('admin.tableUser')}</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4" scope="col">{t('admin.tableRole')}</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4" scope="col">{t('admin.tableStatus')}</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4" scope="col">{t('admin.joinedDate')}</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-right" scope="col">{t('admin.usersTableActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {usersLoading ? (
                      <tr>
                        <td colSpan={6} className="px-4 sm:px-6 py-6 sm:py-8 text-center text-gray-500 dark:text-slate-400 text-xs sm:text-sm">{t('common.loading')}</td>
                      </tr>
                    ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group">
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(user.id)}
                            onChange={() => handleSelectOne(user.id)}
                            className="rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-primary focus:ring-primary"
                            aria-label={t('admin.selectUser', { name: user.name })}
                          />
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="h-10 w-10 rounded-full bg-cover bg-center ring-1 ring-gray-200 dark:ring-slate-600" 
                              style={{ backgroundImage: `url("${user.avatar}")` }}
                              alt={`Profile of ${user.name}`}
                            />
                            <div className="flex flex-col">
                              <span className="text-[#111418] dark:text-white font-semibold">{user.name}</span>
                              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`material-symbols-outlined text-[18px] ${user.role === 'Admin' ? 'text-primary dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'}`}>
                              {user.role === 'Admin' ? 'security' : 'person'}
                            </span>
                            <span className="text-[#111418] dark:text-slate-200 font-medium">{user.role === 'Admin' ? t('admin.roleAdmin') : t('admin.roleUser')}</span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <span className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-medium border ${getStatusBadge(user.status)}`}>
                            <span className={`size-1.5 rounded-full ${getStatusDot(user.status)}`}></span>
                            {user.status === 'Active' ? t('admin.statusActive') : user.status === 'Pending' ? t('admin.statusPending') : user.status === 'Inactive' ? t('admin.statusInactive') : user.status === 'Banned' ? t('admin.statusBanned') : user.status}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium dark:text-slate-200">{user.joinedDate}</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button 
                              onClick={() => navigate(`/admin/users/${user.id}`)}
                              className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-[#111418] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors" 
                              title={t('admin.viewDetails')}
                            >
                              <span className="material-symbols-outlined text-[20px]">visibility</span>
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(user)}
                              className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors" 
                              title={t('common.delete')}
                            >
                              <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30 px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">{t('admin.rowsPerPage')}</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    className="bg-white dark:bg-slate-700 text-[#111418] dark:text-slate-200 text-xs sm:text-sm rounded border border-gray-300 dark:border-slate-600 focus:ring-1 focus:ring-primary py-1 pl-2 pr-8"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="flex size-8 items-center justify-center rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-600 hover:text-[#111418] dark:hover:text-white disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>
                  {(() => {
                    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
                    const seen = new Set();
                    const pages = [];
                    const addPage = (p) => { if (p >= 1 && p <= totalPages && !seen.has(p)) { seen.add(p); pages.push(p); } };
                    addPage(1);
                    if (page > 3) pages.push('...');
                    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) addPage(p);
                    if (page < totalPages - 2) pages.push('...');
                    if (totalPages > 1) addPage(totalPages);
                    return pages.map((p) =>
                      p === '...' ? (
                        <span key="ellipsis" className="text-gray-500 dark:text-slate-400 px-1">...</span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPage(p)}
                          className={`flex size-7 sm:size-8 items-center justify-center rounded border text-xs sm:text-sm font-medium shadow-sm transition-colors ${
                            p === page
                              ? 'border-primary bg-primary text-white'
                              : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-600 hover:text-[#111418] dark:hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    );
                  })()}
                  <button
                    type="button"
                    disabled={page >= Math.ceil(totalCount / pageSize) || totalCount === 0}
                    onClick={() => setPage((p) => p + 1)}
                    className="flex size-8 items-center justify-center rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-600 hover:text-[#111418] dark:hover:text-white disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <nav className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 z-50 transform transition-transform duration-300 lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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
                <span>{t('sidebar.dashboard')}</span>
              </Link>
              <Link
                to="/admin/users"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-50 dark:bg-slate-800 text-primary dark:text-blue-300 font-medium transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined fill-1">people</span>
                <span>{t('sidebar.users')}</span>
              </Link>
              <Link
                to="/admin/logs"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-[#111418] dark:hover:text-white font-medium transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined">description</span>
                <span>{t('sidebar.logs')}</span>
              </Link>
              <div className="my-2 border-t border-gray-100 dark:border-slate-700" />
            </>
          )}
          <Link 
            to="/daily" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-[#111418] dark:hover:text-white font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">today</span>
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
            <LogoutButton labelKey="sidebar.logout" />
          </div>
        </div>
      </nav>

      {/* Delete Confirmation Modal */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm transition-all duration-300"
          onClick={handleCreateUserCancel}
        >
          <div
            className="w-full max-w-md flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden animate-fadeInScale"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center justify-center size-12 rounded-full bg-blue-100 dark:bg-blue-900/40">
                  <span className="material-symbols-outlined text-primary dark:text-blue-400 text-3xl">person_add</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#111418] dark:text-white">{t('admin.createUserTitle')}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t('admin.createUserDesc')}</p>
                </div>
                <button
                  onClick={handleCreateUserCancel}
                  className="p-1 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-md"
                >
                  <span className="material-symbols-outlined text-[24px]">close</span>
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t('admin.fullName')}</label>
                  <input
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    className="rounded-lg border border-[#cfdbe7] dark:border-slate-600 bg-white dark:bg-slate-900 text-sm px-3 py-2 text-[#0d141b] dark:text-white"
                    placeholder={t('admin.fullNamePlaceholder')}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t('common.email')}</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="rounded-lg border border-[#cfdbe7] dark:border-slate-600 bg-white dark:bg-slate-900 text-sm px-3 py-2 text-[#0d141b] dark:text-white"
                    placeholder={t('auth.emailPlaceholder')}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t('common.password')}</label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="rounded-lg border border-[#cfdbe7] dark:border-slate-600 bg-white dark:bg-slate-900 text-sm px-3 py-2 text-[#0d141b] dark:text-white"
                    placeholder={t('auth.passwordPlaceholder')}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t('admin.role')}</label>
                    <select
                      value={createForm.role}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value }))}
                      className="rounded-lg border border-[#cfdbe7] dark:border-slate-600 bg-white dark:bg-slate-900 text-sm px-3 py-2 text-[#0d141b] dark:text-white"
                    >
                      <option value="User">{t('admin.roleUser')}</option>
                      <option value="Admin">{t('admin.roleAdmin')}</option>
                    </select>
                  </div>
                  <label className="flex items-end pb-2 gap-2 text-sm text-[#111418] dark:text-white">
                    <input
                      type="checkbox"
                      checked={createForm.emailConfirmed}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, emailConfirmed: e.target.checked }))}
                      className="rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-primary focus:ring-primary"
                    />
                    <span>{t('admin.createUserEmailConfirmed')}</span>
                  </label>
                </div>
              </div>
              {createError && (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">{createError}</p>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/30 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-slate-700">
              <button
                type="button"
                disabled={creatingUser}
                onClick={handleCreateUserCancel}
                className="px-4 py-2 rounded-lg text-gray-700 dark:text-slate-200 font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-sm disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={creatingUser}
                onClick={() => void handleCreateUserSubmit()}
                className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
              >
                {creatingUser ? t('common.processing') : t('admin.createUserButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && userToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm transition-all duration-300"
          onClick={handleDeleteCancel}
        >
          <div
            className="w-full max-w-md flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden animate-fadeInScale"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center justify-center size-12 rounded-full bg-red-100 dark:bg-red-900/40">
                  <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">warning</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#111418] dark:text-white">{t('admin.deleteUserTitle')}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t('admin.deleteUserCannotUndo')}</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 border border-gray-200 dark:border-slate-600">
                <p className="text-sm text-gray-700 dark:text-slate-200">
                  {t('admin.deleteUserConfirm', { name: userToDelete.name })}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">{userToDelete.email}</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/30 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 rounded-lg text-gray-700 dark:text-slate-200 font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors text-sm"
              >
                {t('admin.deleteUserButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {exportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm transition-all duration-300"
          onClick={handleExportCancel}
        >
          <div
            className="w-full max-w-md flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden animate-fadeInScale"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center justify-center size-12 rounded-full bg-blue-100 dark:bg-blue-900/40">
                  <span className="material-symbols-outlined text-primary dark:text-blue-400 text-3xl">download</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#111418] dark:text-white">{t('admin.exportUsersTitle')}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t('admin.exportUsersDesc')}</p>
                </div>
                <button
                  onClick={handleExportCancel}
                  className="p-1 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-md"
                >
                  <span className="material-symbols-outlined text-[24px]">close</span>
                </button>
              </div>
              {exporting && (
                <div className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                  <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                  <span>{t('admin.exporting')}</span>
                </div>
              )}
              <div className={`space-y-2 ${exporting ? 'pointer-events-none opacity-60' : ''}`}>
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => handleExport('CSV')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-primary dark:hover:border-blue-500 transition-colors group disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center size-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 group-hover:bg-primary/10 dark:group-hover:bg-blue-900/50">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 group-hover:text-primary">description</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-[#111418] dark:text-white">{t('admin.exportAsCsv')}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{t('admin.exportCsvDesc')}</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-400 dark:text-slate-500">chevron_right</span>
                </button>
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => handleExport('Excel')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-primary dark:hover:border-blue-500 transition-colors group disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center size-10 rounded-lg bg-green-50 dark:bg-green-900/30 group-hover:bg-primary/10 dark:group-hover:bg-blue-900/50">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 group-hover:text-primary">table_chart</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-[#111418] dark:text-white">{t('admin.exportAsExcel')}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{t('admin.exportExcelDesc')}</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-400 dark:text-slate-500">chevron_right</span>
                </button>
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => handleExport('PDF')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-primary dark:hover:border-blue-500 transition-colors group disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center size-10 rounded-lg bg-red-50 dark:bg-red-900/30 group-hover:bg-primary/10 dark:group-hover:bg-blue-900/50">
                    <span className="material-symbols-outlined text-red-600 dark:text-red-400 group-hover:text-primary">picture_as_pdf</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-[#111418] dark:text-white">{t('admin.exportAsPdf')}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{t('admin.exportPdfDesc')}</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-400 dark:text-slate-500">chevron_right</span>
                </button>
              </div>
              {exportError && (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">{exportError}</p>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/30 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handleExportCancel}
                className="px-4 py-2 rounded-lg text-gray-700 dark:text-slate-200 font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-sm"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;

