import React from 'react';

const TermsFooter = () => {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-6 md:mb-0">
            <span className="material-symbols-outlined text-indigo-600 text-3xl mr-2">check_circle</span>
            <span className="font-bold text-xl tracking-tight text-gray-900">PlanDaily</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mb-6 md:mb-0">
            <a className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors" href="#">
              Điều khoản Dịch vụ
            </a>
            <a className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors" href="#">
              Chính sách Bảo mật
            </a>
            <a className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors" href="#">
              Trợ giúp
            </a>
          </div>
          <div className="flex space-x-6">
            <a className="text-gray-400 hover:text-indigo-600 transition-colors" href="#" aria-label="Facebook">
              <span className="sr-only">Facebook</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path clipRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" fillRule="evenodd"></path>
              </svg>
            </a>
            <a className="text-gray-400 hover:text-indigo-600 transition-colors" href="#" aria-label="Twitter">
              <span className="sr-only">Twitter</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
              </svg>
            </a>
            <a className="text-gray-400 hover:text-indigo-600 transition-colors" href="#" aria-label="Instagram">
              <span className="sr-only">Instagram</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path clipRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772 4.902 4.902 0 011.772-1.153c.636-.247 1.363-.416 2.427-.465C9.673 2.013 10.03 2 12.48 2h.08zm-2.035 15.025c-3.13 0-5.67-2.54-5.67-5.67 0-3.13 2.54-5.67 5.67-5.67 3.13 0 5.67 2.54 5.67 5.67 0 3.13-2.54 5.67-5.67 5.67zm1.144-8.08a1.222 1.222 0 11-2.288 0 1.222 1.222 0 012.288 0z" fillRule="evenodd"></path>
              </svg>
            </a>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-100 pt-8">
          <p className="text-center text-gray-400 text-sm">© 2024 PlanDaily. Đã đăng ký bản quyền.</p>
        </div>
      </div>
    </footer>
  );
};

export default TermsFooter;

