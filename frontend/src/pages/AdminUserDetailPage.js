import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { adminAPI } from '../services/api';

const mapUserDetailFromApi = (u) => ({
  id: u.id,
  name: u.fullName ?? u.name,
  email: u.email,
  avatar: u.avatarUrl ?? u.avatar,
  role: (u.roles && u.roles[0]) ? u.roles[0] : 'User',
  status: u.emailConfirmed ? 'Active' : 'Pending',
  joinedDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
  phone: u.phone ?? '',
  location: u.location ?? '',
  timezone: u.timezone ?? '',
  language: u.language ?? '',
  lastActive: '',
  totalGoals: 0,
  completedGoals: 0,
  totalTasks: 0,
  completedTasks: 0,
  recentActivity: [],
});

const AdminUserDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) {
        navigate('/admin/users');
        return;
      }
      try {
        setLoading(true);
        const data = await adminAPI.getUser(id);
        if (cancelled) return;
        const mapped = mapUserDetailFromApi(data);
        setUser(mapped);
        setEditedUser({ ...mapped });
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load user:', error);
          navigate('/admin/users');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id, navigate]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedUser({ ...user });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedUser({ ...user });
  };

  const handleSave = async () => {
    try {
      await adminAPI.updateUser(user.id, {
        fullName: editedUser.name,
        phone: editedUser.phone || undefined,
        location: editedUser.location || undefined,
        timezone: editedUser.timezone || undefined,
        language: editedUser.language || undefined,
        emailConfirmed: editedUser.status === 'Active',
        roles: editedUser.role ? [editedUser.role] : undefined,
      });
      setUser(editedUser);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleFieldChange = (field, value) => {
    setEditedUser(prev => ({
      ...prev,
      [field]: value
    }));
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

  const getActivityIcon = (type) => {
    switch (type) {
      case 'goal':
        return 'flag';
      case 'task':
        return 'check_circle';
      case 'settings':
        return 'settings';
      case 'account':
        return 'person_add';
      case 'login':
        return 'login';
      case 'ban':
        return 'block';
      default:
        return 'info';
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Đang tải...</p>
      </div>
    );
  }

  const displayUser = isEditing ? editedUser : user;

  return (
    <div className="bg-[#f6f7f8] text-[#111418] font-display overflow-x-hidden min-h-screen flex flex-row">
      {/* Sidebar - Desktop */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          title={user ? `User Management / ${user.name}` : "User Details"}
          icon="person"
          notifications={notifications}
          onNotificationsChange={setNotifications}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex justify-center py-6 px-4 md:px-8 overflow-y-auto">
          <div className="max-w-[1200px] flex-1 flex flex-col gap-8 w-full">
            {/* Back Button */}
            <button
              onClick={() => navigate('/admin/users')}
              className="flex items-center gap-2 text-gray-500 hover:text-[#111418] transition-colors text-sm font-medium self-start"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              <span>Quay lại danh sách người dùng</span>
            </button>

            {/* User Header */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-6 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex flex-col items-center gap-3 shrink-0">
                <div 
                  className="h-24 w-24 rounded-full bg-cover bg-center ring-2 ring-gray-200" 
                  style={{ backgroundImage: `url("${displayUser.avatar}")` }}
                  alt={`Profile of ${displayUser.name}`}
                />
                {isEditing && (
                  <button className="text-xs text-primary hover:text-blue-700 font-medium">
                    Change Photo
                  </button>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editedUser.name}
                          onChange={(e) => handleFieldChange('name', e.target.value)}
                          className="w-full text-2xl font-semibold text-[#111418] bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <input
                          type="email"
                          value={editedUser.email}
                          readOnly
                          className="w-full text-sm text-gray-500 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 cursor-not-allowed"
                          placeholder="Email"
                        />
                      </div>
                    ) : (
                      <div>
                        <h2 className="text-2xl font-semibold text-[#111418] mb-1">{user.name}</h2>
                        <p className="text-gray-500 text-sm">{user.email}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSave}
                          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          Lưu
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 bg-white text-[#111418] text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                        >
                          Hủy
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleEdit}
                        className="p-2 text-gray-400 hover:text-[#111418] transition-colors rounded-full hover:bg-gray-100"
                        aria-label="Edit user"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`material-symbols-outlined text-[18px] ${displayUser.role === 'Admin' ? 'text-primary' : 'text-gray-500'}`}>
                      {displayUser.role === 'Admin' ? 'security' : 'person'}
                    </span>
                    <span className="text-[#111418] font-medium">{displayUser.role}</span>
                  </div>
                  <span className="text-gray-300">•</span>
                  <div className="relative inline-flex items-center">
                    <span className={`size-1.5 rounded-full ${getStatusDot(user.status)} absolute left-2.5`}></span>
                    <select
                      value={user.status}
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        setUser({ ...user, status: newStatus });
                        // In a real app, you would save to API here
                        // await updateUserStatus(user.id, newStatus);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-full pl-6 pr-8 py-0.5 text-xs font-medium border cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary appearance-none ${getStatusBadge(user.status)}`}
                    >
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Banned">Banned</option>
                    </select>
                    <span className="material-symbols-outlined text-[14px] absolute right-1.5 pointer-events-none text-gray-500">arrow_drop_down</span>
                  </div>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-500 text-sm">Joined: {displayUser.joinedDate}</span>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col gap-2 p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm font-medium">Total Goals</span>
                  <div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-[20px]">flag</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-[#111418]">{user.totalGoals}</p>
                <p className="text-xs text-gray-400">{user.completedGoals} completed</p>
              </div>
              <div className="flex flex-col gap-2 p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm font-medium">Total Tasks</span>
                  <div className="bg-violet-50 text-violet-600 p-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-[#111418]">{user.totalTasks}</p>
                <p className="text-xs text-gray-400">{user.completedTasks} completed</p>
              </div>
              <div className="flex flex-col gap-2 p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm font-medium">Completion Rate</span>
                  <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-[20px]">trending_up</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-[#111418]">
                  {user.totalTasks > 0 ? Math.round((user.completedTasks / user.totalTasks) * 100) : 0}%
                </p>
                <p className="text-xs text-gray-400">Task completion</p>
              </div>
              <div className="flex flex-col gap-2 p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm font-medium">Last Active</span>
                  <div className="bg-amber-50 text-amber-600 p-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-[20px]">schedule</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-[#111418]">{user.lastActive.split(' ')[0]}</p>
                <p className="text-xs text-gray-400">{user.lastActive.split(' ').slice(1).join(' ')}</p>
              </div>
            </div>

            {/* User Details and Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Details */}
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-medium text-[#111418]">User Details</h3>
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</label>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={editedUser.phone}
                          onChange={(e) => handleFieldChange('phone', e.target.value)}
                          className="w-full mt-1 text-sm text-[#111418] bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      ) : (
                        <p className="text-sm text-[#111418] mt-1">{user.phone}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedUser.location}
                          onChange={(e) => handleFieldChange('location', e.target.value)}
                          className="w-full mt-1 text-sm text-[#111418] bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      ) : (
                        <p className="text-sm text-[#111418] mt-1">{user.location}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</label>
                      {isEditing ? (
                        <select
                          value={editedUser.role}
                          onChange={(e) => handleFieldChange('role', e.target.value)}
                          className="w-full mt-1 text-sm text-[#111418] bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="User">User</option>
                          <option value="Admin">Admin</option>
                        </select>
                      ) : (
                        <p className="text-sm text-[#111418] mt-1">{user.role}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</label>
                      {isEditing ? (
                        <select
                          value={editedUser.status}
                          onChange={(e) => handleFieldChange('status', e.target.value)}
                          className="w-full mt-1 text-sm text-[#111418] bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="Active">Active</option>
                          <option value="Pending">Pending</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Banned">Banned</option>
                        </select>
                      ) : (
                        <p className="text-sm text-[#111418] mt-1">{user.status}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-medium text-[#111418]">Recent Activity</h3>
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex flex-col gap-3">
                    {user.recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                          <span className="material-symbols-outlined text-lg">{getActivityIcon(activity.type)}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#111418]">{activity.action}</p>
                          <p className="text-xs text-gray-500 mt-1">{activity.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
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
    </div>
  );
};

export default AdminUserDetailPage;

