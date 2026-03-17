import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { isStoredAdmin } from '../utils/auth';
import { adminAPI } from '../services/api';
import LogoutButton from '../components/LogoutButton';

const formatSize = (bytes) => {
  if (bytes == null || bytes < 0) return '–';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatLogDate = (dateUtc) => {
  if (!dateUtc) return '–';
  const d = new Date(dateUtc);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const parseLevel = (text) => {
  if (!text) return 'INF';
  const t = text.toUpperCase();
  if (t.includes('[ERR]') || t.includes('[ERROR]')) return 'ERROR';
  if (t.includes('[WRN]') || t.includes('[WARN]')) return 'WARN';
  if (t.includes('[INF]') || t.includes('[INFO]')) return 'INFO';
  return 'INF';
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const renderLineWithHighlight = (text, query) => {
  if (!query || !query.trim()) return text;
  const q = query.trim();
  const re = new RegExp(escapeRegex(q), 'gi');
  const segments = [];
  let lastIndex = 0;
  let match;
  const str = String(text);
  re.lastIndex = 0;
  while ((match = re.exec(str)) !== null) {
    segments.push({ type: 'text', value: str.slice(lastIndex, match.index) });
    segments.push({ type: 'mark', value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  segments.push({ type: 'text', value: str.slice(lastIndex) });
  if (segments.length === 1 && segments[0].type === 'text' && !segments[0].value) return text;
  if (segments.every(s => s.type === 'text' && s.value === (segments.length === 1 ? str : ''))) return text;
  return segments.map((seg, i) =>
    seg.type === 'mark' ? (
      <mark key={i} className="bg-yellow-300 dark:bg-yellow-600/60 text-slate-900 dark:text-slate-100 rounded px-0.5">
        {seg.value}
      </mark>
    ) : (
      seg.value
    )
  );
};

const AdminLogDetailPage = () => {
  const { fileName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = isStoredAdmin();
  const fileMeta = location.state?.file;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [logContent, setLogContent] = useState(null);
  const [logFile, setLogFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveTailOn, setLiveTailOn] = useState(false);
  const [streamConnected, setStreamConnected] = useState(false);
  const unsubscribeRef = useRef(null);
  const nextLineRef = useRef(1);
  const searchInputRef = useRef(null);
  const mobileSearchInputRef = useRef(null);
  const viewerScrollRef = useRef(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [copyRawCopied, setCopyRawCopied] = useState(false);

  useEffect(() => {
    if (!fileName) {
      navigate('/admin/logs');
      return;
    }
    const decodedFileName = decodeURIComponent(fileName);
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminAPI.getLogContent(decodedFileName, { tail: 2000 });
        if (cancelled) return;
        const data = res?.data ?? res;
        if (!data || !Array.isArray(data.lines)) {
          setError('No content');
          setLoading(false);
          return;
        }
        const lines = (data.lines || []).map((l) => ({
          line: l.lineNumber ?? l.LineNumber,
          level: l.level ?? l.Level ?? 'INF',
          text: (l.text ?? l.Text) ?? ''
        }));
        nextLineRef.current = (data.totalLineCount ?? 0) + 1;
        if (lines.length > 0) nextLineRef.current = Math.max(nextLineRef.current, lines[lines.length - 1].line + 1);
        setLogContent(lines);
        setLogFile({
          name: data.fileName || decodedFileName,
          displayName: data.fileName || decodedFileName,
          size: formatSize(fileMeta?.sizeBytes),
          createdAt: formatLogDate(fileMeta?.lastWriteUtc),
          server: typeof window !== 'undefined' ? window.location.origin : '–',
          priority: 'Log file',
          priorityColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          lines: data.totalLineCount ?? lines.length
        });
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || 'Failed to load log');
        navigate('/admin/logs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [fileName, navigate, fileMeta?.lastWriteUtc, fileMeta?.sizeBytes]);

  useEffect(() => {
    if (!liveTailOn || !fileName || !logFile?.name) return;
    const decoded = decodeURIComponent(fileName);
    setStreamConnected(false);
    const unsubscribe = adminAPI.subscribeLogStream(
      decoded,
      (data) => {
        setStreamConnected(true);
        const raw = data?.line ?? '';
        const lineNum = nextLineRef.current++;
        setLogContent((prev) => {
          if (!prev) return [{ line: lineNum, level: parseLevel(raw), text: raw }];
          return [...prev, { line: lineNum, level: parseLevel(raw), text: raw }];
        });
      },
      () => setStreamConnected(false)
    );
    unsubscribeRef.current = unsubscribe;
    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      setStreamConnected(false);
    };
  }, [liveTailOn, fileName, logFile?.name]);

  const handleLiveTailToggle = () => {
    if (liveTailOn) {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      setStreamConnected(false);
    }
    setLiveTailOn((prev) => !prev);
  };

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
    if (!logContent?.length || !logFile?.name) return;
    const content = logContent.map((line) => `[${line.level}] ${line.text}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = logFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyRaw = () => {
    if (!logContent?.length) return;
    const content = logContent.map((line) => `[${line.level}] ${line.text}`).join('\n');
    navigator.clipboard.writeText(content).then(() => {
      setCopyRawCopied(true);
      setTimeout(() => setCopyRawCopied(false), 2000);
    });
  };

  const handleBack = () => {
    navigate('/admin/logs');
  };

  const q = searchQuery.trim().toLowerCase();
  const displayLines = q
    ? (logContent || []).filter((line) => String(line.text || '').toLowerCase().includes(q))
    : (logContent || []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (mobileSearchOpen) {
      mobileSearchInputRef.current?.focus();
    }
  }, [mobileSearchOpen]);

  if (loading) {
    return (
      <div className="bg-[#f6f7f8] dark:bg-[#101922] min-h-screen flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">Đang tải...</p>
      </div>
    );
  }

  if (error && (!logFile || !logContent)) {
    return (
      <div className="bg-[#f6f7f8] dark:bg-[#101922] min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={() => navigate('/admin/logs')}
          className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-blue-600 transition-colors"
        >
          Back to Logs
        </button>
      </div>
    );
  }

  if (!logFile || !logContent) {
    return null;
  }

  return (
    <div className="bg-[#f6f7f8] dark:bg-[#101922] text-slate-900 dark:text-slate-100 font-display overflow-hidden h-screen flex flex-row">
      {/* Sidebar - Desktop */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#f6f7f8] dark:bg-[#101922] relative overflow-hidden">
        {/* Header Section */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-10">
          <div className="max-w-[1600px] mx-auto px-6 py-4">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 mb-3 text-sm text-slate-500 dark:text-slate-400">
              <Link to="/admin/dashboard" className="hover:text-primary dark:hover:text-blue-400 transition-colors">Home</Link>
              <span className="material-symbols-outlined text-[16px] text-slate-300 dark:text-slate-500">chevron_right</span>
              <Link to="/admin/logs" className="hover:text-primary dark:hover:text-blue-400 transition-colors">Log Management</Link>
              <span className="material-symbols-outlined text-[16px] text-slate-300">chevron_right</span>
              <span className="text-slate-900 dark:text-white font-medium">{logFile?.displayName ?? fileName}</span>
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
                <div className="hidden sm:flex items-center gap-2">
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[20px]">search</span>
                    <input
                      ref={searchInputRef}
                      className="h-10 pl-10 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm w-52 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-slate-700 dark:text-slate-200 placeholder-slate-400"
                      placeholder="Find in file (Ctrl+F)"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {q && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {displayLines.length} {displayLines.length === 1 ? 'match' : 'matches'}
                    </span>
                  )}
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>
                <button 
                  onClick={handleLiveTailToggle}
                  className={`flex items-center justify-center gap-2 h-10 px-4 rounded-lg border text-sm font-medium transition-colors ${
                    liveTailOn
                      ? 'bg-primary/10 border-primary text-primary dark:bg-primary/20 dark:border-primary dark:text-primary'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">podcasts</span>
                  <span className="hidden md:inline">Live tail</span>
                  <span className="text-xs">({liveTailOn ? (streamConnected ? 'On' : '…') : 'Off'})</span>
                </button>
                <button 
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                  <span className="hidden md:inline">Download</span>
                </button>
                <button 
                  onClick={handleCopyRaw}
                  className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-white hover:bg-blue-600 transition-colors shadow-sm shadow-blue-500/20 text-sm font-medium"
                >
                  <span className="material-symbols-outlined text-[20px]">{copyRawCopied ? 'check' : 'content_copy'}</span>
                  <span className="hidden md:inline">{copyRawCopied ? 'Copied' : 'Copy Raw'}</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* File Viewer Content */}
        <div className="flex-1 min-h-0 overflow-hidden relative flex flex-col">
          {/* Viewer Wrapper with Scroll */}
          <div ref={viewerScrollRef} className="flex-1 min-h-0 overflow-auto bg-slate-50 dark:bg-[#0d1117] custom-scrollbar">
            <div className="max-w-[1600px] mx-auto min-h-full">
              <div className="flex font-mono text-sm leading-6">
                {/* Line Numbers */}
                <div className="w-12 md:w-16 shrink-0 text-right pr-4 py-6 select-none bg-slate-100/50 dark:bg-[#0d1117] text-slate-400 dark:text-slate-600 border-r border-slate-200 dark:border-slate-800 sticky left-0 z-10 hidden sm:block">
                  {displayLines.length === 0 && q ? (
                    <div className="leading-6 text-slate-500 dark:text-slate-400">No matches</div>
                  ) : (
                    displayLines.map((line) => {
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
                    })
                  )}
                  {!q && logFile.lines > logContent.length && (
                    <div className="opacity-50 text-xs mt-2 text-center">...</div>
                  )}
                </div>
                {/* Code Content */}
                <div className="flex-1 py-6 px-4 md:px-6 overflow-x-auto">
                  <div className="min-w-max text-slate-800 dark:text-slate-300">
                    {displayLines.length === 0 && q ? (
                      <div className="leading-6 text-slate-500 dark:text-slate-400">No lines match &quot;{searchQuery.trim()}&quot;</div>
                    ) : (
                      displayLines.map((line) => {
                        const lineBg = getLineBg(line.level);
                        const levelColor = getLevelColor(line.level);
                        const isStackTrace = line.text.startsWith('at ');

                        return (
                          <div
                            key={line.line}
                            className={`leading-6 ${lineBg ? `${lineBg} -mx-4 px-4 md:-mx-6 md:px-6` : ''} ${isStackTrace ? 'text-slate-500 dark:text-slate-400 ml-4' : ''}`}
                          >
                            <span className={`${levelColor} font-bold`}>[{line.level}]</span>{' '}
                            {renderLineWithHighlight(line.text, searchQuery)}
                          </div>
                        );
                      })
                    )}
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
            <button
              type="button"
              onClick={handleLiveTailToggle}
              className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            >
              <span className={`w-2 h-2 rounded-full ${liveTailOn && streamConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></span>
              <span>Live tail ({liveTailOn ? (streamConnected ? 'Connected' : 'Connecting…') : 'Off'})</span>
            </button>
          </div>
        </div>

        {/* Mobile search overlay - shown when FAB is clicked */}
        {mobileSearchOpen && (
          <div className="fixed inset-0 z-50 md:hidden" aria-modal="true" role="dialog">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileSearchOpen(false)} aria-hidden="true" />
            <div className="absolute left-0 right-0 top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                  <input
                    ref={mobileSearchInputRef}
                    className="w-full h-12 pl-10 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Find in file"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoComplete="off"
                  />
                  {q && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 dark:text-slate-400">
                      {displayLines.length}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSearchOpen(false)}
                  className="shrink-0 size-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Close search"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Action Button (Mobile Only) - opens search */}
        <button
          type="button"
          onClick={() => setMobileSearchOpen(true)}
          className="fixed bottom-16 right-6 md:hidden size-12 rounded-full bg-primary text-white shadow-lg shadow-blue-500/30 flex items-center justify-center z-40"
          aria-label="Open search"
        >
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-[#111418] dark:hover:text-white font-medium transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined">dashboard</span>
                <span>Dashboard</span>
              </Link>
              <Link
                to="/admin/users"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-[#111418] dark:hover:text-white font-medium transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined">people</span>
                <span>Users</span>
              </Link>
              <Link
                to="/admin/logs"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-50 dark:bg-slate-800 text-primary dark:text-blue-300 font-medium transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined fill-1">description</span>
                <span>Logs</span>
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
            <span>Kế hoạch hôm nay</span>
          </Link>
          <Link 
            to="/goals" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-[#111418] dark:hover:text-white font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">target</span>
            <span>Quản lý mục tiêu</span>
          </Link>
          <Link 
            to="/calendar" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-[#111418] dark:hover:text-white font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">calendar_month</span>
            <span>Lịch biểu</span>
          </Link>
          <Link 
            to="/settings" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-[#111418] dark:hover:text-white font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">settings</span>
            <span>Thiết lập</span>
          </Link>
          <div className="mt-auto border-t border-gray-100 dark:border-slate-700 pt-4">
            <LogoutButton labelKey="auth.logout" />
          </div>
        </div>
      </nav>
    </div>
  );
};

export default AdminLogDetailPage;

