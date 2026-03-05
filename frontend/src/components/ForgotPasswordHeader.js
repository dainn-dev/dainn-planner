import React from 'react';
import { Link } from 'react-router-dom';

const ForgotPasswordHeader = () => {
  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-border-forgot px-6 md:px-10 py-4 bg-surface-light/80 backdrop-blur-md z-10 sticky top-0">
      <Link to="/" className="flex items-center gap-3">
        <div className="size-8 flex items-center justify-center text-primary-forgot">
          <span className="material-symbols-outlined text-[28px]">edit_calendar</span>
        </div>
        <h2 className="text-primary-forgot text-base md:text-lg font-bold tracking-tight">Planner App</h2>
      </Link>
      <div className="hidden md:flex flex-1 justify-end gap-8">
        <nav className="flex items-center gap-8">
          <Link to="/" className="text-text-subtle hover:text-primary-forgot transition-colors text-sm font-medium">
            Trang chủ
          </Link>
          <a className="text-text-subtle hover:text-primary-forgot transition-colors text-sm font-medium" href="#features">
            Tính năng
          </a>
          <Link to="/contact" className="text-text-subtle hover:text-primary-forgot transition-colors text-sm font-medium">
            Liên hệ
          </Link>
        </nav>
        <div className="flex gap-3">
          <Link to="/login" className="flex items-center justify-center rounded-lg h-9 px-4 bg-transparent hover:bg-gray-50 text-primary-forgot text-sm font-semibold border border-gray-200 transition-all">
            <span>Đăng nhập</span>
          </Link>
          <Link to="/register" className="flex items-center justify-center rounded-lg h-9 px-4 bg-primary-forgot hover:bg-primary-forgot-hover text-white text-sm font-semibold shadow-subtle transition-all">
            <span>Đăng ký</span>
          </Link>
        </div>
      </div>
      <button 
        className="md:hidden flex items-center justify-center text-primary-forgot p-2"
        aria-label="Toggle menu"
        aria-expanded="false"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>
    </header>
  );
};

export default ForgotPasswordHeader;

