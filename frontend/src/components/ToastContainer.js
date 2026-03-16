import React, { useEffect, useState } from 'react';
import { toast } from '../utils/toast';

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => toast.subscribe(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-[4.5rem] right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-2.5 rounded-lg px-4 py-3 shadow-lg max-w-sm animate-fadeInScale ${
            t.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700'
              : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700'
          }`}
        >
          <span
            className={`material-symbols-outlined mt-0.5 text-[20px] shrink-0 ${
              t.type === 'success'
                ? 'text-emerald-500 dark:text-emerald-400'
                : 'text-red-500 dark:text-red-400'
            }`}
          >
            {t.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span
            className={`text-sm font-medium leading-snug ${
              t.type === 'success'
                ? 'text-emerald-800 dark:text-emerald-100'
                : 'text-red-800 dark:text-red-100'
            }`}
          >
            {t.message}
          </span>
          <button
            type="button"
            onClick={() => toast.dismiss(t.id)}
            className="ml-auto shrink-0 p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-gray-400 dark:text-slate-400">close</span>
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
