import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { adminAPI } from '../services/api';

const mapUserFromApi = (u) => ({
  id: u.id,
  name: u.fullName ?? u.name,
  email: u.email,
  avatar: u.avatarUrl ?? u.avatar,
  role: (u.roles && u.roles[0]) ? u.roles[0] : 'User',
  status: u.emailConfirmed ? 'Active' : 'Pending',
  joinedDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
});

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState('newest');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    role: '',
    dateRange: ''
  });
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setUsersLoading(true);
        const data = await adminAPI.getUsers({ page: 1, pageSize: 50 });
        setUsers(Array.isArray(data) ? data.map(mapUserFromApi) : []);
      } catch (error) {
        console.error('Failed to load users:', error);
        setUsers([]);
      } finally {
        setUsersLoading(false);
      }
    };
    load();
  }, []);

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
        setUsers(users.filter(u => u.id !== userToDelete.id));
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
    setExportModalOpen(true);
  };

  const handleExportCancel = () => {
    setExportModalOpen(false);
  };

  const handleExport = (format) => {
    // In a real app, you would export data in the selected format
    console.log(`Exporting users as ${format}`);
    setExportModalOpen(false);
    // await exportUsers(format);
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
    // In a real app, you would apply filters here
    setFilterOpen(false);
  };

  const handleSortChange = (sortOption) => {
    setSelectedSort(sortOption);
    setSortOpen(false);
    // In a real app, you would apply sorting here
    // await sortUsers(sortOption);
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
          title="User Management"
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
              <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                <p className="text-gray-500 text-sm font-medium">Total Users</p>
                <div className="flex items-end gap-2">
                  <p className="text-[#111418] text-2xl font-bold leading-none">12,450</p>
                  <span className="text-emerald-600 bg-emerald-50 px-1.5 rounded text-xs font-bold mb-1">+5%</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                <p className="text-gray-500 text-sm font-medium">Active Users</p>
                <div className="flex items-end gap-2">
                  <p className="text-[#111418] text-2xl font-bold leading-none">11,200</p>
                  <span className="text-emerald-600 bg-emerald-50 px-1.5 rounded text-xs font-bold mb-1">+2%</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                <p className="text-gray-500 text-sm font-medium">Pending Approval</p>
                <div className="flex items-end gap-2">
                  <p className="text-[#111418] text-2xl font-bold leading-none">1,150</p>
                  <span className="text-orange-600 bg-orange-50 px-1.5 rounded text-xs font-bold mb-1">-10%</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                <p className="text-gray-500 text-sm font-medium">Banned Users</p>
                <div className="flex items-end gap-2">
                  <p className="text-[#111418] text-2xl font-bold leading-none">100</p>
                  <span className="text-gray-500 bg-gray-100 px-1.5 rounded text-xs font-bold mb-1">0%</span>
                </div>
              </div>
            </div>

            {/* Filter and Search Controls */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-white border border-gray-200 shadow-sm items-center">
              <div className="relative w-full sm:w-72 md:hidden">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[20px]">search</span>
                <input className="w-full bg-gray-50 text-[#111418] text-sm rounded-lg pl-10 pr-4 py-2 border-gray-200 focus:ring-2 focus:ring-primary focus:bg-white transition-all" placeholder="Search users..." type="text"/>
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
                      <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
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
                      <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
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
                Showing <span className="text-[#111418] mx-1 font-bold">1-10</span> of <span className="text-[#111418] ml-1 font-bold">12,450</span>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 w-10" scope="col">
                        <input className="rounded border-gray-300 bg-white text-primary focus:ring-primary" type="checkbox"/>
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
                          <input className="rounded border-gray-300 bg-white text-primary focus:ring-primary" type="checkbox"/>
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
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => navigate(`/admin/users/${user.id}`)}
                              className="p-1.5 text-gray-500 hover:text-[#111418] hover:bg-gray-100 rounded-md transition-colors" 
                              title="View Details"
                            >
                              <span className="material-symbols-outlined text-[20px]">visibility</span>
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(user)}
                              className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" 
                              title="Delete"
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
                  <select className="bg-white text-[#111418] text-sm rounded border border-gray-300 focus:ring-1 focus:ring-primary py-1 pl-2 pr-8">
                    <option>10</option>
                    <option>20</option>
                    <option>50</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex size-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-[#111418] disabled:opacity-50 transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>
                  <button className="flex size-8 items-center justify-center rounded border border-primary bg-primary text-white text-sm font-medium shadow-sm">1</button>
                  <button className="flex size-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-500 text-sm font-medium hover:bg-gray-50 hover:text-[#111418] transition-colors shadow-sm">2</button>
                  <button className="flex size-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-500 text-sm font-medium hover:bg-gray-50 hover:text-[#111418] transition-colors shadow-sm">3</button>
                  <span className="text-gray-500 px-1">...</span>
                  <button className="flex size-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-500 text-sm font-medium hover:bg-gray-50 hover:text-[#111418] transition-colors shadow-sm">12</button>
                  <button className="flex size-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-[#111418] transition-colors shadow-sm">
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
              <div className="space-y-2">
                <button
                  onClick={() => handleExport('CSV')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-primary transition-colors group"
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
                  onClick={() => handleExport('Excel')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-primary transition-colors group"
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
                  onClick={() => handleExport('PDF')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-primary transition-colors group"
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
            </div>
            <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 border-t border-gray-200">
              <button
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

