import React from 'react';

const SuccessMessage = ({ message, className = '' }) => {
  if (!message) return null;

  return (
    <div
      className={`flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm ${className}`}
      role="alert"
      aria-live="polite"
    >
      <span className="material-symbols-outlined text-lg">check_circle</span>
      <span>{message}</span>
    </div>
  );
};

export default SuccessMessage;

