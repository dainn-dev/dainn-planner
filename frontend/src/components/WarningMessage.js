import React from 'react';

const WarningMessage = ({ message, className = '', onClose }) => {
  if (!message) return null;

  return (
    <div
      className={`flex items-center justify-between gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 flex-1">
        <span className="material-symbols-outlined text-lg">warning</span>
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-yellow-600 hover:text-yellow-800 transition-colors p-1 rounded hover:bg-yellow-100"
          aria-label="Đóng"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      )}
    </div>
  );
};

export default WarningMessage;

