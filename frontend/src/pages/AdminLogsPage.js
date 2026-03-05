import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const AdminLogsPage = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
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

  const logFiles = [
    {
      id: 1,
      name: 'server-error-2023-10-27.log',
      createdAt: '27/10/2023 08:45',
      level: 'Error',
      size: '2.4 MB'
    },
    {
      id: 2,
      name: 'system-error-2023-10-25.log',
      createdAt: '25/10/2023 14:30',
      level: 'Error',
      size: '4.2 MB'
    },
    {
      id: 3,
      name: 'access-log-weekly.txt',
      createdAt: '25/10/2023 09:15',
      level: 'Info',
      size: '156 KB'
    },
    {
      id: 4,
      name: 'app-worker-warn.log',
      createdAt: '24/10/2023 18:00',
      level: 'Warning',
      size: '890 KB'
    },
    {
      id: 5,
      name: 'db-backup-daily.sql',
      createdAt: '24/10/2023 00:00',
      level: 'Info',
      size: '12.5 MB'
    },
    {
      id: 6,
      name: 'auth-module-crash.log',
      createdAt: '23/10/2023 11:22',
      level: 'Error',
      size: '2.1 MB'
    }
  ];

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
    const matchesFilter = selectedFilter === 'all' || log.level.toLowerCase() === selectedFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const handleRefresh = () => {
    // In a real app, you would refresh the log files list
    console.log('Refreshing log files...');
  };

  const handleExport = () => {
    // In a real app, you would export the log files report
    console.log('Exporting report...');
  };

  const handleViewLog = (logId) => {
    const log = logFiles.find(l => l.id === logId);
    if (log) {
      // Encode the file name for URL
      const encodedFileName = encodeURIComponent(log.name);
      navigate(`/admin/logs/${encodedFileName}`);
    }
  };

  const handleDownloadLog = (logId) => {
    // In a real app, you would download the log file
    console.log('Downloading log:', logId);
  };

  const handleDeleteLog = (logId) => {
    // In a real app, you would delete the log file
    console.log('Deleting log:', logId);
  };

  return (
    <div className="bg-[#f6f7f8] dark:bg-[#101922] text-[#0d141b] dark:text-white font-display overflow-x-hidden min-h-screen flex flex-row">
      {/* Sidebar - Desktop */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          title="Log Files Management"
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
                Admin
              </Link>
              <span className="text-gray-500 dark:text-slate-400 font-medium">/</span>
              <span className="text-[#0d141b] dark:text-white font-semibold">Log Files</span>
            </div>

            {/* Page Heading */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
              <div className="flex flex-col gap-2">
                <h1 className="text-[#0d141b] dark:text-white text-3xl font-black leading-tight tracking-tight">Quản lý Log Files</h1>
                <p className="text-[#4c739a] dark:text-slate-400 text-base font-normal">Theo dõi, kiểm soát và tải xuống các tệp nhật ký hệ thống</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleRefresh}
                  className="flex items-center gap-2 bg-white dark:bg-[#15202b] border border-[#cfdbe7] dark:border-slate-700 text-[#0d141b] dark:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">refresh</span>
                  Làm mới
                </button>
                <button 
                  onClick={handleExport}
                  className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200 dark:shadow-none"
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                  Xuất báo cáo
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Total Files Card */}
              <div className="flex flex-col gap-2 rounded-xl bg-white dark:bg-[#15202b] p-6 border border-[#cfdbe7] dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-start">
                  <p className="text-[#4c739a] dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Tổng số tệp</p>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-primary">
                    <span className="material-symbols-outlined text-[24px]">folder_open</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-[#0d141b] dark:text-white text-3xl font-bold leading-tight">1,240</p>
                  <p className="text-[#078838] bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded text-xs font-semibold">+12 hôm nay</p>
                </div>
              </div>

              {/* Storage Capacity Card */}
              <div className="flex flex-col gap-2 rounded-xl bg-white dark:bg-[#15202b] p-6 border border-[#cfdbe7] dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-start">
                  <p className="text-[#4c739a] dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Dung lượng lưu trữ</p>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg text-purple-600 dark:text-purple-400">
                    <span className="material-symbols-outlined text-[24px]">hard_drive</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-[#0d141b] dark:text-white text-3xl font-bold leading-tight">450 MB</p>
                  <p className="text-[#4c739a] dark:text-slate-500 text-sm">/ 1 GB Limit</p>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mt-2">
                  <div className="bg-primary h-1.5 rounded-full" style={{width: '45%'}}></div>
                </div>
              </div>

              {/* Errors Detected Card */}
              <div className="flex flex-col gap-2 rounded-xl bg-white dark:bg-[#15202b] p-6 border border-[#cfdbe7] dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-start">
                  <p className="text-[#4c739a] dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Lỗi phát hiện (24h)</p>
                  <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg text-red-600 dark:text-red-400">
                    <span className="material-symbols-outlined text-[24px]">bug_report</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-[#0d141b] dark:text-white text-3xl font-bold leading-tight">12</p>
                  <p className="text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded text-xs font-semibold">Cần xử lý</p>
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
                  placeholder="Tìm kiếm theo tên tệp (ví dụ: system-log-2023...)" 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {/* Filters */}
              <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                <button className="whitespace-nowrap flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#e7edf3] dark:bg-slate-700 dark:text-white px-4 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  <span className="text-sm font-medium">Thời gian</span>
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
                  <span className="text-sm font-medium">Tất cả</span>
                </button>
                <button 
                  onClick={() => setSelectedFilter('error')}
                  className={`whitespace-nowrap flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 transition-colors ${
                    selectedFilter === 'error' 
                      ? 'bg-primary text-white shadow-sm shadow-blue-200 dark:shadow-none' 
                      : 'border border-[#cfdbe7] dark:border-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="text-sm font-medium">Lỗi (Error)</span>
                </button>
                <button 
                  onClick={() => setSelectedFilter('warning')}
                  className={`whitespace-nowrap flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 transition-colors ${
                    selectedFilter === 'warning' 
                      ? 'bg-primary text-white shadow-sm shadow-blue-200 dark:shadow-none' 
                      : 'border border-[#cfdbe7] dark:border-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="text-sm font-medium">Cảnh báo</span>
                </button>
              </div>
            </div>

            {/* Data Table */}
            <div className="w-full overflow-hidden rounded-xl border border-[#cfdbe7] dark:border-slate-700 shadow-sm bg-white dark:bg-[#15202b]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-[#0d141b] dark:text-slate-200">
                  <thead className="bg-slate-50 dark:bg-[#1e2a35] text-xs uppercase font-semibold text-[#4c739a] dark:text-slate-400">
                    <tr>
                      <th className="px-6 py-4" scope="col">Tên tệp</th>
                      <th className="px-6 py-4" scope="col">Thời gian tạo</th>
                      <th className="px-6 py-4" scope="col">Cấp độ</th>
                      <th className="px-6 py-4" scope="col">Kích thước</th>
                      <th className="px-6 py-4 text-right" scope="col">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredLogs.map((log) => {
                      const badge = getLevelBadge(log.level);
                      return (
                        <tr key={log.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-[#0d141b] dark:text-white flex items-center gap-3">
                            <span className="material-symbols-outlined text-slate-400">description</span>
                            {log.name}
                          </td>
                          <td className="px-6 py-4 text-[#4c739a] dark:text-slate-400">
                            {log.createdAt}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full ${badge.bg} px-2.5 py-1 text-xs font-semibold ${badge.text} border ${badge.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                              {log.level}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[#4c739a] dark:text-slate-400 font-mono text-xs">
                            {log.size}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleViewLog(log.id)}
                                className="p-2 rounded-lg text-slate-500 hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" 
                                title="Xem chi tiết"
                              >
                                <span className="material-symbols-outlined text-[20px]">visibility</span>
                              </button>
                              <button 
                                onClick={() => handleDownloadLog(log.id)}
                                className="p-2 rounded-lg text-slate-500 hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" 
                                title="Tải xuống"
                              >
                                <span className="material-symbols-outlined text-[20px]">download</span>
                              </button>
                              <button 
                                onClick={() => handleDeleteLog(log.id)}
                                className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" 
                                title="Xóa"
                              >
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-[#cfdbe7] dark:border-slate-700 bg-white dark:bg-[#15202b] px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                  <a className="relative inline-flex items-center rounded-md border border-[#cfdbe7] bg-white dark:bg-[#15202b] dark:border-slate-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800" href="#">Previous</a>
                  <a className="relative ml-3 inline-flex items-center rounded-md border border-[#cfdbe7] bg-white dark:bg-[#15202b] dark:border-slate-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800" href="#">Next</a>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-[#4c739a] dark:text-slate-400">
                      Hiển thị <span className="font-medium text-[#0d141b] dark:text-white">1</span> đến <span className="font-medium text-[#0d141b] dark:text-white">5</span> trong số <span className="font-medium text-[#0d141b] dark:text-white">1,240</span> kết quả
                    </p>
                  </div>
                  <div>
                    <nav aria-label="Pagination" className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                      <a className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 focus:z-20 focus:outline-offset-0" href="#">
                        <span className="sr-only">Previous</span>
                        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                      </a>
                      <a aria-current="page" className="relative z-10 inline-flex items-center bg-primary px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href="#">1</a>
                      <a className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 focus:z-20 focus:outline-offset-0" href="#">2</a>
                      <a className="relative hidden items-center px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 focus:z-20 focus:outline-offset-0 md:inline-flex" href="#">3</a>
                      <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 dark:text-slate-400 ring-1 ring-inset ring-gray-300 dark:ring-slate-700 focus:outline-offset-0">...</span>
                      <a className="relative hidden items-center px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 focus:z-20 focus:outline-offset-0 md:inline-flex" href="#">8</a>
                      <a className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 focus:z-20 focus:outline-offset-0" href="#">
                        <span className="sr-only">Next</span>
                        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                      </a>
                    </nav>
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

export default AdminLogsPage;
