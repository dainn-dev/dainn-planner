import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const AdminLogDetailPage = () => {
  const { fileName } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [logContent, setLogContent] = useState(null);
  const [logFile, setLogFile] = useState(null);


  // Mock log files data - in a real app, this would come from an API
  const logFiles = useMemo(() => [
    {
      name: 'server-error-2023-10-27.log',
      displayName: 'server-error-2023-10-27.log',
      size: '2.4 MB',
      createdAt: 'Oct 27, 2023 08:45 AM',
      server: 'Server-01',
      priority: 'High Priority',
      priorityColor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-900',
      lines: 1542,
      content: [
        { line: 1, level: 'INFO', text: '2023-10-27 08:00:01 - System initialization started. Version 2.4.1' },
        { line: 2, level: 'INFO', text: '2023-10-27 08:00:02 - Loading configuration from /etc/planner/config.yaml' },
        { line: 3, level: 'INFO', text: '2023-10-27 08:00:02 - Database connection pool initialized (Max: 50)' },
        { line: 4, level: 'INFO', text: '2023-10-27 08:00:03 - Redis cache connected on 127.0.0.1:6379' },
        { line: 5, level: 'INFO', text: '2023-10-27 08:00:03 - Scheduler service started' },
        { line: 6, level: 'INFO', text: '2023-10-27 08:00:04 - Background jobs registered: [EmailDigest, DataCleanup]' },
        { line: 7, level: 'INFO', text: '2023-10-27 08:00:05 - API Gateway listening on port 8080' },
        { line: 8, level: 'INFO', text: '2023-10-27 08:00:30 - User session created: admin_01' },
        { line: 9, level: 'WARN', text: '2023-10-27 08:01:15 - High latency detected on /api/v1/goals (450ms)' },
        { line: 10, level: 'INFO', text: '2023-10-27 08:02:00 - Scheduled task \'EmailDigest\' executing' },
        { line: 11, level: 'INFO', text: '2023-10-27 08:02:05 - Sent 150 digest emails' },
        { line: 12, level: 'INFO', text: '2023-10-27 08:05:22 - Incoming request: GET /api/v1/logs' },
        { line: 13, level: 'INFO', text: '2023-10-27 08:10:00 - User logout: user_452' },
        { line: 14, level: 'ERROR', text: '2023-10-27 08:15:00 - Connection timeout: External Calendar API' },
        { line: 15, level: 'ERROR', text: 'at com.myplanner.integrations.CalendarService.sync(CalendarService.java:142)' },
        { line: 16, level: 'ERROR', text: 'at com.myplanner.tasks.SyncJob.execute(SyncJob.java:45)' },
        { line: 17, level: 'INFO', text: '2023-10-27 08:15:01 - Retry mechanism triggered (Attempt 1/3)' },
        { line: 18, level: 'INFO', text: '2023-10-27 08:15:05 - Connection restored' },
        { line: 19, level: 'INFO', text: '2023-10-27 08:20:00 - Data cleanup job started' },
        { line: 20, level: 'INFO', text: '2023-10-27 08:20:02 - Removed 45 temporary files' },
      ]
    }
  ], []);

  useEffect(() => {
    // Decode the file name from URL
    const decodedFileName = decodeURIComponent(fileName);
    const foundLogFile = logFiles.find(log => log.name === decodedFileName || log.displayName === decodedFileName);
    
    if (foundLogFile) {
      setLogFile(foundLogFile);
      setLogContent(foundLogFile.content);
    } else {
      // Log file not found, redirect to logs page
      navigate('/admin/logs');
    }
  }, [fileName, navigate, logFiles]);

  const getLevelColor = (level) => {
    switch (level) {
      case 'ERROR':
        return 'text-red-600 dark:text-red-400';
      case 'WARN':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'INFO':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-slate-800 dark:text-slate-300';
    }
  };

  const getLineBg = (level) => {
    switch (level) {
      case 'ERROR':
        return 'bg-red-50 dark:bg-red-900/10';
      case 'WARN':
        return 'bg-yellow-50 dark:bg-yellow-900/10';
      default:
        return '';
    }
  };

  const handleDownload = () => {
    // In a real app, you would download the log file
    console.log('Downloading log file:', logFile?.name);
    // Create a blob and trigger download
    if (logContent) {
      const content = logContent.map(line => `[${line.level}] ${line.text}`).join('\n');
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = logFile?.name || 'log.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleCopyRaw = () => {
    // In a real app, you would copy the raw log content
    if (logContent) {
      const content = logContent.map(line => `[${line.level}] ${line.text}`).join('\n');
      navigator.clipboard.writeText(content).then(() => {
        // Show success message (you could add a toast notification here)
        console.log('Log content copied to clipboard');
      });
    }
  };

  const handleBack = () => {
    navigate('/admin/logs');
  };

  if (!logFile || !logContent) {
    return null; // Or show a loading state
  }

  return (
    <div className="bg-[#f6f7f8] dark:bg-[#101922] text-slate-900 dark:text-slate-100 font-display overflow-x-hidden min-h-screen flex flex-row">
      {/* Sidebar - Desktop */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f6f7f8] dark:bg-[#101922] relative overflow-hidden">
        {/* Header Section */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-10">
          <div className="max-w-[1600px] mx-auto px-6 py-4">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 mb-3 text-sm text-slate-500 dark:text-slate-400">
              <Link to="/admin/dashboard" className="hover:text-primary transition-colors">Home</Link>
              <span className="material-symbols-outlined text-[16px] text-slate-300">chevron_right</span>
              <Link to="/admin/logs" className="hover:text-primary transition-colors">Log Management</Link>
              <span className="material-symbols-outlined text-[16px] text-slate-300">chevron_right</span>
              <span className="text-slate-900 dark:text-white font-medium">{logFile.displayName}</span>
            </div>
            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left: Title & Meta */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleBack}
                    className="flex items-center justify-center size-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors mr-1"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{logFile.displayName}</h2>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${logFile.priorityColor}`}>
                    {logFile.priority}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 pl-12 text-sm text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">hard_drive</span>
                    <span>{logFile.size}</span>
                  </div>
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                    <span>{logFile.createdAt}</span>
                  </div>
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">dns</span>
                    <span>{logFile.server}</span>
                  </div>
                </div>
              </div>
              {/* Right: Actions */}
              <div className="flex items-center gap-3 pl-12 lg:pl-0">
                {/* Search within file */}
                <div className="relative hidden sm:block group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[20px]">search</span>
                  <input 
                    className="h-10 pl-10 pr-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm w-64 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-slate-700 dark:text-slate-200 placeholder-slate-400" 
                    placeholder="Find in file (Ctrl+F)" 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>
                <button 
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors text-sm font-medium"
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                  <span className="hidden md:inline">Download</span>
                </button>
                <button 
                  onClick={handleCopyRaw}
                  className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-white hover:bg-blue-600 transition-colors shadow-sm shadow-blue-500/20 text-sm font-medium"
                >
                  <span className="material-symbols-outlined text-[20px]">content_copy</span>
                  <span className="hidden md:inline">Copy Raw</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* File Viewer Content */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {/* Viewer Wrapper with Scroll */}
          <div className="flex-1 overflow-auto bg-slate-50 dark:bg-[#0d1117] custom-scrollbar">
            <div className="max-w-[1600px] mx-auto min-h-full">
              <div className="flex font-mono text-sm leading-6">
                {/* Line Numbers */}
                <div className="w-12 md:w-16 shrink-0 text-right pr-4 py-6 select-none bg-slate-100/50 dark:bg-[#0d1117] text-slate-400 dark:text-slate-600 border-r border-slate-200 dark:border-slate-800 sticky left-0 z-10 hidden sm:block">
                  {logContent.map((line) => {
                    const isError = line.level === 'ERROR';
                    const isWarn = line.level === 'WARN';
                    const hasHighlight = isError || isWarn;
                    
                    return (
                      <div 
                        key={line.line} 
                        className={`leading-6 ${
                          hasHighlight 
                            ? isError
                              ? 'bg-red-100 dark:bg-red-900/20 border-l-2 border-red-500 -ml-12 pl-12 md:-ml-16 md:pl-16'
                              : 'bg-yellow-100 dark:bg-yellow-900/20 border-l-2 border-yellow-500 -ml-12 pl-12 md:-ml-16 md:pl-16'
                            : ''
                        }`}
                      >
                        {line.line}
                      </div>
                    );
                  })}
                  {logFile.lines > logContent.length && (
                    <div className="opacity-50 text-xs mt-2 text-center">...</div>
                  )}
                </div>
                {/* Code Content */}
                <div className="flex-1 py-6 px-4 md:px-6 overflow-x-auto">
                  <div className="min-w-max text-slate-800 dark:text-slate-300">
                    {logContent.map((line) => {
                      const lineBg = getLineBg(line.level);
                      const levelColor = getLevelColor(line.level);
                      const isStackTrace = line.text.startsWith('at ');
                      
                      return (
                        <div 
                          key={line.line} 
                          className={`leading-6 ${lineBg ? `${lineBg} -mx-4 px-4 md:-mx-6 md:px-6` : ''} ${isStackTrace ? 'text-slate-500 dark:text-slate-400 ml-4' : ''}`}
                        >
                          <span className={`${levelColor} font-bold`}>[{line.level}]</span> {line.text}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Footer Status Bar */}
          <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-2 px-4 shrink-0 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 z-10">
            <div className="flex items-center gap-4">
              <span>Lines: {logFile.lines}</span>
              <span>Encoding: UTF-8</span>
              <span>Ln {logContent.length}, Col 1</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span>Live Tail (Connected)</span>
            </div>
          </div>
        </div>

        {/* Floating Action Button (Mobile Only) */}
        <button className="fixed bottom-16 right-6 md:hidden size-12 rounded-full bg-primary text-white shadow-lg shadow-blue-500/30 flex items-center justify-center z-50">
          <span className="material-symbols-outlined">search</span>
        </button>
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

export default AdminLogDetailPage;

