import React from 'react';
import { Link } from 'react-router-dom';

const ResetPasswordHeader = () => {
  return (
    <header className="flex items-center justify-between border-b border-border-reset px-6 md:px-12 py-5 bg-background-reset sticky top-0 z-20">
      <Link to="/" className="flex items-center gap-3 group cursor-pointer">
        <div className="text-primary-reset flex items-center transition-transform duration-300 group-hover:scale-105">
          <span className="material-symbols-outlined text-[26px]">event_note</span>
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-text-main-reset">Planner App</h2>
      </Link>
      <div className="flex items-center gap-8">
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-medium text-text-secondary-reset hover:text-text-main-reset transition-colors duration-200">
            Trang chủ
          </Link>
          <Link to="/contact" className="text-sm font-medium text-text-secondary-reset hover:text-text-main-reset transition-colors duration-200">
            Liên hệ
          </Link>
        </nav>
        <Link to="/login" className="hidden md:flex items-center justify-center rounded-lg px-5 py-2.5 bg-surface-reset hover:bg-border-reset text-text-main-reset text-sm font-medium transition-all duration-200">
          Đăng nhập
        </Link>
      </div>
    </header>
  );
};

export default ResetPasswordHeader;

