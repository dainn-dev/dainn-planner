import React from 'react';
import { Link } from 'react-router-dom';

const TermsHeader = () => {
  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="material-symbols-outlined text-indigo-600 text-3xl mr-2">check_circle</span>
              <span className="font-bold text-xl tracking-tight text-gray-900">PlanDaily</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <button className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Tính năng
            </button>
            <Link to="/login" className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Đăng nhập
            </Link>
            <Link to="/register" className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
              Bắt đầu ngay
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TermsHeader;

