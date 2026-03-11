import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { adminAPI, getAvatarFullUrl } from '../services/api';
import { isStoredAdmin } from '../utils/auth';
import { formatDate } from '../utils/dateFormat';

const mapUserDetailFromApi = (u) => ({
  id: u.id,
  name: u.fullName ?? u.name,
  email: u.email,
  avatar: u.avatarUrl ?? u.avatar,
  role: (u.roles && u.roles[0]) ? u.roles[0] : 'User',
  status: u.emailConfirmed ? 'Active' : 'Pending',
  joinedDate: u.createdAt ? formatDate(u.createdAt) : '',
  phone: u.phone ?? '',
  location: u.location ?? '',
  timezone: u.timezone ?? '',
  language: u.language ?? '',
  lastActive: '',
  totalGoals: 0,
  completedGoals: 0,
  totalTasks: 0,
  completedTasks: 0,
  recentActivity: (u.recentActivity || []).map((a) => ({
    id: a.id,
    type: a.type,
    action: a.action,
    date: a.date ? formatDate(a.date) : '',
    entityType: a.entityType ?? null,
    entityId: a.entityId ?? null,
    entityTitle: a.entityTitle ?? null,
  })),
});

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const emptyDisplay = (value) => (value && String(value).trim() ? value : '—');

const LoadingSkeleton = () => (
  <div className="max-w-[1200px] w-full flex flex-col gap-8 animate-pulse">
    <div className="h-5 w-32 bg-gray-200 rounded" />
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col sm:flex-row gap-6">
      <div className="h-24 w-24 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-3">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-4 w-64 bg-gray-100 rounded" />
        <div className="h-5 w-32 bg-gray-100 rounded mt-4" />
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="h-4 w-20 bg-gray-100 rounded mb-3" />
          <div className="h-8 w-12 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-5 w-28 bg-gray-200 rounded mb-4" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

const AdminUserDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isAdmin = isStoredAdmin();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [saveMessage, setSaveMessage] = useState({ type: null, text: null });
  const [avatarError, setAvatarError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [resetPasswordNew, setResetPasswordNew] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [resetPasswordSubmitting, setResetPasswordSubmitting] = useState(false);

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
        setAvatarError(false);
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
    setSaveMessage({ type: null, text: null });
    setIsEditing(true);
    setEditedUser({ ...user });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedUser({ ...user });
    setSaveMessage({ type: null, text: null });
  };

  const isDirty = editedUser && user && (
    editedUser.name !== user.name ||
    (editedUser.phone ?? '') !== (user.phone ?? '') ||
    (editedUser.location ?? '') !== (user.location ?? '') ||
    (editedUser.timezone ?? '') !== (user.timezone ?? '') ||
    (editedUser.language ?? '') !== (user.language ?? '') ||
    editedUser.status !== user.status ||
    editedUser.role !== user.role
  );

  const handleSave = async () => {
    if (!isDirty) return;
    setSaveMessage({ type: null, text: null });
    setSaving(true);
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
      setUser({ ...editedUser });
      setIsEditing(false);
      setSaveMessage({ type: 'success', text: t('admin.changesSavedSuccess') });
    } catch (error) {
      console.error('Failed to update user:', error);
      setSaveMessage({ type: 'error', text: t('admin.saveFailedTryAgain') });
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setEditedUser(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const openResetPasswordModal = () => {
    setResetPasswordNew('');
    setResetPasswordConfirm('');
    setResetPasswordError('');
    setResetPasswordModalOpen(true);
  };

  const closeResetPasswordModal = () => {
    if (!resetPasswordSubmitting) {
      setResetPasswordModalOpen(false);
      setResetPasswordNew('');
      setResetPasswordConfirm('');
      setResetPasswordError('');
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setResetPasswordError('');
    const newP = resetPasswordNew.trim();
    const confirmP = resetPasswordConfirm.trim();
    if (!newP) {
      setResetPasswordError(t('admin.newPasswordRequired'));
      return;
    }
    if (newP.length < 6) {
      setResetPasswordError(t('admin.passwordMinLength'));
      return;
    }
    if (newP !== confirmP) {
      setResetPasswordError(t('admin.passwordsDoNotMatch'));
      return;
    }
    try {
      setResetPasswordSubmitting(true);
      const res = await adminAPI.resetUserPassword(user.id, { newPassword: newP });
      if (res?.success) {
        setSaveMessage({ type: 'success', text: t('admin.resetPasswordSuccess') });
        closeResetPasswordModal();
      } else {
        setResetPasswordError(res?.message || t('admin.saveFailedTryAgain'));
      }
    } catch (err) {
      const msg = err?.message || err?.data?.message || t('admin.saveFailedTryAgain');
      setResetPasswordError(msg);
    } finally {
      setResetPasswordSubmitting(false);
    }
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

  if (loading) {
    return (
      <div className="bg-[#f6f7f8] text-[#111418] font-display min-h-screen flex flex-row">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header title={t('admin.userDetails')} icon="person" notifications={[]} onNotificationsChange={() => {}} onToggleSidebar={() => {}} />
          <div className="flex-1 flex justify-center py-6 px-4 md:px-8 overflow-y-auto">
            <LoadingSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayUser = isEditing ? editedUser : user;
  const avatarUrl = getAvatarFullUrl(displayUser.avatar);
  const showAvatarFallback = !displayUser.avatar || avatarError;
  const lastActiveDisplay = user.lastActive && user.lastActive.trim() ? user.lastActive : null;

  return (
    <div className="bg-[#f6f7f8] text-[#111418] font-display overflow-x-hidden min-h-screen flex flex-row">
      {/* Sidebar - Desktop */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          title={user ? `${t('admin.userManagement')} / ${user.name}` : t('admin.userDetails')}
          icon="person"
          notifications={notifications}
          onNotificationsChange={setNotifications}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex justify-center py-6 px-4 md:px-8 overflow-y-auto">
          <div className="max-w-[1200px] flex-1 flex flex-col gap-8 w-full">
            {/* Back + Save message */}
            <div className="flex flex-col gap-3 self-start w-full">
              <button
                onClick={() => navigate('/admin/users')}
                className="flex items-center gap-2 text-gray-500 hover:text-[#111418] transition-colors text-sm font-medium min-h-[44px] touch-manipulation"
                aria-label="Back to user list"
              >
                <span className="material-symbols-outlined text-xl">arrow_back</span>
                <span>{t('admin.backToUsers')}</span>
              </button>
              {saveMessage.text && (
                <div
                  role="alert"
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium ${
                    saveMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    {saveMessage.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  {saveMessage.text}
                </div>
              )}
            </div>

            {/* User Header */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-6 bg-white p-6 sm:p-8 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex flex-col items-center gap-3 shrink-0">
                <div className="h-24 w-24 rounded-full ring-2 ring-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center">
                  {showAvatarFallback ? (
                    <span className="text-2xl font-semibold text-gray-500" aria-hidden="true">
                      {getInitials(displayUser.name)}
                    </span>
                  ) : (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={() => setAvatarError(true)}
                    />
                  )}
                </div>
                {isEditing && (
                  <button
                    type="button"
                    className="text-xs text-primary hover:text-blue-700 font-medium"
                    aria-label="Change photo (not implemented)"
                  >
                    {t('admin.changePhoto')}
                  </button>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editedUser.name}
                          onChange={(e) => handleFieldChange('name', e.target.value)}
                          className="w-full text-xl sm:text-2xl font-semibold text-[#111418] bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder={t('admin.fullName')}
                        />
                        <input
                          type="email"
                          value={editedUser.email}
                          readOnly
                          className="w-full text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 cursor-not-allowed"
                          aria-readonly="true"
                        />
                      </div>
                    ) : (
                      <div>
                        <h2 className="text-xl sm:text-2xl font-semibold text-[#111418] mb-1 truncate">{user.name}</h2>
                        <p className="text-gray-500 text-sm truncate">{user.email}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSave}
                          disabled={!isDirty || saving}
                          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[40px]"
                        >
                          {saving ? t('admin.saving') : t('admin.save')}
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={saving}
                          className="px-4 py-2 bg-white text-[#111418] text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors min-h-[40px]"
                        >
                          {t('common.cancel')}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={openResetPasswordModal}
                          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors touch-manipulation"
                          aria-label="Reset password for this user"
                        >
                          <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                          <span>{t('admin.resetPassword')}</span>
                        </button>
                        <button
                          onClick={handleEdit}
                          className="p-2.5 text-gray-400 hover:text-[#111418] hover:bg-gray-100 transition-colors rounded-lg touch-manipulation"
                          aria-label="Edit user"
                        >
                          <span className="material-symbols-outlined text-[22px]">edit</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`material-symbols-outlined text-[18px] ${displayUser.role === 'Admin' ? 'text-primary' : 'text-gray-500'}`} aria-hidden="true">
                      {displayUser.role === 'Admin' ? 'security' : 'person'}
                    </span>
                    <span className="text-[#111418] font-medium">{displayUser.role === 'Admin' ? t('admin.roleAdmin') : t('admin.roleUser')}</span>
                  </div>
                  <span className="text-gray-300" aria-hidden="true">·</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full pl-2 pr-2.5 py-0.5 text-xs font-medium border ${getStatusBadge(displayUser.status)}`}>
                    <span className={`size-1.5 rounded-full ${getStatusDot(displayUser.status)}`} aria-hidden="true" />
                    {displayUser.status === 'Active' ? t('admin.statusActive') : displayUser.status === 'Pending' ? t('admin.statusPending') : displayUser.status === 'Inactive' ? t('admin.statusInactive') : displayUser.status === 'Banned' ? t('admin.statusBanned') : displayUser.status}
                  </span>
                  <span className="text-gray-300" aria-hidden="true">·</span>
                  <span className="text-gray-500 text-sm">{t('admin.joined')} {displayUser.joinedDate}</span>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col gap-2 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm font-medium">{t('admin.totalGoals')}</span>
                  <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">flag</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-[#111418]">{user.totalGoals ?? '—'}</p>
                <p className="text-xs text-gray-400">{t('admin.completedCount', { count: user.completedGoals })}</p>
              </div>
              <div className="flex flex-col gap-2 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm font-medium">{t('admin.totalTasks')}</span>
                  <div className="bg-violet-50 text-violet-600 p-2 rounded-lg">
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">check_circle</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-[#111418]">{user.totalTasks ?? '—'}</p>
                <p className="text-xs text-gray-400">{t('admin.completedCount', { count: user.completedTasks })}</p>
              </div>
              <div className="flex flex-col gap-2 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm font-medium">{t('admin.completionRate')}</span>
                  <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg">
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">trending_up</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-[#111418]">
                  {user.totalTasks > 0 ? Math.round((user.completedTasks / user.totalTasks) * 100) : 0}%
                </p>
                <p className="text-xs text-gray-400">{t('admin.taskCompletion')}</p>
              </div>
              <div className="flex flex-col gap-2 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm font-medium">{t('admin.lastActive')}</span>
                  <div className="bg-amber-50 text-amber-600 p-2 rounded-lg">
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">schedule</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-[#111418]">
                  {lastActiveDisplay ? lastActiveDisplay.split(' ')[0] : '—'}
                </p>
                <p className="text-xs text-gray-400">
                  {lastActiveDisplay ? lastActiveDisplay.split(' ').slice(1).join(' ') : t('common.noData')}
                </p>
              </div>
            </div>

            {/* User Details and Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Details */}
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold text-[#111418] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[22px] text-gray-500">person</span>
                  {t('admin.userDetailsTitle')}
                </h3>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('admin.phone')}</label>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={editedUser.phone ?? ''}
                          onChange={(e) => handleFieldChange('phone', e.target.value)}
                          className="w-full text-sm text-[#111418] bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder={t('admin.optional')}
                        />
                      ) : (
                        <p className="text-sm text-[#111418]">{emptyDisplay(user.phone)}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('admin.location')}</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedUser.location ?? ''}
                          onChange={(e) => handleFieldChange('location', e.target.value)}
                          className="w-full text-sm text-[#111418] bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder={t('admin.optional')}
                        />
                      ) : (
                        <p className="text-sm text-[#111418]">{emptyDisplay(user.location)}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('admin.timezone')}</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedUser.timezone ?? ''}
                          onChange={(e) => handleFieldChange('timezone', e.target.value)}
                          className="w-full text-sm text-[#111418] bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder={t('admin.timezonePlaceholder')}
                        />
                      ) : (
                        <p className="text-sm text-[#111418]">{emptyDisplay(user.timezone)}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('admin.language')}</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedUser.language ?? ''}
                          onChange={(e) => handleFieldChange('language', e.target.value)}
                          className="w-full text-sm text-[#111418] bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder={t('admin.languagePlaceholder')}
                        />
                      ) : (
                        <p className="text-sm text-[#111418]">{emptyDisplay(user.language)}</p>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('admin.role')}</label>
                      {isEditing ? (
                        <select
                          value={editedUser.role}
                          onChange={(e) => handleFieldChange('role', e.target.value)}
                          className="w-full max-w-xs text-sm text-[#111418] bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          <option value="User">{t('admin.roleUser')}</option>
                          <option value="Admin">{t('admin.roleAdmin')}</option>
                        </select>
                      ) : (
                        <p className="text-sm text-[#111418]">{user.role === 'Admin' ? t('admin.roleAdmin') : t('admin.roleUser')}</p>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('admin.status')}</label>
                      {isEditing ? (
                        <select
                          value={editedUser.status}
                          onChange={(e) => handleFieldChange('status', e.target.value)}
                          className="w-full max-w-xs text-sm text-[#111418] bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          <option value="Active">{t('admin.statusActive')}</option>
                          <option value="Pending">{t('admin.statusPending')}</option>
                          <option value="Inactive">{t('admin.statusInactive')}</option>
                          <option value="Banned">{t('admin.statusBanned')}</option>
                        </select>
                      ) : (
                        <p className="text-sm text-[#111418]">{user.status === 'Active' ? t('admin.statusActive') : user.status === 'Pending' ? t('admin.statusPending') : user.status === 'Inactive' ? t('admin.statusInactive') : user.status === 'Banned' ? t('admin.statusBanned') : user.status}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold text-[#111418] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[22px] text-gray-500">history</span>
                  {t('admin.recentActivity')}
                </h3>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-h-[200px]">
                  {user.recentActivity && user.recentActivity.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {user.recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                          <div className="bg-blue-50 text-blue-600 p-2 rounded-lg shrink-0">
                            <span className="material-symbols-outlined text-lg" aria-hidden="true">{getActivityIcon(activity.type)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-[#111418] min-w-0">{activity.action?.startsWith('admin.activity.') ? t(activity.action) : activity.action}</p>
                              <span className="text-xs text-gray-500 shrink-0">{activity.date}</span>
                            </div>
                            {activity.entityTitle && (
                              <p className="text-xs text-gray-600 mt-0.5 truncate" title={activity.entityTitle}>
                                {activity.entityTitle}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <span className="material-symbols-outlined text-4xl text-gray-300 mb-2" aria-hidden="true">history</span>
                      <p className="text-sm text-gray-500">{t('admin.noActivityYet')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Password Modal */}
      {resetPasswordModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={closeResetPasswordModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-password-title"
        >
          <div
            className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4">
              <h3 id="reset-password-title" className="text-lg font-semibold text-[#111418] flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600">lock_reset</span>
                {t('admin.resetPasswordTitle')}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{t('admin.resetPasswordDesc', { name: user?.name ?? user?.email })}</p>
            </div>
            <form onSubmit={handleResetPasswordSubmit} className="px-6 pb-6 space-y-4">
              {resetPasswordError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200" role="alert">
                  <span className="material-symbols-outlined text-lg shrink-0">error</span>
                  {resetPasswordError}
                </div>
              )}
              <div>
                <label htmlFor="reset-new-password" className="block text-sm font-medium text-gray-700 mb-1">{t('admin.newPassword')}</label>
                <input
                  id="reset-new-password"
                  type="password"
                  value={resetPasswordNew}
                  onChange={(e) => setResetPasswordNew(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder={t('admin.newPasswordPlaceholder')}
                  autoComplete="new-password"
                  disabled={resetPasswordSubmitting}
                />
              </div>
              <div>
                <label htmlFor="reset-confirm-password" className="block text-sm font-medium text-gray-700 mb-1">{t('admin.confirmPassword')}</label>
                <input
                  id="reset-confirm-password"
                  type="password"
                  value={resetPasswordConfirm}
                  onChange={(e) => setResetPasswordConfirm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder={t('admin.confirmPasswordPlaceholder')}
                  autoComplete="new-password"
                  disabled={resetPasswordSubmitting}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={resetPasswordSubmitting}
                  className="flex-1 px-4 py-2.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {resetPasswordSubmitting ? t('admin.resetting') : t('admin.resetPasswordButton')}
                </button>
                <button
                  type="button"
                  onClick={closeResetPasswordModal}
                  disabled={resetPasswordSubmitting}
                  className="px-4 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {t('common.cancel')}
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
            type="button"
            className="ml-auto p-2 rounded-lg text-gray-600 hover:bg-gray-100 touch-manipulation"
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
                <span>{t('sidebar.dashboard')}</span>
              </Link>
              <Link
                to="/admin/users"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-50 text-primary font-medium transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined fill-1">people</span>
                <span>{t('sidebar.users')}</span>
              </Link>
              <Link
                to="/admin/logs"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-[#111418] font-medium transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined">description</span>
                <span>{t('sidebar.logs')}</span>
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
            <span>{t('sidebar.dailyPlan')}</span>
          </Link>
          <Link 
            to="/goals" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-[#111418] font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">target</span>
            <span>{t('sidebar.goals')}</span>
          </Link>
          <Link 
            to="/calendar" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-[#111418] font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">calendar_month</span>
            <span>{t('sidebar.calendar')}</span>
          </Link>
          <Link 
            to="/settings" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-[#111418] font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">settings</span>
            <span>{t('sidebar.settings')}</span>
          </Link>
          <div className="mt-auto border-t border-gray-100 pt-4">
            <button 
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-[#111418] font-medium transition-colors w-full"
              onClick={() => {
                window.location.href = '/login';
              }}
            >
              <span className="material-symbols-outlined">logout</span>
              <span>{t('sidebar.logout')}</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default AdminUserDetailPage;

