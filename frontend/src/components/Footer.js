import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="w-full bg-white border-t border-gray-200">
      <div className="max-w-[960px] mx-auto px-4 py-12 md:py-16">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="size-7 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">task_alt</span>
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">PlanLife</span>
            </div>
            <p className="text-sm text-gray-500">© 2024 PlanLife Inc. All rights reserved.</p>
          </div>
          <div className="flex flex-col md:items-end gap-6">
            <div className="flex flex-wrap gap-6 text-sm font-medium text-gray-600">
              <Link to="/conditions" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <Link to="/term" className="hover:text-primary transition-colors">Terms of Service</Link>
              <Link to="/contact" className="hover:text-primary transition-colors">Contact Support</Link>
            </div>
            <div className="flex items-center gap-5">
              <button aria-label="Twitter" className="text-gray-400 hover:text-primary transition-colors">
                <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                </svg>
              </button>
              <button aria-label="Facebook" className="text-gray-400 hover:text-primary transition-colors">
                <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path clipRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" fillRule="evenodd"></path>
                </svg>
              </button>
              <button aria-label="Instagram" className="text-gray-400 hover:text-primary transition-colors">
                <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path clipRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772 4.902 4.902 0 011.772-1.153c.636-.247 1.363-.416 2.427-.465C9.673 2.013 10.03 2 12.48 2h-.165zm0 2.16c-2.386 0-2.668.01-3.606.052-.942.043-1.45.195-1.795.33a2.91 2.91 0 00-1.06.69 2.91 2.91 0 00-.69 1.06c-.135.346-.287.854-.33 1.795-.042.938-.052 1.22-.052 3.606s.01 2.668.052 3.606c.043.942.195 1.45.33 1.795a2.91 2.91 0 00.69 1.06 2.91 2.91 0 001.06.69c.346.135.854.287 1.795.33.938.042 1.22.052 3.606.052s2.668-.01 3.606-.052c.942-.043 1.45-.195 1.795-.33a2.88 2.88 0 001.06-.69 2.88 2.88 0 00.69-1.06c.135-.346.287-.854.33-1.795.042-.938.052-1.22.052-3.606s-.01-2.668-.052-3.606c-.043-.942-.195-1.45-.33-1.795a2.88 2.88 0 00-.69-1.06 2.88 2.88 0 00-1.06-.69c-.346-.135-.854-.287-1.795-.33-.92-.042-1.202-.052-3.525-.052zM12.315 7.15a4.965 4.965 0 110 9.93 4.965 4.965 0 010-9.93zm0 1.93a3.035 3.035 0 100 6.07 3.035 3.035 0 000-6.07zM17.502 5.33a1.155 1.155 0 110 2.31 1.155 1.155 0 010-2.31z" fillRule="evenodd"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

