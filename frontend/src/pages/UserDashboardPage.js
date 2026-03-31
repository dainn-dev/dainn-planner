import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import MobileSidebarDrawer from '../components/MobileSidebarDrawer';
import { tasksAPI, goalsAPI, eventsAPI } from '../services/api';
import { formatDate, formatLocalDateIso } from '../utils/dateFormat';

const DAYS_OPTIONS = [7, 30, 90];

const UserDashboardPage = () => {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [daysFilter, setDaysFilter] = useState(30);
  const [daysFilterOpen, setDaysFilterOpen] = useState(false);
  const daysFilterRef = useRef(null);
  const [notifications, setNotifications] = useState([]);

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [goals, setGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Load all tasks once (filter locally by period)
  useEffect(() => {
    const load = async () => {
      setTasksLoading(true);
      try {
        const data = await tasksAPI.getTasks({ pageSize: 500 });
        const list = data?.items ?? (Array.isArray(data) ? data : []);
        setTasks(list);
      } catch (e) {
        console.error('Failed to load tasks:', e);
      } finally {
        setTasksLoading(false);
      }
    };
    load();
  }, []);

  // Load all goals
  useEffect(() => {
    const load = async () => {
      setGoalsLoading(true);
      try {
        const data = await goalsAPI.getGoals();
        setGoals(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to load goals:', e);
      } finally {
        setGoalsLoading(false);
      }
    };
    load();
  }, []);

  // Load upcoming events for selected period
  useEffect(() => {
    const load = async () => {
      setEventsLoading(true);
      try {
        const today = formatLocalDateIso(new Date());
        const endDate = formatLocalDateIso(
          new Date(Date.now() + daysFilter * 24 * 60 * 60 * 1000)
        );
        const data = await eventsAPI.getEvents({ startDate: today, endDate });
        const list = Array.isArray(data) ? data : (data?.data ?? data?.items ?? []);
        setEvents(list);
      } catch (e) {
        console.error('Failed to load events:', e);
      } finally {
        setEventsLoading(false);
      }
    };
    load();
  }, [daysFilter]);

  // Click outside to close filter dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (daysFilterRef.current && !daysFilterRef.current.contains(e.target)) {
        setDaysFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Date range for current filter
  const { startDate, endDate: periodEnd } = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const start = new Date(now);
    start.setDate(start.getDate() - daysFilter + 1);
    start.setHours(0, 0, 0, 0);
    return { startDate: start, endDate: end };
  }, [daysFilter]);

  // Tasks within the selected period
  const tasksInPeriod = useMemo(() => {
    return tasks.filter((task) => {
      const dateStr = task.date ?? task.scheduledDate ?? task.Date;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= startDate && d <= periodEnd;
    });
  }, [tasks, startDate, periodEnd]);

  const completedInPeriod = useMemo(
    () => tasksInPeriod.filter((t) => t.isCompleted ?? t.completed),
    [tasksInPeriod]
  );

  const completionRate =
    tasksInPeriod.length > 0
      ? Math.round((completedInPeriod.length / tasksInPeriod.length) * 100)
      : 0;

  // Active (non-completed) goals
  const activeGoals = useMemo(
    () =>
      goals.filter((g) => {
        const status = (g.status || '').toLowerCase();
        return status !== 'completed' && status !== 'done';
      }),
    [goals]
  );

  // Chart: completed tasks per day in period
  const chartData = useMemo(() => {
    const map = {};
    const days = [];
    const cur = new Date(startDate);
    while (cur <= periodEnd) {
      const key = formatLocalDateIso(cur);
      map[key] = 0;
      days.push(key);
      cur.setDate(cur.getDate() + 1);
    }
    completedInPeriod.forEach((task) => {
      const dateStr = task.date ?? task.scheduledDate ?? task.Date;
      if (!dateStr) return;
      const key = String(dateStr).slice(0, 10);
      if (key in map) map[key]++;
    });
    return days.map((d) => ({ date: d, count: map[d] }));
  }, [completedInPeriod, startDate, periodEnd]);

  const chartLabelDates = useMemo(() => {
    const n = chartData.length;
    if (n === 0) return [];
    if (n <= 3) return chartData.map((d) => d.date);
    return [chartData[0].date, chartData[Math.floor(n / 2)].date, chartData[n - 1].date];
  }, [chartData]);

  const filterLabel =
    daysFilter === 7
      ? t('admin.last7Days')
      : daysFilter === 90
      ? t('admin.last90Days')
      : t('admin.last30Days');

  return (
    <div className="bg-background-light dark:bg-[#101922] text-[#111418] dark:text-slate-100 font-display overflow-x-hidden min-h-screen flex flex-row">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={t('userDashboard.title')}
          icon="bar_chart"
          notifications={notifications}
          onNotificationsChange={setNotifications}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="flex-1 flex justify-center py-6 px-4 md:px-8 overflow-y-auto">
          <div className="max-w-7xl flex-1 flex flex-col gap-8 w-full">

            {/* Page heading + period filter */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-[#111418] dark:text-white text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-[-0.033em]">
                  {t('userDashboard.title')}
                </h1>
                <p className="text-gray-500 dark:text-slate-400">{t('userDashboard.subtitle')}</p>
              </div>
              <div className="relative shrink-0" ref={daysFilterRef}>
                <button
                  type="button"
                  onClick={() => setDaysFilterOpen((o) => !o)}
                  className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-md border border-gray-200 dark:border-slate-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                  <span>{filterLabel}</span>
                  <span className="material-symbols-outlined text-[16px]">expand_more</span>
                </button>
                {daysFilterOpen && (
                  <div className="absolute right-0 top-full mt-1 z-20 min-w-[140px] py-1 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-lg">
                    {DAYS_OPTIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => { setDaysFilter(d); setDaysFilterOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                          daysFilter === d
                            ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-300'
                            : 'text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {d === 7
                          ? t('admin.last7Days')
                          : d === 90
                          ? t('admin.last90Days')
                          : t('admin.last30Days')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1 sm:gap-2 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                  {t('userDashboard.totalTasks')}
                </p>
                <p className="text-[#111418] dark:text-white text-lg sm:text-xl md:text-2xl font-bold leading-none">
                  {tasksLoading ? '—' : tasksInPeriod.length}
                </p>
              </div>

              <div className="flex flex-col gap-1 sm:gap-2 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                  {t('userDashboard.completedTasks')}
                </p>
                <p className="text-[#111418] dark:text-white text-lg sm:text-xl md:text-2xl font-bold leading-none">
                  {tasksLoading ? '—' : completedInPeriod.length}
                </p>
              </div>

              <div className="flex flex-col gap-1 sm:gap-2 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                  {t('userDashboard.completionRate')}
                </p>
                <p className="text-[#111418] dark:text-white text-lg sm:text-xl md:text-2xl font-bold leading-none">
                  {tasksLoading ? '—' : `${completionRate}%`}
                </p>
              </div>

              <div className="flex flex-col gap-1 sm:gap-2 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                  {t('userDashboard.upcomingEvents')}
                </p>
                <p className="text-[#111418] dark:text-white text-lg sm:text-xl md:text-2xl font-bold leading-none">
                  {eventsLoading ? '—' : events.length}
                </p>
              </div>
            </div>

            {/* Chart + Goals */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Line chart: completed tasks per day */}
              <div className="lg:col-span-2 rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-[#111418] dark:text-white">
                    {t('userDashboard.taskCompletionTrend')}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {t('userDashboard.dailyCompletions')}
                  </p>
                </div>
                <div className="flex-1 min-h-[240px] w-full relative">
                  {tasksLoading ? (
                    <div className="flex items-center justify-center h-[240px] text-sm text-gray-500 dark:text-slate-400">
                      {t('userDashboard.loading')}
                    </div>
                  ) : chartData.every((d) => d.count === 0) ? (
                    <div className="flex items-center justify-center h-[240px] text-sm text-gray-500 dark:text-slate-400">
                      {t('userDashboard.noData')}
                    </div>
                  ) : (() => {
                    const n = chartData.length;
                    const maxCount = Math.max(1, ...chartData.map((d) => d.count));
                    const x = (i) => (n <= 1 ? 0 : (i / (n - 1)) * 800);
                    const y = (count) => 240 - (count / maxCount) * 220;
                    const lineD = chartData
                      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)},${y(d.count)}`)
                      .join(' ');
                    const areaD = `${lineD} L ${x(n - 1)},240 L 0,240 Z`;
                    return (
                      <>
                        <svg
                          className="w-full h-full overflow-visible"
                          preserveAspectRatio="none"
                          viewBox="0 0 800 240"
                        >
                          <line stroke="#e2e8f0" strokeWidth="1" x1="0" x2="800" y1="240" y2="240" />
                          <line stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="800" y1="180" y2="180" />
                          <line stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="800" y1="120" y2="120" />
                          <line stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="800" y1="60" y2="60" />
                          <path d={areaD} fill="url(#taskTrendGradient)" opacity="0.15" />
                          <path
                            d={lineD}
                            fill="none"
                            stroke="#137fec"
                            strokeLinecap="round"
                            strokeWidth="2.5"
                          />
                          <defs>
                            <linearGradient id="taskTrendGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                              <stop offset="0%" style={{ stopColor: '#137fec', stopOpacity: 1 }} />
                              <stop offset="100%" style={{ stopColor: '#137fec', stopOpacity: 0 }} />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="flex justify-between mt-4 text-xs text-gray-400 dark:text-slate-500 font-medium">
                          {chartLabelDates.map((d) => (
                            <span key={d}>{formatDate(d) || d}</span>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Goals progress */}
              <div className="rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-[#111418] dark:text-white">
                      {t('userDashboard.goalsOverview')}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {goalsLoading
                        ? t('userDashboard.loading')
                        : t('userDashboard.activeGoalsCount', { count: activeGoals.length })}
                    </p>
                  </div>
                  <Link
                    to="/goals"
                    className="text-xs text-primary dark:text-blue-400 hover:underline font-medium shrink-0"
                  >
                    {t('userDashboard.viewAll')}
                  </Link>
                </div>
                <div className="flex flex-col gap-4 flex-1 justify-center">
                  {goalsLoading ? (
                    <div className="text-sm text-gray-500 dark:text-slate-400 py-4">
                      {t('userDashboard.loading')}
                    </div>
                  ) : activeGoals.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-slate-400 py-4">
                      {t('userDashboard.noGoals')}
                    </div>
                  ) : (
                    activeGoals.slice(0, 6).map((g) => {
                      const progress = typeof g.progress === 'number' ? g.progress : 0;
                      return (
                        <div key={g.id} className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-gray-700 dark:text-slate-200 truncate pr-2">
                              {g.title}
                            </span>
                            <span className="font-bold text-[#111418] dark:text-white shrink-0">
                              {progress}%
                            </span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.min(100, progress)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Upcoming events */}
            <div className="rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-[#111418] dark:text-white">
                  {t('userDashboard.upcomingEventsList')}
                </h3>
                <Link
                  to="/calendar"
                  className="text-xs text-primary dark:text-blue-400 hover:underline font-medium"
                >
                  {t('userDashboard.viewAll')}
                </Link>
              </div>
              {eventsLoading ? (
                <p className="text-sm text-gray-500 dark:text-slate-400">{t('userDashboard.loading')}</p>
              ) : events.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-400">{t('userDashboard.noEvents')}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {events.slice(0, 6).map((ev) => (
                    <div
                      key={ev.id ?? ev.Id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/40"
                    >
                      <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary text-[18px]">event</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#111418] dark:text-white truncate">
                          {ev.title ?? ev.Title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          {formatDate(ev.startDate ?? ev.StartDate) || '—'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
      <MobileSidebarDrawer isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </div>
  );
};

export default UserDashboardPage;
