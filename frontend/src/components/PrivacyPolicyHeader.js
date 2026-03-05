import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicyHeader = () => {
  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-600 text-3xl">task_alt</span>
          <span className="font-bold text-xl text-slate-900 tracking-tight">DailyPlan</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <Link to="/" className="hover:text-blue-600 transition-colors">
            Trang chủ
          </Link>
          <button className="hover:text-blue-600 transition-colors">
            Tính năng
          </button>
          <button className="hover:text-blue-600 transition-colors">
            Biểu giá
          </button>
          <Link to="/login" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
            Đăng nhập
          </Link>
        </nav>
        <button className="md:hidden text-slate-600">
          <span className="material-symbols-outlined">menu</span>
        </button>
      </div>
    </header>
  );
};

export default PrivacyPolicyHeader;

