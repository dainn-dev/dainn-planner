import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { adminAPI, tasksAPI } from '../services/api';
import LogoutButton from '../components/LogoutButton';
import { TAG_I18N_KEYS } from '../constants/tasks';
import { isStoredAdmin } from '../utils/auth';
import { formatDate } from '../utils/dateFormat';

const DAYS_OPTIONS = [7, 30, 90];

const getTagLabel = (tag, t) => {
  const key = TAG_I18N_KEYS[tag];
  return key ? t(`daily.${key}`) : tag;
};

const TAG_BAR_COLORS = ['bg-primary', 'bg-sky-400', 'bg-indigo-400', 'bg-amber-400', 'bg-emerald-400', 'bg-gray-400'];

const AdminDashboardPage = () => {
  const { t } = useTranslation();
  const isAdmin = isStoredAdmin();
  const [, setSettingsVersion] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [tagsWithUsage, setTagsWithUsage] = useState(null);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [userGrowth, setUserGrowth] = useState(null);
  const [userGrowthLoading, setUserGrowthLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState(30);
  const [daysFilterOpen, setDaysFilterOpen] = useState(false);
  const daysFilterRef = useRef(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await adminAPI.getStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to load admin stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      setUserGrowthLoading(true);
      try {
        const data = await adminAPI.getUserGrowth({ days: daysFilter });
        setUserGrowth(data);
      } catch (error) {
        console.error('Failed to load user growth:', error);
      } finally {
        setUserGrowthLoading(false);
      }
    };
    load();
  }, [daysFilter]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (daysFilterRef.current && !daysFilterRef.current.contains(e.target)) setDaysFilterOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await tasksAPI.getTagsWithUsage();
        setTagsWithUsage(data);
      } catch (error) {
        console.error('Failed to load task tags:', error);
      } finally {
        setTagsLoading(false);
      }
    };
    load();
  }, []);

  // Re-render when user updates date/time format in Settings so chart labels use new format
  useEffect(() => {
    const onSettingsUpdated = () => setSettingsVersion((v) => v + 1);
    window.addEventListener('userSettingsUpdated', onSettingsUpdated);
    return () => window.removeEventListener('userSettingsUpdated', onSettingsUpdated);
  }, []);

  return (
    <div className="bg-background-light dark:bg-[#101922] text-[#111418] dark:text-slate-100 font-display overflow-x-hidden min-h-screen flex flex-row">
      {/* Sidebar - Desktop */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          title={t('admin.dashboardOverview')}
          icon="dashboard"          
          notifications={notifications}
          onNotificationsChange={setNotifications}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex justify-center py-6 px-4 md:px-8 overflow-y-auto">
          <div className="max-w-7xl flex-1 flex flex-col gap-8 w-full">
            {/* Breadcrumb */}
            <div className="flex flex-wrap gap-2 text-sm">
              <Link to="/admin/dashboard" className="text-gray-500 dark:text-slate-400 font-medium hover:text-primary dark:hover:text-blue-300 transition-colors">
                {t('admin.admin')}
              </Link>
              <span className="text-gray-500 dark:text-slate-400 font-medium">/</span>
              <span className="text-[#111418] dark:text-white font-semibold">{t('admin.dashboardBreadcrumb')}</span>
            </div>
            {/* Page Heading */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-[#111418] dark:text-white text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-[-0.033em]">{t('admin.dashboardOverview')}</h1>
                <p className="text-gray-500 dark:text-slate-400">{t('admin.welcomeBack')}</p>
              </div>
              <div className="relative shrink-0" ref={daysFilterRef}>
                <button
                  type="button"
                  onClick={() => setDaysFilterOpen((o) => !o)}
                  className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-md border border-gray-200 dark:border-slate-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                  <span>{daysFilter === 7 ? t('admin.last7Days') : daysFilter === 90 ? t('admin.last90Days') : t('admin.last30Days')}</span>
                  <span className="material-symbols-outlined text-[16px]">expand_more</span>
                </button>
                {daysFilterOpen && (
                  <div className="absolute right-0 top-full mt-1 z-20 min-w-[140px] py-1 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-lg">
                    {DAYS_OPTIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => { setDaysFilter(d); setDaysFilterOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${daysFilter === d ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-300' : 'text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                      >
                        {d === 7 ? t('admin.last7Days') : d === 90 ? t('admin.last90Days') : t('admin.last30Days')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stats Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1 - Total Users */}
              <div className="flex flex-col gap-1 sm:gap-2 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm font-medium">{t('admin.totalUsers')}</p>
                <div className="flex items-end gap-2">
                  <p className="text-[#111418] dark:text-white text-lg sm:text-xl md:text-2xl font-bold leading-none">
                    {statsLoading ? '—' : (stats?.totalUsers ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Card 2 - Active Users Today */}
              <div className="flex flex-col gap-1 sm:gap-2 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm font-medium">{t('admin.activeUsers')}</p>
                <div className="flex items-end gap-2">
                  <p className="text-[#111418] dark:text-white text-lg sm:text-xl md:text-2xl font-bold leading-none">
                    {statsLoading ? '—' : (stats?.activeUsers ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Card 3 - Goals Created */}
              <div className="flex flex-col gap-1 sm:gap-2 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm font-medium">{t('admin.goalsCreated')}</p>
                <div className="flex items-end gap-2">
                  <p className="text-[#111418] dark:text-white text-lg sm:text-xl md:text-2xl font-bold leading-none">
                    {statsLoading ? '—' : (stats?.totalGoals ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Card 4 - Total Events */}
              <div className="flex flex-col gap-1 sm:gap-2 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm font-medium">{t('admin.totalEvents')}</p>
                <div className="flex items-end gap-2">
                  <p className="text-[#111418] dark:text-white text-lg sm:text-xl md:text-2xl font-bold leading-none">
                    {statsLoading ? '—' : (stats?.totalEvents ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Line Chart - User Growth */}
              <div className="lg:col-span-2 rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-[#111418] dark:text-white">{t('admin.userGrowth')}</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {userGrowthLoading ? t('common.loading') : t('admin.newSignups')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-400">
                      <span className="material-symbols-outlined text-[20px]">more_vert</span>
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-[240px] w-full relative">
                  {userGrowthLoading ? (
                    <div className="flex items-center justify-center h-[240px] text-sm text-gray-500 dark:text-slate-400">{t('admin.loadingChart')}</div>
                  ) : !userGrowth?.dataPoints?.length ? (
                    <div className="flex items-center justify-center h-[240px] text-sm text-gray-500 dark:text-slate-400">{t('admin.noSignupData')}</div>
                  ) : (() => {
                    const points = userGrowth.dataPoints;
                    const n = points.length;
                    const maxCount = Math.max(1, ...points.map((p) => p.count));
                    const x = (i) => (n <= 1 ? 0 : (i / (n - 1)) * 800);
                    const y = (count) => 240 - (count / maxCount) * 240;
                    const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)},${y(p.count)}`).join(' ');
                    const areaD = lineD + ` L ${x(n - 1)},240 L 0,240 Z`;
                    const labelDates = n >= 3
                      ? [points[0].date, points[Math.floor(n / 2)].date, points[n - 1].date]
                      : points.map((p) => p.date);
                    return (
                      <>
                        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 800 240">
                          <line stroke="#e2e8f0" strokeWidth="1" x1="0" x2="800" y1="240" y2="240" />
                          <line stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="800" y1="180" y2="180" />
                          <line stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="800" y1="120" y2="120" />
                          <line stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="800" y1="60" y2="60" />
                          <path d={areaD} fill="url(#userGrowthGradient)" opacity="0.1" />
                          <path d={lineD} fill="none" stroke="#137fec" strokeLinecap="round" strokeWidth="3" />
                          <defs>
                            <linearGradient id="userGrowthGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                              <stop offset="0%" style={{ stopColor: '#137fec', stopOpacity: 1 }} />
                              <stop offset="100%" style={{ stopColor: '#137fec', stopOpacity: 0 }} />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="flex justify-between mt-4 text-xs text-gray-400 dark:text-slate-500 font-medium">
                          {labelDates.map((d) => (
                            <span key={d}>{formatDate(d) || d}</span>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Side Bar Chart - Task tags usage */}
              <div className="rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-[#111418] dark:text-white">{t('admin.taskTags')}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {tagsLoading ? t('common.loading') : tagsWithUsage ? t('admin.usageAcross', { count: tagsWithUsage.totalTasks ?? 0 }) : t('admin.distributionByTag')}
                  </p>
                </div>
                <div className="flex flex-col gap-5 flex-1 justify-center">
                  {tagsLoading ? (
                    <div className="text-sm text-gray-500 dark:text-slate-400 py-4">{t('admin.loadingTags')}</div>
                  ) : !tagsWithUsage?.tags?.length ? (
                    <div className="text-sm text-gray-500 dark:text-slate-400 py-4">{t('admin.noTags')}</div>
                  ) : (
                    tagsWithUsage.tags.map((item, index) => (
                      <div key={item.tag} className="flex flex-col gap-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-700 dark:text-slate-200 capitalize">{getTagLabel(item.tag, t)}</span>
                          <span className="font-bold text-[#111418] dark:text-white">{Number(item.percentUsage).toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${TAG_BAR_COLORS[index % TAG_BAR_COLORS.length]}`}
                            style={{ width: `${Math.min(100, item.percentUsage)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-50 dark:bg-slate-800 text-primary dark:text-blue-300 font-medium transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined fill-1">dashboard</span>
                <span>{t('sidebar.dashboard')}</span>
              </Link>
              <Link
                to="/admin/users"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-[#111418] dark:hover:text-white font-medium transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined">people</span>
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
    </div>
  );
};

export default AdminDashboardPage;

