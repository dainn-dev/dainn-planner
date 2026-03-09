import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { adminAPI } from '../services/api';
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
    if (value == null) return 'text-gray-500 bg-gray-100';
    if (value > 0) return 'text-emerald-600 bg-emerald-50';
    if (value < 0) return 'text-orange-600 bg-orange-50';
    return 'text-gray-500 bg-gray-100';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Pending':
        return 'bg-orange-50 text-orange-700 border-orange-100';
      case 'Inactive':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Banned':
        return 'bg-red-50 text-red-700 border-red-100';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
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
      setExportError(err.message || 'Export failed');
    } finally {
      setExporting(false);
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
        return 'Newest';
      case 'oldest':
        return 'Oldest';
      case 'name-asc':
        return 'Name (A-Z)';
      case 'name-desc':
        return 'Name (Z-A)';
      default:
        return 'Newest';
    }
  };

  const hasActiveFilters = filters.status || filters.role || filters.dateRange;

  return (
    <div className="bg-[#f6f7f8] text-[#111418] font-display overflow-x-hidden min-h-screen flex flex-row">
      {/* Sidebar - Desktop */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={t('admin.userManagement')}
          icon="group"
          actionButton={{
            text: 'Add New User',
            icon: 'add',
            onClick: () => console.log('Add new user clicked')
          }}
          notifications={notifications}
          onNotificationsChange={setNotifications}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex justify-center py-6 px-4 md:px-8 overflow-y-auto">
          <div className="max-w-[1200px] flex-1 flex flex-col gap-6 w-full">
            {/* Breadcrumb */}
            <div className="flex flex-wrap gap-2 text-sm">
              <Link to="/admin/dashboard" className="text-gray-500 font-medium hover:text-primary transition-colors">
                Admin
              </Link>
              <span className="text-gray-500 font-medium">/</span>
              <span className="text-[#111418] font-semibold">User Management</span>
            </div>

            {/* Page Heading */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-[#111418] text-3xl font-black leading-tight tracking-[-0.033em]">User Management</h1>
                <p className="text-gray-500 text-base font-normal">View, manage, and edit user accounts and permissions.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleExportClick}
                  className="flex items-center justify-center rounded-lg h-10 px-4 bg-white border border-gray-200 text-[#111418] text-sm font-bold hover:bg-gray-50 hover:text-primary transition-colors gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                  <span className="hidden sm:inline">Export</span>
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {userStatsLoading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 bg-white shadow-sm animate-pulse">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="flex items-end gap-2">
                      <div className="h-8 w-16 bg-gray-200 rounded" />
                      <div className="h-5 w-10 bg-gray-100 rounded mb-1" />
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-gray-500 text-sm font-medium">{t('admin.totalUsers')}</p>
                    <div className="flex items-end gap-2">
                      <p className="text-[#111418] text-2xl font-bold leading-none">
                        {userStats ? userStats.totalUsers.toLocaleString() : '0'}
                      </p>
                      <span className={`px-1.5 rounded text-xs font-bold mb-1 ${getPercentBadgeClass(userStats?.percentChangeTotal)}`}>
                        {formatPercent(userStats?.percentChangeTotal)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-gray-500 text-sm font-medium">{t('admin.activeUsers')}</p>
                    <div className="flex items-end gap-2">
                      <p className="text-[#111418] text-2xl font-bold leading-none">
                        {userStats ? userStats.activeUsers.toLocaleString() : '0'}
                      </p>
                      <span className={`px-1.5 rounded text-xs font-bold mb-1 ${getPercentBadgeClass(userStats?.percentChangeActive)}`}>
                        {formatPercent(userStats?.percentChangeActive)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-gray-500 text-sm font-medium">{t('admin.pendingApproval')}</p>
                    <div className="flex items-end gap-2">
                      <p className="text-[#111418] text-2xl font-bold leading-none">
                        {userStats ? userStats.pendingUsers.toLocaleString() : '0'}
                      </p>
                      <span className={`px-1.5 rounded text-xs font-bold mb-1 ${getPercentBadgeClass(userStats?.percentChangePending)}`}>
                        {formatPercent(userStats?.percentChangePending)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-gray-500 text-sm font-medium">{t('admin.bannedUsers')}</p>
                    <div className="flex items-end gap-2">
                      <p className="text-[#111418] text-2xl font-bold leading-none">
                        {userStats ? userStats.bannedUsers.toLocaleString() : '0'}
                      </p>
                      <span className={`px-1.5 rounded text-xs font-bold mb-1 ${getPercentBadgeClass(userStats?.percentChangeBanned)}`}>
                        {formatPercent(userStats?.percentChangeBanned)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Filter and Search Controls */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-white border border-gray-200 shadow-sm items-center">
              <div className="relative w-full sm:w-72 md:hidden">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[20px]">search</span>
                <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 text-[#111418] text-sm rounded-lg pl-10 pr-4 py-2 border-gray-200 focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                placeholder="Search users..."
                type="text"
              />
              </div>
              <div className="flex w-full sm:w-auto gap-3 items-center">
                <div className="relative">
                  <button 
                    onClick={() => setFilterOpen(!filterOpen)}
                    className={`flex items-center gap-2 text-sm font-medium text-[#111418] bg-white border px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm ${
                      hasActiveFilters ? 'border-primary bg-primary/5' : 'border-gray-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] text-gray-500">filter_list</span>
                    <span>Filter</span>
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
                      <div className="absolute left-0 top-full mt-2 w-80 min-w-[280px] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                        <div className="p-4 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-[#111418] text-sm">Filter Users</h3>
                            <button
                              onClick={() => setFilterOpen(false)}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded-md"
                            >
                              <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                          </div>
                        </div>
                        <div className="p-4 space-y-4">
                          {/* Status Filter */}
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                              Status
                            </label>
                            <select
                              value={filters.status}
                              onChange={(e) => handleFilterChange('status', e.target.value)}
                              className="w-full text-sm text-[#111418] bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">All Status</option>
                              <option value="Active">Active</option>
                              <option value="Pending">Pending</option>
                              <option value="Inactive">Inactive</option>
                              <option value="Banned">Banned</option>
                            </select>
                          </div>
                          {/* Role Filter */}
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                              Role
                            </label>
                            <select
                              value={filters.role}
                              onChange={(e) => handleFilterChange('role', e.target.value)}
                              className="w-full text-sm text-[#111418] bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">All Roles</option>
                              <option value="Admin">Admin</option>
                              <option value="User">User</option>
                            </select>
                          </div>
                          {/* Date Range Filter */}
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                              Joined Date
                            </label>
                            <select
                              value={filters.dateRange}
                              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                              className="w-full text-sm text-[#111418] bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">All Time</option>
                              <option value="today">Today</option>
                              <option value="week">This Week</option>
                              <option value="month">This Month</option>
                              <option value="quarter">This Quarter</option>
                              <option value="year">This Year</option>
                            </select>
                          </div>
                        </div>
                        <div className="p-4 border-t border-gray-200 flex items-center justify-between gap-3">
                          <button
                            onClick={handleClearFilters}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-[#111418] hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            Clear
                          </button>
                          <button
                            onClick={handleApplyFilters}
                            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            Apply Filters
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setSortOpen(!sortOpen)}
                    className="flex items-center gap-2 text-sm font-medium text-[#111418] bg-white border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px] text-gray-500">sort</span>
                    <span>Sort: {getSortLabel(selectedSort)}</span>
                  </button>
                  {sortOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setSortOpen(false)}
                      />
                      <div className="absolute left-0 top-full mt-2 w-64 min-w-[240px] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                        <div className="p-4 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-[#111418] text-sm">Sort Users</h3>
                            <button
                              onClick={() => setSortOpen(false)}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded-md"
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
                                ? 'bg-primary/10 text-primary'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {selectedSort === 'newest' ? 'radio_button_checked' : 'radio_button_unchecked'}
                            </span>
                            <span>Newest First</span>
                          </button>
                          <button
                            onClick={() => handleSortChange('oldest')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              selectedSort === 'oldest'
                                ? 'bg-primary/10 text-primary'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {selectedSort === 'oldest' ? 'radio_button_checked' : 'radio_button_unchecked'}
                            </span>
                            <span>Oldest First</span>
                          </button>
                          <button
                            onClick={() => handleSortChange('name-asc')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              selectedSort === 'name-asc'
                                ? 'bg-primary/10 text-primary'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {selectedSort === 'name-asc' ? 'radio_button_checked' : 'radio_button_unchecked'}
                            </span>
                            <span>Name (A-Z)</span>
                          </button>
                          <button
                            onClick={() => handleSortChange('name-desc')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              selectedSort === 'name-desc'
                                ? 'bg-primary/10 text-primary'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {selectedSort === 'name-desc' ? 'radio_button_checked' : 'radio_button_unchecked'}
                            </span>
                            <span>Name (Z-A)</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="hidden sm:flex flex-1 justify-end text-gray-500 text-sm font-medium">
                Showing <span className="text-[#111418] mx-1 font-bold">{totalCount === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)}</span> of <span className="text-[#111418] ml-1 font-bold">{totalCount}</span>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 w-10" scope="col">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                          disabled={users.length === 0}
                          className="rounded border-gray-300 bg-white text-primary focus:ring-primary"
                          aria-label="Select all users"
                        />
                      </th>
                      <th className="px-6 py-4" scope="col">User</th>
                      <th className="px-6 py-4" scope="col">Role</th>
                      <th className="px-6 py-4" scope="col">Status</th>
                      <th className="px-6 py-4" scope="col">Joined Date</th>
                      <th className="px-6 py-4 text-right" scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {usersLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Đang tải...</td>
                      </tr>
                    ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(user.id)}
                            onChange={() => handleSelectOne(user.id)}
                            className="rounded border-gray-300 bg-white text-primary focus:ring-primary"
                            aria-label={`Select ${user.name}`}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="h-10 w-10 rounded-full bg-cover bg-center ring-1 ring-gray-200" 
                              style={{ backgroundImage: `url("${user.avatar}")` }}
                              alt={`Profile of ${user.name}`}
                            />
                            <div className="flex flex-col">
                              <span className="text-[#111418] font-semibold">{user.name}</span>
                              <span className="text-xs text-gray-500">{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`material-symbols-outlined text-[18px] ${user.role === 'Admin' ? 'text-primary' : 'text-gray-500'}`}>
                              {user.role === 'Admin' ? 'security' : 'person'}
                            </span>
                            <span className="text-[#111418] font-medium">{user.role}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${getStatusBadge(user.status)}`}>
                            <span className={`size-1.5 rounded-full ${getStatusDot(user.status)}`}></span>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium">{user.joinedDate}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button 
                              onClick={() => navigate(`/admin/users/${user.id}`)}
                              className="p-1.5 text-gray-500 hover:text-[#111418] hover:bg-gray-100 rounded-md transition-colors" 
                              title={t('admin.viewDetails')}
                            >
                              <span className="material-symbols-outlined text-[20px]">visibility</span>
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(user)}
                              className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" 
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
              <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    className="bg-white text-[#111418] text-sm rounded border border-gray-300 focus:ring-1 focus:ring-primary py-1 pl-2 pr-8"
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
                    className="flex size-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-[#111418] disabled:opacity-50 transition-colors shadow-sm"
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
                        <span key="ellipsis" className="text-gray-500 px-1">...</span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPage(p)}
                          className={`flex size-8 items-center justify-center rounded border text-sm font-medium shadow-sm transition-colors ${
                            p === page
                              ? 'border-primary bg-primary text-white'
                              : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-[#111418]'
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
                    className="flex size-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-[#111418] disabled:opacity-50 transition-colors shadow-sm"
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
          {isAdmin && (
            <>
              <Link
                to="/admin/dashboard"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-[#111418] font-medium transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined">dashboard</span>
                <span>Dashboard</span>
              </Link>
              <Link
                to="/admin/users"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-50 text-primary font-medium transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined fill-1">people</span>
                <span>Users</span>
              </Link>
              <Link
                to="/admin/logs"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-[#111418] font-medium transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined">description</span>
                <span>Logs</span>
              </Link>
              <div className="my-2 border-t border-gray-100" />
            </>
          )}
          <Link 
            to="/daily" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-[#111418] font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">today</span>
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

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && userToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/50 backdrop-blur-sm transition-all duration-300"
          onClick={handleDeleteCancel}
        >
          <div
            className="w-full max-w-md flex flex-col bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden animate-fadeInScale"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center justify-center size-12 rounded-full bg-red-100">
                  <span className="material-symbols-outlined text-red-600 text-3xl">warning</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#111418]">Xóa người dùng</h3>
                  <p className="text-sm text-gray-500 mt-1">Hành động này không thể hoàn tác</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-700">
                  Bạn có chắc chắn muốn xóa người dùng <span className="font-semibold text-[#111418]">{userToDelete.name}</span>?
                </p>
                <p className="text-xs text-gray-500 mt-2">{userToDelete.email}</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 border-t border-gray-200">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 rounded-lg text-gray-700 font-medium hover:bg-gray-200 transition-colors text-sm"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors text-sm"
              >
                Xóa người dùng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {exportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/50 backdrop-blur-sm transition-all duration-300"
          onClick={handleExportCancel}
        >
          <div
            className="w-full max-w-md flex flex-col bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden animate-fadeInScale"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center justify-center size-12 rounded-full bg-blue-100">
                  <span className="material-symbols-outlined text-primary text-3xl">download</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#111418]">Export Users</h3>
                  <p className="text-sm text-gray-500 mt-1">Choose export format</p>
                </div>
                <button
                  onClick={handleExportCancel}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-md"
                >
                  <span className="material-symbols-outlined text-[24px]">close</span>
                </button>
              </div>
              {exporting && (
                <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
                  <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                  <span>Exporting...</span>
                </div>
              )}
              <div className={`space-y-2 ${exporting ? 'pointer-events-none opacity-60' : ''}`}>
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => handleExport('CSV')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-primary transition-colors group disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center size-10 rounded-lg bg-blue-50 group-hover:bg-primary/10">
                    <span className="material-symbols-outlined text-blue-600 group-hover:text-primary">description</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-[#111418]">Export as CSV</p>
                    <p className="text-xs text-gray-500">Comma-separated values file</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                </button>
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => handleExport('Excel')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-primary transition-colors group disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center size-10 rounded-lg bg-green-50 group-hover:bg-primary/10">
                    <span className="material-symbols-outlined text-green-600 group-hover:text-primary">table_chart</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-[#111418]">Export as Excel</p>
                    <p className="text-xs text-gray-500">Microsoft Excel spreadsheet</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                </button>
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => handleExport('PDF')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-primary transition-colors group disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center size-10 rounded-lg bg-red-50 group-hover:bg-primary/10">
                    <span className="material-symbols-outlined text-red-600 group-hover:text-primary">picture_as_pdf</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-[#111418]">Export as PDF</p>
                    <p className="text-xs text-gray-500">Portable Document Format</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                </button>
              </div>
              {exportError && (
                <p className="mt-3 text-sm text-red-600" role="alert">{exportError}</p>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 border-t border-gray-200">
              <button
                type="button"
                onClick={handleExportCancel}
                className="px-4 py-2 rounded-lg text-gray-700 font-medium hover:bg-gray-200 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;

