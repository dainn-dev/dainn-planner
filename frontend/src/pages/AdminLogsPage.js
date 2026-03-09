import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { isStoredAdmin } from '../utils/auth';
import { adminAPI } from '../services/api';

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getLogDateLocale = (language) => (language === 'vi' ? 'vi-VN' : 'en-GB');

const formatLogDate = (dateUtc, language = 'vi') => {
  const d = new Date(dateUtc);
  return d.toLocaleDateString(getLogDateLocale(language), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const AdminLogsPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isAdmin = isStoredAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [logFiles, setLogFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'system',
      title: 'System Alert',
      message: 'New log file generated',
      time: '5 phút trước',
      unread: true,
      icon: 'description',
      iconBg: 'bg-blue-100',
      iconColor: 'text-primary'
    }
  ]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await adminAPI.getLogFiles();
      setLogFiles(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.message || t('admin.loadLogsFail'));
      setLogFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const getLevelBadge = (level) => {
    switch (level) {
      case 'Error':
        return {
          bg: 'bg-red-50 dark:bg-red-900/30',
          text: 'text-red-700 dark:text-red-300',
          border: 'border-red-100 dark:border-red-900/50',
          dot: 'bg-red-500'
        };
      case 'Warning':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/30',
          text: 'text-yellow-700 dark:text-yellow-300',
          border: 'border-yellow-100 dark:border-yellow-900/50',
          dot: 'bg-yellow-500'
        };
      case 'Info':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/30',
          text: 'text-blue-700 dark:text-blue-300',
          border: 'border-blue-100 dark:border-blue-900/50',
          dot: 'bg-blue-500'
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-900/30',
          text: 'text-gray-700 dark:text-gray-300',
          border: 'border-gray-100 dark:border-gray-900/50',
          dot: 'bg-gray-500'
        };
    }
  };

  const filteredLogs = logFiles.filter(log => {
    const matchesSearch = log.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalSizeBytes = logFiles.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);

  const handleRefresh = () => {
    loadLogs();
  };

  const handleExport = () => {
    if (logFiles.length === 0) return;
    const lines = logFiles.map(f => `${f.name},${formatSize(f.sizeBytes || 0)},${formatLogDate(f.lastWriteUtc, i18n.language)}`).join('\n');
    const blob = new Blob([`${t('admin.logsCsvHeader')}\n${lines}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'log_files_report.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleViewLog = (log) => {
    if (log?.name) {
      navigate(`/admin/logs/${encodeURIComponent(log.name)}`);
    }
  };

  const handleDownloadLog = async (log) => {
    if (!log?.name) return;
    try {
      const res = await adminAPI.getLogContent(log.name, { tail: 50000 });
      const data = res?.data;
      if (!data?.lines?.length) {
        const blob = new Blob([''], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = log.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
      const text = data.lines.map(l => (l.level ? `[${l.level}] ${l.text}` : l.text)).join('\n');
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = log.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.message || t('admin.downloadFail'));
    }
  };

  const handleDeleteLog = () => {
    // Backend does not support delete; keep as no-op or show message
  };

  return (
    <div className="bg-[#f6f7f8] dark:bg-[#101922] text-[#0d141b] dark:text-white font-display overflow-x-hidden min-h-screen flex flex-row">
      {/* Sidebar - Desktop */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={t('admin.logFilesManagement')}
          icon="description"
          notifications={notifications}
          onNotificationsChange={setNotifications}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex justify-center py-6 px-4 md:px-8 overflow-y-auto">
          <div className="max-w-[1200px] flex-1 flex flex-col gap-6 w-full">
            {/* Breadcrumb */}
            <div className="flex flex-wrap gap-2 text-sm">
              <Link to="/admin/dashboard" className="text-gray-500 dark:text-slate-400 font-medium hover:text-primary transition-colors">
                {t('admin.admin')}
              </Link>
              <span className="text-gray-500 dark:text-slate-400 font-medium">/</span>
              <span className="text-[#0d141b] dark:text-white font-semibold">{t('admin.logFiles')}</span>
            </div>

            {/* Page Heading */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
              <div className="flex flex-col gap-2">
                <h1 className="text-[#0d141b] dark:text-white text-3xl font-black leading-tight tracking-tight">{t('admin.logsPageTitle')}</h1>
                <p className="text-[#4c739a] dark:text-slate-400 text-base font-normal">{t('admin.logsPageSubtitle')}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleRefresh}
                  className="flex items-center gap-2 bg-white dark:bg-[#15202b] border border-[#cfdbe7] dark:border-slate-700 text-[#0d141b] dark:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">refresh</span>
                  {t('admin.refresh')}
                </button>
                <button 
                  onClick={handleExport}
                  className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200 dark:shadow-none"
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                  {t('admin.exportReport')}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Total Files Card */}
              <div className="flex flex-col gap-2 rounded-xl bg-white dark:bg-[#15202b] p-6 border border-[#cfdbe7] dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-start">
                  <p className="text-[#4c739a] dark:text-slate-400 text-sm font-medium uppercase tracking-wider">{t('admin.totalFiles')}</p>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-primary">
                    <span className="material-symbols-outlined text-[24px]">folder_open</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-[#0d141b] dark:text-white text-3xl font-bold leading-tight">{loading ? '–' : logFiles.length}</p>
                </div>
              </div>

              {/* Storage Capacity Card */}
              <div className="flex flex-col gap-2 rounded-xl bg-white dark:bg-[#15202b] p-6 border border-[#cfdbe7] dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-start">
                  <p className="text-[#4c739a] dark:text-slate-400 text-sm font-medium uppercase tracking-wider">{t('admin.storageCapacity')}</p>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg text-purple-600 dark:text-purple-400">
                    <span className="material-symbols-outlined text-[24px]">hard_drive</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-[#0d141b] dark:text-white text-3xl font-bold leading-tight">{loading ? '–' : formatSize(totalSizeBytes)}</p>
                </div>
              </div>

              {/* Errors Detected Card - placeholder */}
              <div className="flex flex-col gap-2 rounded-xl bg-white dark:bg-[#15202b] p-6 border border-[#cfdbe7] dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-start">
                  <p className="text-[#4c739a] dark:text-slate-400 text-sm font-medium uppercase tracking-wider">{t('admin.errorsDetected24h')}</p>
                  <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg text-red-600 dark:text-red-400">
                    <span className="material-symbols-outlined text-[24px]">bug_report</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-[#0d141b] dark:text-white text-3xl font-bold leading-tight">–</p>
                  <p className="text-[#4c739a] dark:text-slate-500 text-sm">{t('admin.viewInFile')}</p>
                </div>
              </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white dark:bg-[#15202b] p-4 rounded-xl border border-[#cfdbe7] dark:border-slate-700 shadow-sm">
              {/* Search */}
              <div className="relative w-full lg:max-w-md">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#4c739a] dark:text-slate-400">
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </div>
                <input 
                  className="block w-full p-2.5 pl-10 text-sm text-[#0d141b] dark:text-white border border-transparent bg-[#f0f4f8] dark:bg-slate-800 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-[#94a3b8] dark:placeholder:text-slate-500 transition-all" 
                  placeholder={t('admin.searchLogsPlaceholder')} 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {/* Filters */}
              <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                <button className="whitespace-nowrap flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#e7edf3] dark:bg-slate-700 dark:text-white px-4 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  <span className="text-sm font-medium">{t('admin.filterTime')}</span>
                  <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                </button>
                <div className="h-9 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>
                <button 
                  onClick={() => setSelectedFilter('all')}
                  className={`whitespace-nowrap flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 shadow-sm shadow-blue-200 dark:shadow-none transition-colors ${
                    selectedFilter === 'all' 
                      ? 'bg-primary text-white' 
                      : 'border border-[#cfdbe7] dark:border-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="text-sm font-medium">{t('admin.filterAll')}</span>
                </button>
                <button 
                  onClick={() => setSelectedFilter('error')}
                  className={`whitespace-nowrap flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 transition-colors ${
                    selectedFilter === 'error' 
                      ? 'bg-primary text-white shadow-sm shadow-blue-200 dark:shadow-none' 
                      : 'border border-[#cfdbe7] dark:border-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="text-sm font-medium">{t('admin.filterError')}</span>
                </button>
                <button 
                  onClick={() => setSelectedFilter('warning')}
                  className={`whitespace-nowrap flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 transition-colors ${
                    selectedFilter === 'warning' 
                      ? 'bg-primary text-white shadow-sm shadow-blue-200 dark:shadow-none' 
                      : 'border border-[#cfdbe7] dark:border-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="text-sm font-medium">{t('admin.filterWarning')}</span>
                </button>
              </div>
            </div>

            {/* Data Table */}
            <div className="w-full overflow-hidden rounded-xl border border-[#cfdbe7] dark:border-slate-700 shadow-sm bg-white dark:bg-[#15202b]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-[#0d141b] dark:text-slate-200">
                  <thead className="bg-slate-50 dark:bg-[#1e2a35] text-xs uppercase font-semibold text-[#4c739a] dark:text-slate-400">
                    <tr>
                      <th className="px-6 py-4" scope="col">{t('admin.tableFileName')}</th>
                      <th className="px-6 py-4" scope="col">{t('admin.tableCreated')}</th>
                      <th className="px-6 py-4" scope="col">{t('admin.tableLevel')}</th>
                      <th className="px-6 py-4" scope="col">{t('admin.tableSize')}</th>
                      <th className="px-6 py-4 text-right" scope="col">{t('admin.tableActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-[#4c739a] dark:text-slate-400">
                          {t('common.loading')}
                        </td>
                      </tr>
                    ) : filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-[#4c739a] dark:text-slate-400">
                          {t('admin.noLogFiles')}
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => {
                        const badge = getLevelBadge('Info');
                        return (
                          <tr key={log.name} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-[#0d141b] dark:text-white flex items-center gap-3">
                              <span className="material-symbols-outlined text-slate-400">description</span>
                              {log.name}
                            </td>
                            <td className="px-6 py-4 text-[#4c739a] dark:text-slate-400">
                              {formatLogDate(log.lastWriteUtc, i18n.language)}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 rounded-full ${badge.bg} px-2.5 py-1 text-xs font-semibold ${badge.text} border ${badge.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                                {t('admin.levelInfo')}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-[#4c739a] dark:text-slate-400 font-mono text-xs">
                              {formatSize(log.sizeBytes || 0)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleViewLog(log)}
                                  className="p-2 rounded-lg text-slate-500 hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" 
                                  title={t('admin.viewDetails')}
                                >
                                  <span className="material-symbols-outlined text-[20px]">visibility</span>
                                </button>
                                <button 
                                  onClick={() => handleDownloadLog(log)}
                                  className="p-2 rounded-lg text-slate-500 hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" 
                                  title={t('admin.download')}
                                >
                                  <span className="material-symbols-outlined text-[20px]">download</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-[#cfdbe7] dark:border-slate-700 bg-white dark:bg-[#15202b] px-4 py-3 sm:px-6">
                <p className="text-sm text-[#4c739a] dark:text-slate-400">
                  {t('admin.showingFiles', { count: filteredLogs.length, total: logFiles.length })}
                </p>
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
                <span>{t('admin.dashboard')}</span>
              </Link>
              <Link
                to="/admin/users"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-[#111418] font-medium transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined">people</span>
                <span>{t('admin.users')}</span>
              </Link>
              <Link
                to="/admin/logs"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-50 text-primary font-medium transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined fill-1">description</span>
                <span>{t('admin.logs')}</span>
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
              <span>{t('auth.logout')}</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default AdminLogsPage;
