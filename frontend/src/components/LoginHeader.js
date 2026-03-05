import React from 'react';
import { Link } from 'react-router-dom';

const LoginHeader = () => {
  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-transparent px-6 md:px-12 py-5 bg-transparent">
      <Link to="/" className="flex items-center gap-3 text-text-main">
        <div className="size-7 text-primary-dark">
          <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
          </svg>
        </div>
        <h2 className="text-lg font-bold tracking-tight">PlanLife</h2>
      </Link>
      <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-sm font-medium text-gray-500 hover:text-primary-dark transition-colors">
            Trang chủ
          </Link>
          <a className="text-sm font-medium text-gray-500 hover:text-primary-dark transition-colors" href="#features">
            Tính năng
          </a>
        </div>
        <Link to="/register" className="flex items-center justify-center rounded-xl h-9 px-5 bg-primary-dark text-white text-sm font-semibold hover:bg-primary-hover shadow-sm transition-all">
          <span>Đăng ký</span>
        </Link>
      </div>
      <button 
        className="md:hidden text-text-main"
        aria-label="Toggle menu"
        aria-expanded="false"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>
    </header>
  );
};

export default LoginHeader;

