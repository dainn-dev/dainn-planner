import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Footer';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <PublicHeader />
      
      <main className="flex-grow flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-2xl mx-auto">
          {/* 404 Number */}
          <div className="mb-8">
            <h1 className="text-9xl font-bold text-gray-800 leading-none">
              4<span className="text-blue-600">0</span>4
            </h1>
          </div>
          
          {/* Error Message */}
          <div className="mb-8">
            <h2 className="text-3xl font-semibold text-gray-800 mb-4">
              Trang không tìm thấy
            </h2>
            <p className="text-lg text-gray-600 mb-2">
              Xin lỗi, trang bạn đang tìm kiếm không tồn tại.
            </p>
            <p className="text-base text-gray-500">
              Có thể trang đã bị di chuyển hoặc URL không chính xác.
            </p>
          </div>
          
          {/* Illustration or Icon */}
          <div className="mb-8 flex justify-center">
            <div className="w-48 h-48 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-6xl text-gray-400">
                search_off
              </span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/"
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-xl">
                home
              </span>
              Về trang chủ
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors duration-200 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-xl">
                arrow_back
              </span>
              Quay lại
            </button>
          </div>
          
          {/* Helpful Links */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-4">Có thể bạn đang tìm:</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/daily"
                className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
              >
                Trang hàng ngày
              </Link>
              <Link
                to="/goals"
                className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
              >
                Mục tiêu
              </Link>
              <Link
                to="/calendar"
                className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
              >
                Lịch
              </Link>
              <Link
                to="/contact"
                className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
              >
                Liên hệ
              </Link>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default NotFoundPage;

