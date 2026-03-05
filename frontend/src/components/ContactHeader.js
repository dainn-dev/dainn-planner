import React from 'react';
import { Link } from 'react-router-dom';

const ContactHeader = () => {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-b-border-light bg-white/90 backdrop-blur-md px-4 py-3 md:px-10">
      <Link to="/" className="flex items-center gap-4 text-slate-900">
        <div className="size-8 text-primary">
          <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
          </svg>
        </div>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight">DailyPlanner</h2>
      </Link>
      <div className="hidden md:flex flex-1 justify-end gap-8">
        <div className="flex items-center gap-9">
          <a className="text-slate-600 hover:text-primary text-sm font-medium transition-colors" href="#">
            Tính năng
          </a>
          <a className="text-slate-600 hover:text-primary text-sm font-medium transition-colors" href="#">
            Về chúng tôi
          </a>
        </div>
        <div className="flex gap-3">
          <Link to="/login" className="flex h-10 px-5 items-center justify-center rounded-lg bg-white border border-border-light text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all">
            <span>Đăng nhập</span>
          </Link>
          <Link to="/register" className="flex h-10 px-5 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold hover:bg-blue-600 transition-all shadow-md shadow-blue-200">
            <span>Đăng ký miễn phí</span>
          </Link>
        </div>
      </div>
      <button className="md:hidden text-slate-900">
        <span className="material-symbols-outlined">menu</span>
      </button>
    </header>
  );
};

export default ContactHeader;

