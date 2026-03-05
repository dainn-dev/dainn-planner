import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { adminAPI } from '../services/api';

const AdminDashboardPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
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

  return (
    <div className="bg-[#f6f7f8] text-[#111418] font-display overflow-x-hidden min-h-screen flex flex-row">
      {/* Sidebar - Desktop */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          title="Dashboard Overview"
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
              <Link to="/admin/dashboard" className="text-gray-500 font-medium hover:text-primary transition-colors">
                Admin
              </Link>
              <span className="text-gray-500 font-medium">/</span>
              <span className="text-[#111418] font-semibold">Dashboard</span>
            </div>
            {/* Page Heading */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold text-[#111418] tracking-tight">Dashboard Overview</h1>
                <p className="text-gray-500">Welcome back, Admin. Here's what's happening with your users today.</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-3 py-1.5 rounded-md border border-gray-200 shadow-sm">
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                <span>Last 30 Days</span>
              </div>
            </div>

            {/* Stats Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1 - Total Users */}
              <div className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <p className="text-gray-500 text-sm font-medium">Total Users</p>
                  <div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-[20px]">group</span>
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#111418]">
                    {statsLoading ? '—' : (stats?.totalUsers ?? 0).toLocaleString()}
                  </p>
                  <p className="text-emerald-600 text-sm font-medium flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[16px]">trending_up</span>
                    <span className="text-gray-400 font-normal">Total users</span>
                  </p>
                </div>
              </div>

              {/* Card 2 - Active Users Today */}
              <div className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <p className="text-gray-500 text-sm font-medium">Active Users Today</p>
                  <div className="bg-violet-50 text-violet-600 p-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-[20px]">person_check</span>
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#111418]">
                    {statsLoading ? '—' : (stats?.activeUsers ?? 0).toLocaleString()}
                  </p>
                  <p className="text-emerald-600 text-sm font-medium flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[16px]">trending_up</span>
                    <span className="text-gray-400 font-normal">Active users</span>
                  </p>
                </div>
              </div>

              {/* Card 3 - Goals Created */}
              <div className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <p className="text-gray-500 text-sm font-medium">Goals Created</p>
                  <div className="bg-amber-50 text-amber-600 p-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-[20px]">flag</span>
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#111418]">
                    {statsLoading ? '—' : (stats?.totalGoals ?? 0).toLocaleString()}
                  </p>
                  <p className="text-emerald-600 text-sm font-medium flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[16px]">trending_up</span>
                    <span className="text-gray-400 font-normal">Total goals</span>
                  </p>
                </div>
              </div>

              {/* Card 4 - Total Events */}
              <div className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <p className="text-gray-500 text-sm font-medium">Total Events</p>
                  <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-[20px]">event</span>
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#111418]">
                    {statsLoading ? '—' : (stats?.totalEvents ?? 0).toLocaleString()}
                  </p>
                  <p className="text-gray-400 text-sm font-medium flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[16px]">event</span>
                    <span className="text-gray-400 font-normal">Calendar events</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Line Chart */}
              <div className="lg:col-span-2 rounded-xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-[#111418]">User Growth</h3>
                    <p className="text-sm text-gray-500">New signups over the last 30 days</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 rounded-md hover:bg-gray-50 text-gray-400">
                      <span className="material-symbols-outlined text-[20px]">more_vert</span>
                    </button>
                  </div>
                </div>
                {/* Custom SVG Chart */}
                <div className="flex-1 min-h-[240px] w-full relative">
                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 800 240">
                    {/* Grid lines */}
                    <line stroke="#e2e8f0" strokeWidth="1" x1="0" x2="800" y1="240" y2="240"></line>
                    <line stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="800" y1="180" y2="180"></line>
                    <line stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="800" y1="120" y2="120"></line>
                    <line stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="800" y1="60" y2="60"></line>
                    {/* Area Fill */}
                    <path d="M0,200 Q100,180 200,150 T400,100 T600,80 T800,40 V240 H0 Z" fill="url(#gradient)" opacity="0.1"></path>
                    {/* Line */}
                    <path d="M0,200 Q100,180 200,150 T400,100 T600,80 T800,40" fill="none" stroke="#137fec" strokeLinecap="round" strokeWidth="3"></path>
                    {/* Gradient Def */}
                    <defs>
                      <linearGradient id="gradient" x1="0%" x2="0%" y1="0%" y2="100%">
                        <stop offset="0%" style={{stopColor:'#137fec',stopOpacity:1}}></stop>
                        <stop offset="100%" style={{stopColor:'#137fec',stopOpacity:0}}></stop>
                      </linearGradient>
                    </defs>
                  </svg>
                  {/* Tooltip Point Example */}
                  <div className="absolute top-[35px] right-0 translate-x-1/2 flex flex-col items-center">
                    <div className="bg-primary size-3 rounded-full border-2 border-white shadow-sm"></div>
                  </div>
                </div>
                {/* X Axis Labels */}
                <div className="flex justify-between mt-4 text-xs text-gray-400 font-medium">
                  <span>Day 1</span>
                  <span>Day 5</span>
                  <span>Day 10</span>
                  <span>Day 15</span>
                  <span>Day 20</span>
                  <span>Day 25</span>
                  <span>Today</span>
                </div>
              </div>

              {/* Side Bar Chart */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-[#111418]">Goal Categories</h3>
                  <p className="text-sm text-gray-500">Distribution by type</p>
                </div>
                <div className="flex flex-col gap-5 flex-1 justify-center">
                  {/* Category Item */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">Health & Fitness</span>
                      <span className="font-bold text-[#111418]">45%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{width: '45%'}}></div>
                    </div>
                  </div>
                  {/* Category Item */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">Career Growth</span>
                      <span className="font-bold text-[#111418]">30%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-400 rounded-full" style={{width: '30%'}}></div>
                    </div>
                  </div>
                  {/* Category Item */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">Learning</span>
                      <span className="font-bold text-[#111418]">15%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full" style={{width: '15%'}}></div>
                    </div>
                  </div>
                  {/* Category Item */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">Finance</span>
                      <span className="font-bold text-[#111418]">10%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-300 rounded-full" style={{width: '10%'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity Table */}
            <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-bold text-[#111418]">Recent Activity</h3>
                  <p className="text-sm text-gray-500">Latest actions performed by users</p>
                </div>
                <button className="text-sm font-medium text-primary hover:text-primary/80">View All</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                    <tr>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Action</th>
                      <th className="px-6 py-4">Date & Time</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {/* Row 1 */}
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-[#111418] flex items-center gap-3">
                        <div className="bg-violet-100 text-violet-600 size-8 rounded-full flex items-center justify-center text-xs font-bold">JD</div>
                        Jane Doe
                      </td>
                      <td className="px-6 py-4">Created a new goal: "Run 5km"</td>
                      <td className="px-6 py-4">Oct 24, 2023 • 10:42 AM</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                          <span className="size-1.5 rounded-full bg-emerald-500"></span>
                          Completed
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-gray-400 hover:text-gray-600">
                          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                        </button>
                      </td>
                    </tr>
                    {/* Row 2 */}
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-[#111418] flex items-center gap-3">
                        <div className="bg-amber-100 text-amber-600 size-8 rounded-full flex items-center justify-center text-xs font-bold">MS</div>
                        Mark Smith
                      </td>
                      <td className="px-6 py-4">Updated profile settings</td>
                      <td className="px-6 py-4">Oct 24, 2023 • 09:15 AM</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                          <span className="size-1.5 rounded-full bg-blue-500"></span>
                          Updated
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-gray-400 hover:text-gray-600">
                          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                        </button>
                      </td>
                    </tr>
                    {/* Row 3 */}
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-[#111418] flex items-center gap-3">
                        <div className="bg-rose-100 text-rose-600 size-8 rounded-full flex items-center justify-center text-xs font-bold">AL</div>
                        Ada Lovelace
                      </td>
                      <td className="px-6 py-4">Failed payment attempt</td>
                      <td className="px-6 py-4">Oct 23, 2023 • 04:30 PM</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
                          <span className="size-1.5 rounded-full bg-rose-500"></span>
                          Failed
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-gray-400 hover:text-gray-600">
                          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl bg-gradient-to-r from-primary to-blue-600 p-6 shadow-sm text-white relative overflow-hidden group cursor-pointer">
                <div className="relative z-10 flex flex-col items-start gap-4">
                  <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                    <span className="material-symbols-outlined">download</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">Export User Data</h4>
                    <p className="text-blue-100 text-sm mt-1">Download a CSV report of all user activity for this month.</p>
                  </div>
                </div>
                {/* Decorative background */}
                <div className="absolute -right-6 -bottom-6 opacity-20 transform scale-150 rotate-12 group-hover:scale-175 transition-transform duration-500">
                  <span className="material-symbols-outlined text-[120px]">table_view</span>
                </div>
              </div>
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
                <div className="flex items-start gap-4">
                  <div className="bg-amber-100 text-amber-600 p-2 rounded-lg">
                    <span className="material-symbols-outlined">campaign</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#111418]">System Announcement</h4>
                    <p className="text-gray-500 text-sm mt-1">Send a push notification to all active users regarding maintenance.</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button className="text-sm font-medium text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors">Draft Message</button>
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

export default AdminDashboardPage;

